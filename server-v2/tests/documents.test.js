/**
 * Documents (Collab) API Tests
 * POST   /api/collab/documents       - 创建文档
 * GET    /api/collab/documents       - 获取文档列表
 * GET    /api/collab/documents/:id   - 获取单个文档
 * PUT    /api/collab/documents/:id   - 更新文档
 * DELETE /api/collab/documents/:id   - 删除文档
 */

const { getRequest, getAuthToken, getTestUserId, getDb } = require('./setup');

let request;
let token;
let userId;
let createdDocId;

beforeAll(() => {
  request = getRequest();
  token = getAuthToken();
  userId = getTestUserId();
});

afterAll(async () => {
  // Extra cleanup for documents created in these tests
  const db = getDb();
  if (createdDocId) {
    try { await db('documents').where({ id: createdDocId }).del(); } catch {}
  }
});

// ─── Create Document ─────────────────────────────────────
describe('POST /api/collab/documents', () => {
  test('创建文档成功 - returns 201', async () => {
    const res = await request
      .post('/api/collab/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Document', content: '<p>Hello World</p>' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Test Document');

    createdDocId = res.body.data.id;
  });

  test('无 token - 返回 401', async () => {
    const res = await request
      .post('/api/collab/documents')
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });
});

// ─── List Documents ──────────────────────────────────────
describe('GET /api/collab/documents', () => {
  test('获取文档列表成功', async () => {
    const res = await request
      .get('/api/collab/documents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data).toHaveProperty('total');
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  test('支持分页参数', async () => {
    const res = await request
      .get('/api/collab/documents?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(5);
  });

  test('无 token - 返回 401', async () => {
    const res = await request.get('/api/collab/documents');
    expect(res.status).toBe(401);
  });
});

// ─── Get Single Document ─────────────────────────────────
describe('GET /api/collab/documents/:id', () => {
  test('获取单个文档成功', async () => {
    // Ensure we have a document
    if (!createdDocId) {
      const createRes = await request
        .post('/api/collab/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Doc for GET test' });
      createdDocId = createRes.body.data.id;
    }

    const res = await request
      .get(`/api/collab/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', createdDocId);
  });

  test('不存在的文档 - 返回 404', async () => {
    const res = await request
      .get('/api/collab/documents/nonexistent-id-12345')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── Update Document ─────────────────────────────────────
describe('PUT /api/collab/documents/:id', () => {
  test('更新文档成功', async () => {
    if (!createdDocId) {
      const createRes = await request
        .post('/api/collab/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Doc for PUT test' });
      createdDocId = createRes.body.data.id;
    }

    const res = await request
      .put(`/api/collab/documents/${createdDocId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title', content: '<p>Updated Content</p>' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Title');
  });

  test('不存在的文档 - 返回 404', async () => {
    const res = await request
      .put('/api/collab/documents/nonexistent-id-12345')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

// ─── Delete Document ─────────────────────────────────────
describe('DELETE /api/collab/documents/:id', () => {
  test('删除文档成功', async () => {
    // Create a fresh document to delete
    const createRes = await request
      .post('/api/collab/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Doc to Delete' });

    const docId = createRes.body.data.id;

    const res = await request
      .delete(`/api/collab/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it's gone (soft delete returns 404)
    const getRes = await request
      .get(`/api/collab/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  test('不存在的文档 - 返回 404', async () => {
    const res = await request
      .delete('/api/collab/documents/nonexistent-id-12345')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('无 token - 返回 401', async () => {
    const res = await request
      .delete('/api/collab/documents/any-id');

    expect(res.status).toBe(401);
  });
});
