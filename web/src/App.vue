<template>
  <div v-if="appStore.isNetworkError" class="global-network-error">
    <el-icon style="margin-right: 8px;"><Warning /></el-icon>
    <span>{{ $t('common.networkError') }}</span>
    <button class="retry-btn" @click="retryConnection">{{ $t('common.retry') }}</button>
  </div>
  <GlobalNav v-if="showGlobalNav" />
  <PageTransition>
    <router-view />
  </PageTransition>
  <UpgradeModal />
  <!-- Language switcher -->
  <div class="lang-switcher">
    <button
      :class="['lang-btn', { active: currentLocale === 'zh-CN' }]"
      @click="switchLocale('zh-CN')"
    >中</button>
    <button
      :class="['lang-btn', { active: currentLocale === 'en-US' }]"
      @click="switchLocale('en-US')"
    >EN</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useThemeStore } from '@/stores/theme';
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import GlobalNav from '@/components/GlobalNav.vue';
import UpgradeModal from '@/components/UpgradeModal.vue';
import PageTransition from '@/components/navigation/PageTransition.vue';
import { Warning } from '@element-plus/icons-vue';

const themeStore = useThemeStore();
const userStore = useUserStore();
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const currentLocale = computed(() => locale.value);

function switchLocale(lang: string) {
  locale.value = lang;
  localStorage.setItem('locale', lang);
}

const hiddenRoutes = ['/', '/login', '/register', '/editor', '/admin'];

const showGlobalNav = computed(() => {
  const path = route.path;
  return !hiddenRoutes.some(r => path === r || path.startsWith(r + '/'));
});

// 跨标签页 storage 变化使用 userStore 统一处理
function handleStorageChange(e: StorageEvent) {
  userStore.handleStorageChange(e);
  // 如果登出了，跳转到登录页
  if (e.key === 'token' && !e.newValue) {
    router.push('/login');
  }
}

onMounted(async () => {
  themeStore.initTheme();
  userStore.initFromStorage();
  window.addEventListener('storage', handleStorageChange);

  // 首次加载时向后端验证 session 有效性
  if (userStore.token) {
    await userStore.validateSession();
  }
  // 启动会话心跳（每 5 分钟验证一次）
  if (userStore.isLoggedIn) {
    userStore.startSessionHeartbeat();
  }
});

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
  userStore.stopSessionHeartbeat();
});

const retryConnection = () => {
  appStore.setNetworkError(false);
  window.location.reload();
};
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}

.global-network-error {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background-color: #FEF2F2;
  color: #DC2626;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.global-network-error .retry-btn {
  margin-left: 16px;
  background: transparent;
  border: 1px solid #DC2626;
  color: #DC2626;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.global-network-error .retry-btn:hover {
  background: #DC2626;
  color: white;
}

/* Language Switcher */
.lang-switcher {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9998;
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  background: #fff;
}

.lang-btn {
  border: none;
  background: #fff;
  color: #666;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  background: #f5f5f5;
}

.lang-btn.active {
  background: #1d1d1f;
  color: #fff;
}
</style>