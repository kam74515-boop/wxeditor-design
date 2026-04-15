<template>
  <div class="pop-card" :class="[colorClass, { 'pop-card--hoverable': hoverable }]">
    <div v-if="$slots.header || title" class="pop-card__header">
      <slot name="header">
        <div v-if="title" class="pop-card__title">{{ title }}</div>
        <div v-if="subtitle" class="pop-card__subtitle">{{ subtitle }}</div>
      </slot>
    </div>
    <div class="pop-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="pop-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  color?: 'white' | 'yellow' | 'pink' | 'blue' | 'green';
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'white',
  title: '',
  subtitle: '',
  hoverable: false,
});

const colorClass = computed(() => `pop-card--${props.color}`);
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.pop-card {
  border: 3px solid $pop-black;
  border-radius: 0;
  box-shadow: $shadow-pop-lg;
  transition: all $transition-fast;
  
  &--white { background: $pop-white; }
  &--yellow { background: $sticky-yellow; }
  &--pink { background: $sticky-pink; }
  &--blue { background: $sticky-blue; }
  &--green { background: $sticky-green; }
  
  &--hoverable {
    cursor: pointer;
    
    &:hover {
      transform: translate(-4px, -4px);
      box-shadow: 10px 10px 0 $pop-black;
    }
  }
}

.pop-card__header {
  padding: 16px;
  border-bottom: 2px solid $pop-black;
}

.pop-card__title {
  font-weight: 700;
  font-size: 18px;
  color: $pop-black;
}

.pop-card__subtitle {
  font-size: 14px;
  color: $text-secondary;
  margin-top: 4px;
}

.pop-card__body {
  padding: 16px;
}

.pop-card__footer {
  padding: 16px;
  border-top: 2px solid $pop-black;
  display: flex;
  gap: 12px;
}
</style>
