<template>
  <nav class="breadcrumb" v-if="breadcrumbs.length > 0">
    <ol class="breadcrumb-list">
      <li 
        v-for="(crumb, index) in breadcrumbs" 
        :key="crumb.path"
        class="breadcrumb-item"
        :class="{ 'breadcrumb-item--current': index === breadcrumbs.length - 1 }"
      >
        <!-- 分隔符 -->
        <span v-if="index > 0" class="breadcrumb-separator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        
        <!-- 面包屑链接 -->
        <router-link 
          v-if="index < breadcrumbs.length - 1 && crumb.path"
          :to="crumb.path"
          class="breadcrumb-link"
        >
          <el-icon v-if="crumb.icon" class="breadcrumb-icon">
            <component :is="crumb.icon" />
          </el-icon>
          <span>{{ crumb.label }}</span>
        </router-link>
        
        <!-- 当前页面（不可点击） -->
        <span v-else class="breadcrumb-current">
          <el-icon v-if="crumb.icon" class="breadcrumb-icon">
            <component :is="crumb.icon" />
          </el-icon>
          <span>{{ crumb.label }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface RouteConfig {
  label: string;
  icon?: string;
  parent?: string;
}

const route = useRoute();

// 面包屑映射配置
const routeLabels: Record<string, RouteConfig> = {
  '/projects': { label: '项目', icon: 'FolderOpened' },
  '/templates': { label: '模板', icon: 'CopyDocument' },
  '/teams': { label: '团队', icon: 'Avatar' },
  '/teams/:id': { label: '团队详情', parent: '/teams' },
  '/editor': { label: '编辑器', icon: 'EditPen' },
  '/editor/:documentId': { label: '编辑文档', icon: 'EditPen', parent: '/projects' },
  '/profile': { label: '个人中心', icon: 'User' },
  '/membership': { label: '会员中心', icon: 'Star' },
  '/pricing': { label: '定价', icon: 'PriceTag' },
  '/checkout': { label: '结算', parent: '/pricing' },
  '/invitations': { label: '邀请管理', icon: 'Message', parent: '/teams' },
  '/admin': { label: '管理后台', icon: 'Setting' },
  '/admin/users': { label: '用户管理', parent: '/admin' },
  '/admin/membership': { label: '会员管理', parent: '/admin' },
  '/admin/products': { label: '商品管理', parent: '/admin' },
  '/admin/content': { label: '内容审核', parent: '/admin' },
  '/admin/ai-config': { label: 'AI 配置', parent: '/admin' },
  '/admin/analytics': { label: '数据统计', parent: '/admin' },
  '/admin/settings': { label: '系统设置', parent: '/admin' },
};

// 获取路由的面包屑配置
function getRouteConfig(path: string): RouteConfig | null {
  // 精确匹配
  if (routeLabels[path]) {
    return routeLabels[path];
  }
  
  // 动态路由匹配
  for (const [pattern, config] of Object.entries(routeLabels)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(path)) {
        return config;
      }
    }
  }
  
  return null;
}

// 构建面包屑路径
const breadcrumbs = computed((): BreadcrumbItem[] => {
  const crumbs: BreadcrumbItem[] = [];
  const currentPath = route.path;
  
  // 获取当前路由配置
  const currentConfig = getRouteConfig(currentPath);
  if (!currentConfig) {
    return crumbs;
  }
  
  // 构建父级路径链
  const pathChain: string[] = [];
  let config: RouteConfig | null = currentConfig;
  
  while (config) {
    if (config.parent) {
      pathChain.unshift(config.parent);
      config = getRouteConfig(config.parent);
    } else {
      break;
    }
  }
  
  // 添加父级面包屑
  for (const parentPath of pathChain) {
    const parentConfig = routeLabels[parentPath];
    if (parentConfig) {
      crumbs.push({
        label: parentConfig.label,
        path: parentPath,
        icon: parentConfig.icon,
      });
    }
  }
  
  // 添加当前页面
  crumbs.push({
    label: currentConfig.label,
    icon: currentConfig.icon,
  });
  
  return crumbs;
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.breadcrumb {
  padding: 8px 0;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: $text-muted;
  margin: 0 4px;
  
  svg {
    width: 14px;
    height: 14px;
  }
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: $text-secondary;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all $transition-fast;
  font-weight: 500;
  
  &:hover {
    color: $layout-sider-dark;
    background: rgba(0, 0, 0, 0.04);
  }
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  gap: 6px;
  color: $layout-sider-dark;
  font-weight: 600;
  padding: 4px 8px;
}

.breadcrumb-icon {
  font-size: 16px;
}

.breadcrumb-item--current {
  .breadcrumb-current {
    background: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
  }
}

// 响应式
@media (max-width: $breakpoint-md) {
  .breadcrumb {
    padding: 6px 0;
  }
  
  .breadcrumb-link,
  .breadcrumb-current {
    font-size: 13px;
    padding: 3px 6px;
  }
  
  .breadcrumb-icon {
    font-size: 14px;
  }
}
</style>
