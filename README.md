# WXEditor — 微信公众号图文排版编辑器

基于 UEditor 二次开发的微信公众号图文编辑器，支持 AI 写作助手、一键同步到公众号草稿箱、多人实时协作，类似秀米的操作体验。

## ✨ 功能特性

| 模块 | 功能 | 状态 |
|------|------|------|
| **富文本编辑** | 基于 UEditor 的专业排版能力，所见即所得 | ✅ 已实现 |
| **微信适配** | HTML 标签白名单过滤、样式内联转换、微信属性注入 | ✅ 已实现 |
| **一键同步** | 微信公众号 API 直传草稿箱 | ✅ 已实现 |
| **图片处理** | 自动上传图片至微信素材库 | ✅ 已实现 |
| **多人协作** | Socket.IO 实时同步、悲观锁/乐观锁、光标共现、即时聊天 | ✅ 已实现 |
| **AI 写作助手** | 通义千问大模型（qwen3.5-plus），编辑器主链路支持 SSE 流式 + Function Calling | ✅ 已实现 |
| **AI 智能体** | 兼容型 AI Agent 提示词模板与工具调用链路 | ✅ 已实现 |
| **模板库** | 预设排版模板，一键应用 | ✅ 已实现 |
| **素材管理** | 图片/视频/文件上传、文件夹管理 | ✅ 已实现 |
| **团队协作** | 团队创建、成员邀请、权限管理 | ✅ 已实现 |
| **会员体系** | 套餐定价、结算支付、权限配额 | ✅ 已实现 |
| **用户系统** | JWT 认证、RBAC 角色权限（user/vip/admin/superadmin） | ✅ 已实现 |
| **多公众号管理** | 绑定多个公众号、验证、切换 | ✅ 已实现 |
| **定时发布** | 定时任务创建/编辑/取消/立即执行 | ✅ 已实现 |
| **评论批注** | 文档评论（树形回复）、编辑器内批注 | ✅ 已实现 |
| **图文合集** | 多篇文章批次管理、排序、批量发布 | ✅ 已实现 |
| **微信 OAuth** | 微信 OAuth 授权登录、账号绑定 | ✅ 已实现 |
| **管理后台** | 用户管理、内容审核、AI 配置、数据统计、系统设置 | ✅ 已实现 |

## 🏗 技术栈

### 前端（`web/`）
- **Vue 3** + **TypeScript** — 组件化 SPA
- **Vite 5** — 构建与开发服务器
- **Pinia** — 状态管理（持久化插件）
- **Vue Router 4** — 路由与导航守卫
- **Element Plus** — UI 组件库
- **Lucide Icons** — SVG 图标
- **Socket.IO Client** — WebSocket 客户端
- **UEditor** — 富文本编辑器内核
- **Sass** — CSS 预处理
- **vue-i18n** — 国际化
- **vue-cropper** — 图片裁剪

### 后端（`server/`）
- **Node.js** + **Express 5** — RESTful API 服务
- **Knex** + **MySQL**（`mysql2`）— 关系型数据库（含迁移与种子）
- **Socket.IO** — 实时通信（多人协作）
- **JWT**（`jsonwebtoken`）— 用户认证
- **RBAC** — 基于角色的访问控制
- **OpenAI SDK** — AI 功能（兼容通义千问 Dashscope API）
- **Sharp** — 图片处理
- **Multer** — 文件上传
- **sanitize-html** — HTML 净化
- **express-rate-limit** — API 限流
- **Morgan** — 请求日志

### 基础设施
- **Docker Compose** — 容器编排（PostgreSQL + 后端 + 前端构建 + Nginx）
- **Nginx** — 反向代理及静态资源服务
- **Nodemon** — 开发热重载
- **Jest** + **Supertest** — API 测试
- **Concurrently** — 前后端并发启动

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9
- MySQL >= 8.0

### 1. 安装依赖

```bash
# 一键安装所有依赖（根目录 + server + web）
npm run install:all
```

### 2. 配置环境变量

复制 `server/.env.example` 为 `server/.env`，按需修改：

```env
# 必填
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# MySQL 数据库
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=wxeditor

# AI 功能（通义千问 Dashscope）
OPENAI_API_KEY=your-dashscope-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.5-plus
```

### 3. 初始化数据库

```bash
cd server
npm run migrate    # 执行数据库迁移
npm run seed       # 导入初始数据（管理员账号 + 模板）
```

### 4. 启动开发服务

```bash
# 在项目根目录一键并发启动前后端
npm run dev
```

启动后访问：
- **前端应用**：`http://localhost:5174/`
- **后端 API**：`http://localhost:3001/api`（已由 Vite 代理）

> 完整环境变量说明参见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

### 5. Docker 部署（生产环境）

```bash
docker-compose up -d
```

部署后访问 `http://localhost/`，Nginx 自动代理前后端服务。

## 📁 项目结构

