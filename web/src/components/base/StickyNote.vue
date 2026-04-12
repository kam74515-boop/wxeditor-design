<template>
  <div class="sticky-note" :class="[colorClass, shadowClass, { 'sticky-note--with-pin': pin }]">
    <div v-if="pin" class="sticky-note__pin"></div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  color?: 'yellow' | 'pink' | 'blue' | 'green' | 'orange' | 'purple';
  shadow?: 'sm' | 'md' | 'lg';
  pin?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'yellow',
  shadow: 'md',
  pin: false,
});

const colorClass = computed(() => `sticky-note--${props.color}`);
const shadowClass = computed(() => `sticky-note--shadow-${props.shadow}`);
</script>

<style lang="scss" scoped>
.sticky-note {
  position: relative;
  border: 2px solid $pop-black;
  border-radius: 0; /* 直角 */
  padding: 20px;
  transition: all $transition-fast;

  /* 便利贴颜色变体 */
  &--yellow { background: $sticky-yellow; }
  &--pink { background: $sticky-pink; }
  &--blue { background: $sticky-blue; }
  &--green { background: $sticky-green; }
  &--orange { background: $sticky-orange; }
  &--purple { background: $sticky-purple; }

  /* 阴影变体 */
  &--shadow-sm { box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  &--shadow-md { box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
  &--shadow-lg { box-shadow: 0 8px 18px rgba(0,0,0,0.25); }

  /* 悬停效果 */
  &:hover {
    transform: translate(-2px, -2px);
    &.sticky-note--shadow-sm { box-shadow: 6px 6px 0 $pop-black; }
    &.sticky-note--shadow-md { box-shadow: 8px 8px 0 $pop-black; }
    &.sticky-note--shadow-lg { box-shadow: 12px 12px 0 $pop-black; }
  }
}

/* 图钉装饰 */
.sticky-note__pin {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  background: $pop-red;
  border-radius: 50%;
  border: 2px solid $pop-black;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: $pop-black;
    border-radius: 50%;
  }
}
</style>
