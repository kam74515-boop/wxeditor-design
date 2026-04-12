const jwt = require('jsonwebtoken');
const db = require('../config/db');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.token || null;
}

async function loadUser(decoded) {
  const user = await db('users').where({ id: decoded.id }).first();
  if (!user) return null;
  if (user.status !== 'active') return null;
  return user;
}

function isTokenExpired(decoded) {
  return decoded.exp && decoded.exp < Date.now() / 1000;
}

function passwordChangedAfterToken(user, decoded) {
  if (!user.password_changed_at) return false;
  const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
  return changedAt > decoded.iat;
}

function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, message: '请先登录' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isTokenExpired(decoded)) {
      return res.status(401).json({ success: false, message: 'Token 已过期' });
    }

    loadUser(decoded).then(user => {
      if (!user) return res.status(401).json({ success: false, message: '用户不存在或已被禁用' });
      if (passwordChangedAfterToken(user, decoded)) {
        return res.status(401).json({ success: false, message: '密码已修改，请重新登录' });
      }

      req.userId = user.id;
      req.user = user;
      next();
    }).catch(err => {
      console.error('Auth middleware error:', err);
      res.status(500).json({ success: false, message: '认证失败' });
    });
  } catch {
    res.status(401).json({ success: false, message: '登录已过期' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    loadUser(decoded).then(user => {
      if (user && !passwordChangedAfterToken(user, decoded)) {
        req.userId = user.id;
        req.user = user;
      }
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

function restrictTo(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

module.exports = { auth, optionalAuth, restrictTo, generateToken, generateRefreshToken };
