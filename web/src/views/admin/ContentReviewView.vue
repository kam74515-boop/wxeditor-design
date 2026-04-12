<template>
  <!-- 管理后台 — 内容管理（模板 + 素材） -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">内容管理</h1>
      <div style="display: flex; gap: 8px;">
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': tab === 'templates' }]" @click="tab = 'templates'">模板管理</button>
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': tab === 'materials' }]" @click="tab = 'materials'">素材 / SVG</button>
        <button :class="['pricing-toggle__option', { 'pricing-toggle__option--active': tab === 'articles' }]" @click="tab = 'articles'">文章审核</button>
      </div>
    </div>

    <!-- ==================== 模板管理 ==================== -->
    <template v-if="tab === 'templates'">
      <div class="admin-main__desc" style="display: flex; justify-content: space-between; align-items: center;">
        <span>管理主站对外展示的公开模板，用户可在模板库中浏览和使用。共 {{ tplTotal }} 个模板</span>
        <el-button type="primary" size="small" @click="openTplDialog()">+ 新增模板</el-button>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div class="search-bar" style="width: 240px;">
          <el-icon><Search /></el-icon>
          <input v-model="tplSearch" placeholder="搜索模板..." @input="debouncedTplSearch" />
        </div>
        <el-select v-model="tplCategory" placeholder="全部分类" clearable size="small" style="width: 140px;" @change="fetchTemplates">
          <el-option label="全部" value="" />
          <el-option v-for="cat in categories" :key="cat.category" :label="`${cat.category} (${cat.count})`" :value="cat.category" />
        </el-select>
      </div>

      <table class="admin-table" v-loading="tplLoading">
        <thead>
          <tr>
            <th>模板名称</th>
            <th>分类</th>
            <th>使用次数</th>
            <th>公开</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tpl in templates" :key="tpl.id">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div v-if="tpl.preview_image" style="width: 40px; height: 30px; border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                  <img :src="tpl.preview_image" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div v-else style="width: 40px; height: 30px; border-radius: 4px; background: #F0F3F8; flex-shrink: 0;" />
                <span style="font-weight: 600;">{{ tpl.name }}</span>
              </div>
            </td>
            <td><span class="role-tag">{{ tpl.category || '通用' }}</span></td>
            <td style="color: rgba(0,0,0,0.5);">{{ tpl.use_count || 0 }}</td>
            <td>
              <span :style="{ color: tpl.is_public ? '#10B981' : 'rgba(0,0,0,0.3)' }">
                {{ tpl.is_public ? '● 公开' : '● 私有' }}
              </span>
            </td>
            <td style="color: rgba(0,0,0,0.4); font-size: 13px;">{{ formatDate(tpl.created_at) }}</td>
            <td>
              <div style="display: flex; gap: 6px;">
                <el-button size="small" text @click="openTplDialog(tpl)">编辑</el-button>
                <el-button size="small" text type="danger" @click="handleDeleteTpl(tpl)">删除</el-button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!tplLoading && templates.length === 0" style="text-align: center; padding: 60px; color: rgba(0,0,0,0.3);">
        暂无模板，点击右上角「新增模板」开始创建
      </div>

      <div v-if="tplTotal > tplPageSize" style="display: flex; justify-content: center; margin-top: 20px;">
        <el-pagination v-model:current-page="tplPage" :page-size="tplPageSize" :total="tplTotal" layout="prev, pager, next" @current-change="fetchTemplates" />
      </div>
    </template>

    <!-- ==================== 素材 / SVG 管理 ==================== -->
    <template v-if="tab === 'materials'">
      <div class="admin-main__desc" style="display: flex; justify-content: space-between; align-items: center;">
        <span>管理上传的 SVG 动画、图片、视频等素材资源。共 {{ matTotal }} 个素材</span>
        <div style="display: flex; gap: 8px;">
          <label class="el-button el-button--primary el-button--small" style="cursor: pointer;">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" style="vertical-align:-2px;margin-right:3px;"><path d="M2 4a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"/></svg> 上传素材
            <input type="file" hidden multiple accept="image/*,video/*,.svg" @change="handleUploadMaterial" />
          </label>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div class="search-bar" style="width: 240px;">
          <el-icon><Search /></el-icon>
          <input v-model="matSearch" placeholder="搜索素材..." @input="debouncedMatSearch" />
        </div>
        <el-select v-model="matType" placeholder="全部类型" clearable size="small" style="width: 140px;" @change="fetchMaterials">
          <el-option label="全部" value="" />
          <el-option label="图片" value="image" />
          <el-option label="视频" value="video" />
          <el-option label="SVG" value="svg" />
        </el-select>
      </div>

      <!-- 素材网格展示 -->
      <div v-loading="matLoading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
        <div v-for="mat in materials" :key="mat.id" class="card" style="padding: 0; overflow: hidden; cursor: pointer; position: relative;" @click="previewMaterial(mat)">
          <div style="width: 100%; height: 120px; background: #F0F3F8; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img v-if="mat.file_type === 'image' || mat.mime_type === 'image/svg+xml'" :src="mat.url" style="width: 100%; height: 100%; object-fit: cover;" />
          <span v-else style="font-size: 2rem; color: rgba(0,0,0,0.25);">
              <svg v-if="mat.file_type === 'video'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            </span>
          </div>
          <div style="padding: 8px 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #1D1D1F; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ mat.original_name }}
            </div>
            <div style="font-size: 11px; color: rgba(0,0,0,0.35); margin-top: 2px;">
              {{ formatSize(mat.file_size) }} · {{ mat.file_type }}
            </div>
          </div>
          <!-- 删除按钮 -->
          <button
            style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;"
            class="mat-delete-btn"
            @click.stop="handleDeleteMat(mat)"
          ><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      </div>

      <div v-if="!matLoading && materials.length === 0" style="text-align: center; padding: 60px; color: rgba(0,0,0,0.3);">
        暂无素材，点击「上传素材」开始添加 SVG 动画、图片等资源
      </div>

      <div v-if="matTotal > matPageSize" style="display: flex; justify-content: center; margin-top: 20px;">
        <el-pagination v-model:current-page="matPage" :page-size="matPageSize" :total="matTotal" layout="prev, pager, next" @current-change="fetchMaterials" />
      </div>
    </template>

    <!-- ==================== 文章审核 ==================== -->
    <template v-if="tab === 'articles'">
      <p class="admin-main__desc">审核用户发布的文章内容，确保合规。</p>
      <div style="display: flex; flex-direction: column; gap: 12px;" v-loading="artLoading">
        <div v-for="article in articles" :key="article.id" class="card" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div class="card__title">{{ article.title || '无标题' }}</div>
            <div class="card__desc" style="margin-top: 4px;">{{ article.author?.username || '未知' }} · {{ formatDate(article.createdAt || article.created_at) }}</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <span :style="{ fontSize: '12px', fontWeight: 600, color: article.status === 'published' ? '#10B981' : article.status === 'draft' ? '#F59E0B' : '#6B7280' }">
              {{ article.status === 'published' ? '已发布' : article.status === 'draft' ? '草稿' : article.status }}
            </span>
          </div>
        </div>
        <div v-if="!artLoading && articles.length === 0" style="text-align: center; padding: 40px; color: rgba(0,0,0,0.3);">
          暂无文章
        </div>
      </div>
    </template>

    <!-- ==================== 模板编辑弹窗 ==================== -->
    <el-dialog v-model="showTplDialog" :title="editingTpl ? '编辑模板' : '新增模板'" width="600px" @close="resetTplForm">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">模板名称 *</label>
          <el-input v-model="tplForm.name" placeholder="输入模板名称" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">描述</label>
          <el-input v-model="tplForm.description" type="textarea" :rows="2" placeholder="简短描述模板用途" />
        </div>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">分类</label>
            <el-input v-model="tplForm.category" placeholder="如：营销推广、技术文档" />
          </div>
          <div style="flex: 1;">
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">预览图 URL</label>
            <el-input v-model="tplForm.previewImage" placeholder="https://..." />
          </div>
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">模板内容（HTML）*</label>
          <el-input v-model="tplForm.content" type="textarea" :rows="6" placeholder="粘贴模板 HTML 内容..." />
        </div>
        <div>
          <el-checkbox v-model="tplForm.isPublic">公开（对所有用户可见）</el-checkbox>
        </div>
      </div>
      <template #footer>
        <el-button @click="showTplDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTpl" :loading="tplSaving">{{ editingTpl ? '保存修改' : '创建模板' }}</el-button>
      </template>
    </el-dialog>

    <!-- 素材预览弹窗 -->
    <el-dialog v-model="showMatPreview" title="素材预览" width="600px">
      <div v-if="previewMat" style="text-align: center;">
        <img v-if="previewMat.file_type === 'image' || previewMat.mime_type === 'image/svg+xml'" :src="previewMat.url" style="max-width: 100%; max-height: 400px; border-radius: 8px;" />
        <video v-else-if="previewMat.file_type === 'video'" :src="previewMat.url" controls style="max-width: 100%; border-radius: 8px;" />
        <p style="margin-top: 12px; font-size: 13px; color: rgba(0,0,0,0.5);">
          {{ previewMat.original_name }} · {{ formatSize(previewMat.file_size) }} · {{ previewMat.mime_type }}
        </p>
        <p style="font-size: 12px; color: rgba(0,0,0,0.3);">
          URL: <code style="user-select: all; background: #f5f5f5; padding: 2px 6px; border-radius: 4px;">{{ previewMat.url }}</code>
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import http from '@/utils/http';

