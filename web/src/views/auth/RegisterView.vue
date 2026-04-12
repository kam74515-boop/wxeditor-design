<template>
  <div class="auth-layout">
    <div class="auth-container reverse">
      <!-- 左侧（实际渲染在右边）品牌宣传栏 -->
      <div class="auth-hero">
        <div class="brand">
          <el-icon class="logo-icon"><EditPen /></el-icon>
          <h2>WeChat Editor</h2>
        </div>
        <div class="hero-content">
          <h1 class="slogan">开启内容创作</h1>
          <p class="sub-slogan">加入我们，体验极致流畅的排版工具与 AI 辅助协作的乐趣。</p>
        </div>
        <div class="hero-decoration"></div>
        <div class="hero-decoration-small"></div>
      </div>
      
      <!-- 右侧（实际渲染在左边）注册表单 -->
      <div class="auth-form-wrapper">
        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-header">
            <h2 class="auth-title">创建账号</h2>
            <p class="auth-subtitle">仅需几秒钟即可免费注册您的账号</p>
          </div>
          
          <div class="form-body">
            <div class="input-group">
              <label>用户名</label>
              <PaperInput
                v-model="form.username"
                placeholder="请输入您的用户名"
                :error="usernameError"
                class="auth-input"
              />
            </div>

            <div class="input-group">
              <label>邮箱地址</label>
              <PaperInput
                v-model="form.email"
                placeholder="请输入常用邮箱"
                :error="emailError"
                class="auth-input"
              />
            </div>
            
            <div class="input-group">
              <label>设置密码</label>
              <PaperInput
                v-model="form.password"
                type="password"
                placeholder="至少 6 位字符"
                :error="passwordError"
                class="auth-input"
              />
            </div>

            <div class="input-group">
              <label>确认密码</label>
              <PaperInput
                v-model="form.passwordConfirm"
                type="password"
                placeholder="请再次确认您的密码"
                :error="confirmError"
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
              <span v-else>立即注册</span>
            </button>
            <div class="switch-link">
              已有账号？ <router-link to="/login">直接登录</router-link>
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

const form = ref({ username: '', email: '', password: '', passwordConfirm: '' });
const usernameError = ref('');
const emailError = ref('');
const passwordError = ref('');
const confirmError = ref('');
const generalError = ref('');
const loading = ref(false);

async function handleSubmit() {
  usernameError.value = '';
  emailError.value = '';
  passwordError.value = '';
  confirmError.value = '';
  generalError.value = '';

  if (!form.value.username) usernameError.value = '请输入用户名';
  if (!form.value.email || !form.value.email.includes('@')) emailError.value = '请输入有效的邮箱地址';
  if (!form.value.password || form.value.password.length < 6) passwordError.value = '密码长度至少6位';
  if (form.value.password !== form.value.passwordConfirm) confirmError.value = '两次输入的密码不一致';
  
  if (usernameError.value || emailError.value || passwordError.value || confirmError.value) return;

  loading.value = true;
  try {
    const payload = {
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      passwordConfirm: form.value.passwordConfirm,
    };
    const res: any = await http.post('/auth/register', payload);
    
    // 注册成功后自动登录
    const data = res?.data || res;
    const token = data?.token || res?.token;
    const user = data?.user || res?.user;

    if (token && user) {
      userStore.setLoginData(user, token);
      router.push('/projects');
    } else {
      // 后端没返回 token，退回登录页
      router.push('/login');
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '注册失败，请检查网络或更换邮箱重试';
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
  max-width: 1000px;
  min-height: 680px;
  background: #ffffff;
  border-radius: $block-radius-xl;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  
  /* 注册页特意采用反向布局以便与登录产生镜像对称感 */
  &.reverse {
    flex-direction: row-reverse;
  }
}

/* 左侧品牌区（注册翻转到了右边） */
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
      font-size: 1.05rem;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.6;
      max-width: 85%;
      margin: 0;
    }
  }

  /* 抽象装饰圈 */
  .hero-decoration {
    position: absolute;
    left: -80px;
    top: -80px;
    width: 350px;
    height: 350px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.4) 100%);
    z-index: 1;
  }
  
  .hero-decoration-small {
    position: absolute;
    right: 20px;
    bottom: 40px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    z-index: 1;
  }
}

/* 右侧表单区（注册实际渲染在左边） */
.auth-form-wrapper {
  flex: 1.1; /* 给注册表单分配多一点空间 */
  padding: 40px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #ffffff;
}

.auth-form {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 30px;
  
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
  gap: 16px;
  margin-bottom: 32px;
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: $layout-sider-dark;
      margin-left: 2px;
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
    margin-top: 4px;
  }
}

.auth-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  
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
    
    &.reverse {
      flex-direction: column;
    }
  }
  
  .auth-hero {
    flex: none;
    padding: 30px;
  }
  
  .auth-form-wrapper {
    padding: 30px;
  }
}
</style>
