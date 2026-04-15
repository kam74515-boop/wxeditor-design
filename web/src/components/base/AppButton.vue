<template>
  <component
    :is="componentTag"
    v-bind="componentProps"
    :class="[
      'app-button',
      `app-button--${props.variant}`,
      `app-button--${props.size}`,
      `app-button--${props.shape}`,
      {
        'app-button--block': props.block,
        'app-button--disabled': isDisabled,
        'app-button--loading': props.loading,
      },
    ]"
    :aria-busy="props.loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span v-if="props.loading" class="app-button__spinner" aria-hidden="true" />
    <span v-else-if="$slots.icon" class="app-button__icon">
      <slot name="icon" />
    </span>
    <span class="app-button__label">
      <slot />
    </span>
    <span v-if="!props.loading && $slots.trailing" class="app-button__trailing">
      <slot name="trailing" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Component } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

interface Props {
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'pill' | 'box';
  to?: RouteLocationRaw;
  href?: string;
  target?: string;
  rel?: string;
  nativeType?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  shape: 'box',
  target: '_self',
  nativeType: 'button',
  disabled: false,
  loading: false,
  block: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const isDisabled = computed(() => props.disabled || props.loading);

const componentTag = computed<Component | string>(() => {
  if (props.to) {
    return RouterLink;
  }

  if (props.href) {
    return 'a';
  }

  return 'button';
});

const componentProps = computed(() => {
  if (props.to) {
    return {
      to: props.to,
      tabindex: isDisabled.value ? -1 : undefined,
      'aria-disabled': isDisabled.value ? 'true' : undefined,
    };
  }

  if (props.href) {
    return {
      href: isDisabled.value ? undefined : props.href,
      target: props.target,
      rel: props.rel ?? (props.target === '_blank' ? 'noreferrer noopener' : undefined),
      'aria-disabled': isDisabled.value ? 'true' : undefined,
      tabindex: isDisabled.value ? -1 : undefined,
    };
  }

  return {
    type: props.nativeType,
    disabled: isDisabled.value,
  };
});

function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit('click', event);
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: fit-content;
  padding: 0 18px;
  border: 1px solid transparent;
  background: $layout-sider-dark;
  color: #FFFFFF;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  border-radius: 12px;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  font-weight: 700;
  line-height: 1;
  transition: transform $transition-fast, box-shadow $transition-fast, background $transition-fast, border-color $transition-fast, opacity $transition-fast;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(0,0,0,0.12);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
}

.app-button--sm {
  height: 32px;
  padding-inline: 14px;
  font-size: 0.85rem;
}

.app-button--md {
  height: 40px;
  padding-inline: 18px;
  font-size: 0.95rem;
}

.app-button--lg {
  height: 48px;
  padding-inline: 24px;
  font-size: 1rem;
}

.app-button--pill {
  border-radius: $btn-radius-pill;
}

.app-button--box {
  border-radius: 12px;
}

.app-button--primary {
  background: $layout-sider-dark;
  color: #FFFFFF;
}

.app-button--secondary {
  background: #FFFFFF;
  color: $layout-sider-dark;
  border-color: rgba(0,0,0,0.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.app-button--success {
  background: $sticky-green;
  color: $layout-sider-dark;
  border-color: rgba(0,0,0,0.06);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.app-button--block {
  width: 100%;
}

.app-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
  transform: none;
  box-shadow: none;
}

.app-button__icon,
.app-button__trailing {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: app-button-spin 0.8s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
