# WXEditor AI Agent 架构设计 v1

> 目标不是一次性做成“Cursor for WeChat Editor”的终局版本，而是先把当前仓库里真正会走的主链路打通。
>
> 更新日期：2026-04-16
> 版本：v1（务实落地版）

---

## 1. 本版结论

基于当前项目现状，AI Agent 最合理的第一阶段不是：

- 一次上 15 个工具
- 先做通用 Region 图模型
- 先做 SVG 模版智能适配
- 先引入 MCP / Skill / 三层 token 分流

而是先完成下面这条最小闭环：

1. 前端编辑器主流程统一走 `POST /api/ai/chat`
2. 后端真正把 `tools` 传给模型，启用真实 Function Calling
3. SSE 协议与前端消费格式统一
4. 工具参数统一成前端可执行的结构
5. 先只支持 3 个稳定工具：
   - `replace_editor_content`
   - `insert_content`
   - `set_title`
6. 对 AI 产出的 HTML 默认做“简洁文章风”收口，并保留 tool 执行审计记录

这条链路稳定之后，再考虑局部编辑、模板、SVG 和风格适配。

---

## 2. 当前项目约束

### 2.1 编辑器约束

本项目编辑区是基于 UEditor 的二次开发，不是通用 `contenteditable`。

正文写入最终只允许通过以下路径落地：

- `ueditorInstance.setContent(html)`
- `ueditorInstance.execCommand('inserthtml', html)`

因此 AI 方案必须首先满足：

- HTML 能被 UEditor 接受
- 写入后仍可继续编辑
- 保存到文档时不会被现有清洗逻辑破坏

### 2.2 当前真正使用的 AI 主链路

前端编辑器里的 AI 助手目前实际调用的是：

- `POST /api/ai/chat`

`/api/ai-agent/*` 这组接口目前不是编辑器主流程入口，可以保留为兼容/辅助接口，但不应继续被当作主链路设计中心。

### 2.3 当前最核心的问题

在本次 v1 收敛前，存在 4 个比“功能不够多”更基础的问题：

1. `/api/ai/chat` 没把 `tools` 传给模型
2. 后端 SSE 输出格式和前端期望不一致
3. 工具参数字段名不一致
4. 前端只支持全文替换/插入/设标题，后端却存在另一套未对齐的 Agent 输出结构

所以 v1 的重点是“统一协议和契约”，不是“继续加能力面”。

---

## 3. v1 设计原则

### 3.1 单主链路

编辑器相关 AI 操作统一以 `/api/ai/chat` 为主入口。

### 3.2 最小工具集

只保留已经有明确前端执行器的工具：

- `replace_editor_content`
- `insert_content`
- `set_title`

### 3.3 契约先于能力

只有当前端、后端、模型三方对下面 3 件事完全一致时，工具调用才算可用：

1. 工具名
2. 参数结构
3. SSE 事件格式

### 3.4 UEditor 优先

所有 Agent 产出都以“能稳定写回 UEditor”为最高优先级，再考虑微信排版增强。

### 3.5 渐进增强

局部编辑、模板、SVG 属于下一层能力，必须建立在 v1 主链路稳定的前提上。

---

## 4. v1 架构总览

```text
用户 → 编辑器右侧 AI 面板
   → web/src/stores/ai.ts
   → POST /api/ai/chat
   → server/src/controllers/ai.ctrl.js
   → OpenAI-compatible Chat Completions + tools
   → SSE 事件流回前端
   → EditorView.vue 消费 pendingActions
   → UEditor setContent / inserthtml
```

### 4.1 前端职责

前端只负责 4 件事：

1. 发送 `message + context + history`
2. 消费 SSE 事件
3. 将 `tool_call` 转为 `pendingActions`
4. 用既有 UEditor API 执行动作

### 4.2 后端职责

后端只负责 5 件事：

1. 构建 system + context + history
2. 将工具定义传给模型
3. 解析模型流式返回
4. 将 provider 流翻译成前端可消费的 SSE 事件
5. 保存普通文本回复历史
6. 为 tool 执行结果保留独立审计记录，便于复盘

---

## 5. v1 工具契约

### 5.1 工具定义

```ts
replace_editor_content({
  html: string
})

insert_content({
  html: string,
  position?: 'cursor' | 'start' | 'end'
})

set_title({
  title: string
})
```

### 5.2 兼容策略

考虑到旧 prompt 或旧模型输出可能仍使用 `content` 字段，后端在解析工具调用时允许：

```ts
{ content: '<p>...</p>' }
```

自动兼容转换为：

```ts
{ html: '<p>...</p>' }
```

