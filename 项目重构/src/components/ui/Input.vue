<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputRef = ref<HTMLInputElement>();

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value);
};

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });
</script>

<template>
  <input
    ref="inputRef"
    :type="type || 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    class="input"
    @input="handleInput"
  />
</template>

<style scoped>
.input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input::placeholder {
  color: var(--text-tertiary);
}
</style>
