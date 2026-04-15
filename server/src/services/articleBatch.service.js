const ArticleBatchRepo = require('../repositories/articleBatch.repo');

const ArticleBatchService = {
  /**
   * 列表
   */
  async list(user, query) {
    const { status, page, limit } = query;
    return ArticleBatchRepo.listByUserId(user.id, { status, page: Number(page) || 1, limit: Number(limit) || 20 });
  },

  /**
   * 详情（含文章）
   */
  async getDetail(user, id) {
    const batch = await ArticleBatchRepo.findById(id);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权访问此图文合集'), { statusCode: 403 });
    }
    const articles = await ArticleBatchRepo.findArticlesByBatchId(id);
    return { ...batch, articles };
  },

  /**
   * 创建批次（可含初始文章）
   */
  async create(user, data) {
    const { title, account_id, articles } = data;
    if (!title) {
      throw Object.assign(new Error('合集标题不能为空'), { statusCode: 400 });
    }

    const batch = await ArticleBatchRepo.createBatch({
      user_id: user.id,
      account_id: account_id || null,
      title,
      status: 'draft',
    });

    // Create initial articles if provided
    if (articles && Array.isArray(articles)) {
      for (let i = 0; i < Math.min(articles.length, 8); i++) {
        const a = articles[i];
        await ArticleBatchRepo.createArticle({
          batch_id: batch.id,
          position: i + 1,
          title: a.title || `文章 ${i + 1}`,
          content: a.content || '',
          cover_image: a.cover_image || '',
          digest: a.digest || '',
          author: a.author || '',
          word_count: a.word_count || 0,
          content_source_url: a.content_source_url || '',
          show_cover_pic: a.show_cover_pic !== undefined ? a.show_cover_pic : true,
          need_open_comment: a.need_open_comment || false,
          only_fans_can_comment: a.only_fans_can_comment || false,
        });
      }
    }

    return ArticleBatchService.getDetail(user, batch.id);
  },

  /**
   * 更新批次
   */
  async update(user, id, data) {
    const batch = await ArticleBatchRepo.findById(id);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权修改此图文合集'), { statusCode: 403 });
    }

    const updates = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.status !== undefined) updates.status = data.status;
    if (data.account_id !== undefined) updates.account_id = data.account_id;

    await ArticleBatchRepo.updateBatch(id, updates);
    return ArticleBatchService.getDetail(user, id);
  },

  /**
   * 删除
   */
  async remove(user, id) {
    const batch = await ArticleBatchRepo.findById(id);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权删除此图文合集'), { statusCode: 403 });
    }
    await ArticleBatchRepo.deleteBatch(id);
  },

  /**
   * 添加文章
   */
  async addArticle(user, batchId, data) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    // Check max 8 articles
    const count = await ArticleBatchRepo.countArticlesInBatch(batchId);
    if (count >= 8) {
      throw Object.assign(new Error('最多支持8篇文章'), { statusCode: 400 });
    }

    if (!data.title) {
      throw Object.assign(new Error('文章标题不能为空'), { statusCode: 400 });
    }

    const article = await ArticleBatchRepo.createArticle({
      batch_id: batchId,
      position: count + 1,
      title: data.title,
      content: data.content || '',
      cover_image: data.cover_image || '',
      digest: data.digest || '',
      author: data.author || '',
      word_count: data.word_count || 0,
      content_source_url: data.content_source_url || '',
      show_cover_pic: data.show_cover_pic !== undefined ? data.show_cover_pic : true,
      need_open_comment: data.need_open_comment || false,
      only_fans_can_comment: data.only_fans_can_comment || false,
    });

    return article;
  },

  /**
   * 更新文章
   */
  async updateArticle(user, batchId, articleId, data) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    const article = await ArticleBatchRepo.findArticleById(articleId);
    if (!article || article.batch_id !== Number(batchId)) {
      throw Object.assign(new Error('文章不存在'), { statusCode: 404 });
    }

    const updates = {};
    const allowedFields = ['title', 'content', 'cover_image', 'digest', 'author',
      'word_count', 'content_source_url', 'show_cover_pic', 'need_open_comment', 'only_fans_can_comment'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) updates[field] = data[field];
    }

    return ArticleBatchRepo.updateArticle(articleId, updates);
  },

  /**
   * 删除文章
   */
  async removeArticle(user, batchId, articleId) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    const article = await ArticleBatchRepo.findArticleById(articleId);
    if (!article || article.batch_id !== Number(batchId)) {
      throw Object.assign(new Error('文章不存在'), { statusCode: 404 });
    }

    await ArticleBatchRepo.deleteArticle(articleId);
  },

  /**
   * 重排文章顺序
   */
  async reorder(user, batchId, orderedIds) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw Object.assign(new Error('请提供有效的文章排序'), { statusCode: 400 });
    }

    await ArticleBatchRepo.reorderArticles(batchId, orderedIds);
    return ArticleBatchRepo.findArticlesByBatchId(batchId);
  },

  /**
   * 发布（模拟调用微信API）
   */
  async publish(user, id) {
    const batch = await ArticleBatchRepo.findById(id);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    const articles = await ArticleBatchRepo.findArticlesByBatchId(id);
    if (articles.length === 0) {
      throw Object.assign(new Error('请至少添加一篇文章'), { statusCode: 400 });
    }

    // Simulate WeChat API call
    const mediaId = `mock_media_${Date.now()}`;

    await ArticleBatchRepo.updateBatch(id, {
      status: 'published',
      published_at: new Date().toISOString(),
      wechat_media_id: mediaId,
    });

    return {
      success: true,
      wechat_media_id: mediaId,
      article_count: articles.length,
      published_at: new Date().toISOString(),
    };
  },

  /**
   * 复制合集 — 深拷贝批次及其所有文章
   */
  async duplicateBatch(user, batchId) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权操作此图文合集'), { statusCode: 403 });
    }

    const articles = await ArticleBatchRepo.findArticlesByBatchId(batchId);

    // Create new batch
    const newBatch = await ArticleBatchRepo.createBatch({
      user_id: user.id,
      account_id: batch.account_id,
      title: batch.title + ' (副本)',
      status: 'draft',
    });

    // Copy all articles
    for (const article of articles) {
      await ArticleBatchRepo.createArticle({
        batch_id: newBatch.id,
        position: article.position,
        title: article.title,
        content: article.content || '',
        cover_image: article.cover_image || '',
        digest: article.digest || '',
        author: article.author || '',
        word_count: article.word_count || 0,
        content_source_url: article.content_source_url || '',
        show_cover_pic: article.show_cover_pic !== undefined ? article.show_cover_pic : true,
        need_open_comment: article.need_open_comment || false,
        only_fans_can_comment: article.only_fans_can_comment || false,
      });
    }

    return ArticleBatchService.getDetail(user, newBatch.id);
  },

  /**
   * 获取合集预览数据 — 包含所有文章完整内容
   */
  async getBatchPreview(user, batchId) {
    const batch = await ArticleBatchRepo.findById(batchId);
    if (!batch) {
      throw Object.assign(new Error('图文合集不存在'), { statusCode: 404 });
    }
    if (batch.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权访问此图文合集'), { statusCode: 403 });
    }

    const articles = await ArticleBatchRepo.findArticlesByBatchId(batchId);
    if (articles.length === 0) {
      throw Object.assign(new Error('合集内没有文章'), { statusCode: 400 });
    }

    // Build preview data
    const totalWords = articles.reduce((sum, a) => sum + (a.word_count || 0), 0);

    return {
      batch: {
        id: batch.id,
        title: batch.title,
        status: batch.status,
        account_id: batch.account_id,
        article_count: articles.length,
        total_word_count: totalWords,
        created_at: batch.created_at,
        updated_at: batch.updated_at,
      },
      articles: articles.map((a, idx) => ({
        position: a.position,
        title: a.title,
        content: a.content,
        cover_image: a.cover_image,
        digest: a.digest,
        author: a.author,
        word_count: a.word_count,
        content_source_url: a.content_source_url,
        show_cover_pic: a.show_cover_pic,
        need_open_comment: a.need_open_comment,
        only_fans_can_comment: a.only_fans_can_comment,
      })),
      summary: {
        total_articles: articles.length,
        total_word_count: totalWords,
        has_cover: articles.every(a => !!a.cover_image),
        ready_to_publish: articles.length > 0 && articles.every(a => !!a.title),
      },
    };
  },
};

module.exports = ArticleBatchService;
