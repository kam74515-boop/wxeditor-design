/**
 * 微信公众号HTML格式化工具
 * - 内联样式（inline style）
 * - section标签包裹
 * - 14-16px字号, 1.75行高
 */

const { sanitizeContent } = require('../utils/sanitize');

const DEFAULT_OPTIONS = {
  fontSize: 15,
  lineHeight: 1.75,
  color: '#333333',
  paragraphSpacing: '1em',
  headingColor: '#1a1a1a',
};

const TAG_STYLE_BUILDERS = {
  section: buildSectionStyle,
  article: buildSectionStyle,
  main: buildSectionStyle,
  header: buildSectionStyle,
  footer: buildSectionStyle,
  aside: buildSectionStyle,
  div: buildBlockStyle,
  p: buildParagraphStyle,
  h1: (opts) => buildHeadingStyle(opts, 8),
  h2: (opts) => buildHeadingStyle(opts, 4),
  h3: (opts) => buildHeadingStyle(opts, 2),
  h4: (opts) => buildHeadingStyle(opts, 1),
  h5: (opts) => buildHeadingStyle(opts, 0),
  h6: (opts) => buildHeadingStyle(opts, 0),
  ul: buildListStyle,
  ol: buildListStyle,
  li: buildListItemStyle,
  blockquote: buildBlockquoteStyle,
  hr: buildDividerStyle,
  strong: buildStrongStyle,
  b: buildStrongStyle,
  em: buildEmphasisStyle,
  i: buildEmphasisStyle,
  span: buildSpanStyle,
  a: buildLinkStyle,
  img: buildImageStyle,
  table: buildTableStyle,
  th: buildTableCellStyle,
  td: buildTableCellStyle,
};

/**
 * 将内容格式化为微信兼容HTML
 * @param {string} content - 原始内容（纯文本或简单HTML）
 * @param {object} options - 格式化选项
 * @returns {string} 微信兼容的HTML
 */
function formatForWechat(content, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 如果输入是纯文本，转换为HTML段落
  let html = content;

  // 处理已有的HTML标签，添加内联样式
  html = addInlineStyles(html, opts);

  // 用section标签包裹内容块
  html = wrapWithSections(html, opts);

  return html;
}

/**
 * 将 AI 生成的 HTML 收口到适合公众号正文的风格。
 * 仅用于 AI tool 输出，尽量保留结构，去掉海报卡片式装饰。
 */
function normalizeAgentHtml(content, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const wrapSections = options.wrapSections !== false;

  if (typeof content !== 'string') return content;

  let html = sanitizeContent(content).trim();
  if (!html) return '';

  html = stripDocumentShell(html);

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return wrapSections ? textToWechatHtml(html, opts) : textToWechatFragment(html, opts);
  }

  html = normalizeStructuralTags(html);
  html = rewriteInlineStyles(html, opts);
  html = removeEmptyDecorativeBlocks(html);
  html = addInlineStyles(html, opts);

  if (wrapSections) {
    html = wrapWithSections(html, opts);
  }

  return html.trim();
}

/**
 * 为HTML内容添加内联样式
 */
