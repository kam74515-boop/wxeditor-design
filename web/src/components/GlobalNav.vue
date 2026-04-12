<template>
  <!-- 全局顶部导航 — 按设计文件 nav07 样式 -->
  <nav class="global-nav">
    <div class="nav-left">
      <router-link to="/" class="nav-logo">
        <Logo :size="18" />
        WxEditor
      </router-link>
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['nav-link', { 'nav-link--active': isActive(item.path) }]"
      >
        {{ item.label }}
      </router-link>
    </div>

    <div class="nav-right">
      <router-link to="/pricing" class="nav-pro">
        <svg class="pro-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        专业版
      </router-link>
      <div ref="avatarRef" class="nav-avatar" @click="toggleMenu">
        <span>{{ userStore.userInitial }}</span>
        <!-- 用户菜单 -->
        <div v-if="showMenu" class="nav-menu">
          <router-link to="/" class="menu-item" @click="showMenu = false">🏠 访问官网</router-link>
          <div class="menu-divider" />
          <router-link to="/profile" class="menu-item" @click="showMenu = false">个人中心</router-link>
          <router-link to="/membership" class="menu-item" @click="showMenu = false">会员中心</router-link>
          <router-link v-if="userStore.isAdmin" to="/admin" class="menu-item" @click="showMenu = false">管理后台</router-link>
          <div class="menu-divider" />
          <button class="menu-item menu-item--danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import Logo from '@/components/navigation/Logo.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const showMenu = ref(false);
const avatarRef = ref<HTMLElement | null>(null);

const navItems = [
  { path: '/projects', label: '项目' },
  { path: '/templates', label: '模板' },
  { path: '/teams', label: '团队' },
  { path: '/pricing', label: '定价' },
];

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

// 点击外部区域关闭菜单
function handleClickOutside(e: MouseEvent) {
  if (avatarRef.value && !avatarRef.value.contains(e.target as Node)) {
    showMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function handleLogout() {
  userStore.logout();
  showMenu.value = false;
  router.push('/login');
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* 统一全站导航栏样式：参考首页的便利贴贴边风格 */
.global-nav {
  height: 60px;
  background: $brand-yellow;
  border-radius: 0 0 12px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  margin: 0 14px;
  flex-shrink: 0;
  z-index: 100;
  box-sizing: border-box;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 800;
  color: $layout-sider-dark;
  text-decoration: none;
  white-space: nowrap;

  .logo-icon { width: 18px; height: 18px; }
}

.nav-link {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-decoration: none;
  transition: color 0.2s;
  white-space: nowrap;

  &:hover {
    color: $layout-sider-dark;
  }

  &--active {
    color: $layout-sider-dark;
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-pro {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-decoration: none;
  transition: color 0.2s;
  white-space: nowrap;

  .pro-icon { width: 14px; height: 14px; }
  &:hover { color: $layout-sider-dark; }
}

.nav-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: $layout-sider-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.nav-menu {
  position: absolute;
  top: 36px;
  right: 0;
  width: 160px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 200;

  .menu-item {
    display: block;
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #1D1D1F;
    text-decoration: none;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: rgba(0, 0, 0, 0.04); }
    &--danger { color: #EF4444; }
  }

  .menu-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.06);
    margin: 4px 8px;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .global-nav {
    margin: 0 8px;
    padding: 0 12px;
    height: 52px;
    border-radius: 0 0 10px 10px;
  }
  .nav-left { gap: 12px; }
  .nav-logo { font-size: 14px; }
  .nav-link { font-size: 12px; }
  .nav-pro { display: none; }
  .nav-avatar { width: 24px; height: 24px; font-size: 10px; }
}
</style>

