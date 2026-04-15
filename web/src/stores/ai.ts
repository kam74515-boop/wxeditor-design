import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage } from '@/types';
import http from '@/utils/http';
import { extractStreamingHtmlArgument, normalizeStreamingPreviewHtml } from '@/utils/ai-html-preview';

// AI 返回的结构化编辑器操作
export interface EditorAction {
  tool: 'replace_editor_content' | 'insert_content' | 'set_title';
  args: {
    html?: string;
    title?: string;
    summary?: string;
  };
}

// 预设提示词模板
export interface PromptTemplate {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  needsContent: boolean;
}

export interface FrontendAIModel {
  id: string;
  display_name: string;
  is_default?: boolean;
}

export const promptTemplates: PromptTemplate[] = [
  { id: 'title', icon: 'Tt', label: '生成标题', prompt: '请为当前文章生成5个有吸引力的标题建议，并用 set_title 工具设置你认为最好的那个。', needsContent: true },
  { id: 'summary', icon: 'Sm', label: '生成摘要', prompt: '请为当前文章生成一段120字以内的摘要。', needsContent: true },
  { id: 'polish', icon: 'Ab', label: '润色全文', prompt: '请润色当前编辑器中的文章，使其更加流畅、专业，保持原意不变，用 replace_editor_content 工具写回。', needsContent: true },
  { id: 'expand', icon: 'Ex', label: '扩写内容', prompt: '请将当前文章适当扩展，添加更多细节和论述，用 replace_editor_content 工具写回。', needsContent: true },
  { id: 'simplify', icon: 'Rn', label: '精简内容', prompt: '请将当前文章简化，使其更加通俗易懂，用 replace_editor_content 工具写回。', needsContent: true },
  { id: 'outline', icon: 'Ol', label: '生成大纲', prompt: '请帮我为以下主题生成一份微信公众号文章大纲，包含标题建议和各段落要点：', needsContent: false },
  { id: 'hook', icon: 'Hk', label: '开头金句', prompt: '请为当前文章生成3个吸引读者的开头段落，用 insert_content 工具将最佳的一个插入到编辑器开头。', needsContent: true },
  { id: 'cta', icon: 'Ct', label: '结尾引导', prompt: '请为当前文章生成一段有感染力的结尾段落（含引导点赞转发关注的文案），用 insert_content 工具追加到编辑器末尾。', needsContent: true },
];

