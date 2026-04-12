<template>
  <div class="projects-layout">
    <!-- 左侧侧栏卡片 -->
    <aside class="sidebar-card">
      <div class="brand">
        <h2>项目管理</h2>
      </div>
      <nav class="nav-menu">
        <div :class="['nav-item', { active: currentFilter === 'all' }]" @click="setFilter('all')">
          <el-icon><FolderOpened /></el-icon> <span>全部项目</span>
        </div>
        <div :class="['nav-item', { active: currentFilter === 'recent' }]" @click="setFilter('recent')">
          <el-icon><Document /></el-icon> <span>最近使用</span>
        </div>
        <div :class="['nav-item', { active: currentFilter === 'archived' }]" @click="setFilter('archived')">
          <el-icon><Delete /></el-icon> <span>已归档</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="handleCreate">
          <el-icon><Plus /></el-icon> <span>新建项目</span>
        </button>
      </div>
    </aside>

    <!-- 右侧主内容卡片 -->
    <main class="main-card">
      <header class="page-header">
        <h2 class="page-title">{{ filterTitle }}</h2>
        <div class="header-actions">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input v-model="searchQuery" placeholder="搜索项目标题..." class="search-input" @input="debouncedSearch" @keyup.enter="handleSearch" />
          </div>
          <!-- 批量操作按钮 -->
          <button v-if="selectedIds.size > 0" class="action-btn delete-btn" @click="handleBatchDelete">
            <el-icon><Delete /></el-icon> <span>删除 ({{ selectedIds.size }})</span>
          </button>
          <button class="action-btn create-btn" @click="handleCreate">
            <el-icon><Plus /></el-icon> <span>新建项目</span>
          </button>
        </div>
      </header>

      <div class="list-container">
        <!-- 骨架屏加载状态 -->
        <div v-if="loading" class="project-list">
          <div class="list-item" v-for="i in 8" :key="'skeleton-'+i" style="border: none; background: transparent; padding: 16px 20px;">
            <el-skeleton :rows="0" animated>
              <template #template>
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <div style="display: flex; align-items: center; gap: 12px; width: 60%;">
                    <el-skeleton-item variant="circle" style="width: 16px; height: 16px;" />
                    <el-skeleton-item variant="circle" style="width: 8px; height: 8px;" />
                    <el-skeleton-item variant="text" style="width: 40%; height: 16px;" />
                    <el-skeleton-item variant="text" style="width: 20%; height: 12px; margin-left: auto;" />
                  </div>
                  <div style="display: flex; gap: 16px; width: 30%; justify-content: flex-end;">
                    <el-skeleton-item variant="text" style="width: 40px;" />
                    <el-skeleton-item variant="button" style="width: 60px; height: 24px; border-radius: 12px;" />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-else-if="projects.length === 0" class="empty-state">
          <div style="width: 120px; height: 120px; background: rgba(0,0,0,0.02); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            <el-icon style="font-size: 48px; color: #1D1D1F;"><FolderOpened /></el-icon>
          </div>
          <h3 style="font-size: 18px; font-weight: 600; color: #1D1D1F; margin-bottom: 8px;">
            {{ currentFilter === 'archived' ? '没有已归档的文档' : '还没有创建任何项目' }}
          </h3>
          <p style="color: rgba(0,0,0,0.5); font-size: 14px; margin-bottom: 24px; max-width: 300px;">
            {{ currentFilter === 'archived' ? '归档的项目会显示在这里，您可以随时恢复。' : '现在就开始您的第一次排版吧，所有修改将自动保存至云端。' }}
          </p>
          <button v-if="currentFilter !== 'archived'" class="action-btn create-btn" style="padding: 10px 24px; font-size: 14px;" @click="handleCreate">
            <el-icon style="margin-right: 6px;"><Plus /></el-icon> 立即创建项目
          </button>
        </div>

        <!-- 项目列表 -->
        <div v-else class="project-list">
          <div 
            class="list-item" 
            v-for="project in projects" 
            :key="project.id" 
            :class="{ selected: selectedIds.has(project.id) }"
            @click="handleProjectClick(project)"
          >
            <div class="item-left">
              <input 
                type="checkbox" 
                class="item-checkbox" 
                :checked="selectedIds.has(project.id)" 
                @click.stop="toggleSelect(project.id)" 
              />
              <div class="status-dot" :class="project.status || 'draft'"></div>
              <span class="item-title">{{ project.title || '无标题文档' }}</span>
              <span class="item-desc">{{ formatDate(project.updated_at) }}</span>
            </div>
            <div class="item-right">
              <span class="item-words">{{ project.word_count || 0 }} 字</span>
              <div class="status-capsule" :class="project.status || 'draft'">{{ getStatusText(project.status || 'draft') }}</div>
              <button class="more-btn" @click.stop="handleDelete(project)">
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </div>
        </div>

        <div v-if="total > pageSize" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="fetchProjects"
          />
        </div>
      </div>
    </main>

    <el-dialog v-model="showDeleteDialog" :title="batchDeleteMode ? '批量删除' : '确认删除'" width="400px">
      <p v-if="batchDeleteMode">确定要删除选中的 {{ selectedIds.size }} 个项目吗？此操作不可恢复。</p>
      <p v-else>确定要删除「{{ projectToDelete?.title }}」吗？此操作不可恢复。</p>
      <template #footer>
        <el-button @click="showDeleteDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search, Document, FolderOpened, Delete } from '@element-plus/icons-vue';
