<template>
  <!-- 后台：会员管理 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">会员管理</h1>
      <p class="admin-main__desc">管理用户订阅和会员状态</p>
    </div>

    <!-- 统计概览 -->
    <div class="stats-row" style="margin-bottom: 24px;">
      <div class="stat-card stat-card--highlight">
        <span class="stat-card__label">付费会员</span>
        <span class="stat-card__value">{{ stats.paidMembers }}</span>
        <span class="stat-card__change stat-card__change--up">↑ 15.3%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">月活跃订阅</span>
        <span class="stat-card__value">{{ stats.activeSubscriptions }}</span>
        <span class="stat-card__change stat-card__change--up">↑ 8.2%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">月收入</span>
        <span class="stat-card__value">¥{{ stats.monthlyRevenue }}</span>
        <span class="stat-card__change stat-card__change--up">↑ 22.1%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">流失率</span>
        <span class="stat-card__value">{{ stats.churnRate }}%</span>
        <span class="stat-card__change stat-card__change--down">↓ 2.1%</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filterPlan" class="filter-select">
        <option value="">全部套餐</option>
        <option value="pro">专业版</option>
        <option value="enterprise">企业版</option>
      </select>
      <select v-model="filterStatus" class="filter-select">
        <option value="">全部状态</option>
        <option value="active">生效中</option>
        <option value="expired">已过期</option>
        <option value="cancelled">已取消</option>
      </select>
      <input v-model="searchQuery" class="filter-input" placeholder="搜索用户名或邮箱..." />
    </div>

    <!-- 会员列表表格 -->
    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>套餐</th>
            <th>计费周期</th>
            <th>到期日</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredMembers" :key="member.id">
            <td>
              <div class="user-cell">
                <div class="user-avatar">{{ member.name.charAt(0) }}</div>
                <div>
                  <div class="user-name">{{ member.name }}</div>
                  <div class="user-email">{{ member.email }}</div>
                </div>
              </div>
            </td>
            <td><span class="plan-tag" :class="'plan-tag--' + member.plan">{{ planNames[member.plan] }}</span></td>
            <td>{{ periodNames[member.period] }}</td>
            <td>{{ member.expiresAt }}</td>
            <td><span class="status-dot" :class="'status-dot--' + member.status" />{{ statusNames[member.status] }}</td>
            <td>
              <div class="action-btns">
                <button class="action-btn" @click="extendMember(member)">延期</button>
                <button class="action-btn action-btn--danger" @click="cancelMember(member)">取消</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 统计数据
const stats = {
  paidMembers: 186,
  activeSubscriptions: 142,
  monthlyRevenue: '12,850',
  churnRate: 3.2
};

// 筛选
const filterPlan = ref('');
const filterStatus = ref('');
const searchQuery = ref('');

const planNames: Record<string, string> = { pro: '专业版', enterprise: '企业版' };
const periodNames: Record<string, string> = { monthly: '月付', quarterly: '季付', yearly: '年付' };
const statusNames: Record<string, string> = { active: '生效中', expired: '已过期', cancelled: '已取消' };

// 模拟会员数据
const members = ref([
  { id: 1, name: '张伟', email: 'zhangwei@example.com', plan: 'pro', period: 'yearly', expiresAt: '2026-12-15', status: 'active' },
  { id: 2, name: '李明', email: 'liming@example.com', plan: 'enterprise', period: 'monthly', expiresAt: '2026-04-20', status: 'active' },
  { id: 3, name: '王芳', email: 'wangfang@example.com', plan: 'pro', period: 'quarterly', expiresAt: '2026-06-01', status: 'active' },
  { id: 4, name: '赵强', email: 'zhaoqiang@example.com', plan: 'pro', period: 'monthly', expiresAt: '2026-02-28', status: 'expired' },
  { id: 5, name: '刘洋', email: 'liuyang@example.com', plan: 'enterprise', period: 'yearly', expiresAt: '2025-11-10', status: 'cancelled' },
  { id: 6, name: '陈雪', email: 'chenxue@example.com', plan: 'pro', period: 'yearly', expiresAt: '2027-01-05', status: 'active' },
]);

const filteredMembers = computed(() => {
  return members.value.filter(m => {
    if (filterPlan.value && m.plan !== filterPlan.value) return false;
    if (filterStatus.value && m.status !== filterStatus.value) return false;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    }
    return true;
  });
});

function extendMember(member: any) {
  alert(`延期会员: ${member.name}`);
}

function cancelMember(member: any) {
  if (confirm(`确定取消 ${member.name} 的会员？`)) {
    member.status = 'cancelled';
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-select, .filter-input {
  height: 36px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  padding: 0 12px;
  font-size: 0.85rem;
  background: #ffffff;
  color: $layout-sider-dark;
  outline: none;

  &:focus { border-color: $layout-sider-dark; }
}

.filter-input { flex: 1; }

.table-card {
  background: #ffffff;
  border-radius: 12px 12px 0 0;
  border: 1px solid rgba(0,0,0,0.06);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 12px 16px;
    text-align: left;
    font-size: 0.85rem;
  }

  th {
    background: #FAFAFA;
    font-weight: 700;
    color: rgba(0,0,0,0.5);
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }

  td {
    border-bottom: 1px solid rgba(0,0,0,0.04);
    color: $layout-sider-dark;
  }

  tr:hover td { background: rgba(0,0,0,0.01); }
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #BAE6FD;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: $layout-sider-dark;
}

.user-name { font-weight: 600; }
.user-email { font-size: 0.75rem; color: rgba(0,0,0,0.4); }

.plan-tag {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;

  &--pro { background: #FBCFE8; color: $layout-sider-dark; }
  &--enterprise { background: #DDD6FE; color: $layout-sider-dark; }
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;

  &--active { background: $success; }
  &--expired { background: #F59E0B; }
  &--cancelled { background: #EF4444; }
}

.action-btns {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #E5E7EB;
  background: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  color: $layout-sider-dark;
  cursor: pointer;
  transition: all 0.2s;

  &:hover { background: #f5f5f5; }
  &--danger { color: #EF4444; border-color: rgba(239,68,68,0.2); &:hover { background: #fef2f2; } }
}
</style>
