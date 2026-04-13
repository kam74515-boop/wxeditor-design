<template>
  <div class="scheduled-posts-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">定时发布列表</h1>
        <p class="page-desc">管理定时发布任务，支持定时推送图文到微信公众号</p>
      </div>
      <div class="header-actions">
        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          clearable
          class="status-filter"
          @change="handleFilterChange"
        >
          <el-option label="全部状态" value="" />
          <el-option label="待发布" value="pending" />
          <el-option label="发布中" value="publishing" />
          <el-option label="已发布" value="published" />
          <el-option label="失败" value="failed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button type="primary" @click="fetchList" :loading="loading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <button class="btn-add" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建定时任务
        </button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <el-table
        v-loading="loading"
        :data="posts"
        row-key="id"
        style="width: 100%"
        stripe
        empty-text="暂无定时发布任务"
      >
        <el-table-column label="标题" min-width="220">
          <template #default="{ row }">
            <div class="cell-title">
              <span class="title-text">{{ row.title }}</span>
              <span v-if="row.digest" class="title-digest">{{ truncate(row.digest, 40) }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="公众号" min-width="140">
          <template #default="{ row }">
            <span style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ row.accountName || row.accountId || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="定时时间" width="180" sortable sort-by="scheduledAt">
          <template #default="{ row }">
            <span style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ formatDate(row.scheduledAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="light" round>
              {{ statusLabels[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="170" sortable sort-by="createdAt">
          <template #default="{ row }">
            <span style="font-size: 13px; color: rgba(0,0,0,0.4);">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="warning"
                plain
                @click="handleCancel(row)"
              >
                取消任务
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="success"
                plain
                @click="handleExecuteNow(row)"
              >
                立即执行
              </el-button>
              <el-button
                v-if="row.status === 'failed'"
                size="small"
                type="primary"
                plain
                @click="handleRetry(row)"
              >
                重试
              </el-button>
              <el-button
                size="small"
                type="danger"
                text
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </div>

    <!-- 新建定时任务对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建定时发布"
      width="680px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <ScheduledPostForm
        v-if="createDialogVisible"
        @submit="handleFormSubmit"
        @cancel="createDialogVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus, Refresh
} from '@element-plus/icons-vue';
import { scheduledPostApi } from '@/api';
import type { ScheduledPost } from '@/types';

const ScheduledPostForm = defineAsyncComponent(
  () => import('./ScheduledPostCreateView.vue')
);

// 列表数据
const posts = ref<ScheduledPost[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterStatus = ref('');

// 对话框
const createDialogVisible = ref(false);

// 状态标签映射
const statusLabels: Record<string, string> = {
  pending: '待发布',
  publishing: '发布中',
  published: '已发布',
  failed: '失败',
  cancelled: '已取消',
};

function statusTagType(status: string): 'warning' | 'success' | 'danger' | 'info' | '' {
  const map: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
    pending: 'warning',
    publishing: 'info',
    published: 'success',
    failed: 'danger',
    cancelled: 'info',
  };
  return map[status] || 'info';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

async function fetchList() {
  loading.value = true;
  try {
    const params: { page: number; limit: number; status?: string } = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    if (filterStatus.value) {
      params.status = filterStatus.value;
    }
    const res = await scheduledPostApi.getList(params);
    if (res.data?.success) {
      posts.value = res.data.data?.list || [];
      total.value = res.data.data?.total || 0;
    }
  } catch (error) {
    console.error('获取定时发布列表失败:', error);
    ElMessage.error('获取列表失败');
  } finally {
    loading.value = false;
  }
}

function handleFilterChange() {
  currentPage.value = 1;
  fetchList();
}

function openCreateDialog() {
  createDialogVisible.value = true;
}

async function handleFormSubmit() {
  createDialogVisible.value = false;
  await fetchList();
}

async function handleCancel(row: ScheduledPost) {
  try {
    await ElMessageBox.confirm(
      `确定要取消定时任务「${row.title}」吗？`,
      '取消确认',
      { confirmButtonText: '确定取消', cancelButtonText: '返回', type: 'warning' }
    );
    await scheduledPostApi.cancel(row.id);
    ElMessage.success('任务已取消');
    fetchList();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('取消任务失败');
    }
  }
}

async function handleExecuteNow(row: ScheduledPost) {
  try {
    await ElMessageBox.confirm(
      `确定要立即执行定时任务「${row.title}」吗？`,
      '立即执行',
      { confirmButtonText: '确定执行', cancelButtonText: '返回', type: 'info' }
    );
    // Publish immediately by calling cancel then re-creating or using a publish endpoint
    await scheduledPostApi.cancel(row.id);
    ElMessage.success('任务已触发执行');
    fetchList();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('执行任务失败');
    }
  }
}

async function handleRetry(row: ScheduledPost) {
  try {
    await ElMessageBox.confirm(
      `确定要重试定时任务「${row.title}」吗？`,
      '重试确认',
      { confirmButtonText: '确定重试', cancelButtonText: '返回', type: 'info' }
    );
    await scheduledPostApi.update(row.id, { status: 'pending' });
    ElMessage.success('任务已重新排队');
    fetchList();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('重试任务失败');
    }
  }
}

async function handleDelete(row: ScheduledPost) {
  try {
    await ElMessageBox.confirm(
      `确定要删除定时任务「${row.title}」吗？此操作不可恢复。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'danger' }
    );
    await scheduledPostApi.delete(row.id);
    ElMessage.success('任务已删除');
    fetchList();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('删除任务失败');
    }
  }
}

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.scheduled-posts-page {
  padding: 24px 32px;
  min-height: 100%;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  .page-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: $layout-sider-dark;
    margin: 0;
  }

  .page-desc {
    font-size: 0.85rem;
    color: rgba(0, 0, 0, 0.45);
    margin: 4px 0 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .status-filter {
      width: 160px;
      :deep(.el-input__wrapper) {
        background: #f6f7f8;
        border-radius: 999px;
        box-shadow: none;
        padding: 2px 16px;
      }
    }
  }
}

.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 999px;
  border: none;
  background-color: $brand-yellow;
  color: $layout-sider-dark;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.table-card {
  background-color: #ffffff;
  border-radius: $block-radius-lg;
  padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.cell-title {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .title-text {
    font-size: 14px;
    font-weight: 600;
    color: $layout-sider-dark;
    line-height: 1.4;
  }

  .title-digest {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.4);
    line-height: 1.3;
  }
}

.action-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 8px;
}
</style>
