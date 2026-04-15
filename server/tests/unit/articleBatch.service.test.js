jest.mock('../../src/config/db', () => {
  const fn = jest.fn();
  const chain = { where: jest.fn(), first: jest.fn(), update: jest.fn(), insert: jest.fn(), del: jest.fn(), select: jest.fn() };
  fn.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.first.mockResolvedValue(null);
  chain.update.mockResolvedValue(1);
  chain.insert.mockResolvedValue([1]);
  chain.del.mockResolvedValue(1);
  chain.select.mockReturnValue(chain);
  return fn;
});

const ArticleBatchRepo = require('../../src/repositories/articleBatch.repo');
const ArticleBatchService = require('../../src/services/articleBatch.service');

jest.mock('../../src/repositories/articleBatch.repo');

describe('ArticleBatchService', () => {
  const user = { id: 1, role: 'user' };
  const adminUser = { id: 2, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── list ────────────────────────────────────────────────
  describe('list', () => {
    it('should list batches with defaults', async () => {
      const mockResult = { rows: [], total: 0 };
      ArticleBatchRepo.listByUserId.mockResolvedValue(mockResult);

      const result = await ArticleBatchService.list(user, {});

      expect(ArticleBatchRepo.listByUserId).toHaveBeenCalledWith(1, {
        status: undefined,
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass status, page, limit from query', async () => {
      ArticleBatchRepo.listByUserId.mockResolvedValue({ rows: [], total: 0 });

      await ArticleBatchService.list(user, { status: 'draft', page: '2', limit: '5' });

      expect(ArticleBatchRepo.listByUserId).toHaveBeenCalledWith(1, {
        status: 'draft',
        page: 2,
        limit: 5,
      });
    });

    it('should default to page 1 and limit 20 for invalid values', async () => {
      ArticleBatchRepo.listByUserId.mockResolvedValue({ rows: [], total: 0 });

      await ArticleBatchService.list(user, { page: 'abc', limit: '' });

      expect(ArticleBatchRepo.listByUserId).toHaveBeenCalledWith(1, {
        status: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  // ── getDetail ───────────────────────────────────────────
  describe('getDetail', () => {
    it('should return batch with articles', async () => {
      const batch = { id: 1, user_id: 1, title: 'My Batch' };
      const articles = [{ id: 10, title: 'Article 1' }];
      ArticleBatchRepo.findById.mockResolvedValue(batch);
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue(articles);

      const result = await ArticleBatchService.getDetail(user, 1);

      expect(result).toEqual({ id: 1, user_id: 1, title: 'My Batch', articles });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(ArticleBatchService.getDetail(user, 999)).rejects.toMatchObject({
        statusCode: 404,
        message: '图文合集不存在',
      });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(ArticleBatchService.getDetail(user, 1)).rejects.toMatchObject({
        statusCode: 403,
        message: '无权访问此图文合集',
      });
    });

    it('should allow admin to get any batch detail', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);

      const result = await ArticleBatchService.getDetail(adminUser, 1);
      expect(result).toBeDefined();
    });
  });

  // ── create ──────────────────────────────────────────────
  describe('create', () => {
    it('should create a batch without articles', async () => {
      ArticleBatchRepo.createBatch.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1, title: 'Test' });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);

      const result = await ArticleBatchService.create(user, { title: 'Test' });

      expect(ArticleBatchRepo.createBatch).toHaveBeenCalledWith({
        user_id: 1,
        account_id: null,
        title: 'Test',
        status: 'draft',
      });
      expect(result.id).toBe(1);
    });

    it('should create a batch with initial articles (up to 8)', async () => {
      const articles = Array.from({ length: 10 }, (_, i) => ({ title: `Article ${i + 1}` }));
      ArticleBatchRepo.createBatch.mockResolvedValue({ id: 2, user_id: 1 });
      ArticleBatchRepo.findById.mockResolvedValue({ id: 2, user_id: 1 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);
      ArticleBatchRepo.createArticle.mockResolvedValue({});

      await ArticleBatchService.create(user, { title: 'With Articles', articles });

      // Should only create 8 articles max
      expect(ArticleBatchRepo.createArticle).toHaveBeenCalledTimes(8);
    });

    it('should set default values for article fields', async () => {
      ArticleBatchRepo.createBatch.mockResolvedValue({ id: 3, user_id: 1 });
      ArticleBatchRepo.findById.mockResolvedValue({ id: 3, user_id: 1 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);
      ArticleBatchRepo.createArticle.mockResolvedValue({});

      await ArticleBatchService.create(user, {
        title: 'Defaults',
        articles: [{ title: 'Only Title' }],
      });

      expect(ArticleBatchRepo.createArticle).toHaveBeenCalledWith({
        batch_id: 3,
        position: 1,
        title: 'Only Title',
        content: '',
        cover_image: '',
        digest: '',
        author: '',
        word_count: 0,
        content_source_url: '',
        show_cover_pic: true,
        need_open_comment: false,
        only_fans_can_comment: false,
      });
    });

    it('should set article title default when missing', async () => {
      ArticleBatchRepo.createBatch.mockResolvedValue({ id: 4, user_id: 1 });
      ArticleBatchRepo.findById.mockResolvedValue({ id: 4, user_id: 1 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);
      ArticleBatchRepo.createArticle.mockResolvedValue({});

      await ArticleBatchService.create(user, {
        title: 'Batch',
        articles: [{}],
      });

      expect(ArticleBatchRepo.createArticle).toHaveBeenCalledWith(
        expect.objectContaining({ title: '文章 1' })
      );
    });

    it('should throw 400 if title is empty', async () => {
      await expect(
        ArticleBatchService.create(user, { title: '' })
      ).rejects.toMatchObject({ statusCode: 400, message: '合集标题不能为空' });
    });

    it('should throw 400 if title is missing', async () => {
      await expect(
        ArticleBatchService.create(user, {})
      ).rejects.toMatchObject({ statusCode: 400, message: '合集标题不能为空' });
    });
  });

  // ── update ──────────────────────────────────────────────
  describe('update', () => {
    it('should update allowed fields', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.updateBatch.mockResolvedValue();
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);

      const result = await ArticleBatchService.update(user, 1, {
        title: 'New Title',
        status: 'ready',
        account_id: 5,
      });

      expect(ArticleBatchRepo.updateBatch).toHaveBeenCalledWith(1, {
        title: 'New Title',
        status: 'ready',
        account_id: 5,
      });
      expect(result).toBeDefined();
    });

    it('should only update provided fields', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.updateBatch.mockResolvedValue();
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);

      await ArticleBatchService.update(user, 1, { title: 'Only Title' });

      expect(ArticleBatchRepo.updateBatch).toHaveBeenCalledWith(1, { title: 'Only Title' });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(
        ArticleBatchService.update(user, 999, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        ArticleBatchService.update(user, 1, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── remove ──────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.deleteBatch.mockResolvedValue();

      await ArticleBatchService.remove(user, 1);

      expect(ArticleBatchRepo.deleteBatch).toHaveBeenCalledWith(1);
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(ArticleBatchService.remove(user, 999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(ArticleBatchService.remove(user, 1)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow admin to delete any batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      ArticleBatchRepo.deleteBatch.mockResolvedValue();

      await ArticleBatchService.remove(adminUser, 1);
      expect(ArticleBatchRepo.deleteBatch).toHaveBeenCalledWith(1);
    });
  });

  // ── addArticle ──────────────────────────────────────────
  describe('addArticle', () => {
    it('should add an article to a batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.countArticlesInBatch.mockResolvedValue(2);
      ArticleBatchRepo.createArticle.mockResolvedValue({ id: 10, title: 'New Article' });

      const result = await ArticleBatchService.addArticle(user, 1, {
        title: 'New Article',
        content: 'body',
      });

      expect(ArticleBatchRepo.createArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_id: 1,
          position: 3,
          title: 'New Article',
          content: 'body',
        })
      );
      expect(result.id).toBe(10);
    });

    it('should throw 400 if batch already has 8 articles', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.countArticlesInBatch.mockResolvedValue(8);

      await expect(
        ArticleBatchService.addArticle(user, 1, { title: 'Overflow' })
      ).rejects.toMatchObject({ statusCode: 400, message: '最多支持8篇文章' });
    });

    it('should throw 400 if article title is missing', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.countArticlesInBatch.mockResolvedValue(0);

      await expect(
        ArticleBatchService.addArticle(user, 1, { content: 'no title' })
      ).rejects.toMatchObject({ statusCode: 400, message: '文章标题不能为空' });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(
        ArticleBatchService.addArticle(user, 999, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        ArticleBatchService.addArticle(user, 1, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── updateArticle ───────────────────────────────────────
  describe('updateArticle', () => {
    it('should update article fields', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticleById.mockResolvedValue({ id: 10, batch_id: 1 });
      ArticleBatchRepo.updateArticle.mockResolvedValue({ id: 10, title: 'Updated' });

      const result = await ArticleBatchService.updateArticle(user, 1, 10, {
        title: 'Updated',
        content: 'new content',
      });

      expect(ArticleBatchRepo.updateArticle).toHaveBeenCalledWith(10, {
        title: 'Updated',
        content: 'new content',
      });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(
        ArticleBatchService.updateArticle(user, 999, 10, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 if article not found or wrong batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticleById.mockResolvedValue({ id: 10, batch_id: 999 });

      await expect(
        ArticleBatchService.updateArticle(user, 1, 10, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文章不存在' });
    });

    it('should throw 404 if article is null', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticleById.mockResolvedValue(null);

      await expect(
        ArticleBatchService.updateArticle(user, 1, 10, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404, message: '文章不存在' });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        ArticleBatchService.updateArticle(user, 1, 10, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── removeArticle ───────────────────────────────────────
  describe('removeArticle', () => {
    it('should delete an article', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticleById.mockResolvedValue({ id: 10, batch_id: 1 });
      ArticleBatchRepo.deleteArticle.mockResolvedValue();

      await ArticleBatchService.removeArticle(user, 1, 10);

      expect(ArticleBatchRepo.deleteArticle).toHaveBeenCalledWith(10);
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(ArticleBatchService.removeArticle(user, 999, 10)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 if article not found or wrong batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticleById.mockResolvedValue(null);

      await expect(ArticleBatchService.removeArticle(user, 1, 10)).rejects.toMatchObject({
        statusCode: 404,
        message: '文章不存在',
      });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(ArticleBatchService.removeArticle(user, 1, 10)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // ── reorder ─────────────────────────────────────────────
  describe('reorder', () => {
    it('should reorder articles', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.reorderArticles.mockResolvedValue();
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([
        { id: 2 },
        { id: 1 },
      ]);

      const result = await ArticleBatchService.reorder(user, 1, [2, 1]);

      expect(ArticleBatchRepo.reorderArticles).toHaveBeenCalledWith(1, [2, 1]);
      expect(result).toHaveLength(2);
    });

    it('should throw 400 if orderedIds is not an array', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });

      await expect(
        ArticleBatchService.reorder(user, 1, 'not-array')
      ).rejects.toMatchObject({ statusCode: 400, message: '请提供有效的文章排序' });
    });

    it('should throw 400 if orderedIds is empty', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });

      await expect(
        ArticleBatchService.reorder(user, 1, [])
      ).rejects.toMatchObject({ statusCode: 400, message: '请提供有效的文章排序' });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(
        ArticleBatchService.reorder(user, 999, [1, 2])
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(
        ArticleBatchService.reorder(user, 1, [1, 2])
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ── publish ─────────────────────────────────────────────
  describe('publish', () => {
    it('should publish a batch with articles', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([
        { id: 10 },
        { id: 11 },
      ]);
      ArticleBatchRepo.updateBatch.mockResolvedValue();

      const result = await ArticleBatchService.publish(user, 1);

      expect(result.success).toBe(true);
      expect(result.article_count).toBe(2);
      expect(result.wechat_media_id).toMatch(/^mock_media_/);
      expect(ArticleBatchRepo.updateBatch).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should throw 400 if batch has no articles', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 1 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([]);

      await expect(ArticleBatchService.publish(user, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: '请至少添加一篇文章',
      });
    });

    it('should throw 404 if batch not found', async () => {
      ArticleBatchRepo.findById.mockResolvedValue(null);

      await expect(ArticleBatchService.publish(user, 999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 403 if user does not own the batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });

      await expect(ArticleBatchService.publish(user, 1)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow admin to publish any batch', async () => {
      ArticleBatchRepo.findById.mockResolvedValue({ id: 1, user_id: 99 });
      ArticleBatchRepo.findArticlesByBatchId.mockResolvedValue([{ id: 10 }]);
      ArticleBatchRepo.updateBatch.mockResolvedValue();

      const result = await ArticleBatchService.publish(adminUser, 1);
      expect(result.success).toBe(true);
    });
  });
});
