const axios = require('axios');
const {
  buildProviderUrl,
  maskApiKey,
  testAiConfigConnection,
  toRuntimeAiConfig,
} = require('../../src/utils/ai-config');

jest.mock('axios');

describe('ai-config utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should normalize base_url and parse numeric fields', () => {
    const result = toRuntimeAiConfig({
      base_url: 'https://api.example.com/v1///',
      temperature: '0.3',
      top_p: '0.8',
      extra_params: '{"frequency_penalty":0.2}',
    });

    expect(result.base_url).toBe('https://api.example.com/v1');
    expect(result.temperature).toBe(0.3);
    expect(result.max_tokens).toBeNull();
    expect(result.top_p).toBe(0.8);
    expect(result.extraParams).toEqual({ frequency_penalty: 0.2 });
  });

  it('should build provider url without duplicate slashes', () => {
    expect(buildProviderUrl('https://api.example.com/v1/', '/chat/completions'))
      .toBe('https://api.example.com/v1/chat/completions');
  });

  it('should mask api key with last four characters', () => {
    expect(maskApiKey('sk-12345678')).toBe('****5678');
  });

  it('should test connection against normalized chat completions endpoint', async () => {
    axios.post.mockResolvedValue({ data: { id: 'chatcmpl-test' } });

    const result = await testAiConfigConnection({
      api_key: 'sk-test',
      base_url: 'https://api.example.com/v1/',
      model: 'gpt-test',
    });

    expect(result.ok).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-test',
        max_tokens: 8,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    );
  });
});
