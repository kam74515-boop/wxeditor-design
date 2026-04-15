const db = require('../config/db');

const AiToolRunService = {
  async recordRuns({ documentId, userId, model, reply, rawToolCalls = [], actions = [] }) {
    if (!documentId || !userId || !Array.isArray(rawToolCalls) || rawToolCalls.length === 0) {
      return [];
    }

    const rows = rawToolCalls
      .map((toolCall, index) => {
        const action = actions[index];
        if (!toolCall?.function?.name || !action?.tool) return null;

        return {
          document_id: documentId,
          user_id: userId,
          tool_call_id: toolCall.id || null,
          tool_name: action.tool,
          raw_args: toolCall.function.arguments || '',
          normalized_args: JSON.stringify(action.args || {}),
          reply: reply || null,
          model: model || null,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return [];

    await db('ai_tool_runs').insert(rows);
    return rows;
  },

  async listRuns(documentId, userId, { limit = 20 } = {}) {
    const rows = await db('ai_tool_runs')
      .where({ document_id: documentId, user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      normalized_args: safeParseJson(row.normalized_args),
    }));
  },
};

function safeParseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

module.exports = AiToolRunService;
