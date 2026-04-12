# WXEditor — 前端架构说明

> 前端项目位于 `web/` 目录，基于 Vue 3 + TypeScript + Vite 5 构建。

## 1. 技术架构

```
┌───────────────────────────────────────────────┐
│                 浏览器                          │
├───────────────────────────────────────────────┤
│  Vue Router          路由层                     │
│  ├── 导航守卫（JWT 认证检查）                     │
│  └── 懒加载路由                                 │
├───────────────────────────────────────────────┤
│  Views               页面视图层                  │
│  ├── EditorView      编辑器                     │
│  ├── ProjectsView    项目管理                    │
│  ├── TemplatesView   模板库                     │
│  ├── auth/           认证页面                    │
│  ├── membership/     会员页面                    │
│  └── teams/          团队页面                    │
├───────────────────────────────────────────────┤
│  Components          组件层                      │
│  ├── ai/             AI 面板                    │
│  ├── base/           基础组件（设计系统）           │
│  ├── collab/         协作组件                    │
│  ├── common/         通用组件                    │
│  ├── editor/         编辑器组件                   │
│  └── sidebar/        侧边栏组件                  │
├───────────────────────────────────────────────┤
│  Pinia Stores        状态管理层                   │
│  ├── ai.ts           AI 对话状态                 │
│  ├── editor.ts       编辑器状态                   │
│  ├── theme.ts        主题状态                    │
│  └── user.ts         用户状态                    │
├───────────────────────────────────────────────┤
│  API / Utils         基础设施层                   │
│  ├── api/index.ts    API 接口封装                │
│  ├── api/http.ts     Axios 实例                 │
│  └── utils/          工具函数                    │
└───────────────────────────────────────────────┘
```

## 2. 路由设计

所有路由在 `src/router/index.ts` 中集中定义，使用懒加载。

| 路由 | 视图组件 | 认证 | 说明 |
|------|----------|------|------|
| `/` | `LoginView.vue` | 否 | 登录页（默认首页） |
| `/register` | `RegisterView.vue` | 否 | 注册页 |
| `/editor` | `EditorView.vue` | 是 | 编辑器 |
| `/projects` | `ProjectsView.vue` | 是 | 项目管理 |
| `/templates` | `TemplatesView.vue` | 是 | 模板库 |
| `/components` | `ComponentsView.vue` | 是 | 组件库 |
| `/pricing` | `PricingView.vue` | 否 | 定价页 |
| `/checkout` | `CheckoutView.vue` | 是 | 结算页 |
| `/membership` | `MembershipView.vue` | 是 | 会员中心 |
| `/:pathMatch(.*)*` | `NotFoundView.vue` | — | 404 页面 |

### 路由守卫

```typescript
// 全局前置守卫：检查 JWT Token
router.beforeEach((to, _from, next) => {
  const requiresAuth = to.matched.some(record => record.meta?.requiresAuth);
  const token = localStorage.getItem('token');
  if (requiresAuth && !token) {
    next({ name: 'Login' });
  } else {
    next();
  }
});
```

## 3. 状态管理

使用 Pinia 管理全局状态，各 Store 职责：

### `stores/ai.ts` — AI 写作助手

- 管理 AI 对话消息列表
- 直连通义千问 Dashscope API（前端直调）
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

## 4. API 封装

`src/api/index.ts` 集中定义所有后端 API 调用：

| API 模块 | 方法 | 说明 |
|----------|------|------|
| `projectApi.getList()` | GET | 获取项目列表 |
| `projectApi.create()` | POST | 创建项目 |
| `projectApi.update()` | PUT | 更新项目 |
| `projectApi.delete()` | DELETE | 删除项目 |
| `articleApi.getContent()` | GET | 获取文章内容 |
| `articleApi.save()` | POST | 保存文章 |
| `articleApi.publish()` | POST | 发布文章 |
| `uploadApi.uploadImage()` | POST | 上传图片 |
| `uploadApi.uploadCover()` | POST | 上传封面 |
| `aiApi.chat()` | POST | AI 对话 |
| `aiApi.generateComponent()` | POST | AI 生成组件 |
| `aiApi.optimizeContent()` | POST | AI 优化内容 |

## 5. 构建配置

### Vite 配置（`vite.config.ts`）

- **路径别名**：`@` → `src/`，`@components`、`@views`、`@utils` 等快捷别名
- **API 代理**：开发环境 `/api/` 和 `/uploads/` 代理到 `http://localhost:3000`
- **自动导入**：Vue/Vue Router/Pinia API 自动导入（unplugin-auto-import）
- **组件自动注册**：Element Plus 组件按需导入（unplugin-vue-components）
- **Sass 全局变量**：自动注入 `@/styles/variables.scss`
- **代码分割**：Element Plus 单独打包（manualChunks）

### TypeScript 支持

- 严格模式启用
- 自动生成类型声明文件（`auto-imports.d.ts`、`components.d.ts`）

## 6. 设计系统

采用**便利贴 + 波普艺术**设计语言，核心特征：

- **直角设计**：所有组件 `border-radius: 0`
- **硬边阴影**：`box-shadow: 4px 4px 0px #000000`
- **便利贴色系**：黄/粉/蓝/绿/橙/紫 6 色
- **2px 黑色边框**：所有交互元素

> 完整设计系统参见 [`server/docs/design-system.md`](../server/docs/design-system.md)
