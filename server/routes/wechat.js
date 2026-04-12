const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const axios = require('axios');

// 存储登录状态（生产环境应使用 Redis）
const sessions = new Map();

/**
 * 启动浏览器登录微信公众号
 * 类似秀米的实现方式
 */
router.post('/login', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: false, // 显示浏览器窗口，让用户手动登录
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    
    // 访问微信公众号登录页
    await page.goto('https://mp.weixin.qq.com/', {
      waitUntil: 'networkidle2'
    });

    // 等待用户登录成功
    await page.waitForSelector('.weui-desktop-layout__main', { 
      timeout: 300000 // 5分钟超时
    });

    // 获取 cookies
    const cookies = await page.cookies();
    const sessionId = Date.now().toString();
    
    // 保存会话
    sessions.set(sessionId, {
      browser,
      page,
      cookies,
      loginTime: new Date()
    });

    res.json({
      success: true,
      sessionId,
      message: '登录成功'
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败: ' + error.message
    });
  }
});

/**
 * 获取公众号列表
 */
router.get('/accounts', async (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      message: '未登录或会话已过期'
    });
  }

  try {
    const { page } = session;
    
    // 获取公众号信息
    const accountInfo = await page.evaluate(() => {
      const nameEl = document.querySelector('.weui-desktop-account__nickname');
      const avatarEl = document.querySelector('.weui-desktop-account__img');
      return {
        name: nameEl ? nameEl.textContent : '',
        avatar: avatarEl ? avatarEl.src : ''
      };
    });

    res.json({
      success: true,
      data: [accountInfo]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 检查登录状态
 */
router.get('/check-login', async (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  
  res.json({
    isLoggedIn: !!session,
    loginTime: session ? session.loginTime : null
  });
});

/**
 * 登出
 */
router.post('/logout', async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  
  if (session && session.browser) {
    await session.browser.close();
  }
  
  sessions.delete(sessionId);
  
  res.json({
    success: true,
    message: '已退出登录'
  });
});

module.exports = router;
module.exports.sessions = sessions;
