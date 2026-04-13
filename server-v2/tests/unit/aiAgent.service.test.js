const axios = require('axios');
const { createChatMessages, getActiveConfig, getPrompt, parseToolCall } = require('../../src/ai');
const { AiAgentService, pipeSSEStream } = require('../../src/services/aiAgent.service');

jest.mock('axios');
jest.mock('../../src/ai', () => ({
  createChatMessages: jest.fn(),
  getActiveConfig: jest.fn(),
  getPrompt: jest.fn(),
  parseToolCall: jest.fn(),
}));

describe('AiAgentService', () => {
  const mockConfig = {
    base_url: 'https://api.openai.com/v1',
    api_key: 'sk-test',
    model: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2000,
    top_p: 1,
    extraParams: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── generateArticle ─────────────────────────────────────
  describe('generateArticle', () => {
    it('should return an SSE stream', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Write about {{topic}}' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Write about AI' }]);
      const mockStream = { on: jest.fn() };
      axios.mockResolvedValue({ data: mockStream });

      const result = await AiAgentService.generateArticle('AI', 'professional', { id: 1 });

      expect(getActiveConfig).toHaveBeenCalled();
      expect(getPrompt).toHaveBeenCalledWith('generateArticle');
      expect(createChatMessages).toHaveBeenCalledWith(
        { template: 'Write about {{topic}}' },
        { topic: 'AI', style: 'professional' }
      );
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: 'https://api.openai.com/v1/chat/completions',
          responseType: 'stream',
        })
      );
      expect(result).toBe(mockStream);
    });

    it('should throw 500 if no active config', async () => {
      getActiveConfig.mockResolvedValue(null);

      await expect(
        AiAgentService.generateArticle('topic', 'style', { id: 1 })
      ).rejects.toMatchObject({ statusCode: 500, message: '未配置 AI 服务' });
    });

    it('should throw 500 if prompt template not found', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue(null);

      await expect(
        AiAgentService.generateArticle('topic', 'style', { id: 1 })
      ).rejects.toMatchObject({ statusCode: 500, message: '提示词模板不存在' });
    });
  });

  // ── refineContent ───────────────────────────────────────
  describe('refineContent', () => {
    it('should return an SSE stream for polish action', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Polish: {{content}}' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Polish' }]);
      const mockStream = { on: jest.fn() };
      axios.mockResolvedValue({ data: mockStream });

      const result = await AiAgentService.refineContent('some text', 'polish');

      expect(getPrompt).toHaveBeenCalledWith('polish');
      expect(createChatMessages).toHaveBeenCalledWith(
        { template: 'Polish: {{content}}' },
        { content: 'some text' }
      );
      expect(result).toBe(mockStream);
    });

    it('should throw 500 if no active config', async () => {
      getActiveConfig.mockResolvedValue(null);

      await expect(
        AiAgentService.refineContent('text', 'expand')
      ).rejects.toMatchObject({ statusCode: 500, message: '未配置 AI 服务' });
    });

    it('should throw 400 if action type not supported', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue(null);

      await expect(
        AiAgentService.refineContent('text', 'invalid_action')
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('不支持的操作类型') });
    });
  });

  // ── optimizeTitle ───────────────────────────────────────
  describe('optimizeTitle', () => {
    it('should return parsed JSON array of titles', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize: {{title}}' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      const titles = ['Title 1', 'Title 2', 'Title 3'];
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: JSON.stringify(titles) } }],
        },
      });

      const result = await AiAgentService.optimizeTitle('My Title');

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Optimize' }],
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 1,
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer sk-test',
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result.titles).toEqual(['Title 1', 'Title 2', 'Title 3']);
    });

    it('should return max 5 titles', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      const titles = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: JSON.stringify(titles) } }],
        },
      });

      const result = await AiAgentService.optimizeTitle('Title');
      expect(result.titles).toHaveLength(5);
    });

    it('should handle non-array JSON response by wrapping raw content in array', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      // When JSON.parse returns a non-array, code does: titles = [rawContent] (the raw string)
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '42' } }],
        },
      });

      const result = await AiAgentService.optimizeTitle('Title');
      // JSON.parse('42') => 42, not array => titles = ['42'] (raw content string)
      expect(result.titles).toEqual(['42']);
    });

    it('should fallback to line-splitting when JSON parse fails', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      const rawText = '1. First Title\n2. Second Title\n3. Third Title';
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: rawText } }],
        },
      });

      const result = await AiAgentService.optimizeTitle('Title');
      expect(result.titles).toEqual(['First Title', 'Second Title', 'Third Title']);
    });

    it('should handle empty choices gracefully', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      axios.post.mockResolvedValue({
        data: { choices: [] },
      });

      const result = await AiAgentService.optimizeTitle('Title');
      // rawContent is '[]', JSON.parse gives [], not array -> stays [], slice -> []
      expect(result.titles).toEqual([]);
    });

    it('should handle null content in response', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue({ template: 'Optimize' });
      createChatMessages.mockReturnValue([{ role: 'user', content: 'Optimize' }]);

      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: null } }] },
      });

      const result = await AiAgentService.optimizeTitle('Title');
      // rawContent = '[]', parsed to []
      expect(result.titles).toEqual([]);
    });

    it('should throw 500 if no active config', async () => {
      getActiveConfig.mockResolvedValue(null);

      await expect(
        AiAgentService.optimizeTitle('Title')
      ).rejects.toMatchObject({ statusCode: 500, message: '未配置 AI 服务' });
    });

    it('should throw 500 if prompt template not found', async () => {
      getActiveConfig.mockResolvedValue(mockConfig);
      getPrompt.mockReturnValue(null);

      await expect(
        AiAgentService.optimizeTitle('Title')
      ).rejects.toMatchObject({ statusCode: 500, message: '提示词模板不存在' });
    });
  });
});

