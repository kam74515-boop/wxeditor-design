const axios = require('axios');

/**
 * WeChat MP (公众号) API Proxy Service
 * Encapsulates access_token caching and generic request methods.
 *
 * access_token cache: in-memory Map keyed by appId
 *   { token, expiresAt }
 */

const tokenCache = new Map();

const WechatProxyService = {
  /**
   * Get a cached access_token or fetch a new one from WeChat API.
   * @param {string} appId
   * @param {string} appSecret
   * @param {boolean} forceRefresh - bypass cache
   * @returns {Promise<string>} access_token
   */
  async getAccessToken(appId, appSecret, forceRefresh = false) {
    if (!appId || !appSecret) {
      throw Object.assign(new Error('appId 和 appSecret 不能为空'), { statusCode: 400 });
    }

    const cached = tokenCache.get(appId);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = {
      grant_type: 'client_credential',
      appid: appId,
      secret: appSecret,
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.errcode) {
      const err = new Error(data.errmsg || '获取 access_token 失败');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    // Cache with a 200s safety margin before actual expiry
    const expiresAt = Date.now() + (data.expires_in - 200) * 1000;
    tokenCache.set(appId, { token: data.access_token, expiresAt });

    return data.access_token;
  },

  /**
   * Generic GET request to WeChat API
   * @param {string} accessToken
   * @param {string} path - API path after /cgi-bin/ (e.g. 'getcallbackip')
   * @param {object} extraParams
   * @returns {Promise<object>}
   */
  async get(accessToken, path, extraParams = {}) {
    const url = `https://api.weixin.qq.com/cgi-bin/${path}`;
    const params = { access_token: accessToken, ...extraParams };

    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      const err = new Error(data.errmsg || '微信 API 请求失败');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    return data;
  },

  /**
   * Generic POST request to WeChat API
   * @param {string} accessToken
   * @param {string} path - full relative path (e.g. 'menu/create')
   * @param {object} body
   * @returns {Promise<object>}
   */
  async post(accessToken, path, body = {}) {
    const url = `https://api.weixin.qq.com/cgi-bin/${path}`;
    const params = { access_token: accessToken };

    const response = await axios.post(url, body, { params });
    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      const err = new Error(data.errmsg || '微信 API 请求失败');
      err.code = data.errcode;
      err.statusCode = 400;
      throw err;
    }

    return data;
  },

  /**
   * Clear cached access_token for a given appId (e.g. after token errors)
   * @param {string} appId
   */
  clearTokenCache(appId) {
    tokenCache.delete(appId);
  },

  // ---- High-level convenience methods ----

  /**
   * Get custom menu
   */
  async getMenu(accessToken) {
    return this.get(accessToken, 'get_current_selfmenu_info');
  },

  /**
   * Create custom menu
   * @param {string} accessToken
   * @param {object} menuData - menu structure per WeChat docs
   */
  async createMenu(accessToken, menuData) {
    return this.post(accessToken, 'menu/create', menuData);
  },

  /**
   * Delete custom menu
   */
  async deleteMenu(accessToken) {
    return this.get(accessToken, 'menu/delete');
  },

  /**
   * Get material list
   * @param {string} accessToken
   * @param {string} type - image/voice/video/news
   * @param {number} offset
   * @param {number} count
   */
  async getMaterials(accessToken, type = 'news', offset = 0, count = 20) {
    return this.post(accessToken, 'material/batchget_get_material', {
      type,
      offset,
      count,
    });
  },

  /**
   * Add a draft article
   * @param {string} accessToken
   * @param {Array} articles - array of article objects per WeChat draft spec
   */
  async addDraft(accessToken, articles) {
    return this.post(accessToken, 'draft/add', { articles });
  },

  /**
   * Publish from draft
   * @param {string} accessToken
   * @param {string} mediaId - draft media_id
   */
  async publish(accessToken, mediaId) {
    return this.post(accessToken, 'freepublish/submit', { media_id: mediaId });
  },

  /**
   * Get publish status
   * @param {string} accessToken
   * @param {string} publishId
   */
  async getPublishStatus(accessToken, publishId) {
    return this.post(accessToken, 'freepublish/get', { publish_id: publishId });
  },

  /**
   * Get material count
   */
  async getMaterialCount(accessToken) {
    return this.get(accessToken, 'material/get_materialcount');
  },
};

module.exports = WechatProxyService;
