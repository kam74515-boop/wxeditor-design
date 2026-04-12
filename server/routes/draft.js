const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { WECHAT_HTML_WHITELIST } = require('../utils/helpers');
const { sessions } = require('./wechat');
const axios = require('axios');

/**
 * 过滤 HTML，只保留微信支持的标签和样式
 */
function filterWechatHtml(html) {
  return sanitizeHtml(html, WECHAT_HTML_WHITELIST);
}

/**
 * 将 CSS 样式内联化
 * 微信公众号只支持内联样式
 */
function inlineStyles(html) {
  // 这里可以添加更复杂的样式内联逻辑
  // 目前 sanitize-html 已经处理了大部分样式
  return html;
}

/**
 * 处理图片上传至微信服务器
 * 微信公众号需要先将图片上传到微信素材库
 */
async function uploadImagesToWechat(html, page) {
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  const matches = [...html.matchAll(imgRegex)];
  
  const uploadedImages = new Map();
  
  for (const match of matches) {
    const src = match[1];
    if (src.startsWith('http') || src.startsWith('//')) {
      try {
        // 上传图片到微信素材库
        const result = await page.evaluate(async (imageUrl) => {
          // 这里调用微信网页端的图片上传接口
          // 实际实现需要根据微信网页版的 API 调整
          const response = await fetch('/cgi-bin/filetransfer?action=preview', {
            method: 'POST',
            body: JSON.stringify({ url: imageUrl })
          });
          return response.json();
        }, src);
        
        if (result && result.url) {
          uploadedImages.set(src, result.url);
        }
      } catch (error) {
        console.error('上传图片失败:', error);
      }
    }
  }
  
  // 替换 HTML 中的图片地址
  let processedHtml = html;
  uploadedImages.forEach((newUrl, oldUrl) => {
    processedHtml = processedHtml.replace(oldUrl, newUrl);
  });
  
  return processedHtml;
}

/**
 * 上传草稿到微信公众号
 */
router.post('/upload', async (req, res) => {
  const { 
    sessionId, 
    title, 
    content, 
    author = '',
    digest = '',
    coverImage = '',
    contentSourceUrl = '',
    showCoverPic = 1,
    needOpenComment = 0,
    onlyFansCanComment = 0
  } = req.body;

  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      message: '未登录或会话已过期'
    });
  }

  try {
    // 1. 过滤 HTML
    let filteredContent = filterWechatHtml(content);
    filteredContent = inlineStyles(filteredContent);

    // 2. 处理图片上传
    const { page } = session;
    filteredContent = await uploadImagesToWechat(filteredContent, page);

    // 3. 准备文章数据
    const articleData = {
      title: title,
      content: filteredContent,
      author: author,
      digest: digest || title,
      content_source_url: contentSourceUrl,
      thumb_media_id: coverImage, // 封面图片的 media_id
      show_cover_pic: showCoverPic,
      need_open_comment: needOpenComment,
      only_fans_can_comment: onlyFansCanComment
    };

    // 4. 调用微信接口创建草稿
    // 注意：这里使用微信网页版的接口，实际需要根据微信官方 API 调整
    const result = await page.evaluate(async (data) => {
      // 调用微信公众号网页版的草稿保存接口
      const response = await fetch('/cgi-bin/newoperatepage?action=draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articles: [{
            title: data.title,
            content: data.content,
            author: data.author,
            digest: data.digest,
            content_source_url: data.content_source_url,
            thumb_media_id: data.thumb_media_id,
            show_cover_pic: data.show_cover_pic,
            need_open_comment: data.need_open_comment,
            only_fans_can_comment: data.only_fans_can_comment
          }]
        })
      });
      return response.json();
    }, articleData);

    if (result.base_resp && result.base_resp.ret === 0) {
      res.json({
        success: true,
        message: '草稿保存成功',
        data: {
          draftId: result.draft_id,
          mediaId: result.media_id,
          createTime: new Date().toISOString()
        }
      });
    } else {
      throw new Error(result.base_resp ? result.base_resp.err_msg : '保存失败');
    }

  } catch (error) {
    console.error('上传草稿失败:', error);
    res.status(500).json({
      success: false,
      message: '上传草稿失败: ' + error.message
    });
  }
});

/**
 * 预览草稿
 */
router.post('/preview', async (req, res) => {
  const { sessionId, content } = req.body;
  
  try {
    // 过滤并处理内容
    let filteredContent = filterWechatHtml(content);
    filteredContent = inlineStyles(filteredContent);
    
    res.json({
      success: true,
      content: filteredContent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取草稿列表
 */
router.get('/list', async (req, res) => {
  const { sessionId, offset = 0, count = 20 } = req.query;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      message: '未登录或会话已过期'
    });
  }

  try {
    const { page } = session;
    
    const result = await page.evaluate(async (params) => {
      const response = await fetch(`/cgi-bin/newoperatepage?action=list&offset=${params.offset}&count=${params.count}`, {
        method: 'GET'
      });
      return response.json();
    }, { offset, count });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
module.exports.filterWechatHtml = filterWechatHtml;
module.exports.inlineStyles = inlineStyles;
