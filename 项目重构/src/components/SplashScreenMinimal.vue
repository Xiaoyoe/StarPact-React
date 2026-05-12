<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useWallpaperStore } from '@/stores';
import { invoke } from '@tauri-apps/api/core';

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

const wallpaperStore = useWallpaperStore();
const canClose = ref(false);
const useWallpaper = ref(true);

const backgroundStyle = computed(() => {
  if (useWallpaper.value && wallpaperStore.currentWallpaper) {
    return {
      backgroundImage: `url(${wallpaperStore.currentWallpaper})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return {
    backgroundColor: 'var(--bg-primary)',
  };
});

onMounted(async () => {
  if (!props.enabled) {
    emit('complete');
    return;
  }
  
  try {
    const config = await invoke<any>('storage_get_config');
    if (config.ui?.splash_screen_use_wallpaper !== undefined) {
      useWallpaper.value = config.ui.splash_screen_use_wallpaper;
    }
  } catch (error) {
    console.error('Failed to load splash screen wallpaper setting:', error);
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
      :style="backgroundStyle"
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
