const MembershipService = require('../../src/services/membership.service');
const db = require('../../src/config/db');
const UserRepo = require('../../src/repositories/user.repo');
const crypto = require('crypto');

// ── db mock with chainable builder ────────────────────
jest.mock('../../src/config/db', () => {
  const chain = {
    where: jest.fn(), first: jest.fn(), insert: jest.fn(), update: jest.fn(),
    delete: jest.fn(), select: jest.fn(), whereNotNull: jest.fn(),
    groupByRaw: jest.fn(), clone: jest.fn(), count: jest.fn(),
    orderBy: jest.fn(), limit: jest.fn(), offset: jest.fn(),
  };
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  chain.count.mockResolvedValue([{ count: 0 }]);
  chain.first.mockResolvedValue(null);
  const fn = jest.fn(() => chain);
  fn.raw = jest.fn().mockReturnValue('RAW_EXPR');
  return fn;
});

jest.mock('../../src/repositories/user.repo');

// ── helpers ───────────────────────────────────────────
function makeUser(settings = {}) {
  return { id: 'user-1', settings };
}

describe('MembershipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getPlans ─────────────────────────────────────
  describe('getPlans', () => {
    it('should return plans and currency', () => {
      const result = MembershipService.getPlans();
      expect(result).toHaveProperty('plans');
      expect(result).toHaveProperty('currency', 'CNY');
      expect(result.plans).toHaveProperty('basic');
      expect(result.plans).toHaveProperty('pro');
      expect(result.plans).toHaveProperty('enterprise');
    });
  });

  // ── getStatus ────────────────────────────────────
  describe('getStatus', () => {
    it('should return free status when no membership', async () => {
      const result = await MembershipService.getStatus(makeUser({}));
      expect(result.current.type).toBe('free');
      expect(result.current.isActive).toBe(false);
    });

    it('should return membership status from settings', async () => {
      const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
      const user = makeUser({
        membership: { type: 'pro', isActive: true, startDate: new Date().toISOString(), endDate: futureDate, autoRenew: true },
      });
      const result = await MembershipService.getStatus(user);
      expect(result.current.type).toBe('pro');
      expect(result.current.isActive).toBe(true);
      expect(result.current.autoRenew).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.limits).toBeDefined();
    });

    it('should parse JSON string settings', async () => {
      const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
      const settings = JSON.stringify({ membership: { type: 'basic', isActive: true, endDate: futureDate } });
      const user = { id: 'user-1', settings };
      const result = await MembershipService.getStatus(user);
      expect(result.current.type).toBe('basic');
    });

    it('should handle expired membership (0 daysLeft)', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const user = makeUser({
        membership: { type: 'basic', isActive: true, endDate: pastDate },
      });
      const result = await MembershipService.getStatus(user);
      expect(result.current.daysLeft).toBe(0);
    });
  });

  // ── subscribe ────────────────────────────────────
  describe('subscribe', () => {
    it('should create order and return order info', async () => {
      const chain = db();
      chain.insert.mockResolvedValue();
      const result = await MembershipService.subscribe(makeUser(), {
        type: 'basic', period: 'monthly', paymentMethod: 'wechat',
      });
      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('payment');
      expect(result.order.membershipType).toBe('basic');
      expect(result.order.amount).toBe(29);
      expect(result.payment.method).toBe('wechat');
    });

    it('should apply discount code', async () => {
      const chain = db();
      chain.insert.mockResolvedValue();
      const result = await MembershipService.subscribe(makeUser(), {
        type: 'pro', period: 'monthly', paymentMethod: 'alipay', discountCode: 'SAVE10',
      });
      expect(result.order.amount).toBeLessThan(99);
    });

    it('should throw 400 for invalid type/period', async () => {
      await expect(
        MembershipService.subscribe(makeUser(), { type: 'invalid', period: 'monthly', paymentMethod: 'wechat' })
      ).rejects.toMatchObject({ message: '无效的会员类型或周期', statusCode: 400 });
    });
  });

  // ── verifyPayment ────────────────────────────────
  describe('verifyPayment', () => {
    it('should throw 400 if orderNo missing', async () => {
      await expect(MembershipService.verifyPayment({ orderNo: '', status: 'success' }))
        .rejects.toMatchObject({ message: '订单号不能为空', statusCode: 400 });
    });

    it('should throw 400 if status invalid', async () => {
      await expect(MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'bad' }))
        .rejects.toMatchObject({ message: '无效的支付状态', statusCode: 400 });
    });

    it('should throw 404 if order not found', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'success', transactionId: 'TX1' }))
        .rejects.toMatchObject({ message: '订单不存在', statusCode: 404 });
    });

    it('should return idempotent result if already paid', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'ORD1', payment_status: 'paid' });
      const result = await MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'success', transactionId: 'TX1' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('已处理');
    });

    it('should process successful payment', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.update.mockResolvedValue(1);
      chain.first
        .mockResolvedValueOnce({ id: 'ORD1', payment_status: 'pending', period: 'monthly', user_id: 'user-1', membership_type: 'pro' })
        .mockResolvedValueOnce({ id: 'user-1', settings: '{}' });

      UserRepo.findById.mockResolvedValue({ id: 'user-1', settings: '{}' });
      UserRepo.update.mockResolvedValue();

      const result = await MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'success', transactionId: 'TX1' });
      expect(result.success).toBe(true);
      expect(UserRepo.update).toHaveBeenCalled();
    });

    it('should throw 400 on success without transactionId', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue({ id: 'ORD1', payment_status: 'pending', period: 'monthly' });
      await expect(MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'success' }))
        .rejects.toMatchObject({ message: '支付成功但缺少交易流水号', statusCode: 400 });
    });

    it('should handle failed payment', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.update.mockResolvedValue(1);
      chain.first.mockResolvedValue({ id: 'ORD1', payment_status: 'pending' });
      const result = await MembershipService.verifyPayment({ orderNo: 'ORD1', status: 'failed', reason: 'timeout' });
      expect(result.success).toBe(false);
      expect(result.message).toBe('支付失败');
    });
  });

  // ── getOrders ────────────────────────────────────
  describe('getOrders', () => {
    it('should query orders and return paginated result', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.clone.mockReturnValue({ count: jest.fn().mockResolvedValue([{ count: 5 }]) });
      chain.orderBy.mockReturnValue(chain);
      chain.limit.mockReturnValue(chain);
      chain.offset.mockResolvedValue([{ id: 'ORD1' }]);

      const result = await MembershipService.getOrders(makeUser(), { page: 1, limit: 10 });
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 5);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });

    it('should filter by paymentStatus', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.clone.mockReturnValue({ count: jest.fn().mockResolvedValue([{ count: 0 }]) });
      chain.orderBy.mockReturnValue(chain);
      chain.limit.mockReturnValue(chain);
      chain.offset.mockResolvedValue([]);

      await MembershipService.getOrders(makeUser(), { paymentStatus: 'paid' });
      // where should have been called with payment_status
      expect(chain.where).toHaveBeenCalled();
    });
  });

  // ── cancelAutoRenew ──────────────────────────────
  describe('cancelAutoRenew', () => {
    it('should update user settings to disable autoRenew', async () => {
      UserRepo.update.mockResolvedValue();
      const user = makeUser({ membership: { type: 'pro', autoRenew: true } });
      await MembershipService.cancelAutoRenew(user);
      expect(UserRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({
        settings: expect.any(String),
      }));
      const settingsArg = JSON.parse(UserRepo.update.mock.calls[0][1].settings);
      expect(settingsArg.membership.autoRenew).toBe(false);
    });
  });

  // ── applyCode ────────────────────────────────────
  describe('applyCode', () => {
    it('should throw 400 for invalid code', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.first.mockResolvedValue(null);
      await expect(MembershipService.applyCode(makeUser(), 'BADCODE'))
        .rejects.toMatchObject({ message: '无效的激活码', statusCode: 400 });
    });

    it('should activate membership with valid code', async () => {
      const chain = db();
      chain.where.mockReturnValue(chain);
      chain.update.mockResolvedValue(1);
      chain.first.mockResolvedValue({ code: 'VALID1', days: 30, membership_type: 'pro', status: 'active' });

      UserRepo.update.mockResolvedValue();
      const result = await MembershipService.applyCode(makeUser({}), 'VALID1');
      expect(result).toContain('激活成功');
      expect(UserRepo.update).toHaveBeenCalled();
    });
  });

  // ── getStats ─────────────────────────────────────
  describe('getStats', () => {
    it('should return membership and revenue stats', async () => {
      const chain = db();
      // .count('* as count') must return chain so .whereNotNull can be chained
      chain.count.mockReturnValue(chain);
      chain.whereNotNull.mockReturnValue(chain);
      chain.groupByRaw.mockResolvedValue([{ type: 'pro', count: 5 }]);

      db.raw.mockResolvedValueOnce([{ c: 3, t: 100 }])
        .mockResolvedValueOnce([{ t: 2000 }]);

      const result = await MembershipService.getStats();
      expect(result).toHaveProperty('membershipStats');
      expect(result).toHaveProperty('revenue');
    });
  });
});
