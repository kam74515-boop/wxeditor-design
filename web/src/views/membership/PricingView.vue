<template>
  <div class="pricing-layout">
    <div class="pricing-body">
      <!-- 头部标题 -->
      <div class="section-head">
        <h2 class="section-title">选择适合你的方案</h2>
        <p class="section-desc">灵活的定价，满足不同需求</p>
      </div>

      <!-- 计费周期切换 -->
      <div class="toggle-wrap">
        <button
          class="toggle-btn"
          :class="{ active: billingPeriod === 'monthly' }"
          @click="billingPeriod = 'monthly'"
        >月付</button>
        <button
          class="toggle-btn"
          :class="{ active: billingPeriod === 'quarterly' }"
          @click="billingPeriod = 'quarterly'"
        >季付 · 省10%</button>
        <button
          class="toggle-btn"
          :class="{ active: billingPeriod === 'yearly' }"
          @click="billingPeriod = 'yearly'"
        >年付 · 省20%</button>
      </div>

      <!-- 高级便签风定价卡片 (与首页严格统一) -->
      <div class="pricing-desk">
         <div class="pricing-cards">
            <!-- 免费版 -->
            <div class="pricing-card pricing-card--blue">
              <div class="washi-tape p-tape-1"></div>
              <span class="pricing-label">免费版</span>
              <div class="pricing-price">
                <span class="price-val">¥{{ plans[0].prices[billingPeriod] }}</span>
                <span class="price-unit">/ {{ periodLabel }}</span>
              </div>
              <span class="pricing-desc">基础功能体验</span>
              <div class="pricing-divider" />
              <ul class="pricing-features">
                <li v-for="f in plans[0].features" :key="f">
                  <Check :size="14" class="p-check"/> {{ f }}
                </li>
              </ul>
              <button 
                class="pricing-btn pricing-btn--outline" 
                :class="{ disabled: currentPlan === 'free' }"
                :disabled="currentPlan === 'free'"
                @click="selectPlan(plans[0])"
              >
                {{ currentPlan === 'free' ? '当前方案' : '免费开始' }}
              </button>
            </div>

            <!-- 专业版 -->
            <div class="pricing-card pricing-card--pink raise-up">
              <div class="washi-tape p-tape-2"></div>
              <div class="pricing-badge"><Sparkles :size="12"/> 推荐</div>
              <span class="pricing-label pricing-label--dark">专业版</span>
              <div class="pricing-price">
                <span class="price-val">¥{{ plans[1].prices[billingPeriod] }}</span>
                <span class="price-unit">/ {{ periodLabel }}</span>
              </div>
              <span class="pricing-desc">内容创作者的首选</span>
              <div class="pricing-divider pricing-divider--dark" />
              <ul class="pricing-features pricing-features--dark">
                <li v-for="f in plans[1].features" :key="f">
                  <Check :size="14" class="p-check"/> {{ f }}
                </li>
              </ul>
              <button class="pricing-btn pricing-btn--primary" @click="selectPlan(plans[1])">
                立即升级
              </button>
            </div>

            <!-- 企业版 -->
            <div class="pricing-card pricing-card--purple">
              <div class="washi-tape p-tape-3"></div>
              <span class="pricing-label">企业版</span>
              <div class="pricing-price">
                <span class="price-val">¥{{ plans[2].prices[billingPeriod] }}</span>
                <span class="price-unit">/ {{ periodLabel }}</span>
              </div>
              <span class="pricing-desc">专为团队和企业打造</span>
              <div class="pricing-divider" />
              <ul class="pricing-features">
                <li v-for="f in plans[2].features" :key="f">
                  <Check :size="14" class="p-check"/> {{ f }}
                </li>
              </ul>
              <button class="pricing-btn pricing-btn--outline" @click="selectPlan(plans[2])">
                联系我们
              </button>
            </div>
         </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Check, Sparkles } from 'lucide-vue-next';

const router = useRouter();
const billingPeriod = ref<'monthly' | 'quarterly' | 'yearly'>('monthly');
const currentPlan = ref('free');

const plans = [
  {
    type: 'basic',
    prices: { monthly: 0, quarterly: 0, yearly: 0 },
    features: ['3 个项目', '100MB 存储', '基础模板库']
  },
  {
    type: 'pro',
    prices: { monthly: 29, quarterly: 78, yearly: 279 },
    features: ['无限项目', '5GB 存储空间', 'AI 辅助写作', '全部模板与组件']
  },
  {
    type: 'enterprise',
    prices: { monthly: 99, quarterly: 267, yearly: 948 },
    features: ['专业版全部功能', '50GB 存储 · 团队协作', '数据统计 · 专属支持']
  }
];

const periodLabel = computed(() => {
  const m: Record<string, string> = { monthly: '月', quarterly: '季', yearly: '年' };
  return m[billingPeriod.value];
});

