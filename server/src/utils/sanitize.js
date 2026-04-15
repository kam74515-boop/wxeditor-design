/**
 * sanitizeContent - 清理用户提交的 HTML 内容，移除危险标签和属性
 * 防止 XSS 攻击：剥离 <script>, <iframe>, <object>, <embed>, <form> 等标签，
 * 移除所有 on* 事件属性和 javascript: 协议链接
 */
function sanitizeContent(html) {
  if (typeof html !== 'string') return html;
  if (!html) return html;

  // 移除危险标签及其内容
  let clean = html.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  clean = clean.replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, '');
  clean = clean.replace(/<object[\s\S]*?<\/object\s*>/gi, '');
  clean = clean.replace(/<embed[\s\S]*?>/gi, '');
  clean = clean.replace(/<form[\s\S]*?<\/form\s*>/gi, '');
  clean = clean.replace(/<applet[\s\S]*?<\/applet\s*>/gi, '');
  clean = clean.replace(/<meta[\s\S]*?>/gi, '');
  clean = clean.replace(/<link[\s\S]*?>/gi, '');
  clean = clean.replace(/<base[\s\S]*?>/gi, '');

  // 移除所有 on* 事件属性 (onclick, onload, onerror 等)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 移除 javascript: / vbscript: / data: 协议的 href/src
  clean = clean.replace(/(href|src|action)\s*=\s*["']?\s*(javascript|vbscript|data)\s*:/gi, '$1="about:blank"');

  // 移除 style 中的 expression/url/import
  clean = clean.replace(/style\s*=\s*["'][^"']*(?:expression|url\s*\(|@import)[^"']*["']/gi, 'style=""');

  return clean;
}

module.exports = { sanitizeContent };
