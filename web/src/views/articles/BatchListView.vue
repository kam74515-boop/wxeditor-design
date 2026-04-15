<template>
  <div class="batch-list-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">图文合集</h1>
        <p class="page-desc">管理图文消息，支持多篇文章一起发布到微信公众号</p>
      </div>
      <button class="btn-add" @click="createBatch">
        <el-icon><Plus /></el-icon>
        新建合集
      </button>
    </div>

    <!-- Status tabs -->
    <div class="status-tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['status-tab', { active: activeStatus === tab.value }]"
        @click="activeStatus = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Batch list -->
    <div v-loading="loading" class="batch-list">
      <div
        v-for="batch in filteredBatches"
        :key="batch.id"
        class="batch-card"
        @click="goToEditor(batch)"
      >
        <div class="batch-card__header">
          <h3 class="batch-card__title">{{ batch.title }}</h3>
          <span :class="['batch-card__status', `status--${batch.status}`]">
            {{ statusLabels[batch.status] || batch.status }}
          </span>
        </div>
        <div class="batch-card__meta">
          <span>{{ batch.article_count || 0 }} 篇文章</span>
          <span>更新于 {{ formatDate(batch.updated_at) }}</span>
        </div>
        <div class="batch-card__actions">
          <el-button size="small" text @click.stop="goToEditor(batch)">编辑</el-button>
          <el-button
            v-if="batch.status === 'draft' || batch.status === 'ready'"
            size="small"
            text
            type="primary"
            @click.stop="publishBatch(batch)"
          >
            发布
          </el-button>
          <el-button size="small" text type="danger" @click.stop="deleteBatch(batch)">删除</el-button>
        </div>
      </div>

      <div v-if="!loading && filteredBatches.length === 0" class="empty-state">
        <el-icon :size="48" color="rgba(0,0,0,0.15)"><Notebook /></el-icon>
        <p class="empty-state__title">暂无图文合集</p>
        <p class="empty-state__desc">点击右上角「新建合集」开始创建</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Notebook } from '@element-plus/icons-vue';
import { articleBatchApi } from '@/api';

const router = useRouter();

interface Batch {
  id: string;
  title: string;
  status: string;
  article_count: number;
  articles: any[];
  published_at: string;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  ready: '待发布',
  published: '已发布',
  failed: '发布失败',
};

const statusTabs = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '待发布', value: 'ready' },
  { label: '已发布', value: 'published' },
];

const loading = ref(false);
const batches = ref<Batch[]>([]);
const activeStatus = ref('');

const filteredBatches = computed(() => {
  if (!activeStatus.value) return batches.value;
  return batches.value.filter(b => b.status === activeStatus.value);
});

onMounted(() => {
  fetchBatches();
});

async function fetchBatches() {
  loading.value = true;
  try {
    const res: any = await articleBatchApi.getList({ limit: 50 });
    if (res.success) {
      batches.value = (res.data.list || []).map((b: any) => ({
        ...b,
        article_count: b.articles?.length || 0,
      }));
    }
  } catch {
    // Mock fallback
    batches.value = [
      { id: '1', title: '产品更新周报 #12', status: 'draft', article_count: 3, articles: [], published_at: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', title: '春季活动合集', status: 'published', article_count: 5, articles: [], published_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
    ];
  } finally {
    loading.value = false;
  }
}

async function createBatch() {
  try {
    const res: any = await articleBatchApi.create({ title: '未命名合集' });
    if (res.success && res.data?.id) {
      router.push(`/dashboard/article-batches/${res.data.id}`);
    }
  } catch {
    ElMessage.error('创建失败');
  }
}

function goToEditor(batch: Batch) {
  router.push(`/dashboard/article-batches/${batch.id}`);
}

async function publishBatch(batch: Batch) {
  try {
    await ElMessageBox.confirm(
      `确定要发布「${batch.title}」到微信公众号吗？`,
      '确认发布',
      { type: 'info' },
    );
    const res: any = await articleBatchApi.publish(batch.id);
    if (res.success) {
      ElMessage.success('发布成功');
      fetchBatches();
    }
  } catch { /* cancelled or error */ }
}

async function deleteBatch(batch: Batch) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${batch.title}」吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' },
    );
    await articleBatchApi.delete(batch.id);
    ElMessage.success('已删除');
    fetchBatches();
  } catch { /* cancelled */ }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.batch-list-page {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
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
.btn-add:hover { opacity: 0.85; }

.status-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 8px;
}

.status-tab {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}
.status-tab:hover {
  background: rgba(0, 0, 0, 0.04);
}
.status-tab.active {
  background: #1d1d1f;
  color: #fff;
}

.batch-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

.batch-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s;
}
.batch-card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.batch-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.batch-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-card__status {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-left: 8px;
}
.status--draft { background: #f3f4f6; color: rgba(0,0,0,0.5); }
.status--ready { background: #dbeafe; color: #2563eb; }
.status--published { background: #dcfce7; color: #16a34a; }
.status--failed { background: #fee2e2; color: #dc2626; }

.batch-card__meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 10px;
}

.batch-card__actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  gap: 8px;
}

.empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.3);
  margin: 0;
}

.empty-state__desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.2);
  margin: 0;
}
</style>
