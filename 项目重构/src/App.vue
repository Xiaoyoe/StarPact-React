<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore, useWallpaperStore } from '@/stores';
import Sidebar from '@/components/layout/Sidebar.vue';
import TitleBar from '@/components/layout/TitleBar.vue';
import SplashScreen from '@/components/SplashScreen.vue';
import SplashScreenMinimal from '@/components/SplashScreenMinimal.vue';
import SplashScreenFade from '@/components/SplashScreenFade.vue';
import { invoke } from '@tauri-apps/api/core';

type SplashScreenType = 'full' | 'minimal' | 'fade' | 'none';

const router = useRouter();
const themeStore = useThemeStore();
const wallpaperStore = useWallpaperStore();
const initialized = ref(false);
const showSplash = ref(true);
const splashScreenType = ref<SplashScreenType>('full');
const splashScreenEnabled = ref(true);
const initProgress = ref(0);
const initStep = ref('正在初始化应用...');
const defaultPage = ref<string>('chat');

const INIT_STEPS = [
  { progress: 10, label: '正在初始化应用...' },
  { progress: 30, label: '加载配置文件...' },
  { progress: 50, label: '初始化数据存储...' },
  { progress: 70, label: '加载用户数据...' },
  { progress: 85, label: '准备界面...' },
  { progress: 95, label: '完成初始化...' },
  { progress: 100, label: '准备就绪' }
];

const appStyle = computed(() => {
  console.log('Computing appStyle, currentWallpaper:', wallpaperStore.currentWallpaper ? 'exists' : 'empty');
  if (wallpaperStore.currentWallpaper) {
    return {
      backgroundImage: `url(${wallpaperStore.currentWallpaper})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundColor: 'transparent',
    };
  }
  return {
    backgroundColor: 'var(--bg-primary)',
  };
});

const overlayStyle = computed(() => {
  return {};
});

watch(() => wallpaperStore.currentWallpaper, (newVal) => {
  console.log('currentWallpaper changed:', newVal ? newVal.substring(0, 50) + '...' : 'empty');
});

const loadSplashSettings = async () => {
  try {
    const config = await invoke<any>('storage_get_config');
    if (config.ui?.splashScreenType) {
      splashScreenType.value = config.ui.splashScreenType;
    }
    if (config.ui?.splashScreenEnabled !== undefined) {
      splashScreenEnabled.value = config.ui.splashScreenEnabled;
    }
    if (config.ui?.default_page) {
      defaultPage.value = config.ui.default_page;
    }
    
    if (!splashScreenEnabled.value || splashScreenType.value === 'none') {
      showSplash.value = false;
    }
  } catch (error) {
    console.error('Failed to load splash settings:', error);
  }
};

const handleSplashComplete = () => {
  showSplash.value = false;
};

onMounted(async () => {
  console.log('App mounting...');
  
  initProgress.value = INIT_STEPS[0].progress;
  initStep.value = INIT_STEPS[0].label;
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  initProgress.value = INIT_STEPS[1].progress;
  initStep.value = INIT_STEPS[1].label;
  
  await loadSplashSettings();
  
  initProgress.value = INIT_STEPS[2].progress;
  initStep.value = INIT_STEPS[2].label;
  
  await themeStore.initTheme();
  
  initProgress.value = INIT_STEPS[3].progress;
  initStep.value = INIT_STEPS[3].label;
  
  await wallpaperStore.loadBackgrounds();
  
  initProgress.value = INIT_STEPS[4].progress;
  initStep.value = INIT_STEPS[4].label;
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  initProgress.value = INIT_STEPS[5].progress;
  initStep.value = INIT_STEPS[5].label;
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  initProgress.value = INIT_STEPS[6].progress;
  initStep.value = INIT_STEPS[6].label;
  
  initialized.value = true;
  console.log('App initialized, currentWallpaper:', wallpaperStore.currentWallpaper ? 'exists' : 'empty');
  
  // 跳转到默认功能页
  if (defaultPage.value && defaultPage.value !== 'chat') {
    const pageMap: Record<string, string> = {
      'chat': '/',
      'models': '/models',
      'settings': '/settings',
      'compare': '/compare',
      'ini-config': '/ini-config',
      'gallery': '/gallery',
      'video-player': '/video-player',
      'prompt-templates': '/prompt-templates',
      'media-tools': '/media-tools',
    };
    
    const targetPath = pageMap[defaultPage.value] || '/';
    if (router.currentRoute.value.path !== targetPath) {
      await router.push(targetPath);
    }
  }
});
</script>

<template>
  <div class="app-container" :class="themeStore.theme" :style="appStyle">
    <!-- Splash Screen -->
    <SplashScreen
      v-if="showSplash && splashScreenEnabled && splashScreenType === 'full'"
      :enabled="splashScreenEnabled"
      :progress="initProgress"
      :current-step="initStep"
      @complete="handleSplashComplete"
    />
    
    <SplashScreenMinimal
      v-else-if="showSplash && splashScreenEnabled && splashScreenType === 'minimal'"
      :enabled="splashScreenEnabled"
      :progress="initProgress"
      @complete="handleSplashComplete"
    />
    
    <SplashScreenFade
      v-else-if="showSplash && splashScreenEnabled && splashScreenType === 'fade'"
      :enabled="splashScreenEnabled"
      @complete="handleSplashComplete"
    />
    
    <!-- Loading Screen -->
    <div v-else-if="!initialized" class="loading-screen">
      <div class="spinner"></div>
      <span>正在初始化应用...</span>
    </div>
    
    <!-- Main App -->
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
  color: var(--text-primary);
  transition: background-image 0.3s ease, background-color 0.3s ease;
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
