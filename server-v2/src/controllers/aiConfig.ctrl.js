const express = require('express');
const { auth, restrictTo } = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

router.get('/active', auth, async (req, res) => {
  try {
    const config = await db('ai_configs').where({ is_active: 1 }).first();
    if (!config) return res.status(404).json({ success: false, message: '没有活跃的 AI 配置' });
    const { api_key, ...safeConfig } = config;
    safeConfig.extra_params = typeof safeConfig.extra_params === 'string' ? JSON.parse(safeConfig.extra_params) : safeConfig.extra_params;
    res.json({ success: true, data: safeConfig });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(auth, restrictTo('admin', 'superadmin'));

router.get('/', async (req, res) => {
  try {
    const configs = await db('ai_configs').select(
      'id', 'name', 'provider', 'base_url', 'model',
      'temperature', 'max_tokens', 'top_p', 'is_active', 'status', 'extra_params',
      'created_at', 'updated_at'
    ).orderBy('is_active', 'desc').orderBy('created_at', 'desc');
    const safeConfigs = configs.map(c => ({
      ...c, api_key_masked: '****' + (c.api_key || '').slice(-4),
      extra_params: typeof c.extra_params === 'string' ? JSON.parse(c.extra_params) : c.extra_params,
    }));
    res.json({ success: true, data: safeConfigs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    if (req.user.role !== 'superadmin') config.api_key = '****' + config.api_key.slice(-4);
    config.extra_params = typeof config.extra_params === 'string' ? JSON.parse(config.extra_params) : config.extra_params;
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, provider, api_key, base_url, model, temperature, max_tokens, top_p, extra_params } = req.body;
    if (!name || !provider || !api_key || !base_url || !model) {
      return res.status(400).json({ success: false, message: '必填字段: name, provider, api_key, base_url, model' });
    }
    const [id] = await db('ai_configs').insert({
      name, provider, api_key, base_url, model,
      temperature: temperature || 0.7, max_tokens: max_tokens || 4096, top_p: top_p || 0.95,
      extra_params: JSON.stringify(extra_params || {}),
    });
    res.status(201).json({ success: true, message: 'AI 供应商配置已创建', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db('ai_configs').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    const updates = {};
    ['name', 'provider', 'api_key', 'base_url', 'model', 'temperature', 'max_tokens', 'top_p'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (req.body.extra_params !== undefined) updates.extra_params = JSON.stringify(req.body.extra_params);
    updates.updated_at = new Date();

    await db('ai_configs').where({ id: req.params.id }).update(updates);
    res.json({ success: true, message: 'AI 配置已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/activate', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    await db.transaction(async (trx) => {
      await trx('ai_configs').update({ is_active: 0, status: 'standby', updated_at: new Date() });
      await trx('ai_configs').where({ id: req.params.id }).update({ is_active: 1, status: 'connected', updated_at: new Date() });
    });
    res.json({ success: true, message: `已切换活跃供应商为: ${config.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    if (config.is_active) return res.status(400).json({ success: false, message: '不能删除当前活跃的供应商' });
    await db('ai_configs').where({ id: req.params.id }).delete();
    res.json({ success: true, message: 'AI 配置已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
