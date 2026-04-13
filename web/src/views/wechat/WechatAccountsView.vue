<template>
  <!-- 用户端 — 我的公众号 -->
  <div class="wechat-accounts-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">我的公众号</h1>
        <p class="page-desc">管理已绑定的微信公众号，共 {{ accounts.length }} 个</p>
      </div>
      <button class="btn-add" @click="openAddDialog">
        <el-icon><Plus /></el-icon>
        添加公众号
      </button>
    </div>

    <!-- 公众号卡片列表 -->
    <div v-loading="loading" class="accounts-grid">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="account-card"
      >
        <!-- 卡片头部 -->
        <div class="account-card__header">
          <div class="account-card__avatar">
            <img v-if="account.avatar" :src="account.avatar" alt="" />
            <el-icon v-else :size="24" color="rgba(0,0,0,0.2)"><ChatDotRound /></el-icon>
          </div>
          <div class="account-card__badge-wrap">
            <span :class="['status-dot', `status-dot--${account.status}`]">
              {{ statusLabels[account.status] || account.status }}
            </span>
            <span v-if="account.isDefault" class="default-tag">默认</span>
          </div>
        </div>

        <!-- 卡片主体 -->
        <div class="account-card__body">
          <h3 class="account-card__name">{{ account.name }}</h3>
          <p class="account-card__meta">
            <span>微信号: {{ account.wechatId || '-' }}</span>
          </p>
          <p class="account-card__meta">
            <span>类型: {{ typeLabels[account.type] || account.type }}</span>
            <span>AppID: {{ account.appId ? account.appId.slice(0, 8) + '...' : '-' }}</span>
          </p>
          <p class="account-card__meta meta--sub">
            <span>绑定: {{ formatDate(account.createdAt) }}</span>
            <template v-if="account.lastSyncedAt">
              <span>· 同步: {{ formatDate(account.lastSyncedAt) }}</span>
            </template>
          </p>
        </div>

        <!-- 卡片操作 -->
        <div class="account-card__actions">
          <el-button size="small" text @click="syncAccount(account)" :loading="syncingId === account.id">
            同步
          </el-button>
          <el-button v-if="!account.isDefault" size="small" text @click="setDefault(account)">
            设为默认
          </el-button>
          <el-button size="small" text @click="openEditDialog(account)">编辑</el-button>
          <el-dropdown @command="(cmd: string) => handleAction(cmd, account)">
            <el-button size="small" text>更多 ▾</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="test">测试连接</el-dropdown-item>
                <el-dropdown-item v-if="account.status === 'active'" command="disable">暂停使用</el-dropdown-item>
                <el-dropdown-item v-if="account.status === 'disabled'" command="enable">启用</el-dropdown-item>
                <el-dropdown-item command="unbind" style="color: #EF4444;">解绑</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && accounts.length === 0" class="empty-state">
        <el-icon :size="48" color="rgba(0,0,0,0.15)"><ChatDotRound /></el-icon>
        <p class="empty-state__title">暂无绑定的公众号</p>
        <p class="empty-state__desc">点击右上角「添加公众号」开始绑定</p>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingAccount ? '编辑公众号' : '添加公众号'" width="520px" @close="resetForm">
      <div class="dialog-form">
        <div class="form-field">
          <label class="form-label">公众号名称 <span class="required">*</span></label>
          <el-input v-model="form.name" placeholder="如: 我的公众号" />
        </div>
        <div class="form-field">
          <label class="form-label">微信号</label>
          <el-input v-model="form.wechatId" placeholder="如: my_wechat_id" />
        </div>
        <div class="form-field">
          <label class="form-label">公众号类型</label>
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="订阅号" value="subscription" />
            <el-option label="服务号" value="service" />
            <el-option label="企业号" value="enterprise" />
            <el-option label="小程序" value="miniapp" />
          </el-select>
        </div>
        <div class="form-field">
          <label class="form-label">AppID (开发者ID) <span class="required">*</span></label>
          <el-input v-model="form.appId" placeholder="wx1234567890abcdef" />
        </div>
        <div class="form-field">
          <label class="form-label">AppSecret (开发者密码) <span class="required">*</span></label>
          <el-input v-model="form.appSecret" type="password" show-password placeholder="应用密钥" />
        </div>
        <div class="form-field">
          <label class="form-label">Token (消息校验)</label>
          <el-input v-model="form.token" placeholder="自定义 Token" />
        </div>
        <div class="form-field">
          <label class="form-label">EncodingAESKey</label>
          <el-input v-model="form.encodingAesKey" placeholder="消息加密密钥（43位）" />
        </div>
        <div class="form-field">
          <label class="form-label">头像 URL</label>
          <el-input v-model="form.avatar" placeholder="https://example.com/avatar.jpg" />
        </div>
        <div class="form-field">
          <el-checkbox v-model="form.isDefault">设为默认公众号</el-checkbox>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAccount" :loading="saving">
          {{ editingAccount ? '保存修改' : '添加公众号' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, ChatDotRound } from '@element-plus/icons-vue';
import { wechatAccountApi } from '@/api';

interface WechatAccount {
  id: string;
  name: string;
  wechatId: string;
  type: string;
  appId: string;
  appSecret: string;
  token: string;
  encodingAesKey: string;
  avatar: string;
  status: string;
  isDefault: boolean;
  lastSyncedAt: string;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  active: '已连接',
  disabled: '已停用',
  expired: '已过期',
  error: '连接异常',
};

const typeLabels: Record<string, string> = {
  subscription: '订阅号',
  service: '服务号',
  enterprise: '企业号',
  miniapp: '小程序',
};

const loading = ref(false);
const saving = ref(false);
const syncingId = ref('');
const accounts = ref<WechatAccount[]>([]);

const showDialog = ref(false);
const editingAccount = ref<WechatAccount | null>(null);
const form = ref({
  name: '',
  wechatId: '',
  type: 'subscription',
  appId: '',
  appSecret: '',
  token: '',
  encodingAesKey: '',
  avatar: '',
  isDefault: false,
});

onMounted(() => {
  fetchAccounts();
});

async function fetchAccounts() {
  loading.value = true;
  try {
    const res: any = await wechatAccountApi.getList();
    if (res.success) {
      accounts.value = res.data.list || res.data;
    }
  } catch {
    // Mock fallback
    accounts.value = [
      {
        id: '1',
        name: '科技前沿资讯',
        wechatId: 'tech_frontier',
        type: 'subscription',
        appId: 'wx1234567890abcdef',
        appSecret: '',
        token: '',
        encodingAesKey: '',
        avatar: '',
        status: 'active',
        isDefault: true,
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: '产品发布助手',
        wechatId: 'product_helper',
        type: 'service',
        appId: 'wxabcdef1234567890',
        appSecret: '',
        token: '',
        encodingAesKey: '',
        avatar: '',
        status: 'active',
        isDefault: false,
        lastSyncedAt: new Date(Date.now() - 7200000).toISOString(),
        createdAt: '2026-02-20T08:30:00Z',
      },
      {
        id: '3',
        name: '测试公众号',
        wechatId: 'test_account',
        type: 'subscription',
        appId: 'wx9999999999999999',
        appSecret: '',
        token: '',
        encodingAesKey: '',
        avatar: '',
        status: 'error',
        isDefault: false,
        lastSyncedAt: '',
        createdAt: '2026-03-01T14:20:00Z',
      },
    ];
  } finally {
    loading.value = false;
  }
}

function openAddDialog() {
  editingAccount.value = null;
  resetForm();
  showDialog.value = true;
}

function openEditDialog(account: WechatAccount) {
  editingAccount.value = account;
  form.value = {
    name: account.name,
    wechatId: account.wechatId,
    type: account.type,
    appId: account.appId,
    appSecret: '',
    token: account.token,
    encodingAesKey: account.encodingAesKey,
    avatar: account.avatar,
    isDefault: account.isDefault,
  };
  showDialog.value = true;
}

function resetForm() {
  form.value = {
    name: '',
    wechatId: '',
    type: 'subscription',
    appId: '',
    appSecret: '',
    token: '',
    encodingAesKey: '',
    avatar: '',
    isDefault: false,
  };
  editingAccount.value = null;
}

async function saveAccount() {
  if (!form.value.name || !form.value.appId) {
    ElMessage.warning('请填写公众号名称和 AppID');
    return;
  }
  saving.value = true;
  try {
    if (editingAccount.value) {
      await wechatAccountApi.update(editingAccount.value.id, form.value);
      ElMessage.success('公众号已更新');
    } else {
      await wechatAccountApi.create(form.value);
      ElMessage.success('公众号已添加');
    }
    showDialog.value = false;
    resetForm();
    fetchAccounts();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    saving.value = false;
  }
}

async function syncAccount(account: WechatAccount) {
  syncingId.value = account.id;
  try {
    await wechatAccountApi.sync(account.id);
    ElMessage.success('同步成功');
    fetchAccounts();
  } catch {
    ElMessage.error('同步失败，请检查配置');
  } finally {
    syncingId.value = '';
  }
}

async function setDefault(account: WechatAccount) {
  try {
    await wechatAccountApi.update(account.id, { isDefault: true });
    ElMessage.success('已设为默认公众号');
    fetchAccounts();
  } catch {
    ElMessage.error('操作失败');
  }
}

function handleAction(cmd: string, account: WechatAccount) {
  if (cmd === 'test') {
    testConnection(account);
  } else if (cmd === 'disable' || cmd === 'enable') {
    toggleStatus(account, cmd === 'enable');
  } else if (cmd === 'unbind') {
    unbindAccount(account);
  }
}

async function testConnection(account: WechatAccount) {
  try {
    const res: any = await wechatAccountApi.testConnection(account.id);
    if (res.success) {
      ElMessage.success('连接测试成功');
    }
  } catch {
    ElMessage.error('连接测试失败');
  }
}

async function toggleStatus(account: WechatAccount, enable: boolean) {
  try {
    await wechatAccountApi.update(account.id, { status: enable ? 'active' : 'disabled' });
    ElMessage.success(enable ? '已启用' : '已停用');
    fetchAccounts();
  } catch {
    ElMessage.error('操作失败');
  }
}

async function unbindAccount(account: WechatAccount) {
  try {
    await ElMessageBox.confirm(
      `确定要解绑公众号「${account.name}」吗？解绑后将无法使用此公众号发布内容。`,
      '确认解绑',
      { type: 'warning' },
    );
    await wechatAccountApi.delete(account.id);
    ElMessage.success('公众号已解绑');
    fetchAccounts();
  } catch {
    /* 取消 */
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.wechat-accounts-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #1d1d1f;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-add:hover {
  opacity: 0.85;
}

/* ---- Card grid ---- */
.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.account-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.account-card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.account-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f0f3f8;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.account-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-card__badge-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.status-dot--active {
  color: #10b981;
  background: #ecfdf5;
}

.status-dot--disabled {
  color: rgba(0, 0, 0, 0.3);
  background: #f5f5f5;
}

.status-dot--expired {
  color: #f59e0b;
  background: #fffbeb;
}

.status-dot--error {
  color: #ef4444;
  background: #fef2f2;
}

.default-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #ffd60a;
  color: #1d1d1f;
}

/* ---- Body ---- */
.account-card__body {
  flex: 1;
}

.account-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 6px;
}

.account-card__meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0 0 2px;
  display: flex;
  gap: 12px;
}

.meta--sub {
  color: rgba(0, 0, 0, 0.3);
  margin-top: 4px;
}

/* ---- Actions ---- */
.account-card__actions {
  display: flex;
  gap: 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  padding-top: 12px;
}

/* ---- Empty ---- */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: rgba(0, 0, 0, 0.3);
}

.empty-state__title {
  font-size: 15px;
  font-weight: 600;
  margin: 12px 0 4px;
  color: rgba(0, 0, 0, 0.4);
}

.empty-state__desc {
  font-size: 12px;
  margin: 0;
}

/* ---- Dialog form ---- */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 6px;
}

.required {
  color: #ef4444;
}
</style>
