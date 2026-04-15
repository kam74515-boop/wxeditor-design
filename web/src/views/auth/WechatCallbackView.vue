<template>
  <div class="auth-layout">
    <div class="auth-container">
      <!-- 左侧品牌宣传栏 -->
      <div class="auth-hero">
        <div class="brand">
          <el-icon class="logo-icon"><EditPen /></el-icon>
          <h2>WeChat Editor</h2>
        </div>
        <div class="hero-content">
          <h1 class="slogan">写出更好的文章</h1>
          <p class="sub-slogan">专注于内容的创作，繁琐的微信公众号排版全部交给我们。</p>
        </div>
        <div class="hero-decoration"></div>
      </div>

      <!-- 右侧状态区 -->
      <div class="auth-form-wrapper">
        <div class="callback-content">
          <!-- Loading state -->
          <template v-if="status === 'loading'">
            <div class="loading-icon-wrapper">
              <el-icon class="loading-spinner" :size="48"><Loading /></el-icon>
            </div>
            <h2 class="auth-title">正在登录</h2>
            <p class="auth-subtitle">正在处理微信授权，请稍候...</p>
          </template>

          <!-- Success state -->
          <template v-else-if="status === 'success'">
            <div class="status-icon-wrapper success">
              <el-icon :size="48"><CircleCheck /></el-icon>
            </div>
            <h2 class="auth-title">{{ isNewUser ? '欢迎加入' : '欢迎回来' }}</h2>
            <p class="auth-subtitle">{{ isNewUser ? '账号已创建，正在跳转...' : '登录成功，正在跳转...' }}</p>
          </template>

          <!-- Error state -->
          <template v-else-if="status === 'error'">
            <div class="status-icon-wrapper error">
              <el-icon :size="48"><CircleClose /></el-icon>
            </div>
            <h2 class="auth-title">登录失败</h2>
            <p class="auth-subtitle error-text">{{ errorMessage }}</p>
            <button class="submit-btn" @click="goLogin">
              返回登录页
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { EditPen, Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue';
import http from '@/utils/http';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const status = ref<'loading' | 'success' | 'error'>('loading');
const errorMessage = ref('');
const isNewUser = ref(false);

async function handleCallback() {
  const code = route.query.code as string;
  const state = route.query.state as string;

  if (!code) {
    status.value = 'error';
    errorMessage.value = '缺少微信授权码，请重新尝试登录';
    return;
  }

  try {
    // Call backend callback endpoint with code from WeChat
    const res: any = await http.get(`/auth/wechat/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`);

    const data = res?.data || res;
    const token = data?.token || res?.token;
    const refreshToken = data?.refreshToken || res?.refreshToken;
    const user = data?.user || res?.user;
    isNewUser.value = data?.isNew || false;

    if (token && user) {
      userStore.setLoginData(user, token, refreshToken);
      status.value = 'success';

      // Brief delay to show success state, then redirect
      setTimeout(() => {
        const redirect = (route.query.redirect as string) || '/projects';
        router.push(redirect);
      }, 1000);
    } else {
      status.value = 'error';
      errorMessage.value = '登录返回数据异常，请重试';
    }
  } catch (err: any) {
    status.value = 'error';
    errorMessage.value = err?.response?.data?.message || err?.message || '微信登录失败，请重试';
  }
}

function goLogin() {
  router.push('/login');
}

onMounted(() => {
  handleCallback();
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.auth-layout {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #F2F2F7 0%, #E5E5EA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.auth-container {
  display: flex;
  width: 100%;
  max-width: 960px;
  height: 600px;
  background: #ffffff;
  border-radius: $block-radius-xl;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* 左侧品牌区 */
.auth-hero {
  flex: 1;
  background: $brand-yellow;
  padding: 40px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 2;

    .logo-icon {
      font-size: 28px;
      color: $layout-sider-dark;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: $layout-sider-dark;
      margin: 0;
    }
  }

  .hero-content {
    margin-top: auto;
    margin-bottom: auto;
    z-index: 2;

    .slogan {
      font-size: 2.5rem;
      font-weight: 800;
      color: $layout-sider-dark;
      line-height: 1.2;
      margin: 0 0 16px 0;
    }

    .sub-slogan {
      font-size: 1rem;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.6;
      max-width: 80%;
      margin: 0;
    }
  }

  .hero-decoration {
    position: absolute;
    right: -50px;
    bottom: -50px;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
    z-index: 1;
  }
}

/* 右侧状态区 */
.auth-form-wrapper {
  flex: 1;
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #ffffff;
}

.callback-content {
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.loading-icon-wrapper {
  margin-bottom: 24px;

  .loading-spinner {
    color: #07C160;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-icon-wrapper {
  margin-bottom: 24px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &.success {
    background: rgba(7, 193, 96, 0.1);
    color: #07C160;
  }

  &.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.5);
  margin: 0;

  &.error-text {
    color: #ef4444;
    margin-bottom: 24px;
  }
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: $layout-sider-dark;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .auth-container {
    flex-direction: column;
    height: auto;
    min-height: 600px;
  }

  .auth-hero {
    flex: none;
    padding: 30px;

    .hero-content {
      margin: 20px 0;
      .slogan { font-size: 2rem; }
    }
  }

  .auth-form-wrapper {
    padding: 30px;
  }
}
</style>
