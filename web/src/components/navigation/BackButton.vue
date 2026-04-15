<template>
  <button 
    class="back-button"
    :class="[
      `back-button--${variant}`,
      `back-button--${size}`,
      { 'back-button--disabled': disabled }
    ]"
    @click="handleBack"
    :disabled="disabled"
    :title="tooltip"
  >
    <svg 
      class="back-button__icon" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
    <span v-if="showLabel" class="back-button__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNavigationStore } from '@/stores/navigation';

interface Props {
  /** 自定义返回目标路径 */
  to?: string;
  /** 按钮标签 */
  label?: string;
  /** 是否显示标签文字 */
  showLabel?: boolean;
  /** 按钮变体 */
  variant?: 'default' | 'ghost' | 'primary';
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否禁用 */
  disabled?: boolean;
  /** 返回前的回调，返回 false 可阻止返回 */
  beforeBack?: () => boolean | Promise<boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  label: '返回',
  showLabel: true,
  variant: 'ghost',
  size: 'md',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const router = useRouter();
const route = useRoute();
const navigationStore = useNavigationStore();

// 智能返回逻辑
const fallbackRoutes: Record<string, string> = {
  '/editor': '/projects',
  '/editor/:documentId': '/projects',
  '/teams/:id': '/teams',
  '/checkout': '/pricing',
  '/admin/users': '/admin',
  '/admin/membership': '/admin',
  '/admin/products': '/admin',
  '/admin/content': '/admin',
  '/admin/ai-config': '/admin',
  '/admin/analytics': '/admin',
  '/admin/settings': '/admin',
};

// 获取当前路由的 fallback 路径
function getFallbackPath(): string {
  const currentPath = route.path;
  
  // 精确匹配
  if (fallbackRoutes[currentPath]) {
    return fallbackRoutes[currentPath];
  }
  
  // 动态路由匹配
  for (const [pattern, fallback] of Object.entries(fallbackRoutes)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(currentPath)) {
        return fallback;
      }
    }
  }
  
  // 默认返回项目列表
  return '/projects';
}

// 工具提示
const tooltip = computed(() => {
  if (props.to) {
    return `返回${props.label}`;
  }
  
  const canGoBack = navigationStore.canGoBack;
  if (canGoBack) {
    return '返回上一页 (Alt+←)';
  }
  
  return `返回${props.label} (Alt+←)`;
});

// 处理返回
async function handleBack() {
  if (props.disabled) return;
  
  // 执行前置回调
  if (props.beforeBack) {
    const canProceed = await props.beforeBack();
    if (!canProceed) return;
  }
  
  // 自定义目标
  if (props.to) {
    router.push(props.to);
    emit('back');
    return;
  }
  
  // 智能返回：优先使用浏览器历史
  if (navigationStore.canGoBack) {
    router.back();
  } else {
    // 没有历史记录，使用 fallback
    const fallback = getFallbackPath();
    router.push(fallback);
  }
  
  emit('back');
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  font-family: $font-family;
  font-weight: 600;
  border-radius: 8px;
  transition: all $transition-fast;
  white-space: nowrap;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba($primary, 0.3);
  }
  
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &--sm {
    padding: 6px 10px;
    font-size: 13px;
    
    .back-button__icon {
      width: 16px;
      height: 16px;
    }
  }
  
  &--md {
    padding: 8px 14px;
    font-size: 14px;
    
    .back-button__icon {
      width: 18px;
      height: 18px;
    }
  }
  
  &--lg {
    padding: 10px 18px;
    font-size: 15px;
    
    .back-button__icon {
      width: 20px;
      height: 20px;
    }
  }
  
  &--default {
    background: white;
    color: $text-primary;
    border: 1px solid $border-light;
    box-shadow: $shadow-sm;
    
    &:hover:not(.back-button--disabled) {
      background: #F9FAFB;
      border-color: #D1D5DB;
      transform: translateX(-2px);
    }
    
    &:active:not(.back-button--disabled) {
      transform: translateX(0);
    }
  }
  
  &--ghost {
    background: transparent;
    color: $text-secondary;
    
    &:hover:not(.back-button--disabled) {
      background: rgba(0, 0, 0, 0.04);
      color: $layout-sider-dark;
    }
  }
  
  &--primary {
    background: $layout-sider-dark;
    color: white;
    box-shadow: $shadow-md;
    
    &:hover:not(.back-button--disabled) {
      background: #2D2D2F;
      transform: translateX(-2px);
      box-shadow: $shadow-lg;
    }
    
    &:active:not(.back-button--disabled) {
      transform: translateX(0);
    }
  }
  
  &__icon {
    transition: transform $transition-fast;
    flex-shrink: 0;
  }
  
  &__label {
    line-height: 1;
  }
}

.back-button:hover:not(.back-button--disabled) {
  .back-button__icon {
    transform: translateX(-3px);
  }
}

@media (max-width: $breakpoint-md) {
  .back-button {
    &--md {
      padding: 6px 12px;
      font-size: 13px;
    }
    
    &--lg {
      padding: 8px 14px;
      font-size: 14px;
    }
  }
}
</style>
