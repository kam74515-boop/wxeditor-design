// 辅助函数

/**
 * 格式化日期路径
 */
function formatDatePath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 生成随机字符串
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 微信公众号 HTML 白名单配置（增强版）
 */
const WECHAT_HTML_WHITELIST = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'section',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code',
    'div', 'font', 'center', 'sub', 'sup',
    'ruby', 'rb', 'rt', 'rp'
  ],
  
  allowedAttributes: {
    '*': ['style', 'class', 'id', 'data-ratio', 'data-w', 'data-type', 'data-src'],
    'a': ['href', 'target', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'data-ratio', 'data-w', 'data-type'],
    'table': ['border', 'cellpadding', 'cellspacing', 'width', 'align'],
    'td': ['colspan', 'rowspan', 'width', 'align', 'valign'],
    'th': ['colspan', 'rowspan', 'width', 'align', 'valign'],
    'font': ['color', 'size', 'face'],
    'ruby': ['xmlns'],
    'rb': ['xmlns'],
    'rt': ['xmlns'],
    'rp': ['xmlns']
  },
  
  allowedStyles: {
    '*': {
      'color': [/^#|rgb|rgba/, /^inherit$/],
      'background-color': [/^#|rgb|rgba/, /^transparent$/, /^inherit$/],
      'background': [/.*/],
      'font-size': [/^\d+(px|pt|em|%)?$/],
      'font-weight': [/^\d+$|bold|normal/i],
      'font-style': [/^(italic|normal)$/i],
      'font-family': [/.*/],
      'text-align': [/^(left|right|center|justify)$/i],
      'text-decoration': [/^(underline|line-through|none)$/i],
      'line-height': [/^[\d.]+(px|em|%)?$/],
      'letter-spacing': [/^[\d.]+(px|em)$/],
      'margin': [/.*/],
      'margin-top': [/^[\d.]+(px|em|%)$/],
      'margin-bottom': [/^[\d.]+(px|em|%)$/],
      'margin-left': [/^[\d.]+(px|em|%)$/],
      'margin-right': [/^[\d.]+(px|em|%)$/],
      'padding': [/.*/],
      'padding-top': [/^[\d.]+(px|em|%)$/],
      'padding-bottom': [/^[\d.]+(px|em|%)$/],
      'padding-left': [/^[\d.]+(px|em|%)$/],
      'padding-right': [/^[\d.]+(px|em|%)$/],
      'border': [/.*/],
      'border-width': [/.*/],
      'border-style': [/^(none|solid|dashed|dotted)$/i],
      'border-color': [/^#|rgb|rgba/],
      'border-radius': [/^[\d.]+(px|%)?$/],
      'border-collapse': [/^collapse$/],
      'width': [/.*/],
      'height': [/.*/],
      'max-width': [/.*/],
      'min-width': [/.*/],
      'max-height': [/.*/],
      'min-height': [/.*/],
      'vertical-align': [/^(top|middle|bottom|baseline)$/i],
      'white-space': [/^(normal|nowrap|pre|pre-wrap)$/i],
      'word-wrap': [/^(normal|break-word)$/i],
      'word-break': [/^(normal|break-all|keep-all)$/i],
      'text-indent': [/^[\d.]+(px|em|%)$/],
      'opacity': [/^[\d.]+$/],
      'box-shadow': [/.*/],
      'display': [/^(block|inline|inline-block|none|table|table-cell)$/i],
      'overflow': [/^(visible|hidden|scroll|auto)$/i],
      'visibility': [/^(visible|hidden|collapse)$/i],
      'float': [/^(left|right|none)$/i],
      'clear': [/^(left|right|both|none)$/i],
      'position': [/^(static|relative|absolute|fixed)$/i],
      'list-style': [/.*/],
      'list-style-type': [/.*/],
      'list-style-position': [/.*/]
    }
  },
  
  transformTags: {
    'div': 'section'
  },
  
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed', 'applet'],
  
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  
  allowedSchemesAppliedToAttributes: ['href', 'src']
};

/**
 * 验证 HTML 是否符合微信规范
 */
function validateWechatHtml(html) {
  const issues = [];
  let stats = { images: 0, links: 0, paragraphs: 0, sections: 0 };

  if (!html || typeof html !== 'string') {
    return { valid: false, issues: ['无效的 HTML 内容'], stats };
  }

  const classMatches = html.match(/\sclass\s*=\s*["'][^"']+["']/gi);
  if (classMatches && classMatches.length > 0) {
    issues.push(`发现 ${classMatches.length} 个 class 属性（微信不支持外部样式）`);
  }

  const styleTagMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi);
  if (styleTagMatches && styleTagMatches.length > 0) {
    issues.push(`发现 ${styleTagMatches.length} 个 <style> 标签`);
  }

  const linkTagMatches = html.match(/<link[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi);
  if (linkTagMatches && linkTagMatches.length > 0) {
    issues.push(`发现 ${linkTagMatches.length} 个外部样式表链接`);
  }

  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  stats.images = imgMatches.length;

  imgMatches.forEach((img, index) => {
    if (!img.includes('data-ratio')) {
      issues.push(`图片 ${index + 1} 缺少 data-ratio 属性`);
    }
  });

  stats.links = (html.match(/<a[^>]*>/gi) || []).length;
  stats.paragraphs = (html.match(/<p[^>]*>/gi) || []).length;
  stats.sections = (html.match(/<section[^>]*>/gi) || []).length;

  const unsupportedTags = ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'form', 'input', 'button', 'select', 'textarea'];
  unsupportedTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      issues.push(`发现 ${matches.length} 个不支持的 <${tag}> 标签`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    stats
  };
}

/**
 * 深度复制对象
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 延迟执行
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的 JSON 解析
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * 截断文本
 */
function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 生成唯一 ID
 */
function generateUniqueId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * 检查是否为有效的微信文章 URL
 */
function isValidWechatUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.endsWith('.qq.com') || 
           urlObj.hostname.endsWith('.weixin.qq.com') ||
           urlObj.hostname === 'mp.weixin.qq.com';
  } catch {
    return false;
  }
}

/**
 * 提取文章纯文本内容
 */
function extractPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 计算阅读时间（分钟）
 */
function calculateReadingTime(text, wordsPerMinute = 300) {
  if (!text) return 0;
  const wordCount = text.length;
  return Math.ceil(wordCount / wordsPerMinute);
}

module.exports = {
  formatDatePath,
  generateRandomString,
  WECHAT_HTML_WHITELIST,
  validateWechatHtml,
  deepClone,
  delay,
  safeJsonParse,
  truncateText,
  generateUniqueId,
  isValidWechatUrl,
  extractPlainText,
  calculateReadingTime
};
