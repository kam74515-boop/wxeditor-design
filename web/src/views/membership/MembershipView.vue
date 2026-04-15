<template>
  <div class="projects-layout">
    <aside class="sidebar-card">
      <div class="brand">
        <h2>会员管理</h2>
      </div>
      <nav class="nav-menu">
        <div class="nav-item text-muted" @click="$router.push('/dashboard')">
          <el-icon><FolderOpened /></el-icon> <span>全部项目</span>
        </div>
        <div class="nav-item text-muted" @click="$router.push('/templates')">
          <el-icon><CopyDocument /></el-icon> <span>模板中心</span>
        </div>
        <div class="nav-item active">
          <el-icon><Tickets /></el-icon> <span>资产与订阅</span>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="new-project-btn" @click="$router.push('/pricing')">
           升级专业版套餐
        </button>
      </div>
    </aside>

    <main class="main-card">
      <header class="page-header">
        <h2 class="page-title">会员状态与用量情况</h2>
      </header>

      <div class="list-container">
        <!-- 核心状态卡片 -->
        <div class="status-hero-card" :class="membershipStatus">
          <div class="hero-left">
             <div class="plan-badge">{{ statusText }}</div>
             <h3 class="plan-name">{{ currentPlan.name }}</h3>
             <p v-if="membershipStatus === 'active'" class="plan-expiry">
               特权服务有效期截止至: <strong>{{ expiryDate || '2024-12-31' }}</strong>
             </p>
             <p v-else class="plan-expiry">当前正使用包含受限基础功能的免费版本</p>
          </div>
          <div class="hero-right">
             <button class="hero-btn primary" @click="goToPricing">
               {{ membershipStatus === 'active' ? '调整订阅计划' : '立即解锁高级特权' }}
             </button>
             <button v-if="membershipStatus === 'active'" class="hero-btn text-only" @click="cancelRenewal">
               关闭自动续费
             </button>
          </div>
        </div>

        <div class="grid-section">
          <!-- 用量卡片 -->
          <div class="detail-card">
            <div class="card-header">
              <h3>当月配额</h3>
            </div>
            <div class="card-body">
              <div class="usage-list">
                <div class="usage-item">
                  <div class="usage-label">
                    <span>云端文档库创建量</span>
                    <span class="usage-number"><strong>{{ usage.documents.used }}</strong> / {{ usage.documents.limit }}</span>
                  </div>
                  <div class="usage-track">
                    <div class="usage-bar" :style="{ width: Math.min(documentUsagePercent, 100) + '%' }" :class="{ warning: documentUsagePercent > 80 }"></div>
                  </div>
                </div>
                
                <div class="usage-item">
                  <div class="usage-label">
                    <span>高解析素材存储空间</span>
                    <span class="usage-number"><strong>{{ usage.storage.used }}MB</strong> / {{ usage.storage.limit }}MB</span>
                  </div>
                  <div class="usage-track">
                    <div class="usage-bar" :style="{ width: Math.min(storageUsagePercent, 100) + '%' }" :class="{ warning: storageUsagePercent > 80 }"></div>
                  </div>
                </div>

                <div class="usage-item">
                  <div class="usage-label">
                    <span>外团协作者邀请量</span>
                    <span class="usage-number"><strong>{{ usage.collaborators.used }}</strong> / {{ usage.collaborators.limit }}</span>
                  </div>
                  <div class="usage-track">
                    <div class="usage-bar" :style="{ width: Math.min(collaboratorUsagePercent, 100) + '%' }" :class="{ warning: collaboratorUsagePercent > 80 }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 历史订单卡片 -->
          <div class="detail-card">
            <div class="card-header">
              <h3>订阅历史明细</h3>
            </div>
            <div class="card-body padding-0">
              <div class="history-list" v-if="orders.length > 0">
                <div v-for="order in orders" :key="order.id" class="history-item">
                  <div class="h-left">
                    <div class="h-plan">{{ order.plan }}</div>
                    <div class="h-date">{{ order.date }}</div>
                  </div>
                  <div class="h-right">
                    <div class="h-amount">¥{{ order.amount }}</div>
                    <div class="h-status" :class="order.status">{{ order.statusText }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-history">
                <el-icon><List /></el-icon>
                <p>暂无任何历史账单与订阅记录</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FolderOpened, CopyDocument, Tickets, List } from '@element-plus/icons-vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import http from '@/utils/http';

