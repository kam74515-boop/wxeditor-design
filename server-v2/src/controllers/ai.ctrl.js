const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { auth } = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();
const upload = multer({ dest: 'tmp/' });

router.post('/chat', auth, upload.single('file'), async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  try {
    const { message, documentId, context, history: historyRaw } = req.body;
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

    const config = await db('ai_configs').where({ is_active: 1 }).first();
    if (!config) return res.status(500).json({ success: false, message: '未配置 AI 服务' });

    const extraParams = typeof config.extra_params === 'string' ? JSON.parse(config.extra_params) : (config.extra_params || {});

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = [
      { role: 'system', content: '你是一个专业的微信公众号图文排版助手。你擅长内容创作、润色、排版优化。请用中文回复。' },
    ];

    if (context) messages.push({ role: 'system', content: `当前文章内容：\n${context.substring(0, 3000)}` });
    history.forEach(h => messages.push({ role: h.role, content: h.content }));
    messages.push({ role: 'user', content: message });

    const stream = await axios({
      method: 'post',
      url: `${config.base_url}/chat/completions`,
      headers: { 'Authorization': `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
      data: { model: config.model, messages, temperature: config.temperature, max_tokens: config.max_tokens, top_p: config.top_p, stream: true, ...extraParams },
      responseType: 'stream',
    });

    let fullContent = '';
    stream.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        } catch {}
      }
    });

    stream.data.on('end', async () => {
      if (documentId && fullContent) {
        await db('ai_chats').insert({ document_id: documentId, user_id: req.userId, role: 'assistant', content: fullContent });
      }
      res.end();
    });

    stream.data.on('error', (err) => {
      console.error('AI stream error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('AI chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

router.post('/rewrite', auth, async (req, res) => {
  try {
    const { content, action, customPrompt } = req.body;
    if (!content || !action) return res.status(400).json({ success: false, message: '缺少必要参数' });

    const config = await db('ai_configs').where({ is_active: 1 }).first();
    if (!config) return res.status(500).json({ success: false, message: '未配置 AI 服务' });

    const prompts = {
      polish: '请润色以下内容，保持原意但让表达更流畅、专业：',
      simplify: '请简化以下内容，使其更易读易懂：',
      expand: '请扩展以下内容，增加细节和深度：',
      shorten: '请精简以下内容，保留核心要点：',
    };

    const systemPrompt = customPrompt || prompts[action] || '请优化以下内容：';

    const response = await axios.post(`${config.base_url}/chat/completions`, {
      model: config.model,
      messages: [
        { role: 'system', content: '你是一个专业的微信公众号图文排版助手。请用中文回复。' },
        { role: 'user', content: `${systemPrompt}\n\n${content}` },
      ],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    }, { headers: { 'Authorization': `Bearer ${config.api_key}` } });

    res.json({ success: true, data: { result: response.data.choices?.[0]?.message?.content || '' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

module.exports = router;
