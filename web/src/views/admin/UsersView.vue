<template>
  <!-- 管理后台 — 用户管理 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">用户管理</h1>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div class="search-bar" style="width: 240px;">
          <el-icon><Search /></el-icon>
          <input v-model="searchQuery" placeholder="搜索用户..." @input="debouncedSearch" />
        </div>
      </div>
    </div>
    <p class="admin-main__desc">管理所有注册用户、角色分配与账号状态。共 {{ total }} 位用户</p>

    <table class="admin-table" v-loading="loading">
      <thead>
        <tr>
          <th>用户</th>
          <th>邮箱</th>
          <th>角色</th>
          <th>会员</th>
          <th>状态</th>
          <th>注册时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #F0F3F8; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: rgba(0,0,0,0.4);">
                {{ (user.username || 'U').charAt(0).toUpperCase() }}
              </div>
              <span style="font-weight: 600;">{{ user.nickname || user.username }}</span>
            </div>
          </td>
          <td style="color: rgba(0,0,0,0.5);">{{ user.email }}</td>
          <td><span :class="['role-tag', `role-tag--${user.role}`]">{{ roleLabels[user.role] || user.role }}</span></td>
          <td>
            <span style="font-size: 13px;" :style="{ color: user.membership?.isActive ? '#3B82F6' : 'rgba(0,0,0,0.3)' }">
              {{ user.membership?.isActive ? membershipLabels[user.membership?.type || ''] || '会员' : '免费' }}
            </span>
          </td>
          <td>
            <span :style="{ color: user.status === 'active' ? '#10B981' : '#EF4444', fontWeight: 600, fontSize: '13px' }">
              {{ user.status === 'active' ? '● 活跃' : '● 已禁' }}
            </span>
          </td>
          <td style="color: rgba(0,0,0,0.4); font-size: 13px;">{{ formatDate(user.createdAt || user.created_at || '') }}</td>
          <td>
            <div style="display: flex; gap: 8px;">
              <el-dropdown @command="(cmd: string) => handleUserAction(cmd, user)">
                <el-button size="small" text>操作 ▾</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="role">编辑角色</el-dropdown-item>
                    <el-dropdown-item :command="user.status === 'active' ? 'ban' : 'unban'">
                      {{ user.status === 'active' ? '禁用账号' : '启用账号' }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 空状态 -->
    <div v-if="!loading && users.length === 0" style="text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.3);">
      <p>暂无用户数据</p>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" style="display: flex; justify-content: center; margin-top: 24px;">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchUsers"
      />
    </div>

    <!-- 角色编辑弹窗 -->
    <el-dialog v-model="showRoleDialog" title="编辑角色" width="380px">
      <div style="margin-bottom: 16px;">
        <p>用户：{{ editingUser?.nickname || editingUser?.username }}</p>
        <el-select v-model="newRole" placeholder="选择角色" style="width: 100%;">
          <el-option label="普通用户" value="user" />
          <el-option label="管理员" value="admin" />
        </el-select>
      </div>
      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRoleChange" :loading="actionLoading">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import http from '@/utils/http';

interface UserItem {
  id: string;
  username: string;
  email: string;
  nickname: string;
  role: string;
  status: string;
  membership: { type: string; isActive: boolean };
  createdAt: string;
  created_at?: string;
}

const searchQuery = ref('');
const users = ref<UserItem[]>([]);
const loading = ref(true);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const actionLoading = ref(false);

const showRoleDialog = ref(false);
const editingUser = ref<UserItem | null>(null);
const newRole = ref('user');

const roleLabels: Record<string, string> = { superadmin: '超级管理', admin: '管理员', vip: 'VIP', user: '普通用户' };
const membershipLabels: Record<string, string> = { basic: '基础版', pro: '专业版', enterprise: '企业版' };

onMounted(() => {
  fetchUsers();
});

let searchTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchUsers();
  }, 300);
}

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    if (searchQuery.value) params.search = searchQuery.value;

    const res: any = await http.get('/admin/users', { params });
    if (res.success) {
      users.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '获取用户列表失败');
  } finally {
    loading.value = false;
  }
}

function handleUserAction(cmd: string, user: UserItem) {
  if (cmd === 'role') {
    editingUser.value = user;
    newRole.value = user.role;
    showRoleDialog.value = true;
  } else if (cmd === 'ban') {
    ElMessageBox.confirm(`确定要禁用用户「${user.nickname || user.username}」吗？`, '确认禁用', { type: 'warning' })
      .then(() => toggleBan(user, true));
  } else if (cmd === 'unban') {
    toggleBan(user, false);
  }
}

async function confirmRoleChange() {
  if (!editingUser.value) return;
  actionLoading.value = true;
  try {
    await http.put(`/admin/users/${editingUser.value.id}`, { role: newRole.value });
    ElMessage.success('角色更新成功');
    showRoleDialog.value = false;
    fetchUsers();
  } catch {
    ElMessage.error('更新失败');
  } finally {
    actionLoading.value = false;
  }
}

async function toggleBan(user: UserItem, ban: boolean) {
  try {
    if (ban) {
      await http.post(`/admin/users/${user.id}/ban`, { reason: '管理员操作' });
      ElMessage.success('用户已禁用');
    } else {
      await http.post(`/admin/users/${user.id}/unban`);
      ElMessage.success('用户已启用');
    }
    fetchUsers();
  } catch {
    ElMessage.error('操作失败');
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
</script>