import http from '@/utils/http';

interface Project {
  id: string;
  title: string;
  content: string;
  summary: string;
  cover_image: string;
  status: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

const router = useRouter();

const projects = ref<Project[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const currentFilter = ref('all');

// 批量选择
const selectedIds = ref<Set<string>>(new Set());
const batchDeleteMode = ref(false);

const showDeleteDialog = ref(false);
const projectToDelete = ref<Project | null>(null);

// 根据筛选条件显示不同标题
const filterTitle = computed(() => {
  const map: Record<string, string> = { all: '全部项目', recent: '最近使用', archived: '已归档' };
  return map[currentFilter.value] || '全部项目';
});

onMounted(() => {
  fetchProjects();
});

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchProjects();
  }, 300);
}

async function fetchProjects() {
  loading.value = true;
  selectedIds.value = new Set();
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    
    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // 根据侧栏筛选传 status
    if (currentFilter.value === 'archived') {
      params.status = 'archived';
    }

    const response = await http.get<any>('/collab/documents', { params });
    
    if (response.success) {
      let list = response.data.list;
      // 最近使用：按 updated_at 排序取前 10
      if (currentFilter.value === 'recent') {
        list = list.slice(0, 10);
      }
      projects.value = list;
      total.value = currentFilter.value === 'recent' ? list.length : response.data.total;
    }
  } catch (error) {
    console.error('获取项目列表失败:', error);
    ElMessage.error('获取项目列表失败');
  } finally {
    loading.value = false;
  }
}

function setFilter(filter: string) {
  currentFilter.value = filter;
  currentPage.value = 1;
  searchQuery.value = '';
  fetchProjects();
}

function handleSearch() {
  currentPage.value = 1;
  fetchProjects();
}

function toggleSelect(id: string) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selectedIds.value = s;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  // 如果是今天内，显示 "x 小时前" 或 "x 分钟前"
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 7 * 86400 * 1000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function handleProjectClick(project: Project) {
  router.push(`/editor/${project.id}`);
}

function handleCreate() {
  router.push('/editor');
}

function handleDelete(project: Project) {
  batchDeleteMode.value = false;
  projectToDelete.value = project;
  showDeleteDialog.value = true;
}

function handleBatchDelete() {
  batchDeleteMode.value = true;
  showDeleteDialog.value = true;
}

async function confirmDelete() {
  try {
    if (batchDeleteMode.value) {
      // 批量删除
      const ids = Array.from(selectedIds.value);
      await Promise.all(ids.map(id => http.delete<any>(`/collab/documents/${id}`)));
      ElMessage.success(`成功删除 ${ids.length} 个项目`);
      selectedIds.value = new Set();
    } else if (projectToDelete.value) {
      await http.delete<any>(`/collab/documents/${projectToDelete.value.id}`);
      ElMessage.success('删除成功');
    }
    showDeleteDialog.value = false;
    projectToDelete.value = null;
    batchDeleteMode.value = false;
    fetchProjects();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.projects-layout {
  display: flex;
  height: calc(100vh - $nav-offset);
  width: 100%;
  background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: $block-gap $page-padding $page-padding;
  gap: $block-gap;
  box-sizing: border-box;
  overflow: hidden;
}

/* 左侧卡片 */
.sidebar-card {
  width: 280px;
  background: $brand-yellow;
  border-radius: $block-radius-lg;
  display: flex;
  flex-direction: column;
  padding: $space-lg;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  
  .brand {
    margin-bottom: $space-xl;
    h2 {
      font-size: 1.1rem;
      font-weight: 800;
      color: $layout-sider-dark;
      margin: 0;
    }
  }

  .nav-menu {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      color: $layout-sider-dark;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background-color: rgba(255,255,255,0.4);
      }
      
      &.active {
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      &.text-muted {
        color: rgba(0,0,0,0.5);
      }
    }
  }

  .sidebar-bottom {
    margin-top: auto;
    
    .new-project-btn {
      width: 100%;
      padding: 12px 16px;
      border-radius: 999px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background-color: #FFD60A;
      color: $layout-sider-dark;
      font-weight: 800;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: all $transition-fast;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 214, 10, 0.3);
      }
    }
  }
}

