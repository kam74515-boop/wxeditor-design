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
            <button class="submit-btn" :class="{ loading }" :disabled="loading" type="submit">
              <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
              <span v-else>登录</span>
            </button>
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
import PaperInput from '@/components/base/PaperInput.vue';
import { EditPen, Warning, Loading } from '@element-plus/icons-vue';
import http from '@/utils/http';

const router = useRouter();
const userStore = useUserStore();

const form = ref({ username: '', password: '' });
const usernameError = ref('');
const passwordError = ref('');
const generalError = ref('');
const loading = ref(false);

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
  gap: 24px;
  
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
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    
    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
