const fs = require('fs');
const path = require('path');

const TEMPLATE_NAME = '先锋学会黑金代码模板';
const TEMPLATE_FILE_PATH = path.join(__dirname, 'assets', 'merged_fixed_copy_3.html');

function buildTemplateContent() {
  const rawHtml = fs.readFileSync(TEMPLATE_FILE_PATH, 'utf8');
  if (typeof rawHtml !== 'string' || !rawHtml.trim()) {
    throw new Error('模板源文件为空');
  }

  const withoutDoctype = rawHtml.replace(/<!doctype[\s\S]*?>/gi, '').trim();
  const bodyMatch = withoutDoctype.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = (bodyMatch ? bodyMatch[1] : withoutDoctype).trim();

  if (!content) {
    throw new Error('模板源文件缺少可用 body 内容');
  }

  return content;
}

function createTemplateDefinition() {
  return {
    name: TEMPLATE_NAME,
    description: '基于 merged_fixed copy 3.html 的重代码排版模板，保留黑金深色视觉、分节大标题、图文矩阵与复杂模块结构。',
    category: 'editorial',
    content: buildTemplateContent(),
    preview_image: 'https://cdn.jsdelivr.net/gh/kam74515-boop/pioneer-assets@main/images/poster_v2_01.png',
    tags: JSON.stringify(['黑金', '代码模板', '画册', '专题', '图文矩阵']),
    is_public: 1,
    status: 'active',
    use_count: 0,
    author_id: null,
  };
}

module.exports = {
  TEMPLATE_NAME,
  TEMPLATE_FILE_PATH,
  buildTemplateContent,
  createTemplateDefinition,
};
