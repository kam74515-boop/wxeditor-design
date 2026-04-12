/**
 * AI Agent API Tests
 * GET /api/ai-agent/prompts - 获取提示词列表
 */

const { getRequest, getAuthToken } = require('./setup');

let request;
let token;

beforeAll(() => {
  request = getRequest();
  token = getAuthToken();
});

// ─── Prompts List ────────────────────────────────────────
describe('GET /api/ai-agent/prompts', () => {
  test('获取提示词列表成功 - 返回 200', async () => {
    const res = await request
      .get('/api/ai-agent/prompts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Each prompt should have key, name, description
    if (res.body.data.length > 0) {
      const first = res.body.data[0];
      expect(first).toHaveProperty('key');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('description');
    }
  });

  test('包含预定义的提示词模板', async () => {
    const res = await request
      .get('/api/ai-agent/prompts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const keys = res.body.data.map(p => p.key);
    expect(keys).toContain('generateArticle');
    expect(keys).toContain('optimizeTitle');
    expect(keys).toContain('polish');
    expect(keys).toContain('expand');
    expect(keys).toContain('shorten');
    expect(keys).toContain('summarize');
  });

  test('无 token - 返回 401', async () => {
    const res = await request.get('/api/ai-agent/prompts');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