// ====== TAB ======
const tab = ref('templates');

// ====== 模板相关 ======
const templates = ref<any[]>([]);
const tplLoading = ref(false);
const tplSearch = ref('');
const tplCategory = ref('');
const tplPage = ref(1);
const tplPageSize = ref(20);
const tplTotal = ref(0);
const categories = ref<any[]>([]);

const showTplDialog = ref(false);
const editingTpl = ref<any>(null);
const tplSaving = ref(false);
const tplForm = ref({
  name: '',
  description: '',
  category: '通用',
  content: '',
  previewImage: '',
  isPublic: true,
});

// ====== 素材相关 ======
const materials = ref<any[]>([]);
const matLoading = ref(false);
const matSearch = ref('');
const matType = ref('');
const matPage = ref(1);
const matPageSize = ref(30);
const matTotal = ref(0);
const showMatPreview = ref(false);
const previewMat = ref<any>(null);

// ====== 文章审核 ======
const articles = ref<any[]>([]);
const artLoading = ref(false);

onMounted(() => {
  fetchTemplates();
  fetchCategories();
  fetchMaterials();
  fetchArticles();
});

// ====== 模板 API ======
let tplTimer: ReturnType<typeof setTimeout>;
function debouncedTplSearch() {
  clearTimeout(tplTimer);
  tplTimer = setTimeout(() => { tplPage.value = 1; fetchTemplates(); }, 300);
}

