<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

withDefaults(defineProps<Props>(), {
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning',
});

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="confirm-dialog-overlay" @click="emit('cancel')">
      <div class="confirm-dialog" @click.stop>
        <div class="dialog-icon" :class="`is-${type}`">
          <AlertTriangle :size="24" />
        </div>

        <h3 class="dialog-title">{{ title }}</h3>
        <p class="dialog-message">{{ message }}</p>

        <div class="dialog-actions">
          <button class="btn-cancel" @click="emit('cancel')">
            {{ cancelText }}
          </button>
          <button class="btn-confirm" :class="`is-${type}`" @click="emit('confirm')">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.confirm-dialog {
  width: 90%;
  max-width: 400px;
  background-color: var(--bg-primary);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.dialog-icon.is-danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.dialog-icon.is-warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.dialog-icon.is-info {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8px;
}

.dialog-message {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
  margin-bottom: 24px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background-color: var(--bg-tertiary);
}

.btn-confirm {
  color: white;
}

.btn-confirm.is-danger {
  background-color: #ef4444;
}

.btn-confirm.is-danger:hover {
  background-color: #dc2626;
}

.btn-confirm.is-warning {
  background-color: #f59e0b;
}

.btn-confirm.is-warning:hover {
  background-color: #d97706;
}

.btn-confirm.is-info {
  background-color: #3b82f6;
}

.btn-confirm.is-info:hover {
  background-color: #2563eb;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .confirm-dialog,
.modal-leave-to .confirm-dialog {
  transform: scale(0.95);
}
</style>
