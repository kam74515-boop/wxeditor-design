const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const WechatAccountService = require('../services/wechatAccount.service');

// GET / — 列出当前用户的公众号
router.get('/', auth, async (req, res) => {
  try {
    const result = await WechatAccountService.list(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST / — 添加公众号
router.post('/', auth, async (req, res) => {
  try {
    const result = await WechatAccountService.create(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id — 更新公众号信息
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await WechatAccountService.update(req.user, req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — 删除公众号
router.delete('/:id', auth, async (req, res) => {
  try {
    await WechatAccountService.remove(req.user, req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST /:id/verify — 验证公众号连接
router.post('/:id/verify', auth, async (req, res) => {
  try {
    const result = await WechatAccountService.verify(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
