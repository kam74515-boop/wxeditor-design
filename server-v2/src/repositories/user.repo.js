const db = require('../config/db');

const UserRepo = {
  findById(id) {
    return db('users').where({ id }).first();
  },

  findByUsernameOrEmail(username, email) {
    return db('users').where({ username }).orWhere({ email }).first();
  },

  findByUsername(username) {
    return db('users').where({ username }).first();
  },

  findByEmail(email) {
    return db('users').where({ email }).first();
  },

  async create(data) {
    const [id] = await db('users').insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    data.updated_at = db.fn.now();
    await db('users').where({ id }).update(data);
    return this.findById(id);
  },

  async list({ page = 1, limit = 20, search, role, status } = {}) {
    const query = db('users');
    if (search) query.where(function () {
      this.where('username', 'like', `%${search}%`).orWhere('nickname', 'like', `%${search}%`);
    });
    if (role) query.where({ role });
    if (status) query.where({ status });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async incLoginAttempts(id) {
    await db('users').where({ id }).increment('login_attempts', 1);
  },

  async resetLoginAttempts(id) {
    await db('users').where({ id }).update({ login_attempts: 0, lock_until: null });
  },

  async lockUser(id, until) {
    await db('users').where({ id }).update({ lock_until: until });
  },

  isLocked(user) {
    if (!user.lock_until) return false;
    return new Date(user.lock_until) > new Date();
  },

  async count() {
    const [{ count }] = await db('users').count('* as count');
    return count;
  },

  async countSince(date) {
    const [{ count }] = await db('users').where('created_at', '>=', date).count('* as count');
    return count;
  },

  async countByStatus(status) {
    const [{ count }] = await db('users').where({ status }).count('* as count');
    return count;
  },
};

module.exports = UserRepo;
