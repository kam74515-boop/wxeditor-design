<template>
  <div class="dashboard-home">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-content">
        <h1 class="welcome-title">
          你好，{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '创作者' }} 👋
        </h1>
        <p class="welcome-desc">准备好创作精彩内容了吗？开始你的写作之旅吧。</p>
      </div>
      <div class="welcome-actions">
        <button class="action-btn primary" @click="$router.push('/editor')">
          <el-icon><Plus /></el-icon> 新建文档
        </button>
        <button class="action-btn secondary" @click="$router.push('/ai-writing')">
          <el-icon><MagicStick /></el-icon> AI 生成
        </button>
      </div>
    </div>

    <!-- 使用统计 -->
    <div class="stats-row">
      <div class="stat-card" v-for="stat in statsCards" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.bgColor }">
          <el-icon :size="20" :color="stat.color"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-card__value">{{ stat.value }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- 主内容区：两栏布局 -->
    <div class="content-grid">
      <!-- 最近文档 -->
      <div class="card recent-docs-card">
        <div class="card-header">
          <h3 class="card-title">最近文档</h3>
          <router-link to="/projects" class="card-link">查看全部 →</router-link>
        </div>

        <div v-if="loadingDocs" class="doc-loading">
          <el-skeleton :rows="4" animated />
        </div>

        <div v-else-if="recentDocs.length === 0" class="doc-empty">
          <div class="empty-icon">
            <el-icon :size="48"><FolderOpened /></el-icon>
          </div>
          <p>还没有任何文档</p>
          <button class="action-btn primary small" @click="$router.push('/editor')">
            <el-icon><Plus /></el-icon> 创建第一个文档
          </button>
        </div>

        <div v-else class="doc-list">
          <div
            v-for="doc in recentDocs"
            :key="doc.id"
            class="doc-item"
            @click="openDocument(doc.id)"
          >
            <div class="doc-item-left">
              <div class="doc-status-dot" :class="doc.status || 'draft'" />
              <div class="doc-item-info">
                <span class="doc-item-title">{{ doc.title || '无标题文档' }}</span>
                <span class="doc-item-meta">{{ formatRelativeTime(doc.updated_at || doc.updatedAt) }}</span>
              </div>
            </div>
            <div class="doc-item-right">
              <span class="doc-words">{{ doc.word_count || 0 }} 字</span>
              <div class="doc-status-badge" :class="doc.status || 'draft'">
                {{ getStatusText(doc.status || 'draft') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="card quick-actions-card">
        <div class="card-header">
          <h3 class="card-title">快捷操作</h3>
        </div>
        <div class="quick-grid">
          <button class="quick-item" @click="$router.push('/editor')">
            <div class="quick-icon" style="background: #DBEAFE;">
              <el-icon :size="22" color="#2563EB"><EditPen /></el-icon>
            </div>
            <span class="quick-label">新建文档</span>
          </button>
          <button class="quick-item" @click="$router.push('/ai-writing')">
            <div class="quick-icon" style="background: #F3E8FF;">
              <el-icon :size="22" color="#7C3AED"><MagicStick /></el-icon>
            </div>
            <span class="quick-label">AI 写作</span>
          </button>
          <button class="quick-item" @click="$router.push('/templates')">
            <div class="quick-icon" style="background: #FEF3C7;">
              <el-icon :size="22" color="#D97706"><Grid /></el-icon>
            </div>
            <span class="quick-label">模板中心</span>
          </button>
          <button class="quick-item" @click="$router.push('/materials')">
            <div class="quick-icon" style="background: #D1FAE5;">
              <el-icon :size="22" color="#059669"><PictureFilled /></el-icon>
            </div>
            <span class="quick-label">素材库</span>
          </button>
          <button class="quick-item" @click="$router.push('/teams')">
            <div class="quick-icon" style="background: #FCE7F3;">
              <el-icon :size="22" color="#DB2777"><UserFilled /></el-icon>
            </div>
            <span class="quick-label">团队协作</span>
          </button>
          <button class="quick-item" @click="$router.push('/membership')">
            <div class="quick-icon" style="background: #FEF2F2;">
              <el-icon :size="22" color="#DC2626"><Star /></el-icon>
            </div>
            <span class="quick-label">会员中心</span>
          </button>
        </div>

        <!-- 会员状态 -->
        <div v-if="userStore.userInfo?.membership" class="membership-status">
          <div class="ms-info">
            <el-icon><Trophy /></el-icon>
            <span>{{ membershipLabel }}</span>
          </div>
          <router-link v-if="userStore.userInfo.membership.type !== 'pro'" to="/pricing" class="ms-upgrade">
            升级
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import http from '@/utils/http';
import {
  Plus, MagicStick, EditPen, Grid, PictureFilled, UserFilled, Star,
  Document, FolderOpened, Trophy,
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

interface DocItem {
  id: string;
  title: string;
  status: string;
  word_count: number;
  updated_at?: string;
  updatedAt?: string;
}

const recentDocs = ref<DocItem[]>([]);
const loadingDocs = ref(true);
const statsData = ref({
  totalDocs: 0,
  totalWords: 0,
  publishedCount: 0,
  draftCount: 0,
});

const statsCards = computed(() => [
  {
    label: '总文档数',
    value: statsData.value.totalDocs,
    icon: Document,
    color: '#2563EB',
    bgColor: '#DBEAFE',
  },
  {
    label: '总字数',
    value: statsData.value.totalWords.toLocaleString(),
    icon: EditPen,
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    label: '已发布',
    value: statsData.value.publishedCount,
    icon: 'Promotion',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    label: '草稿',
    value: statsData.value.draftCount,
    icon: 'Files',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
  },
]);

const membershipLabel = computed(() => {
  const type = userStore.userInfo?.membership?.type;
  const map: Record<string, string> = {
    free: '免费版',
    basic: '基础版',
    pro: '专业版',
    enterprise: '企业版',
  };
  return map[type || 'free'] || '免费版';
});

onMounted(async () => {
  await Promise.all([fetchRecentDocs(), fetchStats()]);
});

async function fetchRecentDocs() {
  loadingDocs.value = true;
  try {
    const res: any = await http.get('/collab/documents', {
      params: { limit: 5, page: 1 },
    });
    if (res.success && res.data?.list) {
      recentDocs.value = res.data.list.slice(0, 5);
    }
  } catch (err) {
    console.error('获取最近文档失败:', err);
  } finally {
    loadingDocs.value = false;
  }
}

async function fetchStats() {
  try {
    const res: any = await http.get('/collab/documents/stats');
    if (res.success && res.data) {
      statsData.value = res.data;
    }
  } catch (err) {
    console.error('获取统计数据失败:', err);
  }
}

function openDocument(id: string) {
  router.push(`/editor/${id}`);
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
    deleted: '已删除',
  };
  return map[status] || '草稿';
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * 86400 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.dashboard-home {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

// Welcome Banner
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $brand-yellow;
  border-radius: 16px;
  padding: 32px 36px;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0 0 8px;
}

.welcome-desc {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.5);
  margin: 0;
}

.welcome-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

// Action Buttons
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 150ms ease;

  &.primary {
    background: $layout-sider-dark;
    color: #fff;
    &:hover { opacity: 0.85; transform: translateY(-1px); }
  }

  &.secondary {
    background: #fff;
    color: $layout-sider-dark;
    border: 1px solid rgba(0,0,0,0.1);
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  }

  &.small {
    padding: 8px 16px;
    font-size: 13px;
  }
}

// Stats Row
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.04);
  transition: box-shadow 200ms ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 800;
  color: $layout-sider-dark;
  line-height: 1.2;
}

