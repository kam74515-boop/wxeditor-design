<template>
  <WorkspaceLayout :menu-items="workspaceMenuItems">
    <template #sidebar-header>
      <h2 class="workspace-layout__sidebar-title">工作区</h2>
    </template>

    <template #sidebar-footer>
      <button class="workspace-layout__sidebar-action" @click="triggerUpload">
        <el-icon><Upload /></el-icon>
        <span>上传素材</span>
      </button>
    </template>

    <div class="materials-view">
      <header class="page-header">
        <h2 class="page-title">我的素材库</h2>
        <div class="header-actions">
          <div class="search-box">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchQuery"
              placeholder="搜索素材名称..."
              class="search-input"
              @input="handleSearch"
            />
          </div>
          <div class="category-filter">
            <el-select v-model="selectedType" placeholder="素材类型" clearable @change="fetchMaterials" class="custom-select">
              <el-option label="全部类型" value="" />
              <el-option v-for="t in materialTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </div>
          <button class="upload-header-btn" @click="triggerUpload">
            <el-icon><Upload /></el-icon> 上传
          </button>
        </div>
      </header>

      <!-- 隐藏文件上传 -->
      <input ref="fileInputRef" type="file" accept="image/*,video/*,.pdf,.doc,.docx,.svg,.gif" multiple hidden @change="handleFileUpload" />

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="uploadProgress" :format="() => `${uploadProgress}%`" />
        <span class="upload-filename">{{ uploadingFile }}</span>
      </div>

      <div class="list-container">
        <!-- 加载骨架屏 -->
        <div v-if="loading" class="materials-grid">
          <div class="material-card" v-for="i in 8" :key="'skeleton-'+i">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="image" style="width: 100%; height: 140px; border-radius: 8px 8px 0 0;" />
                <div style="padding: 12px;">
                  <el-skeleton-item variant="text" style="width: 70%; margin-bottom: 8px;" />
                  <el-skeleton-item variant="text" style="width: 50%; height: 16px;" />
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>

        <!-- 空状态 -->
        <EmptyState
          v-else-if="materials.length === 0"
          :icon="PictureFilled"
          title="暂无素材"
          description="上传图片、视频或其他文件到素材库，方便在编辑文章时快速使用。"
        >
          <AppButton variant="primary" size="sm" shape="box" @click="triggerUpload">
            <template #icon>
              <el-icon><Upload /></el-icon>
            </template>
            上传素材
          </AppButton>
        </EmptyState>

        <!-- 素材网格 -->
        <div v-else class="materials-grid">
          <div
            v-for="material in materials"
            :key="material.id"
            class="material-card"
            @click="handleCopyUrl(material)"
          >
            <div class="card-preview">
              <img v-if="isImage(material)" :src="material.url" alt="" />
              <div v-else class="file-placeholder">
                <el-icon><Document /></el-icon>
                <span>{{ getExt(material) }}</span>
              </div>
              <div class="card-overlay">
                <button class="overlay-btn" @click.stop="handleCopyUrl(material)" title="复制链接">
                  <el-icon><Link /></el-icon>
                </button>
                <button class="overlay-btn delete" @click.stop="handleDelete(material)" title="删除">
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </div>
            <div class="card-body">
              <p class="card-name">{{ material.original_name || material.filename || '未知文件' }}</p>
              <div class="card-meta">
                <span class="meta-type">{{ material.type || 'file' }}</span>
                <span class="meta-size">{{ formatSize(material.size) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="total > pageSize" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="fetchMaterials"
          />
        </div>
      </div>
    </div>
  </WorkspaceLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  PictureFilled, Upload,
  Search, Document, Link, Delete
} from '@element-plus/icons-vue';
import http from '@/utils/http';
import WorkspaceLayout from '@/layouts/WorkspaceLayout.vue';
import { workspaceMenuItems } from '@/layouts/workspaceMenu';
import AppButton from '@/components/base/AppButton.vue';
import EmptyState from '@/components/base/EmptyState.vue';

interface Material {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  type: string;
  size: number;
  mime_type: string;
  created_at: string;
}

const materials = ref<Material[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedType = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

const uploading = ref(false);
const uploadProgress = ref(0);
const uploadingFile = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const materialTypes = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '文档', value: 'document' },
  { label: '其他', value: 'other' },
];

