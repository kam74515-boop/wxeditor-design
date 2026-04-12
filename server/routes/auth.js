const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, generateToken, generateRefreshToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度应在 3-20 个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少 6 个字符')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('密码必须包含字母和数字')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const { username, email, password, nickname } = req.body;

    const existingUser = await User.findOne({ username, email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.username === username ? '用户名已被注册' : '邮箱已被注册'
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      nickname: nickname || username
    });

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          membership: {
            type: user.membership.type,
            isActive: user.membership.isActive
          }
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '注册失败'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;
    const failMessage = '用户名或密码错误';

    const user = await User.findOne({ username, email: username });

    if (!user) {
      return res.status(401).json({ success: false, message: failMessage });
    }

    if (user.isLocked()) {
      return res.status(401).json({ success: false, message: failMessage });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({ success: false, message: failMessage });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: failMessage });
    }

    user.settings = user.settings || {};
    user.settings.loginAttempts = 0;
    user.settings.lockUntil = undefined;
    user.settings.lastLoginAt = new Date().toISOString();
    user.settings.lastLoginIp = req.ip;
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          membership: {
            type: user.membership.type,
            isActive: user.isMember,
            endDate: user.membership.endDate
          },
          limits: user.checkLimits()
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          membership: {
            type: user.membership.type,
            isActive: user.isMember,
            startDate: user.membership.startDate,
            endDate: user.membership.endDate,
            daysLeft: user.membershipDaysLeft
          },
          settings: user.settings,
          limits: user.checkLimits(),
          wechat: user.wechat ? {
            nickname: user.wechat.nickname,
            bound: true
          } : { bound: false }
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    更新用户资料
 * @access  Private
 */
router.put('/profile', auth, [
  body('nickname').optional().trim().isLength({ max: 20 }),
  body('bio').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { nickname, bio, avatar, phone } = req.body;
    const user = req.user;

    if (nickname !== undefined) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: {
          id: user._id,
          nickname: user.nickname,
          bio: user.bio,
          avatar: user.avatar,
          phone: user.phone
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', auth, [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功，请重新登录'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '密码修改失败'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    刷新 token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '缺少刷新令牌'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }

    const newToken = generateToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '刷新令牌已过期'
    });
  }
});

module.exports = router;
