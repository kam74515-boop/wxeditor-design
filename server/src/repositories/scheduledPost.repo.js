const db = require('../config/db');

const ScheduledPostRepo = {
  async findById(id) {
    return db('scheduled_posts').where({ id }).first();
  },

  async listByUserId(userId, { status, page = 1, limit = 20 } = {}) {
    const query = db('scheduled_posts').where({ user_id: userId });
    if (status) query.where({ status });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query
      .orderBy('publish_at', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async create(data) {
    const [id] = await db('scheduled_posts').insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    await db('scheduled_posts').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async delete(id) {
    return db('scheduled_posts').where({ id }).delete();
  },

  async findPendingDue() {
    return db('scheduled_posts')
      .where({ status: 'pending' })
      .where('publish_at', '<=', db.fn.now());
  },

  async findScheduledDue() {
    return db('scheduled_posts')
      .whereIn('status', ['pending', 'scheduled'])
      .where('publish_at', '<=', db.fn.now());
  },
};

module.exports = ScheduledPostRepo;
