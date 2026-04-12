<template>
  <!-- 按设计文件 08-结算页 重做 -->
  <div class="checkout-layout">
    <div class="checkout-card">
      <!-- 左侧：结算表单 -->
      <div class="checkout-form">
        <h2 class="form-title">订单结算</h2>

        <!-- 支付方式 -->
        <div class="form-group">
          <label class="group-label">支付方式</label>
          <div class="pay-options">
            <button
              class="pay-opt"
              :class="{ active: paymentMethod === 'wechat' }"
              @click="paymentMethod = 'wechat'"
            >
              <span class="pay-radio" :class="{ checked: paymentMethod === 'wechat' }">
                <svg v-if="paymentMethod === 'wechat'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <svg class="pay-icon" viewBox="0 0 24 24" fill="none" stroke="#07C160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              微信支付
            </button>
            <button
              class="pay-opt"
              :class="{ active: paymentMethod === 'alipay' }"
              @click="paymentMethod = 'alipay'"
            >
              <span class="pay-radio" :class="{ checked: paymentMethod === 'alipay' }">
                <svg v-if="paymentMethod === 'alipay'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <svg class="pay-icon" viewBox="0 0 24 24" fill="none" stroke="#1677FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              支付宝
            </button>
          </div>
        </div>

        <!-- 优惠码 -->
        <div class="form-group">
          <label class="group-label">优惠码</label>
          <div class="coupon-row">
            <input
              v-model="discountCode"
              class="coupon-input"
              placeholder="输入优惠码"
              :disabled="applyingDiscount"
            />
            <button class="coupon-btn" :disabled="!discountCode || applyingDiscount" @click="applyDiscount">应用</button>
          </div>
          <p v-if="discountError" class="coupon-msg coupon-msg--error">{{ discountError }}</p>
          <p v-if="discountApplied" class="coupon-msg coupon-msg--ok">已应用优惠码 {{ discountCode }}</p>
        </div>

        <!-- 支付按钮 -->
        <button
          class="submit-btn"
          :disabled="processing"
          @click="submitOrder"
        >
          <template v-if="processing">
            <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </template>
          <template v-else>立即支付 ¥{{ finalPrice.toFixed(2) }}</template>
        </button>
        <p class="terms-text">点击支付即视为同意《服务条款》和《隐私政策》</p>
      </div>

      <!-- 右侧：订单摘要（黄色背景） -->
      <div class="checkout-summary">
        <h3 class="summary-title">订单摘要</h3>
        <div class="summary-row">
          <span>{{ planName }} · {{ periodLabel }}</span>
          <span class="summary-price">¥{{ planPrice.toFixed(2) }}</span>
        </div>
        <div v-if="discountApplied" class="summary-row">
          <span>新用户优惠</span>
          <span class="summary-discount">-¥{{ discountAmount.toFixed(2) }}</span>
        </div>
        <div class="summary-divider" />
        <div class="summary-row summary-row--total">
          <span>应付金额</span>
          <span class="summary-total">¥{{ finalPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '@/utils/http';

const route = useRoute();
const router = useRouter();

const planType = computed(() => route.query.plan as string);
const planPrice = computed(() => parseFloat(route.query.price as string) || 0);
const period = computed(() => route.query.period as string);

const paymentMethod = ref<'wechat' | 'alipay'>('wechat');
const discountCode = ref('');
const discountApplied = ref(false);
const discountError = ref('');
const applyingDiscount = ref(false);
const processing = ref(false);

const planNames: Record<string, string> = {
  basic: '基础版',
  pro: '专业版',
  enterprise: '企业版'
};

const planName = computed(() => planNames[planType.value] || '高级版');

const periodLabel = computed(() => {
  const m: Record<string, string> = { monthly: '月付', quarterly: '季付', yearly: '年付' };
  return m[period.value] || '订阅';
});

const discountAmount = computed(() => discountApplied.value ? planPrice.value * 0.1 : 0);
const finalPrice = computed(() => planPrice.value - discountAmount.value);

async function applyDiscount() {
  if (!discountCode.value) return;
  applyingDiscount.value = true;
  discountError.value = '';
  await new Promise(r => setTimeout(r, 500));
  if (discountCode.value.toUpperCase() === 'VIP2024') {
    discountApplied.value = true;
  } else {
    discountError.value = '优惠码无效或已过期';
  }
  applyingDiscount.value = false;
}

async function submitOrder() {
  processing.value = true;
  try {
    await http.post('/membership/subscribe', {
      type: planType.value,
      period: period.value,
      paymentMethod: paymentMethod.value,
      discountCode: discountApplied.value ? discountCode.value : undefined
    });
    router.push('/membership');
  } catch (error) {
    console.error('支付失败:', error);
  } finally {
    processing.value = false;
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;


.checkout-layout {
  height: calc(100vh - $nav-offset);
  background: $layout-light-bg;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: 40px 20px;
  box-sizing: border-box;
}

/* 主卡片：白色圆角，上圆角下直角 */
.checkout-card {
  display: flex;
  width: 100%;
  max-width: 720px;
  height: clamp(400px, 60vh, 540px);
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 12px 32px rgba(0,0,0,0.06);
  overflow: hidden;
}

/* ===== 左侧表单 ===== */
.checkout-form {
  flex: 1;
  padding: clamp(24px, 3vh, 36px);
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.5vh, 28px);
}

.form-title {
  font-size: clamp(1.2rem, 1.8vw, 1.5rem);
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1vh, 12px);
}

.group-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
}

/* 支付方式选择 */
.pay-options {
  display: flex;
  gap: 12px;
}

.pay-opt {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: clamp(38px, 5vh, 48px);
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  background: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0,0,0,0.5);
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: $layout-sider-dark;
    border-width: 2px;
    color: $layout-sider-dark;
  }
}

