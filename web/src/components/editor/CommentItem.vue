<template>
  <div class="comment-item">
    <div class="comment-item__main">
      <div class="comment-item__avatar">
        {{ getInitial(comment.username) }}
      </div>
      <div class="comment-item__body">
        <div class="comment-item__header">
          <span class="comment-item__username">{{ comment.username || '匿名用户' }}</span>
          <span class="comment-item__time">{{ formatTime(comment.created_at) }}</span>
        </div>
        <div class="comment-item__content">{{ comment.content }}</div>
        <div class="comment-item__actions">
          <button class="comment-item__action-btn" @click="showReplyInput = !showReplyInput">
            回复
          </button>
          <button
            v-if="comment.user_id === currentUserId"
            class="comment-item__action-btn comment-item__action-btn--danger"
            @click="$emit('delete', comment.id)"
          >
            删除
          </button>
        </div>

        <!-- Reply input -->
        <div v-if="showReplyInput" class="comment-item__reply-input">
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="2"
            placeholder="输入回复内容..."
            resize="none"
            size="small"
          />
          <div class="comment-item__reply-actions">
            <el-button size="small" text @click="showReplyInput = false">取消</el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="!replyContent.trim()"
              @click="handleReply"
            >
              回复
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Nested replies -->
    <div v-if="comment.replies?.length" class="comment-item__replies">
      <CommentItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :current-user-id="currentUserId"
        @reply="(data: any) => $emit('reply', data)"
        @delete="(id: number) => $emit('delete', id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  comment: any;
  currentUserId: number | null;
}>();

const emit = defineEmits<{
  (e: 'reply', data: { parent_id: number; content: string }): void;
  (e: 'delete', id: number): void;
}>();

const showReplyInput = ref(false);
const replyContent = ref('');

function getInitial(name: string) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function handleReply() {
  if (!replyContent.value.trim()) return;
  emit('reply', {
    parent_id: props.comment.id,
    content: replyContent.value.trim(),
  });
  replyContent.value = '';
  showReplyInput.value = false;
}
</script>

<style scoped>
.comment-item {
  padding: 0;
}

.comment-item__main {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
}

.comment-item__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.comment-item__body {
  flex: 1;
  min-width: 0;
}

.comment-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-item__username {
  font-size: 13px;
  font-weight: 600;
  color: #1D1D1F;
}

.comment-item__time {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
}

.comment-item__content {
  font-size: 13px;
  line-height: 1.5;
  color: #1D1D1F;
  word-break: break-word;
}

.comment-item__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.comment-item__action-btn {
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.4);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.comment-item__action-btn:hover {
  color: #1D1D1F;
}
.comment-item__action-btn--danger:hover {
  color: #dc2626;
}

.comment-item__reply-input {
  margin-top: 8px;
}

.comment-item__reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
}

.comment-item__replies {
  margin-left: 42px;
  border-left: 2px solid rgba(0, 0, 0, 0.04);
}
</style>