export const useAIStore = defineStore('ai', () => {
  const messages = ref<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是 AI 编辑助手\n\n我可以直接修改你的编辑器内容——就像 AI Coding 那样。\n\n试试对我说：\n• "写一篇关于 XX 的文章"\n• "润色一下当前文章"\n• "给文章加一个引人注目的开头"',
      timestamp: new Date(),
    },
  ]);

  const isLoading = ref(false);
  const isPanelOpen = ref(true);
  const currentDocumentId = ref<string>('');  // 当前绑定的文档 ID，用于 AI 记录隔离

  // 流式状态
  const thinkingText = ref('');           // AI 的思维过程
  const streamingContent = ref('');       // AI 的正文回复
  const isThinking = ref(false);          // 是否正在思考
  const currentToolName = ref('');        // 当前工具名
  const streamingHtml = ref('');          // 工具调用中流式累积的 HTML
  const currentAiMsgId = ref('');         // 当前正在生成的 AI 消息 ID

  // 流式体验增强
  type StreamPhase = 'idle' | 'thinking' | 'generating' | 'executing';
  const streamPhase = ref<StreamPhase>('idle');  // 三阶段进度
  const streamStats = ref({ chars: 0, elapsed: 0 });  // 统计信息
  let streamStartTime = 0;
  let statsTimer: ReturnType<typeof setInterval> | null = null;

  // 停止生成（AbortController）
  let currentAbortController: AbortController | null = null;

  // AI 返回的待执行编辑器操作队列
  const pendingActions = ref<EditorAction[]>([]);

  // 当前附件
  const attachedFile = ref<File | null>(null);
  const availableModels = ref<FrontendAIModel[]>([]);
  const selectedModel = ref('');
  const modelProviderLabel = ref('');

  const loadAvailableModels = async () => {
    try {
      const response: any = await http.get('/ai/models');
      const payload = response.data || {};
      const nextModels = Array.isArray(payload.models) ? payload.models : [];
      const validIds = new Set(nextModels.map((item: FrontendAIModel) => item.id));
      const savedModelId = localStorage.getItem('ai-selected-model') || '';
      const fallbackModelId = payload.default_model && validIds.has(payload.default_model)
        ? payload.default_model
        : nextModels[0]?.id || '';

      availableModels.value = nextModels;
      modelProviderLabel.value = payload.provider_name || '';
      selectedModel.value = savedModelId && validIds.has(savedModelId) ? savedModelId : fallbackModelId;

      if (selectedModel.value) {
        localStorage.setItem('ai-selected-model', selectedModel.value);
      } else {
        localStorage.removeItem('ai-selected-model');
      }
    } catch {
      availableModels.value = [];
      selectedModel.value = '';
      modelProviderLabel.value = '';
    }
  };

  const setSelectedModel = (modelId: string) => {
    selectedModel.value = modelId;
    if (modelId) {
      localStorage.setItem('ai-selected-model', modelId);
    } else {
      localStorage.removeItem('ai-selected-model');
    }
  };

  // 通过 SSE 流式发送消息（支持可选文件附件）
  const sendMessage = async (content: string, context?: string, file?: File, documentId?: string) => {
    // 显示用户消息（含附件提示）
    const displayContent = file
      ? `[附件] ${file.name}\n${content}`
      : content;

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: displayContent,
      timestamp: new Date(),
    };
    messages.value.push(userMessage);
    isLoading.value = true;
    thinkingText.value = '';
    streamingContent.value = '';
    streamingHtml.value = '';
    isThinking.value = false;
    currentToolName.value = '';

    // 先添加一个空的 AI 消息占位，用于流式更新
    const aiMsgId = String(Date.now() + 1);
    currentAiMsgId.value = aiMsgId;
    const aiMessage: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    messages.value.push(aiMessage);

    try {
      const history = messages.value.slice(0, -1).slice(-10).map(m => ({
        role: m.role as string,
        content: m.content,
      }));

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let body: FormData | string;

      if (file) {
        const formData = new FormData();
        formData.append('message', content);
        if (context) formData.append('context', context);
        if (documentId) formData.append('documentId', documentId);
        formData.append('history', JSON.stringify(history));
        if (selectedModel.value) formData.append('model', selectedModel.value);
        formData.append('file', file);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          message: content,
          context,
          documentId,
          history: JSON.stringify(history),
          ...(selectedModel.value ? { model: selectedModel.value } : {}),
        });
      }

      // 初始化流式体验状态
      currentAbortController = new AbortController();
      streamPhase.value = 'thinking';
      streamStartTime = Date.now();
      streamStats.value = { chars: 0, elapsed: 0 };
      // 启动计时器
      statsTimer = setInterval(() => {
        streamStats.value = {
          ...streamStats.value,
          elapsed: Math.round((Date.now() - streamStartTime) / 1000),
        };
      }, 500);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body,
        signal: currentAbortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      // 读取 SSE 流
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 将 buffer 按行分割，解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最后一个不完整的行保留在 buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const eventName = currentEvent || data.type;
              if (eventName) {
                handleSSEEvent(eventName, data, aiMsgId);
              }
            } catch {}
            currentEvent = '';
          }
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // 用户主动停止，更新消息
        const aiMsg = messages.value.find(m => m.id === aiMsgId);
        if (aiMsg) {
          aiMsg.content = aiMsg.content
            ? aiMsg.content + '\n\n[已停止生成]'
            : '[已停止生成]';
        }
      } else {
        const errorMsg = error?.message || '未知错误';
        const aiMsg = messages.value.find(m => m.id === aiMsgId);
        if (aiMsg) {
          aiMsg.content = `请求出错：${errorMsg}\n\n请前往管理面板 → AI 配置检查供应商设置是否正确。`;
        }
      }
    } finally {
      // 如果发生报错并且是空消息则可以给出报错，但不需要为正常请求强行兜底文字

      isLoading.value = false;
      isThinking.value = false;
      currentToolName.value = '';
      streamPhase.value = 'idle';
      currentAbortController = null;
      if (statsTimer) { clearInterval(statsTimer); statsTimer = null; }
    }
  };

  // 处理 SSE 事件
  function handleSSEEvent(event: string, data: any, aiMsgId: string) {
    console.log('[SSE]', event, data);
    switch (event) {
      case 'thinking':
        isThinking.value = true;
        streamPhase.value = 'thinking';
        thinkingText.value += data.text || data.content || '';
        break;

      case 'content':
        isThinking.value = false;
        streamPhase.value = 'generating';
        streamingContent.value += data.text || data.content || '';
        streamStats.value = { ...streamStats.value, chars: streamingContent.value.length };
        // 实时渲染普通文本内容（推文思路等）
        updateAIMessage(aiMsgId, streamingContent.value);
        break;

      case 'tool_start':
        isThinking.value = false;
        streamPhase.value = 'executing';
        currentToolName.value = data.tool;
        _toolStarted = true;
        // 不再覆盖聊天消息文字，保留 AI 前面的文本内容
        break;

      case 'tool_delta':
        // 工具参数流式到达：实时更新 streamingHtml 供编辑器渲染（打字机效果）
        if (data.tool === 'replace_editor_content' || data.tool === 'insert_content') {
          const extractedHtml = extractStreamingHtmlArgument(data.argumentsSoFar || '');
          if (extractedHtml !== null) {
            streamingHtml.value = normalizeStreamingPreviewHtml(extractedHtml, {
              wrapSections: data.tool === 'replace_editor_content',
            });
          }
        }
        break;

      case 'tool_call':
        if (data.tool && data.args) {
          pendingActions.value = [...pendingActions.value, { tool: data.tool, args: data.args }];
        }
        currentToolName.value = '';
        streamingHtml.value = '';
        break;

      case 'done': {
        const hasEditorAction = _toolStarted || data.actions?.some(
          (a: any) => ['replace_editor_content', 'insert_content'].includes(a.tool)
        );

        // 将思维链保存到消息中
        const aiMsg = messages.value.find(m => m.id === aiMsgId);
        if (aiMsg && thinkingText.value) {
          aiMsg.thinking = thinkingText.value;
        }

        if (hasEditorAction) {
          // 如果流式传输期间有内容（比如推文思路），就展示内容，否则才清空
          updateAIMessage(aiMsgId, streamingContent.value || '');
        } else if (data.reply) {
          // 纯文字对话：显示完整回复
          updateAIMessage(aiMsgId, data.reply);
        }
        
        if (data.actions?.length > 0 && pendingActions.value.length === 0) {
          pendingActions.value = data.actions;
        }
        _toolStarted = false;
        break;
      }

      case 'error':
        updateAIMessage(aiMsgId, `AI 错误：${data.message || data.error || '未知错误'}`);
        _toolStarted = false;
        break;
    }
  }

  // 标记：本轮对话是否已经触发了工具调用
  let _toolStarted = false;

  // 更新指定 AI 消息的内容
  function updateAIMessage(id: string, content: string) {
    const msg = messages.value.find(m => m.id === id);
    if (msg) {
      msg.content = content;
    }
  }

  // 快捷提示词发送
  const sendQuickPrompt = async (template: PromptTemplate, articleContent?: string, documentId?: string) => {
    let fullPrompt = template.prompt;
    if (template.needsContent && articleContent) {
      const truncated = articleContent.replace(/<[^>]*>/g, '').substring(0, 3000);
      fullPrompt += '\n\n' + truncated;
    } else if (template.needsContent && !articleContent) {
      fullPrompt += '\n\n（当前文章暂无内容，请先输入一些文字）';
    }
    await sendMessage(fullPrompt, articleContent, undefined, documentId);
  };

  const togglePanel = () => {
    isPanelOpen.value = !isPanelOpen.value;
  };

  // 停止生成
  const stopGeneration = () => {
    if (currentAbortController) {
      currentAbortController.abort();
    }
  };

  const clearMessages = () => {
    messages.value = [];
    thinkingText.value = '';
    streamingContent.value = '';
    attachedFile.value = null;
    streamPhase.value = 'idle';
    streamStats.value = { chars: 0, elapsed: 0 };
    currentAiMsgId.value = '';
  };

  /**
   * 切换文档时调用：清空当前聊天并加载目标文档的 AI 历史
   * 实现项目级 AI 记录隔离
   */
  const switchDocument = async (docId: string) => {
    if (currentDocumentId.value === docId) return;
    currentDocumentId.value = docId;

    // 清空当前消息
    clearMessages();

    // 添加默认欢迎消息
    messages.value.push({
      id: '1',
      role: 'assistant',
      content: '你好！我是 AI 编辑助手\n\n我可以直接修改你的编辑器内容——就像 AI Coding 那样。\n\n试试对我说：\n• "写一篇关于 XX 的文章"\n• "润色一下当前文章"\n• "给文章加一个引人注目的开头"',
      timestamp: new Date(),
    });

    // 从后端加载该文档的 AI 聊天历史
    if (docId) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/ai/history/${docId}?limit=50`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            // 用历史记录替换默认欢迎消息
            messages.value = data.data.map((chat: any, i: number) => ({
              id: String(chat.id || i),
              role: chat.role as 'user' | 'assistant',
              content: chat.content,
              timestamp: new Date(chat.created_at),
            }));
          }
        }
      } catch (e) {
        console.error('加载 AI 聊天历史失败:', e);
      }
    }
  };

  return {
    messages,
    isLoading,
    isPanelOpen,
    pendingActions,
    thinkingText,
    streamingContent,
    streamingHtml,
    isThinking,
    currentToolName,
    currentAiMsgId,
    attachedFile,
    streamPhase,
    streamStats,
    currentDocumentId,
    availableModels,
    selectedModel,
    modelProviderLabel,
    sendMessage,
    sendQuickPrompt,
    loadAvailableModels,
    setSelectedModel,
    togglePanel,
    stopGeneration,
    clearMessages,
    switchDocument,
  };
});
