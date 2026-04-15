const DEFAULTS = {
  fontSize: 15,
  lineHeight: 1.75,
  color: '#333333',
  paragraphSpacing: '1em',
  headingColor: '#1a1a1a',
};

const BLOCK_STYLE = serializeStyle({
  'max-width': '100%',
  'box-sizing': 'border-box',
  'font-size': `${DEFAULTS.fontSize}px`,
  'line-height': String(DEFAULTS.lineHeight),
  color: DEFAULTS.color,
  'margin-bottom': DEFAULTS.paragraphSpacing,
});

const PARAGRAPH_STYLE = serializeStyle({
  'font-size': `${DEFAULTS.fontSize}px`,
  'line-height': String(DEFAULTS.lineHeight),
  color: DEFAULTS.color,
  'margin-bottom': DEFAULTS.paragraphSpacing,
  'text-align': 'left',
});

export function extractStreamingHtmlArgument(argumentsSoFar: string): string | null {
  if (!argumentsSoFar) return null;

  const keyIndex = argumentsSoFar.indexOf('"html"');
  if (keyIndex === -1) return null;

  const colonIndex = argumentsSoFar.indexOf(':', keyIndex);
  if (colonIndex === -1) return null;

  const openingQuoteIndex = argumentsSoFar.indexOf('"', colonIndex);
  if (openingQuoteIndex === -1) return null;

  let escaped = false;
  let rawValue = '';

  for (let i = openingQuoteIndex + 1; i < argumentsSoFar.length; i += 1) {
    const char = argumentsSoFar[i];

    if (escaped) {
      rawValue += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      rawValue += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      return decodeJsonString(rawValue);
    }

    rawValue += char;
  }

  return decodeJsonString(rawValue);
}

export function normalizeStreamingPreviewHtml(html: string, options: { wrapSections?: boolean } = {}): string {
  if (!html) return '';

  const wrapSections = options.wrapSections !== false;
  const trimmed = html.trim();
  if (!trimmed) return '';

  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return wrapSections ? wrapPreviewSections(textToPreviewFragment(trimmed)) : textToPreviewFragment(trimmed);
  }

  if (typeof DOMParser === 'undefined') {
    return wrapSections ? wrapPreviewSections(trimmed) : trimmed;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div data-ai-preview-root="true">${trimmed}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return trimmed;

  normalizePreviewNode(root);
  removeEmptyBlocks(root);

  const normalized = root.innerHTML.trim();
  if (!normalized) return '';

  return wrapSections && !/<section\b/i.test(normalized)
    ? wrapPreviewSections(normalized)
    : normalized;
}

function normalizePreviewNode(root: HTMLElement) {
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();
    const style = buildPreviewStyle(tag, node.getAttribute('style') || '');

    if (style) {
      node.setAttribute('style', style);
    } else {
      node.removeAttribute('style');
    }
  }
}

function removeEmptyBlocks(root: HTMLElement) {
  const selectors = ['p', 'div', 'section'];
  selectors.forEach((selector) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      const text = (node.textContent || '').replace(/\u00a0/g, '').trim();
      const hasMedia = node.querySelector('img, table, ul, ol, blockquote');
      if (!text && !hasMedia) {
        node.remove();
      }
    });
  });
}

function textToPreviewFragment(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
      return `<p style="${PARAGRAPH_STYLE}">${lines.join('<br/>')}</p>`;
    })
    .join('\n');
}

function wrapPreviewSections(html: string) {
  return `<section style="${serializeStyle({
    'max-width': '100%',
    'box-sizing': 'border-box',
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
  })}">
${html}
</section>`;
}

function decodeJsonString(rawValue: string) {
  let candidate = rawValue;
  while (candidate.length >= 0) {
    try {
      return JSON.parse(`"${candidate}"`) as string;
    } catch {
      if (!candidate.endsWith('\\')) break;
      candidate = candidate.slice(0, -1);
    }
  }

  return rawValue
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\//g, '/');
}

function normalizeSpanStyle(styleText: string) {
  const styleMap = parseStyleText(styleText);
  return serializeStyle({
    ...pickInlineStyles(styleMap),
    ...pickBackgroundDecoration(styleMap),
    ...(normalizeColor(styleMap.color) ? { color: normalizeColor(styleMap.color)! } : {}),
    ...(normalizeRadius(styleMap['border-radius']) ? { 'border-radius': normalizeRadius(styleMap['border-radius'])! } : {}),
    ...(normalizeSpacing(styleMap.padding) ? { padding: normalizeSpacing(styleMap.padding)! } : {}),
  });
}

