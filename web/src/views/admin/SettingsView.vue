<template>
  <!-- 管理后台 — 系统设置 -->
  <div>
    <div class="admin-main__header">
      <h1 class="admin-main__title">系统设置</h1>
      <button class="btn-add" @click="saveSettings">
        <Save :size="14" class="icon" />
        保存设置
      </button>
    </div>
    <p class="admin-main__desc">管理网站基础配置、存储设置与通知模板。</p>

    <!-- 基础设置 -->
    <div class="card" style="margin-bottom: 16px; padding: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM9 5h2v2H9V5zm0 4h2v6H9V9z"/></svg> 基础设置</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">站点名称</label>
          <el-input v-model="settings.siteName" style="max-width: 400px;" />
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">站点描述</label>
          <el-input v-model="settings.siteDesc" style="max-width: 400px;" />
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">注册开关</label>
          <el-switch v-model="settings.allowRegistration" />
        </div>
      </div>
    </div>

    <!-- 存储设置 -->
    <div class="card" style="margin-bottom: 16px; padding: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M15 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-3 2v4H8V4h4zm3 12H5V4h1v6h8V4h1v12z"/></svg> 存储设置</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">存储方式</label>
          <el-select v-model="settings.storageType" style="width: 240px;">
            <el-option label="本地存储" value="local" />
            <el-option label="阿里云 OSS" value="aliyun" />
            <el-option label="腾讯云 COS" value="tencent" />
            <el-option label="AWS S3" value="aws" />
          </el-select>
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">最大上传</label>
          <el-input-number v-model="settings.maxUploadMB" :min="1" :max="100" />
          <span style="font-size: 13px; color: rgba(0,0,0,0.4);">MB</span>
        </div>
      </div>
    </div>

    <!-- 邮件设置 -->
    <div class="card" style="padding: 24px;">
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;"><svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" style="vertical-align:-3px;margin-right:4px;"><path d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4zm2 0v.5l6 4 6-4V4H4zm0 3v9h12V7l-6 4-6-4z"/></svg> 邮件设置</h3>
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">SMTP 地址</label>
          <el-input v-model="settings.smtpHost" placeholder="smtp.example.com" style="max-width: 400px;" />
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">SMTP 端口</label>
          <el-input-number v-model="settings.smtpPort" :min="1" :max="65535" />
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="width: 120px; font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.5);">发件邮箱</label>
          <el-input v-model="settings.smtpFrom" placeholder="noreply@example.com" style="max-width: 400px;" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Save } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';

const settings = ref({
  siteName: 'WxEditor',
  siteDesc: '微信公众号图文排版编辑器',
  allowRegistration: true,
  storageType: 'local',
  maxUploadMB: 10,
  smtpHost: '',
  smtpPort: 465,
  smtpFrom: '',
});

function saveSettings() {
  ElMessage.success('设置已保存');
}
</script>
