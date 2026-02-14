import { create } from 'zustand';
import { generateId } from './index';
import { IndexedDBStorage } from '@/services/storage/IndexedDBStorage';

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

const indexedDB = IndexedDBStorage.getInstance();

export const useWebShortcutStore = create<WebShortcutState>((set) => ({
  shortcuts: [],
  addShortcut: async (shortcut) => {
    const newShortcut: WebShortcut = {
      ...shortcut,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Save to IndexedDB
    await indexedDB.put('web-shortcuts', newShortcut);
    
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
          // Save to IndexedDB
          indexedDB.put('web-shortcuts', updatedShortcut);
          return updatedShortcut;
        }
        return shortcut;
      });
      return { shortcuts: updatedShortcuts };
    });
  },
  deleteShortcut: async (id) => {
    // Delete from IndexedDB
    await indexedDB.delete('web-shortcuts', id);
    
    set((state) => ({
      shortcuts: state.shortcuts.filter((shortcut) => shortcut.id !== id),
    }));
  },
  deleteShortcuts: async (ids) => {
    // Delete from IndexedDB
    for (const id of ids) {
      await indexedDB.delete('web-shortcuts', id);
    }
    
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
          // Save to IndexedDB
          indexedDB.put('web-shortcuts', updatedShortcut);
          return updatedShortcut;
        }
        return shortcut;
      });
      return { shortcuts: updatedShortcuts };
    });
  },
  loadShortcuts: async () => {
    try {
      const shortcuts = await indexedDB.getAll<WebShortcut>('web-shortcuts');
      set({ shortcuts: shortcuts.sort((a, b) => b.updatedAt - a.updatedAt) });
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      set({ shortcuts: [] });
    }
  },
}));

// Load shortcuts on initialization
useWebShortcutStore.getState().loadShortcuts();
