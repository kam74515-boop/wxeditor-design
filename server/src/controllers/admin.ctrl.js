const express = require('express');
const { auth, restrictTo } = require('../middleware/auth');
const AdminService = require('../services/admin.service');

const router = express.Router();

router.use(auth, restrictTo('admin', 'superadmin'));

router.get('/dashboard', async (req, res) => {
  try {
    const stats = await AdminService.getDashboard();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    const result = await AdminService.listUsers({ page: parseInt(page), limit: parseInt(limit), search, role, status });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await AdminService.getUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    await AdminService.updateUser(req.params.id, req.body);
    res.json({ success: true, message: '用户更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users/:id/ban', async (req, res) => {
  try {
    await AdminService.banUser(req.params.id);
    res.json({ success: true, message: '用户已封禁' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/users/:id/unban', async (req, res) => {
  try {
    await AdminService.unbanUser(req.params.id);
    res.json({ success: true, message: '用户已解封' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const result = await AdminService.listDocuments({ page: parseInt(page), limit: parseInt(limit), search, status });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    await AdminService.deleteDocument(req.params.id);
    res.json({ success: true, message: '文档已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const result = await AdminService.listOrders({ page: parseInt(page), limit: parseInt(limit), status });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/orders/:id/refund', async (req, res) => {
  try {
    await AdminService.refundOrder(req.params.id, req.body);
    res.json({ success: true, message: '退款成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/membership', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      plan = '',
      status = '',
      search = '',
    } = req.query;

    const result = await AdminService.getMembershipOverview({
      page: parseInt(page),
      limit: parseInt(limit),
      plan,
      status,
      search,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/membership/:id/extend', async (req, res) => {
  try {
    const result = await AdminService.extendMembership(req.params.id, req.body);
    res.json({ success: true, message: '会员已延期', data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/membership/:id/cancel', async (req, res) => {
  try {
    const result = await AdminService.cancelMembership(req.params.id, req.body);
    res.json({ success: true, message: '会员已取消', data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await AdminService.listProducts({ page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = await AdminService.createProduct(req.body);
    res.status(201).json({ success: true, message: '套餐创建成功', data: product });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await AdminService.updateProduct(req.params.id, req.body);
    res.json({ success: true, message: '套餐更新成功', data: product });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await AdminService.deleteProduct(req.params.id);
    res.json({ success: true, message: '套餐已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/content-review/counts', async (_req, res) => {
  try {
    const counts = await AdminService.getContentReviewCounts();
    res.json({ success: true, data: counts });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/content-review', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      type = '',
      search = '',
    } = req.query;

    const result = await AdminService.listContentReviews({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      search,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/content-review/:id/approve', async (req, res) => {
  try {
    await AdminService.approveContent(req.params.id, req.user.id);
    res.json({ success: true, message: '内容已通过审核' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/content-review/:id/reject', async (req, res) => {
  try {
    await AdminService.rejectContent(req.params.id, req.user.id, req.body.reason);
    res.json({ success: true, message: '内容已拒绝' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/content-review/batch-approve', async (req, res) => {
  try {
    await AdminService.batchApprove(req.body.ids || [], req.user.id);
    res.json({ success: true, message: '批量审核通过完成' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/content-review/batch-reject', async (req, res) => {
  try {
    await AdminService.batchReject(req.body.ids || [], req.user.id, req.body.reason);
    res.json({ success: true, message: '批量拒绝完成' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const analytics = await AdminService.getAnalytics(period);
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const settings = await AdminService.getSettings();
    res.json({ success: true, data: AdminService.flattenSettingsGroups(settings) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await AdminService.updateSettings(req.body);
    res.json({ success: true, message: '设置已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/settings/test-email', async (req, res) => {
  try {
    if (!req.body.to) {
      return res.status(400).json({ success: false, message: '测试邮箱不能为空' });
    }

    await AdminService.sendTestEmail(req.body.to);
    res.json({ success: true, message: '测试邮件发送成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
