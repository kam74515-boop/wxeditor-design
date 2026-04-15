const express = require('express');
const { auth, restrictTo } = require('../middleware/auth');
const db = require('../config/db');
const {
  testAiConfigConnection,
  toRuntimeAiConfig,
  toSafeAiConfig,
  validateAiConfigPayload,
} = require('../utils/ai-config');
const AiModelCatalogService = require('../services/aiModelCatalog.service');

const router = express.Router();

async function buildRemoteCatalogConfig(payload = {}, { existingConfig = null } = {}) {
  const mergedConfig = {
    ...(existingConfig || {}),
    ...payload,
  };

  if (payload.api_key === '') {
    mergedConfig.api_key = existingConfig?.api_key || '';
  }

  if (mergedConfig.base_url !== undefined) {
    mergedConfig.base_url = toRuntimeAiConfig({ base_url: mergedConfig.base_url }).base_url;
  }

  if (!mergedConfig.api_key || !String(mergedConfig.api_key).trim()) {
    throw Object.assign(new Error('请先填写可用的 API Key，再拉取模型列表'), { statusCode: 400 });
  }

  if (!mergedConfig.base_url || !String(mergedConfig.base_url).trim()) {
    throw Object.assign(new Error('请先填写可用的 Base URL，再拉取模型列表'), { statusCode: 400 });
  }

  const normalizedModel = String(mergedConfig.model || '').trim();
  return {
    ...(existingConfig || {}),
    ...mergedConfig,
    model: normalizedModel,
  };
}

