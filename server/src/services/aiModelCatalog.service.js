const axios = require('axios');
const db = require('../config/db');
const { buildProviderUrl, toRuntimeAiConfig } = require('../utils/ai-config');

const AI_MODEL_CATALOG_KEY_PREFIX = 'ai_model_catalog:';

function buildModelCatalogSettingKey(configId) {
  return `${AI_MODEL_CATALOG_KEY_PREFIX}${configId}`;
}

function sanitizeModelCatalogEntry(entry = {}, { visibleFallback = false } = {}) {
  const id = String(entry.id || entry.model || '').trim();
  if (!id) return null;

  return {
    id,
    display_name: String(entry.display_name || entry.displayName || entry.name || id).trim() || id,
    visible: entry.visible === undefined ? visibleFallback : Boolean(entry.visible),
    owned_by: String(entry.owned_by || entry.ownedBy || '').trim(),
  };
}

function parseCatalogValue(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function looksLikeModelEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  return ['id', 'model', 'name', 'display_name'].some((key) => {
    const value = entry[key];
    return typeof value === 'string' && value.trim();
  });
}

function extractModelArray(payload, depth = 0) {
  if (depth > 6 || payload === null || payload === undefined) return [];

  if (Array.isArray(payload)) {
    if (payload.some(looksLikeModelEntry)) {
      return payload.filter(looksLikeModelEntry);
    }

    for (const item of payload) {
      const nested = extractModelArray(item, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }

  if (typeof payload !== 'object') return [];

  for (const value of Object.values(payload)) {
    const nested = extractModelArray(value, depth + 1);
    if (nested.length) return nested;
  }

  return [];
}

function normalizeCatalog(models = [], defaultModel) {
  const catalogMap = new Map();

  models.forEach((model) => {
    const normalizedModel = sanitizeModelCatalogEntry(model, {
      visibleFallback: String(model?.id || model?.model || '').trim() === String(defaultModel || '').trim(),
    });
    if (normalizedModel) {
      catalogMap.set(normalizedModel.id, normalizedModel);
    }
  });

  const normalizedDefaultModel = String(defaultModel || '').trim();
  if (normalizedDefaultModel && !catalogMap.has(normalizedDefaultModel)) {
    const fallbackModel = sanitizeModelCatalogEntry(
      { id: normalizedDefaultModel, display_name: normalizedDefaultModel, visible: true },
      { visibleFallback: true }
    );
    if (fallbackModel) {
      catalogMap.set(fallbackModel.id, fallbackModel);
    }
  }

  return Array.from(catalogMap.values()).sort((a, b) => {
    if (a.id === normalizedDefaultModel) return -1;
    if (b.id === normalizedDefaultModel) return 1;
    if (a.visible !== b.visible) return a.visible ? -1 : 1;
    return a.display_name.localeCompare(b.display_name, 'zh-Hans-CN');
  });
}

function mergeCatalog(existingCatalog = [], remoteCatalog = [], defaultModel) {
  const existingMap = new Map(
    normalizeCatalog(existingCatalog, defaultModel).map((model) => [model.id, model])
  );

  const mergedModels = remoteCatalog.map((remoteModel) => {
    const existingModel = existingMap.get(remoteModel.id);
    return {
      ...remoteModel,
      display_name: existingModel?.display_name || remoteModel.display_name || remoteModel.id,
      visible: existingModel ? existingModel.visible : true,
    };
  });

  return normalizeCatalog(mergedModels, defaultModel);
}

async function getCatalogMap(configs = []) {
  const normalizedConfigs = configs
    .map((config) => (typeof config === 'object' ? config : { id: config }))
    .filter((config) => config?.id !== undefined && config?.id !== null);

  if (!normalizedConfigs.length) return {};

  const keys = normalizedConfigs.map((config) => buildModelCatalogSettingKey(config.id));
  const rows = await db('system_settings').whereIn('key', keys).select('key', 'value');
  const rowMap = rows.reduce((acc, row) => {
    acc[row.key] = parseCatalogValue(row.value);
    return acc;
  }, {});

  return normalizedConfigs.reduce((acc, config) => {
    acc[config.id] = normalizeCatalog(
      rowMap[buildModelCatalogSettingKey(config.id)] || [],
      config.model
    );
    return acc;
  }, {});
}

const AiModelCatalogService = {
  buildModelCatalogSettingKey,

  sanitizeModelCatalogEntry,

  normalizeCatalog,

  mergeCatalog,

  async getCatalogForConfig(config) {
    if (!config?.id) return normalizeCatalog([], config?.model);
    const catalogMap = await getCatalogMap([config]);
    return catalogMap[config.id] || normalizeCatalog([], config.model);
  },

  async getCatalogMap(configs) {
    return getCatalogMap(configs);
  },

  async saveCatalogForConfig(configId, models, { defaultModel } = {}) {
    const normalizedCatalog = normalizeCatalog(Array.isArray(models) ? models : [], defaultModel);

    await db('system_settings')
      .insert({
        key: buildModelCatalogSettingKey(configId),
        value: JSON.stringify(normalizedCatalog),
        group: 'ai',
        description: 'AI 模型目录配置',
      })
      .onConflict('key')
      .merge({
        value: JSON.stringify(normalizedCatalog),
        group: 'ai',
        description: 'AI 模型目录配置',
        updated_at: new Date(),
      });

    return normalizedCatalog;
  },

  async fetchRemoteCatalog(config) {
    const runtimeConfig = toRuntimeAiConfig(config);

    if (!runtimeConfig?.api_key || !runtimeConfig?.base_url) {
      throw Object.assign(new Error('拉取模型列表缺少必要字段'), { statusCode: 400 });
    }

    const response = await axios.get(buildProviderUrl(runtimeConfig.base_url, '/models'), {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${runtimeConfig.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    const rawModels = extractModelArray(response.data);
    if (!rawModels.length) {
      throw Object.assign(
        new Error('供应商没有返回可识别的模型列表，请检查 /models 接口或手动添加模型'),
        { statusCode: 400 }
      );
    }

    return normalizeCatalog(
      rawModels.map((model) => ({
        id: model.id || model.model,
        display_name: model.display_name || model.name || model.id || model.model,
        owned_by: model.owned_by,
        visible: false,
      })),
      config.model
    );
  },

  async syncCatalogForConfig(config) {
    if (!config?.id) {
      throw Object.assign(new Error('同步模型列表需要已保存的 AI 配置'), { statusCode: 400 });
    }

    const [existingCatalog, remoteCatalog] = await Promise.all([
      this.getCatalogForConfig(config),
      this.fetchRemoteCatalog(config),
    ]);

    const mergedCatalog = mergeCatalog(existingCatalog, remoteCatalog, config.model);
    await this.saveCatalogForConfig(config.id, mergedCatalog, { defaultModel: config.model });
    return mergedCatalog;
  },

  async getFrontendModels(config) {
    const catalog = await this.getCatalogForConfig(config);
    return catalog.filter((model) => model.visible);
  },

  async resolveRequestedModel(config, requestedModel, { requireVisible = true } = {}) {
    const normalizedRequestedModel = String(requestedModel || '').trim();
    if (!normalizedRequestedModel) {
      return config.model;
    }

    const catalog = await this.getCatalogForConfig(config);
    const matchedModel = catalog.find((model) => model.id === normalizedRequestedModel);

    if (!matchedModel) {
      throw Object.assign(new Error('所选模型不存在于当前供应商配置中'), { statusCode: 400 });
    }

    if (requireVisible && !matchedModel.visible) {
      throw Object.assign(new Error('所选模型未在后台启用给前端使用'), { statusCode: 400 });
    }

    return matchedModel.id;
  },
};

module.exports = AiModelCatalogService;
