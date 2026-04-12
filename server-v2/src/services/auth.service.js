const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRepo = require('../repositories/user.repo');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 2 * 60 * 60 * 1000;

const AuthService = {
  async register({ username, email, password, nickname }) {
    const existing = await UserRepo.findByUsernameOrEmail(username, email);
    if (existing) {
      const field = existing.username === username ? '用户名' : '邮箱';
      throw Object.assign(new Error(`${field}已被注册`), { statusCode: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await UserRepo.create({
      username, email, password: hash,
      nickname: nickname || username,
      settings: JSON.stringify({
        theme: 'light',
        autoSave: true,
        autoSaveInterval: 30,
        editorFontSize: 14,
      }),
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { user: sanitizeUser(user), token, refreshToken };
  },

  async login({ username, password }) {
    const failMsg = '用户名或密码错误';
    const user = await UserRepo.findByUsernameOrEmail(username, username);
    if (!user) throw Object.assign(new Error(failMsg), { statusCode: 401 });

    if (UserRepo.isLocked(user)) {
      throw Object.assign(new Error(failMsg), { statusCode: 401 });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await UserRepo.incLoginAttempts(user.id);
      if (user.login_attempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        await UserRepo.lockUser(user.id, new Date(Date.now() + LOCK_DURATION_MS));
      }
      throw Object.assign(new Error(failMsg), { statusCode: 401 });
    }

    if (user.status !== 'active') {
      throw Object.assign(new Error(failMsg), { statusCode: 401 });
    }

    await UserRepo.resetLoginAttempts(user.id);
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { user: sanitizeUser(user), token, refreshToken };
  },

  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await UserRepo.findById(decoded.id);
      if (!user || user.status !== 'active') throw new Error('用户无效');

      const token = generateToken(user.id);
      const newRefresh = generateRefreshToken(user.id);
      return { token, refreshToken: newRefresh };
    } catch {
      throw Object.assign(new Error('刷新令牌无效'), { statusCode: 401 });
    }
  },

  async getProfile(userId) {
    const user = await UserRepo.findById(userId);
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });

    const settings = parseJSON(user.settings, {});
    const membership = settings.membership || { type: 'free', isActive: false };

    return {
      ...sanitizeUser(user),
      membership: {
        ...membership,
        daysLeft: membership.endDate
          ? Math.max(0, Math.ceil((new Date(membership.endDate) - new Date()) / 86400000)) : 0,
      },
      limits: getLimits(membership.type),
      wechat: settings.wechat || null,
    };
  },

  async updateProfile(userId, data) {
    const updates = {};
    if (data.nickname !== undefined) updates.nickname = data.nickname;
    if (data.bio !== undefined) {
      const user = await UserRepo.findById(userId);
      const settings = parseJSON(user.settings, {});
      settings.bio = data.bio;
      updates.settings = JSON.stringify(settings);
    }
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.phone !== undefined) {
      const user = await UserRepo.findById(userId);
      const settings = parseJSON(user.settings, {});
      settings.phone = data.phone;
      updates.settings = JSON.stringify(settings);
    }
    return UserRepo.update(userId, updates);
  },

  async changePassword(userId, { oldPassword, newPassword }) {
    const user = await UserRepo.findById(userId);
    if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw Object.assign(new Error('原密码错误'), { statusCode: 400 });

    const hash = await bcrypt.hash(newPassword, 12);
    await UserRepo.update(userId, { password: hash, password_changed_at: new Date() });
  },
};

function sanitizeUser(user) {
  const { password, login_attempts, lock_until, password_changed_at, ...safe } = user;
  safe.settings = parseJSON(safe.settings, {});
  return safe;
}

function parseJSON(str, fallback) {
  try { return typeof str === 'string' ? JSON.parse(str) : str; }
  catch { return fallback; }
}

function getLimits(type) {
  const limits = {
    free: { documents: 3, storage: 100 * 1024 * 1024, collaborators: 2, apiCalls: 100 },
    basic: { documents: 50, storage: 1024 * 1024 * 1024, collaborators: 10, apiCalls: 1000 },
    pro: { documents: 200, storage: 5 * 1024 * 1024 * 1024, collaborators: 50, apiCalls: 10000 },
    enterprise: { documents: -1, storage: -1, collaborators: -1, apiCalls: -1 },
  };
  return limits[type] || limits.free;
}

module.exports = AuthService;
