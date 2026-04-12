<template>
  <div class="projects-layout">
    <!-- 左侧侧栏 -->
    <aside class="sidebar-card">
      <div class="brand">
        <h2>个人中心</h2>
      </div>
      <nav class="nav-menu">
        <div :class="['nav-item', { active: activeTab === 'profile' }]" @click="activeTab = 'profile'">
          <el-icon><User /></el-icon> <span>个人资料</span>
        </div>
        <div :class="['nav-item', { active: activeTab === 'security' }]" @click="activeTab = 'security'">
          <el-icon><Lock /></el-icon> <span>安全设置</span>
        </div>
        <div class="nav-item text-muted" @click="$router.push('/membership')">
          <el-icon><Tickets /></el-icon> <span>会员状态</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="$router.push('/projects')">
          <el-icon><Back /></el-icon> <span>返回项目</span>
        </button>
      </div>
    </aside>

    <!-- 右侧主内容 -->
    <main class="main-card">
      <!-- ====== 个人资料 ====== -->
      <template v-if="activeTab === 'profile'">
        <header class="page-header">
          <h2 class="page-title">个人资料</h2>
        </header>

        <div class="list-container">
          <!-- 头像区域 -->
          <div class="profile-avatar-section">
            <div class="avatar-wrapper">
              <img v-if="form.avatar" :src="form.avatar" class="avatar-img" alt="头像" />
              <div v-else class="avatar-placeholder">{{ userInitial }}</div>
              <label class="avatar-upload-btn" title="更换头像">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                <input type="file" accept="image/*" hidden @change="handleAvatarUpload" />
              </label>
            </div>
            <div class="avatar-info">
              <h3>{{ form.nickname || form.username }}</h3>
              <p>{{ form.email }}</p>
            </div>
          </div>

          <!-- 表单 -->
          <div class="profile-form">
            <div class="form-group">
              <label>用户名</label>
              <input :value="form.username" disabled class="form-input disabled" />
              <span class="form-hint">用户名不可修改</span>
            </div>
            <div class="form-group">
              <label>昵称</label>
              <input v-model="form.nickname" class="form-input" placeholder="输入昵称" maxlength="20" />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input :value="form.email" disabled class="form-input disabled" />
              <span class="form-hint">邮箱暂不支持修改</span>
            </div>
            <div class="form-group">
              <label>简介</label>
              <textarea v-model="form.bio" class="form-input form-textarea" placeholder="一句话介绍自己..." maxlength="500" rows="3" />
            </div>
            <div class="form-group">
              <label>手机号</label>
              <input v-model="form.phone" class="form-input" placeholder="输入手机号" maxlength="11" />
            </div>
            <div class="form-actions">
              <button class="save-btn" :disabled="saving" @click="handleSaveProfile">
                {{ saving ? '保存中...' : '保存修改' }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- ====== 安全设置 ====== -->
      <template v-if="activeTab === 'security'">
        <header class="page-header">
          <h2 class="page-title">安全设置</h2>
        </header>

        <div class="list-container">
          <div class="profile-form">
            <div class="form-group">
              <label>当前密码</label>
              <input v-model="passwordForm.oldPassword" type="password" class="form-input" placeholder="输入当前密码" />
            </div>
            <div class="form-group">
              <label>新密码</label>
              <input v-model="passwordForm.newPassword" type="password" class="form-input" placeholder="至少 6 位，含字母和数字" />
            </div>
            <div class="form-group">
              <label>确认新密码</label>
              <input v-model="passwordForm.confirmPassword" type="password" class="form-input" placeholder="再次输入新密码" />
            </div>
            <div class="form-actions">
              <button class="save-btn" :disabled="changingPassword" @click="handleChangePassword">
                {{ changingPassword ? '修改中...' : '修改密码' }}
              </button>
            </div>
          </div>

          <!-- 账户信息 -->
          <div class="account-info-section">
            <h3 class="section-title">账户信息</h3>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">账户角色</span>
                <span class="info-value">{{ roleText }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">注册时间</span>
                <span class="info-value">{{ createdAt }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">账户状态</span>
                <span class="info-value status-active">正常</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { User, Lock, Tickets, Back } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const router = useRouter();

// 当前选中的标签页
const activeTab = ref('profile');

// 加载状态
const saving = ref(false);
const changingPassword = ref(false);

// 用户资料表单
const form = ref({
  username: '',
  email: '',
  nickname: '',
  avatar: '',
  bio: '',
  phone: '',
  role: 'user',
  created_at: '',
});

// 密码修改表单
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// 计算属性
const userInitial = computed(() => {
  return (form.value.nickname || form.value.username || 'U').charAt(0).toUpperCase();
});

const roleText = computed(() => {
  const map: Record<string, string> = {
    user: '普通用户',
    vip: 'VIP 会员',
    admin: '管理员',
    superadmin: '超级管理员',
  };
  return map[form.value.role] || '普通用户';
});

const createdAt = computed(() => {
  if (!form.value.created_at) return '—';
  return new Date(form.value.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
});

// 获取当前用户信息
async function fetchProfile() {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) {
      const u = res.data.data.user;
      form.value.username = u.username || '';
      form.value.email = u.email || '';
      form.value.nickname = u.nickname || '';
      form.value.avatar = u.avatar || '';
      form.value.bio = u.bio || '';
      form.value.phone = u.phone || '';
      form.value.role = u.role || 'user';
      form.value.created_at = u.created_at || '';
    }
  } catch (err) {
    console.error('获取用户信息失败:', err);
  }
}

// 保存个人资料
async function handleSaveProfile() {
  saving.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await axios.put('/api/auth/profile', {
      nickname: form.value.nickname,
      bio: form.value.bio,
      phone: form.value.phone,
      avatar: form.value.avatar,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) {
      ElMessage.success('资料更新成功');
      // 同步更新 localStorage 中的用户信息
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.nickname = form.value.nickname;
        user.avatar = form.value.avatar;
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '更新失败');
  } finally {
    saving.value = false;
  }
}

// 头像上传
async function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像大小不能超过 2MB');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('upfile', file);
    const res = await axios.post('/api/ueditor?action=uploadimage', fd, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    if (res.data.url) {
      form.value.avatar = res.data.url;
      ElMessage.success('头像上传成功，请点击"保存修改"');
    }
  } catch {
    ElMessage.error('头像上传失败');
  }
}

// 修改密码
async function handleChangePassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value;

  if (!oldPassword || !newPassword) {
    ElMessage.warning('请填写完整');
    return;
  }
  if (newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位');
    return;
  }
  if (newPassword !== confirmPassword) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }

  changingPassword.value = true;
  try {
    const token = localStorage.getItem('token');
    const res = await axios.post('/api/auth/change-password', {
      oldPassword,
      newPassword,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data.success) {
      ElMessage.success('密码修改成功，请重新登录');
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
      // 清除登录态，跳转登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => router.push('/login'), 1500);
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '密码修改失败');
  } finally {
    changingPassword.value = false;
  }
}

