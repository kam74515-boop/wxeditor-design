const { buildTemplateStyleGuide } = require('../../src/ai/templateStyleGuide');

describe('ai/templateStyleGuide', () => {
  it('builds palette and structure hints from template html', () => {
    const html = `
      <section style="background:#000;color:#fff;padding:28px 18px;border-radius:16px;">
        <p style="font-size:12px;letter-spacing:1.2px;color:#fff;">SECTION 01</p>
        <h3 style="font-size:20px;color:#fff;">标题</h3>
        <section style="border:1px solid rgba(255,255,255,0.12);padding:18px 16px;border-radius:12px;">
          <p style="font-size:14px;color:rgba(255,255,255,0.76);">总结内容</p>
        </section>
        <img src="https://example.com/cover.png" />
      </section>
    `;

    const guide = buildTemplateStyleGuide(html);

    expect(guide).toContain('模板色板参考');
    expect(guide).toContain('#000000');
    expect(guide).toContain('#ffffff');
    expect(guide).toContain('模板结构特征');
    expect(guide).toContain('标签小标题');
    expect(guide).toContain('深色块面章节');
    expect(guide).toContain('圆角信息框');
    expect(guide).toContain('可复用图片资源');
    expect(guide).toContain('执行要求');
  });

  it('returns empty string when template content is invalid', () => {
    expect(buildTemplateStyleGuide('')).toBe('');
    expect(buildTemplateStyleGuide(null)).toBe('');
  });
});
