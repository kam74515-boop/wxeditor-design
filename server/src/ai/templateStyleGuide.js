const MAX_COLOR_COUNT = 6;
const MAX_IMAGE_COUNT = 3;

function buildTemplateStyleGuide(templateContent) {
  if (typeof templateContent !== 'string') return '';

  const html = templateContent.trim();
  if (!html) return '';

  const styleText = extractStyleText(html);
  const palette = extractDominantColors(styleText, MAX_COLOR_COUNT);
  const imageUrls = extractImageUrls(html, MAX_IMAGE_COUNT);

  const moduleHints = [];
  if (hasTagLabelStyle(styleText)) {
    moduleHints.push('标签小标题（12-13px + 字距拉开）');
  }
  if (hasDarkSection(styleText)) {
    moduleHints.push('深色块面章节（深底色 + 浅色正文）');
  }
  if (hasRoundedCard(styleText)) {
    moduleHints.push('圆角信息框（用于总结或提示）');
  }
  if (hasBorderDecoration(styleText)) {
    moduleHints.push('细边框强调（边框或左侧竖线）');
  }
  if (/<img\b/i.test(html)) {
    moduleHints.push('图文分节（图片 + 说明文案）');
  }

  const spacingHint = extractSpacingHint(styleText);

  const lines = [];
  if (palette.length) {
    lines.push(`模板色板参考：${palette.join('、')}`);
  }
  if (spacingHint) {
    lines.push(`模板留白节奏：${spacingHint}`);
  }
  if (moduleHints.length) {
    lines.push(`模板结构特征：${moduleHints.join('；')}`);
  }
  if (imageUrls.length) {
    lines.push(`可复用图片资源（可选）：${imageUrls.join('、')}`);
  }
  lines.push('执行要求：最终 HTML 至少落地 3 处可见设计元素（例如标签小标题、章节底色块、边框总结框、图注分节），不要只输出连续纯段落。');

  return lines.join('\n');
}

function extractStyleText(html) {
  const segments = [];
  const styleRegex = /style\s*=\s*(['"])([\s\S]*?)\1/gi;
  let match = styleRegex.exec(html);
  while (match) {
    if (match[2]) segments.push(match[2]);
    match = styleRegex.exec(html);
  }
  return segments.join(';\n');
}

function extractDominantColors(styleText, maxCount = MAX_COLOR_COUNT) {
  const counter = new Map();
  const colorRegex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]+\)/g;
  const matches = styleText.match(colorRegex) || [];

  matches.forEach((token) => {
    const normalized = normalizeColorToken(token);
    if (!normalized) return;
    counter.set(normalized, (counter.get(normalized) || 0) + 1);
  });

  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([color]) => color);
}

function normalizeColorToken(color) {
  if (typeof color !== 'string') return '';
  const input = color.trim().toLowerCase();
  if (!input) return '';

  if (/^#([0-9a-f]{3})$/.test(input)) {
    const short = input.slice(1);
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`;
  }
  if (/^#([0-9a-f]{6})$/.test(input)) {
    return input;
  }

  const rgbMatch = input.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbMatch) return '';

  const parts = rgbMatch[1].split(',').map((part) => part.trim());
  if (parts.length < 3 || parts.length > 4) return '';

  const numbers = parts.slice(0, 3).map((part) => Number(part));
  if (numbers.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return '';

  if (parts.length === 3) {
    return `rgb(${numbers[0]},${numbers[1]},${numbers[2]})`;
  }

  const alpha = Number(parts[3]);
  if (Number.isNaN(alpha) || alpha < 0 || alpha > 1) return '';
  const alphaString = alpha % 1 === 0 ? String(alpha) : String(Number(alpha.toFixed(3)));
  return `rgba(${numbers[0]},${numbers[1]},${numbers[2]},${alphaString})`;
}

function extractImageUrls(html, maxCount = MAX_IMAGE_COUNT) {
  const urls = [];
  const imageRegex = /<img\b[^>]*\bsrc\s*=\s*(['"])(.*?)\1/gi;
  let match = imageRegex.exec(html);
  while (match && urls.length < maxCount) {
    const src = String(match[2] || '').trim();
    if (src && /^https?:\/\//i.test(src) && !urls.includes(src)) {
      urls.push(src);
    }
    match = imageRegex.exec(html);
  }
  return urls;
}

function hasTagLabelStyle(styleText) {
  return /font-size\s*:\s*(?:1[0-3]|9)px[\s\S]{0,120}letter-spacing\s*:\s*[0-9.]+px/i.test(styleText)
    || /letter-spacing\s*:\s*[0-9.]+px[\s\S]{0,120}font-size\s*:\s*(?:1[0-3]|9)px/i.test(styleText);
}

function hasDarkSection(styleText) {
  const backgroundRegex = /background(?:-color)?\s*:\s*([^;]+)/gi;
  let match = backgroundRegex.exec(styleText);
  while (match) {
    const color = normalizeColorToken(match[1].trim());
    if (isDarkColor(color)) return true;
    match = backgroundRegex.exec(styleText);
  }
  return false;
}

function hasRoundedCard(styleText) {
  const radiusRegex = /border-radius\s*:\s*(\d+(?:\.\d+)?)px/gi;
  let match = radiusRegex.exec(styleText);
  while (match) {
    if (Number(match[1]) >= 10) return true;
    match = radiusRegex.exec(styleText);
  }
  return false;
}

function hasBorderDecoration(styleText) {
  return /border(?:-left|-top)?\s*:\s*1px\s+solid/i.test(styleText)
    || /border(?:-left|-top)?\s*:\s*2px\s+solid/i.test(styleText);
}

function extractSpacingHint(styleText) {
  const paddings = [];
  const spacingRegex = /padding\s*:\s*([^;]+)/gi;
  let match = spacingRegex.exec(styleText);
  while (match) {
    const value = String(match[1] || '').trim();
    const numbers = value.match(/\d+(?:\.\d+)?px/g) || [];
    numbers.forEach((n) => {
      const parsed = Number(n.replace('px', ''));
      if (!Number.isNaN(parsed) && parsed >= 8 && parsed <= 40) paddings.push(parsed);
    });
    match = spacingRegex.exec(styleText);
  }
  if (!paddings.length) return '';

  const avg = Math.round(paddings.reduce((sum, n) => sum + n, 0) / paddings.length);
  return `内边距以 ${Math.max(10, Math.min(32, avg))}px 左右为主`;
}

function isDarkColor(color) {
  const rgb = colorToRgb(color);
  if (!rgb) return false;

  const [r, g, b] = rgb;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 80;
}

function colorToRgb(color) {
  if (typeof color !== 'string') return null;

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(',').map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((value, index) => index < 3 && (Number.isNaN(value) || value < 0 || value > 255))) {
    return null;
  }
  return parts.slice(0, 3);
}

module.exports = {
  buildTemplateStyleGuide,
};
