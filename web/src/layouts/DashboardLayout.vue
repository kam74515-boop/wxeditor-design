<template>
  <!-- 仪表盘通用布局: TopNavBar + Sidebar + Main -->
  <div class="dashboard-layout">
    <!-- 顶部导航栏 -->
    <nav class="topnav">
      <div class="topnav__mobile-entry">
        <button
          class="topnav__menu-btn"
          type="button"
          :aria-expanded="mobileNavOpen"
          aria-label="切换侧边导航"
          @click="toggleMobileNav"
        >
          <el-icon><Close v-if="mobileNavOpen" /><Operation v-else /></el-icon>
        </button>
        <span class="topnav__mobile-label">{{ currentPageLabel }}</span>
      </div>

      <router-link to="/" class="topnav__logo">
        <Logo :size="18" />
        <span>WxEditor</span>
      </router-link>

      <div class="topnav__links">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="['topnav__item', { 'topnav__item--active': isActive(item.path) }]"
        >
          <component :is="item.icon" style="margin-right: 4px;" />
          {{ item.label }}
        </router-link>
      </div>

      <div class="topnav__spacer" />

      <div class="topnav__right">
        <router-link to="/pricing" class="topnav__badge">
          <el-icon><Star /></el-icon>
          <span>专业版</span>
        </router-link>

        <el-dropdown trigger="click" @command="handleUserCommand">
          <div class="topnav__avatar-wrap">
            <div v-if="userStore.userInfo?.avatar" class="topnav__avatar">
              <img :src="userStore.userInfo.avatar" alt="头像" />
            </div>
            <div v-else class="topnav__avatar topnav__avatar--default">
              {{ userStore.userInitial }}
            </div>
            <span class="topnav__username">{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '用户' }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon> 个人中心
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon> 设置
              </el-dropdown-item>
              <el-dropdown-item v-if="userStore.isAdmin" command="admin" divided>
                <el-icon><Monitor /></el-icon> 管理后台
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </nav>

    <transition name="dashboard-mobile-nav">
      <div
        v-if="mobileNavOpen"
        class="dashboard-mobile-overlay"
        @click.self="closeMobileNav"
      >
        <div class="dashboard-mobile-drawer">
          <div class="dashboard-mobile-drawer__header">
            <div class="dashboard-mobile-drawer__brand">
              <Logo :size="18" />
              <span>工作空间</span>
            </div>
            <button
              class="dashboard-mobile-drawer__close"
              type="button"
              aria-label="关闭侧边导航"
              @click="closeMobileNav"
            >
              <el-icon><Close /></el-icon>
            </button>
          </div>

          <div class="dashboard-mobile-drawer__section">
            <div class="dashboard-mobile-drawer__section-label">快捷访问</div>
            <router-link
              v-for="item in navItems"
              :key="`mobile-${item.path}`"
              :to="item.path"
              :class="['dashboard-mobile-link', { 'dashboard-mobile-link--active': isActive(item.path) }]"
              @click="closeMobileNav"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </router-link>
          </div>

          <div
            v-for="group in sidebarGroups"
            :key="`mobile-group-${group.label || 'main'}`"
            class="dashboard-mobile-drawer__section"
          >
            <div v-if="group.label" class="dashboard-mobile-drawer__section-label">{{ group.label }}</div>
            <router-link
              v-for="item in group.items"
              :key="`mobile-drawer-${item.path}`"
              :to="item.path"
              :class="['dashboard-mobile-link', { 'dashboard-mobile-link--active': isActive(item.path) }]"
              @click="closeMobileNav"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </router-link>
          </div>

          <button class="dashboard-mobile-drawer__action" type="button" @click="handleCreateDocument">
            <el-icon><Plus /></el-icon>
            <span>新建文档</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- 主体区域 -->
    <div class="dashboard-body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div v-for="group in sidebarGroups" :key="group.label" class="sidebar__group">
          <div v-if="group.label" class="sidebar__group-label">{{ group.label }}</div>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            :class="['sidebar__item', { 'sidebar__item--active': isActive(item.path) }]"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </router-link>
        </div>

        <div class="sidebar__spacer" />

        <!-- 底部快捷操作 -->
        <div class="sidebar__action-group">
          <button class="sidebar__action" @click="$router.push('/editor')">
            <el-icon><Plus /></el-icon> 新建文档
          </button>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="main-content">
        <Breadcrumb />
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessageBox, ElMessage } from 'element-plus';
import Breadcrumb from '@/components/navigation/Breadcrumb.vue';
import Logo from '@/components/navigation/Logo.vue';
import {
  Document, FolderOpened, EditPen, PictureFilled, Grid,
  User, Setting, UserFilled, Star, Monitor, SwitchButton,
  Plus, MagicStick, ChatDotRound, Notebook, Timer, Operation, Close,
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const mobileNavOpen = ref(false);

// 初始化用户数据
if (!userStore.isLoggedIn) {
  userStore.initFromStorage();
}

const navItems = [
  { path: '/projects', label: '项目', icon: FolderOpened },
  { path: '/editor', label: '编辑器', icon: EditPen },
  { path: '/templates', label: '模板', icon: Document },
  { path: '/teams', label: '团队', icon: User },
];

const sidebarGroups = [
  {
    label: '',
    items: [
      { path: '/projects', label: '文档管理', icon: FolderOpened },
      { path: '/ai-writing', label: 'AI 写作', icon: MagicStick },
    ],
  },
  {
    label: '公众号',
    items: [
      { path: '/dashboard/wechat-accounts', label: '公众号管理', icon: ChatDotRound },
    ],
  },
  {
    label: '发布',
    items: [
      { path: '/dashboard/article-batches', label: '图文合集', icon: Notebook },
      { path: '/dashboard/scheduled-posts', label: '定时发布', icon: Timer },
    ],
  },
  {
    label: '资源',
    items: [
      { path: '/materials', label: '素材库', icon: PictureFilled },
      { path: '/templates', label: '模板中心', icon: Grid },
    ],
  },
  {
    label: '协作',
    items: [
      { path: '/teams', label: '团队', icon: UserFilled },
    ],
  },
  {
    label: '账户',
    items: [
      { path: '/membership', label: '会员', icon: Star },
      { path: '/settings', label: '设置', icon: Setting },
    ],
  },
];

const currentPageLabel = computed(() => {
  const allItems = [
    ...navItems,
    ...sidebarGroups.flatMap(group => group.items),
  ];
  const matched = allItems.find(item => isActive(item.path));
  return matched?.label || '控制台';
});

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

function closeMobileNav() {
  mobileNavOpen.value = false;
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value;
}

function handleCreateDocument() {
  closeMobileNav();
  router.push('/editor');
}

function handleViewportChange() {
  if (window.innerWidth > 1024) {
    closeMobileNav();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMobileNav();
  }
}

watch(() => route.fullPath, closeMobileNav);

onMounted(() => {
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('keydown', handleKeydown);
});

async function handleUserCommand(command: string) {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'settings':
      router.push('/settings');
      break;
    case 'admin':
      router.push('/admin');
      break;
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
          confirmButtonText: '确定退出',
          cancelButtonText: '取消',
          type: 'warning',
        });
        userStore.logout();
        router.push('/login');
        ElMessage.success('已退出登录');
      } catch {
        // 用户取消
      }
      break;
  }
}
</script>

