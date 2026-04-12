# WXEditor — 后端架构说明

> 后端项目位于 `server/` 目录，基于 Node.js + Express 5 构建。

## 1. 分层架构

```
请求 → Express 中间件链 → 路由层 → 模型层 → SQLite 数据库
                                  → 服务层（协作 WebSocket）
                                  → 外部 API（AI / 微信）
```

### 层级职责

| 层 | 目录 | 职责 |
|----|------|------|
| **入口层** | `app.js` | Express 实例创建、中间件挂载、路由注册、服务器启动 |
| **中间件层** | `middleware/` | JWT 认证、管理员权限校验 |
| **路由层** | `routes/` | 请求处理、参数校验、响应返回 |
| **模型层** | `models/` | 数据访问对象（DAO），封装 SQLite 查询 |
| **服务层** | `services/` | 复杂业务逻辑（协作 WebSocket） |
| **工具层** | `utils/` | 纯函数工具（HTML 转换、样式处理） |
| **配置层** | `config/` | 数据库初始化、表结构定义 |

## 2. Express 中间件链

`app.js` 中按以下顺序挂载中间件：

```javascript
// 1. CORS 跨域支持
app.use(cors());

// 2. 请求体解析（10MB 限制）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 3. 静态文件服务
app.use('/public', express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// 4. API 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ueditor', require('./routes/ueditor'));
// ... 共 13 个路由模块
```

## 3. 路由模块

后端注册了 13 个路由模块：

| 路由前缀 | 路由文件 | 功能 |
|----------|----------|------|
| `/api/auth` | `auth.js` | 注册、登录、Token 刷新、密码重置 |
| `/api/ueditor` | `ueditor.js` | UEditor 配置、图片/视频/文件上传 |
| `/api/ai` | `ai.js` | AI 对话、文章改写、聊天历史 |
| `/api/collab` | `collaboration.js` | 协作文档 CRUD、统计、版本历史、分享 |
| `/api/wechat-content` | `wechat-content.js` | HTML 微信格式转换、复制 |
| `/api/templates` | `templates.js` | 模板 CRUD、分类、公开/私有 |
| `/api/materials` | `materials.js` | 素材上传、文件夹管理、素材列表 |
| `/api/membership` | `membership.js` | 套餐、订阅、结算、升降级 |
| `/api` | `team.js` | 团队 CRUD、邀请、权限管理 |
| `—` | `content.js` | 文档内容管理 |
| `—` | `draft.js` | 微信草稿上传、预览 |
| `—` | `wechat.js` | 微信登录（Puppeteer） |
| `—` | `admin.js` | 管理后台功能 |

## 4. 数据模型

模型层位于 `models/`，使用纯 Node.js 类封装 `better-sqlite3` 查询：

| 模型 | 文件 | 对应表 | 关键方法 |
|------|------|--------|----------|
| User | `User.js` | `users` | 注册、登录、查询、更新、删除 |
| Document | `Document.js` | `documents` | 创建、读取、更新、版本管理 |
| Folder | `Folder.js` | `material_folders` | 文件夹 CRUD |
| Team | `Team.js` | `teams`（内存/自建） | 团队 CRUD |
| TeamInvitation | `TeamInvitation.js` | `team_invitations`（内存/自建） | 邀请管理 |
| Order | `Order.js` | `orders`（内存/自建） | 订单管理 |

## 5. WebSocket 协作服务

`services/collaboration.js` 实现了完整的多人实时协作引擎：

### 核心功能

- **房间管理**：每个文档对应一个 Socket.IO 房间
- **编辑锁机制**：
  - 悲观锁：同时只允许一个用户编辑
  - 乐观锁：版本号冲突检测
- **内容同步**：编辑操作实时广播给房间内所有用户
- **光标同步**：实时广播用户光标位置
- **即时聊天**：房间内聊天消息
- **自动清理**：每 30 分钟清理不活跃文档

### WebSocket 事件

| 事件 | 方向 | 处理 |
|------|------|------|
| `join-document` | C→S | 加入房间、返回文档内容与在线用户 |
| `leave-document` | C→S | 离开房间、释放编辑锁 |
| `document-change` | C→S | 接收编辑内容、版本检查、广播更新 |
| `cursor-move` | C→S | 光标位置广播 |
| `request-edit` | C→S | 编辑权限申请 |
| `chat-message` | 双向 | 即时聊天消息 |

## 6. 认证机制

### JWT 双令牌

- **Access Token**：短期有效（默认 7 天），用于 API 认证
- **Refresh Token**：长期有效（默认 30 天），用于刷新 Access Token

### 中间件

`middleware/auth.js` 提供：
- `verifyToken`：验证 Access Token 有效性
- `requireRole(role)`：检查用户角色权限

### 角色体系

| 角色 | 说明 |
|------|------|
| `user` | 普通用户 |
| `vip` | VIP 会员 |
| `admin` | 管理员 |
| `superadmin` | 超级管理员 |

## 7. HTML 处理管道

微信公众号对 HTML 有严格限制，后端 `utils/` 提供处理工具链：

```
原始 HTML → sanitize-html 过滤非法标签 → styleConverter CSS→内联
→ Cheerio 补充微信属性 (data-ratio, data-w) → 微信兼容 HTML
```

### `utils/styleConverter.js`

- 解析外部 CSS 规则
- 将 class 选择器匹配的样式转为内联 `style`
- 处理微信特有的样式兼容问题

### `utils/helpers.js`

- 通用工具函数（UUID 生成、日期格式化等）

## 8. 静态文件服务

| 路径 | 目录 | 说明 |
|------|------|------|
| `/public/*` | `public/` | 静态资源根目录 |
| `/uploads/*` | `public/uploads/` | 用户上传文件 |
| `/public/ueditor/*` | `public/ueditor/` | UEditor 编辑器资源 |

## 9. 定时任务

- **协作文档清理**：每 30 分钟执行，清除长时间无活跃用户的协作文档内存缓存
