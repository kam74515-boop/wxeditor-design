const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT 认证中间件
 */
const auth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }
    
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: '密码已修改，请重新登录'
      });
    }
    
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的登录凭证'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录'
      });
    }
    
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
};

/**
 * 轻量级 JWT 认证（不查 MongoDB，仅解码 token）
 * 适用于纯 SQLite 路由（collaboration等），避免对 MongoDB 的依赖
 */
const authLite = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // 字符串形式的用户 ID
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '无效的登录凭证' });
  }
};

/**
 * 可选认证
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * 角色权限检查
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
};

/**
 * 会员权限检查
 */
const requireMembership = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }
    
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }
    
    if (!req.user.isMember) {
      return res.status(403).json({
        success: false,
        message: '此功能需要会员权限',
        code: 'MEMBERSHIP_REQUIRED',
        upgradeUrl: '/membership'
      });
    }
    
    if (types.length > 0 && !types.includes(req.user.membership.type)) {
      const requiredTypes = types.map(t => {
        const map = {
          'basic': '基础版',
          'pro': '专业版',
          'enterprise': '企业版'
        };
        return map[t] || t;
      }).join('或');
      
      return res.status(403).json({
        success: false,
        message: `此功能需要${requiredTypes}会员`,
        code: 'UPGRADE_REQUIRED',
        currentType: req.user.membership.type,
        requiredTypes: types,
        upgradeUrl: '/membership'
      });
    }
    
    next();
  };
};

/**
 * 生成 JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * 生成 Refresh Token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

module.exports = {
  auth,
  authLite,
  optionalAuth,
  restrictTo,
  requireMembership,
  generateToken,
  generateRefreshToken
};
