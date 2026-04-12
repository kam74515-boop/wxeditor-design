<template>
  <div class="projects-layout">
    <!-- 左侧品牌黄导览栏 -->
    <aside class="sidebar-card">
      <div class="brand">
        <h2>模版管理</h2>
      </div>
      <nav class="nav-menu">
        <div class="nav-item">
          <el-icon><FolderOpened /></el-icon> <span @click="$router.push('/projects')">全部项目</span>
        </div>
        <div class="nav-item active">
          <el-icon><CopyDocument /></el-icon> <span>模板中心</span>
        </div>
        <div class="nav-item text-muted">
          <el-icon><Document /></el-icon> <span>我的资产</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon> <span>创建私有模板</span>
        </button>
      </div>
    </aside>

    <!-- 右侧容器版块 -->
    <main class="main-card">
      <header class="page-header">
        <h2 class="page-title">官方模板库</h2>
        <div class="header-actions">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input 
              v-model="searchQuery" 
              placeholder="搜索优质排版模板..." 
              class="search-input" 
              @input="handleSearch"
            />
          </div>
          <div class="category-filter">
             <el-select v-model="selectedCategory" placeholder="全部场景分类" clearable @change="fetchTemplates" class="custom-select">
                <el-option label="所有分类" value="" />
                <el-option v-for="cat in categories" :key="cat.category" :label="cat.category" :value="cat.category">
                  {{ cat.category }} ({{ cat.count }})
                </el-option>
             </el-select>
          </div>
        </div>
      </header>

      <div class="list-container">
        <!-- 骨架屏网格 -->
        <div v-if="loading" class="templates-grid">
          <div class="template-card" v-for="i in 8" :key="'skeleton-'+i" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="image" style="width: 100%; height: 160px; border-radius: 8px 8px 0 0;" />
                <div style="padding: 16px;">
                  <el-skeleton-item variant="h3" style="width: 60%; margin-bottom: 12px;" />
                  <el-skeleton-item variant="text" style="width: 100%; margin-bottom: 6px;" />
                  <el-skeleton-item variant="text" style="width: 80%; margin-bottom: 20px;" />
                  <div style="display: flex; justify-content: space-between;">
                    <el-skeleton-item variant="text" style="width: 40px; height: 20px; border-radius: 4px;" />
                    <el-skeleton-item variant="text" style="width: 30px; height: 16px;" />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-else-if="templates.length === 0" class="empty-state" style="padding: 60px 0;">
           <div style="width: 120px; height: 120px; background: rgba(0,0,0,0.02); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
             <el-icon style="font-size: 48px; color: #1D1D1F;"><Brush /></el-icon>
           </div>
           <h3 style="font-size: 18px; font-weight: 600; color: #1D1D1F; margin-bottom: 8px;">没有找到相关的模板</h3>
           <p style="color: rgba(0,0,0,0.5); font-size: 14px; margin-bottom: 24px;">没有任何模板匹配您当前的搜索或筛选条件，请尝试换个词拉取。</p>
           <button class="action-btn" style="padding: 8px 20px; border-radius: 6px; border: 1px solid #E5E5EA; background: #fff; cursor: pointer; font-weight: 500;" @click="handleClearSearch">
             清除所有筛选
           </button>
        </div>

        <div v-else class="templates-grid">
           <!-- 每个模板被定义为包含圆角与悬浮反馈的大卡片 -->
           <div class="template-card" v-for="template in templates" :key="template.id" @click="handlePreview(template)">
              <div class="card-cover">
                <img v-if="template.preview_image" :src="template.preview_image" alt="" />
                <div v-else class="cover-placeholder">
                  <el-icon><PictureFilled /></el-icon>
                </div>
                <div class="card-overlay">
                  <button class="use-btn" @click.stop="handleUseTemplate(template)">获取此模板</button>
                </div>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ template.name }}</h3>
                <p class="card-desc">{{ template.description || '官方精美模板，适配微信等多种文章平台...' }}</p>
                <div class="card-meta">
                  <span class="category-tag">{{ template.category || '通用' }}</span>
                  <span class="use-count"><el-icon><Pointer /></el-icon> {{ template.use_count || 0 }}</span>
                </div>
              </div>
           </div>
        </div>

        <div v-if="total > pageSize" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="fetchTemplates"
          />
        </div>
      </div>
    </main>

    <!-- 弹窗：创建模板 -->
    <el-dialog v-model="showCreateDialog" title="创建通用模板" width="500px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="模板名称">
          <el-input v-model="createForm.name" placeholder="为这段排版起个简短的名字" />
        </el-form-item>
        <el-form-item label="所属分类">
          <el-select v-model="createForm.category" placeholder="按场景归类" style="width: 100%">
            <el-option label="通用" value="general" />
            <el-option label="新闻资讯" value="news" />
            <el-option label="产品发布" value="product" />
            <el-option label="活动推广" value="activity" />
            <el-option label="内部通讯" value="tutorial" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述简介">
          <el-input v-model="createForm.description" type="textarea" rows="3" placeholder="适用范围的说明，方便未来查找" />
        </el-form-item>
        <el-form-item label="发布大厅">
          <el-switch v-model="createForm.isPublic" active-text="允许其他用户拷贝" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">退出</el-button>
        <el-button type="primary" color="#1D1D1F" style="border: none" @click="handleCreateTemplate">提交模板</el-button>
      </template>
    </el-dialog>

    <!-- 弹窗：模板预览 -->
    <el-dialog v-model="showPreviewDialog" :title="previewTemplate?.name || '模板详情'" width="800px" custom-class="preview-dialog">
      <div v-if="previewTemplate" class="preview-layout">
        <div class="preview-header">
          <p class="preview-desc">{{ previewTemplate.description || '无补充描述信息' }}</p>
        </div>
        <div class="preview-html-wrapper">
          <div class="preview-html" v-html="previewTemplate.content"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreviewDialog = false">关闭预览</el-button>
        <el-button type="primary" color="#FFD60A" style="color: #000; border: none; font-weight: bold;" @click="handleUseTemplate(previewTemplate!)">应用到新文章</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { 
  FolderOpened, CopyDocument, Document, Plus, 
  Search, Brush, PictureFilled, Pointer 
} from '@element-plus/icons-vue';
import http from '@/utils/http';
import { useEditorStore } from '@/stores';

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  content: string;
  preview_image: string;
  tags: string;
  use_count: number;
  is_public: number;
  created_at: string;
}

