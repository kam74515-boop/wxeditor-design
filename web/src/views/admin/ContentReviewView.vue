<template>
  <!-- 管理后台 — 内容审核 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">内容审核</h1>
      <div style="display: flex; gap: 8px;">
        <button
          v-for="t in tabs"
          :key="t.value"
          :class="['pricing-toggle__option', { 'pricing-toggle__option--active': tab === t.value }]"
          @click="tab = t.value"
        >{{ t.label }} ({{ t.value === 'pending' ? pendingTotal : t.value === 'approved' ? approvedTotal : t.value === 'rejected' ? rejectedTotal : historyTotal }})</button>
      </div>
    </div>
    <p class="admin-main__desc">审核用户提交的内容，确保合规。</p>

    <!-- 搜索与筛选 -->
    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
      <div class="search-bar" style="width: 260px;">
        <el-icon><Search /></el-icon>
        <input v-model="searchQuery" placeholder="搜索标题或作者..." @input="debouncedSearch" />
      </div>
      <el-select v-model="contentType" placeholder="全部类型" clearable size="small" style="width: 140px;">
        <el-option label="全部类型" value="" />
        <el-option label="文章" value="article" />
        <el-option label="模板" value="template" />
        <el-option label="评论" value="comment" />
      </el-select>
      <el-button size="small" @click="batchApprove" :disabled="!selectedItems.length" type="success" plain>
        批量通过 ({{ selectedItems.length }})
      </el-button>
      <el-button size="small" @click="batchReject" :disabled="!selectedItems.length" type="danger" plain>
        批量拒绝 ({{ selectedItems.length }})
      </el-button>
    </div>

    <!-- 待审核内容列表 -->
    <table class="admin-table" v-loading="loading">
      <thead>
        <tr>
          <th style="width: 40px;">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
          </th>
          <th>内容标题</th>
          <th>类型</th>
          <th>提交者</th>
          <th>提交时间</th>
          <th v-if="isHistoryTab">审核人</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in contentList" :key="item.id">
          <td>
            <input type="checkbox" :value="item.id" v-model="selectedItems" />
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div v-if="item.previewImage" style="width: 40px; height: 30px; border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                <img :src="item.previewImage" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <div v-else style="width: 40px; height: 30px; border-radius: 4px; background: #F0F3F8; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                <FileText :size="14" style="color: rgba(0,0,0,0.2);" />
              </div>
              <div>
                <span style="font-weight: 600; cursor: pointer;" @click="previewContent(item)">{{ item.title || '无标题' }}</span>
                <div style="font-size: 11px; color: rgba(0,0,0,0.3); margin-top: 2px;">{{ (item.content || '').slice(0, 60) }}{{ (item.content || '').length > 60 ? '...' : '' }}</div>
              </div>
            </div>
          </td>
          <td>
            <span :class="['role-tag', `role-tag--${item.type}`]">{{ typeLabels[item.type] || item.type }}</span>
          </td>
          <td style="color: rgba(0,0,0,0.5);">{{ item.authorName || '未知' }}</td>
          <td style="color: rgba(0,0,0,0.4); font-size: 13px;">{{ formatDate(item.createdAt) }}</td>
          <td v-if="isHistoryTab" style="color: rgba(0,0,0,0.5);">{{ item.reviewerName || '-' }}</td>
          <td>
            <span :style="{ color: statusColor(item.status), fontWeight: 600, fontSize: '13px' }">
              {{ statusLabels[item.status] || item.status }}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <el-button size="small" text @click="previewContent(item)">预览</el-button>
              <el-button v-if="item.status === 'pending'" size="small" text type="success" @click="approveItem(item)">通过</el-button>
              <el-button v-if="item.status === 'pending'" size="small" text type="danger" @click="openRejectDialog(item)">拒绝</el-button>
              <el-button v-if="item.status !== 'pending'" size="small" text @click="previewContent(item)">详情</el-button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 空状态 -->
    <div v-if="!loading && contentList.length === 0" style="text-align: center; padding: 60px 20px; color: rgba(0,0,0,0.3);">
      <FileText :size="48" style="margin-bottom: 12px; opacity: 0.3;" />
      <p>暂无{{ tab === 'pending' ? '待审核' : tab === 'approved' ? '已通过' : tab === 'rejected' ? '已拒绝' : '审核历史' }}内容</p>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" style="display: flex; justify-content: center; margin-top: 24px;">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="fetchContent"
      />
    </div>

    <!-- 内容预览弹窗 -->
    <el-dialog v-model="showPreview" :title="previewItem?.title || '内容预览'" width="700px">
      <div v-if="previewItem" style="max-height: 500px; overflow-y: auto;">
        <div style="display: flex; gap: 16px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(0,0,0,0.06);">
          <div>
            <span style="font-size: 12px; color: rgba(0,0,0,0.4);">提交者</span>
            <div style="font-weight: 600;">{{ previewItem.authorName || '未知' }}</div>
          </div>
          <div>
            <span style="font-size: 12px; color: rgba(0,0,0,0.4);">类型</span>
            <div style="font-weight: 600;">{{ typeLabels[previewItem.type] || previewItem.type }}</div>
          </div>
          <div>
            <span style="font-size: 12px; color: rgba(0,0,0,0.4);">提交时间</span>
            <div style="font-weight: 600;">{{ formatDate(previewItem.createdAt) }}</div>
          </div>
          <div>
            <span style="font-size: 12px; color: rgba(0,0,0,0.4);">状态</span>
            <div :style="{ fontWeight: 600, color: statusColor(previewItem.status) }">{{ statusLabels[previewItem.status] }}</div>
          </div>
        </div>
        <div v-if="previewItem.previewImage" style="margin-bottom: 16px;">
          <img :src="previewItem.previewImage" style="max-width: 100%; border-radius: 8px;" />
        </div>
        <div style="background: #F8F9FA; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; color: #1D1D1F;">
          <div v-html="previewItem.content || '<p style=\'color:rgba(0,0,0,0.3)\'>暂无内容</p>'"></div>
        </div>
        <div v-if="previewItem.reviewReason || previewItem.reviewerName" style="margin-top: 16px; padding: 12px 16px; border-radius: 8px; background: rgba(0,0,0,0.03);">
          <div v-if="previewItem.reviewerName" style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 6px;">
            审核人：<span style="font-weight: 600; color: #1D1D1F;">{{ previewItem.reviewerName }}</span>
          </div>
          <div v-if="previewItem.reviewReason" style="font-size: 13px; color: rgba(0,0,0,0.5);">
            审核说明：<span style="color: #1D1D1F;">{{ previewItem.reviewReason }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreview = false">关闭</el-button>
        <el-button v-if="previewItem?.status === 'pending'" type="success" @click="approveItem(previewItem!); showPreview = false">通过</el-button>
        <el-button v-if="previewItem?.status === 'pending'" type="danger" @click="openRejectDialog(previewItem!); showPreview = false">拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="showRejectDialog" title="拒绝内容" width="450px">
      <div style="margin-bottom: 16px;">
        <p style="font-size: 13px; color: rgba(0,0,0,0.5); margin-bottom: 8px;">
          内容: {{ rejectItem?.title || '无标题' }}
        </p>
        <el-input
          v-model="rejectReason"
          type="textarea"
          :rows="4"
          placeholder="请输入拒绝原因（可选）"
        />
      </div>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="actionLoading">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, FileText } from 'lucide-vue-next';
