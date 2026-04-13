const WechatAccountRepo = require('../repositories/wechatAccount.repo');
const crypto = require('crypto');

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
    await WechatAccountRepo.delete(id);
  },

  async verify(user, id) {
    const account = await WechatAccountRepo.findById(id);
    if (!account) {
      throw Object.assign(new Error('公众号不存在'), { statusCode: 404 });
    }
    if (account.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此公众号'), { statusCode: 403 });
    }

    // 模拟微信 API 验证流程
    try {
      // 实际项目中应调用微信 API: https://api.weixin.qq.com/cgi-bin/token
      const tokenInfo = {
        access_token: 'verified_' + crypto.randomBytes(16).toString('hex'),
        expires_in: 7200,
        verified_at: new Date().toISOString(),
      };

      await WechatAccountRepo.update(id, {
        verified: true,
        status: 'active',
        token_info: JSON.stringify(tokenInfo),
      });

      return { success: true, message: '公众号验证成功' };
    } catch (err) {
      await WechatAccountRepo.update(id, { verified: false, status: 'inactive' });
      throw Object.assign(new Error('公众号验证失败: ' + err.message), { statusCode: 400 });
    }
  },
};

module.exports = WechatAccountService;
