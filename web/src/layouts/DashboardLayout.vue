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
        <component :is="item.icon" style="margin-right: 4px;" />
        {{ item.label }}
      </router-link>

      <div class="topnav__spacer" />

      <div class="topnav__right">
        <router-link to="/pricing" class="topnav__badge">⭐ 专业版</router-link>

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
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessageBox, ElMessage } from 'element-plus';
import Breadcrumb from '@/components/navigation/Breadcrumb.vue';
import Logo from '@/components/navigation/Logo.vue';
import {
  Document, FolderOpened, EditPen, PictureFilled, Grid,
  User, Setting, UserFilled, Star, Monitor, SwitchButton,
  Plus, MagicStick, ChatDotRound, Notebook, Timer,
} from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

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
      { path: '/wechat-accounts', label: '公众号管理', icon: ChatDotRound },
    ],
  },
  {
    label: '发布',
    items: [
      { path: '/dashboard/article-batches', label: '图文合集', icon: Notebook },
      { path: '/scheduled-posts', label: '定时发布', icon: Timer },
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

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

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
@import '@/styles/variables.scss';
@import '@/styles/dashboard.scss';

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
</style>