function selectPlan(plan: any) {
  if (plan.type === 'basic') {
    router.push('/projects');
    return;
  }
  if (plan.type === 'enterprise') {
    // 企业版联系逻辑
    return;
  }
  router.push({
    path: '/checkout',
    query: {
      plan: plan.type,
      period: billingPeriod.value,
      price: plan.prices[billingPeriod.value]
    }
  });
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.pricing-layout {
  height: calc(100vh - $nav-offset);
  overflow-y: auto;
  background: $layout-light-bg;
  display: flex;
  justify-content: center;
  align-items: flex-start; // 让其从上往下排布，可滚动
  padding-top: 40px;
  padding-bottom: 80px;
}

.pricing-body {
  width: 100%;
  max-width: 1000px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40px;
}

/* ===== 通用区块标题 ===== */
.section-head { text-align: center; margin-bottom: 32px; }
.section-title { font-size: 2.2rem; font-weight: 900; color: $layout-sider-dark; margin: 0 0 12px 0; letter-spacing: -0.02em; }
.section-desc { font-size: 1.15rem; color: rgba(0,0,0,0.4); font-weight: 500; margin: 0; }

/* ===== 切换器 ===== */
.toggle-wrap {
  display: inline-flex;
  background: #ffffff;
  border-radius: 999px;
  padding: 6px;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  margin-bottom: 48px;
}

.toggle-btn {
  padding: 10px 24px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: rgba(0,0,0,0.4);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;

  &.active {
    background: $layout-sider-dark;
    color: #ffffff;
  }
}

/* ===== 清爽胶带卡片 (与主页一致) ===== */
.pricing-desk {
  width: 100%;
  position: relative;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  position: relative;
  z-index: 1;
  align-items: center;
}

.pricing-card {
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 12px 40px rgba(0,0,0,0.06);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  height: 100%;
}

.pricing-card:hover { 
  transform: translateY(-8px); 
  box-shadow: 0 24px 60px rgba(0,0,0,0.08); 
}

.raise-up {
  transform: translateY(-16px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
  border: 2px solid #fff;
  z-index: 2;
  height: calc(100% + 32px);
}

.raise-up:hover { 
  transform: translateY(-24px); 
  box-shadow: 0 32px 80px rgba(0,0,0,0.15); 
}

.pricing-card--blue { background: rgba($macaron-blue, 0.6); }
.pricing-card--pink { background: rgba($macaron-pink, 0.8); }
.pricing-card--purple { background: rgba($macaron-purple, 0.4); }

/* Washi Tape */
.washi-tape {
  position: absolute;
  top: 0px;
  left: 50%;
  width: 72px;
  height: 20px;
  margin-left: -36px;
  background: rgba(255,255,255,0.7);
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  z-index: 10;
}
.p-tape-1 { transform: translateY(-50%) rotate(-1deg); width: 60px; }
.p-tape-2 { transform: translateY(-50%) rotate(2deg); width: 70px; background: rgba(255,255,255,0.85); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.p-tape-3 { transform: translateY(-50%) rotate(-2deg); width: 60px; }

/* 内部元素 */
.pricing-badge {
  position: absolute;
  top: 16px;
  right: 24px;
  left: auto;
  transform: none;
  background: transparent;
  color: #1D1D1F;
  padding: 0;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pricing-label {
  font-size: 15px;
  font-weight: 700;
  color: rgba(0,0,0,0.6);
  margin-bottom: 20px;
  &--dark { color: $layout-sider-dark; }
}

.pricing-price { margin-bottom: 12px; }
.price-val {
  font-size: 2.8rem;
  font-weight: 900;
  color: $layout-sider-dark;
  letter-spacing: -0.05em;
}
.price-unit {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
}

.pricing-desc {
  font-size: 1rem;
  color: rgba(0,0,0,0.65);
  font-weight: 600;
  margin-bottom: 32px;
  display: block;
}

.pricing-divider {
  height: 1px;
  background: rgba(0,0,0,0.08);
  margin-bottom: 32px;
  &--dark { background: rgba(0,0,0,0.12); }
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 48px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0,0,0,0.7);
}

.pricing-features--dark li { color: $layout-sider-dark; }
.p-check { color: #2E7D32; flex-shrink: 0; }

.pricing-btn {
  margin-top: auto;
  padding: 16px;
  text-align: center;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: 0.2s;
  cursor: pointer;
  border: none;
  width: 100%;
}

.pricing-btn--outline {
  background: transparent;
  border: 1px solid rgba(0,0,0,0.1);
  color: $layout-sider-dark;
  &:hover:not(.disabled) { background: rgba(0,0,0,0.04); }
}

.pricing-btn--primary {
  background: $layout-sider-dark;
  color: #fff;
  &:hover:not(.disabled) { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
}

.pricing-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .pricing-cards {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin: 0 auto;
    gap: 40px;
  }
  .raise-up {
    transform: none;
    box-shadow: 0 12px 40px rgba(0,0,0,0.06);
    height: 100%;
  }
}
</style>
