/**
 * AI Tool Call 定义
 * 用于 AI Agent 与编辑器交互
 */

const { normalizeAgentHtml } = require('./formatter');

const TOOLS = {
  replace_editor_content: {
    type: 'function',
    function: {
      name: 'replace_editor_content',
      description: '整体替换正文内容。默认输出有编辑设计感的公众号文章排版，优先使用标题、小标题、段落、留白、图片引导和少量强调块来建立层次，不要海报式大标题区、渐变卡片墙、过多阴影或密集 emoji。若上下文提供参考模板，必须继承模板视觉语言并落地至少 3 处可见设计模块。',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: '新的正文 HTML。适合微信文章阅读，结构清晰且有轻度设计感；可以少量使用深浅块面、实色信息框、图注式小标题或克制的标题居中，但除非用户明确要求，否则不要使用大面积渐变、阴影、装饰分割线或复杂多列卡片。若有模板参考，请至少体现 3 处模板中的版式特征。',
          },
        },
        required: ['html'],
      },
    },
  },

  insert_content: {
    type: 'function',
    function: {
      name: 'insert_content',
      description: '在正文中插入一段补充内容。默认保持与上下文一致的文章风格和设计语言，适合插入导语、过渡段、结尾、图片说明或小型强调块，不要生成整页海报式模块。若上下文包含模板风格，请沿用该风格。',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: '要插入的 HTML 片段。优先生成自然的段落、小标题、列表、引用或小型强调块，保持文章式设计感，而不是孤立的大卡片。',
          },
          position: {
            type: 'string',
            enum: ['cursor', 'start', 'end'],
            description: '插入位置：光标处(cursor)、开头(start)、末尾(end)',
            default: 'cursor',
          },
        },
        required: ['html'],
      },
    },
  },

  set_title: {
    type: 'function',
    function: {
      name: 'set_title',
      description: '设置文档标题',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '新的文档标题',
          },
        },
        required: ['title'],
      },
    },
  },
};

/**
 * 获取所有工具定义（OpenAI function calling格式）
 */
function getToolDefinitions() {
  return Object.values(TOOLS);
}

/**
 * 根据名称获取工具定义
 */
function getToolByName(name) {
  return TOOLS[name] || null;
}

/**
 * 解析工具调用结果，返回前端可执行的操作
 */
function parseToolCall(toolCall) {
  const name = toolCall.function?.name;
  const def = getToolByName(name);
  if (!def) return null;

  try {
    const rawArgs = JSON.parse(toolCall.function.arguments);
    const args = normalizeToolArguments(name, rawArgs);
    return { tool: name, args };
  } catch {
    return null;
  }
}

function normalizeToolArguments(name, args = {}) {
  const normalized = { ...args };

  if ((name === 'replace_editor_content' || name === 'insert_content') && !normalized.html && normalized.content) {
    normalized.html = normalized.content;
  }

  if ((name === 'replace_editor_content' || name === 'insert_content') && typeof normalized.html === 'string') {
    normalized.html = normalizeAgentHtml(normalized.html, {
      wrapSections: name === 'replace_editor_content',
    });
  }

  if (name === 'set_title' && typeof normalized.title === 'string') {
    normalized.title = normalized.title.trim();
  }

  delete normalized.content;
  return normalized;
}

module.exports = { TOOLS, getToolDefinitions, getToolByName, parseToolCall };