.pay-radio {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &.checked {
    background: $layout-sider-dark;
    border-color: $layout-sider-dark;
  }

  svg { width: 10px; height: 10px; }
}

.pay-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 优惠码 */
.coupon-row {
  display: flex;
  gap: 8px;
}

.coupon-input {
  flex: 1;
  height: clamp(36px, 4.5vh, 44px);
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.6);
  padding: 0 12px;
  font-size: 0.875rem;
  color: $layout-sider-dark;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder { color: rgba(0,0,0,0.25); }
  &:focus { border-color: rgba(0,0,0,0.3); }
}

.coupon-btn {
  height: clamp(36px, 4.5vh, 44px);
  padding: 0 16px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #E5E7EB;
  font-size: 0.875rem;
  font-weight: 600;
  color: $layout-sider-dark;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #f5f5f5; }
}

.coupon-msg {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 500;
  &--error { color: #ef4444; }
  &--ok { color: #10b981; }
}

/* 支付按钮 */
.submit-btn {
  width: 100%;
  height: clamp(40px, 5.5vh, 52px);
  border-radius: 12px;
  background: $layout-sider-dark;
  color: #ffffff;
  font-size: clamp(0.9rem, 1vw, 0.9375rem);
  font-weight: 700;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  margin-top: auto;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
}

.spin-icon {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.terms-text {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0,0,0,0.35);
  text-align: center;
}

/* ===== 右侧订单摘要（黄色背景） ===== */
.checkout-summary {
  width: clamp(240px, 28vw, 360px);
  background: $brand-yellow;
  padding: clamp(24px, 3vh, 36px) clamp(20px, 2vw, 28px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 20px);
  flex-shrink: 0;
}

.summary-title {
  font-size: clamp(1rem, 1.3vw, 1.125rem);
  font-weight: 800;
  color: $layout-sider-dark;
  margin: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(0,0,0,0.5);

  &--total {
    font-weight: 700;
    color: $layout-sider-dark;
    font-size: 1rem;
  }
}

.summary-price {
  font-weight: 700;
  color: $layout-sider-dark;
}

.summary-discount {
  font-weight: 700;
  color: $success;
}

.summary-divider {
  height: 1px;
  background: rgba(0,0,0,0.1);
}

.summary-total {
  font-size: clamp(1.3rem, 2vw, 1.5rem);
  font-weight: 800;
}

/* 响应式 */
@media (max-width: 768px) {
  .checkout-card {
    flex-direction: column;
    height: auto;
    max-height: calc(100vh - 120px);
  }
  .checkout-summary {
    width: 100%;
  }
}
</style>
