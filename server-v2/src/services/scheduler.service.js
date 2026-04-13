const ScheduledPostRepo = require('../repositories/scheduledPost.repo');
const ScheduledPostLogService = require('./scheduledPostLog.service');

/**
 * Scheduler Service
 *
 * Periodically checks scheduled_posts for due tasks and publishes them.
 * Uses setInterval (every 60s by default) — no external cron dependency required.
 */

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute

let timer = null;
let running = false;

const SchedulerService = {
  /**
   * Start the scheduler. Idempotent — calling multiple times is safe.
   */
  start() {
    if (timer) {
      console.log('[Scheduler] Already running, skipping.');
      return;
    }
    console.log('[Scheduler] Starting — checking every 60s for due posts.');
    // Run first check immediately, then every minute
    this._tick();
    timer = setInterval(() => this._tick(), CHECK_INTERVAL_MS);
  },

  /**
   * Stop the scheduler.
   */
  stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      console.log('[Scheduler] Stopped.');
    }
  },

  /**
   * Check if scheduler is active
   */
  isRunning() {
    return timer !== null;
  },

  /**
   * Single tick — find due posts and process them.
   */
  async _tick() {
    if (running) {
      console.log('[Scheduler] Previous tick still running, skipping.');
      return;
    }
    running = true;

    try {
      const duePosts = await ScheduledPostRepo.findScheduledDue();
      if (duePosts.length === 0) return;

      console.log(`[Scheduler] Found ${duePosts.length} due post(s).`);

      for (const post of duePosts) {
        await this._processPost(post);
      }
    } catch (err) {
      console.error('[Scheduler] Tick error:', err.message);
    } finally {
      running = false;
    }
  },

  /**
   * Process a single due post.
   *
   * Flow:
   *  1. Mark status -> 'publishing'
   *  2. Call WeChat API to publish
   *  3. Mark status -> 'published' (or 'failed')
   *  4. If repeat_type !== 'once', compute next publish_at and reset to 'scheduled'
   *  5. Log the execution
   */
  async _processPost(post) {
    const startTime = Date.now();

    // Step 1: Mark as publishing
    await ScheduledPostRepo.update(post.id, { status: 'publishing' });

    try {
      // Step 2: Call WeChat API (placeholder — replace with real API call)
      const wechatResult = await this._callWechatPublish(post);

      const durationMs = Date.now() - startTime;

      // Step 3: Mark as published
      await ScheduledPostRepo.update(post.id, {
        status: 'published',
        wechat_media_id: wechatResult.media_id,
      });

      // Step 4: Handle repeat
      if (post.repeat_type && post.repeat_type !== 'once') {
        const nextPublishAt = this._computeNextPublishAt(post.publish_at, post.repeat_type);
        if (nextPublishAt) {
          await ScheduledPostRepo.update(post.id, {
            status: 'scheduled',
            publish_at: nextPublishAt,
          });
          console.log(`[Scheduler] Post ${post.id} rescheduled for ${nextPublishAt}`);
        }
      }

      // Step 5: Log success
      await ScheduledPostLogService.create({
        post_id: post.id,
        status: 'published',
        wechat_response: wechatResult,
        duration_ms: durationMs,
      });

      console.log(`[Scheduler] Post ${post.id} published successfully (${durationMs}ms).`);
    } catch (err) {
      const durationMs = Date.now() - startTime;

      // Mark as failed
      await ScheduledPostRepo.update(post.id, {
        status: 'failed',
        error_msg: err.message,
      });

      // Log failure
      await ScheduledPostLogService.create({
        post_id: post.id,
        status: 'failed',
        duration_ms: durationMs,
        error_message: err.message,
      });

      console.error(`[Scheduler] Post ${post.id} failed: ${err.message}`);
    }
  },

  /**
   * Placeholder for real WeChat API integration.
   * In production, this would:
   *   1. Look up the wechat_account by post.account_id
   *   2. Get a valid access_token
   *   3. Upload thumb_media if cover_image provided
   *   4. Call addNews / uploadNews to create the material
   *   5. Return the media_id
   */
  async _callWechatPublish(post) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // For now, return a mock media_id
    return {
      media_id: 'mock_media_' + Date.now(),
      item: [],
    };
  },

  /**
   * Compute the next publish time based on repeat type.
   * @param {string} currentPublishAt - ISO timestamp of current publish_at
   * @param {string} repeatType - 'daily' | 'weekly'
   * @returns {string|null} ISO timestamp or null if invalid
   */
  _computeNextPublishAt(currentPublishAt, repeatType) {
    const date = new Date(currentPublishAt);
    if (isNaN(date.getTime())) return null;

    switch (repeatType) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      default:
        return null;
    }

    return date.toISOString();
  },
};

module.exports = SchedulerService;
