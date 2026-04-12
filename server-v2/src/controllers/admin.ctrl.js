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

router.get('/settings', async (req, res) => {
  try {
    const settings = await AdminService.getSettings();
    res.json({ success: true, data: settings });
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

module.exports = router;