import http from '@/utils/http';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  authorName: string;
  reviewerName?: string;
  reviewReason?: string;
  previewImage?: string;
  createdAt: string;
}

const tabs = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'history', label: '审核历史' },
];

const typeLabels: Record<string, string> = { article: '文章', template: '模板', comment: '评论' };
const statusLabels: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };

function statusColor(status: string) {
  if (status === 'approved') return '#10B981';
  if (status === 'rejected') return '#EF4444';
  return '#F59E0B';
}

const tab = ref('pending');
const searchQuery = ref('');
const contentType = ref('');
const loading = ref(false);
const currentPage = ref(1);
const pageSize = 20;
const total = ref(0);
const pendingTotal = ref(0);
const approvedTotal = ref(0);
const rejectedTotal = ref(0);
const contentList = ref<ContentItem[]>([]);
const selectedItems = ref<string[]>([]);
const selectAll = ref(false);
const isHistoryTab = computed(() => tab.value === 'history');
const historyTotal = computed(() => approvedTotal.value + rejectedTotal.value);

// 预览
const showPreview = ref(false);
const previewItem = ref<ContentItem | null>(null);

// 拒绝
const showRejectDialog = ref(false);
const rejectItem = ref<ContentItem | null>(null);
const rejectReason = ref('');
const actionLoading = ref(false);

