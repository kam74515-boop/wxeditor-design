/**
 * Templates API Tests
 * GET /api/templates           - 模板列表
 * GET /api/templates/categories - 分类列表
 */

const { getRequest } = require('./setup');

let request;

beforeAll(() => {
  request = getRequest();
});

// ─── List Templates ──────────────────────────────────────
describe('GET /api/templates', () => {
  test('模板列表 - 返回 200', async () => {
    const res = await request.get('/api/templates');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('page');
    expect(res.body.data).toHaveProperty('limit');
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  test('支持分页参数', async () => {
    const res = await request.get('/api/templates?page=1&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(5);
  });

  test('支持搜索参数', async () => {
    const res = await request.get('/api/templates?search=test');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Template Categories ─────────────────────────────────
describe('GET /api/templates/categories', () => {
  test('分类列表 - 返回 200', async () => {
    const res = await request.get('/api/templates/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
