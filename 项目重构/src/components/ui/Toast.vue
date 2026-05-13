<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useToast, type ToastMessage, type ToastPosition, type ToastType } from '@/composables/useToast';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-vue-next';

const toast = useToast();

const progressMap = ref<Map<string, number>>(new Map());

const getIconComponent = (type: ToastType) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

const getStyleKeys = (type: ToastType) => {
  switch (type) {
    case 'success':
      return { bg: '--toast-success-bg', text: '--toast-success-text', border: '--toast-success-border' };
    case 'error':
      return { bg: '--toast-error-bg', text: '--toast-error-text', border: '--toast-error-border' };
    case 'warning':
      return { bg: '--toast-warning-bg', text: '--toast-warning-text', border: '--toast-warning-border' };
    default:
      return { bg: '--toast-info-bg', text: '--toast-info-text', border: '--toast-info-border' };
  }
};

const getPositionStyles = (position: ToastPosition) => {
  switch (position) {
    case 'top-right':
      return { top: '16px', right: '16px' };
    case 'top-center':
      return { top: '16px', left: '50%', transform: 'translateX(-50%)' };
    case 'top-left':
      return { top: '16px', left: '16px' };
    case 'bottom-right':
      return { bottom: '16px', right: '16px' };
    case 'bottom-center':
      return { bottom: '16px', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-left':
      return { bottom: '16px', left: '16px' };
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    default:
      return { top: '16px', right: '16px' };
  }
};

const getAnimationClass = (position: ToastPosition) => {
  switch (position) {
    case 'top-right':
    case 'bottom-right':
      return 'slide-right';
    case 'top-left':
    case 'bottom-left':
      return 'slide-left';
    case 'top-center':
      return 'slide-down';
    case 'bottom-center':
      return 'slide-up';
    case 'center':
      return 'scale';
    default:
      return 'slide-right';
  }
};

const messagesByPosition = computed(() => {
  const result: Record<ToastPosition, ToastMessage[]> = {
    'top-right': [],
    'top-center': [],
    'top-left': [],
    'bottom-right': [],
    'bottom-center': [],
    'bottom-left': [],
    'center': []
  };
  
  for (const message of toast.messages.value) {
    result[message.position].push(message);
  }
  
  return result;
});

const handleRemove = (id: string) => {
  toast.remove(id);
};

onMounted(() => {
  const startTime = Date.now();
  
  const updateProgress = () => {
    const now = Date.now();
    for (const message of toast.messages.value) {
      const elapsed = now - (startTime + (now - startTime));
      const progress = Math.min(100, (elapsed / message.duration) * 100);
      progressMap.value.set(message.id, 100 - progress);
    }
    requestAnimationFrame(updateProgress);
  };
  
  requestAnimationFrame(updateProgress);
});

watch(() => toast.messages.value, (messages) => {
  for (const msg of messages) {
    if (!progressMap.value.has(msg.id)) {
      progressMap.value.set(msg.id, 100);
    }
  }
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <template v-for="(positionMessages, position) in messagesByPosition" :key="position">
      <div
        v-if="positionMessages.length > 0"
        class="toast-container"
        :style="getPositionStyles(position as ToastPosition)"
      >
        <TransitionGroup :name="`toast-${getAnimationClass(position as ToastPosition)}`">
          <div
            v-for="message in positionMessages"
            :key="message.id"
            class="toast-item"
            :class="[`toast-${message.type}`]"
            :style="{
              background: `var(${getStyleKeys(message.type).bg})`,
              color: `var(${getStyleKeys(message.type).text})`,
              borderLeftColor: `var(${getStyleKeys(message.type).border})`
            }"
            @click="handleRemove(message.id)"
          >
            <div class="toast-icon-wrapper">
              <component :is="getIconComponent(message.type)" :size="16" class="toast-icon" />
            </div>
            <span class="toast-text">{{ message.text }}</span>
            <div 
              class="toast-progress" 
              :style="{
                backgroundColor: `var(${getStyleKeys(message.type).border})`,
                animationDuration: `${message.duration}ms`
              }"
            ></div>
          </div>
        </TransitionGroup>
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 3px solid;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  max-width: 340px;
  word-break: break-word;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), 
              box-shadow 0.2s ease;
}

.toast-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

.toast-item:hover {
  transform: scale(1.02) translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.toast-item:active {
  transform: scale(0.98);
}

.toast-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-icon {
  animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-success .toast-icon {
  animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
             successPulse 2s ease-in-out infinite 0.4s;
}

.toast-error .toast-icon {
  animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
             errorShake 0.5s ease-in-out 0.4s;
}

.toast-warning .toast-icon {
  animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
             warningBounce 1s ease-in-out infinite 0.4s;
}

.toast-info .toast-icon {
  animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), 
             infoFloat 2s ease-in-out infinite 0.4s;
}

@keyframes iconPop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes successPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes errorShake {
  0%, 100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-3px);
  }
  40% {
    transform: translateX(3px);
  }
  60% {
    transform: translateX(-2px);
  }
  80% {
    transform: translateX(2px);
  }
}

@keyframes warningBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes infoFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-2px) rotate(2deg);
  }
  75% {
    transform: translateY(-2px) rotate(-2deg);
  }
}

.toast-text {
  flex: 1;
  min-width: 0;
  animation: textSlideIn 0.3s ease-out 0.1s both;
}

@keyframes textSlideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  transform-origin: left;
  animation: progressShrink linear forwards;
  opacity: 0.6;
  border-radius: 0 0 10px 10px;
}

@keyframes progressShrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.toast-slide-right-enter-active {
  animation: slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-right-leave-active {
  animation: slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
  }
  50% {
    transform: translateX(-10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slideOutRight {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
  }
}

.toast-slide-left-enter-active {
  animation: slideInLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-left-leave-active {
  animation: slideOutLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInLeft {
  0% {
    opacity: 0;
    transform: translateX(-100%) scale(0.8);
  }
  50% {
    transform: translateX(10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slideOutLeft {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-100%) scale(0.8);
  }
}

.toast-slide-down-enter-active {
  animation: slideInDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-down-leave-active {
  animation: slideOutUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInDown {
  0% {
    opacity: 0;
    transform: translateY(-100%) scale(0.8);
  }
  50% {
    transform: translateY(10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100%) scale(0.8);
  }
}

.toast-slide-up-enter-active {
  animation: slideInUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-up-leave-active {
  animation: slideOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInUp {
  0% {
    opacity: 0;
    transform: translateY(100%) scale(0.8);
  }
  50% {
    transform: translateY(-10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutDown {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(100%) scale(0.8);
  }
}

.toast-scale-enter-active {
  animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-scale-leave-active {
  animation: scaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes scaleOut {
  0% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: scale(0) rotate(10deg);
  }
}
</style>