const router = useRouter();

const membershipStatus = ref<'active' | 'expired' | 'free'>('free');
const currentPlan = ref({ name: '基础免费版', type: 'free' });
const expiryDate = ref('');

const usage = ref({
  documents: { used: 3, limit: 10 },
  storage: { used: 50, limit: 100 },
  collaborators: { used: 1, limit: 3 }
});

const orders = ref<any[]>([]);

const statusText = computed(() => {
  const texts = { active: '在保状态', expired: '订阅已逾期', free: '免费起步区' };
  return texts[membershipStatus.value] || '无状态识别';
});

const documentUsagePercent = computed(() => (usage.value.documents.used / usage.value.documents.limit) * 100);
const storageUsagePercent = computed(() => (usage.value.storage.used / usage.value.storage.limit) * 100);
const collaboratorUsagePercent = computed(() => (usage.value.collaborators.used / usage.value.collaborators.limit) * 100);

onMounted(() => {
  loadMembershipStatus();
});

async function loadMembershipStatus() {
  try {
    const res = await http.get<any>('/membership/status');
    if (res.success || res) {
      const data = res.data || res;
      membershipStatus.value = data.current?.isActive ? 'active' : 'free';
      currentPlan.value = data.current || currentPlan.value;
      if (data.limits) usage.value = data.limits;
      if (data.history) orders.value = data.history;
    }
  } catch (error) {
    console.warn('获取资产状态失败', error);
  }
}

function goToPricing() {
  router.push('/pricing');
}

