const ScheduledPostLogRepo = require('../repositories/scheduledPostLog.repo');

const ScheduledPostLogService = {
  /**
   * List logs for a specific scheduled post
   */
  async listByPostId(postId, query = {}) {
    const { page = 1, limit = 20 } = query;
    return ScheduledPostLogRepo.listByPostId(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  },

  /**
   * Create a log entry
   */
  async create(data) {
    const { post_id, status, wechat_response, duration_ms, error_message } = data;
    if (!post_id || !status) {
      throw Object.assign(new Error('post_id 和 status 不能为空'), { statusCode: 400 });
    }
    return ScheduledPostLogRepo.create({
      post_id,
      status,
      wechat_response: wechat_response ? JSON.stringify(wechat_response) : null,
      duration_ms: duration_ms || null,
      error_message: error_message || null,
    });
  },

  /**
   * Delete all logs for a post
   */
  async deleteByPostId(postId) {
    return ScheduledPostLogRepo.deleteByPostId(postId);
  },
};

module.exports = ScheduledPostLogService;
