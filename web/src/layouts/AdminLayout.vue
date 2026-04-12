<template>
  <!-- 管理后台布局: 深色 Sidebar + Main -->
  <div class="admin-layout">
    <!-- 深色侧边栏 -->
    <aside class="admin-sidebar">
      <div class="admin-sidebar__logo">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>管理后台</span>
      </div>

      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        :class="['admin-sidebar__item', { 'admin-sidebar__item--active': isActive(item.path) }]"
      >
        <component :is="item.icon" class="icon" :size="16" />
        <span>{{ item.label }}</span>
      </router-link>
    </aside>

    <!-- 主内容区 -->
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  BarChart3,
  Users,
  FileText,
  Cpu,
  TrendingUp,
  Settings,
  Crown,
  Package,
} from 'lucide-vue-next';

const route = useRoute();

const menuItems = [
  { path: '/admin', label: '仪表盘', icon: BarChart3, exact: true },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/membership', label: '会员管理', icon: Crown },
  { path: '/admin/products', label: '商品管理', icon: Package },
  { path: '/admin/content', label: '内容管理', icon: FileText },
  { path: '/admin/ai-config', label: 'AI 配置', icon: Cpu },
  { path: '/admin/analytics', label: '数据统计', icon: TrendingUp },
  { path: '/admin/settings', label: '系统设置', icon: Settings },
];

function isActive(path: string) {
  if (path === '/admin') {
    return route.path === '/admin';
  }
  return route.path.startsWith(path);
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/admin.scss';
</style>
