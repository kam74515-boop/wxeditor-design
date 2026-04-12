const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// 初始化 SQLite 数据库
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: '登录尝试过多，请 15 分钟后重试' },
});

// API 路由
app.use('/api/ueditor', require('./routes/ueditor'));
app.use('/api/collab', require('./routes/collaboration'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/wechat-content', require('./routes/wechat-content'));
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/membership', require('./routes/membership'));
app.use('/api/content', require('./routes/content'));
app.use('/api/drafts', require('./routes/draft'));
app.use('/api/wechat', require('./routes/wechat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/ai-configs', require('./routes/ai-config'));
app.use('/api', require('./routes/team'));

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message;
  res.status(statusCode).json({ success: false, message });
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 初始化协作服务
const CollaborationService = require('./services/collaboration');
const collabService = new CollaborationService(server);

// 定期清理不活跃文档（每 30 分钟）
setInterval(() => {
  collabService.cleanupInactiveDocuments();
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
  console.log(`📁 项目管理: http://localhost:${PORT}/`);
  console.log(`📖 编辑器: http://localhost:${PORT}/editor`);
  console.log(`👥 协作: http://localhost:${PORT}/collab/:docId`);
  console.log(`🤖 AI API: http://localhost:${PORT}/api/ai`);
});

module.exports = { app, server, collabService };
