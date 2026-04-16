const { normalizeBaseUrl, buildProviderUrl, toRuntimeAiConfig } = require('../../src/utils/ai-config');

describe('ai-config utils', () => {
  it('strips trailing OpenAI-compatible endpoint suffixes from base_url', () => {
    expect(normalizeBaseUrl('https://api.example.com/v1/chat/completions')).toBe(
      'https://api.example.com/v1'
    );
    expect(normalizeBaseUrl('https://api.example.com/v1/completions')).toBe(
      'https://api.example.com/v1'
    );
    expect(normalizeBaseUrl('https://api.example.com/v1/models')).toBe(
      'https://api.example.com/v1'
    );
  });

  it('builds provider endpoints from normalized base_url', () => {
    const config = toRuntimeAiConfig({
      base_url: 'https://api.example.com/v1/chat/completions',
      temperature: 0.7,
      top_p: 0.95,
    });

    expect(buildProviderUrl(config.base_url, '/chat/completions')).toBe(
      'https://api.example.com/v1/chat/completions'
    );
    expect(buildProviderUrl(config.base_url, '/models')).toBe(
      'https://api.example.com/v1/models'
    );
  });
});
