const ScheduledPostRepo = require('../repositories/scheduledPost.repo');
const ScheduledPostLogService = require('./scheduledPostLog.service');
const WechatAccountRepo = require('../repositories/wechatAccount.repo');

const ScheduledPostService = {
  async list(user, query = {}) {
    const { status, page = 1, limit = 20 } = query;
    return ScheduledPostRepo.listByUserId(user.id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  },

  async create(user, data) {
    const { account_id, title, content, publish_at, cover_image, digest, repeat_type } = data;

    if (!account_id || !title || !publish_at) {
      throw Object.assign(new Error('account_id、标题和发布时间不能为空'), { statusCode: 400 });
    }

    // 验证公众号归属
    const account = await WechatAccountRepo.findById(account_id);
    if (!account) {
      throw Object.assign(new Error('公众号不存在'), { statusCode: 404 });
    }
    if (account.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权使用此公众号'), { statusCode: 403 });
    }

    // Validate repeat_type
    const validRepeatTypes = ['once', 'daily', 'weekly'];
    const resolvedRepeatType = validRepeatTypes.includes(repeat_type) ? repeat_type : 'once';

    return ScheduledPostRepo.create({
      user_id: user.id,
      account_id,
      title,
      content: content ? JSON.stringify(content) : null,
      cover_image: cover_image || '',
      digest: digest || '',
      publish_at,
      status: 'scheduled',
      repeat_type: resolvedRepeatType,
    });
  },

  async update(user, id, data) {
    const post = await ScheduledPostRepo.findById(id);
    if (!post) {
      throw Object.assign(new Error('定时任务不存在'), { statusCode: 404 });
    }
    if (post.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权修改此任务'), { statusCode: 403 });
    }
    if (post.status === 'published') {
      throw Object.assign(new Error('已发布的任务不可修改'), { statusCode: 400 });
    }

    const updates = {};
    const allowedFields = ['title', 'content', 'cover_image', 'digest', 'publish_at', 'status'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = field === 'content' ? JSON.stringify(data[field]) : data[field];
      }
    }

    return ScheduledPostRepo.update(id, updates);
  },

  async cancel(user, id) {
    const post = await ScheduledPostRepo.findById(id);
    if (!post) {
      throw Object.assign(new Error('定时任务不存在'), { statusCode: 404 });
    }
    if (post.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权取消此任务'), { statusCode: 403 });
    }
    if (post.status !== 'pending' && post.status !== 'scheduled') {
      throw Object.assign(new Error('只能取消待执行的任务'), { statusCode: 400 });
    }

    return ScheduledPostRepo.update(id, { status: 'cancelled' });
  },

  async execute(user, id) {
    const post = await ScheduledPostRepo.findById(id);
    if (!post) {
      throw Object.assign(new Error('定时任务不存在'), { statusCode: 404 });
    }
    if (post.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权执行此任务'), { statusCode: 403 });
    }
    if (post.status !== 'pending' && post.status !== 'scheduled') {
      throw Object.assign(new Error('任务状态不可执行'), { statusCode: 400 });
    }

    // 实际项目中应调用微信 API 发布图文
    const startTime = Date.now();
    try {
      const mediaId = 'mock_media_' + Date.now();
      const durationMs = Date.now() - startTime;
      await ScheduledPostRepo.update(id, {
        status: 'published',
        wechat_media_id: mediaId,
      });
      await ScheduledPostLogService.create({
        post_id: id,
        status: 'published',
        wechat_response: { media_id: mediaId },
        duration_ms: durationMs,
      });
      return ScheduledPostRepo.findById(id);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await ScheduledPostRepo.update(id, {
        status: 'failed',
        error_msg: err.message,
      });
      await ScheduledPostLogService.create({
        post_id: id,
        status: 'failed',
        duration_ms: durationMs,
        error_message: err.message,
      });
      throw Object.assign(new Error('发布失败: ' + err.message), { statusCode: 500 });
    }
  },

  /**
   * checkAndPublish — 供 cron 定时调用
   * 查找所有到期且 pending/scheduled 的任务并逐一执行
   */
  async checkAndPublish() {
    const duePosts = await ScheduledPostRepo.findScheduledDue();
    const results = { success: 0, failed: 0, errors: [] };

    for (const post of duePosts) {
      const startTime = Date.now();
      try {
        // 实际项目中应通过 account 的 token 调用微信 API
        const mediaId = 'cron_media_' + Date.now();
        const durationMs = Date.now() - startTime;
        await ScheduledPostRepo.update(post.id, {
          status: 'published',
          wechat_media_id: mediaId,
        });
        await ScheduledPostLogService.create({
          post_id: post.id,
          status: 'published',
          wechat_response: { media_id: mediaId },
          duration_ms: durationMs,
        });
        results.success++;
      } catch (err) {
        const durationMs = Date.now() - startTime;
        await ScheduledPostRepo.update(post.id, {
          status: 'failed',
          error_msg: err.message,
        });
        await ScheduledPostLogService.create({
          post_id: post.id,
          status: 'failed',
          duration_ms: durationMs,
          error_message: err.message,
        });
        results.failed++;
        results.errors.push({ id: post.id, error: err.message });
      }
    }

    return results;
  },

  /**
   * Get execution logs for a scheduled post
   */
  async getLogs(user, postId, query = {}) {
    const post = await ScheduledPostRepo.findById(postId);
    if (!post) {
      throw Object.assign(new Error('定时任务不存在'), { statusCode: 404 });
    }
    if (post.user_id !== user.id && user.role !== 'admin') {
      throw Object.assign(new Error('无权查看此任务日志'), { statusCode: 403 });
    }
    return ScheduledPostLogService.listByPostId(postId, query);
  },
};

module.exports = ScheduledPostService;
