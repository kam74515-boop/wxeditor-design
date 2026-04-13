const axios = require('axios');
const crypto = require('crypto');
const UserRepo = require('../repositories/user.repo');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

/**
 * WeChat Open Platform OAuth2 Service
 * Docs: https://developers.weixin.qq.com/doc/op_platform/Website_App/WeChat_Login/WeChat_Login.html
 */

const WECHAT_OPEN_APPID = process.env.WECHAT_OPEN_APPID || '';
const WECHAT_OPEN_SECRET = process.env.WECHAT_OPEN_SECRET || '';
const WECHAT_OAUTH_REDIRECT_URI = process.env.WECHAT_OAUTH_REDIRECT_URI || '';

const WechatOAuthService = {
  /**
   * Generate WeChat OAuth authorization URL for QR code login
   * @param {string} state - CSRF protection token
   * @returns {string} Authorization URL
   */
  getAuthUrl(state) {
    const params = new URLSearchParams({
      appid: WECHAT_OPEN_APPID,
      redirect_uri: WECHAT_OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: 'snsapi_login',
      state: state || crypto.randomBytes(16).toString('hex'),
    });

    return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  },

  /**
   * Generate a random state for CSRF protection
   * @returns {string}
   */
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  },

  /**
   * Exchange authorization code for access_token + openid
   * @param {string} code - Authorization code from WeChat callback
   * @returns {Promise<{access_token: string, openid: string, unionid?: string}>}
   */
  async getAccessToken(code) {
    const params = new URLSearchParams({
      appid: WECHAT_OPEN_APPID,
      secret: WECHAT_OPEN_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const response = await axios.get(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`
    );

    const data = response.data;

    if (data.errcode) {
      const err = new Error(data.errmsg || 'WeChat OAuth token exchange failed');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    return {
      accessToken: data.access_token,
      openid: data.openid,
      unionid: data.unionid || null,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      scope: data.scope,
    };
  },

  /**
   * Get WeChat user info using access_token + openid
   * @param {string} accessToken
   * @param {string} openid
   * @returns {Promise<{openid, nickname, sex, headimgurl, unionid}>}
   */
  async getUserInfo(accessToken, openid) {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid,
    });

    const response = await axios.get(
      `https://api.weixin.qq.com/sns/userinfo?${params.toString()}`
    );

    const data = response.data;

    if (data.errcode) {
      const err = new Error(data.errmsg || 'Failed to get WeChat user info');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    return {
      openid: data.openid,
      nickname: data.nickname || '',
      sex: data.sex,
      headimgurl: data.headimgurl || '',
      unionid: data.unionid || null,
    };
  },

  /**
   * Find or create a local user based on WeChat openid
   * @param {object} wechatUser - { openid, nickname, headimgurl, unionid }
   * @returns {Promise<{user, token, refreshToken, isNew}>}
   */
  async findOrCreateUser(wechatUser) {
    // Try to find existing user by wechat openid stored in settings
    const existingUser = await UserRepo.findByWechatOpenid(wechatUser.openid);

    if (existingUser) {
      // Update avatar if changed
      const updates = {};
      if (wechatUser.headimgurl && existingUser.avatar !== wechatUser.headimgurl) {
        updates.avatar = wechatUser.headimgurl;
      }
      if (wechatUser.nickname && existingUser.nickname !== wechatUser.nickname) {
        updates.nickname = wechatUser.nickname;
      }
      if (Object.keys(updates).length > 0) {
        await UserRepo.update(existingUser.id, updates);
      }

      const user = await UserRepo.findById(existingUser.id);
      const token = generateToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      return { user: sanitizeUser(user), token, refreshToken, isNew: false };
    }

    // Create new user from WeChat info
    const username = `wx_${wechatUser.openid.slice(-10)}`;
    const email = `${username}@wechat.placeholder`;
    const nickname = wechatUser.nickname || `微信用户${wechatUser.openid.slice(-4)}`;
    const randomPassword = crypto.randomBytes(32).toString('hex');

    const user = await UserRepo.create({
      username,
      email,
      password: await require('bcryptjs').hash(randomPassword, 12),
      nickname,
      avatar: wechatUser.headimgurl || null,
      role: 'user',
      status: 'active',
      settings: JSON.stringify({
        theme: 'light',
        autoSave: true,
        autoSaveInterval: 30,
        editorFontSize: 14,
        wechat: {
          openid: wechatUser.openid,
          unionid: wechatUser.unionid,
          nickname: wechatUser.nickname,
          headimgurl: wechatUser.headimgurl,
          boundAt: new Date().toISOString(),
        },
      }),
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { user: sanitizeUser(user), token, refreshToken, isNew: true };
  },

  /**
   * Full OAuth callback handler: code -> token -> userinfo -> find/create user
   * @param {string} code - Authorization code
   * @returns {Promise<{user, token, refreshToken, isNew}>}
   */
  async handleCallback(code) {
    // Step 1: Exchange code for access_token
    const tokenData = await this.getAccessToken(code);

    // Step 2: Get user info from WeChat
    const wechatUser = await this.getUserInfo(tokenData.accessToken, tokenData.openid);

    // Step 3: Find or create local user
    const result = await this.findOrCreateUser(wechatUser);

    return result;
  },
};

function sanitizeUser(user) {
  if (!user) return user;
  const { password, login_attempts, lock_until, password_changed_at, ...safe } = user;
  try {
    safe.settings = typeof safe.settings === 'string' ? JSON.parse(safe.settings) : safe.settings;
  } catch {
    safe.settings = {};
  }
  return safe;
}

module.exports = WechatOAuthService;
