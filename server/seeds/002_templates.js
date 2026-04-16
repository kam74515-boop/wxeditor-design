/**
 * Seed: 基础模板
 */

const { createTemplateDefinition } = require('../src/templates/pioneerEditorialTemplate');
const { createTemplateDefinition: createPioneerCodeTemplateDefinition } = require('../src/templates/pioneerCodeTemplate');

const basicTemplates = [
  {
    name: '简约商务',
    description: '适合企业通知、商务文案，简洁大方',
    category: 'business',
    content: `<section style="max-width:100%;box-sizing:border-box;font-size:15px;line-height:1.75;color:#333;">
<h2 style="font-size:19px;font-weight:bold;color:#1a1a1a;line-height:1.75;margin-top:1.2em;margin-bottom:0.4em;">标题</h2>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">在此输入正文内容。简约商务风格适合正式的企业公告、商务合作等内容。</p>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">段落之间保持适当间距，确保移动端阅读体验。</p>
<section style="border-left:3px solid #1890ff;padding-left:1em;margin:1em 0;color:#666;font-size:14px;">
<p style="font-size:14px;line-height:1.75;color:#666;margin-bottom:0.5em;">引用内容或重要提示信息</p>
</section>
</section>`,
    tags: JSON.stringify(['商务', '简约', '企业']),
    is_public: 1,
    status: 'active',
  },
  {
    name: '文艺清新',
    description: '适合生活方式、旅行摄影等文艺类文章',
    category: 'lifestyle',
    content: `<section style="max-width:100%;box-sizing:border-box;font-size:15px;line-height:1.75;color:#555;">
<h2 style="font-size:18px;font-weight:bold;color:#8b7355;line-height:1.75;margin-top:1.2em;margin-bottom:0.4em;">温柔的标题</h2>
<p style="font-size:15px;line-height:1.75;color:#555;margin-bottom:1em;">用细腻的文字，记录生活中的美好瞬间。每一帧画面都值得被珍藏。</p>
<p style="font-size:15px;line-height:1.75;color:#555;margin-bottom:1em;">阳光穿过树叶的缝隙，在地面上洒下斑驳的光影。</p>
<p style="font-size:14px;line-height:1.75;color:#999;margin-top:2em;text-align:center;">— 生活不止眼前的苟且 —</p>
</section>`,
    tags: JSON.stringify(['文艺', '清新', '生活']),
    is_public: 1,
    status: 'active',
  },
  {
    name: '科技前沿',
    description: '适合科技资讯、产品发布等内容',
    category: 'tech',
    content: `<section style="max-width:100%;box-sizing:border-box;font-size:15px;line-height:1.75;color:#333;">
<h2 style="font-size:19px;font-weight:bold;color:#0066cc;line-height:1.75;margin-top:1.2em;margin-bottom:0.4em;">技术标题</h2>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">科技改变世界，创新引领未来。本文将为您深入解析最新技术趋势。</p>
<h3 style="font-size:17px;font-weight:bold;color:#1a1a1a;line-height:1.75;margin-top:1em;margin-bottom:0.3em;">核心亮点</h3>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">详细内容展示区，支持图文混排。</p>
<section style="background:#f5f7fa;padding:1em;border-radius:4px;margin:1em 0;">
<p style="font-size:14px;line-height:1.75;color:#666;margin-bottom:0;"><strong>提示：</strong>关键信息高亮展示区域</p>
</section>
</section>`,
    tags: JSON.stringify(['科技', '互联网', '产品']),
    is_public: 1,
    status: 'active',
  },
  {
    name: '教育学习',
    description: '适合教程、知识科普、在线课程等内容',
    category: 'education',
    content: `<section style="max-width:100%;box-sizing:border-box;font-size:15px;line-height:1.75;color:#333;">
<h2 style="font-size:19px;font-weight:bold;color:#2d8cf0;line-height:1.75;margin-top:1.2em;margin-bottom:0.4em;">课程标题</h2>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">学习是一个持续的过程。今天我们来了解一个重要的知识点。</p>
<h3 style="font-size:17px;font-weight:bold;color:#1a1a1a;line-height:1.75;margin-top:1em;margin-bottom:0.3em;">一、基础知识</h3>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">基础概念的详细解释，配合示例说明。</p>
<h3 style="font-size:17px;font-weight:bold;color:#1a1a1a;line-height:1.75;margin-top:1em;margin-bottom:0.3em;">二、进阶内容</h3>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">深入理解核心原理，掌握实际应用方法。</p>
<section style="background:#fff8e6;padding:1em;border-left:3px solid #faad14;margin:1em 0;">
<p style="font-size:14px;line-height:1.75;color:#8c6d1f;margin-bottom:0;">注意：重要的学习提醒和注意事项</p>
</section>
</section>`,
    tags: JSON.stringify(['教育', '教程', '学习']),
    is_public: 1,
    status: 'active',
  },
  {
    name: '节日活动',
    description: '适合节日祝福、活动推广、营销宣传等内容',
    category: 'marketing',
    content: `<section style="max-width:100%;box-sizing:border-box;font-size:15px;line-height:1.75;color:#333;">
<h2 style="font-size:22px;font-weight:bold;color:#e74c3c;line-height:1.75;margin-top:0;margin-bottom:0.5em;text-align:center;">活动主标题</h2>
<p style="font-size:14px;line-height:1.75;color:#999;margin-bottom:1.5em;text-align:center;">副标题 · 2024特别企划</p>
<section style="background:linear-gradient(135deg,#fff5f5,#fff0e6);padding:1.5em;border-radius:8px;margin:1em 0;">
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">活动内容描述区域，突出亮点和优惠信息。</p>
<p style="font-size:16px;line-height:1.75;color:#e74c3c;font-weight:bold;margin-bottom:0;text-align:center;">限时优惠 · 不容错过</p>
</section>
<p style="font-size:15px;line-height:1.75;color:#333;margin-bottom:1em;">活动规则说明，详细介绍参与方式和注意事项。</p>
<p style="font-size:14px;line-height:1.75;color:#999;margin-top:1.5em;text-align:center;">活动最终解释权归主办方所有</p>
</section>`,
    tags: JSON.stringify(['活动', '营销', '节日']),
    is_public: 1,
    status: 'active',
  },
  createTemplateDefinition(),
  createPioneerCodeTemplateDefinition(),
];

exports.seed = async function (knex) {
  // 清除旧模板
  await knex('templates').del();

  for (const tpl of basicTemplates) {
    await knex('templates').insert({
      ...tpl,
      preview_image: tpl.preview_image || '',
      use_count: tpl.use_count || 0,
      author_id: tpl.author_id || null,
    });
  }

  console.log(`Inserted ${basicTemplates.length} basic templates`);
};
