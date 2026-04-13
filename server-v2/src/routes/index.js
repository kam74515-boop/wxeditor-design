const { auth } = require('../middleware/auth');

module.exports = function registerRoutes(app) {
  // 公开路由（无需认证）
  app.use('/api/auth', require('../controllers/auth.ctrl'));
  app.use('/api/content', require('../controllers/content.ctrl'));
  app.use('/api/templates', require('../controllers/template.ctrl'));
  // 微信公众号 API 代理（wechat.ctrl 内部自行做 auth + wechatAuth）
  app.use('/api/wechat', require('../controllers/wechat.ctrl'));
  app.use('/api/drafts', require('../controllers/draft.ctrl'));

  // 受保护路由（需要登录）—— 在路由层做 defense-in-depth
  app.use('/api/collab', require('../controllers/collab.ctrl'));
  app.use('/api', require('../controllers/team.ctrl'));

  // AI 相关路由 —— 强制认证，即使 controller 内部遗漏
  app.use('/api/ai', auth, require('../controllers/ai.ctrl'));
  app.use('/api/ai-agent', auth, require('../controllers/aiAgent.ctrl'));

  // 素材管理路由
  app.use('/api/materials', require('../controllers/material.ctrl'));

  // 会员与支付路由
  app.use('/api/membership', require('../controllers/membership.ctrl'));

  // 管理后台路由
  app.use('/api/admin', require('../controllers/admin.ctrl'));
  app.use('/api/admin/ai-configs', require('../controllers/aiConfig.ctrl'));

  // UEditor 上传（无认证 —— 需前端配合鉴权）
  app.use('/api/ueditor', require('../controllers/ueditor.ctrl'));

  // 多公众号管理
  app.use('/api/wechat-accounts', auth, require('../controllers/wechatAccount.ctrl'));

  // 定时发布
  app.use('/api/scheduled-posts', auth, require('../controllers/scheduledPost.ctrl'));

  // 评论批注
  app.use('/api/comments', require('../controllers/comment.ctrl'));

  // 图文消息多篇文章
  app.use('/api/article-batches', auth, require('../controllers/articleBatch.ctrl'));
};
