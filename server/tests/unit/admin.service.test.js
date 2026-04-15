const AdminService = require('../../src/services/admin.service');
const UserRepo = require('../../src/repositories/user.repo');
const DocumentRepo = require('../../src/repositories/document.repo');
const db = require('../../src/config/db');

// ── db mock with chainable builder ────────────────────
jest.mock('../../src/config/db', () => {
  const chain = {
    where: jest.fn(),
    whereNot: jest.fn(),
    whereNotNull: jest.fn(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn(),
    leftJoin: jest.fn(),
    clone: jest.fn(),
    clearSelect: jest.fn(),
    clearOrder: jest.fn(),
    count: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    onConflict: jest.fn(),
    merge: jest.fn(),
  };
  // All chain methods return the chain by default
  Object.values(chain).forEach(m => m.mockReturnValue(chain));
  // Default resolved values
  chain.count.mockResolvedValue([{ count: 0 }]);
  chain.first.mockResolvedValue(null);
  chain.select.mockResolvedValue([]);
  chain.update.mockResolvedValue(1);
  // insert must return the chain (not resolve) so .onConflict() can chain off it
  chain.insert.mockReturnValue(chain);
  // onConflict returns chain with merge
  chain.onConflict.mockReturnValue(chain);
  chain.merge.mockResolvedValue(1);

  const fn = jest.fn(() => chain);
  fn.raw = jest.fn();
  return fn;
});

jest.mock('../../src/repositories/user.repo');
jest.mock('../../src/repositories/document.repo');

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getDashboard ──────────────────────────────────────
  describe('getDashboard', () => {
    it('should return formatted dashboard data', async () => {
      // Mock db('users').count('* as count')
      // First call: totalUsers, second call: activeUsers chain
      const chain = db();

      // We need to set up different resolved values for each count call
      // The service destructures: [totalUsers], [activeUsers], [totalDocs], [publishedDocs], [todayOrders], [monthRevenue]
      // Each .count() resolves with [{ count: N }]
      // But some use .where() before .count() which returns chain, then .count resolves

      // Reset the count mock to return sequential values
      chain.count
        .mockResolvedValueOnce([{ count: 100 }])   // totalUsers
        .mockResolvedValueOnce([{ count: 80 }])     // activeUsers
        .mockResolvedValueOnce([{ count: 3 }])      // bannedUsers
        .mockResolvedValueOnce([{ count: 12 }])     // todayUsers
        .mockResolvedValueOnce([{ count: 50 }])     // totalDocs
        .mockResolvedValueOnce([{ count: 30 }])     // publishedDocs
        .mockResolvedValueOnce([{ count: 7 }]);     // todayDocs

      chain.select
        .mockResolvedValueOnce([
          { id: 1, username: 'alice', nickname: 'Alice', email: 'alice@test.com', created_at: '2026-04-15 10:00:00' },
        ])
        .mockResolvedValueOnce([
          { settings: JSON.stringify({ membership: { type: 'basic', isActive: true, endDate: '2099-01-01T00:00:00.000Z' } }) },
          { settings: JSON.stringify({ membership: { type: 'pro', isActive: true, endDate: '2099-01-01T00:00:00.000Z' } }) },
        ]);

      db.raw
        .mockResolvedValueOnce([{ count: 5, revenue: '199.90' }])   // todayOrders
        .mockResolvedValueOnce([{ revenue: '5999.50' }]);           // monthRevenue

      const result = await AdminService.getDashboard();

      expect(result).toEqual(expect.objectContaining({
        users: { total: 100, active: 80 },
        documents: { total: 50, published: 30 },
        revenue: { today: 199.90, thisMonth: 5999.50, todayOrders: 5 },
        userStats: { total: 100, active: 80, banned: 3, today: 12 },
        documentStats: { total: 50, published: 30, today: 7 },
        membershipStats: { total: 2, basic: 1, pro: 1, enterprise: 0 },
      }));
      expect(result.recentUsers).toHaveLength(1);
    });

    it('should handle zero revenue with fallback to 0', async () => {
      const chain = db();

      chain.count
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      chain.select
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      db.raw
        .mockResolvedValueOnce([{ count: 0, revenue: 0 }])
        .mockResolvedValueOnce([{ revenue: 0 }]);

      const result = await AdminService.getDashboard();

      expect(result.revenue.today).toBe(0);
      expect(result.revenue.thisMonth).toBe(0);
      expect(result.revenue.todayOrders).toBe(0);
    });

    it('should handle null revenue gracefully', async () => {
      const chain = db();

      chain.count
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 2 }])
        .mockResolvedValueOnce([{ count: 3 }])
        .mockResolvedValueOnce([{ count: 2 }])
        .mockResolvedValueOnce([{ count: 1 }]);

      chain.select
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      db.raw
        .mockResolvedValueOnce([{ count: 0, revenue: null }])
        .mockResolvedValueOnce([{ revenue: null }]);

      const result = await AdminService.getDashboard();

      expect(result.revenue.today).toBe(0);
      expect(result.revenue.thisMonth).toBe(0);
    });

    it('should call db with correct table names', async () => {
      const chain = db();

      chain.count
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      chain.select
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      db.raw
        .mockResolvedValueOnce([{ count: 0, revenue: 0 }])
        .mockResolvedValueOnce([{ revenue: 0 }]);

      await AdminService.getDashboard();

      // db('users') is called twice (totalUsers, activeUsers)
      // db('documents') is called twice (totalDocs, publishedDocs)
      // db.raw() is called twice (todayOrders, monthRevenue)
      expect(db).toHaveBeenCalledWith('users');
      expect(db).toHaveBeenCalledWith('documents');
      expect(db.raw).toHaveBeenCalledTimes(2);
    });
  });

  // ── listUsers ─────────────────────────────────────────
  describe('listUsers', () => {
    it('should delegate to UserRepo.list with provided params', async () => {
      const mockResult = { list: [{ id: 1 }], total: 1, page: 1, limit: 20 };
      UserRepo.list.mockResolvedValue(mockResult);

      const result = await AdminService.listUsers({ page: 1, limit: 20, search: 'alice', role: 'admin', status: 'active' });

      expect(UserRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'alice', role: 'admin', status: 'active' });
      expect(result).toEqual(mockResult);
    });

    it('should use default page and limit when not provided', async () => {
      UserRepo.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 20 });

      await AdminService.listUsers();

      expect(UserRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined, role: undefined, status: undefined });
    });

    it('should pass partial params correctly', async () => {
      UserRepo.list.mockResolvedValue({ list: [], total: 0, page: 2, limit: 10 });

      await AdminService.listUsers({ page: 2, limit: 10 });

      expect(UserRepo.list).toHaveBeenCalledWith({ page: 2, limit: 10, search: undefined, role: undefined, status: undefined });
    });
  });

  // ── getUser ───────────────────────────────────────────
  describe('getUser', () => {
    it('should delegate to UserRepo.findById', async () => {
      const mockUser = { id: 1, username: 'alice', email: 'alice@test.com' };
      UserRepo.findById.mockResolvedValue(mockUser);

      const result = await AdminService.getUser(1);

      expect(UserRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      UserRepo.findById.mockResolvedValue(null);

      const result = await AdminService.getUser(999);

      expect(UserRepo.findById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  // ── updateUser ────────────────────────────────────────
  describe('updateUser', () => {
    it('should update role when provided', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, role: 'admin' });

      await AdminService.updateUser(1, { role: 'admin' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { role: 'admin' });
    });

    it('should update status when provided', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, status: 'active' });

      await AdminService.updateUser(1, { status: 'active' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { status: 'active' });
    });

    it('should update both role and status when both provided', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, role: 'admin', status: 'active' });

      await AdminService.updateUser(1, { role: 'admin', status: 'active' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { role: 'admin', status: 'active' });
    });

    it('should send empty updates object when neither role nor status provided', async () => {
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AdminService.updateUser(1, {});

      expect(UserRepo.update).toHaveBeenCalledWith(1, {});
    });

    it('should not include role when it is undefined', async () => {
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AdminService.updateUser(1, { role: undefined, status: 'banned' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { status: 'banned' });
    });

    it('should not include status when it is undefined', async () => {
      UserRepo.update.mockResolvedValue({ id: 1 });

      await AdminService.updateUser(1, { status: undefined, role: 'user' });

      expect(UserRepo.update).toHaveBeenCalledWith(1, { role: 'user' });
    });
  });

  // ── banUser ───────────────────────────────────────────
  describe('banUser', () => {
    it('should update user status to banned', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, status: 'banned' });

      const result = await AdminService.banUser(1);

      expect(UserRepo.update).toHaveBeenCalledWith(1, { status: 'banned' });
      expect(result).toEqual({ id: 1, status: 'banned' });
    });
  });

  // ── unbanUser ─────────────────────────────────────────
  describe('unbanUser', () => {
    it('should update user status to active', async () => {
      UserRepo.update.mockResolvedValue({ id: 1, status: 'active' });

      const result = await AdminService.unbanUser(1);

      expect(UserRepo.update).toHaveBeenCalledWith(1, { status: 'active' });
      expect(result).toEqual({ id: 1, status: 'active' });
    });
  });

  // ── listDocuments ─────────────────────────────────────
  describe('listDocuments', () => {
    it('should delegate to DocumentRepo.list with provided params', async () => {
      const mockResult = { list: [{ id: 'd1' }], total: 1, page: 1, limit: 20 };
      DocumentRepo.list.mockResolvedValue(mockResult);

      const result = await AdminService.listDocuments({ page: 1, limit: 20, search: 'test', status: 'published' });

      expect(DocumentRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'test', status: 'published' });
      expect(result).toEqual(mockResult);
    });

    it('should use default page and limit when not provided', async () => {
      DocumentRepo.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 20 });

      await AdminService.listDocuments();

      expect(DocumentRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, search: undefined, status: undefined });
    });

    it('should pass only search filter', async () => {
      DocumentRepo.list.mockResolvedValue({ list: [], total: 0, page: 1, limit: 20 });

      await AdminService.listDocuments({ search: 'keyword' });

      expect(DocumentRepo.list).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'keyword', status: undefined });
    });
  });

  // ── deleteDocument ────────────────────────────────────
  describe('deleteDocument', () => {
    it('should call DocumentRepo.softDelete', async () => {
      DocumentRepo.softDelete.mockResolvedValue();

      await AdminService.deleteDocument('doc-123');

      expect(DocumentRepo.softDelete).toHaveBeenCalledWith('doc-123');
    });

    it('should not throw when softDelete resolves', async () => {
      DocumentRepo.softDelete.mockResolvedValue(undefined);

      await expect(AdminService.deleteDocument('doc-123')).resolves.toBeUndefined();
    });
  });

  // ── listOrders ────────────────────────────────────────
  describe('listOrders', () => {
    it('should return paginated orders without status filter', async () => {
      const chain = db();
      const orders = [
        { id: 1, user_id: 'u1', amount: 100, username: 'alice', email: 'alice@test.com' },
        { id: 2, user_id: 'u2', amount: 200, username: 'bob', email: 'bob@test.com' },
      ];

      // clone().clearSelect().clearOrder().count('* as count') → [{ count: 2 }]
      chain.count.mockResolvedValueOnce([{ count: 2 }]);
      // query.orderBy().limit().offset() → orders list (these return chain, then resolved by await)
      // The last chained call resolves; we need orderBy/limit/offset to return chain
      // and the final query resolves to the orders list
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce(orders);

      const result = await AdminService.listOrders({ page: 1, limit: 20 });

      expect(db).toHaveBeenCalledWith('orders as o');
      expect(result).toEqual({
        list: orders,
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('should apply status filter when provided', async () => {
      const chain = db();
      const orders = [{ id: 1, payment_status: 'paid', username: 'alice', email: 'a@b.com' }];

      chain.count.mockResolvedValueOnce([{ count: 1 }]);
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce(orders);

      const result = await AdminService.listOrders({ page: 1, limit: 10, status: 'paid' });

      expect(chain.where).toHaveBeenCalledWith('o.payment_status', 'paid');
      expect(result).toEqual({
        list: orders,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should use default pagination when not provided', async () => {
      const chain = db();

      chain.count.mockResolvedValueOnce([{ count: 0 }]);
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([]);

      const result = await AdminService.listOrders();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should calculate correct offset for page 2', async () => {
      const chain = db();

      chain.count.mockResolvedValueOnce([{ count: 30 }]);
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([]);

      await AdminService.listOrders({ page: 2, limit: 10 });

      expect(chain.offset).toHaveBeenCalledWith(10); // (2-1) * 10
      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it('should calculate correct offset for page 3 with limit 25', async () => {
      const chain = db();

      chain.count.mockResolvedValueOnce([{ count: 100 }]);
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([]);

      await AdminService.listOrders({ page: 3, limit: 25 });

      expect(chain.offset).toHaveBeenCalledWith(50); // (3-1) * 25
      expect(chain.limit).toHaveBeenCalledWith(25);
    });

    it('should call orderBy with created_at desc', async () => {
      const chain = db();

      chain.count.mockResolvedValueOnce([{ count: 0 }]);
      chain.orderBy.mockReturnValueOnce(chain);
      chain.limit.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([]);

      await AdminService.listOrders({ page: 1, limit: 20 });

      expect(chain.orderBy).toHaveBeenCalledWith('o.created_at', 'desc');
    });
  });

  // ── refundOrder ───────────────────────────────────────
  describe('refundOrder', () => {
    it('should update order with refund fields', async () => {
      const chain = db();

      await AdminService.refundOrder('order-1', { amount: 99.9, reason: 'customer request' });

      expect(db).toHaveBeenCalledWith('orders');
      expect(chain.where).toHaveBeenCalledWith({ id: 'order-1' });
      expect(chain.update).toHaveBeenCalledWith({
        payment_status: 'refunded',
        refund_amount: 99.9,
        refund_reason: 'customer request',
        refunded_at: expect.any(Date),
      });
    });

    it('should not return a value (void)', async () => {
      const chain = db();
      chain.update.mockResolvedValue(1);

      const result = await AdminService.refundOrder('order-2', { amount: 50, reason: 'duplicate' });

      expect(result).toBeUndefined();
    });
  });

  // ── getSettings ───────────────────────────────────────
  describe('getSettings', () => {
    it('should parse settings rows into grouped object', async () => {
      const chain = db();
      const rows = [
        { key: 'siteName', value: '"MyApp"', group: 'general', description: 'Site name' },
        { key: 'maxUpload', value: '10', group: 'general', description: 'Max upload size' },
        { key: 'smtpHost', value: '"smtp.example.com"', group: 'email', description: 'SMTP host' },
      ];
      chain.select.mockResolvedValueOnce(rows);

      const result = await AdminService.getSettings();

      expect(result).toEqual({
        general: {
          siteName: 'MyApp',
          maxUpload: 10,
        },
        email: {
          smtpHost: 'smtp.example.com',
        },
      });
    });

    it('should use "general" group when group is null', async () => {
      const chain = db();
      const rows = [
        { key: 'theme', value: '"dark"', group: null, description: 'Theme' },
      ];
      chain.select.mockResolvedValueOnce(rows);

      const result = await AdminService.getSettings();

      expect(result.general).toBeDefined();
      expect(result.general.theme).toBe('dark');
    });

    it('should handle plain string values that are not valid JSON', async () => {
      const chain = db();
      const rows = [
        { key: 'rawText', value: 'just a plain string', group: 'general', description: '' },
      ];
      chain.select.mockResolvedValueOnce(rows);

      const result = await AdminService.getSettings();

      expect(result.general.rawText).toBe('just a plain string');
    });

    it('should return empty object when no rows', async () => {
      const chain = db();
      chain.select.mockResolvedValueOnce([]);

      const result = await AdminService.getSettings();

      expect(result).toEqual({});
    });

    it('should call db select with correct columns', async () => {
      const chain = db();
      chain.select.mockResolvedValueOnce([]);

      await AdminService.getSettings();

      expect(db).toHaveBeenCalledWith('system_settings');
      expect(chain.select).toHaveBeenCalledWith('key', 'value', 'group', 'description');
    });

    it('should handle multiple groups correctly', async () => {
      const chain = db();
      const rows = [
        { key: 'a', value: '1', group: 'group1', description: '' },
        { key: 'b', value: '"hello"', group: 'group2', description: '' },
        { key: 'c', value: 'true', group: 'group1', description: '' },
      ];
      chain.select.mockResolvedValueOnce(rows);

      const result = await AdminService.getSettings();

      expect(result).toEqual({
        group1: { a: 1, c: true },
        group2: { b: 'hello' },
      });
    });
  });

  // ── updateSettings ────────────────────────────────────
  describe('updateSettings', () => {
    it('should insert each setting with upsert logic', async () => {
      const chain = db();

      await AdminService.updateSettings({ siteName: 'NewSite', maxUpload: 20 });

      expect(db).toHaveBeenCalledTimes(3);
      expect(db).toHaveBeenCalledWith('system_settings');
      expect(chain.insert).toHaveBeenCalledWith({
        key: 'siteName',
        value: JSON.stringify('NewSite'),
        group: 'general',
      });
      expect(chain.insert).toHaveBeenCalledWith({
        key: 'maxUpload',
        value: JSON.stringify(20),
        group: 'general',
      });
      expect(chain.onConflict).toHaveBeenCalledWith('key');
      expect(chain.merge).toHaveBeenCalledWith({
        value: JSON.stringify('NewSite'),
        updated_at: expect.any(Date),
        group: 'general',
      });
      expect(chain.merge).toHaveBeenCalledWith({
        value: JSON.stringify(20),
        updated_at: expect.any(Date),
        group: 'general',
      });
    });

    it('should handle single setting update', async () => {
      const chain = db();

      await AdminService.updateSettings({ theme: 'dark' });

      expect(db).toHaveBeenCalledTimes(2);
      expect(chain.insert).toHaveBeenCalledWith({
        key: 'theme',
        value: JSON.stringify('dark'),
        group: 'general',
      });
    });

    it('should handle object values by serializing to JSON', async () => {
      const chain = db();

      await AdminService.updateSettings({ features: { darkMode: true, fontSize: 14 } });

      expect(chain.insert).toHaveBeenCalledWith({
        key: 'features',
        value: JSON.stringify({ darkMode: true, fontSize: 14 }),
        group: 'general',
      });
      expect(chain.merge).toHaveBeenCalledWith({
        value: JSON.stringify({ darkMode: true, fontSize: 14 }),
        updated_at: expect.any(Date),
        group: 'general',
      });
    });

    it('should handle empty updates object', async () => {
      await AdminService.updateSettings({});

      expect(db).toHaveBeenCalledTimes(0);
    });

    it('should handle boolean and null values', async () => {
      const chain = db();

      await AdminService.updateSettings({ enabled: true, disabled: false, nothing: null });

      expect(db).toHaveBeenCalledTimes(4);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'enabled', value: 'true' })
      );
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'disabled', value: 'false' })
      );
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'nothing', value: 'null' })
      );
    });
  });

  describe('membership actions', () => {
    it('should extend membership for an existing user', async () => {
      UserRepo.findById.mockResolvedValue({
        id: 'user-1',
        settings: JSON.stringify({
          membership: {
            type: 'basic',
            isActive: true,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2099-01-01T00:00:00.000Z',
            autoRenew: false,
          },
        }),
      });
      UserRepo.update.mockResolvedValue({});

      const result = await AdminService.extendMembership('user-1', { days: 30, plan: 'pro' });

      expect(UserRepo.findById).toHaveBeenCalledWith('user-1');
      expect(UserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          settings: expect.stringContaining('"type":"pro"'),
        })
      );
      expect(result.plan).toBe('pro');
      expect(result.status).toBe('active');
    });

    it('should reject invalid extension days', async () => {
      await expect(
        AdminService.extendMembership('user-1', { days: 0 })
      ).rejects.toMatchObject({ statusCode: 400, message: '延期天数必须在 1 到 3650 之间' });
    });

    it('should cancel an active membership immediately', async () => {
      UserRepo.findById.mockResolvedValue({
        id: 'user-1',
        settings: JSON.stringify({
          membership: {
            type: 'pro',
            isActive: true,
            endDate: '2099-01-01T00:00:00.000Z',
            autoRenew: true,
          },
        }),
      });
      UserRepo.update.mockResolvedValue({});

      const result = await AdminService.cancelMembership('user-1', { immediate: true, reason: 'manual' });

      expect(UserRepo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          settings: expect.stringContaining('"cancelReason":"manual"'),
        })
      );
      expect(result.status).toBe('cancelled');
      expect(result.autoRenew).toBe(false);
    });
  });
});