async function fetchTemplates() {
  tplLoading.value = true;
  try {
    const params: any = { page: tplPage.value, limit: tplPageSize.value };
    if (tplSearch.value) params.search = tplSearch.value;
    if (tplCategory.value) params.category = tplCategory.value;
    const res: any = await http.get('/templates', { params });
    if (res.success) {
      templates.value = res.data.list;
      tplTotal.value = res.data.total;
    }
  } catch { /* 静默 */ } finally {
    tplLoading.value = false;
  }
}

async function fetchCategories() {
  try {
    const res: any = await http.get('/templates/categories');
    if (res.success) categories.value = res.data;
  } catch { /* 静默 */ }
}

function openTplDialog(tpl?: any) {
  if (tpl) {
    editingTpl.value = tpl;
    tplForm.value = {
      name: tpl.name,
      description: tpl.description || '',
      category: tpl.category || '通用',
      content: tpl.content || '',
      previewImage: tpl.preview_image || '',
      isPublic: !!tpl.is_public,
    };
  } else {
    editingTpl.value = null;
    resetTplForm();
  }
  showTplDialog.value = true;
}

function resetTplForm() {
  tplForm.value = { name: '', description: '', category: '通用', content: '', previewImage: '', isPublic: true };
  editingTpl.value = null;
}

