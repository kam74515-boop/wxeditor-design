# WXEditor — 微信公众号图文排版编辑器

基于 UEditor 二次开发的微信公众号图文编辑器，支持 AI 写作助手、一键同步到公众号草稿箱、多人实时协作，类似秀米的操作体验。

## ✨ 功能特性

| 模块 | 功能 | 状态 |
|------|------|------|
| **富文本编辑** | 基于 UEditor 的专业排版能力，所见即所得 | ✅ 已实现 |
| **微信适配** | HTML 标签白名单过滤、样式内联转换、微信属性注入 | ✅ 已实现 |
| **一键同步** | Puppeteer 模拟登录 + 直传公众号草稿箱 | ✅ 已实现 |
| **图片处理** | 自动上传图片至微信素材库 | ✅ 已实现 |
| **多人协作** | Socket.IO 实时同步、悲观锁/乐观锁、光标共现、即时聊天 | ✅ 已实现 |
| **AI 写作助手** | 通义千问大模型（qwen3.5-plus），支持文章润色/改写/摘要/标题生成 | ✅ 已实现 |
| **模板库** | 预设排版模板，一键应用 | ✅ 已实现 |
| **素材管理** | 图片/视频/文件上传、文件夹管理 | ✅ 已实现 |
| **团队协作** | 团队创建、成员邀请、权限管理 | ✅ 已实现 |
| **会员体系** | 套餐定价、结算支付、权限配额 | ✅ 已实现 |
| **用户系统** | JWT 认证、角色权限（user/vip/admin/superadmin） | ✅ 已实现 |

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

### 后端（`server/`）
- **Node.js** + **Express 5** — RESTful API 服务
- **Socket.IO** — 实时通信（多人协作）
- **SQLite**（`better-sqlite3`）— 轻量级关系型数据库
- **JWT**（`jsonwebtoken`）— 用户认证
- **Puppeteer** — 浏览器自动化（微信公众号登录）
- **OpenAI SDK** — AI 功能（兼容通义千问 Dashscope API）
- **Multer** — 文件上传
- **sanitize-html** / **Cheerio** / **jsdom** — HTML 处理与转换

### 基础设施
- **Docker Compose** — 容器编排
- **Nginx** — 反向代理及静态资源服务
- **Nodemon** — 开发热重载
- **Concurrently** — 前后端并发启动

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 1. 安装依赖

```bash
# 一键安装所有依赖（根目录 + server + web）
npm run install:all
```

### 2. 配置环境变量

复制 `server/.env.example` 为 `server/.env`，按需修改：

```env
# 必填
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI 功能（通义千问 Dashscope）
OPENAI_API_KEY=your-dashscope-api-key
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3.5-plus
```

> 完整环境变量说明参见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

### 3. 启动开发服务

```bash
# 在项目根目录一键并发启动前后端
npm run dev
```

启动后访问：
- **前端应用**：`http://localhost:5173/`
- **后端 API**：`http://localhost:3000/api`（已由 Vite 代理）

### 4. Docker 部署（生产环境）

```bash
docker-compose up -d
```

部署后访问 `http://localhost/`，Nginx 自动代理前后端服务。

## 📁 项目结构

```
wxeditor-server/
├── package.json              # 根级启动脚本（concurrently 并发）
├── docker-compose.yml        # Docker 容器编排
├── nginx.conf                # Nginx 反向代理配置
├── docs/                     # 项目文档
│
├── web/                      # 🟢 前端（Vue 3 + Vite）
│   ├── src/
│   │   ├── api/              # Axios HTTP 请求封装
│   │   ├── components/       # Vue 组件（ai/base/collab/common/editor/sidebar）
│   │   ├── composables/      # 可复用组合函数
│   │   ├── layouts/          # 页面布局
│   │   ├── router/           # 路由定义与导航守卫
│   │   ├── stores/           # Pinia 状态管理（ai/editor/theme/user）
│   │   ├── styles/           # 全局样式与 UEditor 主题
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── utils/            # 工具函数
│   │   └── views/            # 页面视图
│   └── vite.config.ts        # Vite 配置（含 API 代理）
│
└── server/                   # 🔵 后端（Node.js + Express）
    ├── app.js                # 主入口
    ├── config/database.js    # SQLite 初始化与表结构
    ├── routes/               # API 路由（13 个模块）
    ├── models/               # 数据模型（User/Document/Team/Order 等）
    ├── services/             # 业务服务（协作 WebSocket）
    ├── middleware/            # 中间件（JWT 认证）
    ├── utils/                # 工具函数（HTML 转换/样式处理）
    ├── data/wxeditor.db      # SQLite 数据库文件
    └── public/uploads/       # 上传文件存储
```

> 详细结构参见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)

## 📖 文档索引

| 文档 | 说明 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 产品需求文档 |
| [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) | 项目结构与架构详解 |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | 技术栈详情与版本 |
| [`docs/DATABASE.md`](docs/DATABASE.md) | 数据库设计（表结构与 ER 图） |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | 部署与环境变量指南 |
| [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md) | 前端架构说明 |
| [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) | 后端架构说明 |
| [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md) | AI 功能集成文档 |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | 变更日志 |
| [`server/docs/design-system.md`](server/docs/design-system.md) | UI 设计系统 |
| [`server/docs/api/endpoints.md`](server/docs/api/endpoints.md) | API 端点文档 |
| [`server/docs/user-flows/`](server/docs/user-flows/) | 用户流程文档 |

## 🔌 API 概览

### 用户认证 `/api/auth`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | Token 刷新 |

### 编辑器 `/api/ueditor`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ueditor?action=config` | 获取编辑器配置 |
| POST | `/api/ueditor?action=uploadimage` | 上传图片 |
| POST | `/api/ueditor?action=uploadvideo` | 上传视频 |

### AI 助手 `/api/ai`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 对话 |
| POST | `/api/ai/rewrite` | 文章润色/改写 |
| GET | `/api/ai/history/:documentId` | 获取聊天历史 |

### 协作 `/api/collab`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/collab/documents` | 创建协作文档 |
| GET | `/api/collab/documents` | 获取文档列表 |
| GET | `/api/collab/documents/:id` | 获取文档详情 |

### 微信公众号 `/api/wechat-content`
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/wechat-content/convert` | HTML 转微信格式 |
| POST | `/api/wechat-content/copy` | 复制到公众号 |

> 完整 API 文档参见 [`server/docs/api/endpoints.md`](server/docs/api/endpoints.md)

## 🤖 AI 写作助手

集成阿里云通义千问大模型（Dashscope API），提供以下能力：
- **智能对话**：基于当前文档上下文进行问答
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
- [x] 模板库
- [x] 素材管理
- [x] 团队功能
- [x] 会员体系
- [ ] 多公众号管理
- [ ] 图文消息多篇文章
- [ ] 定时发布
- [ ] 离线编辑支持
- [ ] 评论批注功能

## 📄 许可证

MIT License

## 🔗 参考

- [UEditor 百度富文本编辑器](https://ueditor.baidu.com/)
- [微信公众平台](https://mp.weixin.qq.com/)
- [通义千问 Dashscope API](https://dashscope.aliyuncs.com/)
- [Socket.IO 文档](https://socket.io/)
- [Element Plus 组件库](https://element-plus.org/)