<style lang="scss">
@use '@/styles/variables' as *;
@use '@/styles/dashboard' as *;

/* DashboardLayout 额外样式 */

.topnav__avatar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
}

.topnav__mobile-entry {
  display: none;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.topnav__menu-btn {
  width: 40px;
  height: 40px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: $layout-sider-dark;
  background: rgba(255, 255, 255, 0.55);
  border: none;
  transition: background 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.78);
  }
}

.topnav__mobile-label {
  display: none;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: $layout-sider-dark;
  white-space: nowrap;
}

.topnav__links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topnav__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--default {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: $layout-sider-dark;
  }
}

.topnav__username {
  font-size: 13px;
  font-weight: 600;
  color: $layout-sider-dark;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.sidebar__group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(29, 29, 31, 0.4);
  padding: 8px 12px 4px;
  letter-spacing: 0.05em;
}

.sidebar__action-group {
  padding: 0 4px;
}

.sidebar__action {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 999px;
  background: $layout-sider-dark;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  width: 100%;
  gap: 6px;
  transition: opacity 150ms ease;
  &:hover { opacity: 0.85; }
}

.dashboard-mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.18);
  padding: 72px 14px 14px;
}

.dashboard-mobile-drawer {
  width: min(100%, 360px);
  height: 100%;
  background: $brand-yellow;
  border-radius: 12px 12px 0 0;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow-y: auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: $layout-sider-dark;
    font-size: 14px;
    font-weight: 800;
  }

  &__close {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.6);
    color: $layout-sider-dark;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__section-label {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(29, 29, 31, 0.5);
    padding: 0 4px;
  }

  &__action {
    margin-top: auto;
    width: 100%;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 999px;
    background: $layout-sider-dark;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 700;
  }
}

.dashboard-mobile-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.45);
  color: rgba(29, 29, 31, 0.7);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: background 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.78);
  }

  &--active {
    background: #FFFFFF;
    color: $layout-sider-dark;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

.dashboard-mobile-nav-enter-active,
.dashboard-mobile-nav-leave-active {
  transition: opacity 180ms ease;
}

.dashboard-mobile-nav-enter-active .dashboard-mobile-drawer,
.dashboard-mobile-nav-leave-active .dashboard-mobile-drawer {
  transition: transform 220ms ease, opacity 220ms ease;
}

.dashboard-mobile-nav-enter-from,
.dashboard-mobile-nav-leave-to {
  opacity: 0;
}

.dashboard-mobile-nav-enter-from .dashboard-mobile-drawer,
.dashboard-mobile-nav-leave-to .dashboard-mobile-drawer {
  opacity: 0;
  transform: translateX(-16px) scale(0.98);
}

@media (max-width: 1024px) {
  .topnav {
    padding: 0 14px;
    margin: 0 10px;
    gap: 10px;
  }

  .topnav__mobile-entry,
  .topnav__menu-btn,
  .topnav__mobile-label {
    display: flex;
  }

  .topnav__logo {
    margin-right: 0;
  }

  .topnav__links,
  .topnav__badge,
  .sidebar {
    display: none;
  }

  .topnav__spacer {
    display: none;
  }

  .topnav__right {
    margin-left: auto;
    gap: 8px;
  }

  .dashboard-body {
    padding: 10px 10px 0;
  }

  .main-content {
    border-radius: 12px 12px 0 0;
    padding: 20px 16px 28px;
  }
}

@media (max-width: 640px) {
  .topnav__logo span,
  .topnav__username {
    display: none;
  }

  .topnav__mobile-label {
    max-width: 120px;
  }
}
</style>