async function saveTpl() {
  if (!tplForm.value.name || !tplForm.value.content) {
    ElMessage.warning('请填写模板名称和内容');
    return;
  }
  tplSaving.value = true;
  try {
    const payload = {
      name: tplForm.value.name,
      description: tplForm.value.description,
      category: tplForm.value.category,
      content: tplForm.value.content,
      previewImage: tplForm.value.previewImage,
      isPublic: tplForm.value.isPublic,
    };
    if (editingTpl.value) {
      await http.put(`/templates/${editingTpl.value.id}`, payload);
      ElMessage.success('模板已更新');
    } else {
      await http.post('/templates', payload);
      ElMessage.success('模板已创建');
    }
    showTplDialog.value = false;
    resetTplForm();
    fetchTemplates();
    fetchCategories();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    tplSaving.value = false;
  }
}

async function handleDeleteTpl(tpl: any) {
  try {
    await ElMessageBox.confirm(`确定要删除模板「${tpl.name}」吗？`, '确认删除', { type: 'warning' });
    await http.delete(`/templates/${tpl.id}`);
    ElMessage.success('模板已删除');
    fetchTemplates();
  } catch { /* 取消 */ }
}

// ====== 素材 API ======
let matTimer: ReturnType<typeof setTimeout>;
function debouncedMatSearch() {
  clearTimeout(matTimer);
  matTimer = setTimeout(() => { matPage.value = 1; fetchMaterials(); }, 300);
}

async function fetchMaterials() {
  matLoading.value = true;
  try {
    const params: any = { page: matPage.value, limit: matPageSize.value };
    if (matSearch.value) params.search = matSearch.value;
    if (matType.value) params.type = matType.value;
    const res: any = await http.get('/materials', { params });
    if (res.success) {
      materials.value = res.data.list;
      matTotal.value = res.data.total;
    }
  } catch { /* 静默 */ } finally {
    matLoading.value = false;
  }
}

async function handleUploadMaterial(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  
  const formData = new FormData();
  if (input.files.length === 1) {
    formData.append('file', input.files[0]);
    formData.append('isPublic', '1');
    try {
      await http.upload('/materials/upload', formData);
      ElMessage.success('上传成功');
      fetchMaterials();
    } catch {
      ElMessage.error('上传失败');
    }
  } else {
    for (const f of input.files) {
      formData.append('files', f);
    }
    formData.append('isPublic', '1');
    try {
      await http.upload('/materials/upload-batch', formData);
      ElMessage.success(`上传成功 ${input.files.length} 个文件`);
      fetchMaterials();
    } catch {
      ElMessage.error('上传失败');
    }
  }
  // 重置 input
  input.value = '';
}

function previewMaterial(mat: any) {
  previewMat.value = mat;
  showMatPreview.value = true;
}

async function handleDeleteMat(mat: any) {
  try {
    await ElMessageBox.confirm(`确定要删除素材「${mat.original_name}」吗？`, '确认删除', { type: 'warning' });
    await http.delete(`/materials/${mat.id}`);
    ElMessage.success('素材已删除');
    fetchMaterials();
  } catch { /* 取消 */ }
}

// ====== 文章审核 API ======
async function fetchArticles() {
  artLoading.value = true;
  try {
    const res: any = await http.get('/admin/documents', { params: { page: 1, limit: 20 } });
    if (res.success) {
      articles.value = res.data.list;
    }
  } catch { /* 静默 */ } finally {
    artLoading.value = false;
  }
}

// ====== 工具函数 ======
function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
</script>

<style scoped>
/* 素材卡片悬浮显示删除按钮 */
.card:hover .mat-delete-btn {
  opacity: 1 !important;
}
</style>
