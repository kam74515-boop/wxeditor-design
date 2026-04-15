const axios = require('axios');
const db = require('../../src/config/db');
const AiModelCatalogService = require('../../src/services/aiModelCatalog.service');

jest.mock('axios');
jest.mock('../../src/config/db', () => jest.fn());

describe('AiModelCatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.mockImplementation(() => ({
      whereIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([]),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      merge: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('merges remote models while preserving display name and visible flag', () => {
    const merged = AiModelCatalogService.mergeCatalog(
      [
        { id: 'qwen-max', display_name: '千问 Max', visible: true },
        { id: 'qwen-plus', display_name: '千问 Plus', visible: false },
      ],
      [
        { id: 'qwen-plus', display_name: 'Qwen Plus', visible: false },
        { id: 'qwen-max', display_name: 'Qwen Max', visible: false },
        { id: 'qwen-turbo', display_name: 'Qwen Turbo', visible: false },
      ],
      'qwen-max'
    );

    expect(merged).toEqual([
      { id: 'qwen-max', display_name: '千问 Max', visible: true, owned_by: '' },
      { id: 'qwen-turbo', display_name: 'Qwen Turbo', visible: true, owned_by: '' },
      { id: 'qwen-plus', display_name: '千问 Plus', visible: false, owned_by: '' },
    ]);
  });

  it('fetches provider models from /models and normalizes display names', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { id: 'qwen-max', owned_by: 'dashscope' },
          { id: 'qwen-plus', name: 'Qwen Plus', owned_by: 'dashscope' },
        ],
      },
    });

    const result = await AiModelCatalogService.fetchRemoteCatalog({
      api_key: 'sk-test',
      base_url: 'https://api.example.com/v1/',
      model: 'qwen-max',
    });

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.example.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    );
    expect(result).toEqual([
      { id: 'qwen-max', display_name: 'qwen-max', visible: false, owned_by: 'dashscope' },
      { id: 'qwen-plus', display_name: 'Qwen Plus', visible: false, owned_by: 'dashscope' },
    ]);
  });

  it('extracts model arrays from nested provider payloads', async () => {
    axios.get.mockResolvedValue({
      data: {
        result: {
          items: [
            { code: 'ignore-me' },
            { model: 'glm-4.5', name: 'GLM 4.5' },
            { model: 'glm-4-air', display_name: 'GLM 4 Air' },
          ],
        },
      },
    });

    const result = await AiModelCatalogService.fetchRemoteCatalog({
      api_key: 'sk-test',
      base_url: 'https://api.example.com/v1',
      model: 'glm-4.5',
    });

    expect(result).toEqual([
      { id: 'glm-4.5', display_name: 'GLM 4.5', visible: false, owned_by: '' },
      { id: 'glm-4-air', display_name: 'GLM 4 Air', visible: false, owned_by: '' },
    ]);
  });

  it('throws a clear error when provider does not return recognizable models', async () => {
    axios.get.mockResolvedValue({
      data: {
        result: {
          message: 'ok',
        },
      },
    });

    await expect(
      AiModelCatalogService.fetchRemoteCatalog({
        api_key: 'sk-test',
        base_url: 'https://api.example.com/v1',
        model: 'fallback-model',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: '供应商没有返回可识别的模型列表，请检查 /models 接口或手动添加模型',
    });
  });

  it('rejects hidden models when frontend requests them', async () => {
    db.mockImplementation(() => ({
      whereIn: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue([
        {
          key: AiModelCatalogService.buildModelCatalogSettingKey(3),
          value: JSON.stringify([
            { id: 'qwen-max', display_name: 'Qwen Max', visible: true },
            { id: 'qwen-secret', display_name: 'Qwen Secret', visible: false },
          ]),
        },
      ]),
    }));

    await expect(
      AiModelCatalogService.resolveRequestedModel(
        { id: 3, model: 'qwen-max' },
        'qwen-secret',
        { requireVisible: true }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      message: '所选模型未在后台启用给前端使用',
    });
  });
});
