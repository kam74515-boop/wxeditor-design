<template>
  <!-- 管理后台 — 仪表盘 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">系统概览</h1>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row" style="margin-bottom: 24px;" v-loading="loading">
      <div class="stat-card stat-card--highlight">
        <span class="stat-card__label">总用户数</span>
        <span class="stat-card__value">{{ stats.userStats?.total ?? '-' }}</span>
        <span class="stat-card__change stat-card__change--up" v-if="stats.userStats?.today">今日 +{{ stats.userStats.today }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">活跃用户</span>
        <span class="stat-card__value">{{ stats.userStats?.active ?? '-' }}</span>
        <span class="stat-card__change" v-if="stats.userStats?.banned">{{ stats.userStats.banned }} 已封禁</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">总文档数</span>
        <span class="stat-card__value">{{ stats.documentStats?.total ?? '-' }}</span>
        <span class="stat-card__change stat-card__change--up" v-if="stats.documentStats?.today">今日 +{{ stats.documentStats.today }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">活跃会员</span>
        <span class="stat-card__value">{{ stats.membershipStats?.total ?? '-' }}</span>
        <span class="stat-card__change" v-if="stats.membershipStats">
          基础 {{ stats.membershipStats.basic }} / 专业 {{ stats.membershipStats.pro }}
        </span>
      </div>
    </div>

    <!-- 最近注册用户 -->
    <div v-if="stats.recentUsers?.length">
      <h3 style="font-size: 16px; font-weight: 700; color: #1D1D1F; margin-bottom: 16px;">最近注册</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div v-for="(user, i) in stats.recentUsers" :key="i" class="card" style="padding: 14px 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #F0F3F8; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: rgba(0,0,0,0.4);">
                {{ (user.username || 'U').charAt(0).toUpperCase() }}
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #1D1D1F;">{{ user.nickname || user.username }}</div>
                <div style="font-size: 12px; color: rgba(0,0,0,0.4);">{{ user.email }}</div>
              </div>
            </div>
            <span style="font-size: 12px; color: rgba(0,0,0,0.3);">{{ formatTime(user.createdAt || user.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载失败提示 -->
    <div v-if="error" style="text-align: center; padding: 40px; color: #EF4444;">
      <p>{{ error }}</p>
      <button class="card" style="padding: 8px 20px; cursor: pointer; border: none;" @click="fetchDashboard">重新加载</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/utils/http';

const loading = ref(true);
const error = ref('');
const stats = ref<any>({});

onMounted(() => {
  fetchDashboard();
});

async function fetchDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const res: any = await http.get('/admin/dashboard');
    if (res.success) {
      stats.value = res.data;
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || '获取统计数据失败';
    // 如果后端 API 不可用，显示空数据而非假数据
    stats.value = {};
  } finally {
    loading.value = false;
  }
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}
</script>
