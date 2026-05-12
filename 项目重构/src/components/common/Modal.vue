<script setup lang="ts">
import { X } from 'lucide-vue-next';

interface Props {
  visible?: boolean;
  title?: string;
  width?: string;
  showClose?: boolean;
  closeOnOverlay?: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'close'): void;
  (e: 'confirm'): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  title: '',
  width: '600px',
  showClose: true,
  closeOnOverlay: true,
});

const emit = defineEmits<Emits>();

const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose();
  }
};
</script>

<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" :style="{ maxWidth: width }" @click.stop>
        <div v-if="$slots.header || title" class="modal-header">
          <slot name="header">
            <h3 class="modal-title">{{ title }}</h3>
          </slot>
          <button v-if="showClose" class="modal-close" @click="handleClose">
            <X :size="18" />
          </button>
        </div>
        
        <div class="modal-body">
          <slot />
        </div>
        
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 85vh;
  width: 90%;
  display: flex;
  flex-direction: column;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.modal-header :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-header :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.modal-close:hover {
  background-color: #ef4444;
  color: white;
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(-20px);
}
</style>
