<template>
  <!-- 管理后台 — 公众号管理 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">公众号管理</h1>
      <button class="btn-add" @click="openAddDialog">
        <Plus :size="14" class="icon" />
        添加公众号
      </button>
    </div>
    <p class="admin-main__desc">管理已绑定的微信公众号，共 {{ accounts.length }} 个公众号</p>

    <!-- 公众号列表 -->
    <div v-loading="loading" style="display: flex; flex-direction: column; gap: 12px;">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="card"
        style="padding: 20px; display: flex; align-items: center; justify-content: space-between;"
      >
        <div style="display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0;">
          <!-- 头像 -->
          <div style="width: 48px; height: 48px; border-radius: 12px; background: #F0F3F8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;">
            <img v-if="account.avatar" :src="account.avatar" style="width: 100%; height: 100%; object-fit: cover;" />
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <!-- 信息 -->
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 15px; font-weight: 700; color: #1D1D1F;">{{ account.name }}</span>
              <span :class="['account-status', `account-status--${account.status}`]">
                {{ statusLabels[account.status] || account.status }}
              </span>
              <span v-if="account.isDefault" class="account-default-tag">默认</span>
            </div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-top: 4px;">
              微信号: {{ account.wechatId || '-' }} · AppID: {{ account.appId ? account.appId.slice(0, 8) + '...' : '-' }} · 类型: {{ typeLabels[account.type] || account.type }}
            </div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.3); margin-top: 2px;">
              绑定时间: {{ formatDate(account.createdAt) }}
              <template v-if="account.lastSyncedAt"> · 最后同步: {{ formatDate(account.lastSyncedAt) }}</template>
            </div>
          </div>
        </div>
        <!-- 操作 -->
        <div style="display: flex; gap: 8px; flex-shrink: 0; margin-left: 16px;">
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
      <div v-if="!loading && accounts.length === 0" style="text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.3);">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.3;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p>暂无绑定的公众号</p>
        <p style="font-size: 12px; margin-top: 4px;">点击右上角「添加公众号」开始绑定</p>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingAccount ? '编辑公众号' : '添加公众号'" width="560px" @close="resetForm">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label class="form-label">公众号名称 *</label>
          <el-input v-model="form.name" placeholder="如: 我的公众号" />
        </div>
        <div>
          <label class="form-label">微信号</label>
          <el-input v-model="form.wechatId" placeholder="如: my_wechat_id" />
        </div>
        <div>
          <label class="form-label">公众号类型</label>
          <el-select v-model="form.type" style="width: 100%;">
            <el-option label="订阅号" value="subscription" />
            <el-option label="服务号" value="service" />
            <el-option label="企业号" value="enterprise" />
            <el-option label="小程序" value="miniapp" />
          </el-select>
        </div>
        <div>
          <label class="form-label">AppID (开发者ID) *</label>
          <el-input v-model="form.appId" placeholder="wx1234567890abcdef" />
        </div>
        <div>
          <label class="form-label">AppSecret (开发者密码) *</label>
          <el-input v-model="form.appSecret" type="password" show-password placeholder="应用密钥" />
        </div>
        <div>
          <label class="form-label">Token (消息校验)</label>
          <el-input v-model="form.token" placeholder="自定义 Token" />
        </div>
        <div>
          <label class="form-label">EncodingAESKey</label>
          <el-input v-model="form.encodingAesKey" placeholder="消息加密密钥（43位）" />
        </div>
        <div>
          <label class="form-label">头像 URL</label>
          <el-input v-model="form.avatar" placeholder="https://example.com/avatar.jpg" />
        </div>
        <div>
          <el-checkbox v-model="form.isDefault">设为默认公众号</el-checkbox>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAccount" :loading="saving">{{ editingAccount ? '保存修改' : '添加公众号' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from 'lucide-vue-next';
import http from '@/utils/http';

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
  active: '● 已连接',
  disabled: '● 已停用',
  expired: '● 已过期',
  error: '● 连接异常',
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
    const res: any = await http.get('/wechat-accounts');
    if (res.success) {
      accounts.value = res.data.list || res.data;
    }
  } catch {
    // Mock
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
      await http.put(`/wechat-accounts/${editingAccount.value.id}`, form.value);
      ElMessage.success('公众号已更新');
    } else {
      await http.post('/wechat-accounts', form.value);
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
    await http.post(`/wechat-accounts/${account.id}/sync`);
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
    await http.put(`/wechat-accounts/${account.id}`, { isDefault: true });
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
    const res: any = await http.post(`/wechat-accounts/${account.id}/test`);
    if (res.success) {
      ElMessage.success('连接测试成功');
    }
  } catch {
    ElMessage.error('连接测试失败');
  }
}

async function toggleStatus(account: WechatAccount, enable: boolean) {
  try {
    await http.put(`/wechat-accounts/${account.id}`, { status: enable ? 'active' : 'disabled' });
    ElMessage.success(enable ? '已启用' : '已停用');
    fetchAccounts();
  } catch {
    ElMessage.error('操作失败');
  }
}

async function unbindAccount(account: WechatAccount) {
  try {
    await ElMessageBox.confirm(`确定要解绑公众号「${account.name}」吗？解绑后将无法使用此公众号发布内容。`, '确认解绑', { type: 'warning' });
    await http.delete(`/wechat-accounts/${account.id}`);
    ElMessage.success('公众号已解绑');
    fetchAccounts();
  } catch { /* 取消 */ }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>

<style scoped>
.account-status {
  font-size: 11px;
  font-weight: 600;
}
.account-status--active { color: #10B981; }
.account-status--disabled { color: rgba(0,0,0,0.3); }
.account-status--expired { color: #F59E0B; }
.account-status--error { color: #EF4444; }

.account-default-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: #FFD60A;
  color: #1D1D1F;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
  margin-bottom: 6px;
}
</style>
