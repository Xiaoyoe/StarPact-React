<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-vue-next';

const isMaximized = ref(false);
const appWindow = getCurrentWindow();

onMounted(async () => {
  try {
    isMaximized.value = await appWindow.isMaximized();
  } catch (error) {
    console.warn('Failed to check maximized state:', error);
  }
});

const handleMinimize = async () => {
  try {
    await appWindow.minimize();
  } catch (error) {
    console.warn('Failed to minimize:', error);
  }
};

const handleMaximize = async () => {
  try {
    await appWindow.toggleMaximize();
    isMaximized.value = await appWindow.isMaximized();
  } catch (error) {
    console.warn('Failed to toggle maximize:', error);
  }
};

const handleClose = async () => {
  try {
    await appWindow.close();
  } catch (error) {
    console.warn('Failed to close:', error);
  }
};
</script>

<template>
  <div class="title-bar" data-tauri-drag-region>
    <div class="title-bar-content" data-tauri-drag-region>
      <span class="app-title">星约 - Starpact</span>
    </div>
    
    <div class="window-controls">
      <button class="control-btn" @click="handleMinimize" title="最小化">
        <Minus :size="16" />
      </button>
      <button class="control-btn" @click="handleMaximize" title="最大化">
        <Square :size="14" />
      </button>
      <button class="control-btn close" @click="handleClose" title="关闭">
        <X :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  height: 32px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  user-select: none;
}

.title-bar-content {
  flex: 1;
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 12px;
  color: var(--text-secondary);
}

.window-controls {
  display: flex;
  height: 100%;
}

.control-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background-color 0.2s ease;
}

.control-btn:hover {
  background-color: var(--hover-bg);
}

.control-btn.close:hover {
  background-color: #e53935;
  color: white;
}
</style>
