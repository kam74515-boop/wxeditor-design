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
    expect(html).not.toContain('font-size: 24px;');
    expect(html).toContain('text-align: center;');
  });

  it('keeps restrained editorial styling such as dark blocks and spacing', () => {
    const html = normalizeAgentHtml(`
      <section style="background:#111111;color:#ffffff;padding:30px 16px;border-radius:18px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.5px;text-align:left;">栏目提示</p>
        <h2 style="text-align:center;color:#ffffff;">这一段需要有设计感</h2>
        <p style="color:#ffffff;">正文保留在深色块里。</p>
      </section>
    `);

    expect(html).toContain('background-color: #111111;');
    expect(html).toContain('color: #ffffff;');
    expect(html).toContain('padding: 30px 16px;');
    expect(html).toContain('border-radius: 18px;');
    expect(html).toContain('letter-spacing: 0.5px;');
    expect(html).toContain('text-align: center;');
  });

  it('keeps insert fragments unwrapped when requested', () => {
    const html = normalizeAgentHtml('补一句结尾提醒', { wrapSections: false });

    expect(html).toContain('<p style=');
    expect(html).not.toContain('<section style=');
  });
});
