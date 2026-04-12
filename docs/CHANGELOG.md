# WXEditor — 变更日志

本文件记录项目的主要版本变更。

---

## [2.0.0] - 2026-03-16

### 🏗 架构重构

- **前后端分离**：将原混合结构拆分为 `web/`（Vue 3 + Vite）和 `server/`（Node.js + Express）两个独立项目
- **数据库迁移**：从 MongoDB/Mongoose 全面迁移至 SQLite（better-sqlite3），实现零配置部署
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

### ⚠️ 已知问题

- `server/package.json` 中 `mongoose` 依赖为遗留残留，未被使用
- `server/.env.example` 中仍保留 MongoDB 相关配置项
- 前端 AI Store 中 API Key 硬编码，需迁移至后端代理

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
