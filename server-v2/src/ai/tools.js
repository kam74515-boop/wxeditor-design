/**
 * AI Tool Call 定义
 * 用于 AI Agent 与编辑器交互
 */

const TOOLS = {
  replace_editor_content: {
    type: 'function',
    function: {
      name: 'replace_editor_content',
      description: '替换编辑器中的全部内容',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '新的编辑器内容（HTML格式）',
          },
        },
        required: ['content'],
      },
    },
  },

  insert_content: {
    type: 'function',
    function: {
      name: 'insert_content',
      description: '在编辑器光标位置插入内容',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '要插入的内容（HTML格式）',
          },
          position: {
            type: 'string',
            enum: ['cursor', 'start', 'end'],
            description: '插入位置：光标处(cursor)、开头(start)、末尾(end)',
            default: 'cursor',
          },
        },
        required: ['content'],
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
    const args = JSON.parse(toolCall.function.arguments);
    return { name, arguments: args };
  } catch {
    return null;
  }
}

module.exports = { TOOLS, getToolDefinitions, getToolByName, parseToolCall };
