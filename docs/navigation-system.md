# WxEditor 导航系统

## 概述

WxEditor 导航系统提供了一套完整的用户导航解决方案，包括面包屑导航、智能返回按钮和页面过渡动画。

## 组件

### 1. Breadcrumb 面包屑导航

显示当前页面在导航层级中的位置，支持点击跳转到父级页面。

```vue
<template>
  <Breadcrumb />
</template>
```

**功能：**
- 自动根据当前路由生成面包屑
- 支持动态路由（如 `/teams/:id`）
- 点击可跳转到父级页面
- 当前页面高亮显示

**路由配置：**

面包屑通过 `routeLabels` 映射配置路由层级关系：

```typescript
const routeLabels = {
  '/projects': { label: '项目', icon: 'FolderOpened' },
  '/teams/:id': { label: '团队详情', parent: '/teams' },
  // ...
};
```

### 2. BackButton 返回按钮

智能返回按钮，优先使用浏览器历史记录，无历史时使用 fallback 路径。

```vue
<template>
  <BackButton 
    to="/projects" 
    label="项目列表" 
    variant="ghost" 
    size="md" 
  />
</template>
```

**Props：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `to` | `string` | - | 自定义返回目标路径 |
| `label` | `string` | `'返回'` | 按钮标签文字 |
| `showLabel` | `boolean` | `true` | 是否显示标签 |
| `variant` | `'default' \| 'ghost' \| 'primary'` | `'ghost'` | 按钮样式变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮大小 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `beforeBack` | `() => boolean \| Promise<boolean>` | - | 返回前的回调 |

**Events：**

| 事件 | 说明 |
|------|------|
| `back` | 返回操作完成后触发 |

**智能返回逻辑：**

1. 如果指定了 `to` 属性，直接跳转到该路径
2. 如果有浏览器历史记录，使用 `router.back()`
3. 如果没有历史记录，使用 fallback 路径

**Fallback 路径配置：**

```typescript
const fallbackRoutes = {
  '/editor': '/projects',
  '/editor/:documentId': '/projects',
  '/teams/:id': '/teams',
  // ...
};
```

### 3. Logo 统一 Logo 组件

```vue
<template>
  <Logo :size="24" />
</template>
```

**Props：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `number \| string` | `24` | Logo 尺寸 |

### 4. PageTransition 页面过渡动画

自动根据导航深度选择动画方向：
- 进入子页面：从右向左滑入
- 返回父页面：从左向右滑出
- 同级切换：淡入淡出

```vue
<template>
  <PageTransition>
    <router-view />
  </PageTransition>
</template>
```

## Store

### useNavigationStore

导航状态管理，记录历史和导航状态。

```typescript
import { useNavigationStore } from '@/stores/navigation';

const navigationStore = useNavigationStore();

// 是否可以后退
navigationStore.canGoBack;

// 添加历史记录
navigationStore.addHistoryEntry('/path', '页面标题');

// 获取最近的历史
const recent = navigationStore.getRecentHistory(10);
```

**State：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `historyLength` | `number` | 浏览器历史栈长度 |
| `historyEntries` | `HistoryEntry[]` | 自定义历史记录 |
| `isNavigating` | `boolean` | 是否正在导航中 |

**Getters：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `canGoBack` | `boolean` | 是否可以后退 |
| `canGoForward` | `boolean` | 是否可以前进 |

**Actions：**

| 方法 | 说明 |
|------|------|
| `addHistoryEntry(path, title)` | 添加历史记录 |
| `updateHistoryLength()` | 更新浏览器历史长度 |
| `setNavigating(value)` | 设置导航状态 |
| `getRecentHistory(count)` | 获取最近的历史记录 |
| `clearHistory()` | 清空历史记录 |

## 使用示例

### 在 EditorView 中使用返回按钮

```vue
<template>
  <div class="editor-workbench">
    <aside class="left-sider-card">
      <div class="sider-block user-login-card">
        <BackButton to="/projects" label="项目列表" variant="ghost" size="sm" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import BackButton from '@/components/navigation/BackButton.vue';
</script>
```

### 在 DashboardLayout 中集成面包屑

```vue
<template>
  <div class="dashboard-layout">
    <nav class="topnav">
      <router-link to="/projects" class="topnav__logo">
        <Logo :size="18" />
        <span>WxEditor</span>
      </router-link>
    </nav>
    
    <main class="main-content">
      <Breadcrumb />
      <slot />
    </main>
  </div>
</template>

<script setup>
import Breadcrumb from '@/components/navigation/Breadcrumb.vue';
import Logo from '@/components/navigation/Logo.vue';
</script>
```

## 最佳实践

1. **面包屑配置**：新增页面时，在 `Breadcrumb.vue` 的 `routeLabels` 中添加路由配置
2. **返回按钮**：在所有二级页面添加返回按钮，使用 `variant="ghost"` 保持视觉一致性
3. **Logo 统一**：所有需要显示 Logo 的地方使用 `<Logo>` 组件，确保一致性
4. **过渡动画**：通过 `PageTransition` 组件自动处理，无需手动配置

## 文件结构

```
src/
├── components/
│   └── navigation/
│       ├── BackButton.vue    # 返回按钮组件
│       ├── Breadcrumb.vue    # 面包屑组件
│       ├── Logo.vue          # Logo 组件
│       └── PageTransition.vue # 页面过渡动画
├── stores/
│   └── navigation.ts         # 导航状态管理
└── layouts/
    └── DashboardLayout.vue   # 集成面包屑
```