async function fetchMaterials() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString(),
    });
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (selectedType.value) params.append('type', selectedType.value);

    const res = await http.get<any>(`/materials?${params}`);
    if (res.success) {
      materials.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (error) {
    console.error('获取素材列表失败:', error);
  } finally {
    loading.value = false;
  }
}

let searchTimeout: ReturnType<typeof setTimeout>;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchMaterials();
  }, 300);
}

function triggerUpload() {
  fileInputRef.value?.click();
}

async function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  for (const file of Array.from(input.files)) {
    uploading.value = true;
    uploadingFile.value = file.name;
    uploadProgress.value = 0;

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/materials/upload');
        const token = localStorage.getItem('token');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            uploadProgress.value = Math.round((ev.loaded / ev.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.statusText || '上传失败'));
          }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.send(formData);
      });

      ElMessage.success(`${file.name} 上传成功`);
    } catch (err: any) {
      ElMessage.error(`${file.name} 上传失败: ${err.message || '未知错误'}`);
    }
  }

  uploading.value = false;
  uploadProgress.value = 0;
  input.value = '';
  fetchMaterials();
}

function isImage(material: Material): boolean {
  const imgTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imgTypes.includes(material.mime_type) || /\.(png|jpe?g|gif|webp|svg)$/i.test(material.filename || '');
}

function getExt(material: Material): string {
  if (material.filename) {
    const parts = material.filename.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
  }
  return 'FILE';
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleCopyUrl(material: Material) {
  try {
    await navigator.clipboard.writeText(material.url);
    ElMessage.success('链接已复制到剪贴板');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = material.url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    ElMessage.success('链接已复制到剪贴板');
  }
}

async function handleDelete(material: Material) {
  try {
    await ElMessageBox.confirm(
      `确定要删除素材「${material.original_name || material.filename}」吗？`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    );
    await http.delete(`/materials/${material.id}`);
    ElMessage.success('素材已删除');
    fetchMaterials();
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
}

onMounted(() => {
  fetchMaterials();
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.materials-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: $space-xl;
}

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
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  width: 240px;
  height: $btn-height-sm;
  padding: 0 16px;
  background: #F6F7F8;
  border-radius: $btn-radius-pill;
  border: 1px solid transparent;
  transition: all $transition-fast;

  &:focus-within {
    background: #FFFFFF;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
}

.search-icon {
  color: rgba(0, 0, 0, 0.4);
  margin-right: 8px;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: $layout-sider-dark;
  outline: none;

  &::placeholder {
    color: rgba(0, 0, 0, 0.3);
  }
}

.category-filter {
  :deep(.el-input__wrapper) {
    min-height: $btn-height-sm;
    background: #F6F7F8;
    border-radius: $btn-radius-pill;
    box-shadow: none;
    padding: 2px 16px;
  }
}

.upload-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: $btn-height-sm;
  padding: 0 18px;
  border: none;
  border-radius: $btn-radius-pill;
  background: $layout-sider-dark;
  color: #FFFFFF;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #F6F7F8;
  border-radius: 10px;

  .el-progress {
    flex: 1;
  }
}

.upload-filename {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding-bottom: 40px;
}

.material-card {
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
    border-color: transparent;

    .card-overlay {
      opacity: 1;
    }
  }
}

.card-preview {
  height: 140px;
  background: #F8F9FA;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.file-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: rgba(0, 0, 0, 0.15);

  .el-icon {
    font-size: 36px;
  }

  span {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.25);
  }
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.overlay-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #FFFFFF;
  color: $layout-sider-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #FFD60A;
    transform: scale(1.1);
  }

  &.delete:hover {
    background: #EF4444;
    color: #FFFFFF;
  }
}

.card-body {
  padding: 10px 12px;
}

.card-name {
  margin: 0 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: $layout-sider-dark;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.meta-type {
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.meta-size {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.35);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

/* 响应式 */
@media (max-width: 1024px) {
  .search-box {
    width: 200px;
  }

  .materials-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .search-box {
    width: 100%;
  }

  .materials-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }
}
</style>
