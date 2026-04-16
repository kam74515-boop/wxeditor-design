const axios = require('axios');

function normalizeBaseUrl(baseUrl = '') {
  const normalized = String(baseUrl || '').trim().replace(/\/+$/, '');
  return normalized.replace(/\/(chat\/completions|completions|models)$/i, '');
}

function parseExtraParams(extraParams) {
  if (!extraParams) return {};
  if (typeof extraParams === 'object') return extraParams;

  try {
    const parsed = JSON.parse(extraParams);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeNumeric(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function maskApiKey(apiKey = '') {
  if (!apiKey) return '';
  const visible = apiKey.slice(-4);
  return `****${visible}`;
}

function buildProviderUrl(baseUrl, path) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

function toRuntimeAiConfig(config) {
  if (!config) return null;

  return {
    ...config,
    base_url: normalizeBaseUrl(config.base_url),
    temperature: normalizeNumeric(config.temperature, 0.7),
    // 默认不为 provider 请求显式传 max_tokens，交给模型/供应商使用默认上限
    max_tokens: null,
    top_p: normalizeNumeric(config.top_p, 0.95),
    extraParams: parseExtraParams(config.extra_params),
  };
}

function toSafeAiConfig(config, { includeApiKey = false } = {}) {
  if (!config) return null;

  const runtimeConfig = toRuntimeAiConfig(config);
  const safeConfig = {
    ...runtimeConfig,
    extra_params: runtimeConfig.extraParams,
    api_key_masked: maskApiKey(runtimeConfig.api_key),
  };

  delete safeConfig.extraParams;

  if (!includeApiKey) {
    delete safeConfig.api_key;
  }

  return safeConfig;
}

function validateAiConfigPayload(payload, { partial = false } = {}) {
  const requiredFields = ['name', 'provider', 'api_key', 'base_url', 'model'];
  const missing = requiredFields.filter((field) => {
    if (partial) return false;
    return payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '';
  });

  if (missing.length > 0) {
    throw Object.assign(
      new Error(`必填字段缺失: ${missing.join(', ')}`),
      { statusCode: 400 }
    );
  }

  if (payload.base_url !== undefined && !normalizeBaseUrl(payload.base_url)) {
    throw Object.assign(new Error('base_url 不能为空'), { statusCode: 400 });
  }

  const temperature = normalizeNumeric(payload.temperature, undefined);
  if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
    throw Object.assign(new Error('temperature 必须在 0 到 2 之间'), { statusCode: 400 });
  }

  const topP = normalizeNumeric(payload.top_p, undefined);
  if (topP !== undefined && (topP < 0 || topP > 1)) {
    throw Object.assign(new Error('top_p 必须在 0 到 1 之间'), { statusCode: 400 });
  }

}

async function testAiConfigConnection(config) {
  const runtimeConfig = toRuntimeAiConfig(config);

  if (!runtimeConfig?.api_key || !runtimeConfig?.base_url || !runtimeConfig?.model) {
    throw Object.assign(new Error('测试连接缺少必要字段'), { statusCode: 400 });
  }

  const startedAt = Date.now();
  await axios.post(
    buildProviderUrl(runtimeConfig.base_url, '/chat/completions'),
    {
      model: runtimeConfig.model,
      messages: [
        { role: 'system', content: 'Reply with pong only.' },
        { role: 'user', content: 'ping' },
      ],
      temperature: 0,
      max_tokens: 8,
    },
    {
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${runtimeConfig.api_key}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
  };
}

module.exports = {
  buildProviderUrl,
  maskApiKey,
  normalizeBaseUrl,
  parseExtraParams,
  testAiConfigConnection,
  toRuntimeAiConfig,
  toSafeAiConfig,
  validateAiConfigPayload,
};
