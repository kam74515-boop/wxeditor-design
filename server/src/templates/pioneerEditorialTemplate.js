const TEMPLATE_NAME = '先锋黑色画册';

function buildTemplateContent() {
  return `
<section data-template-style="pioneer-editorial" style="margin:0;padding:0;background:#000000;color:#ffffff;line-height:1.8;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','PingFang SC',Arial,sans-serif;">
  <section style="margin:0;padding:0;line-height:0;font-size:0;">
    <img src="https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/cover_new.png" style="width:100%;height:auto;display:block;" />
  </section>

  <section style="padding:28px 18px 8px;box-sizing:border-box;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.2px;color:#ffffff;">[专题标签]</p>
    <h2 style="margin:0 0 12px;font-size:28px;line-height:1.35;font-weight:700;color:#ffffff;">[主标题]</h2>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:rgba(255,255,255,0.88);">在这里写一段导语。适合用于案例发布、专题长文、作品集展示或展览式内容开场，让读者在第一屏就进入画册化阅读节奏。</p>
    <p style="margin:0;font-size:13px;line-height:1.8;color:rgba(255,255,255,0.56);">副标题 / 时间 / 项目说明</p>
  </section>

  <section style="margin:24px 0 0;padding:0;line-height:0;font-size:0;">
    <img src="https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/export_section01_v2.png" style="width:100%;height:auto;display:block;" />
  </section>

  <section style="padding:32px 18px 10px;box-sizing:border-box;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.2px;color:#ffffff;">SECTION 01</p>
    <h3 style="margin:0 0 12px;font-size:20px;line-height:1.5;font-weight:700;color:#ffffff;">[章节标题]</h3>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:rgba(255,255,255,0.88);">这里适合写章节说明、项目背景、方法摘要或策展式引导文字。文字不需要太多，但要有明确节奏。</p>
  </section>

  <section style="padding:0 18px 28px;box-sizing:border-box;">
    <section style="margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">案例画面 ▼</p>
      <img src="https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/poster_v2_01.png" style="width:100%;height:auto;display:block;" />
    </section>

    <section style="margin:0 0 20px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">图像拆解 ▼</p>
      <div style="display:flex;gap:4px;">
        <div style="flex:1;">
          <img src="https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/space_deconstruct_1.jpg" style="width:100%;height:auto;display:block;" />
        </div>
        <div style="flex:1;">
          <img src="https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/space_deconstruct_2.jpg" style="width:100%;height:auto;display:block;" />
        </div>
      </div>
    </section>

    <section style="margin:0;background:#111111;border:1px solid rgba(255,255,255,0.12);padding:18px 16px;border-radius:16px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;color:#ffffff;">SUMMARY</p>
      <p style="margin:0;font-size:14px;line-height:1.9;color:rgba(255,255,255,0.76);">这一块适合写总结、方法论、洞察或展签式说明。它保留了深色画册的气质，但内容上仍然是可编辑的文章模块。</p>
    </section>
  </section>

  <section style="padding:30px 18px 36px;box-sizing:border-box;border-top:1px solid rgba(255,255,255,0.12);">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.2px;color:#ffffff;">SECTION 02</p>
    <h3 style="margin:0 0 12px;font-size:20px;line-height:1.5;font-weight:700;color:#ffffff;">[结尾章节]</h3>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:rgba(255,255,255,0.88);">这里可以放结尾总结、下一步动作、联系方式或延伸阅读。整体风格适合做“深色专题”“作品发布”“案例集锦”这类更有画面感的排版。</p>
    <p style="margin:0;font-size:13px;line-height:1.8;color:rgba(255,255,255,0.56);">文末信息 / 品牌署名 / CTA</p>
  </section>
</section>`.trim();
}

function createTemplateDefinition() {
  return {
    name: TEMPLATE_NAME,
    description: '参考 merged_fixed copy 8.html 收敛出的深色画册风模板，适合专题长文、案例集、作品展示等需要明显设计感的内容。',
    category: 'editorial',
    content: buildTemplateContent(),
    preview_image: 'https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/cover_new.png',
    tags: JSON.stringify(['画册', '深色', '案例', '专题', '作品集']),
    is_public: 1,
    status: 'active',
    use_count: 0,
    author_id: null,
  };
}

module.exports = {
  TEMPLATE_NAME,
  buildTemplateContent,
  createTemplateDefinition,
};
