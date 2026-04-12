const { JSDOM } = require('jsdom');
const css = require('css');

/**
 * CSS 样式内联转换工具（增强版）
 * 将 HTML 中的 class 样式转换为内联 style 属性
 * 微信公众号只支持内联样式
 */
class InlineStyleConverter {
  constructor() {
    this.styleMap = new Map();
  }

  /**
   * 解析 CSS 文本，提取选择器和样式
   * @param {string} cssText
   * @returns {Map<string, string>}
   */
  parseCSS(cssText) {
    const rules = new Map();
    
    try {
      const ast = css.parse(cssText);
      
      ast.stylesheet.rules.forEach(rule => {
        if (rule.type === 'rule') {
          rule.selectors.forEach(selector => {
            // 处理多种选择器类型
            const styles = this.extractStylesFromRule(rule);
            
            if (selector.startsWith('.')) {
              // 类选择器 .class
              const className = selector.slice(1).split(':')[0].split(' ')[0];
              this.mergeStyles(rules, className, styles);
            } else if (selector.startsWith('#')) {
              // ID 选择器 #id
              const id = selector.slice(1).split(':')[0];
              this.mergeStyles(rules, `#${id}`, styles);
            } else if (selector.includes('.')) {
              // 标签+类选择器 tag.class
              const parts = selector.split('.');
              if (parts.length > 1) {
                const className = parts[1].split(':')[0].split(' ')[0];
                this.mergeStyles(rules, className, styles);
              }
            }
          });
        } else if (rule.type === 'media') {
          // 处理媒体查询中的规则（微信不完全支持，但可以提取基础样式）
          rule.rules.forEach(mediaRule => {
            if (mediaRule.type === 'rule') {
              mediaRule.selectors.forEach(selector => {
                if (selector.startsWith('.')) {
                  const className = selector.slice(1).split(':')[0].split(' ')[0];
                  const styles = this.extractStylesFromRule(mediaRule);
                  this.mergeStyles(rules, className, styles);
                }
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('CSS 解析错误:', error);
    }
    
    return rules;
  }

  /**
   * 从规则中提取样式字符串
   */
  extractStylesFromRule(rule) {
    return rule.declarations
      .filter(d => d.type === 'declaration')
      .map(d => `${d.property}: ${d.value}`)
      .join('; ');
  }

  /**
   * 合并样式到规则映射
   */
  mergeStyles(rules, key, styles) {
    if (rules.has(key)) {
      rules.set(key, `${rules.get(key)}; ${styles}`);
    } else {
      rules.set(key, styles);
    }
  }

  /**
   * 将 CSS 样式应用到 HTML
   * @param {string} html
   * @param {string} cssText
   * @returns {string}
   */
  convert(html, cssText = '') {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 解析 CSS
    const cssRules = this.parseCSS(cssText);
    
    // 提取 HTML 中的 style 标签
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
      const embeddedRules = this.parseCSS(tag.textContent);
      embeddedRules.forEach((value, key) => {
        if (cssRules.has(key)) {
          cssRules.set(key, `${cssRules.get(key)}; ${value}`);
        } else {
          cssRules.set(key, value);
        }
      });
      tag.remove(); // 移除 style 标签
    });
    
    // 处理 class 属性
    const elementsWithClass = document.querySelectorAll('[class]');
    elementsWithClass.forEach(el => {
      const classes = el.className.split(/\s+/);
      const inlineStyles = [];
      
      classes.forEach(className => {
        if (cssRules.has(className)) {
          inlineStyles.push(cssRules.get(className));
        }
      });
      
      if (inlineStyles.length > 0) {
        // 合并现有内联样式和新的样式
        const existingStyle = el.getAttribute('style') || '';
        const newStyle = inlineStyles.join('; ');
        el.setAttribute('style', existingStyle ? `${existingStyle}; ${newStyle}` : newStyle);
      }
      
      // 移除 class 属性（微信公众号不支持外部样式）
      el.removeAttribute('class');
    });
    
    // 移除 link 标签
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    linkTags.forEach(tag => tag.remove());
    
    // 移除所有 style 标签
    const remainingStyleTags = document.querySelectorAll('style');
    remainingStyleTags.forEach(tag => tag.remove());
    
    return document.body.innerHTML;
  }

  /**
   * 处理 UEditor 生成的 HTML
   * 专门针对 UEditor 的样式进行处理
   * @param {string} html
   * @returns {string}
   */
  convertUEditorContent(html) {
    // UEditor 默认样式
    const ueditorDefaultStyles = `
      .rich_media_content {
        font-size: 16px;
        line-height: 1.8;
        color: #333;
      }
      .rich_media_content p {
        margin: 0 0 1em 0;
      }
      .rich_media_content img {
        max-width: 100%;
        height: auto;
      }
      .rich_media_content strong {
        font-weight: bold;
      }
      .rich_media_content em {
        font-style: italic;
      }
      .rich_media_content h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 1em 0;
      }
      .rich_media_content h2 {
        font-size: 20px;
        font-weight: bold;
        margin: 1em 0;
      }
      .rich_media_content h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 1em 0;
      }
      .rich_media_content blockquote {
        margin: 1em 0;
        padding: 0 1em;
        border-left: 4px solid #ccc;
        color: #666;
      }
    `;
    
    return this.convert(html, ueditorDefaultStyles);
  }

  /**
   * 微信特定样式优化（增强版）
   * 添加微信文章常用的样式和属性
   * @param {string} html
   * @param {Object} options - 配置选项
   * @returns {string}
   */
  optimizeForWechat(html, options = {}) {
    const { 
      maxWidth = 677, 
      addDataAttributes = true,
      convertRemToPx = true,
      removeUnsupportedStyles = true 
    } = options;
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 为图片添加微信特定属性
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // 添加 data-ratio 等微信需要的属性
      if (addDataAttributes) {
        if (!img.hasAttribute('data-ratio')) {
          const width = parseInt(img.getAttribute('width')) || img.width || 640;
          const height = parseInt(img.getAttribute('height')) || img.height || 400;
          img.setAttribute('data-ratio', (height / width).toFixed(4));
        }
        if (!img.hasAttribute('data-w')) {
          img.setAttribute('data-w', img.getAttribute('width') || '640');
        }
        if (!img.hasAttribute('data-type')) {
          const src = img.getAttribute('src') || '';
          const ext = src.split('.').pop().toLowerCase().split('?')[0];
          img.setAttribute('data-type', ['png', 'gif', 'webp'].includes(ext) ? ext : 'jpeg');
        }
      }
      
      // 确保图片有最大宽度限制
      const style = img.getAttribute('style') || '';
      if (!style.includes('max-width') && !style.includes('width')) {
        img.setAttribute('style', `${style}; max-width: 100%; height: auto;`.trim());
      }
      
      // 移除图片的 class
      img.removeAttribute('class');
    });
    
    // 为段落添加微信默认样式
    const paragraphs = document.querySelectorAll('p');
    paragraphs.forEach(p => {
      const style = p.getAttribute('style') || '';
      if (!style.includes('margin')) {
        p.setAttribute('style', `${style}; margin: 0 0 1em 0;`.trim());
      }
      
      // 微信推荐使用 section 替代 div
      // 但保留 p 标签，因为微信也支持
      p.removeAttribute('class');
    });
    
    // 处理 section 标签
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      section.removeAttribute('class');
      
      // 确保 section 有基本样式
      const style = section.getAttribute('style') || '';
      if (!style.includes('box-sizing')) {
        section.setAttribute('style', `${style}; box-sizing: border-box;`.trim());
      }
    });
    
    // 处理链接
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.removeAttribute('class');
      // 确保链接有正确的 target
      if (!link.hasAttribute('target')) {
        link.setAttribute('target', '_blank');
      }
    });
    
    // 处理表格
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const style = table.getAttribute('style') || '';
      if (!style.includes('border-collapse')) {
        table.setAttribute('style', `${style}; border-collapse: collapse; width: 100%;`.trim());
      }
      table.removeAttribute('class');
      table.removeAttribute('border');
      table.removeAttribute('cellpadding');
      table.removeAttribute('cellspacing');
    });
    
    // 处理表格单元格
    const cells = document.querySelectorAll('td, th');
    cells.forEach(cell => {
      const style = cell.getAttribute('style') || '';
      if (!style.includes('border')) {
        cell.setAttribute('style', `${style}; border: 1px solid #ddd; padding: 8px;`.trim());
      }
      cell.removeAttribute('class');
    });
    
    // 处理 span 标签
    const spans = document.querySelectorAll('span');
    spans.forEach(span => {
      span.removeAttribute('class');
    });
    
    // 处理标题标签
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      const elements = document.querySelectorAll(tag);
      elements.forEach(el => {
        el.removeAttribute('class');
        const style = el.getAttribute('style') || '';
        if (!style.includes('margin')) {
          el.setAttribute('style', `${style}; margin: 1em 0 0.5em;`.trim());
        }
      });
    });
    
    // 处理列表
    const lists = document.querySelectorAll('ul, ol');
    lists.forEach(list => {
      list.removeAttribute('class');
      const style = list.getAttribute('style') || '';
      if (!style.includes('padding-left')) {
        list.setAttribute('style', `${style}; padding-left: 2em;`.trim());
      }
    });
    
    // 处理 blockquote
    const blockquotes = document.querySelectorAll('blockquote');
    blockquotes.forEach(bq => {
      bq.removeAttribute('class');
      const style = bq.getAttribute('style') || '';
      bq.setAttribute('style', `${style}; margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #ddd; color: #666;`.trim());
    });
    
    // 移除所有 script 标签
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 移除所有 style 标签
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => tag.remove());
    
    // 移除所有 link 标签
    const linkTags = document.querySelectorAll('link');
    linkTags.forEach(tag => tag.remove());
    
    return document.body.innerHTML;
  }

  /**
   * 将 rem/em 转换为 px（微信对 rem 支持不完善）
   * @param {string} style
   * @param {number} baseFontSize - 基准字号，默认 16px
   * @returns {string}
   */
  convertRelativeUnits(style, baseFontSize = 16) {
    return style
      // rem to px
      .replace(/([\d.]+)rem/gi, (match, value) => {
        return `${Math.round(parseFloat(value) * baseFontSize)}px`;
      })
      // em to px (相对父元素，这里简单处理)
      .replace(/([\d.]+)em/gi, (match, value) => {
        return `${Math.round(parseFloat(value) * baseFontSize)}px`;
      });
  }

  /**
   * 移除微信不支持的 CSS 属性
   * @param {string} style
   * @returns {string}
   */
  removeUnsupportedCss(style) {
    // 微信不支持的 CSS 属性列表
    const unsupportedProps = [
      'display',
      'position',
      'float',
      'flex',
      'grid',
      'order',
      'align-',
      'justify-',
      'column-',
      'gap',
      'grid-',
      'template-',
      'appearance',
      'user-select',
      'pointer-events',
      'cursor',
      'filter',
      'clip-path',
      'mask',
      'object-fit',
      'object-position',
      'scroll-behavior',
      'scroll-snap',
      'overscroll',
      'touch-action',
      'will-change',
      'contain',
      'content-',
      'hyphens',
      'tab-size',
      'text-size-adjust',
      'writing-mode',
      'direction',
      'unicode-',
      'font-variant',
      'font-feature-settings',
      'font-kerning',
      'font-stretch',
      'font-synthesis',
      'font-variation-settings',
      'text-decoration-',
      'text-emphasis',
      'text-orientation',
      'text-rendering',
      'text-shadow',
      'text-underline',
      'word-spacing',
      'shape-',
      'image-',
      'mix-blend-',
      'isolation',
      'backdrop-',
      'perspective',
      'transform-style',
      'backface-',
    ];
    
    const declarations = style.split(';').filter(decl => {
      const trimmed = decl.trim().toLowerCase();
      if (!trimmed) return false;
      return !unsupportedProps.some(prop => trimmed.startsWith(prop));
    });
    
    return declarations.join(';');
  }

  /**
   * 完整的微信转换流程
   * @param {string} html
   * @param {Object} options
   * @returns {string}
   */
  convertForWechat(html, options = {}) {
    const {
      convertStyles = true,
      optimizeImages = true,
      removeUnsupported = true,
      convertUnits = true,
      baseFontSize = 16
    } = options;

    let result = html;
    
    // 1. 转换样式为内联
    if (convertStyles) {
      result = this.convertUEditorContent(result);
    }
    
    // 2. 微信特定优化
    result = this.optimizeForWechat(result, {
      addDataAttributes: optimizeImages
    });
    
    // 3. 转换单位
    if (convertUnits) {
      const dom = new JSDOM(result);
      const document = dom.window.document;
      const allElements = document.querySelectorAll('[style]');
      allElements.forEach(el => {
        const style = el.getAttribute('style');
        el.setAttribute('style', this.convertRelativeUnits(style, baseFontSize));
      });
      result = document.body.innerHTML;
    }
    
    // 4. 移除不支持的 CSS
    if (removeUnsupported) {
      const dom = new JSDOM(result);
      const document = dom.window.document;
      const allElements = document.querySelectorAll('[style]');
      allElements.forEach(el => {
        const style = el.getAttribute('style');
        el.setAttribute('style', this.removeUnsupportedCss(style));
      });
      result = document.body.innerHTML;
    }
    
    return result;
  }
}

