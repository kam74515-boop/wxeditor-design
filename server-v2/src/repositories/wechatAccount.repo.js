const db = require('../config/db');

const WechatAccountRepo = {
  async findById(id) {
    return db('wechat_accounts').where({ id }).first();
  },

  async listByUserId(userId) {
    return db('wechat_accounts')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  async create(data) {
    const [id] = await db('wechat_accounts').insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    await db('wechat_accounts').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async delete(id) {
    return db('wechat_accounts').where({ id }).delete();
  },

  async findByAppId(appId) {
    return db('wechat_accounts').where({ app_id: appId }).first();
  },
};

module.exports = WechatAccountRepo;
