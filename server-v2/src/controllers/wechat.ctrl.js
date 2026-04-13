const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { wechatAuth } = require('../middleware/wechat-auth');
const WechatProxyService = require('../services/wechatProxy.service');

// All proxy routes require auth + wechat account ownership verification
router.use(auth);

/**
 * GET /api/wechat/proxy/token?accountId=xxx
 * Get (cached) access_token for a verified wechat account
 */
router.get('/proxy/token', async (req, res) => {
  const accountId = req.query.accountId;
  if (!accountId) {
    return res.status(400).json({ success: false, message: '缺少 accountId' });
  }

  try {
    // Verify ownership via middleware logic (inline here for single-route case)
    const WechatAccountRepo = require('../repositories/wechatAccount.repo');
    const account = await WechatAccountRepo.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: '公众号不存在' });
    }
    if (account.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权操作此公众号' });
    }
    if (!account.verified) {
      return res.status(400).json({ success: false, message: '公众号尚未验证' });
    }

    const token = await WechatProxyService.getAccessToken(account.app_id, account.app_secret);
    res.json({ success: true, data: { access_token: token } });
  } catch (err) {
    console.error('proxy/token error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// All /proxy/:accountId/* routes use the wechatAuth middleware
router.use('/proxy/:accountId', wechatAuth);

/**
 * GET /api/wechat/proxy/:accountId/menu
 * Get current custom menu
 */
router.get('/proxy/:accountId/menu', async (req, res) => {
  try {
    const { app_id, app_secret } = req.wechatAccount;
    const accessToken = await WechatProxyService.getAccessToken(app_id, app_secret);
    const data = await WechatProxyService.getMenu(accessToken);
    res.json({ success: true, data });
  } catch (err) {
    console.error('proxy/menu GET error:', err.message);
    // If token expired, clear cache and let caller retry
    if (err.code === 40001 || err.code === 42001) {
      WechatProxyService.clearTokenCache(req.wechatAccount.app_id);
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/wechat/proxy/:accountId/menu
 * Create / update custom menu
 * Body: { menu: { button: [...] } }
 */
router.post('/proxy/:accountId/menu', async (req, res) => {
  try {
    const { app_id, app_secret } = req.wechatAccount;
    const menuData = req.body;

    if (!menuData || !menuData.button) {
      return res.status(400).json({ success: false, message: '菜单数据格式不正确，需要 button 字段' });
    }

    const accessToken = await WechatProxyService.getAccessToken(app_id, app_secret);
    const data = await WechatProxyService.createMenu(accessToken, menuData);
    res.json({ success: true, data });
  } catch (err) {
    console.error('proxy/menu POST error:', err.message);
    if (err.code === 40001 || err.code === 42001) {
      WechatProxyService.clearTokenCache(req.wechatAccount.app_id);
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/wechat/proxy/:accountId/materials?type=news&offset=0&count=20
 * Get material list
 */
router.get('/proxy/:accountId/materials', async (req, res) => {
  try {
    const { app_id, app_secret } = req.wechatAccount;
    const type = req.query.type || 'news';
    const offset = parseInt(req.query.offset, 10) || 0;
    const count = Math.min(parseInt(req.query.count, 10) || 20, 20);

    const accessToken = await WechatProxyService.getAccessToken(app_id, app_secret);
    const data = await WechatProxyService.getMaterials(accessToken, type, offset, count);
    res.json({ success: true, data });
  } catch (err) {
    console.error('proxy/materials error:', err.message);
    if (err.code === 40001 || err.code === 42001) {
      WechatProxyService.clearTokenCache(req.wechatAccount.app_id);
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/wechat/proxy/:accountId/draft
 * Create a new draft
 * Body: { articles: [{ title, content, thumb_media_id, ... }] }
 */
router.post('/proxy/:accountId/draft', async (req, res) => {
  try {
    const { app_id, app_secret } = req.wechatAccount;
    const { articles } = req.body;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ success: false, message: 'articles 不能为空数组' });
    }

    const accessToken = await WechatProxyService.getAccessToken(app_id, app_secret);
    const data = await WechatProxyService.addDraft(accessToken, articles);
    res.json({ success: true, data });
  } catch (err) {
    console.error('proxy/draft error:', err.message);
    if (err.code === 40001 || err.code === 42001) {
      WechatProxyService.clearTokenCache(req.wechatAccount.app_id);
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/wechat/proxy/:accountId/publish
 * Publish a draft
 * Body: { media_id: "..." }
 */
router.post('/proxy/:accountId/publish', async (req, res) => {
  try {
    const { app_id, app_secret } = req.wechatAccount;
    const { media_id } = req.body;

    if (!media_id) {
      return res.status(400).json({ success: false, message: '缺少 media_id' });
    }

    const accessToken = await WechatProxyService.getAccessToken(app_id, app_secret);
    const data = await WechatProxyService.publish(accessToken, media_id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('proxy/publish error:', err.message);
    if (err.code === 40001 || err.code === 42001) {
      WechatProxyService.clearTokenCache(req.wechatAccount.app_id);
    }
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

module.exports = router;
