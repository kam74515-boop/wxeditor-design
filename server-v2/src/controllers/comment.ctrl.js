const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const CommentService = require('../services/comment.service');

// GET /document/:docId — 获取文档评论（树形结构）
router.get('/document/:docId', async (req, res) => {
  try {
    const result = await CommentService.listByDocument(req.params.docId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST / — 创建评论
router.post('/', auth, async (req, res) => {
  try {
    const result = await CommentService.create(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id — 更新评论
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await CommentService.update(req.user, req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — 删除评论
router.delete('/:id', auth, async (req, res) => {
  try {
    await CommentService.remove(req.user, req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
