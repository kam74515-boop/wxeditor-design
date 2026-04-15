const EventEmitter = require('events');
const express = require('express');
const request = require('supertest');
const axios = require('axios');
const db = require('../../src/config/db');
const {
  createChatMessages,
  getActiveConfig,
  getPrompt,
  getToolDefinitions,
  parseToolCall,
} = require('../../src/ai');
const AiModelCatalogService = require('../../src/services/aiModelCatalog.service');
const AiToolRunService = require('../../src/services/aiToolRun.service');

jest.mock('axios');
jest.mock('../../src/config/db', () => jest.fn());
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, _res, next) => {
    req.userId = 123;
    req.user = { id: 123, role: 'user' };
    next();
  },
}));
jest.mock('../../src/ai', () => ({
  createChatMessages: jest.fn(),
  getActiveConfig: jest.fn(),
  getPrompt: jest.fn(),
  getToolDefinitions: jest.fn(),
  parseToolCall: jest.fn(),
}));
jest.mock('../../src/services/aiModelCatalog.service', () => ({
  resolveRequestedModel: jest.fn(),
  getFrontendModels: jest.fn(),
  getCatalogForConfig: jest.fn(),
}));
jest.mock('../../src/services/aiToolRun.service', () => ({
  recordRuns: jest.fn(),
  listRuns: jest.fn(),
}));

const aiRouter = require('../../src/controllers/ai.ctrl');

describe('AI controller /api/ai/chat', () => {
  let app;
  let chatInsertMock;

  beforeEach(() => {
    jest.clearAllMocks();

    chatInsertMock = jest.fn().mockResolvedValue([1]);
    db.mockImplementation((table) => {
      if (table === 'ai_chats') {
        return { insert: chatInsertMock };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    getPrompt.mockReturnValue({
      key: 'editorChat',
      system: 'editor system prompt',
      buildUserMessage: jest.fn(),
    });
    createChatMessages.mockReturnValue([
      { role: 'system', content: 'editor system prompt' },
      { role: 'user', content: 'rewritten user message' },
    ]);
    getActiveConfig.mockResolvedValue({
      name: 'OpenAI 兼容',
      provider: 'openai',
      base_url: 'https://ai.example.com',
      api_key: 'sk-test',
      model: 'qwen-test',
      temperature: 0.7,
      max_tokens: null,
      top_p: 1,
      extraParams: { frequency_penalty: 0.2 },
    });
    getToolDefinitions.mockReturnValue([
      { type: 'function', function: { name: 'replace_editor_content' } },
    ]);
    AiModelCatalogService.resolveRequestedModel.mockResolvedValue('qwen-test');
    AiModelCatalogService.getFrontendModels.mockResolvedValue([
      { id: 'qwen-test', display_name: 'Qwen Test', visible: true },
      { id: 'qwen-pro', display_name: 'Qwen Pro', visible: true },
    ]);
    AiModelCatalogService.getCatalogForConfig.mockResolvedValue([
      { id: 'qwen-test', display_name: 'Qwen Test', visible: true },
      { id: 'qwen-pro', display_name: 'Qwen Pro', visible: true },
    ]);
    parseToolCall.mockReturnValue({
      tool: 'replace_editor_content',
      args: { html: '<p>修改后内容</p>' },
    });
    AiToolRunService.recordRuns.mockResolvedValue([]);

    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRouter);
  });

  it('uses the shared editor prompt stack and emits unified SSE events', async () => {
    const stream = new EventEmitter();
    let axiosReadyResolve;
    const axiosReady = new Promise((resolve) => {
      axiosReadyResolve = resolve;
    });
    axios.mockImplementation(async () => {
      axiosReadyResolve();
      return { data: stream };
    });

    const responsePromise = request(app)
      .post('/api/ai/chat')
      .send({
        message: '请帮我润色全文',
        context: '<p>原始文章</p>',
        documentId: 'doc-1',
        history: JSON.stringify([{ role: 'assistant', content: '上一轮回复' }]),
      })
      .then((res) => res);

    await axiosReady;
    await new Promise((resolve) => setImmediate(resolve));

    stream.emit('data', Buffer.from('data: {"choices":[{"delta":{"reasoning_content":"先分析文章结构"}}]}\n\n'));
    stream.emit('data', Buffer.from('data: {"choices":[{"delta":{"content":"好的，我来处理。"}}]}\n\n'));
    stream.emit(
      'data',
      Buffer.from(
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"replace_editor_content","arguments":"{\\"html\\":\\"<p>修改后内容</p>\\"}"}}]}}]}\n\n'
      )
    );
    stream.emit('end');

    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(getPrompt).toHaveBeenCalledWith('editorChat');
    expect(createChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'editorChat' }),
      { message: '请帮我润色全文', context: '<p>原始文章</p>' },
      [{ role: 'assistant', content: '上一轮回复' }]
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: 'https://ai.example.com/chat/completions',
        data: expect.objectContaining({
          model: 'qwen-test',
          messages: [
            { role: 'system', content: 'editor system prompt' },
            { role: 'user', content: 'rewritten user message' },
          ],
          tools: [{ type: 'function', function: { name: 'replace_editor_content' } }],
          tool_choice: 'auto',
          frequency_penalty: 0.2,
        }),
        responseType: 'stream',
      })
    );

    expect(res.text).toContain('event: thinking');
    expect(res.text).toContain('event: content');
    expect(res.text).toContain('event: tool_start');
    expect(res.text).toContain('event: tool_delta');
    expect(res.text).toContain('event: tool_call');
    expect(res.text).toContain('event: done');
    expect(res.text).toContain('"reply":"好的，我来处理。"');
    expect(chatInsertMock).toHaveBeenCalledWith({
      document_id: 'doc-1',
      user_id: 123,
      role: 'assistant',
      content: '好的，我来处理。',
    });
    expect(AiToolRunService.recordRuns).toHaveBeenCalledWith({
      documentId: 'doc-1',
      userId: 123,
      model: 'qwen-test',
      reply: '好的，我来处理。',
      actions: [{ tool: 'replace_editor_content', args: { html: '<p>修改后内容</p>' } }],
      rawToolCalls: [
        {
          id: 'call_1',
          function: {
            name: 'replace_editor_content',
            arguments: '{"html":"<p>修改后内容</p>"}',
          },
        },
      ],
    });
  });

  it('returns 400 for invalid message payloads before calling AI', async () => {
    const res = await request(app).post('/api/ai/chat').send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: '消息不能为空' });
    expect(axios).not.toHaveBeenCalled();
  });

  it('emits SSE error when upstream stream fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const stream = new EventEmitter();
    let axiosReadyResolve;
    const axiosReady = new Promise((resolve) => {
      axiosReadyResolve = resolve;
    });
    axios.mockImplementation(async () => {
      axiosReadyResolve();
      return { data: stream };
    });

    const responsePromise = request(app)
      .post('/api/ai/chat')
      .send({ message: '测试异常流' })
      .then((res) => res);

    await axiosReady;
    await new Promise((resolve) => setImmediate(resolve));

    stream.emit('error', new Error('upstream failed'));

    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('"message":"upstream failed"');
    expect(chatInsertMock).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('uses the selected frontend model when the request provides one', async () => {
    const stream = new EventEmitter();
    let axiosReadyResolve;
    const axiosReady = new Promise((resolve) => {
      axiosReadyResolve = resolve;
    });
    AiModelCatalogService.resolveRequestedModel.mockResolvedValue('qwen-pro');
    axios.mockImplementation(async () => {
      axiosReadyResolve();
      return { data: stream };
    });

    const responsePromise = request(app)
      .post('/api/ai/chat')
      .send({ message: '用 Pro 模型回答', model: 'qwen-pro' })
      .then((res) => res);

    await axiosReady;
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit('end');

    const res = await responsePromise;

    expect(res.status).toBe(200);
    expect(AiModelCatalogService.resolveRequestedModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'qwen-test' }),
      'qwen-pro',
      { requireVisible: true }
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: 'qwen-pro',
        }),
      })
    );
  });
});

