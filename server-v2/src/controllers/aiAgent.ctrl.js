/**
 * AI Agent 路由控制器
 * - POST /generate (SSE流式)
 * - POST /refine (SSE流式)
 * - POST /title
 * - GET /prompts
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { AiAgentService, pipeSSEStream } = require('../services/aiAgent.service');
const { listPrompts } = require('../ai');

const router = express.Router();

// 所有AI Agent路由需要登录
router.use(auth);

/**
 * POST /api/ai-agent/generate
 * 根据主题生成文章（SSE流式）
 */
router.post('/generate', async (req, res) => {
  try {
    const { topic, style } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, message: '请提供文章主题(topic)' });
    }

    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await AiAgentService.generateArticle(
      topic,
      style || 'professional',
      req.user
    );
    pipeSSEStream(stream, res);
  } catch (err) {
    console.error('AI generate error:', err);
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/ai-agent/refine
 * 内容改写/润色/扩写/精简（SSE流式）
 * body: { content, action }
 * action: polish | expand | shorten | summarize
 */
router.post('/refine', async (req, res) => {
  try {
    const { content, action } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ success: false, message: '请提供要处理的内容(content)' });
    }
    if (!action) {
      return res.status(400).json({ success: false, message: '请指定操作类型(action): polish|expand|shorten|summarize' });
    }

    const validActions = ['polish', 'expand', 'shorten', 'summarize'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: `不支持的操作类型: ${action}，可选: ${validActions.join(', ')}` });
    }

    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await AiAgentService.refineContent(content, action);
    pipeSSEStream(stream, res);
  } catch (err) {
    console.error('AI refine error:', err);
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/ai-agent/title
 * 标题优化，返回5个变体
 * body: { title }
 */
router.post('/title', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, message: '请提供标题(title)' });
    }

    const result = await AiAgentService.optimizeTitle(title);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('AI title optimize error:', err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ai-agent/prompts
 * 获取提示词模板列表
 */
router.get('/prompts', (req, res) => {
  res.json({ success: true, data: listPrompts() });
});

module.exports = router;
