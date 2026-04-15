const { parseToolCall } = require('./tools');

function writeSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function createProviderSSEForwarder({
  res,
  parseToolCallFn = parseToolCall,
  onThinkingDelta,
  onContentDelta,
  onAction,
  onComplete,
  onError,
} = {}) {
  let fullContent = '';
  const toolCalls = [];
  const startedToolIndexes = new Set();
  let providerBuffer = '';

  const processProviderPayload = (payload) => {
    if (!payload || payload === '[DONE]') return;

    try {
      const parsed = JSON.parse(payload);
      const choice = parsed.choices?.[0];
      const delta = choice?.delta || {};

      if (delta.reasoning_content) {
        writeSSEEvent(res, 'thinking', { text: delta.reasoning_content });
        onThinkingDelta?.(delta.reasoning_content);
      }

      if (delta.content) {
        fullContent += delta.content;
        writeSSEEvent(res, 'content', { text: delta.content });
        onContentDelta?.(delta.content, fullContent);
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const toolCallDelta of delta.tool_calls) {
          const idx = toolCallDelta.index ?? 0;

          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: toolCallDelta.id || `tc_${idx}`,
              function: { name: '', arguments: '' },
            };
          }

          if (toolCallDelta.id) {
            toolCalls[idx].id = toolCallDelta.id;
          }

          if (toolCallDelta.function?.name) {
            toolCalls[idx].function.name += toolCallDelta.function.name;
          }

          if (toolCallDelta.function?.arguments) {
            toolCalls[idx].function.arguments += toolCallDelta.function.arguments;
          }

          const toolName = toolCalls[idx].function.name;
          if (toolName && !startedToolIndexes.has(idx)) {
            startedToolIndexes.add(idx);
            writeSSEEvent(res, 'tool_start', { tool: toolName });
          }

          if (toolName && toolCalls[idx].function.arguments) {
            writeSSEEvent(res, 'tool_delta', {
              tool: toolName,
              argumentsSoFar: toolCalls[idx].function.arguments,
            });
          }
        }
      }
    } catch {}
  };

  const handleDataChunk = (chunk) => {
    providerBuffer += chunk.toString();
    const lines = providerBuffer.split('\n');
    providerBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      processProviderPayload(line.slice(6));
    }
  };

  const handleEnd = async () => {
    if (providerBuffer.startsWith('data: ')) {
      processProviderPayload(providerBuffer.slice(6));
    }
    providerBuffer = '';

    const actions = [];
    for (const toolCall of toolCalls) {
      if (!toolCall) continue;
      const parsed = parseToolCallFn(toolCall);
      if (!parsed) continue;

      actions.push(parsed);
      writeSSEEvent(res, 'tool_call', parsed);
      onAction?.(parsed);
    }

    const result = {
      reply: fullContent,
      actions,
      rawToolCalls: toolCalls.filter(Boolean),
    };
    await onComplete?.(result);
    writeSSEEvent(res, 'done', {
      reply: fullContent,
      actions,
    });
    res.end();
    return result;
  };

  const handleError = (err) => {
    onError?.(err);
    writeSSEEvent(res, 'error', { message: err.message });
    res.end();
  };

  return {
    handleDataChunk,
    handleEnd,
    handleError,
    getState: () => ({ reply: fullContent }),
  };
}

function pipeProviderStream(stream, res, options = {}) {
  const forwarder = createProviderSSEForwarder({ res, ...options });

  stream.on('data', (chunk) => {
    forwarder.handleDataChunk(chunk);
  });

  stream.on('end', () => {
    forwarder.handleEnd().catch((err) => {
      forwarder.handleError(err);
    });
  });

  stream.on('error', (err) => {
    forwarder.handleError(err);
  });

  return forwarder;
}

module.exports = {
  writeSSEEvent,
  createProviderSSEForwarder,
  pipeProviderStream,
};
