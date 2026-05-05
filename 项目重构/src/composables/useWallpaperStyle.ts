import { computed } from 'vue';
import { useWallpaperStore } from '@/stores';

export function useWallpaperStyle() {
  const wallpaperStore = useWallpaperStore();

  const wallpaperStyle = computed(() => {
    if (wallpaperStore.currentWallpaper) {
      return {
        backgroundImage: `url(${wallpaperStore.currentWallpaper})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
        backgroundRepeat: 'no-repeat' as const,
        backgroundAttachment: 'fixed' as const,
      };
    }
    return {};
  });

  const hasWallpaper = computed(() => !!wallpaperStore.currentWallpaper);

  return {
    wallpaperStyle,
    hasWallpaper,
  };
}