.stat-card__label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0,0,0,0.4);
  text-transform: uppercase;
}

// Content Grid
.content-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
}

// Card
.card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.04);
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0;
}

.card-link {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
  text-decoration: none;
  transition: color 150ms;
  &:hover { color: $layout-sider-dark; }
}

// Recent Docs
.doc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: #F8F9FA;
  }
}

.doc-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.doc-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.draft { background: #94A3B8; }
  &.published { background: $success; }
  &.archived { background: #F59E0B; }
}

.doc-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.doc-item-title {
  font-size: 14px;
  font-weight: 600;
  color: $layout-sider-dark;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item-meta {
  font-size: 12px;
  color: rgba(0,0,0,0.4);
}

.doc-item-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.doc-words {
  font-size: 12px;
  color: rgba(0,0,0,0.4);
}

.doc-status-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;

  &.draft {
    background: #F1F5F9;
    color: #64748B;
  }
  &.published {
    background: #D1FAE5;
    color: #059669;
  }
  &.archived {
    background: #FEF3C7;
    color: #D97706;
  }
}

.doc-loading, .doc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: rgba(0,0,0,0.2);
}

.doc-empty p {
  color: rgba(0,0,0,0.4);
  font-size: 14px;
  margin: 0 0 16px;
}

// Quick Actions
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  border-radius: 12px;
  background: #FAFAFA;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: #fff;
    border-color: rgba(0,0,0,0.06);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transform: translateY(-2px);
  }
}

.quick-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-label {
  font-size: 13px;
  font-weight: 600;
  color: $layout-sider-dark;
}

// Membership Status
.membership-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: $brand-yellow;
  border-radius: 10px;
}

.ms-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: $layout-sider-dark;
}

.ms-upgrade {
  padding: 4px 14px;
  border-radius: 999px;
  background: $layout-sider-dark;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 150ms;
  &:hover { opacity: 0.85; }
}

// Responsive
@media (max-width: $breakpoint-lg) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: $breakpoint-md) {
  .welcome-banner {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
