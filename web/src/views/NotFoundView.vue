<template>
  <div class="not-found-page">
    <div class="content-wrapper">
      <div class="icon-wrapper">
        <el-icon class="ghost-icon"><LocationInformation /></el-icon>
      </div>
      <h1 class="title">404 - 页面迷路了</h1>
      <p class="description">
        抱歉，您访问的页面不存在或已被移除。<br>
        如果您认为这是一个错误，请联系客户支持。
      </p>
      
      <div class="actions">
        <button class="action-btn back-btn" @click="handleBack">
          <el-icon><Back /></el-icon> 返回上一页
        </button>
        <button class="action-btn home-btn" @click="$router.push('/')">
          <el-icon><HomeFilled /></el-icon> 回到首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { LocationInformation, Back, HomeFilled } from '@element-plus/icons-vue';

const router = useRouter();

const handleBack = () => {
  if (window.history.length > 2) {
    router.back();
  } else {
    router.push('/');
  }
};
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F9FAFB;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.content-wrapper {
  text-align: center;
  max-width: 480px;
  padding: 40px 20px;
}

.icon-wrapper {
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
}

.ghost-icon {
  font-size: 56px;
  color: #9CA3AF;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}

.description {
  font-size: 16px;
  line-height: 1.6;
  color: #6B7280;
  margin: 0 0 40px 0;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.back-btn {
  background-color: white;
  color: #374151;
  border: 1px solid #E5E7EB;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.back-btn:hover {
  background-color: #F9FAFB;
  border-color: #D1D5DB;
}

.home-btn {
  background-color: #111827;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.home-btn:hover {
  background-color: #1F2937;
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>