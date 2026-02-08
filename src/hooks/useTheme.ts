import { useEffect } from 'react';
import { useStore } from '@/store';

export function useTheme() {
  const { theme, setTheme } = useStore();

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-tech-blue', 'theme-eye-care');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return { theme, setTheme };
}