```
wxeditor-server-new/
├── package.json              # 根级启动脚本（concurrently 并发）
├── docker-compose.yml        # Docker 容器编排
├── nginx.conf                # Nginx 反向代理配置
├── docs/                     # 📚 项目文档
│
├── web/                      # 🟢 前端（Vue 3 + Vite）
│   ├── src/
│   │   ├── api/              # Axios HTTP 请求封装
│   │   ├── components/       # Vue 组件（base/editor/navigation）
│   │   ├── layouts/          # 页面布局（Dashboard/Editor/Admin/Workspace）
│   │   ├── router/           # 路由定义与导航守卫
│   │   ├── stores/           # Pinia 状态管理（ai/editor/theme/user/navigation/wechat/app）
│   │   ├── styles/           # 全局样式与 UEditor 主题
│   │   ├── i18n/             # 国际化
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── utils/            # 工具函数
│   │   └── views/            # 页面视图（admin/articles/auth/membership/scheduled/teams/wechat）
│   └── vite.config.ts        # Vite 配置（含 API 代理 → :3001）
│
└── server/                   # 🔵 后端（Node.js + Express, Clean Architecture）
    ├── src/
    │   ├── app.js            # 主入口
    │   ├── config/db.js      # Knex 数据库连接
    │   ├── controllers/      # 控制器层（HTTP 路由处理）
    │   ├── services/         # 服务层（业务逻辑）
    │   ├── repositories/     # 仓储层（数据访问）
    │   ├── middleware/       # 中间件（auth/rbac/wechat-auth）
    │   ├── routes/index.js   # 路由聚合注册
    │   ├── sockets/          # WebSocket 协作服务
    │   ├── ai/               # AI 模块（tools/prompts/formatter）
    │   └── utils/            # 工具函数
    ├── migrations/           # 数据库迁移脚本
    ├── seeds/                # 数据库种子数据
    ├── knexfile.js           # Knex 配置（MySQL）
    └── tests/                # Jest 测试
```

> 详细结构参见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)

## 📖 文档索引

完整文档入口见 [`docs/README.md`](docs/README.md)。

| 常用文档 | 说明 |
|------|------|
| [`docs/README.md`](docs/README.md) | 文档总索引与阅读顺序 |
| [`docs/PRD.md`](docs/PRD.md) | 产品需求与功能范围 |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | 仓库结构与关键链路总览 |
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | REST API 契约文档 |
| [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md) | 当前 AI 主链路说明 |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | 版本变更记录 |

## 🔌 API 概览

### 用户认证 `/api/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | Token 刷新 |
| GET | `/api/auth/me` | 获取当前用户 |

### 文档协作 `/api/collab`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/collab/documents` | 创建文档 |
| GET | `/api/collab/documents` | 文档列表 |
| GET | `/api/collab/documents/:id` | 文档详情 |

### AI 助手 `/api/ai` & `/api/ai-agent`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | 编辑器 AI 主入口（SSE + tools） |
| POST | `/api/ai/rewrite` | 文章润色/改写 |
| GET | `/api/ai-agent/prompts` | 获取兼容型 Agent 提示词模板 |

### 微信公众号 `/api/wechat` & `/api/wechat-accounts`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/wechat-accounts` | 公众号列表 |
| POST | `/api/wechat-accounts` | 添加公众号 |
| POST | `/api/drafts/upload` | 上传草稿至微信 |

### 定时发布 `/api/scheduled-posts`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scheduled-posts` | 任务列表 |
| POST | `/api/scheduled-posts` | 创建定时任务 |
| POST | `/api/scheduled-posts/:id/execute` | 立即执行 |

### 评论批注 `/api/comments`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/comments/document/:docId` | 获取文档评论（树形） |
| POST | `/api/comments` | 创建评论 |

### 图文合集 `/api/article-batches`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/article-batches` | 合集列表 |
| POST | `/api/article-batches` | 创建合集 |

> 完整 API 文档参见 [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)

## 🤖 AI 写作助手

集成阿里云通义千问大模型（Dashscope API），提供以下能力：
- **智能对话**：基于当前文档上下文进行问答（SSE 流式输出）
- **编辑器直改**：通过 Function Calling 直接触发 `replace_editor_content`、`insert_content`、`set_title`
- **兼容型 AI Agent**：保留提示词模板与辅助接口
- **文章润色**：优化文章语言表达
- **内容改写**：简化/扩展文章内容
- **标题生成**：为文章生成多个吸引力标题
- **摘要生成**：自动生成微信公众号摘要

> 详细配置参见 [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md)

## 👥 多人实时协作

### WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `join-document` | Client → Server | 加入文档 |
| `leave-document` | Client → Server | 离开文档 |
| `document-change` | Client → Server | 文档变更 |
| `document-updated` | Server → Client | 文档已更新（广播） |
| `cursor-move` | Client → Server | 光标移动 |
| `cursor-moved` | Server → Client | 其他用户光标移动 |
| `request-edit` | Client → Server | 请求编辑权限 |
| `edit-granted` | Server → Client | 获得编辑权限 |
| `chat-message` | 双向 | 即时聊天消息 |

## 🗺 开发计划

- [x] 多人实时协作
- [x] AI 写作助手
- [x] AI 智能体（已收敛为编辑器主链路 + 兼容接口）
- [x] 模板库
- [x] 素材管理
- [x] 团队功能
- [x] 会员体系
- [x] 多公众号管理
- [x] 图文合集（多篇文章）
- [x] 定时发布
- [x] 评论批注功能
- [x] 微信 OAuth 登录
- [x] 管理后台（用户/内容/AI配置/数据统计）
- [ ] 离线编辑支持
- [ ] 多平台发布（头条号/知乎等）

## 📄 许可证

MIT License

## 🔗 参考

- [UEditor 百度富文本编辑器](https://ueditor.baidu.com/)
- [微信公众平台](https://mp.weixin.qq.com/)
- [通义千问 Dashscope API](https://dashscope.aliyuncs.com/)
- [Socket.IO 文档](https://socket.io/)
- [Element Plus 组件库](https://element-plus.org/)
- [Knex.js 查询构建器](https://knexjs.org/)