router.get('/active', auth, async (req, res) => {
  try {
    const config = await db('ai_configs').where({ is_active: 1 }).first();
    if (!config) return res.status(404).json({ success: false, message: '没有活跃的 AI 配置' });
    res.json({ success: true, data: toSafeAiConfig(config) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use(auth, restrictTo('admin', 'superadmin'));

router.get('/', async (req, res) => {
  try {
    const configs = await db('ai_configs')
      .select(
        'id',
        'name',
        'provider',
        'api_key',
        'base_url',
        'model',
        'temperature',
        'max_tokens',
        'top_p',
        'is_active',
        'status',
        'extra_params',
        'created_at',
        'updated_at'
      )
      .orderBy('is_active', 'desc')
      .orderBy('created_at', 'desc');

    const catalogMap = await AiModelCatalogService.getCatalogMap(configs);
    const safeConfigs = configs.map((config) => {
      const modelCatalog = catalogMap[config.id] || [];
      const defaultModel = modelCatalog.find((item) => item.id === config.model);

      return {
        ...toSafeAiConfig(config),
        model_catalog: modelCatalog,
        visible_model_count: modelCatalog.filter((item) => item.visible).length,
        default_model_display_name: defaultModel?.display_name || config.model,
      };
    });
    res.json({ success: true, data: safeConfigs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/models/fetch', async (req, res) => {
  try {
    const configId = req.body.config_id || req.body.id;
    const existingConfig = configId
      ? await db('ai_configs').where({ id: configId }).first()
      : null;

    if (configId && !existingConfig) {
      return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    }

    const fetchConfig = await buildRemoteCatalogConfig(req.body, { existingConfig });
    const remoteCatalog = await AiModelCatalogService.fetchRemoteCatalog(fetchConfig);
    const existingCatalog = Array.isArray(req.body.model_catalog)
      ? req.body.model_catalog
      : existingConfig
        ? await AiModelCatalogService.getCatalogForConfig({
            ...existingConfig,
            model: fetchConfig.model || existingConfig.model,
          })
        : [];

    const defaultModel = String(fetchConfig.model || existingConfig?.model || '').trim();
    const models = AiModelCatalogService.mergeCatalog(existingCatalog, remoteCatalog, defaultModel);
    const matchedDefaultModel = models.find((item) => item.id === defaultModel);

    res.json({
      success: true,
      message: `已拉取 ${models.length} 个模型`,
      data: {
        default_model: defaultModel,
        default_model_display_name: matchedDefaultModel?.display_name || defaultModel,
        models,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/:id/models', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    const models = await AiModelCatalogService.getCatalogForConfig(config);
    const defaultModel = models.find((item) => item.id === config.model);

    res.json({
      success: true,
      data: {
        default_model: config.model,
        default_model_display_name: defaultModel?.display_name || config.model,
        models,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    const modelCatalog = await AiModelCatalogService.getCatalogForConfig(config);
    const defaultModel = modelCatalog.find((item) => item.id === config.model);
    res.json({
      success: true,
      data: {
        ...toSafeAiConfig(config, { includeApiKey: req.user.role === 'superadmin' }),
        model_catalog: modelCatalog,
        visible_model_count: modelCatalog.filter((item) => item.visible).length,
        default_model_display_name: defaultModel?.display_name || config.model,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    validateAiConfigPayload(req.body);

    const {
      name,
      provider,
      api_key,
      base_url,
      model,
      temperature,
      top_p,
      extra_params,
      model_catalog,
    } = req.body;

    const [id] = await db('ai_configs').insert({
      name: String(name).trim(),
      provider: String(provider).trim(),
      api_key: String(api_key).trim(),
      base_url: toRuntimeAiConfig({ base_url }).base_url,
      model: String(model).trim(),
      temperature: temperature ?? 0.7,
      max_tokens: null,
      top_p: top_p ?? 0.95,
      extra_params: JSON.stringify(extra_params || {}),
    });

    if (Array.isArray(model_catalog)) {
      await AiModelCatalogService.saveCatalogForConfig(id, model_catalog, { defaultModel: model });
    }

    res.status(201).json({ success: true, message: 'AI 供应商配置已创建', data: { id } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db('ai_configs').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    validateAiConfigPayload(req.body, { partial: true });

    const updates = {};
    let nextDefaultModel = existing.model;
    ['name', 'provider', 'api_key', 'base_url', 'model', 'temperature', 'top_p'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (updates.model !== undefined) {
      nextDefaultModel = String(updates.model).trim();
    }
    if (updates.base_url !== undefined) {
      updates.base_url = toRuntimeAiConfig({ base_url: updates.base_url }).base_url;
    }
    if (req.body.extra_params !== undefined) updates.extra_params = JSON.stringify(req.body.extra_params);
    updates.updated_at = new Date();

    await db('ai_configs').where({ id: req.params.id }).update(updates);

    if (req.body.model_catalog !== undefined) {
      if (!Array.isArray(req.body.model_catalog)) {
        throw Object.assign(new Error('model_catalog 必须是数组'), { statusCode: 400 });
      }
      await AiModelCatalogService.saveCatalogForConfig(req.params.id, req.body.model_catalog, {
        defaultModel: nextDefaultModel,
      });
    } else if (updates.model !== undefined) {
      const existingCatalog = await AiModelCatalogService.getCatalogForConfig({
        id: req.params.id,
        model: nextDefaultModel,
      });
      await AiModelCatalogService.saveCatalogForConfig(req.params.id, existingCatalog, {
        defaultModel: nextDefaultModel,
      });
    }

    res.json({ success: true, message: 'AI 配置已更新' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/:id/models/sync', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    const fetchConfig = await buildRemoteCatalogConfig(req.body, { existingConfig: config });
    const remoteCatalog = await AiModelCatalogService.fetchRemoteCatalog(fetchConfig);
    const incomingCatalog = Array.isArray(req.body.model_catalog)
      ? req.body.model_catalog
      : await AiModelCatalogService.getCatalogForConfig({
          ...config,
          model: fetchConfig.model || config.model,
        });
    const defaultModelId = String(fetchConfig.model || config.model || '').trim();
    const models = AiModelCatalogService.mergeCatalog(incomingCatalog, remoteCatalog, defaultModelId);

    await AiModelCatalogService.saveCatalogForConfig(req.params.id, models, { defaultModel: defaultModelId });
    if (defaultModelId && defaultModelId !== config.model) {
      await db('ai_configs').where({ id: req.params.id }).update({
        model: defaultModelId,
        updated_at: new Date(),
      });
    }

    const defaultModel = models.find((item) => item.id === defaultModelId);

    res.json({
      success: true,
      message: `已同步 ${models.length} 个模型`,
      data: {
        default_model: defaultModelId,
        default_model_display_name: defaultModel?.display_name || defaultModelId,
        models,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/:id/models', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });
    if (!Array.isArray(req.body.models)) {
      return res.status(400).json({ success: false, message: 'models 必须是数组' });
    }

    const nextDefaultModel = String(req.body.default_model || config.model || '').trim();
    if (!nextDefaultModel) {
      return res.status(400).json({ success: false, message: 'default_model 不能为空' });
    }

    const models = await AiModelCatalogService.saveCatalogForConfig(req.params.id, req.body.models, {
      defaultModel: nextDefaultModel,
    });

    if (nextDefaultModel !== config.model) {
      await db('ai_configs').where({ id: req.params.id }).update({
        model: nextDefaultModel,
        updated_at: new Date(),
      });
    }

    const defaultModel = models.find((item) => item.id === nextDefaultModel);
    res.json({
      success: true,
      message: '模型列表已更新',
      data: {
        default_model: nextDefaultModel,
        default_model_display_name: defaultModel?.display_name || nextDefaultModel,
        models,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    validateAiConfigPayload(req.body);
    const result = await testAiConfigConnection(req.body);
    res.json({ success: true, data: result, message: 'AI 配置连接成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    const result = await testAiConfigConnection(config);
    await db('ai_configs').where({ id: req.params.id }).update({
      status: 'connected',
      updated_at: new Date(),
    });

    res.json({ success: true, data: result, message: 'AI 配置连接成功' });
  } catch (err) {
    await db('ai_configs').where({ id: req.params.id }).update({
      status: 'error',
      updated_at: new Date(),
    });
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/:id/activate', async (req, res) => {
  try {
    const config = await db('ai_configs').where({ id: req.params.id }).first();
    if (!config) return res.status(404).json({ success: false, message: 'AI 配置不存在' });

    await testAiConfigConnection(config);

    await db.transaction(async (trx) => {
      await trx('ai_configs').update({ is_active: 0, status: 'standby', updated_at: new Date() });
      await trx('ai_configs').where({ id: req.params.id }).update({ is_active: 1, status: 'connected', updated_at: new Date() });
    });
    res.json({ success: true, message: `已切换活跃供应商为: ${config.name}` });
  } catch (err) {
    await db('ai_configs').where({ id: req.params.id }).update({
      status: 'error',
      updated_at: new Date(),
    });
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
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