const router = useRouter();
const editorStore = useEditorStore();

const templates = ref<Template[]>([]);
const categories = ref<{ category: string; count: number }[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('');
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);

const showCreateDialog = ref(false);
const showPreviewDialog = ref(false);
const previewTemplate = ref<Template | null>(null);

const createForm = ref({
  name: '',
  description: '',
  category: 'general',
  content: '',
  isPublic: false
});

async function fetchTemplates() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString(),
      // isPublic: '1' // 移除写死的 public 限制以便在缺数据时全拉起
    });
    
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (selectedCategory.value) params.append('category', selectedCategory.value);

    const res = await http.get<any>(`/templates?${params}`);
    if (res.success) {
      templates.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error('获取模板失败:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  try {
    const res = await http.get<any>('/templates/categories');
    if (res.success && res.data) {
      categories.value = res.data;
    }
  } catch (error) {
    console.error('获取分类失败:', error);
  }
}

let searchTimeout: ReturnType<typeof setTimeout>;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchTemplates();
  }, 300);
}

function handlePreview(template: Template) {
  previewTemplate.value = template;
  showPreviewDialog.value = true;
}

async function handleUseTemplate(template: Template) {
  try {
    // 增加后端的使用计数逻辑
    await http.post(`/templates/${template.id}/use`);
    
    editorStore.setContent(template.content);
    editorStore.setTitle(`副本：「${template.name}」`);
    
    showPreviewDialog.value = false;
    router.push('/editor');
    ElMessage.success('模板载入成功');
  } catch (error) {
    ElMessage.error('应用模板通讯失败');
  }
}

