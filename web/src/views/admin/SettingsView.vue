<template>
  <!-- 管理后台 — 系统设置 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">系统设置</h1>
      <button class="btn-add" @click="saveAllSettings" :disabled="saving">
        <Save :size="14" class="icon" />
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>
    <p class="admin-main__desc">管理网站基础配置、SEO、邮件、存储设置。</p>

    <!-- ===== 基础设置 ===== -->
    <div class="card" style="margin-bottom: 16px; padding: 24px;">
      <h3 class="section-title">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM9 5h2v2H9V5zm0 4h2v6H9V9z"/></svg>
        基础设置
      </h3>
      <div class="form-grid">
        <div class="form-item">
          <label class="form-label">站点名称</label>
          <el-input v-model="settings.siteName" placeholder="站点名称" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">站点描述</label>
          <el-input v-model="settings.siteDesc" placeholder="站点描述" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">站点 Logo URL</label>
          <el-input v-model="settings.logoUrl" placeholder="https://example.com/logo.png" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">注册开关</label>
          <el-switch v-model="settings.allowRegistration" active-text="开放注册" inactive-text="关闭注册" />
        </div>
        <div class="form-item">
          <label class="form-label">维护模式</label>
          <el-switch v-model="settings.maintenanceMode" active-text="已开启" inactive-text="已关闭" />
        </div>
        <div class="form-item" v-if="settings.logoUrl">
          <label class="form-label">Logo 预览</label>
          <div style="width: 80px; height: 80px; border-radius: 12px; background: #F0F3F8; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img :src="settings.logoUrl" style="max-width: 100%; max-height: 100%; object-fit: contain;" @error="($event.target as HTMLImageElement).style.display = 'none'" />
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SEO 设置 ===== -->
    <div class="card" style="margin-bottom: 16px; padding: 24px;">
      <h3 class="section-title">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M9 2a7 7 0 0 1 4.87 12.04l3.55 3.54-1.42 1.42-3.54-3.55A7 7 0 1 1 9 2zm0 2a5 5 0 1 0 0 10A5 5 0 0 0 9 4z"/></svg>
        SEO 设置
      </h3>
      <div class="form-grid">
        <div class="form-item">
          <label class="form-label">页面标题模板</label>
          <el-input v-model="settings.seoTitleTemplate" placeholder="%s - WxEditor" style="max-width: 400px;" />
          <span class="form-hint">%s 会被替换为页面标题</span>
        </div>
        <div class="form-item">
          <label class="form-label">Meta Keywords</label>
          <el-input v-model="settings.seoKeywords" placeholder="关键词1, 关键词2, 关键词3" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">Meta Description</label>
          <el-input v-model="settings.seoDescription" type="textarea" :rows="2" placeholder="站点描述，用于搜索引擎展示" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">Google Analytics ID</label>
          <el-input v-model="settings.gaId" placeholder="G-XXXXXXXXXX" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">百度统计 ID</label>
          <el-input v-model="settings.baiduTongjiId" placeholder="百度统计代码 ID" style="max-width: 400px;" />
        </div>
      </div>
    </div>

    <!-- ===== 邮件设置 ===== -->
    <div class="card" style="margin-bottom: 16px; padding: 24px;">
      <h3 class="section-title">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2 0v.5l6 4 6-4V4H4zm0 3v9h12V7l-6 4-6-4z"/></svg>
        邮件设置 (SMTP)
      </h3>
      <div class="form-grid">
        <div class="form-item">
          <label class="form-label">SMTP 主机</label>
          <el-input v-model="settings.smtpHost" placeholder="smtp.example.com" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">SMTP 端口</label>
          <el-input-number v-model="settings.smtpPort" :min="1" :max="65535" />
          <span class="form-hint">常用端口: 25, 465(SSL), 587(TLS)</span>
        </div>
        <div class="form-item">
          <label class="form-label">SMTP 用户名</label>
          <el-input v-model="settings.smtpUser" placeholder="noreply@example.com" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">SMTP 密码</label>
          <el-input v-model="settings.smtpPass" type="password" show-password placeholder="••••••••" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">发件人邮箱</label>
          <el-input v-model="settings.smtpFrom" placeholder="noreply@example.com" style="max-width: 400px;" />
        </div>
        <div class="form-item">
          <label class="form-label">加密方式</label>
          <el-select v-model="settings.smtpSecure" style="width: 200px;">
            <el-option label="SSL" value="ssl" />
            <el-option label="TLS" value="tls" />
            <el-option label="无加密" value="none" />
          </el-select>
        </div>
        <div class="form-item">
          <label class="form-label">测试收件邮箱</label>
          <div style="display: flex; gap: 8px; align-items: center; max-width: 400px;">
            <el-input v-model="testEmail" placeholder="test@example.com" style="flex: 1;" />
            <el-button size="small" @click="sendTestEmail" :loading="sendingTest">发送测试</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 存储设置 ===== -->
    <div class="card" style="padding: 24px;">
      <h3 class="section-title">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M15 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-3 2v4H8V4h4zm3 12H5V4h1v6h8V4h1v12z"/></svg>
        存储设置
      </h3>
      <div class="form-grid">
        <div class="form-item">
          <label class="form-label">存储方式</label>
          <el-select v-model="settings.storageType" style="width: 240px;">
            <el-option label="本地存储" value="local" />
            <el-option label="阿里云 OSS" value="aliyun" />
            <el-option label="腾讯云 COS" value="tencent" />
            <el-option label="AWS S3" value="aws" />
          </el-select>
        </div>
        <div class="form-item">
          <label class="form-label">最大上传文件大小</label>
          <el-input-number v-model="settings.maxUploadMB" :min="1" :max="100" />
          <span class="form-hint">MB</span>
        </div>
        <div class="form-item">
          <label class="form-label">允许的文件类型</label>
          <el-select v-model="settings.allowedFileTypes" multiple filterable allow-create default-first-option style="max-width: 400px;" placeholder="添加允许的文件扩展名">
            <el-option v-for="ext in defaultFileTypes" :key="ext" :label="ext" :value="ext" />
          </el-select>
          <span class="form-hint">自定义输入后回车添加</span>
        </div>
        <template v-if="settings.storageType !== 'local'">
          <div class="form-item">
            <label class="form-label">{{ storageTypeLabel }} Bucket</label>
            <el-input v-model="settings.storageBucket" placeholder="your-bucket-name" style="max-width: 400px;" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ storageTypeLabel }} Region</label>
            <el-input v-model="settings.storageRegion" placeholder="如: oss-cn-hangzhou" style="max-width: 400px;" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ storageTypeLabel }} Access Key</label>
            <el-input v-model="settings.storageAccessKey" placeholder="Access Key ID" style="max-width: 400px;" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ storageTypeLabel }} Secret Key</label>
            <el-input v-model="settings.storageSecretKey" type="password" show-password placeholder="Secret Access Key" style="max-width: 400px;" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Save } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import http from '@/utils/http';

