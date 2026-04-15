const axios = require('axios');
const WechatAccountRepo = require('../repositories/wechatAccount.repo');
const WechatProxyService = require('./wechatProxy.service');

const WechatAccountService = {
  async list(user) {
    return WechatAccountRepo.listByUserId(user.id);
  },

  async create(user, data) {
    const { app_id, app_secret, nickname } = data;
    if (!app_id || !app_secret) {
      throw Object.assign(new Error('app_id 和 app_secret 不能为空'), { statusCode: 400 });
    }

    // 检查重复
    const existing = await WechatAccountRepo.findByAppId(app_id);
    if (existing && existing.user_id === user.id) {
      throw Object.assign(new Error('该公众号已添加'), { statusCode: 409 });
    }

    return WechatAccountRepo.create({
      user_id: user.id,
      app_id,
      app_secret,
      nickname: nickname || '',
      status: 'active',
    });
  },

  async update(user, id, data) {
    const account = await WechatAccountRepo.findById(id);
    if (!account) {
      throw Object.assign(new Error('公众号不存在'), { statusCode: 404 });
    }
    if (account.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权修改此公众号'), { statusCode: 403 });
    }

    const updates = {};
    const allowedFields = ['nickname', 'avatar', 'qrcode_url', 'app_id', 'app_secret', 'status'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    // If app_id or app_secret changed, mark as unverified
    if (updates.app_id || updates.app_secret) {
      updates.verified = false;
      // Clear cached token
      const finalAppId = updates.app_id || account.app_id;
      WechatProxyService.clearTokenCache(finalAppId);
    }

    return WechatAccountRepo.update(id, updates);
  },

  async remove(user, id) {
    const account = await WechatAccountRepo.findById(id);
    if (!account) {
      throw Object.assign(new Error('公众号不存在'), { statusCode: 404 });
    }
    if (account.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权删除此公众号'), { statusCode: 403 });
    }
    // Clear cached token
    WechatProxyService.clearTokenCache(account.app_id);
    await WechatAccountRepo.delete(id);
  },

  /**
   * Verify a wechat account by calling the real WeChat API
   * to obtain an access_token with the stored app_id/app_secret.
   *
   * This proves the credentials are valid.
   */
  async verify(user, id) {
    const account = await WechatAccountRepo.findById(id);
    if (!account) {
      throw Object.assign(new Error('公众号不存在'), { statusCode: 404 });
    }
    if (account.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此公众号'), { statusCode: 403 });
    }

    try {
      // Call the real WeChat API to verify credentials
      const accessToken = await WechatProxyService.getAccessToken(
        account.app_id,
        account.app_secret,
        true // force refresh
      );

      // If we got here, the credentials are valid.
      // Also try to get basic account info via the API
      let accountInfo = {};
      try {
        // Get the wechat API callback IP list as a lightweight validation
        const ipData = await WechatProxyService.get(accessToken, 'getcallbackip');
        accountInfo.ipListLength = ipData.ip_list ? ipData.ip_list.length : 0;
      } catch {
        // Non-critical — some accounts may not have this permission
      }

      const tokenInfo = {
        access_token_preview: accessToken.slice(0, 10) + '...',
        verified_at: new Date().toISOString(),
        ...accountInfo,
      };

      await WechatAccountRepo.update(id, {
        verified: true,
        status: 'active',
        token_info: JSON.stringify(tokenInfo),
      });

      return { success: true, message: '公众号验证成功' };
    } catch (err) {
      // Mark as unverified
      await WechatAccountRepo.update(id, {
        verified: false,
        status: 'inactive',
      });

      // Clear any stale cache
      WechatProxyService.clearTokenCache(account.app_id);

      const msg = err.code
        ? `公众号验证失败 (错误码: ${err.code}, ${err.message})`
        : '公众号验证失败: ' + err.message;

      throw Object.assign(new Error(msg), { statusCode: 400 });
    }
  },
};

module.exports = WechatAccountService;