async function handleCreateTemplate() {
  if (!createForm.value.name) {
    ElMessage.warning('请输入一段模板名称标识');
    return;
  }

  // 默认提取 Editor Store 内部积压的最新内容，如果空内容给提示
  createForm.value.content = editorStore.article?.content || '<p>这是一段全新的排版模板。请通过插入SVG和表格模块搭建骨架。</p>';

  try {
    const res = await http.post<any>('/templates', createForm.value);
    if (res.success) {
      ElMessage.success('私人模板入库成功');
      showCreateDialog.value = false;
      fetchTemplates();
    }
  } catch (error) {
    ElMessage.error('创建失败，服务端拒绝通讯');
  }
}

onMounted(() => {
  fetchTemplates();
  fetchCategories();
});
function handleClearSearch() {
  searchQuery.value = '';
  selectedCategory.value = '';
  currentPage.value = 1;
  fetchTemplates();
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

/* 左侧卡片 完全镜像自 ProjectsView 的菜单结构 */
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
      background-color: #ffffff; /* 模板由于属于偏应用区域，按钮用纯白辅色 */
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
        width: 280px;
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
      
      .category-filter {
        /* 对 Element Plus el-select 样式弱化，使其融入头部 */
        :deep(.el-input__wrapper) {
          background: #f6f7f8;
          border-radius: 999px;
          box-shadow: none;
          padding: 2px 16px;
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
    
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 20px;
      padding-bottom: 40px;
      
      .template-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06);
          border-color: transparent;
          
          .card-overlay {
            opacity: 1;
          }
        }
        
        .card-cover {
          height: 160px;
          background: #f8f9fa;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .cover-placeholder {
            color: rgba(0,0,0,0.1);
            font-size: 48px;
          }
          
          .card-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            
            .use-btn {
              padding: 8px 18px;
              border-radius: 999px;
              background: #FFD60A;
              border: none;
              color: $layout-sider-dark;
              font-weight: 800;
              font-size: 0.9rem;
              cursor: pointer;
              transform: translateY(10px);
              transition: transform 0.2s;
            }
          }
        }
        
        &:hover .card-overlay .use-btn {
          transform: translateY(0);
        }
        
        .card-body {
          padding: 14px 16px;
          
          .card-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: $layout-sider-dark;
            margin: 0 0 6px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .card-desc {
            font-size: 0.8rem;
            color: rgba(0,0,0,0.5);
            margin: 0 0 12px 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.4;
            height: 2.8em;
          }
          
          .card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            
            .category-tag {
              padding: 2px 8px;
              background: rgba(0,0,0,0.04);
              color: rgba(0,0,0,0.6);
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: 600;
            }
            
            .use-count {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 0.75rem;
              color: rgba(0,0,0,0.4);
              font-weight: 500;
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

/* 预览弹窗内部优化 */
.preview-layout {
  .preview-header {
    margin-bottom: 20px;
    .preview-desc { font-size: 0.9rem; color: rgba(0,0,0,0.6); line-height: 1.6; }
  }
  .preview-html-wrapper {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 24px;
    max-height: 50vh;
    overflow-y: auto;
    border: 1px solid rgba(0,0,0,0.05);
    display: flex;
    justify-content: center;

    /* 将模拟白纸放在正中间 */
    .preview-html {
      width: 100%;
      max-width: 420px; /* 模拟手机端阅读 */
      background: #fff;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
  }
}

/* ===== 响应式适配 ===== */
@media (max-width: 1024px) {
  .sidebar-card { width: 200px; padding: 16px; }
  .main-card .list-container .templates-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .sidebar-card { display: none; }
  .main-card {
    padding: 16px;
    .page-header {
      .header-actions {
        .search-box { width: 140px; }
      }
    }
    .list-container .templates-grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
  }
}
</style>
