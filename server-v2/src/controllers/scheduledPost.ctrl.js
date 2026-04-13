const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ScheduledPostService = require('../services/scheduledPost.service');

// GET / — 列出定时任务
router.get('/', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.list(req.user, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST / — 创建定时发布
router.post('/', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.create(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id — 更新定时任务
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.update(req.user, req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — 取消定时任务
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.cancel(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST /:id/execute — 立即执行
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.execute(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// GET /:id/logs — 查看执行日志
router.get('/:id/logs', auth, async (req, res) => {
  try {
    const result = await ScheduledPostService.getLogs(req.user, req.params.id, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
