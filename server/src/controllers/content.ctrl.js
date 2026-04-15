const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const ContentService = require('../services/content.service');
const DocumentService = require('../services/document.service');

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 10, category = '' } = req.query;
    const result = await ContentService.getPublicContent({ page: parseInt(page), limit: parseInt(limit), category });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/members', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category = '' } = req.query;
    const result = await ContentService.getMembersContent({ page: parseInt(page), limit: parseInt(limit), category }, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message, code: err.code, upgradeUrl: err.code ? '/membership' : undefined });
  }
});

router.get('/vip', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await ContentService.getVipContent({ page: parseInt(page), limit: parseInt(limit) }, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message, code: err.code, upgradeUrl: err.code ? '/membership' : undefined });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const result = await ContentService.getMyDocuments(req.userId, { page: parseInt(page), limit: parseInt(limit), status });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await ContentService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const doc = await ContentService.getDocumentDetail(req.params.id, req.user);
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message, code: err.code, upgradeUrl: err.code ? '/membership' : undefined });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const doc = await DocumentService.createDocument(req.body, req.user);
    res.status(201).json({ success: true, message: '文档创建成功', data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const doc = await DocumentService.updateDocument(req.params.id, req.body, req.user);
    res.json({ success: true, message: '文档更新成功', data: doc });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await DocumentService.deleteDocument(req.params.id, req.user);
    res.json({ success: true, message: '文档已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    await DocumentService.addCollaborator(req.params.id, req.body, req.user);
    res.json({ success: true, message: '协作者添加成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
