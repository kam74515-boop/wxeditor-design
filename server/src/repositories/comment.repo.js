const db = require('../config/db');

const CommentRepo = {
  async findById(id) {
    return db('comments').where({ id }).first();
  },

  async findByDocumentId(documentId) {
    return db('comments')
      .where({ document_id: documentId, status: 'active' })
      .orderBy('created_at', 'asc');
  },

  async create(data) {
    const [id] = await db('comments').insert(data);
    return this.findById(id);
  },

  async update(id, data) {
    await db('comments').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async delete(id) {
    return db('comments').where({ id }).update({
      status: 'deleted',
      updated_at: db.fn.now(),
    });
  },
};

module.exports = CommentRepo;