function addInlineStyles(html, opts) {
  const baseStyle = `font-size: ${opts.fontSize}px; line-height: ${opts.lineHeight}; color: ${opts.color};`;

  // 替换 <p> 标签，添加内联样式
  html = html.replace(/<p(?![^>]*style)/gi, `<p style="${baseStyle} margin-bottom: ${opts.paragraphSpacing}; text-align: left;"`);

  // 替换 <h1> 标签
  html = html.replace(/<h1(?![^>]*style)/gi,
    `<h1 style="font-size: ${opts.fontSize + 8}px; font-weight: bold; color: ${opts.headingColor}; line-height: ${opts.lineHeight}; margin-top: 1.5em; margin-bottom: 0.5em;"`);

  // 替换 <h2> 标签
  html = html.replace(/<h2(?![^>]*style)/gi,
    `<h2 style="font-size: ${opts.fontSize + 4}px; font-weight: bold; color: ${opts.headingColor}; line-height: ${opts.lineHeight}; margin-top: 1.2em; margin-bottom: 0.4em;"`);

  // 替换 <h3> 标签
  html = html.replace(/<h3(?![^>]*style)/gi,
    `<h3 style="font-size: ${opts.fontSize + 2}px; font-weight: bold; color: ${opts.headingColor}; line-height: ${opts.lineHeight}; margin-top: 1em; margin-bottom: 0.3em;"`);

  // 替换 <strong>/<b> 标签
  html = html.replace(/<(strong|b)(?![^>]*style)/gi,
    `<$1 style="font-weight: bold; color: ${opts.headingColor};"`);

  // 替换 <blockquote> 标签
  html = html.replace(/<blockquote(?![^>]*style)/gi,
    `<blockquote style="border-left: 3px solid #e0e0e0; padding-left: 1em; margin: 1em 0; color: #666; font-size: ${opts.fontSize - 1}px;"`);

  // 替换 <ul>/<ol> 标签
  html = html.replace(/<(ul|ol)(?![^>]*style)/gi,
    `<$1 style="${baseStyle} padding-left: 2em; margin-bottom: ${opts.paragraphSpacing};"`);

  // 替换 <li> 标签
  html = html.replace(/<li(?![^>]*style)/gi,
    `<li style="${baseStyle} margin-bottom: 0.3em;"`);

  return html;
}

/**
 * 用section标签包裹内容块
 */
function wrapWithSections(html, opts) {
  const sectionStyle = `max-width: 100%; box-sizing: border-box; font-size: ${opts.fontSize}px; line-height: ${opts.lineHeight}; color: ${opts.color};`;

  // 如果已经包含section，不再重复包裹
  if (/<section/i.test(html)) {
    return html;
  }

  return `<section style="${sectionStyle}">
${html}
</section>`;
}

/**
 * 格式化纯文本为微信HTML段落
 */
function textToWechatFragment(text, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const baseStyle = `font-size: ${options.fontSize}px; line-height: ${options.lineHeight}; color: ${options.color};`;

  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
      return `<p style="${baseStyle} margin-bottom: ${options.paragraphSpacing};">${lines.join('<br/>')}</p>`;
    })
    .join('\n');
}

/**
 * 格式化纯文本为微信HTML段落
 */
function textToWechatHtml(text, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const paragraphs = textToWechatFragment(text, options);

  return wrapWithSections(paragraphs, options);
}

function stripDocumentShell(html) {
  return html
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<\/?(html|body|head)[^>]*>/gi, '')
    .trim();
}

function normalizeStructuralTags(html) {
  return html
    .replace(/<(main|article|header|footer|aside)\b/gi, '<section')
    .replace(/<\/(main|article|header|footer|aside)>/gi, '</section>');
}

