const express = require('express');
const { auth, restrictTo } = require('../middleware/auth');
const MembershipService = require('../services/membership.service');

const router = express.Router();

router.get('/plans', async (req, res) => {
  try {
    const plans = await MembershipService.getPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const status = await MembershipService.getStatus(req.user);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const result = await MembershipService.subscribe(req.user, req.body);
    res.json({ success: true, message: '订单创建成功', data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/verify-payment', auth, async (req, res) => {
  try {
    const result = await MembershipService.verifyPayment(req.body);
    res.json({ success: result.success, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, paymentStatus = '' } = req.query;
    const result = await MembershipService.getOrders(req.user, { page: parseInt(page), limit: parseInt(limit), paymentStatus });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/cancel', auth, async (req, res) => {
  try {
    await MembershipService.cancelAutoRenew(req.user);
    res.json({ success: true, message: '已取消自动续费' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/apply-code', auth, async (req, res) => {
  try {
    const message = await MembershipService.applyCode(req.user, req.body.code);
    res.json({ success: true, message });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/stats', auth, restrictTo('admin', 'superadmin'), async (req, res) => {
  try {
    const stats = await MembershipService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
