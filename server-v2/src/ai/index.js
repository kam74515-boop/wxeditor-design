/**
 * AI模块统一导出
 */

const { PROMPTS, getPrompt, listPrompts } = require('./prompts');
const { formatForWechat, textToWechatHtml } = require('./formatter');
const { TOOLS, getToolDefinitions, getToolByName, parseToolCall } = require('./tools');
const db = require('../config/db');

module.exports = {
  PROMPTS,
  getPrompt,
  listPrompts,
  formatForWechat,
  textToWechatHtml,
  TOOLS,
  getToolDefinitions,
  getToolByName,
  parseToolCall,
  createChatMessages,
  getActiveConfig,
};

/**
 * 构建 OpenAI Chat Messages 数组
 * @param {object} promptDef - 来自 prompts.js 的提示词定义
 * @param {object} params - 传给 buildUserMessage 的参数
 * @param {Array} history - 历史消息 [{role, content}]
 * @returns {Array} messages
 */
function createChatMessages(promptDef, params, history = []) {
  const messages = [
    { role: 'system', content: promptDef.system },
  ];

  if (history && Array.isArray(history)) {
    history.slice(-20).forEach(h => {
      if (h && typeof h.role === 'string' && typeof h.content === 'string') {
        messages.push({ role: h.role, content: h.content });
      }
    });
  }

  const userMessage = promptDef.buildUserMessage(params);
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * 获取当前活跃的AI配置
 * @returns {Promise<object|null>}
 */
async function getActiveConfig() {
  const config = await db('ai_configs').where({ is_active: 1 }).first();
  if (!config) return null;

  const extraParams = typeof config.extra_params === 'string'
    ? JSON.parse(config.extra_params)
    : (config.extra_params || {});

  return { ...config, extraParams };
}