function buildPreviewStyle(tag: string, styleText: string) {
  const styleMap = parseStyleText(styleText);

  switch (tag) {
    case 'section':
    case 'article':
    case 'main':
    case 'header':
    case 'footer':
    case 'aside':
    case 'div':
      return serializeStyle({
        ...parseStyleText(BLOCK_STYLE),
        ...pickBlockDecorations(styleMap),
      });
    case 'p':
      return serializeStyle({
        ...parseStyleText(PARAGRAPH_STYLE),
        'text-align': normalizeTextAlign(styleMap['text-align']) || 'left',
      });
    case 'h1':
      return buildHeadingStyle(8, styleMap);
    case 'h2':
      return buildHeadingStyle(4, styleMap);
    case 'h3':
      return buildHeadingStyle(2, styleMap);
    case 'h4':
    case 'h5':
    case 'h6':
      return buildHeadingStyle(1, styleMap);
    case 'ul':
    case 'ol':
      return serializeStyle({
        'font-size': `${DEFAULTS.fontSize}px`,
        'line-height': String(DEFAULTS.lineHeight),
        color: DEFAULTS.color,
        'padding-left': '1.5em',
        'margin-bottom': DEFAULTS.paragraphSpacing,
      });
    case 'li':
      return serializeStyle({
        'font-size': `${DEFAULTS.fontSize}px`,
        'line-height': String(DEFAULTS.lineHeight),
        color: DEFAULTS.color,
        'margin-bottom': '0.35em',
      });
    case 'blockquote':
      return serializeStyle({
        'border-left': normalizeBorder(styleMap['border-left'], { defaultColor: '#d6d9de', defaultWidth: 3, onlyLeft: true }) || '3px solid #d6d9de',
        'padding-left': '1em',
        margin: '1em 0',
        color: '#555555',
        'font-size': '14px',
        'line-height': String(DEFAULTS.lineHeight),
        ...pickBackgroundDecoration(styleMap),
      });
    case 'hr':
      return serializeStyle({
        border: '0',
        'border-top': normalizeBorder(styleMap['border-top'], { defaultColor: '#e5e7eb', defaultWidth: 1 }) || '1px solid #e5e7eb',
        margin: '1.25em 0',
        height: '0',
        background: 'transparent',
      });
    case 'strong':
    case 'b':
      return serializeStyle({
        'font-weight': '700',
        color: normalizeColor(styleMap.color) || DEFAULTS.headingColor,
      });
    case 'em':
    case 'i':
      return serializeStyle({ 'font-style': 'italic' });
    case 'span':
      return normalizeSpanStyle(styleText);
    case 'a':
      return serializeStyle({
        color: normalizeColor(styleMap.color) || '#576b95',
        'text-decoration': 'underline',
      });
    case 'img':
      return serializeStyle({
        display: 'block',
        'max-width': '100%',
        width: '100%',
        height: 'auto',
        margin: '1em auto',
        ...(normalizeRadius(styleMap['border-radius']) ? { 'border-radius': normalizeRadius(styleMap['border-radius'])! } : {}),
      });
    case 'table':
      return serializeStyle({
        width: '100%',
        'border-collapse': 'collapse',
        margin: '1em 0',
      });
    case 'th':
    case 'td':
      return serializeStyle({
        border: normalizeBorder(styleMap.border, { defaultColor: '#e5e7eb', defaultWidth: 1 }) || '1px solid #e5e7eb',
        padding: '8px',
        'font-size': `${DEFAULTS.fontSize}px`,
        'line-height': String(DEFAULTS.lineHeight),
        color: normalizeColor(styleMap.color) || DEFAULTS.color,
        ...pickBackgroundDecoration(styleMap),
      });
    default:
      return '';
  }
}

