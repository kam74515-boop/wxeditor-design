const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { User } = require('../models');

// Ensure orders table exists if not yet migrated
function ensureOrders() {
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id),
      membership_type TEXT, period TEXT, amount REAL, original_amount REAL,
      discount REAL DEFAULT 0, discount_code TEXT,
      payment_method TEXT, payment_status TEXT DEFAULT 'pending',
      payment_transaction_id TEXT, paid_at DATETIME, failed_reason TEXT,
      refunded_at DATETIME, refund_amount REAL, refund_reason TEXT,
      membership_start_date DATETIME, membership_end_date DATETIME,
      is_auto_renew INTEGER DEFAULT 0,
      device_ip TEXT, device_user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
  } catch { /* already exists */ }
}
ensureOrders();

const MEMBERSHIP_PRICES = {
  basic: { monthly: 29, quarterly: 79, yearly: 199 },
  pro: { monthly: 99, quarterly: 269, yearly: 799 },
  enterprise: { monthly: 299, quarterly: 799, yearly: 1999 },
};

const MEMBERSHIP_FEATURES = {
  basic: ['50篇文档', '1GB存储空间', '10个协作者', '1000次API调用/天', '优先客服支持'],
  pro: ['200篇文档', '5GB存储空间', '50个协作者', '10000次API调用/天', '优先客服支持', '高级模板', '数据统计分析'],
  enterprise: ['无限文档', '无限存储空间', '无限协作者', '无限API调用', '专属客服', '所有高级功能', 'API接口权限', '定制化服务'],
};

function jwtAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: '请先登录' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.user = User.findById(decoded.id);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: '登录已过期' });
  }
}

function generateOrderNo() {
  const d = new Date();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `WX${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${random}`;
}

function calculateMembershipDays(period) {
  switch (period) {
    case 'quarterly': return 90;
    case 'yearly': return 365;
    default: return 30;
  }
}

// GET /api/membership/plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: { plans: MEMBERSHIP_PRICES, currency: 'CNY' },
  });
});

// GET /api/membership/status
router.get('/status', jwtAuth, (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        current: {
          type: user.membership.type,
          isActive: user.isMember,
          startDate: user.membership.startDate,
          endDate: user.membership.endDate,
          daysLeft: user.membershipDaysLeft,
          autoRenew: user.membership.autoRenew || false,
        },
        limits: user.checkLimits(),
        features: MEMBERSHIP_FEATURES[user.membership.type] || [],
      },
    });
  } catch {
    res.status(500).json({ success: false, message: '获取会员状态失败' });
  }
});

// POST /api/membership/subscribe
router.post('/subscribe', jwtAuth, [
  body('type').isIn(['basic', 'pro', 'enterprise']),
  body('period').isIn(['monthly', 'quarterly', 'yearly']),
  body('paymentMethod').isIn(['alipay', 'wechat']),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '参数验证失败', errors: errors.array() });
    }

    const { type, period, paymentMethod, discountCode } = req.body;
    const user = req.user;

    let amount = MEMBERSHIP_PRICES[type][period];
    let discount = 0;
    if (discountCode) {
      discount = amount * 0.1;
      amount = amount * 0.9;
    }

    const orderNo = generateOrderNo();
    const id = uuidv4();

    db.prepare(
      `INSERT INTO orders (id, user_id, membership_type, period, amount, original_amount, discount, discount_code,
       payment_method, payment_status, device_ip, device_user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(id, user.id, type, period, amount, MEMBERSHIP_PRICES[type][period], discount, discountCode || null, paymentMethod, req.ip, req.headers['user-agent']);

    res.json({
      success: true,
      message: '订单创建成功',
      data: {
        order: { id, orderNo, amount, membershipType: type, period },
        payment: { method: paymentMethod, expireTime: Date.now() + 30 * 60 * 1000 },
      },
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

// POST /api/membership/verify-payment
router.post('/verify-payment', (req, res) => {
  try {
    const { orderNo, transactionId, status } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderNo);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });

    if (status === 'success') {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + calculateMembershipDays(order.period) * 86400000).toISOString();

      db.prepare(
        "UPDATE orders SET payment_status = 'paid', payment_transaction_id = ?, paid_at = CURRENT_TIMESTAMP, membership_start_date = ?, membership_end_date = ? WHERE id = ?"
      ).run(transactionId, startDate, endDate, orderNo);

      const user = User.findById(order.user_id);
      if (user) {
        user.membership = { type: order.membership_type, isActive: true, startDate, endDate };
        user.save();
      }

      return res.json({ success: true, message: '支付验证成功' });
    }

    db.prepare("UPDATE orders SET payment_status = 'failed', failed_reason = ? WHERE id = ?").run(req.body.reason, orderNo);
    res.json({ success: false, message: '支付失败' });
  } catch (error) {
    console.error('验证支付失败:', error);
    res.status(500).json({ success: false, message: '验证失败' });
  }
});

// GET /api/membership/orders
router.get('/orders', jwtAuth, (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const total = db.prepare('SELECT COUNT(*) as c FROM orders WHERE user_id = ?').get(req.userId).c;
    const orders = db.prepare(
      `SELECT id, membership_type, period, amount, payment_status, discount, paid_at, payment_method, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(req.userId, parseInt(limit), offset);

    res.json({
      success: true,
      data: {
        list: orders.map(o => ({
          id: o.id, membershipType: o.membership_type, period: o.period,
          amount: parseFloat(o.amount), status: o.payment_status, discount: parseFloat(o.discount || 0),
          paidAt: o.paid_at, paymentMethod: o.payment_method, createdAt: o.created_at,
        })),
        total, page: parseInt(page), limit: parseInt(limit),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: '获取订单失败' });
  }
});

