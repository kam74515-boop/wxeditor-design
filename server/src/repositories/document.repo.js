const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const DocumentRepo = {
  async findById(id) {
    return db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.id', id)
      .select('d.*', 'u.username', 'u.nickname', 'u.avatar')
      .first();
  },

  async create({ title = '未命名文档', content = '', summary = '', author_id, visibility = 'private' }) {
    const id = uuidv4();
    const plainText = content.replace(/<[^>]*>/g, '');
    await db('documents').insert({
      id, title, content, summary, author_id, visibility,
      word_count: plainText.length, version: 1,
    });
    return this.findById(id);
  },

  async update(id, data) {
    const updates = { ...data, updated_at: db.fn.now() };
    if (data.content !== undefined) {
      updates.word_count = data.content.replace(/<[^>]*>/g, '').length;
      updates.version = db.raw('version + 1');
    }
    if (data.status === 'published') {
      updates.published_at = db.raw('COALESCE(published_at, NOW())');
    }
    await db('documents').where({ id }).update(updates);
    return this.findById(id);
  },

  async softDelete(id) {
    await db('documents').where({ id }).update({ status: 'deleted', updated_at: db.fn.now() });
  },

  async list({ page = 1, limit = 12, search, status, author_id, visibility } = {}) {
    const query = db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .select('d.id', 'd.title', 'd.summary', 'd.cover_image', 'd.status', 'd.visibility',
        'd.category', 'd.tags', 'd.version', 'd.word_count', 'd.created_at', 'd.updated_at',
        'u.id as author_id', 'u.username', 'u.nickname', 'u.avatar');

    if (search) query.where('d.title', 'like', `%${search}%`);
    if (status) query.where('d.status', status);
    else query.whereNot('d.status', 'deleted');
    if (author_id) query.where('d.author_id', author_id);
    if (visibility) query.where('d.visibility', visibility);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('d.updated_at', 'desc').limit(limit).offset((page - 1) * limit);

    return {
      list: list.map(mapDoc),
      total: count, page, limit,
    };
  },

  async listPublic({ page = 1, limit = 10, category } = {}) {
    const query = db('documents as d')
      .leftJoin('users as u', 'd.author_id', 'u.id')
      .where('d.status', 'published')
      .where('d.visibility', 'public')
      .select('d.id', 'd.title', 'd.summary', 'd.cover_image', 'd.category', 'd.word_count',
        'd.created_at', 'd.updated_at', 'u.id as author_id', 'u.username', 'u.nickname', 'u.avatar');

    if (category) query.where('d.category', category);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count('* as count');
    const list = await query.orderBy('d.created_at', 'desc').limit(limit).offset((page - 1) * limit);
    return { list: list.map(mapDoc), total: count, page, limit };
  },

  async getHistory(documentId, { page = 1, limit = 20 } = {}) {
    const query = db('document_versions as dv')
      .leftJoin('users as u', 'dv.changed_by', 'u.id')
      .where('dv.document_id', documentId)
      .select('dv.*', 'u.username', 'u.nickname', 'u.avatar')
      .orderBy('dv.version', 'desc');

    const [{ count }] = await db('document_versions').where({ document_id: documentId }).count('* as count');
    const list = await query.limit(limit).offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async saveVersion({ document_id, version, content, changed_by, change_summary }) {
    return db('document_versions').insert({ document_id, version, content, changed_by, change_summary });
  },

  async getCollaborators(documentId) {
    return db('collaborators as c')
      .leftJoin('users as u', 'c.user_id', 'u.id')
      .where('c.document_id', documentId)
      .select('c.*', 'u.username', 'u.nickname', 'u.avatar');
  },

  async addCollaborator({ document_id, user_id, role = 'viewer' }) {
    return db('collaborators').insert({ document_id, user_id, role });
  },

  async isCollaborator(documentId, userId) {
    const row = await db('collaborators').where({ document_id: documentId, user_id: userId }).first();
    return !!row;
  },

  async countByAuthor(authorId) {
    const [{ count }] = await db('documents')
      .where({ author_id: authorId }).whereNot('status', 'deleted')
      .count('* as count');
    return count;
  },

  async getCategories() {
    const rows = await db('documents')
      .where('status', 'published')
      .whereNotNull('category')
      .where('category', '!=', '')
      .distinct('category');
    return rows.map(r => r.category);
  },

  async getStats() {
    const [total] = await db('documents').count('* as count');
    const [published] = await db('documents').where('status', 'published').count('* as count');
    const [drafts] = await db('documents').where('status', 'draft').count('* as count');
    return {
      total: total.count,
      published: published.count,
      drafts: drafts.count,
    };
  },
};

function mapDoc(row) {
  let tags = [];
  try { tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags; } catch {}
  return {
    id: row.id, title: row.title, summary: row.summary,
    coverImage: row.cover_image, status: row.status, visibility: row.visibility,
    category: row.category, tags, version: row.version, wordCount: row.word_count,
    createdAt: row.created_at, updatedAt: row.updated_at,
    author: row.author_id ? { id: row.author_id, username: row.username, nickname: row.nickname, avatar: row.avatar } : null,
  };
}

module.exports = DocumentRepo;
