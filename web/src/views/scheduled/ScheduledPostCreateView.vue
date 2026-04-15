<template>
  <!-- 定时发布 — 创建/编辑表单（可作为对话框内容或独立页面使用） -->
  <div class="scheduled-post-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="top"
      size="default"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="文章标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入文章标题"
          maxlength="64"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="公众号" prop="accountId">
        <el-select
          v-model="formData.accountId"
          placeholder="请选择公众号"
          filterable
          style="width: 100%"
          :loading="accountsLoading"
        >
          <el-option
            v-for="account in accounts"
            :key="account.id"
            :label="account.name"
            :value="account.id"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <img
                v-if="account.avatar"
                :src="account.avatar"
                alt=""
                style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;"
              />
              <span>{{ account.name }}</span>
              <el-tag v-if="account.type" size="small" type="info">{{ account.type }}</el-tag>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="定时发布时间" prop="scheduledAt">
        <el-date-picker
          v-model="formData.scheduledAt"
          type="datetime"
          placeholder="请选择定时发布时间"
          style="width: 100%"
          :disabled-date="disabledDate"
          :disabled-hours="disabledHours"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </el-form-item>

      <el-form-item label="文章内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          placeholder="请输入文章内容（支持HTML）"
          :autosize="{ minRows: 6, maxRows: 16 }"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="摘要" prop="digest">
        <el-input
          v-model="formData.digest"
          type="textarea"
          placeholder="选填，120字以内的文章摘要"
          maxlength="120"
          show-word-limit
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </el-form-item>

      <el-form-item label="封面图" prop="coverUrl">
        <el-input
          v-model="formData.coverUrl"
          placeholder="选填，封面图片URL地址"
          clearable
        >
          <template #prefix>
            <el-icon><Picture /></el-icon>
          </template>
        </el-input>
        <div v-if="formData.coverUrl" class="cover-preview">
          <img :src="formData.coverUrl" alt="封面预览" @error="coverError = true" />
          <div v-if="coverError" class="cover-error">图片加载失败</div>
        </div>
      </el-form-item>

      <el-form-item>
        <div class="form-actions">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建任务' }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Picture } from '@element-plus/icons-vue';
import { scheduledPostApi, wechatAccountApi } from '@/api';
import type { ScheduledPost } from '@/types';

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel'): void;
}>();

const route = useRoute();
const router = useRouter();

// 编辑模式检测
const isEdit = computed(() => !!route.params?.id);
const editId = computed(() => (route.params?.id as string) || '');

// 表单引用
const formRef = ref<FormInstance>();
const submitting = ref(false);
const coverError = ref(false);

// 公众号列表
const accounts = ref<any[]>([]);
const accountsLoading = ref(false);

// 表单数据
const formData = reactive({
  title: '',
  accountId: '',
  content: '',
  scheduledAt: '',
  digest: '',
  coverUrl: '',
});

// 表单校验规则
const formRules: FormRules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 2, max: 64, message: '标题长度为 2-64 个字符', trigger: 'blur' },
  ],
  accountId: [
    { required: true, message: '请选择公众号', trigger: 'change' },
  ],
  scheduledAt: [
    { required: true, message: '请选择定时发布时间', trigger: 'change' },
  ],
  content: [
    { max: 20000, message: '内容不能超过 20000 个字符', trigger: 'blur' },
  ],
  digest: [
    { max: 120, message: '摘要不能超过 120 个字符', trigger: 'blur' },
  ],
};

// 日期禁用：不能选择过去的时间
function disabledDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function disabledHours(): number[] {
  // If the selected date is today, disable past hours
  return [];
}

// 加载公众号列表
async function fetchAccounts() {
  accountsLoading.value = true;
  try {
    const res = await wechatAccountApi.getList();
    if (res.success) {
      accounts.value = res.data?.list || [];
    }
  } catch (error) {
    console.error('获取公众号列表失败:', error);
    ElMessage.warning('获取公众号列表失败，请稍后重试');
  } finally {
    accountsLoading.value = false;
  }
}

// 编辑模式：加载已有数据
async function loadDetail(id: string) {
  try {
    const res = await scheduledPostApi.getDetail(id);
    if (res.success && res.data) {
      const post: ScheduledPost = res.data;
      formData.title = post.title || '';
      formData.accountId = post.accountId || '';
      formData.content = post.content || '';
      formData.scheduledAt = post.scheduledAt || '';
      formData.digest = post.digest || '';
      formData.coverUrl = post.coverUrl || '';
    }
  } catch (error) {
    console.error('获取定时任务详情失败:', error);
    ElMessage.error('加载任务详情失败');
  }
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (!valid) return;
  } catch {
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      title: formData.title,
      accountId: formData.accountId,
      content: formData.content || undefined,
      scheduledAt: formData.scheduledAt,
      digest: formData.digest || undefined,
      coverUrl: formData.coverUrl || undefined,
    };

    if (isEdit.value) {
      await scheduledPostApi.update(editId.value, payload);
      ElMessage.success('定时任务已更新');
    } else {
      await scheduledPostApi.create(payload);
      ElMessage.success('定时任务已创建');
    }

    emit('submit');

    // 如果作为独立页面使用，跳转回列表
    if (!isEmbedded()) {
      router.push('/scheduled-posts');
    }
  } catch (error: any) {
    console.error('提交失败:', error);
    ElMessage.error(error?.response?.data?.message || '操作失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  emit('cancel');
  if (!isEmbedded()) {
    router.push('/scheduled-posts');
  }
}

// 判断是否作为对话框嵌入
function isEmbedded(): boolean {
  // 如果是通过 defineAsyncComponent 加载为对话框内容，没有 route name
  return !route.name || route.name === 'ScheduledPosts';
}

// 监听封面URL变化，清除错误状态
watch(() => formData.coverUrl, () => {
  coverError.value = false;
});

onMounted(() => {
  fetchAccounts();
  if (isEdit.value && editId.value) {
    loadDetail(editId.value);
  }
});
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.scheduled-post-form {
  padding: 8px 4px;

  :deep(.el-form-item__label) {
    font-weight: 600;
    color: $layout-sider-dark;
    font-size: 14px;
    padding-bottom: 4px;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    border-radius: 8px;
    transition: all $transition-fast;

    &:focus-within {
      box-shadow: 0 0 0 2px rgba($primary, 0.15);
    }
  }

  :deep(.el-date-editor) {
    width: 100%;
  }
}

.cover-preview {
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid $border-light;
  max-width: 320px;
  position: relative;

  img {
    width: 100%;
    height: auto;
    max-height: 180px;
    object-fit: cover;
    display: block;
  }

  .cover-error {
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: $error;
    background: #fef2f2;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  padding-top: 8px;

  :deep(.el-button) {
    border-radius: 8px;
    min-width: 100px;
  }
}
</style>
