/**
 * AI Agent 服务 - SSE流式响应引擎
 */

const axios = require('axios');
const { createChatMessages, getActiveConfig, getPrompt, parseToolCall, getToolDefinitions } = require('../ai');

const AiAgentService = {
  /**
   * 根据主题生成完整文章 - SSE流
   */
  async generateArticle(topic, style, user) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt('generateArticle');
    if (!promptDef) throw Object.assign(new Error('提示词模板不存在'), { statusCode: 500 });

    const messages = createChatMessages(promptDef, { topic, style });

    return createSSEStream(config, messages);
  },

  /**
   * 改写/润色/扩写/精简 - SSE流
   * @param {string} content - 原始内容
   * @param {string} action - polish|expand|shorten|summarize
   */
  async refineContent(content, action) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt(action);
    if (!promptDef) throw Object.assign(new Error(`不支持的操作类型: ${action}`), { statusCode: 400 });

    const messages = createChatMessages(promptDef, { content });

    return createSSEStream(config, messages);
  },

  /**
   * 标题优化 - 生成5个变体
   * 非流式，直接返回结果
   */
  async optimizeTitle(title) {
    const config = await getActiveConfig();
    if (!config) throw Object.assign(new Error('未配置 AI 服务'), { statusCode: 500 });

    const promptDef = getPrompt('optimizeTitle');
    if (!promptDef) throw Object.assign(new Error('提示词模板不存在'), { statusCode: 500 });

    const messages = createChatMessages(promptDef, { title });

    const response = await axios.post(
      `${config.base_url}/chat/completions`,
      {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
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
async function createSSEStream(config, messages) {
  const response = await axios({
    method: 'post',
    url: `${config.base_url}/chat/completions`,
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
    },
    data: {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      stream: true,
      ...config.extraParams,
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
  let fullContent = '';
  let toolCalls = [];

  stream.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        res.write('data: [DONE]\n\n');
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];

        // 处理内容delta
        const delta = choice?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta })}\n\n`);
        }

        // 处理tool_calls
        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id, function: { name: '', arguments: '' } };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch {}
    }
  });

  stream.on('end', () => {
    // 发送tool_call结果
    for (const tc of toolCalls) {
      const parsed = parseToolCall(tc);
      if (parsed) {
        res.write(`data: ${JSON.stringify({ type: 'tool_call', tool: parsed })}\n\n`);
      }
    }
    res.end();
  });

  stream.on('error', (err) => {
    console.error('AI stream error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  });
}

module.exports = { AiAgentService, pipeSSEStream };