/**
 * 简化的样式转换函数（无需 JSDOM 依赖）
 * 用于基础场景
 */
function simpleInlineConvert(html, cssRules = {}) {
  // 使用正则替换 class 为内联样式
  let result = html;
  
  // 替换 class 属性
  const classRegex = /class="([^"]+)"/g;
  result = result.replace(classRegex, (match, classes) => {
    const classList = classes.split(/\s+/);
    const styles = classList
      .map(c => cssRules[c])
      .filter(Boolean)
      .join('; ');
    
    if (styles) {
      return `style="${styles}"`;
    }
    return ''; // 移除空的 class
  });
  
  // 移除 style 标签
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // 移除 link 标签
  result = result.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, '');
  
  return result;
}

/**
 * 快速微信转换（用于预览等场景）
 * @param {string} html
 * @returns {string}
 */
function quickWechatConvert(html) {
  const converter = new InlineStyleConverter();
  return converter.convertForWechat(html, {
    convertStyles: true,
    optimizeImages: true,
    removeUnsupported: true,
    convertUnits: true
  });
}

/**
 * 验证 HTML 是否符合微信规范
 * @param {string} html
 * @returns {Object} { valid: boolean, issues: string[] }
 */
function validateWechatHtml(html) {
  const issues = [];
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // 检查是否有 class 属性
  const elementsWithClass = document.querySelectorAll('[class]');
  if (elementsWithClass.length > 0) {
    issues.push(`发现 ${elementsWithClass.length} 个元素仍有 class 属性`);
  }
  
  // 检查是否有 style 标签
  const styleTags = document.querySelectorAll('style');
  if (styleTags.length > 0) {
    issues.push(`发现 ${styleTags.length} 个 style 标签`);
  }
  
  // 检查是否有 link 标签
  const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
  if (linkTags.length > 0) {
    issues.push(`发现 ${linkTags.length} 个外部样式表链接`);
  }
  
  // 检查图片是否有必要属性
  const images = document.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.hasAttribute('data-ratio')) {
      issues.push(`图片 ${index + 1} 缺少 data-ratio 属性`);
    }
  });
  
  // 检查是否使用了不支持的标签
  const unsupportedTags = ['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'form', 'input', 'button', 'select', 'textarea'];
  unsupportedTags.forEach(tag => {
    const elements = document.querySelectorAll(tag);
    if (elements.length > 0) {
      issues.push(`发现 ${elements.length} 个不支持的 <${tag}> 标签`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
    stats: {
      images: images.length,
      links: document.querySelectorAll('a').length,
      paragraphs: document.querySelectorAll('p').length,
      sections: document.querySelectorAll('section').length
    }
  };
}

module.exports = {
  InlineStyleConverter,
  simpleInlineConvert,
  quickWechatConvert,
  validateWechatHtml
};
