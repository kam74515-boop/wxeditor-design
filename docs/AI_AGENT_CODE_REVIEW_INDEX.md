# AI Agent 代码审查目录

> 本目录只收录本轮 Agent 主链路整改直接涉及的代码与测试文件。
>
> 不包含纯文档整理，也不包含与 Agent 无关的零散修复。

## 1. 建议审查顺序

### P0 主链路

1. `server/src/ai/sse.js`
   - 主链路与兼容链路共享的 SSE 转译层
   - 是否稳定输出 `thinking / content / tool_start / tool_delta / tool_call / done / error`
   - `tool_call` 聚合与 `done` 收尾是否一致

2. `server/src/controllers/ai.ctrl.js`
   - 编辑器 AI 主入口 `/api/ai/chat`
   - 是否正确接入统一 prompt 体系
   - 是否正确把 `tools` 和 `tool_choice` 传给模型
   - 是否复用共享 SSE 层而不是单独维护一套解析逻辑
   - `done` 事件里的 `{ reply, actions }` 是否稳定

3. `server/src/ai/tools.js`
   - 工具定义是否与前端执行器一致
   - 参数是否统一为 `{ tool, args }`
   - 是否保留 `content -> html` 的兼容转换

4. `web/src/stores/ai.ts`
   - SSE 解析是否同时兼容标准 `event:` 与旧 `data.type`
   - `tool_call` 是否能稳定进入 `pendingActions`
   - 错误与结束态处理是否匹配后端事件

### P1 兼容链路

5. `server/src/services/aiAgent.service.js`
   - 兼容型 `/api/ai-agent/*` SSE 输出是否与主链路一致
   - 是否复用共享 SSE 层而不是继续分叉维护

6. `web/src/api/index.ts`
   - 通用流式请求 helper 是否兼容新的 SSE 协议

### P2 回归保障

7. `server/tests/unit/ai.ctrl.test.js`
   - 是否覆盖 `/api/ai/chat` 主链路
   - 是否覆盖统一 prompt、统一 SSE 事件和错误场景

8. `server/tests/unit/aiAgent.service.test.js`
   - 是否覆盖了 SSE 事件协议
   - 是否覆盖了 `{ tool, args }` 新契约

9. `server/tests/unit/ai.tools.test.js`
   - 是否覆盖工具定义
   - 是否覆盖 `content -> html` 兼容逻辑

## 2. 文件清单

```text
docs/AI_AGENT_CODE_REVIEW_INDEX.md
server/src/ai/sse.js
server/src/controllers/ai.ctrl.js
server/src/ai/tools.js
server/src/services/aiAgent.service.js
web/src/stores/ai.ts
web/src/api/index.ts
server/tests/unit/ai.ctrl.test.js
server/tests/unit/aiAgent.service.test.js
server/tests/unit/ai.tools.test.js
```

## 3. 可选参考文档

如果你审代码时想对照设计意图，可以一起看这两份：

- `docs/AI_INTEGRATION.md`：当前已落地的 AI 主链路说明
- `docs/AI_AGENT_ARCHITECTURE.md`：为什么这次只收敛到 v1，而不是继续做大而全

## 4. 不在本次 Agent 审查范围

下面这些不建议和 Agent 主链路混在一起审：

- 纯文档整理
- `server/` 目录重命名
- 与 AI 无关的类型检查修复
