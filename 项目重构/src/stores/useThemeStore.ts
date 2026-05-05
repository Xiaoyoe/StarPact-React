import { defineStore } from 'pinia';
import type { ThemeType } from '@/types';

interface ThemeState {
  theme: ThemeType;
  fontSize: number;
  wallpaper: string;
}

const themeVariables: Record<ThemeType, Record<string, string>> = {
  light: {
    '--bg-primary': '#FFFFFF',
    '--bg-secondary': '#F7F8FA',
    '--bg-tertiary': '#F2F3F5',
    '--text-primary': '#1D2129',
    '--text-secondary': '#4E5969',
    '--text-tertiary': '#86909C',
    '--border-color': '#E5E6EB',
    '--border-light': '#F2F3F5',
    '--primary-color': '#165DFF',
    '--primary-hover': '#0E42D2',
    '--primary-light': '#E8F3FF',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(0, 0, 0, 0.04)',
  },
  dark: {
    '--bg-primary': '#17171A',
    '--bg-secondary': '#232324',
    '--bg-tertiary': '#2A2A2D',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#3D3D3F',
    '--border-light': '#2A2A2D',
    '--primary-color': '#3C7EFF',
    '--primary-hover': '#5A9FFF',
    '--primary-light': 'rgba(60, 126, 255, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'tech-blue': {
    '--bg-primary': '#FFFFFF',
    '--bg-secondary': '#F8FBFF',
    '--bg-tertiary': '#F0F5FF',
    '--text-primary': '#1D2129',
    '--text-secondary': '#4E5969',
    '--text-tertiary': '#86909C',
    '--border-color': '#D4E4FF',
    '--border-light': '#E8F3FF',
    '--primary-color': '#0A49C1',
    '--primary-hover': '#073B9E',
    '--primary-light': '#E8F3FF',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(10, 73, 193, 0.04)',
  },
  'eye-care': {
    '--bg-primary': '#FCFFFE',
    '--bg-secondary': '#F2FAF8',
    '--bg-tertiary': '#E8F5F2',
    '--text-primary': '#1D2129',
    '--text-secondary': '#4E5969',
    '--text-tertiary': '#86909C',
    '--border-color': '#D4EAE4',
    '--border-light': '#E8F5F2',
    '--primary-color': '#2A9D8F',
    '--primary-hover': '#22877A',
    '--primary-light': '#E8F5F2',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(42, 157, 143, 0.04)',
  },
  'midnight-blue': {
    '--bg-primary': '#121212',
    '--bg-secondary': '#1E1E20',
    '--bg-tertiary': '#252528',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#3A3A3D',
    '--border-light': '#252528',
    '--primary-color': '#589EFF',
    '--primary-hover': '#74B1FF',
    '--primary-light': 'rgba(88, 158, 255, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'forest-green': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#22C55E',
    '--primary-hover': '#16A34A',
    '--primary-light': 'rgba(34, 197, 94, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'coral-orange': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#F97316',
    '--primary-hover': '#EA580C',
    '--primary-light': 'rgba(249, 115, 22, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'lavender-purple': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#8B5CF6',
    '--primary-hover': '#7C3AED',
    '--primary-light': 'rgba(139, 92, 246, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'mint-cyan': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#06B6D4',
    '--primary-hover': '#0891B2',
    '--primary-light': 'rgba(6, 182, 212, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'caramel-brown': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#D97706',
    '--primary-hover': '#B45309',
    '--primary-light': 'rgba(217, 119, 6, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'sakura-pink': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#EC4899',
    '--primary-hover': '#DB2777',
    '--primary-light': 'rgba(236, 72, 153, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'deep-sea-blue': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#1E40AF',
    '--primary-hover': '#1E3A8A',
    '--primary-light': 'rgba(30, 64, 175, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
  'amber-gold': {
    '--bg-primary': '#0F172A',
    '--bg-secondary': '#1A2332',
    '--bg-tertiary': '#1E293B',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#C9CDD4',
    '--text-tertiary': '#86909C',
    '--border-color': '#334155',
    '--border-light': '#1E293B',
    '--primary-color': '#F59E0B',
    '--primary-hover': '#D97706',
    '--primary-light': 'rgba(245, 158, 11, 0.1)',
    '--success-color': '#00B42A',
    '--warning-color': '#FF7D00',
    '--error-color': '#F53F3F',
    '--hover-bg': 'rgba(255, 255, 255, 0.08)',
  },
};

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    theme: 'light',
    fontSize: 14,
    wallpaper: '',
  }),

  getters: {
    isDark: (state) => {
      const darkThemes: ThemeType[] = ['dark', 'midnight-blue', 'forest-green', 'coral-orange', 
        'lavender-purple', 'mint-cyan', 'caramel-brown', 'sakura-pink', 'deep-sea-blue', 'amber-gold'];
      return darkThemes.includes(state.theme);
    },
  },

  actions: {
    initTheme() {
      this.loadFromLocalStorage();
      this.applyTheme(this.theme);
      this.applyFontSize(this.fontSize);
    },

    setTheme(theme: ThemeType) {
      this.theme = theme;
      this.applyTheme(theme);
      this.saveToLocalStorage();
    },

    setFontSize(size: number) {
      this.fontSize = size;
      this.applyFontSize(size);
      this.saveToLocalStorage();
    },

    setWallpaper(wallpaper: string) {
      this.wallpaper = wallpaper;
      this.saveToLocalStorage();
    },

    applyTheme(theme: ThemeType) {
      const root = document.documentElement;
      const variables = themeVariables[theme];
      
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      }
      
      root.classList.remove('dark', 'theme-tech-blue', 'theme-eye-care', 'theme-midnight-blue',
        'theme-forest-green', 'theme-coral-orange', 'theme-lavender-purple', 'theme-mint-cyan',
        'theme-caramel-brown', 'theme-sakura-pink', 'theme-deep-sea-blue', 'theme-amber-gold');
      
      if (theme !== 'light') {
        root.classList.add(`theme-${theme}`);
      }
    },

    applyFontSize(size: number) {
      document.documentElement.style.fontSize = `${size}px`;
    },

    saveToLocalStorage() {
      localStorage.setItem('theme-store', JSON.stringify({
        theme: this.theme,
        fontSize: this.fontSize,
        wallpaper: this.wallpaper,
      }));
    },

    loadFromLocalStorage() {
      const saved = localStorage.getItem('theme-store');
      if (saved) {
        const data = JSON.parse(saved);
        this.theme = data.theme || 'light';
        this.fontSize = data.fontSize || 14;
        this.wallpaper = data.wallpaper || '';
      }
    },
  },
});
