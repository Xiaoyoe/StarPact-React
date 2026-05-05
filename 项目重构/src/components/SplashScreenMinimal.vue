<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

interface Props {
  enabled: boolean;
  progress: number;
  minDisplayTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minDisplayTime: 500
});

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const canClose = ref(false);

onMounted(() => {
  if (!props.enabled) {
    emit('complete');
    return;
  }
  
  setTimeout(() => {
    canClose.value = true;
  }, props.minDisplayTime);
});

watch([() => props.progress, canClose], ([newProgress, newCanClose]) => {
  if (newProgress >= 100 && newCanClose) {
    setTimeout(() => emit('complete'), 150);
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="enabled"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      style="background-color: var(--bg-primary)"
    >
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
          style="border-color: var(--primary-color); border-top-color: transparent"
        />
        <div class="text-sm animate-fade-in" style="color: var(--text-secondary)">
          {{ progress < 100 ? '加载中...' : '准备就绪' }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>
