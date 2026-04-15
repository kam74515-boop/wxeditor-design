const db = require('../config/db');

const TemplateRepo = {
  async findById(id) {
    return db('templates').where({ id, status: 'active' }).first();
  },

  async create(data) {
    const [id] = await db('templates').insert({
      ...data,
      tags: typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),
      is_public: data.isPublic ? 1 : 0,
    });
    return this.findById(id);
  },

  async update(id, data) {
    const updates = { ...data, updated_at: db.fn.now() };
    if (data.tags !== undefined) updates.tags = typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags);
    if (data.isPublic !== undefined) updates.is_public = data.isPublic ? 1 : 0;
    delete updates.isPublic;
    await db('templates').where({ id }).update(updates);
    return this.findById(id);
  },

  async softDelete(id) {
    await db('templates').where({ id }).update({ status: 'deleted', updated_at: db.fn.now() });
  },

  async list({ page = 1, limit = 20, category, search, isPublic, authorId } = {}) {
    const query = db('templates').where({ status: 'active' });

    if (isPublic === '1') query.where({ is_public: 1 });
    else if (isPublic === '0' && authorId) query.where({ author_id: authorId });
    else if (authorId) query.where(function () { this.where({ is_public: 1 }).orWhere({ author_id: authorId }); });
    else query.where({ is_public: 1 });

    if (category) query.where({ category });
    if (search) query.where(function () {
      this.where('name', 'like', `%${search}%`).orWhere('description', 'like', `%${search}%`);
    });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query.orderBy('use_count', 'desc').orderBy('created_at', 'desc')
      .limit(limit).offset((page - 1) * limit);

    return { list, total: count, page, limit };
  },

  async getCategories() {
    return db('templates')
      .where({ status: 'active' })
      .select('category')
      .count('* as count')
      .groupBy('category')
      .orderBy('count', 'desc');
  },

  async incrementUseCount(id) {
    await db('templates').where({ id }).increment('use_count', 1);
  },

  async clone(id, newAuthorId) {
    const template = await this.findById(id);
    if (!template) return null;
    const [newId] = await db('templates').insert({
      name: `${template.name} (副本)`,
      description: template.description,
      category: template.category,
      content: template.content,
      preview_image: template.preview_image,
      tags: template.tags,
      is_public: 0,
      author_id: newAuthorId,
    });
    return this.findById(newId);
  },
};

module.exports = TemplateRepo;
