<template>
  <div class="batch-editor-page">
    <!-- Top bar -->
    <div class="batch-editor__topbar">
      <div class="batch-editor__topbar-left">
        <el-button text @click="$router.push('/dashboard/article-batches')">
          <el-icon><ArrowLeft /></el-icon> 返回列表
        </el-button>
      </div>
      <div class="batch-editor__topbar-center">
        <el-input
          v-model="batchTitle"
          class="batch-title-input"
          placeholder="输入合集标题"
          @blur="saveBatchTitle"
        />
        <span :class="['batch-status-tag', `status--${batch.status}`]">
          {{ statusLabels[batch.status] || batch.status }}
        </span>
      </div>
      <div class="batch-editor__topbar-right">
        <el-button
          v-if="batch.status !== 'published'"
          type="primary"
          :loading="publishing"
          @click="handlePublish"
        >
          发布到微信
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="batch-editor__body">
      <!-- Left: article list -->
      <aside class="batch-editor__sidebar">
        <div class="article-list">
          <div
            v-for="(article, idx) in articles"
            :key="article.id"
            :class="['article-list-item', { active: selectedArticleId === article.id }]"
            @click="selectArticle(article)"
          >
            <span class="article-list-item__pos">{{ idx + 1 }}</span>
            <div class="article-list-item__info">
              <span class="article-list-item__title">{{ article.title || '未命名文章' }}</span>
              <span v-if="article.digest" class="article-list-item__digest">{{ article.digest }}</span>
            </div>
            <button class="article-list-item__remove" @click.stop="removeArticle(article)">
              <el-icon :size="14"><Close /></el-icon>
            </button>
          </div>
        </div>
        <button
          v-if="articles.length < 8"
          class="add-article-btn"
          @click="addArticle"
        >
          <el-icon><Plus /></el-icon>
          添加文章 ({{ articles.length }}/8)
        </button>
      </aside>

      <!-- Right: article editor -->
      <main class="batch-editor__main">
        <template v-if="currentArticle">
          <div class="editor-section">
            <div class="editor-section__header">
              <label class="editor-label">标题</label>
            </div>
            <el-input
              v-model="currentArticle.title"
              placeholder="输入文章标题"
              @blur="saveCurrentArticle"
            />
          </div>

          <div class="editor-section">
            <div class="editor-section__header">
              <label class="editor-label">作者</label>
            </div>
            <el-input
              v-model="currentArticle.author"
              placeholder="作者名称（可选）"
              @blur="saveCurrentArticle"
            />
          </div>

          <div class="editor-section editor-section--row">
            <div class="editor-section__field">
              <label class="editor-label">封面图</label>
              <el-input
                v-model="currentArticle.cover_image"
                placeholder="封面图 URL"
                @blur="saveCurrentArticle"
              />
            </div>
            <div class="editor-section__field">
              <label class="editor-label">原文链接</label>
              <el-input
                v-model="currentArticle.content_source_url"
                placeholder="阅读原文链接（可选）"
                @blur="saveCurrentArticle"
              />
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-section__header">
              <label class="editor-label">摘要</label>
            </div>
            <el-input
              v-model="currentArticle.digest"
              type="textarea"
              :rows="2"
              placeholder="文章摘要（可选，120字以内）"
              resize="none"
              @blur="saveCurrentArticle"
            />
          </div>

          <div class="editor-section">
            <div class="editor-section__header">
              <label class="editor-label">正文内容</label>
            </div>
            <el-input
              v-model="currentArticle.content"
              type="textarea"
              :rows="12"
              placeholder="支持 HTML 格式的正文内容"
              @blur="saveCurrentArticle"
            />
          </div>

          <div class="editor-section editor-section--row">
            <el-checkbox v-model="currentArticle.show_cover_pic" @change="saveCurrentArticle">显示封面</el-checkbox>
            <el-checkbox v-model="currentArticle.need_open_comment" @change="saveCurrentArticle">打开评论</el-checkbox>
            <el-checkbox v-model="currentArticle.only_fans_can_comment" @change="saveCurrentArticle">仅粉丝可评论</el-checkbox>
          </div>
        </template>

        <div v-else class="batch-editor__empty">
          <p>选择左侧文章进行编辑</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Close, ArrowLeft } from '@element-plus/icons-vue';
import { articleBatchApi } from '@/api';

const route = useRoute();

const statusLabels: Record<string, string> = {
  draft: '草稿',
  ready: '待发布',
  published: '已发布',
  failed: '发布失败',
};

const loading = ref(false);
const publishing = ref(false);
const batchTitle = ref('');
const batch = reactive<any>({
  id: '',
  title: '',
  status: 'draft',
  articles: [],
});
const articles = ref<any[]>([]);
const selectedArticleId = ref<number | null>(null);

const currentArticle = computed(() => {
  if (!selectedArticleId.value) return null;
  return articles.value.find(a => a.id === selectedArticleId.value) || null;
});

onMounted(() => {
  loadBatch();
});