// ── pipeSSEStream ──────────────────────────────────────────
describe('pipeSSEStream', () => {
  let mockStream;
  let mockRes;
  let handlers;

  beforeEach(() => {
    handlers = {};
    mockStream = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
    };
    mockRes = {
      write: jest.fn(),
      end: jest.fn(),
    };
  });

  it('should process content delta and write to response', () => {
    pipeSSEStream(mockStream, mockRes);

    const chunk = Buffer.from('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n');
    handlers.data(chunk);

    expect(mockRes.write).toHaveBeenCalledWith(
      'data: {"type":"content","content":"hello"}\n\n'
    );
  });

  it('should handle [DONE] signal', () => {
    pipeSSEStream(mockStream, mockRes);

    const chunk = Buffer.from('data: [DONE]\n\n');
    handlers.data(chunk);

    expect(mockRes.write).toHaveBeenCalledWith('data: [DONE]\n\n');
  });

  it('should ignore non-data lines', () => {
    pipeSSEStream(mockStream, mockRes);

    const chunk = Buffer.from(': comment\nsome other text\n');
    handlers.data(chunk);

    expect(mockRes.write).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON gracefully', () => {
    pipeSSEStream(mockStream, mockRes);

    const chunk = Buffer.from('data: not-json\n\n');
    // Should not throw
    handlers.data(chunk);
  });

  it('should accumulate tool_calls and emit on end', () => {
    parseToolCall.mockReturnValue({ name: 'search', args: { q: 'test' } });

    pipeSSEStream(mockStream, mockRes);

    // Send tool_call delta
    const chunk = Buffer.from(
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","function":{"name":"search","arguments":"{}"}}]}}]}\n\n'
    );
    handlers.data(chunk);

    // End stream
    handlers.end();

    expect(parseToolCall).toHaveBeenCalled();
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"tool_call"')
    );
    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should end response on stream end without tool calls', () => {
    pipeSSEStream(mockStream, mockRes);
    handlers.end();

    expect(mockRes.end).toHaveBeenCalled();
  });

  it('should handle stream error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    pipeSSEStream(mockStream, mockRes);

    handlers.error(new Error('Connection lost'));

    expect(consoleSpy).toHaveBeenCalledWith(
      'AI stream error:',
      expect.any(Error)
    );
    expect(mockRes.write).toHaveBeenCalledWith(
      expect.stringContaining('"type":"error"')
    );
    expect(mockRes.end).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle multiple chunks in a single data event', () => {
    pipeSSEStream(mockStream, mockRes);

    const multiLineChunk = Buffer.from(
      'data: {"choices":[{"delta":{"content":"a"}}]}\n' +
      'data: {"choices":[{"delta":{"content":"b"}}]}\n' +
      'some noise\n\n'
    );
    handlers.data(multiLineChunk);

    expect(mockRes.write).toHaveBeenCalledTimes(2);
  });
});
