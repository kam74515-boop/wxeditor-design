const db = require('../config/db');

const ContentRepo = {
  async findPublic({ page = 1, limit = 10, category } = {}) {
    const query = db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.status', 'published')
      .where('d.visibility', 'public')
      .select('d.id', 'd.title', 'd.summary', 'd.cover_image', 'd.category',
        'd.word_count', 'd.created_at', 'd.updated_at',
        'u.id as author_id', 'u.username', 'u.nickname', 'u.avatar');

    if (category) query.where('d.category', category);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('d.created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list: list.map(mapContent), total: count, page, limit };
  },

  async findMembers({ page = 1, limit = 10, category } = {}) {
    const query = db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.status', 'published')
      .whereIn('d.visibility', ['public', 'members_only', 'vip_only'])
      .select('d.id', 'd.title', 'd.summary', 'd.cover_image', 'd.visibility', 'd.category',
        'd.word_count', 'd.created_at', 'd.updated_at',
        'u.id as author_id', 'u.username', 'u.nickname', 'u.avatar');

    if (category) query.where('d.category', category);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('d.created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list: list.map(mapContent), total: count, page, limit };
  },

  async findVip({ page = 1, limit = 10 } = {}) {
    const query = db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.status', 'published')
      .whereIn('d.visibility', ['members_only', 'vip_only'])
      .select('d.id', 'd.title', 'd.summary', 'd.cover_image', 'd.visibility', 'd.category',
        'd.created_at', 'u.id as author_id', 'u.username', 'u.nickname', 'u.avatar');

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('d.created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list: list.map(mapContent), total: count, page, limit };
  },

  async findById(id) {
    return db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.id', id)
      .select('d.*', 'u.username', 'u.nickname', 'u.avatar', 'u.role as user_role')
      .first();
  },

  async getCategories() {
    const rows = await db('documents')
      .where('status', 'published')
      .whereNotNull('category')
      .where('category', '!=', '')
      .distinct('category');
    return rows.map(r => r.category);
  },

  async findByAuthor(userId, { page = 1, limit = 10, status } = {}) {
    const query = db('documents').where({ author_id: userId });
    if (status) query.where({ status });
    else query.whereNot('status', 'deleted');

    const [{ count }] = await query.clone().count('* as count');
    const list = await query.orderBy('updated_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },
};

function mapContent(row) {
  let tags = [];
  try { tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags; } catch {}
  return {
    id: row.id, title: row.title, summary: row.summary,
    coverImage: row.cover_image, visibility: row.visibility, category: row.category,
    tags, wordCount: row.word_count, createdAt: row.created_at, updatedAt: row.updated_at,
    author: row.author_id ? { id: row.author_id, username: row.username, nickname: row.nickname, avatar: row.avatar } : null,
  };
}

module.exports = ContentRepo;
