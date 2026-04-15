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
      description: '整体替换正文内容。默认输出简洁、可读的公众号文章排版，优先使用标题、小标题、段落、列表，不要海报式大标题区、渐变卡片墙、过多阴影或密集 emoji。',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: '新的正文 HTML。适合微信文章阅读，结构清晰，样式克制；除非用户明确要求，否则不要使用大面积居中、渐变背景、装饰分割线或复杂多列卡片。',
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
      description: '在正文中插入一段补充内容。默认保持与上下文一致的文章风格，适合插入导语、过渡段、结尾或列表，不要生成整页海报式模块。',
      parameters: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description: '要插入的 HTML 片段。优先生成自然的段落、小标题、列表等正文片段，保持样式简洁。',
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
