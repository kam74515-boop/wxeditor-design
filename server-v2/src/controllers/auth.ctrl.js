const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const AuthService = require('../services/auth.service');
const WechatOAuthService = require('../services/wechatOAuth.service');

const router = express.Router();

router.post('/register', [
  body('username').trim().isLength({ min: 2, max: 32 }).withMessage('用户名 2-32 字符'),
  body('email').isEmail().normalizeEmail().withMessage('邮箱格式不正确'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('密码 6-128 字符'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/login', [
  body('username').trim().notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const result = await AuthService.login(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: '已退出登录' });
});

router.get('/me', auth, async (req, res) => {
  try {
    const profile = await AuthService.getProfile(req.userId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const user = await AuthService.updateProfile(req.userId, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/change-password', auth, [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 128 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    await AuthService.changePassword(req.userId, req.body);
    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// ========== WeChat OAuth Routes ==========

/**
 * GET /api/auth/wechat/url
 * Generate WeChat OAuth authorization URL with state for CSRF protection.
 * Frontend redirects the user to this URL to show the QR code login page.
 */
router.get('/wechat/url', (req, res) => {
  try {
    const state = WechatOAuthService.generateState();
    const url = WechatOAuthService.getAuthUrl(state);
    res.json({ success: true, data: { url, state } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || '生成微信授权链接失败' });
  }
});

/**
 * GET /api/auth/wechat/callback
 * Handle WeChat OAuth callback: exchange code for token, find/create user, return JWT.
 * Query params: code, state
 */
router.get('/wechat/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ success: false, message: '缺少授权码' });
  }

  try {
    const result = await WechatOAuthService.handleCallback(code);
    // Return JWT tokens so the frontend callback page can store them
    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        isNew: result.isNew,
      },
    });
  } catch (err) {
    console.error('WeChat OAuth callback error:', err.message);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || '微信登录失败，请重试',
    });
  }
});

module.exports = router;
