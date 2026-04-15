# WXEditor — 前端架构说明

> 前端项目位于 `web/` 目录，基于 Vue 3 + TypeScript + Vite 5 构建。
>
> **更新日期**：2026-04-15

## 1. 技术架构

```
┌───────────────────────────────────────────────┐
│                 浏览器                          │
├───────────────────────────────────────────────┤
│  Vue Router          路由层                     │
│  ├── 导航守卫（JWT + Admin 认证检查）            │
│  ├── 懒加载路由                                 │
│  └── 多布局嵌套路由                              │
├───────────────────────────────────────────────┤
│  Layouts             布局层                      │
│  ├── DashboardLayout 仪表盘布局                  │
│  ├── EditorLayout    编辑器布局                  │
│  ├── AdminLayout     管理后台布局                │
│  └── WorkspaceLayout 工作区布局                  │
├───────────────────────────────────────────────┤
│  Views               页面视图层                  │
│  ├── HomeView        官网首页                    │
│  ├── EditorView      编辑器                     │
│  ├── ProjectsView    项目管理                    │
│  ├── TemplatesView   模板库                     │
│  ├── MaterialsView   素材库                     │
│  ├── ProfileView     个人中心                    │
│  ├── auth/           认证页面                    │
│  ├── membership/     会员页面                    │
│  ├── teams/          团队页面                    │
│  ├── wechat/         公众号管理                   │
│  ├── scheduled/      定时发布                    │
│  ├── articles/       图文合集                    │
│  └── admin/          管理后台（10 个子页面）       │
├───────────────────────────────────────────────┤
│  Components          组件层                      │
│  ├── base/           基础组件（设计系统）           │
│  ├── editor/         编辑器组件（评论面板）         │
│  ├── navigation/     导航组件（面包屑/返回/Logo）  │
│  ├── GlobalNav.vue   全局导航栏                   │
│  └── UpgradeModal    升级弹窗                    │
├───────────────────────────────────────────────┤
│  Pinia Stores        状态管理层                   │
│  ├── ai.ts           AI 对话状态                 │
│  ├── editor.ts       编辑器状态                   │
│  ├── theme.ts        主题状态                    │
│  ├── user.ts         用户状态                    │
│  ├── navigation.ts   导航状态                    │
│  ├── wechat.ts       微信状态                    │
│  └── app.ts          应用全局状态                 │
├───────────────────────────────────────────────┤
│  API / Utils         基础设施层                   │
│  ├── api/index.ts    API 接口封装                │
│  ├── i18n/           国际化                      │
│  └── utils/          工具函数                    │
└───────────────────────────────────────────────┘
```

## 2. 路由设计

路由在 `src/router/index.ts` 中集中定义，使用懒加载 + 多布局嵌套。

### 公开路由（无需认证）

| 路由 | 视图组件 | 说明 |
|------|----------|------|
| `/` | `HomeView.vue` | 官网首页 |
| `/login` | `LoginView.vue` | 登录页（guestOnly） |
| `/register` | `RegisterView.vue` | 注册页（guestOnly） |
| `/auth/wechat/callback` | `WechatCallbackView.vue` | 微信 OAuth 回调 |
| `/pricing` | `PricingView.vue` | 定价页 |
| `/:pathMatch(.*)*` | `NotFoundView.vue` | 404 页面 |

### 认证路由

| 路由 | 视图组件 | 说明 |
|------|----------|------|
| `/editor` | `EditorView.vue` | 编辑器（新建） |
| `/editor/:documentId` | `EditorView.vue` | 编辑指定文档 |
| `/projects` | `ProjectsView.vue` | 项目管理 |
| `/templates` | `TemplatesView.vue` | 模板库 |
| `/materials` | `MaterialsView.vue` | 素材库 |
| `/ai-writing` | `EditorView.vue` | AI 写作 |
| `/profile` | `ProfileView.vue` | 个人中心 |
| `/settings` | `ProfileView.vue` | 设置 |
| `/wechat-accounts` | `WechatAccountsView.vue` | 我的公众号 |
| `/teams` | `TeamsView.vue` | 团队列表 |
| `/teams/:id` | `TeamDetailView.vue` | 团队详情 |
| `/invitations` | `InvitationsView.vue` | 邀请管理 |
| `/membership` | `MembershipView.vue` | 会员中心 |
| `/checkout` | `CheckoutView.vue` | 结算页 |

### 仪表盘子路由（DashboardLayout 包裹）

| 路由 | 视图组件 | 说明 |
|------|----------|------|
| `/dashboard` | `DashboardHomeView.vue` | 仪表盘首页 |
| `/dashboard/article-batches` | `BatchListView.vue` | 图文合集列表 |
| `/dashboard/article-batches/:id` | `BatchEditorView.vue` | 编辑图文合集 |
| `/dashboard/scheduled-posts` | `ScheduledPostsView.vue` | 定时发布 |
| `/dashboard/scheduled-posts/create` | `ScheduledPostCreateView.vue` | 创建定时任务 |
| `/dashboard/wechat-accounts` | `WechatAccountsView.vue` | 公众号管理 |

