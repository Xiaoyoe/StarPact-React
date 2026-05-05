import { defineStore } from 'pinia';
import type { ThemeType, PageType } from '@/types';

interface AppState {
  theme: ThemeType;
  activePage: PageType;
  sidebarCollapsed: boolean;
  initialized: boolean;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    theme: 'light',
    activePage: 'chat',
    sidebarCollapsed: false,
    initialized: false,
  }),

  getters: {
    isDark: (state) => state.theme === 'dark',
  },

  actions: {
    setTheme(theme: ThemeType) {
      this.theme = theme;
      document.documentElement.className = theme === 'light' ? '' : `theme-${theme}`;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    setActivePage(page: PageType) {
      this.activePage = page;
    },

    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },

    setInitialized(value: boolean) {
      this.initialized = value;
    },
  },
});
