/**
 * AI Agent 服务 - SSE流式响应引擎
 */

const axios = require('axios');
const { createChatMessages, getActiveConfig, getPrompt, parseToolCall, getToolDefinitions } = require('../ai');
const { pipeProviderStream } = require('../ai/sse');
const { buildProviderUrl } = require('../utils/ai-config');
const AiModelCatalogService = require('./aiModelCatalog.service');

const AiAgentService = {
  /**
   * 根据主题生成完整文章 - SSE流
   */
  async generateArticle(topic, style, user, requestedModel) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt('generateArticle');
    if (!promptDef) throw Object.assign(new Error('提示词模板不存在'), { statusCode: 500 });

    const messages = createChatMessages(promptDef, { topic, style });
    const model = await AiModelCatalogService.resolveRequestedModel(config, requestedModel, {
      requireVisible: true,
    });

    return createSSEStream(config, messages, model);
  },

  /**
   * 改写/润色/扩写/精简 - SSE流
   * @param {string} content - 原始内容
   * @param {string} action - polish|expand|shorten|summarize
   */
  async refineContent(content, action, requestedModel) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt(action);
    if (!promptDef) throw Object.assign(new Error(`不支持的操作类型: ${action}`), { statusCode: 400 });

    const messages = createChatMessages(promptDef, { content });
    const model = await AiModelCatalogService.resolveRequestedModel(config, requestedModel, {
      requireVisible: true,
    });

    return createSSEStream(config, messages, model);
  },

  /**
   * 标题优化 - 生成5个变体
   * 非流式，直接返回结果
   */
  async optimizeTitle(title, requestedModel) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt('optimizeTitle');
    if (!promptDef) throw Object.assign(new Error('提示词模板不存在'), { statusCode: 500 });

    const messages = createChatMessages(promptDef, { title });
    const model = await AiModelCatalogService.resolveRequestedModel(config, requestedModel, {
      requireVisible: true,
    });

    const response = await axios.post(
      buildProviderUrl(config.base_url, '/chat/completions'),
      {
        model,
        messages,
        temperature: config.temperature,
        top_p: config.top_p,
        ...(config.max_tokens ? { max_tokens: config.max_tokens } : {}),
        ...config.extraParams,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawContent = response.data.choices?.[0]?.message?.content || '[]';

    // 尝试解析JSON数组
    let titles = [];
    try {
      titles = JSON.parse(rawContent);
      if (!Array.isArray(titles)) titles = [rawContent];
    } catch {
      // 如果不是JSON，按行分割
      titles = rawContent
        .split(/\n/)
        .map(l => l.replace(/^[\d.)\s]+/, '').trim())
        .filter(l => l.length > 0)
        .slice(0, 5);
    }

    return { titles: titles.slice(0, 5) };
  },
};

/**
 * 创建SSE流
 * @returns {ReadableStream}
 */
async function createSSEStream(config, messages, model) {
  const response = await axios({
    method: 'post',
    url: buildProviderUrl(config.base_url, '/chat/completions'),
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    data: {
      model: model || config.model,
      messages,
      temperature: config.temperature,
      top_p: config.top_p,
      stream: true,
      ...(config.max_tokens ? { max_tokens: config.max_tokens } : {}),
      ...config.extraParams,
      tools: getToolDefinitions(),
      tool_choice: 'auto',
    },
    responseType: 'stream',
  });

  return response.data;
}

/**
 * 将SSE流管道化到Express response
 * @param {Stream} stream - axios response stream
 * @param {Response} res - Express response
 */
function pipeSSEStream(stream, res) {
  return pipeProviderStream(stream, res, {
    parseToolCallFn: parseToolCall,
    onError: (err) => {
      console.error('AI stream error:', err);
    },
  });
}

module.exports = { AiAgentService, pipeSSEStream };
