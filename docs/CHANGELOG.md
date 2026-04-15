# WXEditor — 变更日志

本文件记录项目的主要版本变更。

---

## [2.1.2] - 2026-04-15

### 🗂 文档整理

- 新增 `docs/README.md` 作为文档总索引，统一阅读入口
- 删除重复的 AI 愿景文档，AI 说明收敛到 `AI_INTEGRATION.md` 与 `AI_AGENT_ARCHITECTURE.md`
- 精简根目录 `README.md` 中的文档列表，避免维护两份重复索引

---

## [2.1.1] - 2026-04-15

### 🧹 目录整理

- **后端目录统一**：将旧后端目录恢复为 `server/`
- **路径说明更新**：同步修正文档、部署脚本与示例命令中的后端路径指向

---

## [2.1.0] - 2026-04-15

### 🏗 架构升级

- **后端重构为 Clean Architecture**：从 Routes → Models 迁移至 Controller → Service → Repository 三层架构，后端目录统一为 `server/`
- **数据库迁移至 MySQL**：从 SQLite（better-sqlite3）全面迁移至 MySQL（Knex + mysql2），支持迁移脚本与种子数据
- **后端端口变更**：从 `:3000` 调整为 `:3001`
- **前端端口变更**：从 `:5173` 调整为 `:5174`
- **微信对接升级**：从 Puppeteer 浏览器自动化迁移至微信公众号 API + OAuth 方式

### ✨ 新功能

- **多公众号管理**：绑定/验证/切换多个微信公众号（wechatAccount 模块）
- **定时发布**：创建/编辑/取消定时发布任务，后端 SchedulerService 自动调度
- **评论批注**：文档树形评论、编辑器内评论面板（CommentPanel + CommentItem）
- **图文合集**：多篇文章批次管理、排序、批量编辑（ArticleBatch 模块）
- **AI Agent**：Function Calling 工具调用架构（ai/tools.js、ai/prompts.js、ai/formatter.js）
- **微信 OAuth 登录**：微信授权登录与账号绑定（WechatCallbackView）
- **管理后台扩展**：新增评论管理、公众号管理、商品管理子页面
- **仪表盘布局**：新增 DashboardLayout 包裹的嵌套路由（图文合集/定时发布/公众号管理）
- **官网首页**：新增 HomeView 作为默认落地页

### 🔄 改进

- **RBAC 权限**：新增 `rbac.js` 中间件，替代简单的 `requireRole`
- **API 限流**：新增 express-rate-limit 中间件
- **请求日志**：新增 Morgan HTTP 日志
- **图片处理**：新增 Sharp 图片压缩/裁剪
- **国际化**：新增 vue-i18n 支持
- **导航系统**：新增面包屑、智能返回按钮、页面过渡动画
- **Stores 扩展**：新增 navigation、wechat、app 三个 Pinia Store
- **路由守卫增强**：支持 guestOnly、requiresAdmin、validateSession
- **API 测试**：新增 Jest + Supertest 测试套件（31 用例）

### 📚 文档

- 全面重写所有 `docs/` 文档，对齐 `server/` + MySQL + Clean Architecture 实际状态
- 新增 `docs/API_CONTRACT.md` REST API 契约文档
- 新增 `docs/COMMERCIAL.md` 商业化方案
- 新增 `docs/GTM.md` 上市推广计划
- 新增 `docs/navigation-system.md` 导航系统文档
- 新增 `docs/pages.md` 产品页面文档
- 新增 `docs/TEST_REPORT.md` 测试报告
- 补充 AI 相关方案文档（后续已收敛到 `AI_INTEGRATION.md` 与 `AI_AGENT_ARCHITECTURE.md`）
- 新增 `docs/plans/` 实施计划目录

### ⚠️ 已知问题

- `docker-compose.yml` 使用 PostgreSQL（`DB_CLIENT=pg`），与本地 MySQL 开发环境仍未完全对齐

---

## [2.0.0] - 2026-03-16

### 🏗 架构重构

- **前后端分离**：将原混合结构拆分为 `web/`（Vue 3 + Vite）和 `server/`（Node.js + Express）两个独立项目，后续在 v2.1 中完成 Clean Architecture 重构
- **数据库迁移**：从 MongoDB/Mongoose 迁移至 SQLite（后续在 v2.1 中进一步迁移至 MySQL）
- **一键启动**：根目录 `npm run dev` 使用 `concurrently` 并发启动前后端
- **Docker 支持**：新增 `docker-compose.yml` 和 `nginx.conf`，支持容器化部署

### ✨ 新功能

- **AI 写作助手**：集成通义千问大模型（qwen3.5-plus），支持对话、润色、改写、标题生成、摘要生成
- **模板库**：预设排版模板，支持分类、公开/私有、使用计数
- **素材管理**：图片/视频/音频/文件上传，文件夹管理
- **团队协作**：团队创建、成员邀请、角色权限管理
- **会员体系**：套餐定价、会员中心、结算支付流程
- **管理后台**：用户管理、系统监控（admin 路由）
- **主题系统**：亮色/暗色模式切换
- **便利贴设计系统**：波普艺术风格 UI，直角边框 + 硬边阴影

### 🔄 改进

- **前端技术栈升级**：Vue 3 + TypeScript + Pinia + Element Plus + Lucide Icons
- **UEditor 主题定制**：波普风格 CSS 主题（`ueditor-flat.css`）
- **API 代理**：Vite 开发服务器自动代理 `/api/` 请求，消除跨域问题
- **组件自动导入**：unplugin-auto-import + unplugin-vue-components

### 📚 文档

- 全面重写 `README.md`
- 全面重写 `docs/PRD.md` 产品需求文档
- 全面重写 `docs/PROJECT_STRUCTURE.md` 项目结构文档
- 新增 `docs/TECH_STACK.md` 技术栈详情
- 新增 `docs/DATABASE.md` 数据库设计文档
- 新增 `docs/DEPLOYMENT.md` 部署指南
- 新增 `docs/FRONTEND_ARCHITECTURE.md` 前端架构说明
- 新增 `docs/BACKEND_ARCHITECTURE.md` 后端架构说明
- 新增 `docs/AI_INTEGRATION.md` AI 集成文档
- 重写 `server/docs/api/endpoints.md` API 端点文档
- 重写 `server/docs/user-flows/` 用户流程文档

### ⚠️ 已知问题（v2.0 时期）

- ~~`server/package.json` 中 `mongoose` 依赖为遗留残留~~ → 已在 v2.1 中移除
- ~~`server/.env.example` 中保留 MongoDB 相关配置项~~ → 已在 v2.1 中清理
- ~~前端 AI Store 中 API Key 硬编码~~ → 已在 v2.1 中迁移至后端统一代理

---

## [1.0.0] - 2026-02

### 初始版本

- UEditor 富文本编辑器集成
- 微信公众号 HTML 适配（标签过滤 + 样式内联）
- Puppeteer 自动化微信登录
- 一键同步到公众号草稿箱
- 图片自动上传到微信素材库
- 多人实时协作（Socket.IO）
- 预览与复制功能