function rewriteInlineStyles(html, opts) {
  return html.replace(/<([a-z0-9]+)\b([^>]*?)\sstyle=(["'])([\s\S]*?)\3([^>]*)>/gi, (match, tagName, before, _quote, styleValue, after) => {
    const tag = String(tagName).toLowerCase();
    const normalizedStyle = buildNormalizedStyle(tag, styleValue, opts);
    const mergedAttrs = [before, after].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const attrSegment = mergedAttrs ? ` ${mergedAttrs}` : '';
    const styleSegment = normalizedStyle ? ` style="${normalizedStyle}"` : '';
    return `<${tagName}${attrSegment}${styleSegment}>`;
  });
}

function buildNormalizedStyle(tag, styleValue, opts) {
  const builder = TAG_STYLE_BUILDERS[tag];
  if (builder) {
    return builder(opts, parseStyle(styleValue));
  }
  return serializeStyle(pickAllowedInlineStyle(parseStyle(styleValue)));
}

function removeEmptyDecorativeBlocks(html) {
  return html
    .replace(/<p[^>]*>\s*(?:<br\/?>|\u00a0|&nbsp;|\s)*<\/p>/gi, '')
    .replace(/<div[^>]*>\s*(?:<br\/?>|\u00a0|&nbsp;|\s)*<\/div>/gi, '')
    .replace(/<section[^>]*>\s*(?:<br\/?>|\u00a0|&nbsp;|\s)*<\/section>/gi, '')
    .replace(/\n{3,}/g, '\n\n');
}

function buildSectionStyle(opts) {
  return serializeStyle({
    'max-width': '100%',
    'box-sizing': 'border-box',
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: opts.color,
    'margin-bottom': opts.paragraphSpacing,
  });
}

function buildBlockStyle(opts) {
  return serializeStyle({
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: opts.color,
    'margin-bottom': opts.paragraphSpacing,
  });
}

function buildParagraphStyle(opts) {
  return serializeStyle({
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: opts.color,
    'margin-bottom': opts.paragraphSpacing,
    'text-align': 'left',
  });
}

function buildHeadingStyle(opts, sizeOffset) {
  return serializeStyle({
    'font-size': `${opts.fontSize + sizeOffset}px`,
    'font-weight': '700',
    color: opts.headingColor,
    'line-height': '1.5',
    'margin-top': '1.2em',
    'margin-bottom': '0.4em',
    'text-align': 'left',
  });
}

function buildListStyle(opts) {
  return serializeStyle({
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: opts.color,
    'padding-left': '1.5em',
    'margin-bottom': opts.paragraphSpacing,
  });
}

function buildListItemStyle(opts) {
  return serializeStyle({
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: opts.color,
    'margin-bottom': '0.35em',
  });
}

function buildBlockquoteStyle(opts) {
  return serializeStyle({
    'border-left': '3px solid #d6d9de',
    'padding-left': '1em',
    margin: '1em 0',
    color: '#555555',
    'font-size': `${Math.max(14, opts.fontSize - 1)}px`,
    'line-height': String(opts.lineHeight),
  });
}

function buildDividerStyle() {
  return serializeStyle({
    border: '0',
    'border-top': '1px solid #e5e7eb',
    margin: '1.25em 0',
    height: '0',
    background: 'transparent',
  });
}

function buildStrongStyle(opts) {
  return serializeStyle({
    'font-weight': '700',
    color: opts.headingColor,
  });
}

function buildEmphasisStyle() {
  return serializeStyle({
    'font-style': 'italic',
  });
}

function buildSpanStyle(_opts, styleMap = {}) {
  return serializeStyle(pickAllowedInlineStyle(styleMap));
}

function buildLinkStyle() {
  return serializeStyle({
    color: '#576b95',
    'text-decoration': 'underline',
  });
}

function buildImageStyle() {
  return serializeStyle({
    display: 'block',
    'max-width': '100%',
    width: '100%',
    height: 'auto',
    margin: '1em auto',
  });
}

function buildTableStyle() {
  return serializeStyle({
    width: '100%',
    'border-collapse': 'collapse',
    margin: '1em 0',
  });
}

function buildTableCellStyle(opts, styleMap = {}) {
  return serializeStyle({
    'border': '1px solid #e5e7eb',
    padding: '8px',
    'font-size': `${opts.fontSize}px`,
    'line-height': String(opts.lineHeight),
    color: styleMap.color && /^#(?:[0-9a-f]{3}){1,2}$/i.test(styleMap.color) ? styleMap.color : opts.color,
  });
}

function parseStyle(styleValue = '') {
  return String(styleValue)
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex === -1) return acc;
      const property = item.slice(0, separatorIndex).trim().toLowerCase();
      const value = item.slice(separatorIndex + 1).trim();
      if (property && value) acc[property] = value;
      return acc;
    }, {});
}

function pickAllowedInlineStyle(styleMap = {}) {
  const allowed = {};
  if (/^(700|800|900|bold)$/i.test(styleMap['font-weight'] || '')) {
    allowed['font-weight'] = '700';
  }
  if (/italic/i.test(styleMap['font-style'] || '')) {
    allowed['font-style'] = 'italic';
  }
  if (/underline/i.test(styleMap['text-decoration'] || '')) {
    allowed['text-decoration'] = 'underline';
  }
  return allowed;
}

function serializeStyle(styleMap = {}) {
  return Object.entries(styleMap)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}

module.exports = {
  formatForWechat,
  normalizeAgentHtml,
  textToWechatFragment,
  textToWechatHtml,
  DEFAULT_OPTIONS,
};