### 管理后台子路由（AdminLayout 包裹，需 admin 角色）

| 路由 | 视图组件 | 说明 |
|------|----------|------|
| `/admin` | `DashboardView.vue` | 系统概览 |
| `/admin/users` | `UsersView.vue` | 用户管理 |
| `/admin/membership` | `MembershipView.vue` | 会员管理 |
| `/admin/products` | `ProductsView.vue` | 商品管理 |
| `/admin/content` | `ContentReviewView.vue` | 内容审核 |
| `/admin/comments` | `CommentsView.vue` | 评论管理 |
| `/admin/wechat-accounts` | `WechatAccountsView.vue` | 公众号管理 |
| `/admin/ai-config` | `AIConfigView.vue` | AI 配置 |
| `/admin/analytics` | `AnalyticsView.vue` | 数据统计 |
| `/admin/settings` | `SettingsView.vue` | 系统设置 |

### 路由守卫

```typescript
router.beforeEach(async (to, _from, next) => {
  // 1. 进度条
  NProgress.start();
  
  // 2. 已登录用户访问 guestOnly 页面 → 跳转项目管理
  if (guestOnly && token) → redirect to Projects
  
  // 3. 未登录访问 requiresAuth 页面 → 跳转登录（携带 redirect）
  if (requiresAuth && !token) → redirect to Login
  
  // 4. 已认证但无缓存用户信息 → 调 validateSession() 验证
  if (requiresAuth && token && !userStr) → await validateSession()
  
  // 5. 管理员权限检查
  if (requiresAdmin) → check user.role includes admin/superadmin
});
```

## 3. 状态管理

使用 Pinia 管理全局状态，共 7 个 Store：

### `stores/ai.ts` — AI 写作助手
- 管理 AI 对话消息列表
- SSE 流式调用 Dashscope API
- 自动提取 AI 回复中的代码块
- 控制 AI 面板显示/隐藏

### `stores/editor.ts` — 编辑器状态
- 管理当前文档信息
- 编辑器内容同步
- UEditor 实例引用

### `stores/theme.ts` — 主题状态
- 亮色/暗色模式切换

### `stores/user.ts` — 用户状态
- 用户信息存储
- 登录/登出状态管理
- JWT Token 管理
- `validateSession()` 会话验证

### `stores/navigation.ts` — 导航状态
- 浏览器历史栈管理
- 自定义历史记录
- 导航状态追踪

### `stores/wechat.ts` — 微信状态
- 微信公众号绑定状态
- OAuth 授权流程

### `stores/app.ts` — 应用全局状态
- 全局加载状态
- 应用级配置

## 4. 组件体系

### 基础组件（`components/base/`）

| 组件 | 用途 |
|------|------|
| `AppButton.vue` | 通用按钮 |
| `FlatButton.vue` | 扁平按钮 |
| `StickyNote.vue` | 便利贴卡片 |
| `PopCard.vue` | 弹出卡片 |
| `PaperInput.vue` | 输入框 |
| `EmptyState.vue` | 空状态占位 |

### 导航组件（`components/navigation/`）

| 组件 | 用途 |
|------|------|
| `BackButton.vue` | 智能返回按钮 |
| `Breadcrumb.vue` | 面包屑导航 |
| `Logo.vue` | 统一 Logo |
| `PageTransition.vue` | 页面过渡动画 |

### 编辑器组件（`components/editor/`）

| 组件 | 用途 |
|------|------|
| `CommentPanel.vue` | 评论批注面板 |
| `CommentItem.vue` | 单条评论项 |

### 全局组件

| 组件 | 用途 |
|------|------|
| `GlobalNav.vue` | 全局顶部导航栏 |
| `UpgradeModal.vue` | 会员升级弹窗 |

## 5. 布局体系

### DashboardLayout
- 顶部导航 + 侧边栏 + 主内容区
- 用于仪表盘、图文合集、定时发布等页面

### EditorLayout
- 三栏布局（左面板 + 编辑区 + 右面板）
- 用于编辑器页面

### AdminLayout
- 深色侧边栏 + 主内容区
- 用于管理后台页面

### WorkspaceLayout
- 简洁工作区布局
- 通用页面容器

## 6. 构建配置

### Vite 配置（`vite.config.ts`）

- **路径别名**：`@` → `src/`，`@components`、`@views`、`@utils`、`@api`、`@stores`、`@types`、`@assets`
- **API 代理**：开发环境 `/api/` 和 `/uploads/` 代理到 `http://localhost:3001`
- **自动导入**：Vue/Vue Router/Pinia API 自动导入（unplugin-auto-import）
- **组件自动注册**：Element Plus 组件按需导入（unplugin-vue-components）
- **Sass 全局变量**：自动注入 `@/styles/variables.scss`
- **代码分割**：Element Plus 核心/图标、lodash 单独打包（manualChunks）
- **开发端口**：`:5174`

### TypeScript 支持

- 严格模式启用
- 自动生成类型声明文件（`auto-imports.d.ts`、`components.d.ts`）
