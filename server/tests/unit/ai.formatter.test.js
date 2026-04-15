const { normalizeAgentHtml } = require('../../src/ai/formatter');

describe('ai/formatter normalizeAgentHtml', () => {
  it('rewrites poster-like blocks into article-friendly layout', () => {
    const html = normalizeAgentHtml(`
      <div style="display:flex;background:linear-gradient(90deg,#2E8B57,#87CEEB);box-shadow:0 8px 24px rgba(0,0,0,.2);border-radius:24px;">
        <p style="text-align:center;color:#87CEEB;font-size:24px;">🌊 夏日清凉出游指南</p>
      </div>
    `);

    expect(html).toContain('<section style=');
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('box-shadow');
    expect(html).not.toContain('display:flex');
    expect(html).toContain('text-align: left;');
  });

  it('keeps insert fragments unwrapped when requested', () => {
    const html = normalizeAgentHtml('补一句结尾提醒', { wrapSections: false });

    expect(html).toContain('<p style=');
    expect(html).not.toContain('<section style=');
  });
});
