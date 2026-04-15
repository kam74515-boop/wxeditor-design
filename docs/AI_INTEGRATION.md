# WXEditor — AI 功能集成文档

> 本文档描述当前仓库中已经落地的 AI 主链路，而不是最终形态的愿景设计。
>
> 更新日期：2026-04-16

## 1. 概述

WXEditor 当前的编辑器 AI 主链路是：

```text
EditorView.vue
  → web/src/stores/ai.ts
  → POST /api/ai/chat
  → server/src/controllers/ai.ctrl.js
  → OpenAI-compatible Chat Completions
  → SSE 事件流
  → pendingActions
  → UEditor setContent / inserthtml
```

补充说明：

- `/api/ai/chat` 是编辑器主流程入口
- `/api/ai-agent/*` 目前保留为兼容/辅助接口，不是编辑器主链路中心

## 2. AI 模型

| 配置项 | 值 |
|--------|------|
| 模型供应商 | 阿里云通义千问（Dashscope） |
| 模型名称 | `qwen3.5-plus` |
| API 兼容协议 | OpenAI Chat Completions |
| 流式输出 | SSE |
| 工具调用 | Function Calling |

## 3. 后端模块

| 文件 | 职责 |
|------|------|
| `server/src/controllers/ai.ctrl.js` | 编辑器 AI 主入口，SSE + tools |
| `server/src/ai/tools.js` | 工具定义与参数兼容转换 |
| `server/src/ai/sse.js` | 共享的 provider SSE 转译层 |
| `server/src/ai/prompts.js` | 预定义 prompt 模板 |
| `server/src/ai/formatter.js` | AI HTML 收口与微信正文格式化 |
| `server/src/services/aiToolRun.service.js` | tool 执行审计记录 |
| `server/src/services/aiAgent.service.js` | 兼容的 agent SSE 服务 |

## 4. 主接口

### 4.1 `POST /api/ai/chat`

用于编辑器内 AI 对话与直接编辑。

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | string | Y | 用户消息 |
| `documentId` | string | N | 关联文档 ID |
| `context` | string | N | 当前文章 HTML/文本上下文 |
| `history` | string(JSON) | N | 最近历史消息 |
| `file` | File | N | 可选附件 |

说明：

- 后端会截断 `context`，避免主链路提示词无限膨胀
- 后端会将工具定义一起传给模型，启用真实 Function Calling
- 后端主链路与兼容链路共享同一套 SSE 转译逻辑，减少事件协议分叉
- `replace_editor_content` / `insert_content` 的 HTML 会先经过 `normalizeAgentHtml` 收口，默认压回“简洁文章风”

### 4.2 `GET /api/ai/history/:documentId/tool-runs`

用于调试或复盘 AI tool 的最终执行记录。

返回内容包括：

- `tool_name`
- 原始 `raw_args`
- 收口后的 `normalized_args`
- 关联模型与时间戳

### 4.3 `POST /api/ai/rewrite`

用于非编辑器主链路的单次改写请求。

适合：

- 润色
- 扩写
- 精简
- 自定义改写

## 5. v1 工具集

当前主链路只承诺 3 个稳定工具：

| 工具 | 参数 | 作用 |
|------|------|------|
| `replace_editor_content` | `{ html }` | 整篇替换编辑器内容 |
| `insert_content` | `{ html, position? }` | 在光标/开头/末尾插入内容 |
| `set_title` | `{ title }` | 设置文档标题 |

兼容规则：

- 若模型仍返回旧字段 `content`，后端会兼容转换成 `html`
- HTML 参数会在落到前端之前自动做一层文章化收口，去掉渐变卡片、阴影、过度居中和海报式装饰

## 6. SSE 事件协议

前端 AI Store 现在支持两种 SSE 形态：

1. 标准事件：

```text
event: content
data: {"text":"..."}
```

2. 兼容事件：

```text
data: {"type":"content","text":"..."}
```

主链路使用的事件如下：

| 事件 | 数据结构 | 说明 |
|------|------|------|
| `thinking` | `{ text }` | 可选，模型 reasoning 增量 |
| `content` | `{ text }` | 普通文本回复增量 |
| `tool_start` | `{ tool }` | 开始构造工具调用 |
| `tool_delta` | `{ tool, argumentsSoFar }` | 工具参数流式增量 |
| `tool_call` | `{ tool, args }` | 最终工具调用结果 |
| `done` | `{ reply, actions }` | 本轮结束 |
| `error` | `{ message }` | 错误 |

## 7. 前端消费方式

`web/src/stores/ai.ts` 负责：

1. 发起 `/api/ai/chat`
2. 解析 SSE
3. 将 `tool_call` 转成 `pendingActions`
4. 把 `streamingHtml` 提供给编辑器做临时预览

`web/src/views/EditorView.vue` 负责：

1. 监听 `streamingHtml`
2. 监听 `pendingActions`
3. 用 UEditor API 执行最终动作

## 8. 当前不包含的能力

以下能力不在当前主链路承诺范围内：

- 通用 Region 替换
- 选区级精确编辑
- SVG 模版智能适配
- MCP / Skill 分层执行
- 通用多步工具编排

这些能力需要在主链路稳定之后分阶段追加，详见：

- `docs/AI_AGENT_ARCHITECTURE.md`

## 9. 数据存储

AI 文本回复历史存储于 `ai_chats` 表，tool 执行审计单独存储于 `ai_tool_runs` 表。

当前策略：

- 有普通文本回复时写库
- tool 调用的原始参数与最终执行参数独立留档，便于复盘“生成为什么变丑”这类问题

## 10. 说明

如果后续继续扩展 AI 能力，优先级应保持为：

1. 先保证 `/api/ai/chat` 契约稳定
2. 再加局部编辑
3. 再加模板
4. 最后加 SVG 和高级 Agent 能力