const saving = ref(false);
const sendingTest = ref(false);
const testEmail = ref('');

const defaultFileTypes = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.mp4', '.pdf', '.doc', '.docx'];

const settings = ref({
  // 基础
  siteName: 'WxEditor',
  siteDesc: '微信公众号图文排版编辑器',
  logoUrl: '',
  allowRegistration: true,
  maintenanceMode: false,
  // SEO
  seoTitleTemplate: '%s - WxEditor',
  seoKeywords: '',
  seoDescription: '',
  gaId: '',
  baiduTongjiId: '',
  // 邮件
  smtpHost: '',
  smtpPort: 465,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  smtpSecure: 'ssl',
  // 存储
  storageType: 'local',
  maxUploadMB: 10,
  allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.mp4'],
  storageBucket: '',
  storageRegion: '',
  storageAccessKey: '',
  storageSecretKey: '',
});

const storageTypeLabel = computed(() => {
  const map: Record<string, string> = { aliyun: '阿里云 OSS', tencent: '腾讯云 COS', aws: 'AWS S3' };
  return map[settings.value.storageType] || '';
});

async function fetchSettings() {
  try {
    const res: any = await http.get('/admin/settings');
    if (res.success && res.data) {
      Object.assign(settings.value, res.data);
    }
  } catch {
    // 后端不可用，使用默认值
  }
}

async function saveAllSettings() {
  saving.value = true;
  try {
    await http.put('/admin/settings', settings.value);
    ElMessage.success('设置已保存');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function sendTestEmail() {
  if (!testEmail.value) {
    ElMessage.warning('请输入测试邮箱地址');
    return;
  }
  sendingTest.value = true;
  try {
    await http.post('/admin/settings/test-email', { to: testEmail.value });
    ElMessage.success('测试邮件已发送');
  } catch {
    ElMessage.error('发送失败，请检查 SMTP 配置');
  } finally {
    sendingTest.value = false;
  }
}

onMounted(() => {
  fetchSettings();
});
</script>

<style scoped>
.section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #1D1D1F;
}
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
}
.form-hint {
  font-size: 12px;
  color: rgba(0,0,0,0.3);
}
</style>
