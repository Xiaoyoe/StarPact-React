<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useThemeStore, useWallpaperStore } from '@/stores';
import Sidebar from '@/components/layout/Sidebar.vue';
import TitleBar from '@/components/layout/TitleBar.vue';

const themeStore = useThemeStore();
const wallpaperStore = useWallpaperStore();
const initialized = ref(false);

const appStyle = computed(() => {
  console.log('Computing appStyle, currentWallpaper:', wallpaperStore.currentWallpaper ? 'exists' : 'empty');
  if (wallpaperStore.currentWallpaper) {
    return {
      backgroundImage: `url(${wallpaperStore.currentWallpaper})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    };
  }
  return {};
});

const overlayStyle = computed(() => {
  if (wallpaperStore.currentWallpaper) {
    return {
      backgroundColor: 'rgba(var(--bg-primary-rgb), 0.9)',
      backdropFilter: 'blur(12px)',
    };
  }
  return {};
});

watch(() => wallpaperStore.currentWallpaper, (newVal) => {
  console.log('currentWallpaper changed:', newVal ? newVal.substring(0, 50) + '...' : 'empty');
});

onMounted(async () => {
  console.log('App mounting...');
  await themeStore.initTheme();
  await wallpaperStore.loadBackgrounds();
  initialized.value = true;
  console.log('App initialized, currentWallpaper:', wallpaperStore.currentWallpaper ? 'exists' : 'empty');
});
</script>

<template>
  <div class="app-container" :class="themeStore.theme" :style="appStyle">
    <div v-if="!initialized" class="loading-screen">
      <div class="spinner"></div>
      <span>正在初始化应用...</span>
    </div>
    
    <template v-else>
      <div class="app-overlay" :style="overlayStyle">
        <Sidebar />
        <main class="main-content">
          <TitleBar />
          <div class="page-container">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-image 0.3s ease;
}

.app-overlay {
  display: flex;
  flex: 1;
  min-width: 0;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 1rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-container {
  flex: 1;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