onMounted(() => {
  fetchContent();
  fetchCounts();
});

watch(tab, () => {
  currentPage.value = 1;
  selectedItems.value = [];
  selectAll.value = false;
  fetchContent();
});

watch(contentType, () => {
  currentPage.value = 1;
  fetchContent();
});

let searchTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchContent();
  }, 300);
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedItems.value = contentList.value.map(i => i.id);
  } else {
    selectedItems.value = [];
  }
}

async function fetchCounts() {
  try {
    const res: any = await http.get('/admin/content-review/counts');
    if (res.success && res.data) {
      pendingTotal.value = res.data.pending || 0;
      approvedTotal.value = res.data.approved || 0;
      rejectedTotal.value = res.data.rejected || 0;
    }
  } catch {
    pendingTotal.value = 0;
    approvedTotal.value = 0;
    rejectedTotal.value = 0;
  }
}

async function fetchContent() {
  loading.value = true;
  try {
    const status = isHistoryTab.value ? '' : tab.value;
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize,
      status,
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (contentType.value) params.type = contentType.value;

    const res: any = await http.get('/admin/content-review', { params });
    if (res.success) {
      contentList.value = res.data.list || [];
      total.value = res.data.total || 0;
    }
  } catch {
    contentList.value = [];
    total.value = 0;
  } finally {
    selectedItems.value = [];
    selectAll.value = false;
    loading.value = false;
  }
}

function previewContent(item: ContentItem) {
  previewItem.value = item;
  showPreview.value = true;
}

async function approveItem(item: ContentItem) {
  try {
    await http.post(`/admin/content-review/${item.id}/approve`);
    ElMessage.success('内容已通过审核');
    fetchContent();
    fetchCounts();
  } catch {
    ElMessage.error('操作失败');
  }
}

function openRejectDialog(item: ContentItem) {
  rejectItem.value = item;
  rejectReason.value = '';
  showRejectDialog.value = true;
}

async function confirmReject() {
  if (!rejectItem.value) return;
  actionLoading.value = true;
  try {
    await http.post(`/admin/content-review/${rejectItem.value.id}/reject`, {
      reason: rejectReason.value,
    });
    ElMessage.success('内容已拒绝');
    showRejectDialog.value = false;
    fetchContent();
    fetchCounts();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    actionLoading.value = false;
  }
}

async function batchApprove() {
  if (!selectedItems.value.length) return;
  try {
    await ElMessageBox.confirm(`确定要批量通过 ${selectedItems.value.length} 条内容吗？`, '批量通过', { type: 'warning' });
    await http.post('/admin/content-review/batch-approve', { ids: selectedItems.value });
    ElMessage.success('批量通过成功');
    selectedItems.value = [];
    selectAll.value = false;
    fetchContent();
    fetchCounts();
  } catch { /* 取消 */ }
}

async function batchReject() {
  if (!selectedItems.value.length) return;
  try {
    const { value } = await ElMessageBox.prompt(
      `确定要批量拒绝 ${selectedItems.value.length} 条内容吗？可选填写原因。`,
      '批量拒绝',
      {
        type: 'warning',
        inputPlaceholder: '请输入拒绝原因（可选）',
        inputValue: '',
      }
    );
    await http.post('/admin/content-review/batch-reject', { ids: selectedItems.value, reason: value || '' });
    ElMessage.success('批量拒绝成功');
    selectedItems.value = [];
    selectAll.value = false;
    fetchContent();
    fetchCounts();
  } catch { /* 取消 */ }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.role-tag--article { background: #DBEAFE; color: #2563EB; }
.role-tag--template { background: #FEF3C7; color: #D97706; }
.role-tag--comment { background: #E0E7FF; color: #4F46E5; }
</style>