但从文档和 prompt 层面，统一只写 `html`。

### 5.3 为什么 v1 不上更多工具

不是不能做，而是当前仓库还没准备好：

- `replace_selection` 需要稳定选区映射
- `replace_region` 需要可靠块级定位模型
- `set_summary` 需要编辑器外的稳定落地点
- 模版/SVG 工具需要额外资产层和渲染兼容层

---

## 6. v1 SSE 事件协议

前后端统一使用下面这组事件：

### 6.1 `thinking`

```json
{ "text": "..." }
```

可选事件。仅当模型供应商提供 reasoning delta 时发送。

### 6.2 `content`

```json
{ "text": "..." }
```

普通文本回复增量。

### 6.3 `tool_start`

```json
{ "tool": "replace_editor_content" }
```

表示模型开始构造某个工具调用。

### 6.4 `tool_delta`

```json
{
  "tool": "replace_editor_content",
  "argumentsSoFar": "{\"html\":\"<p>...\""
}
```

用于前端流式预览工具参数，主要服务于 HTML 打字机效果。

### 6.5 `tool_call`

```json
{
  "tool": "replace_editor_content",
  "args": { "html": "<p>...</p>" }
}
```

前端以此为准进入最终执行。

### 6.6 `done`

```json
{
  "reply": "完整文本回复",
  "actions": [
    { "tool": "replace_editor_content", "args": { "html": "<p>...</p>" } }
  ]
}
```

用于结束本轮流式会话。

### 6.7 `error`

```json
{ "message": "..." }
```

---

## 7. v1 为什么不先做 Region

Region 方向是合理的，但不应该在当前阶段先做成“通用抽象”。

原因有 3 个：

1. 当前内容结构并不只是简单段落
2. 现有 SVG/复杂布局通常由多个顶层节点共同组成
3. 仅按 `doc.body.children` 或“第 N 个块”切分，极容易误切复杂内容

所以更合理的顺序是：

1. 先把全文替换/插入/设标题跑稳
2. 再做“选区替换”或“当前块替换”这类窄场景
3. 最后再抽象成通用 region 模型

---

## 8. v1 为什么不先做 SVG 智能适配

当前 `svg-templates/` 资产大多是现成长 HTML 片段，存在以下特点：

- 没有统一 placeholder 规范
- 大量依赖复杂 `svg / foreignObject / animate / animateMotion`
- 含较多 class、背景图、布局辅助结构

这说明 SVG 不是一个“加几个工具定义”就能完成的能力，而是至少包含：

1. 资产标准化
2. placeholder 规范
3. manifest 构建
4. UEditor 白名单验证
5. 文档保存链路兼容验证

因此 v1 明确不纳入 SVG 智能适配。

---

## 9. 与清洗/持久化链路的关系

当前文档保存时会经过服务端 `sanitizeContent`。

因此 v1 只承诺：

- 生成 UEditor 可接受的常规 HTML
- 不主动引入脚本型交互
- 不把复杂 SVG 当作默认能力暴露给 AI

在 SVG 能力正式上线前，不应在架构文档中默认假设：

- `svg_interactive pipeline` 已存在
- 保存链路已经支持复杂 SVG 白名单
- UEditor 配置已经完成扩展

这些都需要后续单独立项验证。

---

## 10. 版本路线图

### v1：主链路打通

范围：

- `/api/ai/chat` 真正启用 tools
- SSE 协议统一
- 工具参数统一
- 前端兼容两种 SSE 形态
- 仅保留 3 个稳定工具

### v2：窄场景局部编辑

建议范围：

- `replace_selection`
- 当前块识别
- 基础 diff 预览

注意：

- 不直接上通用 region 编排

### v3：文章模板能力

建议范围：

- `list_article_templates`
- `apply_article_template`
- 以 DB 模板表为主

注意：

- 先不包含 SVG

### v4：SVG 资产治理

建议范围：

- placeholder 规范
- manifest 生成
- 白名单与持久化验证
- 只做“直接套用”

### v5：SVG 风格适配与高级 Agent

建议范围：

- 风格分析
- SVG adapt
- 更细粒度 region
- 更复杂的多步工具编排

---

## 11. 当前实现建议

如果继续迭代，请遵守以下顺序：

1. 先修协议和契约
2. 再扩工具数量
3. 先做文章类能力
4. 最后做 SVG 和复杂局部编辑

这套顺序的核心目标只有一个：

让项目先拥有一条稳定、可维护、可验证的 AI 编辑主链路，而不是在未打通基础协议前继续堆“看起来很强”的能力描述。
