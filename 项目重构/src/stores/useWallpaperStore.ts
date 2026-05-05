import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface Wallpaper {
  id: string;
  name: string;
  file_path: string;
  size: number;
  added_at: number;
  is_active: boolean;
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  const customBackgrounds = ref<Wallpaper[]>([]);
  const currentWallpaper = ref<string>('');
  const currentWallpaperId = ref<string | null>(null);
  const selectedBackgroundId = ref<string | null>(null);
  const previewWallpaper = ref<string>('');
  const previewWallpaperInfo = ref<{ name: string; size?: number; path?: string } | null>(null);
  const doubleClickToChange = ref(false);
  const isLoading = ref(false);

  const hasWallpaper = computed(() => !!currentWallpaper.value);
  const wallpaperCount = computed(() => customBackgrounds.value.length);

  const loadBackgrounds = async () => {
    isLoading.value = true;
    try {
      const wallpapers = await invoke<Wallpaper[]>('get_wallpapers');
      customBackgrounds.value = wallpapers;
      console.log('Loaded wallpapers:', wallpapers);
      
      const active = await invoke<Wallpaper | null>('get_active_wallpaper');
      console.log('Active wallpaper:', active);
      if (active) {
        currentWallpaperId.value = active.id;
        const base64 = await invoke<string>('read_wallpaper_file', { id: active.id });
        currentWallpaper.value = `data:image/png;base64,${base64}`;
        console.log('Current wallpaper set:', currentWallpaper.value.substring(0, 50) + '...');
      }
      
      const doubleClickSetting = await invoke<string | null>('get_wallpaper_setting', { key: 'doubleClickToChange' });
      if (doubleClickSetting !== null) {
        doubleClickToChange.value = doubleClickSetting === 'true';
      }
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
    } finally {
      isLoading.value = false;
    }
  };

  const setCurrentWallpaper = async (path: string, id: string | null = null) => {
    console.log('Setting current wallpaper:', id, path ? path.substring(0, 50) + '...' : 'empty');
    currentWallpaper.value = path;
    currentWallpaperId.value = id;
    
    try {
      if (id) {
        await invoke('set_active_wallpaper', { id });
        console.log('Active wallpaper saved to database:', id);
      } else {
        await invoke('clear_active_wallpaper');
        console.log('Active wallpaper cleared');
      }
    } catch (error) {
      console.error('Failed to save wallpaper setting:', error);
    }
  };

  const setDoubleClickToChange = async (value: boolean) => {
    doubleClickToChange.value = value;
    try {
      await invoke('set_wallpaper_setting', { key: 'doubleClickToChange', value: String(value) });
    } catch (error) {
      console.error('Failed to save double click setting:', error);
    }
  };

  const addBackground = async (file: File): Promise<Wallpaper | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        
        try {
          const name = file.name.replace(/\.[^/.]+$/, '');
          const wallpaper = await invoke<Wallpaper>('add_wallpaper', { 
            name, 
            fileData: base64 
          });
          customBackgrounds.value.push(wallpaper);
          resolve(wallpaper);
        } catch (error) {
          console.error('Failed to save background:', error);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const deleteBackground = async (id: string) => {
    const index = customBackgrounds.value.findIndex(bg => bg.id === id);
    if (index >= 0) {
      try {
        await invoke('delete_wallpaper', { id });
        customBackgrounds.value.splice(index, 1);
        
        if (selectedBackgroundId.value === id) {
          selectedBackgroundId.value = null;
          if (currentWallpaperId.value === id) {
            await setCurrentWallpaper('', null);
          }
        }
      } catch (error) {
        console.error('Failed to delete background:', error);
      }
    }
  };

  const clearAllBackgrounds = async () => {
    try {
      await invoke('clear_all_wallpapers');
      customBackgrounds.value = [];
      await setCurrentWallpaper('', null);
      selectedBackgroundId.value = null;
      previewWallpaper.value = '';
      previewWallpaperInfo.value = null;
    } catch (error) {
      console.error('Failed to clear backgrounds:', error);
    }
  };

  const selectBackground = async (bg: Wallpaper) => {
    selectedBackgroundId.value = bg.id;
    previewWallpaperInfo.value = { name: bg.name, size: bg.size, path: bg.file_path };
    
    try {
      const base64 = await invoke<string>('read_wallpaper_file', { id: bg.id });
      previewWallpaper.value = `data:image/png;base64,${base64}`;
      
      if (!doubleClickToChange.value) {
        await setCurrentWallpaper(previewWallpaper.value, bg.id);
      }
    } catch (error) {
      console.error('Failed to read wallpaper:', error);
    }
  };

  const applyBackground = async (bg: Wallpaper) => {
    selectedBackgroundId.value = bg.id;
    previewWallpaperInfo.value = { name: bg.name, size: bg.size, path: bg.file_path };
    
    try {
      const base64 = await invoke<string>('read_wallpaper_file', { id: bg.id });
      previewWallpaper.value = `data:image/png;base64,${base64}`;
      await setCurrentWallpaper(previewWallpaper.value, bg.id);
    } catch (error) {
      console.error('Failed to apply wallpaper:', error);
    }
  };

  const clearWallpaper = async () => {
    await setCurrentWallpaper('', null);
    selectedBackgroundId.value = null;
    previewWallpaper.value = '';
    previewWallpaperInfo.value = null;
  };

  const getBackgroundById = (id: string): Wallpaper | undefined => {
    return customBackgrounds.value.find(bg => bg.id === id);
  };

  return {
    customBackgrounds,
    currentWallpaper,
    currentWallpaperId,
    selectedBackgroundId,
    previewWallpaper,
    previewWallpaperInfo,
    doubleClickToChange,
    isLoading,
    hasWallpaper,
    wallpaperCount,
    loadBackgrounds,
    setCurrentWallpaper,
    setDoubleClickToChange,
    addBackground,
    deleteBackground,
    clearAllBackgrounds,
    selectBackground,
    applyBackground,
    clearWallpaper,
    getBackgroundById,
  };
});
