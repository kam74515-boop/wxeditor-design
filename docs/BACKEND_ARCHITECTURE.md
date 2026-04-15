# WXEditor — 后端架构说明

> 后端项目位于 `server/` 目录，基于 Node.js + Express 5 构建，采用 **Clean Architecture** 分层。
>
> **更新日期**：2026-04-15

## 1. 分层架构

```
HTTP 请求 → Express 中间件链 → Controller（路由/校验）
                                → Service（业务逻辑）
                                → Repository（数据访问/Knex）
                                → MySQL 数据库

WebSocket → sockets/index.js → 协作广播/编辑锁
AI 请求   → ai/ 模块 → Dashscope API（SSE + Function Calling）
定时任务  → SchedulerService → scheduledPost.service.js → DB + 微信 API
```

### 层级职责

| 层 | 目录 | 职责 |
|----|------|------|
| **入口层** | `src/app.js` | Express 实例创建、中间件挂载、路由注册、Socket 初始化、Scheduler 启动 |
| **路由注册** | `src/routes/index.js` | 聚合 18 个路由模块，统一挂载 |
| **控制器层** | `src/controllers/*.ctrl.js` | HTTP 请求处理、参数校验、响应格式化 |
| **服务层** | `src/services/*.service.js` | 核心业务逻辑、事务管理、跨模块调用 |
| **仓储层** | `src/repositories/*.repo.js` | Knex SQL 查询、数据映射 |
| **中间件层** | `src/middleware/` | JWT 认证、RBAC 权限、微信鉴权 |
| **AI 模块** | `src/ai/` | 提示词模板、Function Calling 工具、输出格式化 |
| **实时通信** | `src/sockets/` | WebSocket 协作、编辑锁、光标同步 |
| **工具层** | `src/utils/` | HTML 净化、通用辅助函数 |
| **配置层** | `src/config/` | Knex 数据库连接 |

## 2. Express 中间件链

`app.js` 中按以下顺序挂载中间件：

```javascript
// 1. CORS 跨域支持
app.use(cors());

// 2. API 限流
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 3. 请求日志
app.use(morgan('dev'));

// 4. 请求体解析（10MB 限制）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. 静态文件服务
app.use('/uploads', express.static('public/uploads'));

// 6. 路由注册（18 个模块）
registerRoutes(app);

// 7. 全局错误处理
app.use(errorHandler);
```

## 3. 路由模块（18 个）

后端通过 `routes/index.js` 注册所有路由模块：

| 路由前缀 | 控制器文件 | 功能 | 认证方式 |
|----------|----------|------|----------|
| `/api/auth` | `auth.ctrl.js` | 注册、登录、Token 刷新、密码修改 | 部分公开 |
| `/api/content` | `content.ctrl.js` | 文档内容管理、公开/会员/VIP 内容 | 部分公开 |
| `/api/collab` | `collab.ctrl.js` | 协作文档 CRUD、版本历史、分享 | auth |
| `/api/templates` | `template.ctrl.js` | 模板 CRUD、分类、公开/私有 | 部分公开 |
| `/api/materials` | `material.ctrl.js` | 素材上传/管理、文件夹 | auth |
| `/api/membership` | `membership.ctrl.js` | 套餐、订阅、结算 | 部分公开 |
| `/api` (teams) | `team.ctrl.js` | 团队 CRUD、邀请、成员管理 | auth |
| `/api/ai` | `ai.ctrl.js` | 编辑器 AI 主入口：SSE、工具调用、历史 | auth |
| `/api/ai-agent` | `aiAgent.ctrl.js` | 兼容型 Agent 接口与提示词列表 | auth |
| `/api/ueditor` | `ueditor.ctrl.js` | UEditor 配置、图片/视频/文件上传 | 无 |
| `/api/wechat` | `wechat.ctrl.js` | 微信登录/登出 | 内部鉴权 |
| `/api/wechat-accounts` | `wechatAccount.ctrl.js` | 多公众号绑定/验证/管理 | auth |
| `/api/drafts` | `draft.ctrl.js` | 草稿上传至微信、预览 | auth |
| `/api/scheduled-posts` | `scheduledPost.ctrl.js` | 定时发布任务 CRUD、立即执行 | auth |
| `/api/comments` | `comment.ctrl.js` | 评论批注（树形回复） | 部分公开 |
| `/api/article-batches` | `articleBatch.ctrl.js` | 图文合集 CRUD | auth |
| `/api/admin` | `admin.ctrl.js` | 管理后台（用户/文档/订单/设置） | admin |
| `/api/admin/ai-configs` | `aiConfig.ctrl.js` | AI 配置管理（供应商/模型） | admin |

## 4. Clean Architecture 调用示例

以「创建定时发布任务」为例：

```
POST /api/scheduled-posts
  → scheduledPost.ctrl.js
    - 参数校验（express-validator）
    - 提取 req.user.id
  → scheduledPost.service.js
    - 校验公众号绑定状态
    - 校验文档是否存在
    - 创建任务记录
  → scheduledPost.repo.js
    - Knex INSERT INTO scheduled_posts
  → 返回 201 + 任务数据
```

## 5. 服务层详解

