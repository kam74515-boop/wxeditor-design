const db = require('../config/db');

const ArticleBatchRepo = {
  // ---- Batch ----
  async findById(id) {
    return db('article_batches').where({ id }).first();
  },

  async listByUserId(userId, { status, page = 1, limit = 20 } = {}) {
    const query = db('article_batches').where({ user_id: userId });
    if (status) query.where({ status });

    const [{ count }] = await query.clone().count('* as count');
    const list = await query
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    return { list, total: count, page, limit };
  },

  async createBatch(data) {
    const [id] = await db('article_batches').insert(data);
    return this.findById(id);
  },

  async updateBatch(id, data) {
    await db('article_batches').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.findById(id);
  },

  async deleteBatch(id) {
    return db('article_batches').where({ id }).delete();
  },

  // ---- Articles in batch ----
  async findArticlesByBatchId(batchId) {
    return db('batch_articles')
      .where({ batch_id: batchId })
      .orderBy('position', 'asc');
  },

  async findArticleById(id) {
    return db('batch_articles').where({ id }).first();
  },

  async createArticle(data) {
    const [id] = await db('batch_articles').insert(data);
    return this.findArticleById(id);
  },

  async updateArticle(id, data) {
    await db('batch_articles').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.findArticleById(id);
  },

  async deleteArticle(id) {
    return db('batch_articles').where({ id }).delete();
  },

  async reorderArticles(batchId, articleIds) {
    // Update position for each article
    for (let i = 0; i < articleIds.length; i++) {
      await db('batch_articles')
        .where({ id: articleIds[i], batch_id: batchId })
        .update({ position: i + 1, updated_at: db.fn.now() });
    }
  },

  async countArticlesInBatch(batchId) {
    const [{ count }] = await db('batch_articles')
      .where({ batch_id: batchId })
      .count('* as count');
    return count;
  },
};

module.exports = ArticleBatchRepo;
