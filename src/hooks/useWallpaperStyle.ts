import { useState, useEffect, useMemo, useRef } from 'react';

interface WallpaperStyle {
  backgroundSize: 'cover' | 'contain';
  backgroundPosition: string;
  backgroundRepeat: 'no-repeat' | 'repeat';
}

const imageAspectCache = new Map<string, number>();

export function useWallpaperStyle(wallpaperUrl: string | null): WallpaperStyle {
  const [imageAspect, setImageAspect] = useState<number | null>(() => {
    if (!wallpaperUrl) return null;
    return imageAspectCache.get(wallpaperUrl) ?? null;
  });
  const [windowAspect, setWindowAspect] = useState<number>(() => window.innerWidth / window.innerHeight);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        setWindowAspect(window.innerWidth / window.innerHeight);
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!wallpaperUrl) {
      setImageAspect(null);
      return;
    }

    const cached = imageAspectCache.get(wallpaperUrl);
    if (cached !== undefined) {
      setImageAspect(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    
    img.onload = () => {
      if (cancelled) return;
      const aspect = img.width / img.height;
      imageAspectCache.set(wallpaperUrl, aspect);
      setImageAspect(aspect);
    };
    
    img.onerror = () => {
      if (cancelled) return;
      setImageAspect(null);
    };
    
    img.src = wallpaperUrl;

    return () => {
      cancelled = true;
    };
  }, [wallpaperUrl]);

  return useMemo(() => {
    if (!wallpaperUrl || imageAspect === null) {
      return {
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat' as const,
      };
    }

    if (imageAspect < 1) {
      return {
        backgroundSize: 'contain' as const,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat' as const,
      };
    }

    if (imageAspect > windowAspect * 1.5) {
      return {
        backgroundSize: 'contain' as const,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat' as const,
      };
    }

    return {
      backgroundSize: 'cover' as const,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat' as const,
    };
  }, [wallpaperUrl, imageAspect, windowAspect]);
}
