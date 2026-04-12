const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/db');
const registerRoutes = require('./routes');
const { initSocket } = require('./sockets');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

app.use('/api/uploads', express.static('public/uploads'));

registerRoutes(app);

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const code = err.statusCode || 500;
  const msg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;
  res.status(code).json({ success: false, message: msg });
});

initSocket(server);

const PORT = process.env.PORT || 3000;

db.raw('SELECT 1').then(() => {
  console.log('MySQL connected');
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MySQL connection failed:', err.message);
  process.exit(1);
});

module.exports = app;
