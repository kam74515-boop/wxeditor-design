# WXEditor — 技术栈详情

> 本文档列出项目使用的全部技术依赖及其版本。

## 前端（`web/`）

### 核心框架

| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | ^3.4.15 | 核心 UI 框架 |
| vue-router | ^4.2.5 | SPA 路由管理 |
| pinia | ^2.1.7 | 状态管理 |
| pinia-plugin-persistedstate | ^3.2.1 | Pinia 持久化插件 |
| element-plus | ^2.5.1 | UI 组件库 |
| @element-plus/icons-vue | ^2.3.1 | Element Plus 图标 |
| lucide-vue-next | ^0.577.0 | SVG 图标库 |

### HTTP 与通信

| 依赖 | 版本 | 用途 |
|------|------|------|
| axios | ^1.6.5 | HTTP 客户端 |
| socket.io-client | ^4.8.3 | WebSocket 客户端 |

### 工具库

| 依赖 | 版本 | 用途 |
|------|------|------|
| lodash-es | ^4.17.21 | JS 工具函数 |
| crypto-js | ^4.2.0 | 加密工具 |
| dompurify | ^3.0.8 | HTML XSS 过滤 |
| js-cookie | ^3.0.5 | Cookie 管理 |
| nprogress | ^0.2.0 | 页面进度条 |

### 构建工具

| 依赖 | 版本 | 用途 |
|------|------|------|
| vite | ^5.0.11 | 构建与开发服务器 |
| @vitejs/plugin-vue | ^5.0.3 | Vite Vue 插件 |
| typescript | ^5.3.3 | TypeScript 编译 |
| vue-tsc | ^1.8.27 | Vue TypeScript 类型检查 |
| sass | ^1.70.0 | CSS 预处理器 |
| unplugin-auto-import | ^0.17.3 | API 自动导入 |
| unplugin-vue-components | ^0.26.0 | 组件自动导入 |
| eslint | ^8.56.0 | 代码规范 |
| prettier | ^3.2.4 | 代码格式化 |

---

## 后端（`server/`）

### 核心框架

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^5.2.1 | Web 框架 |
| cors | ^2.8.6 | 跨域支持 |
| dotenv | ^17.3.1 | 环境变量管理 |

### 数据库

| 依赖 | 版本 | 用途 |
|------|------|------|
| better-sqlite3 | ^12.6.2 | SQLite 驱动（同步 API） |

### 认证与安全

| 依赖 | 版本 | 用途 |
|------|------|------|
| jsonwebtoken | ^9.0.3 | JWT Token 生成与验证 |
| bcryptjs | ^3.0.3 | 密码哈希 |
| express-validator | ^7.3.1 | 请求参数校验 |
| sanitize-html | ^2.17.1 | HTML 净化 |

### 实时通信

| 依赖 | 版本 | 用途 |
|------|------|------|
| socket.io | ^4.8.3 | WebSocket 服务端 |

### AI 集成

| 依赖 | 版本 | 用途 |
|------|------|------|
| openai | ^6.27.0 | OpenAI 兼容 SDK（连接通义千问 Dashscope） |

### 微信与浏览器自动化

| 依赖 | 版本 | 用途 |
|------|------|------|
| puppeteer | ^24.39.0 | 浏览器自动化（微信登录） |
| cheerio | ^1.2.0 | HTML 解析 |
| jsdom | ^24.0.0 | DOM 模拟 |
| css | ^3.0.0 | CSS 解析 |

### 文件处理

| 依赖 | 版本 | 用途 |
|------|------|------|
| multer | ^2.1.1 | 文件上传 |
| axios | ^1.13.6 | HTTP 客户端（远程图片抓取） |

### 其他

| 依赖 | 版本 | 用途 |
|------|------|------|
| uuid | ^13.0.0 | UUID 生成 |
| mongoose | ^9.3.0 | ⚠️ 遗留依赖（未使用，待移除） |

### 开发工具

| 依赖 | 版本 | 用途 |
|------|------|------|
| nodemon | ^3.0.2 | 开发热重载 |

---

## 根级（`/`）

| 依赖 | 版本 | 用途 |
|------|------|------|
| concurrently | ^9.2.1 | 前后端并发启动 |

---

## 运行环境

| 项目 | 要求 |
|------|------|
| Node.js | >= 18 |
| npm | >= 9 |
| 操作系统 | macOS / Linux / Windows |
| Docker | >= 20（可选，用于容器部署） |
| Docker Compose | >= 2.0（可选） |

## 遗留技术债

> [!WARNING]
> `server/package.json` 中仍保留 `mongoose` 依赖，但项目已全面迁移至 SQLite。该依赖未被任何运行时代码使用，可安全移除。
