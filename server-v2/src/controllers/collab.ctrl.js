const express = require('express');
const { auth } = require('../middleware/auth');
const DocumentService = require('../services/document.service');

const router = express.Router();

router.post('/documents', auth, async (req, res) => {
  try {
    const doc = await DocumentService.createDocument(req.body, req.user);
    res.status(201).json({ success: true, message: '文档创建成功', data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/documents', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '', status = '' } = req.query;
    const result = await DocumentService.listDocuments({
      page: parseInt(page), limit: parseInt(limit), search, status,
      author_id: req.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/documents/:documentId', auth, async (req, res) => {
  try {
    const doc = await DocumentService.getDocument(req.params.documentId, req.user);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/documents/:documentId', auth, async (req, res) => {
  try {
    const doc = await DocumentService.updateDocument(req.params.documentId, req.body, req.user);
    res.json({ success: true, message: '文档更新成功', data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/documents/:documentId', auth, async (req, res) => {
  try {
    await DocumentService.deleteDocument(req.params.documentId, req.user);
    res.json({ success: true, message: '文档已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/documents/:documentId/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await DocumentService.getHistory(req.params.documentId, { page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/documents/:documentId/share', auth, async (req, res) => {
  try {
    const shareUrl = `/shared/${req.params.documentId}`;
    res.json({ success: true, data: { shareUrl } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
