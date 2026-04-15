const express = require('express');
const request = require('supertest');
const db = require('../../src/config/db');
const AiModelCatalogService = require('../../src/services/aiModelCatalog.service');

jest.mock('../../src/config/db', () => jest.fn());
jest.mock('../../src/middleware/auth', () => ({
  auth: (req, _res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  },
  restrictTo: () => (_req, _res, next) => next(),
}));
jest.mock('../../src/services/aiModelCatalog.service', () => ({
  getCatalogMap: jest.fn(),
  getCatalogForConfig: jest.fn(),
  saveCatalogForConfig: jest.fn(),
  fetchRemoteCatalog: jest.fn(),
  mergeCatalog: jest.fn(),
}));

const aiConfigRouter = require('../../src/controllers/aiConfig.ctrl');

describe('AI config controller', () => {
  let app;
  let aiConfigsQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    aiConfigsQuery = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      update: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockResolvedValue([11]),
    };

    db.mockImplementation((table) => {
      if (table === 'ai_configs') return aiConfigsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    app = express();
    app.use(express.json());
    app.use('/api/admin/ai-configs', aiConfigRouter);
  });

  it('fetches remote models from current form values while reusing stored api key', async () => {
    aiConfigsQuery.first.mockResolvedValue({
      id: 7,
      name: 'OpenAI',
      provider: 'openai',
      api_key: 'sk-existing',
      base_url: 'https://old.example.com/v1',
      model: 'gpt-4o-mini',
    });

    AiModelCatalogService.fetchRemoteCatalog.mockResolvedValue([
      { id: 'gpt-4o-mini', display_name: 'GPT-4o mini', visible: false, owned_by: 'openai' },
      { id: 'gpt-4.1', display_name: 'GPT-4.1', visible: false, owned_by: 'openai' },
    ]);
    AiModelCatalogService.getCatalogForConfig.mockResolvedValue([
      { id: 'gpt-4o-mini', display_name: '旧默认模型', visible: true, owned_by: '' },
    ]);
    AiModelCatalogService.mergeCatalog.mockReturnValue([
      { id: 'gpt-4o-mini', display_name: '旧默认模型', visible: true, owned_by: '' },
      { id: 'gpt-4.1', display_name: 'GPT-4.1', visible: false, owned_by: 'openai' },
    ]);

    const res = await request(app)
      .post('/api/admin/ai-configs/models/fetch')
      .send({
        config_id: 7,
        api_key: '',
        base_url: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      });

    expect(res.status).toBe(200);
    expect(AiModelCatalogService.fetchRemoteCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        api_key: 'sk-existing',
        base_url: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      })
    );
    expect(AiModelCatalogService.mergeCatalog).toHaveBeenCalledWith(
      [{ id: 'gpt-4o-mini', display_name: '旧默认模型', visible: true, owned_by: '' }],
      [
        { id: 'gpt-4o-mini', display_name: 'GPT-4o mini', visible: false, owned_by: 'openai' },
        { id: 'gpt-4.1', display_name: 'GPT-4.1', visible: false, owned_by: 'openai' },
      ],
      'gpt-4o-mini'
    );
    expect(res.body.data.models).toHaveLength(2);
  });

  it('saves manually added models to the catalog on update', async () => {
    aiConfigsQuery.first.mockResolvedValue({
      id: 8,
      name: 'Qwen',
      provider: 'qwen',
      api_key: 'sk-qwen',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
    });

    const res = await request(app)
      .put('/api/admin/ai-configs/8')
      .send({
        model: 'qwen-plus',
        model_catalog: [
          { id: 'qwen-plus', display_name: 'Qwen Plus', visible: true },
          { id: 'qwen-max-latest', display_name: 'Qwen Max Latest', visible: true },
        ],
      });

    expect(res.status).toBe(200);
    expect(AiModelCatalogService.saveCatalogForConfig).toHaveBeenCalledWith(
      '8',
      [
        { id: 'qwen-plus', display_name: 'Qwen Plus', visible: true },
        { id: 'qwen-max-latest', display_name: 'Qwen Max Latest', visible: true },
      ],
      { defaultModel: 'qwen-plus' }
    );
  });
});
