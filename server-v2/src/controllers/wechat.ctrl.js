const express = require('express');
const router = express.Router();

const sessions = new Map();

router.post('/login', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.weui-desktop-layout__main', { timeout: 300000 });

    const cookies = await page.cookies();
    const sessionId = Date.now().toString();
    sessions.set(sessionId, { browser, page, cookies, loginTime: new Date() });

    res.json({ success: true, sessionId, message: '登录成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: '登录失败: ' + err.message });
  }
});

router.post('/logout', (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = sessions.get(sessionId);
    if (session) {
      session.browser?.close();
      sessions.delete(sessionId);
    }
    res.json({ success: true, message: '已退出登录' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/accounts', (req, res) => {
  try {
    const accounts = [];
    sessions.forEach((session, id) => {
      accounts.push({ id, loginTime: session.loginTime, status: 'active' });
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/check-login', (req, res) => {
  try {
    const { sessionId } = req.query;
    const session = sessions.get(sessionId);
    if (!session) return res.status(401).json({ success: false, message: '会话不存在' });
    res.json({ success: true, data: { status: 'active' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.sessions = sessions;
