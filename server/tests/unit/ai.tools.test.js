const { getToolDefinitions, parseToolCall } = require('../../src/ai/tools');

describe('ai/tools', () => {
  it('should expose editor tool definitions', () => {
    const tools = getToolDefinitions();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.map((tool) => tool.function.name)).toEqual(
      expect.arrayContaining(['replace_editor_content', 'insert_content', 'set_title'])
    );
  });

  it('should normalize legacy content argument to html', () => {
    const parsed = parseToolCall({
      function: {
        name: 'replace_editor_content',
        arguments: JSON.stringify({ content: '<p>hello</p>' }),
      },
    });

    expect(parsed.tool).toBe('replace_editor_content');
    expect(parsed.args.html).toContain('<section style=');
    expect(parsed.args.html).toContain('<p style="font-size: 15px; line-height: 1.75; color: inherit; margin-bottom: 1em; text-align: left;">hello</p>');
  });

  it('should keep insert position while normalizing html', () => {
    const parsed = parseToolCall({
      function: {
        name: 'insert_content',
        arguments: JSON.stringify({ content: '<p>hello</p>', position: 'end' }),
      },
    });

    expect(parsed.tool).toBe('insert_content');
    expect(parsed.args.position).toBe('end');
    expect(parsed.args.html).toContain('<p style="font-size: 15px; line-height: 1.75; color: inherit; margin-bottom: 1em; text-align: left;">hello</p>');
    expect(parsed.args.html).not.toContain('<section style=');
  });

  it('should flatten decorative styles into article-friendly html', () => {
    const parsed = parseToolCall({
      function: {
        name: 'replace_editor_content',
        arguments: JSON.stringify({
          html: '<div style="display:flex;background:linear-gradient(90deg,#2E8B57,#87CEEB);box-shadow:0 8px 24px rgba(0,0,0,.2);border-radius:24px;"><p style="text-align:center;color:#87CEEB;font-size:24px;">🌊 夏日清凉出游指南</p></div>',
        }),
      },
    });

    expect(parsed.args.html).not.toContain('linear-gradient');
    expect(parsed.args.html).not.toContain('box-shadow');
    expect(parsed.args.html).not.toContain('display:flex');
    expect(parsed.args.html).not.toContain('font-size: 24px;');
    expect(parsed.args.html).toContain('text-align: center;');
  });

  it('should preserve restrained design blocks while removing flashy poster styles', () => {
    const parsed = parseToolCall({
      function: {
        name: 'replace_editor_content',
        arguments: JSON.stringify({
          html: '<section style="background:#111111;color:#ffffff;padding:30px 16px;border-radius:18px;"><p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.5px;">栏目提示</p><h2 style="text-align:center;color:#ffffff;">带一点设计感的正文</h2></section>',
        }),
      },
    });

    expect(parsed.args.html).toContain('background-color: #111111;');
    expect(parsed.args.html).toContain('padding: 30px 16px;');
    expect(parsed.args.html).toContain('border-radius: 18px;');
    expect(parsed.args.html).toContain('letter-spacing: 0.5px;');
    expect(parsed.args.html).toContain('text-align: center;');
  });
});
