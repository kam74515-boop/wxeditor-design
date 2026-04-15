# WXEditor — 技术栈详情

> 本文档列出项目使用的全部技术依赖及其版本。
>
> **更新日期**：2026-04-15

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
| lodash-es | ^4.17.23 | JS 工具函数 |
| crypto-js | ^4.2.0 | 加密工具 |
| dompurify | ^3.0.8 | HTML XSS 过滤 |
| js-cookie | ^3.0.5 | Cookie 管理 |
| nprogress | ^0.2.0 | 页面进度条 |
| sortablejs | ^1.15.7 | 拖拽排序 |
| vue-cropper | ^1.1.4 | 图片裁剪 |
| vue-i18n | ^9.14.5 | 国际化 |

### 构建工具

| 依赖 | 版本 | 用途 |
|------|------|------|
| vite | ^5.0.11 | 构建与开发服务器 |
| @vitejs/plugin-vue | ^5.0.3 | Vite Vue 插件 |
| typescript | 5.3.3 | TypeScript 编译 |
| vue-tsc | ^1.8.27 | Vue TypeScript 类型检查 |
| sass | ^1.70.0 | CSS 预处理器 |
| unplugin-auto-import | ^0.17.3 | API 自动导入 |
| unplugin-vue-components | ^0.26.0 | 组件自动导入 |
| eslint | ^8.56.0 | 代码规范 |
| prettier | ^3.2.4 | 代码格式化 |

### 测试

| 依赖 | 版本 | 用途 |
|------|------|------|
| @playwright/test | ^1.59.1 | E2E 端到端测试 |

---

## 后端（`server/`）

### 核心框架

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^5.1.0 | Web 框架 |
| cors | ^2.8.5 | 跨域支持 |
| dotenv | ^16.4.7 | 环境变量管理 |
| morgan | ^1.10.0 | HTTP 请求日志 |
| express-rate-limit | ^7.5.0 | API 限流 |

### 数据库

| 依赖 | 版本 | 用途 |
|------|------|------|
| knex | ^3.1.0 | SQL 查询构建器（迁移 + 种子） |
| mysql2 | ^3.12.0 | MySQL 驱动 |

### 认证与安全

| 依赖 | 版本 | 用途 |
|------|------|------|
| jsonwebtoken | ^9.0.2 | JWT Token 生成与验证 |
| bcryptjs | ^2.4.3 | 密码哈希 |
| express-validator | ^7.2.1 | 请求参数校验 |
| sanitize-html | ^2.14.0 | HTML 净化 |

### 实时通信

| 依赖 | 版本 | 用途 |
|------|------|------|
| socket.io | ^4.8.1 | WebSocket 服务端 |

### 文件处理

| 依赖 | 版本 | 用途 |
|------|------|------|
| multer | ^1.4.5-lts.1 | 文件上传 |
| sharp | ^0.33.5 | 图片处理（压缩/裁剪/格式转换） |

### 其他

| 依赖 | 版本 | 用途 |
|------|------|------|
| uuid | ^11.1.0 | UUID 生成 |
| axios | ^1.7.9 | HTTP 客户端（远程图片抓取/微信 API） |

### 开发工具

| 依赖 | 版本 | 用途 |
|------|------|------|
| nodemon | ^3.1.9 | 开发热重载 |
| jest | ^30.3.0 | 单元/集成测试 |
| supertest | ^7.2.2 | HTTP API 测试 |

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
| MySQL | >= 8.0 |
| 操作系统 | macOS / Linux / Windows |
| Docker | >= 20（可选，用于容器部署） |
| Docker Compose | >= 2.0（可选） |

## 与 v1.0 的技术差异

| 项目 | v1.0（旧） | v2.x（当前） |
|------|-----------|-------------|
| 后端目录 | `server/` | `server/`（已统一命名） |
| 数据库 | SQLite（better-sqlite3） | MySQL（Knex + mysql2） |
| 后端架构 | Routes → Models | Controller → Service → Repository |
| 数据迁移 | 手动建表（`config/database.js`） | Knex 迁移脚本（`migrations/`） |
| 后端端口 | `:3000` | `:3001` |
| 前端端口 | `:5173` | `:5174` |
| AI 架构 | 前端直连 + 后端简单转发 | SSE + Function Calling + AI Agent |
| 微信对接 | Puppeteer 浏览器自动化 | 微信公众号 API + OAuth |
| 权限中间件 | 简单 `requireRole` | RBAC（`rbac.js`） |
| 图片处理 | 无 | Sharp 压缩/裁剪 |
| API 限流 | 无 | express-rate-limit |
| 测试 | 无 | Jest + Supertest（31 用例） |
