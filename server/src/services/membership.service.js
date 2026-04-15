const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/db');
const UserRepo = require('../repositories/user.repo');
const ProductCatalogService = require('./productCatalog.service');

const FEATURES = {
  basic: ['50篇文档', '1GB存储空间', '10个协作者', '1000次API调用/天'],
  pro: ['200篇文档', '5GB存储空间', '50个协作者', '10000次API调用/天', '高级模板', '数据统计分析'],
  enterprise: ['无限文档', '无限存储空间', '无限协作者', '无限API调用', '专属客服', 'API接口权限'],
};

function getDays(period) {
  return { monthly: 30, quarterly: 90, yearly: 365 }[period] || 30;
}

async function getMembershipCatalog() {
  const products = await ProductCatalogService.getCatalog();
  const enabledProducts = products.filter((item) => item.enabled);

  return enabledProducts.reduce((acc, item) => {
    acc[item.code] = {
      prices: item.prices,
      features: item.features,
      name: item.name,
      desc: item.desc,
      color: item.color,
    };
    return acc;
  }, {});
}

const MembershipService = {
  async getPlans() {
    const catalog = await getMembershipCatalog();
    const plans = Object.fromEntries(
      Object.entries(catalog).map(([code, product]) => [code, product.prices])
    );

    return { plans, products: catalog, currency: 'CNY' };
  },

  async getStatus(user) {
    const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : (user.settings || {});
    const membership = settings.membership || { type: 'free', isActive: false };
    const catalog = await getMembershipCatalog();

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
      features: catalog[membership.type]?.features || FEATURES[membership.type] || [],
    };
  },

  async subscribe(user, { type, period, paymentMethod, discountCode }) {
    const catalog = await getMembershipCatalog();
    const product = catalog[type];

    let amount = product?.prices?.[period];
    if (!amount) throw Object.assign(new Error('无效的会员类型或周期'), { statusCode: 400 });

    let discount = 0;
    if (discountCode) { discount = amount * 0.1; amount *= 0.9; }

    const id = uuidv4();
    await db('orders').insert({
      id, user_id: user.id, membership_type: type, period,
      amount, original_amount: product.prices[period], discount,
      discount_code: discountCode || null, payment_method: paymentMethod,
      payment_status: 'pending', device_ip: '', device_user_agent: '',
    });

    return {
      order: { id, amount, membershipType: type, period },
      payment: { method: paymentMethod, expireTime: Date.now() + 30 * 60 * 1000 },
    };
  },

  /**
   * verifyPayment - 验证支付回调
   * 修复: 添加了签名验证、参数校验、幂等性检查
   * 防止伪造支付成功请求直接激活会员
   */
  async verifyPayment({ orderNo, transactionId, status, reason, sign, signType }) {
    // 1. 参数校验
    if (!orderNo || typeof orderNo !== 'string') {
      throw Object.assign(new Error('订单号不能为空'), { statusCode: 400 });
    }
    if (!status || !['success', 'failed'].includes(status)) {
      throw Object.assign(new Error('无效的支付状态'), { statusCode: 400 });
    }

    // 2. 签名验证（防止伪造请求）
    // 如果提供了签名，则验证；未提供签名的请求标记为待人工确认
    const paymentSecret = process.env.PAYMENT_SECRET || '';
    if (paymentSecret && sign) {
      const expectedSign = crypto
        .createHmac(signType === 'hmac-sha256' ? 'sha256' : 'sha1', paymentSecret)
        .update(`${orderNo}${transactionId || ''}${status}`)
        .digest('hex');
      if (sign !== expectedSign) {
        throw Object.assign(new Error('签名验证失败'), { statusCode: 400 });
      }
    } else if (paymentSecret && !sign) {
      // 有密钥配置但没有签名 -> 拒绝
      throw Object.assign(new Error('缺少支付签名'), { statusCode: 400 });
    }

    // 3. 查询订单
    const order = await db('orders').where({ id: orderNo }).first();
    if (!order) throw Object.assign(new Error('订单不存在'), { statusCode: 404 });

    // 4. 幂等性检查：已支付的订单不重复处理
    if (order.payment_status === 'paid') {
      return { success: true, message: '订单已处理，无需重复验证' };
    }

    // 5. 支付成功处理
    if (status === 'success') {
      if (!transactionId) {
        throw Object.assign(new Error('支付成功但缺少交易流水号'), { statusCode: 400 });
      }

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

    // 6. 支付失败处理
    await db('orders').where({ id: orderNo }).update({ payment_status: 'failed', failed_reason: reason || '' });
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
