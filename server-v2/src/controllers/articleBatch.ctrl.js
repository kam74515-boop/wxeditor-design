const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const ArticleBatchService = require('../services/articleBatch.service');

// GET / — 列表
router.get('/', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.list(req.user, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// GET /:id — 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.getDetail(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST / — 创建
router.post('/', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.create(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id — 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.update(req.user, req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// DELETE /:id — 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    await ArticleBatchService.remove(req.user, req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST /:id/articles — 添加文章
router.post('/:id/articles', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.addArticle(req.user, req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id/articles/:articleId — 更新文章
router.put('/:id/articles/:articleId', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.updateArticle(req.user, req.params.id, req.params.articleId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// DELETE /:id/articles/:articleId — 删除文章
router.delete('/:id/articles/:articleId', auth, async (req, res) => {
  try {
    await ArticleBatchService.removeArticle(req.user, req.params.id, req.params.articleId);
    res.json({ success: true, message: '文章已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// PUT /:id/reorder — 重排
router.put('/:id/reorder', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.reorder(req.user, req.params.id, req.body.orderedIds);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// POST /:id/publish — 发布
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const result = await ArticleBatchService.publish(req.user, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
