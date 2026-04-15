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

const STYLE_BY_TAG: Record<string, string> = {
  section: BLOCK_STYLE,
  article: BLOCK_STYLE,
  main: BLOCK_STYLE,
  header: BLOCK_STYLE,
  footer: BLOCK_STYLE,
  aside: BLOCK_STYLE,
  div: BLOCK_STYLE,
  p: PARAGRAPH_STYLE,
  h1: serializeStyle({
    'font-size': `${DEFAULTS.fontSize + 8}px`,
    'font-weight': '700',
    color: DEFAULTS.headingColor,
    'line-height': '1.5',
    'margin-top': '1.5em',
    'margin-bottom': '0.5em',
    'text-align': 'left',
  }),
  h2: serializeStyle({
    'font-size': `${DEFAULTS.fontSize + 4}px`,
    'font-weight': '700',
    color: DEFAULTS.headingColor,
    'line-height': '1.5',
    'margin-top': '1.2em',
    'margin-bottom': '0.4em',
    'text-align': 'left',
  }),
  h3: serializeStyle({
    'font-size': `${DEFAULTS.fontSize + 2}px`,
    'font-weight': '700',
    color: DEFAULTS.headingColor,
    'line-height': '1.5',
    'margin-top': '1em',
    'margin-bottom': '0.3em',
    'text-align': 'left',
  }),
  ul: serializeStyle({
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
    'padding-left': '1.5em',
    'margin-bottom': DEFAULTS.paragraphSpacing,
  }),
  ol: serializeStyle({
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
    'padding-left': '1.5em',
    'margin-bottom': DEFAULTS.paragraphSpacing,
  }),
  li: serializeStyle({
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
    'margin-bottom': '0.35em',
  }),
  blockquote: serializeStyle({
    'border-left': '3px solid #d6d9de',
    'padding-left': '1em',
    margin: '1em 0',
    color: '#555555',
    'font-size': '14px',
    'line-height': String(DEFAULTS.lineHeight),
  }),
  hr: serializeStyle({
    border: '0',
    'border-top': '1px solid #e5e7eb',
    margin: '1.25em 0',
    height: '0',
    background: 'transparent',
  }),
  strong: serializeStyle({
    'font-weight': '700',
    color: DEFAULTS.headingColor,
  }),
  b: serializeStyle({
    'font-weight': '700',
    color: DEFAULTS.headingColor,
  }),
  em: serializeStyle({
    'font-style': 'italic',
  }),
  i: serializeStyle({
    'font-style': 'italic',
  }),
  a: serializeStyle({
    color: '#576b95',
    'text-decoration': 'underline',
  }),
  img: serializeStyle({
    display: 'block',
    'max-width': '100%',
    width: '100%',
    height: 'auto',
    margin: '1em auto',
  }),
  table: serializeStyle({
    width: '100%',
    'border-collapse': 'collapse',
    margin: '1em 0',
  }),
  th: serializeStyle({
    border: '1px solid #e5e7eb',
    padding: '8px',
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
  }),
  td: serializeStyle({
    border: '1px solid #e5e7eb',
    padding: '8px',
    'font-size': `${DEFAULTS.fontSize}px`,
    'line-height': String(DEFAULTS.lineHeight),
    color: DEFAULTS.color,
  }),
};

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
    const style = STYLE_BY_TAG[tag];

    if (tag === 'span') {
      node.setAttribute('style', normalizeSpanStyle(node.getAttribute('style') || ''));
      continue;
    }

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
  const style = styleText.toLowerCase();
  const normalized: Record<string, string> = {};

  if (/(^|;)\s*font-weight\s*:\s*(700|800|900|bold)\b/.test(style)) {
    normalized['font-weight'] = '700';
    normalized.color = DEFAULTS.headingColor;
  }

  if (/(^|;)\s*font-style\s*:\s*italic\b/.test(style)) {
    normalized['font-style'] = 'italic';
  }

  if (/(^|;)\s*text-decoration\s*:\s*[^;]*underline/.test(style)) {
    normalized['text-decoration'] = 'underline';
  }

  return serializeStyle(normalized);
}

function serializeStyle(style: Record<string, string>) {
  return Object.entries(style)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}
