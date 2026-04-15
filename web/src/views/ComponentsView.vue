<template>
  <EditorLayout>
    <div class="page-container">
      <header class="page-header">
        <h1>组件库</h1>
      </header>
      
      <div class="components-list">
        <StickyNote v-for="comp in components" :key="comp.id" color="blue" shadow="md" :pin="false">
          <div class="component-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:transparent; border:none;">
            <div class="item-preview" :style="{ background: comp.color }">
              <span class="material-symbols-outlined">{{ comp.icon }}</span>
            </div>
            <div class="item-info" style="flex:1;">
              <h3>{{ comp.name }}</h3>
              <p>{{ comp.desc }}</p>
            </div>
            <button class="insert-btn">插入</button>
          </div>
        </StickyNote>
      </div>
    </div>
  </EditorLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EditorLayout from '@/layouts/EditorLayout.vue';

const components = ref([
  { id: 1, name: '引用块', desc: '带边框的引用样式', icon: 'format_quote', color: 'rgba(19, 127, 236, 0.1)' },
  { id: 2, name: '代码块', desc: '高亮显示的代码片段', icon: 'code', color: 'rgba(16, 185, 129, 0.1)' },
  { id: 3, name: '提示框', desc: '重要信息提示卡片', icon: 'info', color: 'rgba(245, 158, 11, 0.1)' },
  { id: 4, name: '分割线', desc: '内容分隔元素', icon: 'horizontal_rule', color: 'rgba(107, 114, 128, 0.1)' },
  { id: 5, name: '图片卡片', desc: '带标题的图片展示', icon: 'image', color: 'rgba(239, 68, 68, 0.1)' },
  { id: 6, name: '视频嵌入', desc: '支持多种视频来源', icon: 'videocam', color: 'rgba(139, 92, 246, 0.1)' },
]);
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.page-container {
  padding: $space-xl;
  overflow-y: auto;
  height: 100%;
}

.page-header {
  margin-bottom: $space-xl;
  
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    
    .dark & {
      color: #f1f5f9;
    }
  }
}

.components-list {
  display: flex;
  flex-direction: column;
  gap: $space-md;
}

.component-item {
  display: flex;
  align-items: center;
  gap: $space-md;
  padding: $space-md;
  background: #fff;
  border: 1px solid $border-light;
  border-radius: $radius-lg;
  transition: all $transition-fast;
  
  .dark & {
    background: #0f172a;
    border-color: $border-dark;
  }
  
  &:hover {
    border-color: $primary;
    box-shadow: $shadow-md;
  }
}

.item-preview {
  width: 64px;
  height: 64px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .material-symbols-outlined {
    font-size: 28px;
    color: $primary;
  }
}

.item-info {
  flex: 1;
  
  h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 4px;
    
    .dark & {
      color: #f1f5f9;
    }
  }
  
  p {
    font-size: 0.875rem;
    color: $text-muted;
  }
}

.insert-btn {
  padding: 8px 20px;
  background: $bg-light;
  border: 1px solid $border-light;
  border-radius: $radius-md;
  color: $text-secondary;
  font-weight: 500;
  transition: all $transition-fast;
  
  .dark & {
    background: #1e293b;
    border-color: $border-dark;
    color: #94a3b8;
  }
  
  &:hover {
    background: $primary;
    border-color: $primary;
    color: #fff;
  }
}
</style>
