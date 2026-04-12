import DOMPurify from 'dompurify';

/**
 * XSS 防护工具
 * 使用 DOMPurify 过滤用户输入的 HTML 内容
 */

// 允许的标签
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'del', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'img', 'span', 'div',
  'blockquote', 'pre', 'code',
  'figure', 'figcaption',
];

// 允许的属性
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id', 'style',
  'width', 'height', 'target', 'rel',
];

// 微信公众号允许的样式
const ALLOWED_STYLES = [
  'color', 'background-color', 'font-size', 'font-weight',
  'text-align', 'line-height', 'padding', 'margin',
  'border', 'border-left', 'border-right', 'border-top', 'border-bottom',
];

// 配置
const purifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_STYLES: ALLOWED_STYLES.map(s => new RegExp(`^${s}$`, 'i')),
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
};

/**
 * 净化 HTML，移除 XSS 恶意代码
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, purifyConfig);
}

/**
 * 净化用户输入的文本（纯文本）
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { FORBID_TAGS: ['script', 'style', 'iframe'] });
}

/**
 * 微信公众号 HTML 过滤
 * 微信对 HTML 有更严格的限制
 */
export function sanitizeForWechat(dirty: string): string {
  const wechatConfig: DOMPurify.Config = {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'img', 'span', 'div', 'blockquote', 'pre'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'style'],
    ALLOWED_STYLES: ['color', 'text-align', 'font-size'],
  };
  
  return DOMPurify.sanitize(dirty, wechatConfig);
}

/**
 * 验证 URL 是否安全
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 验证并清理 URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  if (isSafeUrl(url)) return url;
  // 如果不是安全 URL，返回空字符串
  return '';
}