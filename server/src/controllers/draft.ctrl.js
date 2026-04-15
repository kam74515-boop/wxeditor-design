const express = require('express');
const sanitizeHtml = require('sanitize-html');
const router = express.Router();
const { sessions } = require('./wechat.ctrl');

const WECHAT_WHITELIST = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'li',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'section', 'span', 'div'],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
    'span': ['style', 'class'],
    'div': ['style', 'class'],
    'section': ['style', 'class'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-f]+$/i, /^rgb\(.+\)$/],
      'text-align': [/^left$/, /^center$/, /^right$/],
      'font-size': [/^\d+px$/],
      'font-weight': [/^bold$/, /^\d+$/],
      'margin': [/^\d+px$/],
      'padding': [/^\d+px$/],
    },
  },
};

function filterWechatHtml(html) {
  return sanitizeHtml(html, WECHAT_WHITELIST);
}

router.post('/upload', async (req, res) => {
  const { sessionId, title, content, author = '', digest = '', coverImage = '', contentSourceUrl = '', showCoverPic = 1, needOpenComment = 0, onlyFansCanComment = 0 } = req.body;
  const session = sessions.get(sessionId);

  if (!session) return res.status(401).json({ success: false, message: '未登录或会话已过期' });

  try {
    const filteredContent = filterWechatHtml(content);
    const { page } = session;

    const result = await page.evaluate(async (data) => {
      const response = await fetch('/cgi-bin/newoperatepage?action=draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: [{
            title: data.title, content: data.content, author: data.author,
            digest: data.digest || data.title, content_source_url: data.contentSourceUrl,
            thumb_media_id: data.coverImage, show_cover_pic: data.showCoverPic,
            need_open_comment: data.needOpenComment, only_fans_can_comment: data.onlyFansCanComment,
          }],
        }),
      });
      return response.json();
    }, { title, content: filteredContent, author, digest, contentSourceUrl, coverImage, showCoverPic, needOpenComment, onlyFansCanComment });

    if (result.base_resp && result.base_resp.ret === 0) {
      res.json({ success: true, message: '草稿保存成功', data: { draftId: result.draft_id, mediaId: result.media_id, createTime: new Date().toISOString() } });
    } else {
      throw new Error(result.base_resp ? result.base_resp.err_msg : '保存失败');
    }
  } catch (err) {
    res.status(500).json({ success: false, message: '上传草稿失败: ' + err.message });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const filteredContent = filterWechatHtml(req.body.content);
    res.json({ success: true, content: filteredContent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/list', async (req, res) => {
  const { sessionId, offset = 0, count = 20 } = req.query;
  const session = sessions.get(sessionId);

  if (!session) return res.status(401).json({ success: false, message: '未登录或会话已过期' });

  try {
    const { page } = session;
    const result = await page.evaluate(async (params) => {
      const response = await fetch(`/cgi-bin/newoperatepage?action=list&offset=${params.offset}&count=${params.count}`);
      return response.json();
    }, { offset, count });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
