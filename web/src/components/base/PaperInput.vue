<template>
  <div class="paper-input" :class="{ 'paper-input--error': error }">
    <label v-if="label" class="paper-input__label">
      {{ label }}
    </label>
    <div class="paper-input__wrapper">
      <input
        class="paper-input__field"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <span v-if="error" class="paper-input__error">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  error: '',
  label: '',
});

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.paper-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.paper-input__label {
  font-weight: 600;
  font-size: 14px;
  color: $pop-black;
}

.paper-input__wrapper {
  position: relative;
}

.paper-input__field {
  width: 100%;
  border: 2px solid $pop-black;
  border-radius: 0;
  padding: 12px;
  font-size: 16px;
  background: #FFFEF5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: all $transition-fast;
  
  &::placeholder {
    color: $text-muted;
  }
  
  &:focus {
    outline: none;
    transform: translate(-2px, -2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.18);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.paper-input--error {
  .paper-input__field {
    border-color: $pop-red;
    background: #FFF0F0;
  }
}

.paper-input__error {
  font-size: 12px;
  color: $pop-red;
  margin-top: 4px;
}
</style>