async function loadBatch() {
  const batchId = route.params.id as string;
  if (!batchId) return;
  loading.value = true;
  try {
    const res: any = await articleBatchApi.getDetail(batchId);
    if (res.success && res.data) {
      Object.assign(batch, res.data);
      batchTitle.value = res.data.title || '';
      articles.value = res.data.articles || [];
      if (articles.value.length > 0 && !selectedArticleId.value) {
        selectedArticleId.value = articles.value[0].id;
      }
    }
  } catch {
    ElMessage.error('加载图文合集失败');
  } finally {
    loading.value = false;
  }
}

function selectArticle(article: any) {
  selectedArticleId.value = article.id;
}

async function addArticle() {
  if (articles.value.length >= 8) {
    ElMessage.warning('最多支持8篇文章');
    return;
  }
  try {
    const res: any = await articleBatchApi.addArticle(batch.id, {
      title: `文章 ${articles.value.length + 1}`,
      content: '',
    });
    if (res.success && res.data) {
      articles.value.push(res.data);
      selectedArticleId.value = res.data.id;
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '添加文章失败');
  }
}

async function removeArticle(article: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${article.title}」吗？`,
      '确认删除',
      { type: 'warning' },
    );
    await articleBatchApi.deleteArticle(batch.id, String(article.id));
    const idx = articles.value.findIndex(a => a.id === article.id);
    if (idx !== -1) {
      articles.value.splice(idx, 1);
      if (selectedArticleId.value === article.id) {
        selectedArticleId.value = articles.value.length > 0 ? articles.value[0].id : null;
      }
    }
    ElMessage.success('文章已删除');
  } catch { /* cancelled */ }
}

async function saveBatchTitle() {
  if (!batchTitle.value.trim()) return;
  try {
    await articleBatchApi.update(batch.id, { title: batchTitle.value.trim() });
    batch.title = batchTitle.value.trim();
  } catch { /* ignore */ }
}

async function saveCurrentArticle() {
  if (!currentArticle.value) return;
  try {
    await articleBatchApi.updateArticle(batch.id, String(currentArticle.value.id), {
      title: currentArticle.value.title,
      content: currentArticle.value.content,
      cover_image: currentArticle.value.cover_image,
      digest: currentArticle.value.digest,
      author: currentArticle.value.author,
      content_source_url: currentArticle.value.content_source_url,
      show_cover_pic: currentArticle.value.show_cover_pic,
      need_open_comment: currentArticle.value.need_open_comment,
      only_fans_can_comment: currentArticle.value.only_fans_can_comment,
    });
  } catch { /* ignore */ }
}

async function handlePublish() {
  try {
    await ElMessageBox.confirm(
      `确定要发布「${batch.title}」到微信公众号吗？`,
      '确认发布',
      { type: 'info' },
    );
    publishing.value = true;
    const res: any = await articleBatchApi.publish(batch.id);
    if (res.success) {
      ElMessage.success('发布成功');
      batch.status = 'published';
      batch.wechat_media_id = res.data?.wechat_media_id;
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.message || '发布失败');
    }
  } finally {
    publishing.value = false;
  }
}
</script>

<style scoped>
.batch-editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  margin: -24px;
}

.batch-editor__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  flex-shrink: 0;
}

.batch-editor__topbar-center {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batch-title-input {
  width: 300px;
}
.batch-title-input :deep(.el-input__inner) {
  font-size: 16px;
  font-weight: 700;
  border: none;
  text-align: center;
}
.batch-title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 8px;
}
.batch-title-input :deep(.el-input__wrapper:hover),
.batch-title-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1) !important;
}

.batch-status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.status--draft { background: #f3f4f6; color: rgba(0,0,0,0.5); }
.status--ready { background: #dbeafe; color: #2563eb; }
.status--published { background: #dcfce7; color: #16a34a; }
.status--failed { background: #fee2e2; color: #dc2626; }

.batch-editor__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.batch-editor__sidebar {
  width: 260px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  background: #fafafa;
  flex-shrink: 0;
}

.article-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.article-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.article-list-item:hover {
  background: rgba(0, 0, 0, 0.03);
}
.article-list-item.active {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.article-list-item__pos {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.article-list-item.active .article-list-item__pos {
  background: #1d1d1f;
  color: #fff;
}

.article-list-item__info {
  flex: 1;
  min-width: 0;
}

.article-list-item__title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-list-item__digest {
  display: block;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.article-list-item__remove {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}
.article-list-item:hover .article-list-item__remove {
  opacity: 1;
}
.article-list-item__remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.add-article-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin: 8px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  background: transparent;
  color: rgba(0, 0, 0, 0.4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.add-article-btn:hover {
  border-color: #1d1d1f;
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.02);
}

.batch-editor__main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.editor-section {
  margin-bottom: 20px;
}

.editor-section__header {
  margin-bottom: 6px;
}

.editor-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.editor-section--row {
  display: flex;
  gap: 16px;
}

.editor-section__field {
  flex: 1;
}

.batch-editor__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(0, 0, 0, 0.2);
  font-size: 14px;
}
</style>
