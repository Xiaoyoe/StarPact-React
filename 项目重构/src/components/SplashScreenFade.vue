<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Bot } from 'lucide-vue-next';
import { useWallpaperStore } from '@/stores';
import { invoke } from '@tauri-apps/api/core';

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
      :style="backgroundStyle"
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
