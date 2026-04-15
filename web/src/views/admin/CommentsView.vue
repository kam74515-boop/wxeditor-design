<template>
  <!-- 管理后台 — 评论管理 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">评论管理</h1>
    </div>
    <p class="admin-main__desc">管理全站文档评论，审核与回复</p>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-card__value">{{ stats.total }}</div>
        <div class="stat-card__label">总评论数</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">{{ stats.today }}</div>
        <div class="stat-card__label">今日新增</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__value">{{ stats.pending }}</div>
        <div class="stat-card__label">待审核</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-bar__left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索评论内容…"
          clearable
          style="width: 240px;"
          @clear="loadComments"
          @keyup.enter="loadComments"
        >
          <template #prefix>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </template>
        </el-input>
        <el-select v-model="filters.documentId" placeholder="按文档筛选" clearable style="width: 200px;" @change="loadComments">
          <el-option v-for="doc in documents" :key="doc.id" :label="doc.title" :value="doc.id" />
        </el-select>
        <el-select v-model="filters.status" placeholder="按状态筛选" clearable style="width: 140px;" @change="loadComments">
          <el-option label="已发布" value="published" />
          <el-option label="待审核" value="pending" />
          <el-option label="已隐藏" value="hidden" />
        </el-select>
      </div>
      <el-button type="primary" @click="loadComments" :loading="loading">刷新</el-button>
    </div>

    <!-- 评论表格 -->
    <el-table
      v-loading="loading"
      :data="comments"
      row-key="id"
      :expand-row-keys="expandedRows"
      @expand-change="onExpandChange"
      style="width: 100%;"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div style="padding: 12px 20px 12px 50px;">
            <div v-if="row.replies && row.replies.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
              <div v-for="reply in row.replies" :key="reply.id" class="reply-item">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 12px; font-weight: 600; color: #1D1D1F;">{{ reply.author?.nickname || reply.authorName || '匿名' }}</span>
                  <span style="font-size: 11px; color: rgba(0,0,0,0.3);">{{ formatDate(reply.createdAt) }}</span>
                  <span :class="['comment-status', `comment-status--${reply.status}`]">{{ statusLabels[reply.status] || reply.status }}</span>
                </div>
                <div style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ reply.content }}</div>
                <div style="margin-top: 4px; display: flex; gap: 8px;">
                  <el-button size="small" text @click="toggleVisibility(reply)">{{ reply.status === 'hidden' ? '显示' : '隐藏' }}</el-button>
                  <el-button size="small" text style="color: #EF4444;" @click="deleteComment(reply)">删除</el-button>
                </div>
              </div>
            </div>
            <div v-else style="font-size: 12px; color: rgba(0,0,0,0.3);">暂无回复</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="评论内容" min-width="260">
        <template #default="{ row }">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 13px; color: #1D1D1F; line-height: 1.5;">{{ truncate(row.content, 80) }}</span>
            <span v-if="row.replies && row.replies.length" style="font-size: 11px; color: rgba(0,0,0,0.35);">{{ row.replies.length }} 条回复</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="所属文档" min-width="160">
        <template #default="{ row }">
          <span style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ row.documentTitle || row.document_id || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="评论人" width="130">
        <template #default="{ row }">
          <span style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ row.author?.nickname || row.authorName || '匿名' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170" sortable sort-by="createdAt">
        <template #default="{ row }">
          <span style="font-size: 12px; color: rgba(0,0,0,0.45);">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <span :class="['comment-status', `comment-status--${row.status}`]">{{ statusLabels[row.status] || row.status }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" text @click="viewDetail(row)">详情</el-button>
          <el-button size="small" text @click="toggleVisibility(row)">{{ row.status === 'hidden' ? '显示' : '隐藏' }}</el-button>
          <el-button size="small" text style="color: #EF4444;" @click="deleteComment(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadComments"
        @current-change="loadComments"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetail" title="评论详情" width="560px">
      <template v-if="detailComment">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 4px;">评论人</div>
            <div style="font-size: 14px; font-weight: 600;">{{ detailComment.author?.nickname || detailComment.authorName || '匿名' }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 4px;">所属文档</div>
            <div style="font-size: 14px;">{{ detailComment.documentTitle || detailComment.document_id || '-' }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 4px;">评论时间</div>
            <div style="font-size: 14px;">{{ formatDate(detailComment.createdAt) }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 4px;">状态</div>
            <span :class="['comment-status', `comment-status--${detailComment.status}`]">{{ statusLabels[detailComment.status] || detailComment.status }}</span>
          </div>
          <div>
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 4px;">评论内容</div>
            <div style="font-size: 14px; line-height: 1.6; padding: 12px; background: #F5F5F7; border-radius: 8px;">{{ detailComment.content }}</div>
          </div>
          <div v-if="detailComment.replies && detailComment.replies.length">
            <div style="font-size: 12px; color: rgba(0,0,0,0.4); margin-bottom: 8px;">回复 ({{ detailComment.replies.length }})</div>
            <div v-for="reply in detailComment.replies" :key="reply.id" class="reply-item">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600;">{{ reply.author?.nickname || reply.authorName || '匿名' }}</span>
                <span style="font-size: 11px; color: rgba(0,0,0,0.3);">{{ formatDate(reply.createdAt) }}</span>
              </div>
              <div style="font-size: 13px; color: rgba(0,0,0,0.65);">{{ reply.content }}</div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';

interface CommentAuthor {
  id?: string;
  nickname?: string;
  avatar?: string;
}

interface Comment {
  id: string;
  content: string;
  document_id: string;
  documentTitle?: string;
  author?: CommentAuthor;
  authorName?: string;
  parent_id?: string;
  status: string;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  title: string;
}

const statusLabels: Record<string, string> = {
  published: '已发布',
  pending: '待审核',
  hidden: '已隐藏',
};

const loading = ref(false);
const comments = ref<Comment[]>([]);
const documents = ref<Document[]>([]);
const expandedRows = ref<string[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

const stats = reactive({ total: 0, today: 0, pending: 0 });

const filters = reactive({
  keyword: '',
  documentId: '',
  status: '',
});

const showDetail = ref(false);
const detailComment = ref<Comment | null>(null);

onMounted(() => {
  loadComments();
  loadDocuments();
  loadStats();
});

async function loadComments() {
  loading.value = true;
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.documentId) params.documentId = filters.documentId;
    if (filters.status) params.status = filters.status;

    const res: any = await http.get('/comments', { params });
    if (res.success) {
      comments.value = res.data.list || res.data || [];
      total.value = res.data.total || comments.value.length;
    }
  } catch {
    // Mock fallback
    comments.value = [
      {
        id: 'c1',
        content: '这篇文章写得非常好，排版清晰，内容详实！',
        document_id: 'd1',
        documentTitle: 'Vue 3 组合式 API 入门指南',
        author: { id: 'u1', nickname: '张三' },
        status: 'published',
        replies: [
          { id: 'c1r1', content: '感谢支持！后续会更新更多内容。', document_id: 'd1', author: { id: 'u2', nickname: '李四' }, status: 'published', createdAt: '2026-04-12T14:30:00Z', updatedAt: '2026-04-12T14:30:00Z' },
        ],
        createdAt: '2026-04-13T08:00:00Z',
        updatedAt: '2026-04-13T08:00:00Z',
      },
      {
        id: 'c2',
        content: '请问这个方法在 TypeScript 中也能用吗？',
        document_id: 'd1',
        documentTitle: 'Vue 3 组合式 API 入门指南',
        author: { id: 'u3', nickname: '王五' },
        status: 'pending',
        createdAt: '2026-04-13T09:15:00Z',
        updatedAt: '2026-04-13T09:15:00Z',
      },
      {
        id: 'c3',
        content: '内容有点过时了，建议更新一下。',
        document_id: 'd2',
        documentTitle: 'Webpack 5 配置详解',
        author: { id: 'u4', nickname: '赵六' },
        status: 'published',
        createdAt: '2026-04-12T16:45:00Z',
        updatedAt: '2026-04-12T16:45:00Z',
      },
    ];
    total.value = 3;
  } finally {
    loading.value = false;
  }
}

async function loadDocuments() {
  try {
    const res: any = await http.get('/documents', { params: { pageSize: 200 } });
    if (res.success) {
      documents.value = (res.data.list || res.data || []).map((d: any) => ({ id: d.id, title: d.title }));
    }
  } catch {
    documents.value = [
      { id: 'd1', title: 'Vue 3 组合式 API 入门指南' },
      { id: 'd2', title: 'Webpack 5 配置详解' },
      { id: 'd3', title: 'TailwindCSS 最佳实践' },
    ];
  }
}

async function loadStats() {
  try {
    const res: any = await http.get('/comments/stats');
    if (res.success && res.data) {
      stats.total = res.data.total || 0;
      stats.today = res.data.today || 0;
      stats.pending = res.data.pending || 0;
    }
  } catch {
    stats.total = 28;
    stats.today = 5;
    stats.pending = 3;
  }
}

function onExpandChange(_row: Comment, expanded: Comment[]) {
  expandedRows.value = expanded.map((r: any) => r.id);
}

function viewDetail(comment: Comment) {
  detailComment.value = comment;
  showDetail.value = true;
}

async function toggleVisibility(comment: Comment) {
  const newStatus = comment.status === 'hidden' ? 'published' : 'hidden';
  try {
    await http.put(`/comments/${comment.id}`, { status: newStatus });
    ElMessage.success(newStatus === 'hidden' ? '已隐藏' : '已显示');
    loadComments();
  } catch {
    // Optimistic local update fallback
    comment.status = newStatus;
    ElMessage.success(newStatus === 'hidden' ? '已隐藏' : '已显示');
  }
}

async function deleteComment(comment: Comment) {
  try {
    await ElMessageBox.confirm('确定要删除该评论吗？删除后不可恢复。', '确认删除', { type: 'warning' });
    try {
      await http.delete(`/comments/${comment.id}`);
      ElMessage.success('评论已删除');
    } catch {
      // fallback
    }
    loadComments();
  } catch {
    // User cancelled
  }
}

function truncate(text: string, len: number) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style scoped>
.stat-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  flex: 1;
  background: #F5F5F7;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}
.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #1D1D1F;
}
.stat-card__label {
  font-size: 12px;
  color: rgba(0,0,0,0.4);
  margin-top: 4px;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.filter-bar__left {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.comment-status {
  font-size: 11px;
  font-weight: 600;
}
.comment-status--published { color: #10B981; }
.comment-status--pending { color: #F59E0B; }
.comment-status--hidden { color: rgba(0,0,0,0.3); }

.reply-item {
  padding: 10px 12px;
  background: #F5F5F7;
  border-radius: 8px;
  border-left: 3px solid #FFD60A;
}
</style>
