<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    class="btn"
    :class="[variant, size]"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background-color: var(--primary-color);
  color: white;
}

.btn.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn.secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn.secondary:hover:not(:disabled) {
  background-color: var(--hover-bg);
}

.btn.ghost {
  background-color: transparent;
  color: var(--text-secondary);
}

.btn.ghost:hover:not(:disabled) {
  background-color: var(--hover-bg);
}

.btn.danger {
  background-color: #ef4444;
  color: white;
}

.btn.danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn.sm {
  padding: 4px 12px;
  font-size: 12px;
}

.btn.lg {
  padding: 12px 24px;
  font-size: 16px;
}

.spinner {
  width: 14px;
  height: 14px;
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
