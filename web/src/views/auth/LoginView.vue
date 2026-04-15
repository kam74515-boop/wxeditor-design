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
      
      <!-- 右侧登录表单 -->
      <div class="auth-form-wrapper">
        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-header">
            <h2 class="auth-title">欢迎回来</h2>
            <p class="auth-subtitle">请登录您的微信文章工作台账号</p>
          </div>
          
          <div class="form-body">
            <div class="input-group">
              <label>用户名或邮箱</label>
              <PaperInput
                v-model="form.username"
                placeholder="请输入用户名或邮箱"
                :error="usernameError"
                class="auth-input"
              />
            </div>
            
            <div class="input-group">
              <label>密码</label>
              <PaperInput
                v-model="form.password"
                type="password"
                placeholder="请输入您的密码"
                :error="passwordError"
                class="auth-input"
              />
            </div>
            
            <div v-if="generalError" class="auth-error-hint">
              <el-icon><Warning /></el-icon> {{ generalError }}
            </div>
          </div>
          
          <div class="auth-actions">
            <AppButton
              variant="primary"
              size="lg"
              shape="box"
              block
              native-type="submit"
              :loading="loading"
              :disabled="loading"
            >
              登录
            </AppButton>

            <div class="divider">
              <span class="divider-text">或</span>
            </div>

            <AppButton variant="success" size="lg" shape="box" block @click="handleWechatLogin">
              <template #icon>
                <svg class="wechat-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.295.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.136 0 .246-.108.246-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.025 18.265 24 16.573 24 14.71c0-3.38-3.125-5.852-7.062-5.852zm-2.89 2.76c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z"/>
                </svg>
              </template>
              微信扫码登录
            </AppButton>

            <div class="switch-link">
              还没有账号？ <router-link to="/register">立即注册</router-link>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import AppButton from '@/components/base/AppButton.vue';
import PaperInput from '@/components/base/PaperInput.vue';
import { EditPen, Warning } from '@element-plus/icons-vue';
import http from '@/utils/http';

const router = useRouter();
const userStore = useUserStore();

const form = ref({ username: '', password: '' });
const usernameError = ref('');
const passwordError = ref('');
const generalError = ref('');
const loading = ref(false);

async function handleWechatLogin() {
  try {
    const res: any = await http.get('/auth/wechat/url');
    const data = res?.data || res;
    const url = data?.url;
    if (url) {
      window.location.href = url;
    } else {
      generalError.value = '获取微信授权链接失败';
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '获取微信授权链接失败';
    generalError.value = msg;
  }
}

async function handleSubmit() {
  usernameError.value = '';
  passwordError.value = '';
  generalError.value = '';

  if (!form.value.username) {
    usernameError.value = '请输入用户名或邮箱';
  }
  if (!form.value.password) {
    passwordError.value = '请输入密码';
  }
  if (usernameError.value || passwordError.value) return;

  loading.value = true;
  try {
    const res: any = await http.post('/auth/login', {
      username: form.value.username,
      password: form.value.password,
    });

    // 后端返回格式：{ success, data: { user, token, refreshToken } }
    const data = res?.data || res;
    const token = data?.token || res?.token;
    const refreshToken = data?.refreshToken || res?.refreshToken;
    const user = data?.user || res?.user;

    if (token && user) {
      userStore.setLoginData(user, token, refreshToken);
    }

    // 登录成功 → 跳回原始目标页或项目管理页
    const redirect = (router.currentRoute.value.query.redirect as string) || '/projects';
    router.push(redirect);
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '登录失败，请检查用户名和密码';
    generalError.value = msg;
  } finally {
    loading.value = false;
  }
}
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

  /* 抽象装饰圈 */
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

/* 右侧表单区 */
.auth-form-wrapper {
  flex: 1;
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #ffffff;
}

.auth-form {
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 40px;
  
  .auth-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: $layout-sider-dark;
    margin: 0 0 8px 0;
  }
  
  .auth-subtitle {
    font-size: 0.95rem;
    color: rgba(0,0,0,0.5);
    margin: 0;
  }
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: $layout-sider-dark;
    }
    
    ::v-deep(.paper-input-wrapper) {
      margin: 0;
    }
  }
  
  .auth-error-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #ef4444;
    font-size: 0.85rem;
    background: #fef2f2;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
}

.auth-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  
  .divider {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 4px 0;
    
    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }
    
    .divider-text {
      font-size: 0.85rem;
      color: rgba(0, 0, 0, 0.35);
      white-space: nowrap;
    }
  }
  
  .switch-link {
    font-size: 0.9rem;
    color: rgba(0,0,0,0.5);
    
    a {
      color: #000;
      font-weight: 700;
      text-decoration: none;
      margin-left: 4px;
      transition: color 0.2s;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.wechat-icon {
  flex-shrink: 0;
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
