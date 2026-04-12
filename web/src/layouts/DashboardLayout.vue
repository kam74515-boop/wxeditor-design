<template>
  <!-- 仪表盘通用布局: TopNavBar + Sidebar + Main -->
  <div class="dashboard-layout">
    <!-- 顶部导航栏 -->
    <nav class="topnav">
      <router-link to="/" class="topnav__logo">
        <Logo :size="18" />
        <span>WxEditor</span>
      </router-link>

      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['topnav__item', { 'topnav__item--active': isActive(item.path) }]"
      >
        {{ item.label }}
      </router-link>

      <div class="topnav__spacer" />

      <div class="topnav__right">
        <router-link to="/pricing" class="topnav__badge">⭐ 专业版</router-link>
        <div class="topnav__avatar" @click="toggleUserMenu">
          <img v-if="userStore.avatar" :src="userStore.avatar" alt="头像" />
        </div>
      </div>
    </nav>

    <!-- 主体区域 -->
    <div class="dashboard-body">
      <!-- 侧边栏（可选） -->
      <aside v-if="showSidebar" class="sidebar">
        <div class="sidebar__title">{{ sidebarTitle }}</div>
        <slot name="sidebar" />
        <div class="sidebar__spacer" />
        <slot name="sidebar-action" />
      </aside>

      <!-- 主内容 -->
      <main class="main-content">
        <Breadcrumb />
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import Breadcrumb from '@/components/navigation/Breadcrumb.vue';
import Logo from '@/components/navigation/Logo.vue';

defineProps<{
  showSidebar?: boolean;
  sidebarTitle?: string;
}>();

const route = useRoute();
const userStore = useUserStore();

const navItems = [
  { path: '/editor', label: '编辑器' },
  { path: '/projects', label: '项目' },
  { path: '/templates', label: '模板' },
  { path: '/teams', label: '团队' },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}

function toggleUserMenu() {
  // TODO: 显示用户菜单弹窗
}
</script>

<style lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/dashboard.scss';
</style>
