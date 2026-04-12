<template>
  <div class="page-transition-wrapper">
    <Transition
      :name="transitionName"
      mode="out-in"
      @before-enter="onBeforeEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @after-leave="onAfterLeave"
    >
      <slot />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNavigationStore } from '@/stores/navigation';

const route = useRoute();
const navigationStore = useNavigationStore();

const transitionName = ref('page-fade');

const depthMap: Record<string, number> = {
  '/': 0,
  '/login': 1,
  '/register': 1,
  '/projects': 1,
  '/templates': 1,
  '/teams': 1,
  '/editor': 2,
  '/editor/:documentId': 2,
  '/teams/:id': 2,
  '/profile': 1,
  '/membership': 1,
  '/pricing': 1,
  '/checkout': 2,
  '/admin': 1,
  '/admin/users': 2,
  '/admin/membership': 2,
  '/admin/products': 2,
  '/admin/content': 2,
  '/admin/ai-config': 2,
  '/admin/analytics': 2,
  '/admin/settings': 2,
};

function getRouteDepth(path: string): number {
  if (depthMap[path] !== undefined) {
    return depthMap[path];
  }
  
  for (const [pattern, depth] of Object.entries(depthMap)) {
    if (pattern.includes(':')) {
      const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '[^/]+') + '$');
      if (regex.test(path)) {
        return depth;
      }
    }
  }
  
  return 1;
}

let previousDepth = getRouteDepth(route.path);

watch(() => route.path, (newPath, oldPath) => {
  if (!oldPath) return;
  
  const newDepth = getRouteDepth(newPath);
  const oldDepth = getRouteDepth(oldPath);
  
  if (newDepth > oldDepth) {
    transitionName.value = 'page-slide-left';
  } else if (newDepth < oldDepth) {
    transitionName.value = 'page-slide-right';
  } else {
    transitionName.value = 'page-fade';
  }
  
  previousDepth = newDepth;
  navigationStore.addHistoryEntry(newPath, route.meta.title as string || '');
});

function onBeforeEnter() {
  navigationStore.setNavigating(true);
}

function onAfterEnter() {
  navigationStore.setNavigating(false);
}

function onBeforeLeave() {}

function onAfterLeave() {}
</script>

<style lang="scss">
@import '@/styles/variables.scss';

.page-transition-wrapper {
  width: 100%;
  min-height: 100%;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

.page-slide-left-enter-active,
.page-slide-left-leave-active,
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.page-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.page-slide-right-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.page-up-enter-active,
.page-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.page-up-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>
