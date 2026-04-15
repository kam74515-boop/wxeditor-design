const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const TemplateService = require('../services/template.service');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category = '', search = '', isPublic = '' } = req.query;
    const result = await TemplateService.listTemplates({ page: parseInt(page), limit: parseInt(limit), category, search, isPublic }, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await TemplateService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const template = await TemplateService.getTemplate(req.params.id, req.user);
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const template = await TemplateService.createTemplate(req.body, req.user);
    res.status(201).json({ success: true, message: '模板创建成功', data: template });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const template = await TemplateService.updateTemplate(req.params.id, req.body, req.user);
    res.json({ success: true, message: '模板更新成功', data: template });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await TemplateService.deleteTemplate(req.params.id, req.user);
    res.json({ success: true, message: '模板已删除' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/:id/use', async (req, res) => {
  try {
    await TemplateService.useTemplate(req.params.id);
    res.json({ success: true, message: '使用次数已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/clone', auth, async (req, res) => {
  try {
    const cloned = await TemplateService.cloneTemplate(req.params.id, req.user);
    res.status(201).json({ success: true, message: '模板克隆成功', data: cloned });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
