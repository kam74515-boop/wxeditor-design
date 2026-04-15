<template>
  <div class="empty-state animate-fade-up">
    <div class="empty-state__icon">
      <component :is="icon" :size="56" />
    </div>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p class="empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

interface Props {
  icon: Component;
  title: string;
  description: string;
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  width: 100%;
  min-height: 280px;
  padding: 32px 20px;
}

.empty-state__icon {
  width: 120px;
  height: 120px;
  margin-bottom: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.03);
  color: $layout-sider-dark;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty-state__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  color: $layout-sider-dark;
}

.empty-state__description {
  max-width: 360px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.48);
}

.empty-state__actions {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
</style>