| 服务 | 文件 | 职责 |
|------|------|------|
| AuthService | `auth.service.js` | 注册/登录/Token 管理/密码修改 |
| ContentService | `content.service.js` | 文档内容查询（按权限分类） |
| DocumentService | `document.service.js` | 协作文档 CRUD/版本管理 |
| TemplateService | `template.service.js` | 模板 CRUD/分类/使用计数 |
| MaterialService | `material.service.js` | 素材上传/文件夹/批量操作 |
| MembershipService | `membership.service.js` | 套餐/订阅/配额检查/激活码 |
| TeamService | `team.service.js` | 团队/成员/邀请管理 |
| AIAgentService | `aiAgent.service.js` | 兼容型 Agent SSE 服务/提示词管理 |
| AdminService | `admin.service.js` | 管理后台聚合查询 |
| WechatAccountService | `wechatAccount.service.js` | 多公众号绑定/验证 |
| WechatOAuthService | `wechatOAuth.service.js` | 微信 OAuth 授权流程 |
| WechatProxyService | `wechatProxy.service.js` | 微信 API 代理调用 |
| ScheduledPostService | `scheduledPost.service.js` | 定时发布任务管理 |
| ScheduledPostLogService | `scheduledPostLog.service.js` | 定时发布执行日志 |
| SchedulerService | `scheduler.service.js` | 全局定时调度器（轮询执行） |
| CommentService | `comment.service.js` | 评论批注（树形结构） |
| ArticleBatchService | `articleBatch.service.js` | 图文合集管理 |

## 6. WebSocket 协作服务

`sockets/index.js` 实现了多人实时协作引擎：

### 核心功能

- **房间管理**：每个文档对应一个 Socket.IO 房间
- **编辑锁机制**：
  - 悲观锁：同时只允许一个用户编辑
  - 乐观锁：版本号冲突检测
- **内容同步**：编辑操作实时广播给房间内所有用户
- **光标同步**：实时广播用户光标位置
- **即时聊天**：房间内聊天消息
- **自动清理**：定期清理不活跃文档

### WebSocket 事件

| 事件 | 方向 | 处理 |
|------|------|------|
| `join-document` | C→S | 加入房间、返回文档内容与在线用户 |
| `leave-document` | C→S | 离开房间、释放编辑锁 |
| `document-change` | C→S | 接收编辑内容、版本检查、广播更新 |
| `cursor-move` | C→S | 光标位置广播 |
| `request-edit` | C→S | 编辑权限申请 |
| `chat-message` | 双向 | 即时聊天消息 |

## 7. 认证机制

### JWT 双令牌

- **Access Token**：短期有效（默认 7 天），用于 API 认证
- **Refresh Token**：长期有效（默认 30 天），用于刷新 Access Token

### 中间件

| 中间件 | 文件 | 功能 |
|--------|------|------|
| `auth` | `middleware/auth.js` | 验证 JWT Access Token |
| `rbac` | `middleware/rbac.js` | 基于角色的访问控制 |
| `wechatAuth` | `middleware/wechat-auth.js` | 微信公众号鉴权 |

### 角色体系

| 角色 | 说明 |
|------|------|
| `user` | 普通用户 |
| `vip` | VIP 会员 |
| `admin` | 管理员 |
| `superadmin` | 超级管理员 |

## 8. AI 模块

`src/ai/` 目录封装了 AI 相关功能：

| 文件 | 职责 |
|------|------|
| `index.js` | AI 入口，配置读取、消息构建、工具导出 |
| `tools.js` | Function Calling 工具定义与参数兼容转换 |
| `sse.js` | provider 流到前端 SSE 事件的共享转译层 |
| `prompts.js` | 系统提示词与用户提示词模板 |
| `formatter.js` | AI HTML 收口与微信正文格式化 |
| `services/aiToolRun.service.js` | AI tool 审计记录读写 |

当前约定：

- 编辑器主流程优先走 `/api/ai/chat`
- `/api/ai/chat` 负责把 tools 传给模型并将 provider 流翻译成统一 SSE 事件
- tool 返回的 HTML 会在后端先做文章化收口，再交给前端执行
- `/api/ai-agent/*` 保留为兼容接口，不再作为编辑器中心架构继续扩展

## 9. 数据库访问

使用 **Knex** 作为查询构建器，连接 MySQL 数据库：

- **连接配置**：`knexfile.js`（开发/生产两套配置）
- **数据库连接**：`src/config/db.js` 导出 Knex 实例
- **迁移脚本**：`migrations/` 目录，5 个迁移文件
- **种子数据**：`seeds/` 目录，管理员账号 + 预设模板

### 迁移文件

| 文件 | 说明 |
|------|------|
| `001_initial.js` | 初始表结构（users、documents、templates、materials 等） |
| `002_wechat_accounts_comments.js` | 公众号管理表 + 评论表 |
| `003_article_batches.js` | 图文合集表 |
| `004_scheduled_post_logs.js` | 定时发布日志表 |
| `005_ai_tool_runs.js` | AI tool 执行审计记录表 |

## 10. 静态文件服务

| 路径 | 说明 |
|------|------|
| `/uploads/*` | 用户上传文件（图片/视频/文档） |

## 11. 定时任务

- **SchedulerService**：在 `app.js` 启动后初始化，轮询检查待执行的定时发布任务
- **执行流程**：检查任务 → 调用微信 API 发布 → 记录执行日志（scheduledPostLog）
- **协作文档清理**：定期清除长时间无活跃用户的协作文档内存缓存
