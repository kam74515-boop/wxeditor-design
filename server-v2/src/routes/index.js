module.exports = function registerRoutes(app) {
  app.use('/api/auth', require('../controllers/auth.ctrl'));
  app.use('/api/collab', require('../controllers/collab.ctrl'));
  app.use('/api/ai', require('../controllers/ai.ctrl'));
  app.use('/api/content', require('../controllers/content.ctrl'));
  app.use('/api/templates', require('../controllers/template.ctrl'));
  app.use('/api/materials', require('../controllers/material.ctrl'));
  app.use('/api/membership', require('../controllers/membership.ctrl'));
  app.use('/api/admin', require('../controllers/admin.ctrl'));
  app.use('/api/admin/ai-configs', require('../controllers/aiConfig.ctrl'));
  app.use('/api', require('../controllers/team.ctrl'));
  app.use('/api/wechat', require('../controllers/wechat.ctrl'));
  app.use('/api/drafts', require('../controllers/draft.ctrl'));
  app.use('/api/ueditor', require('../controllers/ueditor.ctrl'));
};
