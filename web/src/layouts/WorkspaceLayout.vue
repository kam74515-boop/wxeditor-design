<template>
  <div class="workspace-layout">
    <aside class="workspace-layout__sidebar">
      <div class="workspace-layout__header">
        <slot name="sidebar-header" />
      </div>

      <nav class="workspace-layout__nav" aria-label="工作区菜单">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          :class="['workspace-layout__nav-item', { 'workspace-layout__nav-item--active': isActive(item.path) }]"
        >
          <span class="workspace-layout__nav-icon">
            <component :is="item.icon" :size="18" />
          </span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div v-if="$slots['sidebar-footer']" class="workspace-layout__footer">
        <slot name="sidebar-footer" />
      </div>
    </aside>

    <main class="workspace-layout__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { WorkspaceMenuItem } from '@/layouts/workspaceMenu';

defineProps<{
  menuItems: WorkspaceMenuItem[];
}>();

const route = useRoute();

const normalizedPath = computed(() => {
  return route.path === '/settings' ? '/profile' : route.path;
});

function isActive(path: string) {
  return normalizedPath.value === path || normalizedPath.value.startsWith(`${path}/`);
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.workspace-layout {
  display: flex;
  height: calc(100vh - $nav-offset);
  width: 100%;
  gap: $block-gap;
  padding: $block-gap $page-padding $page-padding;
  background: linear-gradient(180deg, #FBFBFD 0%, #F2F2F7 100%);
  box-sizing: border-box;
  overflow: hidden;
}

.workspace-layout__sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $space-lg;
  padding: 24px 18px 18px;
  background: $brand-yellow;
  border-radius: $block-radius-lg;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

.workspace-layout__header {
  min-height: 40px;
  display: flex;
  align-items: center;
}

.workspace-layout__nav {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workspace-layout__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 8px;
  color: rgba(29, 29, 31, 0.7);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color $transition-fast, color $transition-fast;

  &:hover {
    background: rgba(255, 255, 255, 0.4);
    color: $layout-sider-dark;
  }
}

.workspace-layout__nav-item--active {
  background: #FFFFFF;
  color: $layout-sider-dark;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.workspace-layout__nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}

.workspace-layout__footer {
  margin-top: auto;
}

.workspace-layout__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px 32px;
  background: #FFFFFF;
  border-radius: $block-radius-lg;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

:deep(.workspace-layout__sidebar-title) {
  margin: 0;
  color: $layout-sider-dark;
  font-size: 1.1rem;
  font-weight: 800;
}

:deep(.workspace-layout__sidebar-action) {
  width: 100%;
  height: $btn-height-md;
  padding: 0 18px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: $btn-radius-pill;
  background: #FFD60A;
  color: $layout-sider-dark;
  font-size: 0.95rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform $transition-fast, box-shadow $transition-fast, opacity $transition-fast;
}

:deep(.workspace-layout__sidebar-action:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 214, 10, 0.3);
}

:deep(.workspace-layout__sidebar-action:disabled) {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 1024px) {
  .workspace-layout__sidebar {
    width: 220px;
    padding: 20px 14px 16px;
  }

  .workspace-layout__main {
    padding: 20px 24px;
  }
}

@media (max-width: 768px) {
  .workspace-layout {
    padding-top: 8px;
  }

  .workspace-layout__sidebar {
    display: none;
  }

  .workspace-layout__main {
    padding: 18px 16px;
    border-radius: 12px;
  }
}
</style>