/* 右侧主内容卡片 */
.main-card {
  flex: 1;
  background-color: #ffffff;
  border-radius: $block-radius-lg;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-xl;
    
    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: $layout-sider-dark;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .search-box {
        display: flex;
        align-items: center;
        background: #f6f7f8;
        border-radius: 999px;
        padding: 6px 16px;
        width: 240px;
        transition: all 0.2s;
        border: 1px solid transparent;

        &:focus-within {
          background: #fff;
          border-color: rgba(0,0,0,0.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .search-icon {
          color: rgba(0,0,0,0.4);
          margin-right: 8px;
        }
        
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          color: $layout-sider-dark;
          outline: none;
          &::placeholder { color: rgba(0,0,0,0.3); }
        }
      }
      
      .action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all $transition-fast;
        
        &.delete-btn {
          background: #fef2f2;
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444;
          &:hover { background: #fee2e2; }
        }
        
        &.create-btn {
          background: #FFD60A;
          border: 1px solid rgba(0,0,0,0.1);
          color: $layout-sider-dark;
          &:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(255, 214, 10, 0.2); }
        }
      }
    }
  }

  .list-container {
    flex: 1;
    overflow-y: auto;
    
    .empty-state {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(0,0,0,0.3);
      
      .el-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      p { font-weight: 600; }
    }
    
    .project-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .list-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-radius: 10px;
        background: transparent;
        transition: background 0.15s;
        cursor: pointer;
        
        &:hover {
          background: #f6f7f8;
          .item-checkbox { opacity: 1; }
        }

        &.selected {
          background: rgba(255,214,10,0.08);
          .item-checkbox { opacity: 1; }
        }

        .item-checkbox {
          width: 16px;
          height: 16px;
          accent-color: $brand-yellow;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        
        .item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
            &.published { background: #10b981; }
            &.draft { background: #d1d5db; }
            &.archived { background: #f59e0b; }
          }
          
          .item-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: $layout-sider-dark;
            min-width: 200px;
          }
          
          .item-desc {
            font-size: 0.8rem;
            color: rgba(0,0,0,0.35);
            margin-left: 8px;
          }
        }
        
        .item-right {
          display: flex;
          align-items: center;
          gap: 16px;

          .item-words {
            font-size: 0.75rem;
            color: rgba(0,0,0,0.3);
            font-weight: 500;
            white-space: nowrap;
          }
          
          .status-capsule {
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            
            &.published {
              background: #ecfdf5;
              color: #10b981;
              border: 1px solid rgba(16, 185, 129, 0.2);
            }
            &.draft {
              background: #f3f4f6;
              color: #6b7280;
              border: 1px solid rgba(107, 114, 128, 0.2);
            }
            &.archived {
              background: #fef2f2;
              color: #ef4444;
              border: 1px solid rgba(239, 68, 68, 0.2);
            }
          }
          
          .more-btn {
            background: transparent;
            border: none;
            color: rgba(0,0,0,0.25);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
            
            &:hover {
              color: #ef4444;
              background: rgba(239,68,68,0.06);
            }
          }
        }
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid rgba(0,0,0,0.05);
  }
}

/* ===== 响应式适配 ===== */
@media (max-width: 1024px) {
  .sidebar-card {
    width: 200px;
    padding: 16px;
  }
  .main-card {
    padding: 20px 20px;
    .page-header .header-actions .search-box {
      width: 160px;
    }
  }
}

@media (max-width: 768px) {
  /* 小屏隐藏侧边栏，GlobalNav 已提供页面导航 */
  .sidebar-card {
    display: none;
  }
  .main-card {
    border-radius: 12px;
    padding: 16px;

    .page-header {
      .header-actions {
        .search-box { width: 140px; }
        .action-btn span { display: none; }
      }
    }
  }
}
</style>
