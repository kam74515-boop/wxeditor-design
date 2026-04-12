const express = require('express');
const router = express.Router();
const { auth, restrictTo } = require('../middleware/auth');

// 获取 SQLite 数据库连接
function getDB() {
  const database = require('../config/database');
  return database.db || database;
}

/**
 * 所有后台路由都需要管理员权限
 */
router.use(auth);
router.use(restrictTo('admin', 'superadmin'));

// ==================== 仪表盘 ====================

/**
 * GET /api/admin/dashboard
 * 获取仪表盘统计数据
 */
router.get('/dashboard', (req, res) => {
  try {
    const db = getDB();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const userStats = {
      total: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      today: db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at >= ?').get(todayStr).c,
      thisMonth: db.prepare('SELECT COUNT(*) as c FROM users WHERE created_at >= ?').get(monthStr).c,
      active: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get().c,
      banned: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'banned'").get().c,
    };

    const documentStats = {
      total: db.prepare('SELECT COUNT(*) as c FROM documents').get().c,
      today: db.prepare('SELECT COUNT(*) as c FROM documents WHERE created_at >= ?').get(todayStr).c,
      published: db.prepare("SELECT COUNT(*) as c FROM documents WHERE status = 'published'").get()?.c || 0,
      draft: db.prepare("SELECT COUNT(*) as c FROM documents WHERE status = 'draft'").get()?.c || 0,
    };

    const membershipStats = { total: 0, basic: 0, pro: 0, enterprise: 0 };
    const revenueStats = { total: 0, today: 0, thisMonth: 0 };

    const recentUsers = db.prepare(
      'SELECT id, username, nickname, email, role, status, created_at as createdAt FROM users ORDER BY created_at DESC LIMIT 5'
    ).all();

    res.json({
      success: true,
      data: { userStats, membershipStats, documentStats, revenueStats, recentUsers, recentOrders: [] },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// ==================== 用户管理 ====================

/**
 * GET /api/admin/users
 * 获取用户列表（支持搜索、分页、筛选）
 */
router.get('/users', (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (username LIKE ? OR email LIKE ? OR nickname LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (role) { where += ' AND role = ?'; params.push(role); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(...params).c;
    const users = db.prepare(
      `SELECT id, username, email, nickname, avatar, role, status, settings, created_at as createdAt 
       FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    const list = users.map(u => {
      let settings = {};
      try { settings = JSON.parse(u.settings || '{}'); } catch {}
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        nickname: u.nickname,
        avatar: u.avatar,
        role: u.role,
        status: u.status,
        membership: settings.membership || { type: 'free', isActive: false },
        createdAt: u.createdAt,
      };
    });

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

/**
 * GET /api/admin/users/:id
 * 获取用户详情
 */
router.get('/users/:id', (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare(
      'SELECT id, username, email, nickname, avatar, role, status, settings, created_at as createdAt FROM users WHERE id = ?'
    ).get(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    let settings = {};
    try { settings = JSON.parse(user.settings || '{}'); } catch {}

    const documents = db.prepare(
      'SELECT id, title, status, created_at as createdAt FROM documents WHERE author_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(req.params.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          membership: settings.membership || { type: 'free', isActive: false },
          settings,
          createdAt: user.createdAt,
        },
        documents,
        orders: [],
      },
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({ success: false, message: '获取用户详情失败' });
  }
});

/**
 * PUT /api/admin/users/:id
 * 更新用户信息（角色、状态）
 */
router.put('/users/:id', (req, res) => {
  try {
    const db = getDB();
    const { role, status } = req.body;

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const updates = [];
    const values = [];
    if (role) { updates.push('role = ?'); values.push(role); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ success: false, message: '更新用户失败' });
  }
});

/**
 * POST /api/admin/users/:id/ban
 * 封禁用户
 */
router.post('/users/:id/ban', (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: '不能封禁超级管理员' });
    }

    db.prepare("UPDATE users SET status = 'banned', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: '用户已封禁' });
  } catch (error) {
    res.status(500).json({ success: false, message: '封禁失败' });
  }
});

/**
 * POST /api/admin/users/:id/unban
 * 解封用户
 */
router.post('/users/:id/unban', (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    db.prepare("UPDATE users SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: '用户已解封' });
  } catch (error) {
    res.status(500).json({ success: false, message: '解封失败' });
  }
});

// ==================== 文档管理 ====================

/**
 * GET /api/admin/documents
 * 获取文档列表
 */
router.get('/documents', (req, res) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '1=1';
    const params = [];

    if (search) {
      where += ' AND (d.title LIKE ?)';
      params.push(`%${search}%`);
    }
    if (status) { where += ' AND d.status = ?'; params.push(status); }

    const total = db.prepare(`SELECT COUNT(*) as c FROM documents d WHERE ${where}`).get(...params).c;
    const documents = db.prepare(
      `SELECT d.id, d.title, d.status, d.created_at as createdAt, d.updated_at as updatedAt,
              u.username as authorName, u.nickname as authorNickname
       FROM documents d
       LEFT JOIN users u ON d.author_id = u.id
       WHERE ${where}
       ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    const list = documents.map(d => ({
      id: d.id,
      title: d.title,
      author: { username: d.authorName, nickname: d.authorNickname },
      status: d.status || 'draft',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ success: false, message: '获取文档列表失败' });
  }
});

/**
 * PUT /api/admin/documents/:id
 * 更新文档状态
 */
router.put('/documents/:id', (req, res) => {
  try {
    const db = getDB();
    const { status } = req.body;
    const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    if (status) {
      db.prepare('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    }

    res.json({ success: true, message: '文档更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新文档失败' });
  }
});

/**
 * DELETE /api/admin/documents/:id
 * 删除文档（软删除）
 */
router.delete('/documents/:id', (req, res) => {
  try {
    const db = getDB();
    const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: '文档不存在' });
    }

    db.prepare("UPDATE documents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: '文档已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 订单管理 ====================

/**
 * GET /api/admin/orders
 * 获取订单列表
 */
router.get('/orders', (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '1=1';
    const params = [];
    if (status) { where += ' AND o.payment_status = ?'; params.push(status); }

    const total = db.prepare(`SELECT COUNT(*) as c FROM orders o WHERE ${where}`).get(...params).c;
    const orders = db.prepare(
      `SELECT o.id, o.amount, o.payment_status, o.membership_type, o.period, o.payment_method,
              o.paid_at, o.created_at,
              u.username, u.nickname, u.email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE ${where}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: {
        list: orders.map(o => ({
          id: o.id, amount: parseFloat(o.amount), status: o.payment_status,
          membershipType: o.membership_type, period: o.period, paymentMethod: o.payment_method,
          paidAt: o.paid_at, createdAt: o.created_at,
          user: { username: o.username, nickname: o.nickname, email: o.email },
        })),
        total, page: parseInt(page), limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败', data: { list: [], total: 0 } });
  }
});

/**
 * POST /api/admin/orders/:id/refund
 * 订单退款
 */
router.post('/orders/:id/refund', (req, res) => {
  try {
    const { amount, reason } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order.payment_status !== 'paid') return res.status(400).json({ success: false, message: '仅能退款已支付订单' });

    db.prepare(
      "UPDATE orders SET payment_status = 'refunded', refund_amount = ?, refund_reason = ?, refunded_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(amount || order.amount, reason || '', req.params.id);

    // 退回会员权益
    const user = User.findById(order.user_id);
    if (user && user.membership?.isActive) {
      user.membership.isActive = false;
      user.save();
    }

    res.json({ success: true, message: '退款成功' });
  } catch (error) {
    console.error('退款失败:', error);
    res.status(500).json({ success: false, message: '退款失败' });
  }
});

// ==================== 系统设置 ====================

/**
 * GET /api/admin/settings
 * 获取系统设置
 */
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      membership: {
        basic: { monthly: 29, quarterly: 79, yearly: 199 },
        pro: { monthly: 99, quarterly: 269, yearly: 799 },
        enterprise: { monthly: 299, quarterly: 799, yearly: 1999 },
      },
      limits: {
        free: { documents: 10, storage: 100, collaborators: 3, apiCalls: 100 },
        basic: { documents: 50, storage: 1024, collaborators: 10, apiCalls: 1000 },
        pro: { documents: 200, storage: 5120, collaborators: 50, apiCalls: 10000 },
        enterprise: { documents: -1, storage: -1, collaborators: -1, apiCalls: -1 },
      },
      features: {
        registrationEnabled: true,
        emailVerification: false,
        maintenanceMode: false,
      },
    },
  });
});

/**
 * PUT /api/admin/settings
 * 更新系统设置（占位）
 */
router.put('/settings', (req, res) => {
  res.json({ success: true, message: '设置更新成功' });
});

module.exports = router;
