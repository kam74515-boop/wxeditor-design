const axios = require('axios');
const crypto = require('crypto');
const UserRepo = require('../repositories/user.repo');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

/**
 * WeChat OAuth Service
 *
 * Part 1 – Open Platform (开放平台) QR-code login  (snsapi_login)
 * Part 2 – MP (公众号) web-page authorization          (snsapi_base / snsapi_userinfo)
 *
 * Docs:
 *   Open: https://developers.weixin.qq.com/doc/op_platform/Website_App/WeChat_Login/WeChat_Login.html
 *   MP:   https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html
 */

const WECHAT_OPEN_APPID = process.env.WECHAT_OPEN_APPID || '';
const WECHAT_OPEN_SECRET = process.env.WECHAT_OPEN_SECRET || '';
const WECHAT_OAUTH_REDIRECT_URI = process.env.WECHAT_OAUTH_REDIRECT_URI || '';

// MP (公众号) 配置 —— 支持环境变量或从 wechat_accounts 动态获取
const WECHAT_MP_APPID = process.env.WECHAT_MP_APPID || '';
const WECHAT_MP_SECRET = process.env.WECHAT_MP_SECRET || '';
const WECHAT_MP_REDIRECT_URI = process.env.WECHAT_MP_REDIRECT_URI || '';

// ==================== Part 1: Open Platform OAuth ====================

const WechatOAuthService = {
  /**
   * Generate WeChat Open Platform OAuth URL for QR-code login
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

  generateState() {
    return crypto.randomBytes(16).toString('hex');
  },

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

  async getUserInfo(accessToken, openid) {
    const params = new URLSearchParams({ access_token: accessToken, openid });
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

  async handleCallback(code) {
    const tokenData = await this.getAccessToken(code);
    const wechatUser = await this.getUserInfo(tokenData.accessToken, tokenData.openid);
    return this.findOrCreateUser(wechatUser);
  },

  // ==================== Part 2: MP OAuth (公众号网页授权) ====================

  /**
   * Generate MP (公众号) web-page authorization URL
   * @param {object} options
   * @param {string} options.appId     - 公众号 appId (可选，默认用环境变量)
   * @param {string} options.redirectUri - 回调地址 (可选，默认用环境变量)
   * @param {string} options.scope     - 'snsapi_base' | 'snsapi_userinfo'
   * @param {string} options.state     - CSRF state
   * @returns {string} authorization URL
   */
  getMpAuthUrl(options = {}) {
    const appId = options.appId || WECHAT_MP_APPID;
    const redirectUri = options.redirectUri || WECHAT_MP_REDIRECT_URI;
    const scope = options.scope || 'snsapi_userinfo';
    const state = options.state || this.generateState();

    if (!appId) {
      throw Object.assign(new Error('缺少公众号 appId'), { statusCode: 400 });
    }

    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  },

  /**
   * Exchange authorization code for MP access_token + openid
   * @param {string} code - authorization code from MP callback
   * @param {object} credentials - { appId, appSecret } (optional, fall back to env)
   * @returns {Promise<{accessToken, openid, unionid, expiresIn, refreshToken, scope}>}
   */
  async getMpAccessToken(code, credentials = {}) {
    const appId = credentials.appId || WECHAT_MP_APPID;
    const appSecret = credentials.appSecret || WECHAT_MP_SECRET;

    if (!appId || !appSecret) {
      throw Object.assign(new Error('缺少公众号 appId 或 appSecret'), { statusCode: 400 });
    }

    const params = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      code,
      grant_type: 'authorization_code',
    });

    const response = await axios.get(
      `https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`
    );
    const data = response.data;

    if (data.errcode) {
      const err = new Error(data.errmsg || '公众号网页授权 token 交换失败');
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
   * Get user info via MP OAuth (only works with scope=snsapi_userinfo)
   * @param {string} accessToken - MP OAuth access_token (NOT the common access_token)
   * @param {string} openid
   * @param {string} lang - 'zh_CN' | 'zh_TW' | 'en'
   */
  async getMpUserInfo(accessToken, openid, lang = 'zh_CN') {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid,
      lang,
    });

    const response = await axios.get(
      `https://api.weixin.qq.com/sns/userinfo?${params.toString()}`
    );
    const data = response.data;

    if (data.errcode) {
      const err = new Error(data.errmsg || '获取公众号用户信息失败');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    return {
      openid: data.openid,
      nickname: data.nickname || '',
      sex: data.sex,
      province: data.province || '',
      city: data.city || '',
      country: data.country || '',
      headimgurl: data.headimgurl || '',
      unionid: data.unionid || null,
      privilege: data.privilege || [],
    };
  },

  /**
   * Full MP OAuth callback handler: code -> token -> userinfo -> find/create user
   * @param {string} code
   * @param {object} credentials - { appId, appSecret } (optional)
   * @returns {Promise<{user, token, refreshToken, isNew}>}
   */
  async handleMpCallback(code, credentials = {}) {
    const tokenData = await this.getMpAccessToken(code, credentials);

    let wechatUser;
    if (tokenData.scope === 'snsapi_userinfo') {
      wechatUser = await this.getMpUserInfo(tokenData.accessToken, tokenData.openid);
    } else {
      // snsapi_base — only openid is available
      wechatUser = {
        openid: tokenData.openid,
        nickname: '',
        headimgurl: '',
        unionid: tokenData.unionid || null,
      };
    }

    return this.findOrCreateUser(wechatUser);
  },

  // ==================== Shared User Lookup ====================

  async findOrCreateUser(wechatUser) {
    const existingUser = await UserRepo.findByWechatOpenid(wechatUser.openid);

    if (existingUser) {
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
