<template>
  <transition name="comment-slide">
    <div v-if="visible" class="comment-panel">
      <!-- Header -->
      <div class="comment-panel__header">
        <span class="comment-panel__title">
          评论 ({{ totalCount }})
        </span>
        <button class="comment-panel__close" @click="$emit('close')">
          <el-icon :size="16"><Close /></el-icon>
        </button>
      </div>

      <!-- New comment input -->
      <div class="comment-panel__input-area">
        <el-input
          v-model="newComment"
          type="textarea"
          :rows="3"
          placeholder="输入评论内容..."
          resize="none"
          :disabled="submitting"
        />
        <el-button
          type="primary"
          size="small"
          :loading="submitting"
          :disabled="!newComment.trim()"
          class="comment-panel__send-btn"
          @click="handleCreateComment"
        >
          发送
        </el-button>
      </div>

      <!-- Comment list -->
      <div v-loading="loading" class="comment-panel__list">
        <template v-if="comments.length > 0">
          <CommentItem
            v-for="comment in comments"
            :key="comment.id"
            :comment="comment"
            :current-user-id="currentUserId"
            @reply="handleReply"
            @delete="handleDelete"
          />
        </template>
        <div v-else class="comment-panel__empty">
          <p>暂无评论</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import { commentApi } from '@/api';
import CommentItem from './CommentItem.vue';

const props = defineProps<{
  documentId: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const comments = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const newComment = ref('');

const currentUserId = computed(() => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch { /* ignore */ }
  return null;
});

const totalCount = computed(() => {
  let count = 0;
  function walk(list: any[]) {
    for (const c of list) {
      count++;
      if (c.replies?.length) walk(c.replies);
    }
  }
  walk(comments.value);
  return count;
});

watch(() => props.visible, (val) => {
  if (val && props.documentId) {
    fetchComments();
  }
});

watch(() => props.documentId, (val) => {
  if (val && props.visible) {
    fetchComments();
  }
});

async function fetchComments() {
  if (!props.documentId) return;
  loading.value = true;
  try {
    const res: any = await commentApi.getByDocument(props.documentId);
    if (res.success) {
      comments.value = res.data || [];
    }
  } catch (err) {
    console.error('加载评论失败:', err);
  } finally {
    loading.value = false;
  }
}

async function handleCreateComment() {
  if (!newComment.value.trim() || !props.documentId) return;
  submitting.value = true;
  try {
    const res: any = await commentApi.create({
      document_id: props.documentId,
      content: newComment.value.trim(),
    });
    if (res.success) {
      newComment.value = '';
      await fetchComments();
      ElMessage.success('评论已发送');
    }
  } catch (err) {
    ElMessage.error('发送评论失败');
  } finally {
    submitting.value = false;
  }
}

async function handleReply(data: { parent_id: number; content: string }) {
  try {
    const res: any = await commentApi.create({
      document_id: props.documentId,
      content: data.content,
      parent_id: data.parent_id,
    });
    if (res.success) {
      await fetchComments();
      ElMessage.success('回复已发送');
    }
  } catch (err) {
    ElMessage.error('回复失败');
  }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
    const res: any = await commentApi.delete(id);
    if (res.success) {
      await fetchComments();
      ElMessage.success('评论已删除');
    }
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.comment-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #fff;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.06);
}

.comment-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.comment-panel__title {
  font-size: 14px;
  font-weight: 700;
  color: #1D1D1F;
}

.comment-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: all 0.15s;
}
.comment-panel__close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #1D1D1F;
}

.comment-panel__input-area {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.comment-panel__send-btn {
  align-self: flex-end;
}

.comment-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.comment-panel__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: rgba(0, 0, 0, 0.3);
  font-size: 13px;
}

/* Slide transition */
.comment-slide-enter-active,
.comment-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.comment-slide-enter-from,
.comment-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