// POST /api/membership/cancel
router.post('/cancel', jwtAuth, (req, res) => {
  try {
    const user = req.user;
    user.membership.autoRenew = false;
    user.save();
    res.json({ success: true, message: '已取消自动续费' });
  } catch {
    res.status(500).json({ success: false, message: '取消失败' });
  }
});

// POST /api/membership/upgrade
router.post('/upgrade', jwtAuth, (req, res) => {
  try {
    const { targetType } = req.body;
    const user = req.user;
    if (!user.isMember) {
      return res.status(400).json({ success: false, message: '您当前不是会员，请直接订阅' });
    }

    const tiers = { free: 0, basic: 1, pro: 2, enterprise: 3 };
    if ((tiers[targetType] || 0) <= (tiers[user.membership.type] || 0)) {
      return res.status(400).json({ success: false, message: '无法降级或升级到相同等级' });
    }

    const currentPrice = MEMBERSHIP_PRICES[user.membership.type]?.monthly || 0;
    const targetPrice = MEMBERSHIP_PRICES[targetType]?.monthly || 0;
    const remainingDays = user.membershipDaysLeft;
    const remainingValue = (currentPrice / 30) * remainingDays;
    const upgradePrice = Math.max(0, Math.ceil(targetPrice - remainingValue));

    res.json({
      success: true,
      data: { currentType: user.membership.type, targetType, upgradePrice, features: MEMBERSHIP_FEATURES[targetType] },
    });
  } catch {
    res.status(500).json({ success: false, message: '计算升级价格失败' });
  }
});

// POST /api/membership/apply-code
router.post('/apply-code', jwtAuth, (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    const validCode = db.prepare('SELECT * FROM activation_codes WHERE code = ? AND status = ?').get(code, 'active');
    if (validCode) {
      const now = new Date();
      const endDate = new Date(now.getTime() + validCode.days * 86400000);
      user.membership = { type: validCode.membership_type, isActive: true, startDate: now.toISOString(), endDate: endDate.toISOString() };
      user.save();
      return res.json({ success: true, message: `激活成功！获得${validCode.days}天${validCode.membership_type}会员` });
    }

    res.status(400).json({ success: false, message: '无效的激活码' });
  } catch {
    res.status(500).json({ success: false, message: '激活失败' });
  }
});

// GET /api/membership/stats
router.get('/stats', jwtAuth, (req, res) => {
  try {
    const user = req.user;
    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }

    const byType = db.prepare("SELECT membership_type as type, COUNT(*) as count FROM users WHERE settings IS NOT NULL AND settings != '{}' GROUP BY membership_type").all();
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date().toISOString().substring(0, 8) + '01';

    const todayOrders = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as t FROM orders WHERE payment_status = 'paid' AND paid_at >= ?").get(today);
    const monthTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM orders WHERE payment_status = 'paid' AND paid_at >= ?").get(monthStart);

    res.json({
      success: true,
      data: {
        membershipStats: byType,
        revenue: {
          today: parseFloat(todayOrders.t),
          thisMonth: parseFloat(monthTotal.t),
          todayOrders: todayOrders.c,
        },
      },
    });
  } catch (error) {
    console.error('统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

module.exports = router;
