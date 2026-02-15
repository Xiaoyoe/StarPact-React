import { create } from 'zustand';
import { generateId } from './index';
import { WebShortcutStorage } from '@/services/storage/WebShortcutStorage';

export interface WebShortcut {
  id: string;
  title: string;
  url: string;
  description: string;
  icon: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

interface WebShortcutState {
  shortcuts: WebShortcut[];
  addShortcut: (shortcut: Omit<WebShortcut, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateShortcut: (id: string, updates: Partial<WebShortcut>) => void;
  deleteShortcut: (id: string) => void;
  deleteShortcuts: (ids: string[]) => void;
  toggleFavorite: (id: string) => void;
  loadShortcuts: () => Promise<void>;
}

export const useWebShortcutStore = create<WebShortcutState>((set) => ({
  shortcuts: [],
  addShortcut: async (shortcut) => {
    const newShortcut: WebShortcut = {
      ...shortcut,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await WebShortcutStorage.saveShortcut('', newShortcut);
    
    set((state) => ({
      shortcuts: [newShortcut, ...state.shortcuts],
    }));
  },
  updateShortcut: async (id, updates) => {
    set((state) => {
      const updatedShortcuts = state.shortcuts.map((shortcut) => {
        if (shortcut.id === id) {
          const updatedShortcut = {
            ...shortcut,
            ...updates,
            updatedAt: Date.now(),
          };
          WebShortcutStorage.saveShortcut('', updatedShortcut);
          return updatedShortcut;
        }
        return shortcut;
      });
      return { shortcuts: updatedShortcuts };
    });
  },
  deleteShortcut: async (id) => {
    await WebShortcutStorage.deleteShortcut('', id);
    
    set((state) => ({
      shortcuts: state.shortcuts.filter((shortcut) => shortcut.id !== id),
    }));
  },
  deleteShortcuts: async (ids) => {
    await WebShortcutStorage.deleteShortcuts('', ids);
    
    set((state) => ({
      shortcuts: state.shortcuts.filter((shortcut) => !ids.includes(shortcut.id)),
    }));
  },
  toggleFavorite: async (id) => {
    set((state) => {
      const updatedShortcuts = state.shortcuts.map((shortcut) => {
        if (shortcut.id === id) {
          const updatedShortcut = {
            ...shortcut,
            isFavorite: !shortcut.isFavorite,
            updatedAt: Date.now(),
          };
          WebShortcutStorage.saveShortcut('', updatedShortcut);
          return updatedShortcut;
        }
        return shortcut;
      });
      return { shortcuts: updatedShortcuts };
    });
  },
  loadShortcuts: async () => {
    try {
      const shortcuts = await WebShortcutStorage.getAllShortcuts('');
      set({ shortcuts: shortcuts.sort((a, b) => b.updatedAt - a.updatedAt) });
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      set({ shortcuts: [] });
    }
  },
}));

// Load shortcuts on initialization (with error handling)
setTimeout(() => {
  useWebShortcutStore.getState().loadShortcuts().catch(error => {
    console.error('Failed to load shortcuts during initialization:', error);
  });
}, 1000); // Delay to ensure IndexedDB is initialized
