# WxEditor AI 智能体优化方案

> 基于现有 SSE 流式 + Function Calling 架构，从生成体验、内容质量、交互设计三个维度系统性优化。

---

## 一、生成体验优化

### 1.1 停止生成

**问题**：用户发送后无法中断，长文生成时只能干等。

**方案**：
- 前端 `sendMessage` 使用 `AbortController`
- AI 面板增加「停止生成」按钮
- 后端 SSE 连接断开时自动 `stream.controller.abort()`

```typescript
// ai.ts
const controller = new AbortController();
const response = await fetch('/api/ai/chat', {
  signal: controller.signal,
  // ...
});

// 暴露 stopGeneration 方法
function stopGeneration() {
  controller.abort();
  isLoading.value = false;
}
```

### 1.2 打字机效果

**问题**：流式内容整块替换到编辑器，视觉突兀。

**方案**：
- `tool_delta` 事件到达时，按字符逐帧写入而非一次性 innerHTML
- 使用 `requestAnimationFrame` 节流渲染

```typescript
// 逐字打字效果
let charIndex = 0;
function typewriterRender(html: string) {
  const tick = () => {
    if (charIndex >= html.length) return;
    const chunk = html.slice(0, ++charIndex);
    editor.setContent(chunk);
    requestAnimationFrame(tick);
  };
  tick();
}
```

### 1.3 进度感知

**问题**：用户不知道 AI 当前在干什么。

**方案**：三阶段进度条
| 阶段 | 指示 | 说明 |
|------|------|------|
| 思考 | 紫色脉冲 + 思维链展示 | 模型正在规划 |
| 生成 | 绿色流式 + 字数计数 | 正在产出内容 |
| 执行 | 蓝色执行指示器 | 正在写入编辑器 |

---

## 二、内容质量优化

### 2.1 System Prompt 工程

**核心策略**：通过精细化的系统提示词控制生成质量。

```javascript
// server/routes/ai.js — 优化后的系统提示词
const systemPrompt = `你是一位资深微信公众号编辑，擅长撰写高质量自媒体内容。

## 写作规范
- 标题：14字以内，含数字或情感词，制造好奇心
- 开头：首段50字内抓住注意力（悬念/数据/痛点）
- 结构：每段不超过4行，善用小标题分段
- 语气：专业但不学术，轻松但不随意
- 结尾：自然引导互动（提问/投票/转发）

## 排版要求
- 段落间留1行空行
- 重要观点加粗，不超过全文5%
- 列表用 • 圆点而非数字编号
- 引用用 blockquote 标签

## 禁忌
- 不用"总而言之""综上所述"等陈旧过渡词
- 不堆砌形容词
- 不写空洞的口号式结尾
- 每句话自检：删掉这句话文章是否受损？不受损就删`;
```

### 2.2 Few-Shot 模板

**问题**：AI 生成的公众号文章排版不够精细。

**方案**：在 system prompt 中嵌入优秀文章的 HTML 模板作为示范。

```javascript
const fewShotExample = `
## 优秀文章范例（HTML 结构）

<section style="padding: 16px 20px;">
  <h2 style="font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;">
    为什么 90% 的人坚持不下来？
  </h2>
  <p style="font-size: 15px; line-height: 2; color: #333; margin-bottom: 16px;">
    不是因为懒，而是因为<strong>反馈回路太长</strong>。
  </p>
  <blockquote style="border-left: 3px solid #FFD60A; padding: 12px 16px; background: #FFFDF0; color: #666; font-size: 14px; margin: 16px 0;">
    心理学研究表明：当行为与奖励的间隔超过 72 小时，坚持率下降 60%。
  </blockquote>
</section>`;
```

### 2.3 上下文增强

**当前问题**：`history` 只取最近 10 条，长对话容易丢失上下文。

**优化方案**：

```
对话历史管理策略：
┌────────────────────────────────────┐
│  最新 3 条 → 完整保留               │
│  第 4~10 条 → AI 自动摘要压缩       │
│  超过 10 条 → 仅保留摘要            │
└────────────────────────────────────┘
```

```javascript
// 上下文压缩（每 10 轮做一次摘要）
async function compressHistory(messages) {
  if (messages.length <= 6) return messages;
  
  const oldMessages = messages.slice(0, -3);
  const recentMessages = messages.slice(-3);
  
  // 用更便宜的模型做摘要
  const summary = await summarizeWithAI(oldMessages);
  
  return [
    { role: 'system', content: `[历史摘要] ${summary}` },
    ...recentMessages
  ];
}
```

### 2.4 内容后处理

**方案**：AI 生成后自动清洗 HTML 输出。