async function cancelRenewal() {
  ElMessageBox.confirm('是否确定要关闭自动续费？您的下个周期特权将会被自动降级。', '退订提示', {
    confirmButtonText: '确定关闭',
    cancelButtonText: '暂不执行',
    type: 'warning'
  }).then(async () => {
    try {
      await http.post('/membership/cancel');
      ElMessage.success('已收到您的取消指令，下个周期将不再自动扣费。');
    } catch {
      ElMessage.error('通讯超时，取消失败');
    }
  }).catch(() => {});
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.projects-layout {
  display: flex; height: calc(100vh - $nav-offset); width: 100%; background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  padding: $block-gap $page-padding $page-padding; gap: $block-gap; box-sizing: border-box; overflow: hidden;
}

.sidebar-card {
  width: 280px; background: $brand-yellow; border-radius: $block-radius-lg; display: flex; flex-direction: column; padding: $space-lg; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  .brand { margin-bottom: $space-xl; h2 { font-size: 1.1rem; font-weight: 800; color: $layout-sider-dark; margin: 0; } }
  .nav-menu {
    flex: 1; display: flex; flex-direction: column; gap: 8px;
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; color: $layout-sider-dark; cursor: pointer; transition: all $transition-fast;
      &:hover { background-color: rgba(255,255,255,0.4); }
      &.active { background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
      &.text-muted { color: rgba(0,0,0,0.5); }
    }
  }
  .sidebar-bottom {
    margin-top: auto;
    .new-project-btn { width: 100%; padding: 12px 16px; border-radius: 999px; background: $layout-sider-dark; color: #FFD60A; font-weight: 800; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: #000; } }
  }
}

.main-card {
  flex: 1; background-color: #ffffff; border-radius: $block-radius-lg; padding: 24px 32px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);

  .page-header { display: flex; align-items: center; margin-bottom: $space-xl; .page-title { font-size: 1.25rem; font-weight: 800; color: $layout-sider-dark; margin: 0; } }

  .list-container {
    flex: 1; overflow-y: auto; padding-bottom: 40px; display: flex; flex-direction: column; gap: 24px;
    
    /* 顶部特写大状态卡片 */
    .status-hero-card {
      display: flex; justify-content: space-between; align-items: center; padding: 40px; border-radius: $block-radius-lg; border: 1px solid rgba(0,0,0,0.08); transition: all 0.3s;
      
      &.free { background: #f6f7f8; .plan-badge { background: #e5e7eb; color: rgba(0,0,0,0.6); } }
      &.active { background: linear-gradient(135deg, $layout-sider-dark 0%, #000 100%); .hero-left { color: #fff; h3, p { color: #fff; strong { color: #FFD60A; } } } .plan-badge { background: #10b981; color: #fff; border: none; } }
      &.expired { background: #fef2f2; border-color: #fca5a5; .plan-badge { background: #ef4444; color: #fff; border: none; } }
      
      .hero-left {
        .plan-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 800; margin-bottom: 12px; letter-spacing: 0.5px; border: 1px solid rgba(0,0,0,0.1); }
        h3 { font-size: 2rem; font-weight: 800; color: $layout-sider-dark; margin: 0 0 12px 0; }
        p { font-size: 0.95rem; color: rgba(0,0,0,0.6); margin: 0; strong { color: $layout-sider-dark; } }
      }
      
      .hero-right {
        display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
        .hero-btn { border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; }
        .primary { padding: 12px 24px; background: #FFD60A; color: $layout-sider-dark; &:hover { background: #E6C108; box-shadow: 0 4px 12px rgba(255, 214, 10, 0.4); transform: translateY(-1px); } }
        .text-only { background: transparent; color: rgba(255,255,255,0.6); &:hover { color: #fff; text-decoration: underline; } }
      }
    }

    /* 下方双列网格 */
    .grid-section {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
      @media (max-width: 900px) { grid-template-columns: 1fr; }
      
      .detail-card {
        background: #ffffff; border: 1px solid rgba(0,0,0,0.06); border-radius: $block-radius-lg; overflow: hidden;
        
        .card-header { padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.04); background: #fbfbfd; h3 { font-size: 1.05rem; font-weight: 700; color: $layout-sider-dark; margin: 0; } }
        
        .card-body {
          padding: 24px;
          &.padding-0 { padding: 0; }
          
          /* 用量槽 */
          .usage-list {
            display: flex; flex-direction: column; gap: 20px;
            
            .usage-item {
              .usage-label { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; font-weight: 600; color: $layout-sider-dark; .usage-number { color: rgba(0,0,0,0.5); font-weight: 500; strong { color: $layout-sider-dark; font-weight: 700; } } }
              .usage-track { height: 8px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; .usage-bar { height: 100%; background: #10b981; border-radius: 999px; transition: width 0.3s; &.warning { background: #ef4444; } } }
            }
          }
          
          /* 历史记录列表 */
          .history-list {
            .history-item {
              display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,0.04);
              &:last-child { border-bottom: none; }
              
              .h-left { .h-plan { font-weight: 700; color: $layout-sider-dark; font-size: 0.95rem; margin-bottom: 4px; } .h-date { font-size: 0.8rem; color: rgba(0,0,0,0.4); } }
              .h-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; .h-amount { font-weight: 800; font-size: 1.1rem; color: $layout-sider-dark; } .h-status { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; background: rgba(0,0,0,0.06); color: rgba(0,0,0,0.6); &.success { background: #ecfdf5; color: #10b981; } &.pending { background: #fffbeb; color: #d97706; } } }
            }
          }
          
          .empty-history { padding: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(0,0,0,0.3); .el-icon { font-size: 32px; margin-bottom: 12px; } p { font-size: 0.9rem; font-weight: 600; } }
        }
      }
    }
  }
}
</style>
