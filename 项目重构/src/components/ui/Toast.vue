<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  visible?: boolean;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-container">
        <div class="toast" :class="type">
          <span class="toast-message">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}

.toast {
  padding: 12px 20px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s ease;
}

.toast.success {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}

.toast.error {
  background-color: #ef4444;
  color: white;
  border-color: #ef4444;
}

.toast.warning {
  background-color: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.toast-message {
  font-size: 14px;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