function buildHeadingStyle(sizeOffset: number, styleMap: Record<string, string>) {
  return serializeStyle({
    'font-size': `${DEFAULTS.fontSize + sizeOffset}px`,
    'font-weight': '700',
    color: normalizeColor(styleMap.color) || DEFAULTS.headingColor,
    'line-height': '1.5',
    'margin-top': sizeOffset >= 8 ? '1.5em' : '1.2em',
    'margin-bottom': sizeOffset >= 8 ? '0.5em' : '0.4em',
    'text-align': normalizeTextAlign(styleMap['text-align']) || 'left',
  });
}

function parseStyleText(styleText: string) {
  return styleText
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex === -1) return acc;
      const property = item.slice(0, separatorIndex).trim().toLowerCase();
      const value = item.slice(separatorIndex + 1).trim();
      if (property && value) acc[property] = value;
      return acc;
    }, {});
}

function pickInlineStyles(styleMap: Record<string, string>) {
  const normalized: Record<string, string> = {};

  if (/^(700|800|900|bold)$/i.test(styleMap['font-weight'] || '')) {
    normalized['font-weight'] = '700';
    normalized.color = DEFAULTS.headingColor;
  }

  if (/italic/i.test(styleMap['font-style'] || '')) {
    normalized['font-style'] = 'italic';
  }

  if (/underline/i.test(styleMap['text-decoration'] || '')) {
    normalized['text-decoration'] = 'underline';
  }

  return normalized;
}

function pickBlockDecorations(styleMap: Record<string, string>) {
  const decorations: Record<string, string> = {
    ...pickBackgroundDecoration(styleMap),
  };

  const border = normalizeBorder(styleMap.border);
  if (border) decorations.border = border;

  const borderLeft = normalizeBorder(styleMap['border-left'], { onlyLeft: true });
  if (borderLeft) decorations['border-left'] = borderLeft;

  const padding = normalizeSpacing(styleMap.padding);
  if (padding) decorations.padding = padding;

  const radius = normalizeRadius(styleMap['border-radius']);
  if (radius) decorations['border-radius'] = radius;

  const textAlign = normalizeTextAlign(styleMap['text-align']);
  if (textAlign) decorations['text-align'] = textAlign;

  return decorations;
}

function pickBackgroundDecoration(styleMap: Record<string, string>) {
  const backgroundColor = normalizeColor(styleMap['background-color']) || normalizeSolidBackground(styleMap.background);
  return backgroundColor ? { 'background-color': backgroundColor } : {};
}

function normalizeTextAlign(value?: string) {
  return /^(left|center|right)$/i.test(value || '') ? String(value).toLowerCase() : '';
}

function normalizeColor(value?: string) {
  if (!value) return '';
  const normalized = value.trim();
  if (/^#(?:[0-9a-f]{3}){1,2}$/i.test(normalized)) return normalized;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)$/i.test(normalized)) return normalized;
  return '';
}

function normalizeSolidBackground(value?: string) {
  if (!value) return '';
  const normalized = value.trim();
  if (!normalized || /(gradient|url\s*\(|var\s*\(|image)/i.test(normalized)) return '';
  return normalizeColor(normalized);
}

function normalizeBorder(value?: string, options: { defaultColor?: string; defaultWidth?: number; onlyLeft?: boolean } = {}) {
  if (!value) return '';
  const match = value.trim().match(/^(\d{1,2})px\s+(solid)\s+(.+)$/i);
  if (!match) return '';

  const width = Number(match[1]);
  const color = normalizeColor(match[3]);
  if (!color || width <= 0 || width > 3) return '';

  if (options.onlyLeft) {
    return `${Math.max(width, options.defaultWidth || 2)}px solid ${color || options.defaultColor || '#d6d9de'}`;
  }

  return `${width}px solid ${color}`;
}

function normalizeSpacing(value?: string) {
  if (!value) return '';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 4) return '';

  const normalized = parts.map((part) => {
    const match = part.match(/^(\d{1,2})px$/i);
    if (!match) return '';
    const size = Number(match[1]);
    if (size < 0 || size > 24) return '';
    return `${size}px`;
  });

  return normalized.every(Boolean) ? normalized.join(' ') : '';
}

function normalizeRadius(value?: string) {
  if (!value) return '';
  const match = value.trim().match(/^(\d{1,2})px$/i);
  if (!match) return '';
  const size = Number(match[1]);
  if (size < 0 || size > 18) return '';
  return `${size}px`;
}

function serializeStyle(style: Record<string, string>) {
  return Object.entries(style)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}
