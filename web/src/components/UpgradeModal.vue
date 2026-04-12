<template>
  <el-dialog
    v-model="appStore.showUpgradeModal"
    :show-close="false"
    width="480px"
    class="upgrade-modal"
    align-center
  >
    <div class="upgrade-content">
      <div class="upgrade-header">
        <div class="premium-icon-wrapper">
          <el-icon class="premium-icon"><Medal /></el-icon>
        </div>
        <h2 class="upgrade-title">升级至专业版</h2>
        <p class="upgrade-desc">解锁无限模板、AI 辅助写作、完整商用版权授权等专属特权，让内容创作飞起来。</p>
      </div>

      <div class="features-list">
        <div class="feature-item">
          <el-icon class="check-icon"><Check /></el-icon>
          <span>海量高级模板与 SVG 动画无限制使用</span>
        </div>
        <div class="feature-item">
          <el-icon class="check-icon"><Check /></el-icon>
          <span>无限制调用最新 AI 模型（文生文 / 智能排版）</span>
        </div>
        <div class="feature-item">
          <el-icon class="check-icon"><Check /></el-icon>
          <span>去除所有底栏水印及版权声明</span>
        </div>
        <div class="feature-item">
          <el-icon class="check-icon"><Check /></el-icon>
          <span>不限云端储存空间，历史版本随意回退</span>
        </div>
      </div>

      <div class="upgrade-actions">
        <button class="action-btn cancel-btn" @click="closeModal">暂不考虑</button>
        <button class="action-btn upgrade-btn" @click="goUpgrade">立即升级体验</button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAppStore } from '@/stores/app';
import { Medal, Check } from '@element-plus/icons-vue';

const appStore = useAppStore();
const router = useRouter();

const closeModal = () => {
  appStore.setShowUpgradeModal(false);
};

const goUpgrade = () => {
  appStore.setShowUpgradeModal(false);
  router.push('/pricing');
};
</script>

<style scoped>
.upgrade-modal :deep(.el-dialog__header) {
  display: none;
}

.upgrade-modal :deep(.el-dialog__body) {
  padding: 0;
}

.upgrade-content {
  padding: 40px 32px 32px;
  background: linear-gradient(180deg, #FDFDFE 0%, #FFFFFF 100%);
  border-radius: 16px;
  text-align: center;
}

.premium-icon-wrapper {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px -4px rgba(251, 146, 60, 0.25);
}

.premium-icon {
  font-size: 32px;
  color: #EA580C;
}

.upgrade-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
}

.upgrade-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #6B7280;
  margin: 0 0 32px 0;
}

.features-list {
  text-align: left;
  background: #F9FAFB;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 32px;
  border: 1px solid #F3F4F6;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

.feature-item:last-child {
  margin-bottom: 0;
}

.check-icon {
  color: #10B981;
  font-size: 16px;
  background: #D1FAE5;
  padding: 2px;
  border-radius: 50%;
}

.upgrade-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.cancel-btn {
  background-color: #F3F4F6;
  color: #4B5563;
}

.cancel-btn:hover {
  background-color: #E5E7EB;
}

.upgrade-btn {
  background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
  color: white;
  box-shadow: 0 4px 12px -2px rgba(234, 88, 12, 0.3);
}

.upgrade-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px -2px rgba(234, 88, 12, 0.4);
}
</style>
