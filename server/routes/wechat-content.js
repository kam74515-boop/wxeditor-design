const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');
const { 
  WECHAT_HTML_WHITELIST,
  validateWechatHtml 
} = require('../utils/helpers');
const { 
  quickWechatConvert,
  InlineStyleConverter 
} = require('../utils/styleConverter');

/**
 * 微信内容预览和转换 API
 */

router.post('/preview', (req, res) => {
  const { content, options = {} } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: '内容不能为空'
    });
  }

  try {
    const converter = new InlineStyleConverter();
    const converted = converter.convertForWechat(content, {
      convertStyles: options.convertStyles !== false,
      optimizeImages: options.optimizeImages !== false,
      removeUnsupported: options.removeUnsupported !== false,
      convertUnits: options.convertUnits !== false,
      baseFontSize: options.baseFontSize || 16
    });

    const validation = validateWechatHtml(converted);

    res.json({
      success: true,
      data: {
        original: content,
        converted: converted,
        validation: validation,
        stats: validation.stats
      }
    });
  } catch (error) {
    console.error('预览转换失败:', error);
    res.status(500).json({
      success: false,
      message: '转换失败: ' + error.message
    });
  }
});

router.post('/validate', (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: '内容不能为空'
    });
  }

  try {
    const validation = validateWechatHtml(content);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败: ' + error.message
    });
  }
});

router.post('/sanitize', (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: '内容不能为空'
    });
  }

  try {
    const sanitized = sanitizeHtml(content, WECHAT_HTML_WHITELIST);
    
    res.json({
      success: true,
      data: {
        original: content,
        sanitized: sanitized
      }
    });
  } catch (error) {
    console.error('清理失败:', error);
    res.status(500).json({
      success: false,
      message: '清理失败: ' + error.message
    });
  }
});

router.get('/whitelist', (req, res) => {
  res.json({
    success: true,
    data: {
      tags: WECHAT_HTML_WHITELIST.allowedTags,
      attributes: Object.keys(WECHAT_HTML_WHITELIST.allowedAttributes),
      styles: Object.keys(WECHAT_HTML_WHITELIST.allowedStyles || {})
    }
  });
});

router.post('/quick-convert', (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({
      success: false,
      message: '内容不能为空'
    });
  }

  try {
    const converted = quickWechatConvert(content);
    
    res.json({
      success: true,
      data: {
        converted: converted
      }
    });
  } catch (error) {
    console.error('快速转换失败:', error);
    res.status(500).json({
      success: false,
      message: '转换失败: ' + error.message
    });
  }
});

module.exports = router;