onMounted(() => {
  fetchProfile();
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* ========= 基础布局（与 ProjectsView 一致） ========= */
.projects-layout {
  display: flex;
  height: calc(100vh - $nav-offset);
  width: 100%;
  background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: $block-gap $page-padding $page-padding;
  gap: $block-gap;
  box-sizing: border-box;
  overflow: hidden;
}

.sidebar-card {
  width: 280px;
  background: $brand-yellow;
  border-radius: $block-radius-lg;
  display: flex;
  flex-direction: column;
  padding: $space-lg;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);

  .brand {
    margin-bottom: $space-xl;
    h2 {
      font-size: 1.1rem;
      font-weight: 800;
      color: $layout-sider-dark;
      margin: 0;
    }
  }

  .nav-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      color: $layout-sider-dark;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background-color: rgba(255,255,255,0.4);
      }
      &.active {
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      &.text-muted {
        color: rgba(0,0,0,0.5);
      }
    }
  }

  .sidebar-bottom {
    margin-top: auto;

    .new-project-btn {
      width: 100%;
      padding: 12px 16px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,0.1);
      background-color: #FFD60A;
      color: $layout-sider-dark;
      font-weight: 800;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255,214,10,0.3);
      }
    }
  }
}

.main-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: $block-radius-lg;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-xl;

    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: $layout-sider-dark;
      margin: 0;
    }
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
  }
}

/* ========= 头像区域 ========= */
.profile-avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 0;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 28px;
}

.avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(0,0,0,0.04);
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: $brand-yellow;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  color: $layout-sider-dark;
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);

  &:hover {
    background: $brand-yellow;
    transform: scale(1.1);
  }
}

.avatar-info {
  h3 {
    font-size: 20px;
    font-weight: 800;
    color: $layout-sider-dark;
    margin: 0 0 4px;
  }
  p {
    font-size: 13px;
    color: rgba(0,0,0,0.4);
    margin: 0;
  }
}

/* ========= 表单 ========= */
.profile-form {
  max-width: 480px;
}

.form-group {
  margin-bottom: 22px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: rgba(0,0,0,0.55);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 16px;
  border: 1.5px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  background: #fafafa;
  color: $layout-sider-dark;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: $brand-yellow;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(255,214,10,0.15);
  }

  &.disabled {
    background: rgba(0,0,0,0.025);
    color: rgba(0,0,0,0.35);
    cursor: not-allowed;
    border-color: rgba(0,0,0,0.04);
  }
}

.form-textarea {
  height: auto;
  padding: 12px 16px;
  resize: vertical;
  min-height: 88px;
  line-height: 1.5;
}

.form-hint {
  display: block;
  font-size: 11px;
  color: rgba(0,0,0,0.3);
  margin-top: 6px;
}

.form-actions {
  padding-top: 12px;
}

.save-btn {
  height: 42px;
  padding: 0 36px;
  border-radius: 999px;
  background: $layout-sider-dark;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
}

/* ========= 账户信息 ========= */
.account-info-section {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid rgba(0,0,0,0.06);
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0 0 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 480px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.03);
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0,0,0,0.45);
}

.info-value {
  font-size: 14px;
  font-weight: 700;
  color: $layout-sider-dark;
}

.status-active {
  color: #10b981;
}

/* ========= 响应式 ========= */
@media (max-width: 1024px) {
  .sidebar-card { width: 200px; padding: 16px; }
  .main-card { padding: 20px; }
}

@media (max-width: 768px) {
  .sidebar-card { display: none; }
  .main-card { border-radius: 12px; padding: 16px; }
}
</style>
