/**
 * Test Setup - runs before all test suites
 * - Loads env, prepares Express app (without server.listen)
 * - Creates a test user and obtains a JWT token
 * - Provides supertest agent and auth helpers
 */

// Ensure NODE_ENV is development so knex picks up the right config
process.env.NODE_ENV = 'development';
require('dotenv').config();

const supertest = require('supertest');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import the DB layer so tests can clean up
const db = require('../src/config/db');

function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount routes
  require('../src/routes')(app);

  // 404
  app.use((req, res) => {
    res.status(404).json({ success: false, message: '接口不存在' });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    const code = err.statusCode || 500;
    const msg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;
    res.status(code).json({ success: false, message: msg });
  });

  return app;
}

// ---- globals available to test files ----
let app;
let request;
let authToken;
let testUser;
let testUserId;

// Unique suffix to avoid collisions when tests run multiple times
const uid = Date.now();

const TEST_USER = {
  username: `testbot_${uid}`,
  email: `testbot_${uid}@example.com`,
  password: 'Test123456!',
  nickname: 'TestBot',
};

beforeAll(async () => {
  app = createApp();
  request = supertest(app);

  // Register a test user via the API
  const regRes = await request
    .post('/api/auth/register')
    .send(TEST_USER);

  if (regRes.status === 201 && regRes.body.success) {
    authToken = regRes.body.data.token;
    testUser = regRes.body.data.user;
    testUserId = testUser.id;
  } else {
    // Maybe user already exists — try login
    const loginRes = await request
      .post('/api/auth/login')
      .send({ username: TEST_USER.username, password: TEST_USER.password });

    if (loginRes.status === 200 && loginRes.body.success) {
      authToken = loginRes.body.data.token;
      testUser = loginRes.body.data.user;
      testUserId = testUser.id;
    } else {
      throw new Error('Failed to create or login test user: ' + JSON.stringify(regRes.body));
    }
  }
}, 30000);

afterAll(async () => {
  // Clean up test data
  try {
    if (testUserId) {
      await db('documents').where({ author_id: testUserId }).del();
      await db('users').where({ id: testUserId }).del();
    }
  } catch (e) {
    // ignore cleanup errors
  }
  await db.destroy();
}, 15000);

module.exports = {
  getApp: () => app,
  getRequest: () => request,
  getAuthToken: () => authToken,
  getTestUser: () => testUser,
  getTestUserId: () => testUserId,
  getDb: () => db,
  TEST_USER,
};
