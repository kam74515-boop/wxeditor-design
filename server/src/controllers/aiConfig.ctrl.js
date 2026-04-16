const express = require('express');
const { auth, restrictTo } = require('../middleware/auth');
const db = require('../config/db');
const {
  testAiConfigConnection,
  toRuntimeAiConfig,
  buildProviderUrl,
} = require('../utils/ai-config');
const axios = require('axios');

const router = express.Router();

// ====== 供应商 API ======

router.use(auth, restrictTo('admin', 'superadmin'));

// 获取所有供应商
router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await db('ai_configs')
      .select('id', 'name', 'base_url', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建供应商
router.post('/suppliers', async (req, res) => {
  try {
    const { name, api_key, base_url } = req.body;
    if (!name || !api_key || !base_url) {
      return res.status(400).json({ success: false, message: '缺少必要字段' });
    }

    const [id] = await db('ai_configs').insert({
      name: String(name).trim(),
      api_key: String(api_key).trim(),
      base_url: toRuntimeAiConfig({ base_url }).base_url,
      provider: 'custom',
      model: '',
      is_active: 0,
    });

    res.status(201).json({ success: true, message: '供应商已创建', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新供应商
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, api_key, base_url } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (api_key !== undefined) updates.api_key = String(api_key).trim();
    if (base_url !== undefined) updates.base_url = toRuntimeAiConfig({ base_url }).base_url;
    updates.updated_at = new Date();

    await db('ai_configs').where({ id: req.params.id }).update(updates);
    res.json({ success: true, message: '供应商已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除供应商
router.delete('/suppliers/:id', async (req, res) => {
  try {
    await db('ai_configs').where({ id: req.params.id }).delete();
    res.json({ success: true, message: '供应商已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 测试供应商连接
router.post('/suppliers/:id/test', async (req, res) => {
  try {
    const supplier = await db('ai_configs').where({ id: req.params.id }).first();
    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    await axios.get(buildProviderUrl(supplier.base_url, '/models'), {
      timeout: 10000,
      headers: { 'Authorization': `Bearer ${supplier.api_key}` },
    });

    res.json({ success: true, message: '连接成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '连接失败: ' + (err.message || '未知错误') });
  }
});

// 从供应商同步模型
router.post('/suppliers/:id/sync', async (req, res) => {
  try {
    const supplier = await db('ai_configs').where({ id: req.params.id }).first();
    if (!supplier) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    const response = await axios.get(buildProviderUrl(supplier.base_url, '/models'), {
      timeout: 15000,
      headers: { 'Authorization': `Bearer ${supplier.api_key}` },
    });

    const remoteModels = Array.isArray(response.data?.data) ? response.data.data : 
                         Array.isArray(response.data) ? response.data : [];
    
    const syncedModels = [];
    for (const m of remoteModels) {
      const modelId = m.id || m.model;
      if (!modelId) continue;

      const existing = await db('ai_models')
        .where({ model_id: modelId, supplier_id: supplier.id })
        .first();

      if (!existing) {
        await db('ai_models').insert({
          model_id: modelId,
          display_name: m.display_name || m.name || modelId,
          supplier_id: supplier.id,
          visible: false,
        });
      }
      syncedModels.push(modelId);
    }

    res.json({ success: true, message: `已同步 ${syncedModels.length} 个模型`, data: { count: syncedModels.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: '同步失败: ' + (err.message || '未知错误') });
  }
});

// ====== 模型 API ======

// 获取所有模型（管理员）
router.get('/models', async (req, res) => {
  try {
    const models = await db('ai_models')
      .leftJoin('ai_configs', 'ai_models.supplier_id', 'ai_configs.id')
      .select(
        'ai_models.id',
        'ai_models.model_id',
        'ai_models.display_name',
        'ai_models.supplier_id',
        'ai_models.visible',
        'ai_models.temperature',
        'ai_models.top_p',
        'ai_models.max_tokens',
        'ai_models.sort_order',
        'ai_models.fallback_model_id',
        'ai_configs.name as supplier_name'
      )
      .orderBy('ai_models.sort_order', 'asc');

    res.json({ success: true, data: models });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建模型
router.post('/models', async (req, res) => {
  try {
    const { model_id, display_name, supplier_id } = req.body;
    if (!model_id || !supplier_id) {
      return res.status(400).json({ success: false, message: 'model_id 和 supplier_id 必填' });
    }

    const [id] = await db('ai_models').insert({
      model_id: String(model_id).trim(),
      display_name: String(display_name || model_id).trim(),
      supplier_id,
      visible: false,
    });

    res.status(201).json({ success: true, message: '模型已创建', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新模型配置
router.put('/models/:id', async (req, res) => {
  try {
    const { display_name, visible, temperature, top_p, max_tokens, sort_order, fallback_model_id, supplier_id } = req.body;
    const updates = {};

    if (display_name !== undefined) updates.display_name = String(display_name).trim();
    if (visible !== undefined) updates.visible = Boolean(visible);
    if (temperature !== undefined) updates.temperature = temperature;
    if (top_p !== undefined) updates.top_p = top_p;
    if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (fallback_model_id !== undefined) updates.fallback_model_id = fallback_model_id;
    if (supplier_id !== undefined) updates.supplier_id = supplier_id;
    updates.updated_at = new Date();

    await db('ai_models').where({ id: req.params.id }).update(updates);
    res.json({ success: true, message: '模型配置已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 批量更新模型排序
router.put('/models-order', async (req, res) => {
  try {
    const { models } = req.body;
    if (!Array.isArray(models)) {
      return res.status(400).json({ success: false, message: 'models 必须是数组' });
    }

    for (const item of models) {
      await db('ai_models').where({ id: item.id }).update({ sort_order: item.sort_order });
    }

    res.json({ success: true, message: '排序已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除模型
router.delete('/models/:id', async (req, res) => {
  try {
    await db('ai_models').where({ id: req.params.id }).delete();
    res.json({ success: true, message: '模型已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
