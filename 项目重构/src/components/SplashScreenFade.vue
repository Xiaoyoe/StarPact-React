<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Bot } from 'lucide-vue-next';

interface Props {
  enabled: boolean;
  minDisplayTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minDisplayTime: 300
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

watch(canClose, (newVal) => {
  if (newVal) {
    setTimeout(() => emit('complete'), 200);
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    leave-to-class="opacity-0"
  >
    <div
      v-if="enabled"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      style="background-color: var(--bg-primary)"
    >
      <Transition
        leave-active-class="transition-all duration-300"
        leave-to-class="scale-110 opacity-0"
      >
        <div class="flex flex-col items-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-2xl"
            style="background-color: var(--primary-color)"
          >
            <Bot :size="40" color="white" />
          </div>
          <h1 class="mt-4 text-2xl font-bold" style="color: var(--text-primary)">
            Starpact
          </h1>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
