const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const UserRepo = require('../repositories/user.repo');

const PRICES = {
  basic: { monthly: 29, quarterly: 79, yearly: 199 },
  pro: { monthly: 99, quarterly: 269, yearly: 799 },
  enterprise: { monthly: 299, quarterly: 799, yearly: 1999 },
};

const FEATURES = {
  basic: ['50篇文档', '1GB存储空间', '10个协作者', '1000次API调用/天'],
  pro: ['200篇文档', '5GB存储空间', '50个协作者', '10000次API调用/天', '高级模板', '数据统计分析'],
  enterprise: ['无限文档', '无限存储空间', '无限协作者', '无限API调用', '专属客服', 'API接口权限'],
};

function getDays(period) {
  return { monthly: 30, quarterly: 90, yearly: 365 }[period] || 30;
}

const MembershipService = {
  getPlans() {
    return { plans: PRICES, currency: 'CNY' };
  },

  async getStatus(user) {
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    const membership = settings.membership || { type: 'free', isActive: false };

    return {
      current: {
        type: membership.type,
        isActive: membership.isActive || false,
        startDate: membership.startDate,
        endDate: membership.endDate,
        daysLeft: membership.endDate ? Math.max(0, Math.ceil((new Date(membership.endDate) - new Date()) / 86400000)) : 0,
        autoRenew: membership.autoRenew || false,
      },
      limits: getLimits(membership.type),
      features: FEATURES[membership.type] || [],
    };
  },

  async subscribe(user, { type, period, paymentMethod, discountCode }) {
    let amount = PRICES[type]?.[period];
    if (!amount) throw Object.assign(new Error('无效的会员类型或周期'), { statusCode: 400 });

    let discount = 0;
    if (discountCode) { discount = amount * 0.1; amount *= 0.9; }

    const id = uuidv4();
    await db('orders').insert({
      id, user_id: user.id, membership_type: type, period,
      amount, original_amount: PRICES[type][period], discount,
      discount_code: discountCode || null, payment_method: paymentMethod,
      payment_status: 'pending', device_ip: '', device_user_agent: '',
    });

    return {
      order: { id, amount, membershipType: type, period },
      payment: { method: paymentMethod, expireTime: Date.now() + 30 * 60 * 1000 },
    };
  },

  async verifyPayment({ orderNo, transactionId, status }) {
    const order = await db('orders').where({ id: orderNo }).first();
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 });

    if (status === 'success') {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + getDays(order.period) * 86400000).toISOString();

      await db('orders').where({ id: orderNo }).update({
        payment_status: 'paid', payment_transaction_id: transactionId,
        paid_at: new Date(), membership_start_date: startDate, membership_end_date: endDate,
      });

      const user = await UserRepo.findById(order.user_id);
      if (user) {
        const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
        settings.membership = { type: order.membership_type, isActive: true, startDate, endDate, autoRenew: false };
        await UserRepo.update(user.id, { settings: JSON.stringify(settings) });
      }
      return { success: true, message: '支付验证成功' };
    }

    await db('orders').where({ id: orderNo }).update({ payment_status: 'failed', failed_reason: req.body.reason });
    return { success: false, message: '支付失败' };
  },

  async getOrders(user, { page = 1, limit = 10, paymentStatus } = {}) {
    const query = db('orders').where({ user_id: user.id });
    if (paymentStatus) query.where({ payment_status: paymentStatus });
    const [{ count }] = await query.clone().count('* as count');
    const list = await query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async cancelAutoRenew(user) {
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    if (settings.membership) settings.membership.autoRenew = false;
    await UserRepo.update(user.id, { settings: JSON.stringify(settings) });
  },

  async applyCode(user, code) {
    const validCode = await db('activation_codes').where({ code, status: 'active' }).first();
    if (!validCode) throw Object.assign(new Error('无效的激活码'), { statusCode: 400 });

    const endDate = new Date(Date.now() + validCode.days * 86400000).toISOString();
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    settings.membership = {
      type: validCode.membership_type, isActive: true,
      startDate: new Date().toISOString(), endDate, autoRenew: false,
    };
    await UserRepo.update(user.id, { settings: JSON.stringify(settings) });
    await db('activation_codes').where({ code }).update({ status: 'used', used_by: user.id, used_at: new Date() });

    return `激活成功！获得${validCode.days}天${validCode.membership_type}会员`;
  },

  async getStats() {
    const byType = await db('users')
      .select(db.raw("JSON_EXTRACT(settings, '$.membership.type') as type"))
      .count('* as count')
      .whereNotNull('settings')
      .groupByRaw("JSON_EXTRACT(settings, '$.membership.type')");

    const [todayOrders] = await db.raw("SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as t FROM orders WHERE payment_status = 'paid' AND DATE(paid_at) = CURDATE()");
    const [monthTotal] = await db.raw("SELECT COALESCE(SUM(amount), 0) as t FROM orders WHERE payment_status = 'paid' AND MONTH(paid_at) = MONTH(CURDATE())");

    return {
      membershipStats: byType,
      revenue: { today: parseFloat(todayOrders.t || 0), thisMonth: parseFloat(monthTotal.t || 0), todayOrders: todayOrders.c },
    };
  },
};

function getLimits(type) {
  const limits = {
    free: { documents: 3, storage: 100 * 1024 * 1024, collaborators: 2, apiCalls: 100 },
    basic: { documents: 50, storage: 1024 * 1024 * 1024, collaborators: 10, apiCalls: 1000 },
    pro: { documents: 200, storage: 5 * 1024 * 1024 * 1024, collaborators: 50, apiCalls: 10000 },
    enterprise: { documents: -1, storage: -1, collaborators: -1, apiCalls: -1 },
  };
  return limits[type] || limits.free;
}

module.exports = MembershipService;