```javascript
// 后处理管道
function postProcessContent(html) {
  return html
    // 规范化行高
    .replace(/<p/g, '<p style="line-height:2;margin-bottom:16px;"')
    // 移除空段落
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    // 图片自适应
    .replace(/<img/g, '<img style="max-width:100%;height:auto;border-radius:8px;"')
    // 规范化强调
    .replace(/<strong>/g, '<strong style="color:#1a1a1a;">')
    // 添加微信兼容的 section 包裹
    .replace(/^/, '<section style="padding:16px 20px;">')
    .replace(/$/, '</section>');
}
```

### 2.5 多轮迭代机制

**目标**：不一次生成完美内容，而是分步迭代。

```
推荐工作流：
1. 用户说"写一篇关于 XX 的文章"
2. AI 先生成大纲（300 字以内）→ 展示给用户
3. 用户确认/调整大纲
4. AI 按大纲逐段生成
5. 每段可独立润色/修改
```

实现方式：在 `promptTemplates` 中增加流程化模板：

```typescript
{ id: 'workflow', icon: '→', label: '分步写作',
  prompt: '请先只生成文章大纲（标题 + 5-7 个段落要点），不要写正文。等我确认后再展开。',
  needsContent: false
}
```

---

## 三、交互设计优化

### 3.1 Diff 预览模式

**核心体验**：AI 修改内容前先展示对比，用户确认后再应用。

```
┌────────────────────────────┐
│  AI 建议修改               │
│  ─────────────────────     │
│  - 原文：今天天气不错       │  红色删除线
│  + 修改：晴空万里的午后     │  绿色高亮
│                            │
│  [应用修改]  [忽略]  [编辑] │
└────────────────────────────┘
```

### 3.2 快捷键系统

| 快捷键 | 功能 |
|--------|------|
| `Cmd+L` | 聚焦 AI 输入框 |
| `Cmd+Enter` | 发送消息 |
| `Esc` | 停止生成 |
| `Cmd+Z` | 撤销 AI 最后一次修改 |

### 3.3 拖拽上传

```typescript
// AI 面板拖拽区域
function setupDragDrop(panelEl: HTMLElement) {
  panelEl.addEventListener('dragover', e => {
    e.preventDefault();
    panelEl.classList.add('drag-active');
  });
  
  panelEl.addEventListener('drop', e => {
    e.preventDefault();
    panelEl.classList.remove('drag-active');
    const file = e.dataTransfer?.files[0];
    if (file) aiStore.attachedFile = file;
  });
}
```

### 3.4 消息 Markdown 渲染

**当前**：AI 回复用简单 `v-html`，格式受限。

**优化**：集成 `markdown-it` 渲染完整 Markdown。

```bash
npm install markdown-it
```

```typescript
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt({ html: true, breaks: true });

function formatAIReply(text: string): string {
  return md.render(text);
}
```

---

## 四、模型配置优化

### 4.1 参数调优

```javascript
// 不同场景使用不同参数
const presets = {
  creative: { temperature: 0.9, top_p: 0.95 },   // 创意写作
  precise:  { temperature: 0.3, top_p: 0.8 },     // 润色/精简
  balanced: { temperature: 0.7, top_p: 0.9 },     // 默认
};
```

### 4.2 多模型策略

| 场景 | 推荐模型 | 原因 |
|------|---------|------|
| 长文写作 | qwen-max | 上下文窗口大，生成质量高 |
| 快速润色 | qwen-turbo | 速度快，成本低 |
| 排版生成 | qwen3.5-plus | 工具调用能力强 |

### 4.3 Token 预算控制

```javascript
// 根据任务类型动态设置 max_tokens
function getMaxTokens(taskType) {
  const budgets = {
    'title': 200,      // 生成标题
    'summary': 300,    // 生成摘要
    'polish': 4000,    // 润色全文
    'expand': 6000,    // 扩写
    'article': 8000,   // 完整文章
  };
  return budgets[taskType] || 4000;
}
```

---

## 五、优先级路线图

| 优先级 | 功能 | 预期效果 | 工时 |
|--------|------|---------|------|
| P0 | 停止生成按钮 | 基础体验保障 | 0.5h |
| P0 | System Prompt 优化 | 直接提升内容质量 | 1h |
| P1 | Diff 预览 | 用户信任感大幅提升 | 3h |
| P1 | 内容后处理管道 | HTML 输出标准化 | 1h |
| P1 | Markdown 渲染 | 回复可读性提升 | 0.5h |
| P2 | 快捷键系统 | 效率提升 | 1h |
| P2 | 拖拽上传 | 体验细节 | 0.5h |
| P2 | 分步写作流程 | 生成质量提升 | 2h |
| P3 | 上下文压缩 | 长对话质量保持 | 2h |
| P3 | 多模型切换 | 灵活性 | 2h |