describe('AI controller /api/ai/history/:documentId/tool-runs', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    AiToolRunService.listRuns.mockResolvedValue([
      {
        id: 1,
        document_id: 'doc-1',
        tool_name: 'replace_editor_content',
        normalized_args: { html: '<p>修改后内容</p>' },
      },
    ]);

    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRouter);
  });

  it('returns stored tool runs for review', async () => {
    const res = await request(app).get('/api/ai/history/doc-1/tool-runs?limit=5');

    expect(res.status).toBe(200);
    expect(AiToolRunService.listRuns).toHaveBeenCalledWith('doc-1', 123, { limit: 5 });
    expect(res.body).toEqual({
      success: true,
      data: [
        {
          id: 1,
          document_id: 'doc-1',
          tool_name: 'replace_editor_content',
          normalized_args: { html: '<p>修改后内容</p>' },
        },
      ],
    });
  });
});

describe('AI controller /api/ai/models', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    getActiveConfig.mockResolvedValue({
      name: 'OpenAI 兼容',
      provider: 'openai',
      base_url: 'https://ai.example.com',
      api_key: 'sk-test',
      model: 'qwen-test',
      temperature: 0.7,
      max_tokens: null,
      top_p: 1,
      extraParams: {},
    });
    AiModelCatalogService.getFrontendModels.mockResolvedValue([
      { id: 'qwen-test', display_name: 'Qwen Test', visible: true },
      { id: 'qwen-pro', display_name: 'Qwen Pro', visible: true },
    ]);
    AiModelCatalogService.getCatalogForConfig.mockResolvedValue([
      { id: 'qwen-test', display_name: 'Qwen Test', visible: true },
      { id: 'qwen-pro', display_name: 'Qwen Pro', visible: true },
    ]);

    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRouter);
  });

  it('returns only backend-enabled frontend models', async () => {
    const res = await request(app).get('/api/ai/models');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        provider: 'openai',
        provider_name: 'OpenAI 兼容',
        default_model: 'qwen-test',
        default_model_display_name: 'Qwen Test',
        models: [
          { id: 'qwen-test', display_name: 'Qwen Test', is_default: true },
          { id: 'qwen-pro', display_name: 'Qwen Pro', is_default: false },
        ],
      },
    });
  });
});
