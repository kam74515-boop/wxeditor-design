const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const {
  createChatMessages,
  getActiveConfig,
  getPrompt,
  getToolDefinitions,
  parseToolCall,
} = require('../ai');
const { pipeProviderStream } = require('../ai/sse');
const { buildProviderUrl } = require('../utils/ai-config');
const AiModelCatalogService = require('../services/aiModelCatalog.service');
const AiToolRunService = require('../services/aiToolRun.service');

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

function buildChatMessages(message, context, history) {
  const promptDef = getPrompt('editorChat');
  if (!promptDef) {
    throw Object.assign(new Error('编辑器主链路 prompt 未配置'), { statusCode: 500 });
  }

  return createChatMessages(promptDef, { message, context }, history);
}

router.post('/chat', auth, upload.single('file'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  try {
    const { message, documentId, context, history: historyRaw, model: requestedModel } = req.body;
    let history = [];
    if (historyRaw) { try { history = JSON.parse(historyRaw); } catch {} }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }
    if (message.length > 10000) {
      return res.status(400).json({ success: false, message: '消息长度不能超过 10000 字符' });
    }
    if (!Array.isArray(history)) history = [];
    history = history.filter(h => h && typeof h.role === 'string' && typeof h.content === 'string').slice(-20);

    const config = await getActiveConfig();
    if (!config) return res.status(500).json({ success: false, message: '未配置 AI 服务' });
    const model = await AiModelCatalogService.resolveRequestedModel(config, requestedModel, {
      requireVisible: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = buildChatMessages(message, context, history);
    const tools = getToolDefinitions();

    const stream = await axios({
      method: 'post',
      url: buildProviderUrl(config.base_url, '/chat/completions'),
      headers: { 'Authorization': `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
      data: {
        model,
        messages,
        temperature: config.temperature,
        top_p: config.top_p,
        stream: true,
        ...(config.max_tokens ? { max_tokens: config.max_tokens } : {}),
        ...config.extraParams,
        tools,
        tool_choice: 'auto',
      },
      responseType: 'stream',
    });

    pipeProviderStream(stream.data, res, {
      parseToolCallFn: parseToolCall,
      onComplete: async ({ reply, actions, rawToolCalls }) => {
        if (documentId && reply) {
          await db('ai_chats').insert({
            document_id: documentId,
            user_id: req.userId,
            role: 'assistant',
            content: reply,
          });
        }

        if (documentId && rawToolCalls?.length) {
          await AiToolRunService.recordRuns({
            documentId,
            userId: req.userId,
            model,
            reply,
            actions,
            rawToolCalls,
          });
        }
      },
      onError: (err) => {
        console.error('AI stream error:', err);
      },
    });
  } catch (err) {
    console.error('AI chat error:', err);
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
});

router.get('/models', auth, async (_req, res) => {
  try {
    const config = await getActiveConfig();
    if (!config) return res.status(500).json({ success: false, message: '未配置 AI 服务' });

    const models = await AiModelCatalogService.getFrontendModels(config);
    const defaultModel = await AiModelCatalogService.getCatalogForConfig(config);
    const defaultModelEntry = defaultModel.find((item) => item.id === config.model);

    res.json({
      success: true,
      data: {
        provider: config.provider,
        provider_name: config.name || config.provider,
        default_model: config.model,
        default_model_display_name: defaultModelEntry?.display_name || config.model,
        models: models.map((model) => ({
          id: model.id,
          display_name: model.display_name,
          is_default: model.id === config.model,
        })),
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/rewrite', auth, async (req, res) => {
  try {
    const { content, action, customPrompt, model: requestedModel } = req.body;
    if (!content || !action) return res.status(400).json({ success: false, message: '缺少必要参数' });

    const config = await getActiveConfig();
    if (!config) return res.status(500).json({ success: false, message: '未配置 AI 服务' });
    const model = await AiModelCatalogService.resolveRequestedModel(config, requestedModel, {
      requireVisible: true,
    });

    const prompts = {
      polish: '请润色以下内容，保持原意但让表达更流畅、专业：',
      simplify: '请简化以下内容，使其更易读易懂：',
      expand: '请扩展以下内容，增加细节和深度：',
      shorten: '请精简以下内容，保留核心要点：',
    };

    const systemPrompt = customPrompt || prompts[action] || '请优化以下内容：';

    const response = await axios.post(
      buildProviderUrl(config.base_url, '/chat/completions'),
      {
        model,
        messages: [
          { role: 'system', content: '你是一个专业的微信公众号图文排版助手。请用中文回复。' },
          { role: 'user', content: `${systemPrompt}\n\n${content}` },
        ],
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

    res.json({ success: true, data: { result: response.data.choices?.[0]?.message?.content || '' } });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.get('/history/:documentId', auth, async (req, res) => {
  try {
    const chats = await db('ai_chats')
      .where({ document_id: req.params.documentId, user_id: req.userId })
      .orderBy('created_at', 'asc');
    res.json({ success: true, data: chats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history/:documentId/tool-runs', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const runs = await AiToolRunService.listRuns(req.params.documentId, req.userId, { limit });
    res.json({ success: true, data: runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
