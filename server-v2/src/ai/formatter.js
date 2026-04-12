/**
 * 微信公众号HTML格式化工具
 * - 内联样式（inline style）
 * - section标签包裹
 * - 14-16px字号, 1.75行高
 */

const DEFAULT_OPTIONS = {
  fontSize: 15,
  lineHeight: 1.75,
  color: '#333333',
  paragraphSpacing: '1em',
  headingColor: '#1a1a1a',
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
 * 为HTML内容添加内联样式
 */
function addInlineStyles(html, opts) {
  const baseStyle = `font-size: ${opts.fontSize}px; line-height: ${opts.lineHeight}; color: ${opts.color};`;

  // 替换 <p> 标签，添加内联样式
  html = html.replace(/<p(?![^>]*style)/gi, `<p style="${baseStyle} margin-bottom: ${opts.paragraphSpacing};"`);

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
function textToWechatHtml(text, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const baseStyle = `font-size: ${options.fontSize}px; line-height: ${options.lineHeight}; color: ${options.color};`;

  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      // 处理行内换行
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
      return `<p style="${baseStyle} margin-bottom: ${options.paragraphSpacing};">${lines.join('<br/>')}</p>`;
    })
    .join('\n');

  return wrapWithSections(paragraphs, options);
}

module.exports = { formatForWechat, textToWechatHtml, DEFAULT_OPTIONS };
