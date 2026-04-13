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

const ScheduledPostRepo = require('../../src/repositories/scheduledPost.repo');
const WechatAccountRepo = require('../../src/repositories/wechatAccount.repo');
const ScheduledPostService = require('../../src/services/scheduledPost.service');

jest.mock('../../src/repositories/scheduledPost.repo');
jest.mock('../../src/repositories/wechatAccount.repo');
jest.mock('../../src/services/scheduledPostLog.service', () => ({
  create: jest.fn().mockResolvedValue({ id: 1 }),
  listByPostId: jest.fn().mockResolvedValue([]),
}));

describe('ScheduledPostService', () => {
  const user = { id: 1, role: 'user' };
  const adminUser = { id: 2, role: 'admin' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── list ────────────────────────────────────────────────
  describe('list', () => {
    it('should list scheduled posts with defaults', async () => {
      const mockResult = { rows: [], total: 0 };
      ScheduledPostRepo.listByUserId.mockResolvedValue(mockResult);

      const result = await ScheduledPostService.list(user, {});

      expect(ScheduledPostRepo.listByUserId).toHaveBeenCalledWith(1, {
        status: undefined,
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass status, page, limit from query', async () => {
      ScheduledPostRepo.listByUserId.mockResolvedValue({ rows: [], total: 0 });

      await ScheduledPostService.list(user, { status: 'pending', page: '3', limit: '10' });

      expect(ScheduledPostRepo.listByUserId).toHaveBeenCalledWith(1, {
        status: 'pending',
        page: 3,
        limit: 10,
      });
    });
  });

  // ── create ──────────────────────────────────────────────
  describe('create', () => {
    const validData = {
      account_id: 10,
      title: 'Test Post',
      publish_at: '2025-06-01T10:00:00Z',
      content: { html: '<p>hello</p>' },
      cover_image: 'cover.jpg',
      digest: 'A summary',
    };

    it('should create a scheduled post successfully', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 10, user_id: 1 });
      ScheduledPostRepo.create.mockResolvedValue({ id: 1, status: 'pending' });

      const result = await ScheduledPostService.create(user, validData);

      expect(WechatAccountRepo.findById).toHaveBeenCalledWith(10);
      expect(ScheduledPostRepo.create).toHaveBeenCalledWith({
        user_id: 1,
        account_id: 10,
        title: 'Test Post',
        content: JSON.stringify({ html: '<p>hello</p>' }),
        cover_image: 'cover.jpg',
        digest: 'A summary',
        publish_at: '2025-06-01T10:00:00Z',
        status: 'pending',
      });
      expect(result).toEqual({ id: 1, status: 'pending' });
    });

    it('should allow admin to use another user account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 10, user_id: 99 });
      ScheduledPostRepo.create.mockResolvedValue({ id: 2 });

      const result = await ScheduledPostService.create(adminUser, validData);
      expect(result.id).toBe(2);
    });

    it('should throw 400 if account_id is missing', async () => {
      await expect(
        ScheduledPostService.create(user, { title: 'T', publish_at: '2025-01-01' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 400 if title is missing', async () => {
      await expect(
        ScheduledPostService.create(user, { account_id: 1, publish_at: '2025-01-01' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 400 if publish_at is missing', async () => {
      await expect(
        ScheduledPostService.create(user, { account_id: 1, title: 'T' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should throw 404 if account not found', async () => {
      WechatAccountRepo.findById.mockResolvedValue(null);

      await expect(
        ScheduledPostService.create(user, validData)
      ).rejects.toMatchObject({ statusCode: 404, message: '公众号不存在' });
    });

    it('should throw 403 if user does not own the account', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 10, user_id: 99 });

      await expect(
        ScheduledPostService.create(user, validData)
      ).rejects.toMatchObject({ statusCode: 403, message: '无权使用此公众号' });
    });

    it('should handle null content', async () => {
      WechatAccountRepo.findById.mockResolvedValue({ id: 10, user_id: 1 });
      ScheduledPostRepo.create.mockResolvedValue({ id: 3 });

      await ScheduledPostService.create(user, {
        account_id: 10,
        title: 'No Content',
        publish_at: '2025-01-01',
      });

      expect(ScheduledPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: null })
      );
    });
  });

  // ── update ──────────────────────────────────────────────
  describe('update', () => {
    const pendingPost = { id: 1, user_id: 1, status: 'pending' };

    it('should update allowed fields', async () => {
      ScheduledPostRepo.findById.mockResolvedValue(pendingPost);
      ScheduledPostRepo.update.mockResolvedValue({ id: 1, title: 'Updated' });

      const result = await ScheduledPostService.update(user, 1, {
        title: 'Updated',
        publish_at: '2025-07-01',
      });

      expect(ScheduledPostRepo.update).toHaveBeenCalledWith(1, {
        title: 'Updated',
        publish_at: '2025-07-01',
      });
      expect(result.title).toBe('Updated');
    });

    it('should JSON.stringify content field', async () => {
      ScheduledPostRepo.findById.mockResolvedValue(pendingPost);
      ScheduledPostRepo.update.mockResolvedValue({ id: 1 });

      await ScheduledPostService.update(user, 1, {
        content: { blocks: [] },
      });

      expect(ScheduledPostRepo.update).toHaveBeenCalledWith(1, {
        content: JSON.stringify({ blocks: [] }),
      });
    });

    it('should throw 404 if post not found', async () => {
      ScheduledPostRepo.findById.mockResolvedValue(null);

      await expect(
        ScheduledPostService.update(user, 999, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404, message: '定时任务不存在' });
    });

    it('should throw 403 if user does not own the post', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 99, status: 'pending' });

      await expect(
        ScheduledPostService.update(user, 1, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 403, message: '无权修改此任务' });
    });

    it('should allow admin to update any post', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 99, status: 'pending' });
      ScheduledPostRepo.update.mockResolvedValue({ id: 1 });

      const result = await ScheduledPostService.update(adminUser, 1, { title: 'Admin Edit' });
      expect(result).toBeDefined();
    });

    it('should throw 400 if post is already published', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'published' });

      await expect(
        ScheduledPostService.update(user, 1, { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 400, message: '已发布的任务不可修改' });
    });
  });

  // ── cancel ──────────────────────────────────────────────
  describe('cancel', () => {
    it('should cancel a pending post', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'pending' });
      ScheduledPostRepo.update.mockResolvedValue({ id: 1, status: 'cancelled' });

      const result = await ScheduledPostService.cancel(user, 1);

      expect(ScheduledPostRepo.update).toHaveBeenCalledWith(1, { status: 'cancelled' });
      expect(result.status).toBe('cancelled');
    });

    it('should throw 404 if post not found', async () => {
      ScheduledPostRepo.findById.mockResolvedValue(null);

      await expect(ScheduledPostService.cancel(user, 999)).rejects.toMatchObject({
        statusCode: 404,
        message: '定时任务不存在',
      });
    });

    it('should throw 403 if user does not own the post', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 99, status: 'pending' });

      await expect(ScheduledPostService.cancel(user, 1)).rejects.toMatchObject({
        statusCode: 403,
        message: '无权取消此任务',
      });
    });

    it('should throw 400 if post is not pending', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'published' });

      await expect(ScheduledPostService.cancel(user, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: '只能取消待执行的任务',
      });
    });
  });

  // ── execute ─────────────────────────────────────────────
  describe('execute', () => {
    it('should execute a pending post successfully', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'pending' });
      ScheduledPostRepo.update.mockResolvedValue({ id: 1, status: 'published' });

      const result = await ScheduledPostService.execute(user, 1);

      expect(ScheduledPostRepo.update).toHaveBeenCalledWith(1, {
        status: 'published',
        wechat_media_id: expect.stringContaining('mock_media_'),
      });
      expect(result.status).toBe('published');
    });

    it('should throw 404 if post not found', async () => {
      ScheduledPostRepo.findById.mockResolvedValue(null);

      await expect(ScheduledPostService.execute(user, 999)).rejects.toMatchObject({
        statusCode: 404,
        message: '定时任务不存在',
      });
    });

    it('should throw 403 if user does not own the post', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 99, status: 'pending' });

      await expect(ScheduledPostService.execute(user, 1)).rejects.toMatchObject({
        statusCode: 403,
        message: '无权执行此任务',
      });
    });

    it('should throw 400 if post status is not pending', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'cancelled' });

      await expect(ScheduledPostService.execute(user, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: '任务状态不可执行',
      });
    });

    it('should handle repo update error gracefully', async () => {
      ScheduledPostRepo.findById.mockResolvedValue({ id: 1, user_id: 1, status: 'pending' });
      ScheduledPostRepo.update.mockRejectedValue(new Error('Repo down'));

      // The execute method's try block calls Repo.update which rejects.
      // Due to the try/catch, it should record failure and throw with statusCode 500.
      // However, if the catch block's own Repo.update also rejects, the original error propagates.
      // Since we mock ALL calls to reject, the catch block's update also fails,
      // so the original 'Repo down' error escapes without being wrapped.
      await expect(ScheduledPostService.execute(user, 1)).rejects.toThrow('Repo down');
    });
  });

  // ── checkAndPublish ─────────────────────────────────────
  describe('checkAndPublish', () => {
    it('should return empty results when no due posts', async () => {
      ScheduledPostRepo.findPendingDue.mockResolvedValue([]);

      const result = await ScheduledPostService.checkAndPublish();

      expect(result).toEqual({ success: 0, failed: 0, errors: [] });
    });

    it('should publish due posts and count successes', async () => {
      const posts = [
        { id: 1, user_id: 1 },
        { id: 2, user_id: 1 },
      ];
      ScheduledPostRepo.findPendingDue.mockResolvedValue(posts);
      ScheduledPostRepo.update.mockResolvedValue({ status: 'published' });

      const result = await ScheduledPostService.checkAndPublish();

      expect(ScheduledPostRepo.update).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should record failures for individual posts', async () => {
      const posts = [
        { id: 1, user_id: 1 },
        { id: 2, user_id: 1 },
      ];
      ScheduledPostRepo.findPendingDue.mockResolvedValue(posts);
      // First post succeeds, second fails
      ScheduledPostRepo.update.mockResolvedValueOnce({ status: 'published' });
      ScheduledPostRepo.update.mockRejectedValueOnce(new Error('timeout'));
      ScheduledPostRepo.update.mockResolvedValueOnce({ status: 'failed' });

      const result = await ScheduledPostService.checkAndPublish();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual([{ id: 2, error: 'timeout' }]);
    });
  });
});
