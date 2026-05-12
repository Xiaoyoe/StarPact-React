import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

export interface WallpaperItem {
  id: string;
  name: string;
  path: string;
  added_at: number;
  thumbnailUrl?: string;
}

export const useWallpaperStore = defineStore('wallpaper', () => {
  const wallpapers = ref<WallpaperItem[]>([]);
  const currentWallpaper = ref<string>('');
  const currentWallpaperId = ref<string | null>(null);
  const selectedWallpaperId = ref<string | null>(null);
  const previewWallpaper = ref<string>('');
  const previewWallpaperInfo = ref<{ name: string; path?: string } | null>(null);
  const doubleClickToChange = ref(false);
  const isLoading = ref(false);
  const thumbnailCache = ref<Map<string, string>>(new Map());

  const hasWallpaper = computed(() => !!currentWallpaper.value);
  const wallpaperCount = computed(() => wallpapers.value.length);

  function getThumbnailUrl(path: string): string {
    if (thumbnailCache.value.has(path)) {
      return thumbnailCache.value.get(path)!;
    }
    
    try {
      const url = convertFileSrc(path);
      thumbnailCache.value.set(path, url);
      return url;
    } catch {
      return '';
    }
  }

  async function loadBackgrounds(): Promise<void> {
    isLoading.value = true;
    try {
      const items = await invoke<WallpaperItem[]>('get_wallpapers');
      
      wallpapers.value = items.map(item => ({
        ...item,
        thumbnailUrl: getThumbnailUrl(item.path),
      }));
      
      const active = await invoke<WallpaperItem | null>('get_active_wallpaper');
      if (active) {
        currentWallpaperId.value = active.id;
        currentWallpaper.value = getThumbnailUrl(active.path);
      }
      
      const doubleClickSetting = await invoke<string | null>('get_wallpaper_setting', { key: 'doubleClickToChange' });
      if (doubleClickSetting !== null) {
        doubleClickToChange.value = doubleClickSetting === 'true';
      }
    } catch (error) {
      console.error('Failed to load wallpapers:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function setCurrentWallpaper(path: string, id: string | null = null): Promise<void> {
    currentWallpaper.value = path;
    currentWallpaperId.value = id;
    
    try {
      if (id) {
        await invoke('set_active_wallpaper', { id });
      } else {
        await invoke('clear_active_wallpaper');
      }
    } catch (error) {
      console.error('Failed to save wallpaper setting:', error);
    }
  }

  async function setDoubleClickToChange(value: boolean): Promise<void> {
    doubleClickToChange.value = value;
    try {
      await invoke('set_wallpaper_setting', { key: 'doubleClickToChange', value: String(value) });
    } catch (error) {
      console.error('Failed to save double click setting:', error);
    }
  }

  async function addWallpaperFromFile(): Promise<WallpaperItem | null> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
      });
      
      if (selected) {
        const filePath = typeof selected === 'string' ? selected : (selected as any).path;
        const fileName = filePath.split(/[/\\]/).pop() || 'wallpaper';
        const name = fileName.replace(/\.[^/.]+$/, '');
        
        const wallpaper = await invoke<WallpaperItem>('add_wallpaper_from_path', {
          filePath,
          name,
        });
        
        const wallpaperWithUrl = {
          ...wallpaper,
          thumbnailUrl: getThumbnailUrl(wallpaper.path),
        };
        
        wallpapers.value.push(wallpaperWithUrl);
        return wallpaperWithUrl;
      }
    } catch (error) {
      console.error('Failed to add wallpaper:', error);
    }
    return null;
  }

  async function addWallpaperFromUrl(url: string, name: string): Promise<WallpaperItem | null> {
    try {
      const wallpaper = await invoke<WallpaperItem>('add_wallpaper_from_url', { url, name });
      const wallpaperWithUrl = {
        ...wallpaper,
        thumbnailUrl: url,
      };
      wallpapers.value.push(wallpaperWithUrl);
      return wallpaperWithUrl;
    } catch (error) {
      console.error('Failed to add wallpaper from URL:', error);
      return null;
    }
  }

  async function deleteWallpaper(id: string): Promise<void> {
    const index = wallpapers.value.findIndex(w => w.id === id);
    if (index >= 0) {
      try {
        const wallpaper = wallpapers.value[index];
        await invoke('delete_wallpaper', { id });
        wallpapers.value.splice(index, 1);
        
        if (wallpaper.path) {
          thumbnailCache.value.delete(wallpaper.path);
        }
        
        if (selectedWallpaperId.value === id) {
          selectedWallpaperId.value = null;
          if (currentWallpaperId.value === id) {
            await setCurrentWallpaper('', null);
          }
        }
      } catch (error) {
        console.error('Failed to delete wallpaper:', error);
      }
    }
  }

  async function clearAllWallpapers(): Promise<void> {
    try {
      await invoke('clear_all_wallpapers');
      wallpapers.value = [];
      thumbnailCache.value.clear();
      await setCurrentWallpaper('', null);
      selectedWallpaperId.value = null;
      previewWallpaper.value = '';
      previewWallpaperInfo.value = null;
    } catch (error) {
      console.error('Failed to clear wallpapers:', error);
    }
  }

  function selectWallpaper(wallpaper: WallpaperItem): void {
    selectedWallpaperId.value = wallpaper.id;
    previewWallpaperInfo.value = { name: wallpaper.name, path: wallpaper.path };
    previewWallpaper.value = wallpaper.thumbnailUrl || getThumbnailUrl(wallpaper.path);
    
    if (!doubleClickToChange.value) {
      setCurrentWallpaper(previewWallpaper.value, wallpaper.id);
    }
  }

  function applyWallpaper(wallpaper: WallpaperItem): void {
    selectedWallpaperId.value = wallpaper.id;
    previewWallpaperInfo.value = { name: wallpaper.name, path: wallpaper.path };
    previewWallpaper.value = wallpaper.thumbnailUrl || getThumbnailUrl(wallpaper.path);
    setCurrentWallpaper(previewWallpaper.value, wallpaper.id);
  }

  async function clearWallpaper(): Promise<void> {
    await setCurrentWallpaper('', null);
    selectedWallpaperId.value = null;
    previewWallpaper.value = '';
    previewWallpaperInfo.value = null;
  }

  function getWallpaperById(id: string): WallpaperItem | undefined {
    return wallpapers.value.find(w => w.id === id);
  }

  function isActive(id: string): boolean {
    return currentWallpaperId.value === id;
  }

  return {
    wallpapers,
    currentWallpaper,
    currentWallpaperId,
    selectedWallpaperId,
    previewWallpaper,
    previewWallpaperInfo,
    doubleClickToChange,
    isLoading,
    hasWallpaper,
    wallpaperCount,
    thumbnailCache,
    getThumbnailUrl,
    loadBackgrounds,
    setCurrentWallpaper,
    setDoubleClickToChange,
    addWallpaperFromFile,
    addWallpaperFromUrl,
    deleteWallpaper,
    clearAllWallpapers,
    selectWallpaper,
    applyWallpaper,
    clearWallpaper,
    getWallpaperById,
    isActive,
  };
});
