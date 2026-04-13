# Phase 3 功能完善 - 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 完成 4 个待开发功能的前端对接和全新功能开发

**Architecture:** 后端 Clean Architecture 已就绪（controller→service→repo），前端为 Vue3+TS+Element Plus SPA

**Tech Stack:** Vue 3, TypeScript, Element Plus, Pinia, Vue Router, Axios

---

## 任务概览

| # | 功能 | 后端状态 | 前端状态 |
|---|------|----------|----------|
| A | 多公众号管理 | ✅ 完整 | ⚠️ 有admin页面，缺用户端页面+API |
| B | 定时发布 | ✅ 完整 | ❌ 无前端页面+API |
| C | 评论批注 | ✅ 完整 | ❌ 无前端页面+API |
| D | 图文消息多篇文章 | ❌ 无 | ❌ 无 |

---

## 任务 A: 多公众号管理 - 用户端前端

### 需要修改/创建的文件:
1. `web/src/api/index.ts` - 添加 wechatAccountApi
2. `web/src/views/wechat/WechatAccountsView.vue` - 用户端公众号管理页面 (新建)
3. `web/src/layouts/DashboardLayout.vue` - sidebar 添加入口
4. `web/src/router/index.ts` - 添加路由

### API 端点 (已有后端):
- GET /api/wechat-accounts - 列出公众号
- POST /api/wechat-accounts - 添加公众号
- PUT /api/wechat-accounts/:id - 更新
- DELETE /api/wechat-accounts/:id - 删除
- POST /api/wechat-accounts/:id/verify - 验证

---

## 任务 B: 定时发布

### 需要修改/创建的文件:
1. `web/src/api/index.ts` - 添加 scheduledPostApi
2. `web/src/views/scheduled/ScheduledPostsView.vue` - 定时发布列表页 (新建)
3. `web/src/views/scheduled/ScheduledPostCreateView.vue` - 创建/编辑定时任务 (新建)
4. `web/src/layouts/DashboardLayout.vue` - sidebar 添加入口
5. `web/src/router/index.ts` - 添加路由

### API 端点 (已有后端):
- GET /api/scheduled-posts - 列出任务
- POST /api/scheduled-posts - 创建任务
- PUT /api/scheduled-posts/:id - 更新
- DELETE /api/scheduled-posts/:id - 取消
- POST /api/scheduled-posts/:id/execute - 立即执行

---

## 任务 C: 评论批注

### 需要修改/创建的文件:
1. `web/src/api/index.ts` - 添加 commentApi
2. `web/src/components/editor/CommentPanel.vue` - 编辑器侧边评论面板 (新建)
3. `web/src/views/EditorView.vue` - 集成评论面板

### API 端点 (已有后端):
- GET /api/comments/document/:docId - 获取文档评论(树形)
- POST /api/comments - 创建评论
- PUT /api/comments/:id - 更新
- DELETE /api/comments/:id - 删除

---

## 任务 D: 图文消息多篇文章 (后端+前端)

### 后端新建文件:
1. `server-v2/src/repositories/articleBatch.repo.js` - 批次文章数据层
2. `server-v2/src/services/articleBatch.service.js` - 批次文章业务逻辑
3. `server-v2/src/controllers/articleBatch.ctrl.js` - 批次文章路由
4. `server-v2/migrations/003_article_batches.js` - 数据库迁移
5. `server-v2/src/routes/index.js` - 注册路由

### 前端新建文件:
1. `web/src/api/index.ts` - 添加 articleBatchApi
2. `web/src/views/articles/BatchEditorView.vue` - 多篇文章编辑器
3. `web/src/layouts/DashboardLayout.vue` - sidebar 添加入口
4. `web/src/router/index.ts` - 添加路由

### 数据库设计:
- article_batches: id, user_id, account_id, title, status, created_at, updated_at
- batch_articles: id, batch_id, position, title, content, cover_image, digest, author, word_count, created_at, updated_at
