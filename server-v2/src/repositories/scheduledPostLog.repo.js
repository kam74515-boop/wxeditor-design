const db = require('../config/db');

const ScheduledPostLogRepo = {
  async findById(id) {
    return db('scheduled_post_logs').where({ id }).first();
  },

  async listByPostId(postId, { page = 1, limit = 20 } = {}) {
    const query = db('scheduled_post_logs').where({ post_id: postId });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { list, total: count, page, limit };
  },

  async create(data) {
    const [id] = await db('scheduled_post_logs').insert(data);
    return this.findById(id);
  },

  async deleteByPostId(postId) {
    return db('scheduled_post_logs').where({ post_id: postId }).delete();
  },
};

module.exports = ScheduledPostLogRepo;
