<template>
  <button 
    class="flat-button" 
    :class="[variantClass, sizeClass, { 'flat-button--loading': loading }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="flat-button__spinner"></span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const variantClass = computed(() => `flat-button--${props.variant}`);
const sizeClass = computed(() => `flat-button--${props.size}`);
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.flat-button {
  border: 2px solid $pop-black;
  border-radius: 0;
  font-weight: 700;
  cursor: pointer;
  transition: all $transition-fast;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &--sm {
    padding: 8px 16px;
    font-size: 14px;
  }
  
  &--md {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  &--lg {
    padding: 16px 32px;
    font-size: 18px;
  }
  
  &--primary {
    background: $pop-black;
    color: $pop-white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    
    &:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.18);
    }
    
    &:active:not(:disabled) {
      transform: translate(0, 0);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
  }
  
  &--secondary {
    background: $pop-white;
    color: $pop-black;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    
    &:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.18);
    }
  }
  
  &--danger {
    background: $pop-red;
    color: $pop-white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    
    &:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.18);
    }
  }
  
  &--success {
    background: $sticky-green;
    color: $pop-black;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    
    &:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.18);
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &--loading {
    cursor: wait;
  }
}

.flat-button__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
