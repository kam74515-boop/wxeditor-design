const WechatAccountRepo = require('../repositories/wechatAccount.repo');

/**
 * Middleware: verify that the wechat account specified by :accountId
 * belongs to the currently authenticated user (or the user is admin).
 *
 * Sets req.wechatAccount = { id, app_id, app_secret, ... }
 */
async function wechatAuth(req, res, next) {
  const accountId = req.params.accountId || req.query.accountId;
  if (!accountId) {
    return res.status(400).json({ success: false, message: '缺少公众号 ID (accountId)' });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  try {
    const account = await WechatAccountRepo.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: '公众号不存在' });
    }

    if (account.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '无权操作此公众号' });
    }

    if (!account.verified) {
      return res.status(400).json({ success: false, message: '公众号尚未验证，请先完成验证' });
    }

    req.wechatAccount = account;
    next();
  } catch (err) {
    console.error('wechat-auth middleware error:', err);
    res.status(500).json({ success: false, message: '公众号验证失败' });
  }
}

module.exports = { wechatAuth };
