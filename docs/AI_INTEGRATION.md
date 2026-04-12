# WXEditor — AI 功能集成文档

> 本文档描述 AI 写作助手的技术实现细节，包括 API 对接、功能列表和配置说明。

## 1. 概述

WXEditor 集成了 AI 写作助手功能，帮助用户高效创作微信公众号文章。AI 功能采用**双通道架构**：

- **前端直连**（`stores/ai.ts`）：通义千问 Dashscope API，用于实时对话
- **后端转发**（`routes/ai.js`）：OpenAI 兼容 API，用于文章改写并存储历史

```
┌────────────────┐     ┌──────────────────────┐
│  前端 AI Store  │────→│  Dashscope API       │
│  (实时对话)      │     │  (前端直连)            │
└────────────────┘     └──────────────────────┘

┌────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  前端 API 调用   │────→│  /api/ai/*       │────→│  Dashscope API   │
│  (文章改写)      │     │  (后端转发+存储)  │     │  (OpenAI 兼容)    │
└────────────────┘     └──────────────────┘     └──────────────────┘
```

## 2. AI 模型

| 配置项 | 值 |
|--------|------|
| **模型供应商** | 阿里云通义千问（Dashscope） |
| **模型名称** | `qwen3.5-plus` |
| **API 兼容协议** | OpenAI Chat Completions |
| **前端 API 地址** | `https://coding.dashscope.aliyuncs.com/v1` |
| **后端 API 地址** | 由环境变量 `OPENAI_BASE_URL` 配置 |

## 3. 功能列表

### 3.1 智能对话（`POST /api/ai/chat`）

根据当前文档上下文进行 AI 对话：

**请求体**：
```json
{
  "message": "帮我写一段关于春天的开头",
  "documentId": "doc_123",
  "context": "<p>文章正文内容...</p>",
  "history": [
    { "role": "user", "content": "之前的消息" },
    { "role": "assistant", "content": "之前的回复" }
  ]
}
```

**System Prompt**：
> 你是一个专业的微信公众号文章编写助手。你帮助用户撰写、优化和编辑微信公众号文章。

**能力**：
- 润色和改写文章
- 生成标题建议
- 优化文章结构
- 提供 SEO 建议
- 生成摘要
- 生成微信兼容 HTML

**特性**：
- 自动截取文档上下文前 3000 字符
- 保留最近 10 条对话作为历史上下文
- 对话记录自动存储至 `ai_chats` 表

### 3.2 文章改写（`POST /api/ai/rewrite`）

**请求体**：
```json
{
  "content": "<p>需要改写的内容...</p>",
  "action": "polish",
  "customPrompt": "自定义提示词（可选）"
}
```

**支持的操作类型**：

| action 值 | 说明 | 输出格式 |
|-----------|------|----------|
| `polish` | 文章润色（默认） | HTML |
| `simplify` | 内容简化 | HTML |
| `expand` | 内容扩展 | HTML |
| `title` | 标题生成（5 个） | JSON 数组 |
| `summary` | 摘要生成（120 字内） | 纯文本 |

**内容限制**：最多处理前 5000 字符

### 3.3 聊天历史（`GET /api/ai/history/:documentId`）

获取指定文档的 AI 对话历史。

**查询参数**：
- `limit`：返回条数（默认 50）

**响应**：
```json
{
  "success": true,
  "data": [
    { "id": 1, "role": "user", "content": "...", "created_at": "..." },
    { "id": 2, "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

## 4. 前端 AI Store

`web/src/stores/ai.ts` 实现了前端直连 AI 的能力：

### 状态

| 属性 | 类型 | 说明 |
|------|------|------|
| `messages` | `ChatMessage[]` | 对话消息列表 |
| `isLoading` | `boolean` | 加载状态 |
| `isPanelOpen` | `boolean` | 面板显示状态 |

### 方法

| 方法 | 说明 |
|------|------|
| `sendMessage(content)` | 发送消息并获取 AI 回复 |
| `togglePanel()` | 切换面板显示 |
| `clearMessages()` | 清空对话 |

### 代码提取

AI 回复中的代码块会自动提取：
```typescript
// 匹配 ```html、```css、```javascript 等代码块
const codeMatch = content.match(/```(?:html|css|javascript|js)?\s*\n([\s\S]*?)```/);
```

提取的代码块存储在 `ChatMessage.code` 字段，前端可提供"插入到编辑器"功能。

## 5. 环境变量配置

### 后端配置（`server/.env`）

```env
# AI API 配置（通义千问 Dashscope）
OPENAI_API_KEY=sk-your-dashscope-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.5-plus
```

### 前端配置（`web/src/stores/ai.ts`）

> ⚠️ 当前前端 API Key 硬编码在源代码中，生产环境应迁移至后端代理或环境变量。

```typescript
const API_BASE = 'https://coding.dashscope.aliyuncs.com/v1';
const API_KEY = 'sk-xxx';  // 应迁移至环境变量
const MODEL = 'qwen3.5-plus';
```

## 6. 数据存储

AI 聊天记录存储在 SQLite `ai_chats` 表中：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| document_id | TEXT | 关联文档 ID |
| user_id | INTEGER | 用户 ID |
| role | TEXT | `user` / `assistant` / `system` |
| content | TEXT | 消息内容 |
| created_at | DATETIME | 创建时间 |

## 7. 待优化项

| 优先级 | 项目 | 说明 |
|--------|------|------|
| 🔴 高 | API Key 安全 | 前端 API Key 应迁移至后端统一代理 |
| 🟡 中 | 流式输出 | 支持 SSE/Stream 实时打字效果 |
| 🟡 中 | Token 用量统计 | 记录并限制每日 AI 调用量 |
| 🟢 低 | 多模型切换 | 支持用户选择不同 AI 模型 |
