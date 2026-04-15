/**
 * Auth API Tests
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 * POST /api/auth/change-password
 */

const { getRequest, getAuthToken, getTestUser, TEST_USER } = require('./setup');

let request;
let token;
let testUser;

beforeAll(() => {
  request = getRequest();
  token = getAuthToken();
  testUser = getTestUser();
});

// ─── Register ────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const ts = Date.now();

  test('注册成功 - returns 201 with token', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        username: `newuser_${ts}`,
        email: `newuser_${ts}@test.com`,
        password: 'Password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe(`newuser_${ts}`);
  });

  test('重复用户名 - returns 409', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({
        username: TEST_USER.username,
        email: `dup_${ts}@test.com`,
        password: 'Password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('参数校验 - 缺少必填字段返回 400', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ username: 'ab' }); // missing email, password; username too short

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── Login ───────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('登录成功 - returns token', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ username: TEST_USER.username, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.username).toBe(TEST_USER.username);
  });

  test('密码错误 - returns 401', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ username: TEST_USER.username, password: 'WrongPassword999' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('用户不存在 - returns 401', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ username: 'nonexistent_user_xyz', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── Get Profile (me) ────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('带 token - 返回用户信息', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('username', TEST_USER.username);
    expect(res.body.data).toHaveProperty('membership');
    expect(res.body.data).toHaveProperty('limits');
  });

  test('无 token - 返回 401', async () => {
    const res = await request.get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('无效 token - 返回 401', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── Change Password ─────────────────────────────────────
describe('POST /api/auth/change-password', () => {
  test('修改密码成功', async () => {
    const newPassword = 'NewPassword789';

    // Use current token to change password
    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: TEST_USER.password, newPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // After password change, the old token is invalidated (password_changed_at check).
    // Re-login with the new password to get a fresh token, then change back.
    const loginRes = await request
      .post('/api/auth/login')
      .send({ username: TEST_USER.username, password: newPassword });

    expect(loginRes.status).toBe(200);
    const freshToken = loginRes.body.data.token;

    // Change back to original password
    const changeBack = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ oldPassword: newPassword, newPassword: TEST_USER.password });

    expect(changeBack.status).toBe(200);
  });

  test('原密码错误 - 返回 400', async () => {
    // First get a fresh token (password was changed back above)
    const loginRes = await request
      .post('/api/auth/login')
      .send({ username: TEST_USER.username, password: TEST_USER.password });

    const freshToken = loginRes.body.data.token;

    const res = await request
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({ oldPassword: 'WrongOldPassword', newPassword: 'AnotherPassword1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('无 token - 返回 401', async () => {
    const res = await request
      .post('/api/auth/change-password')
      .send({ oldPassword: 'anything', newPassword: 'NewPassword1' });

    expect(res.status).toBe(401);
  });
});
