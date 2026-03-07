import { IndexedDBStorage } from './IndexedDBStorage';

export interface CustomBackground {
  id: string;
  name: string;
  path: string;
  size?: number;
  addedAt: number;
}

export class BackgroundStorage {
  private static instance: BackgroundStorage;
  private db: IndexedDBStorage;
  private storeName = 'set-background';
  private imageCache: Map<string, string> = new Map();

  private constructor() {
    this.db = IndexedDBStorage.getInstance();
  }

  static getInstance(): BackgroundStorage {
    if (!BackgroundStorage.instance) {
      BackgroundStorage.instance = new BackgroundStorage();
    }
    return BackgroundStorage.instance;
  }

  async saveBackground(background: CustomBackground): Promise<void> {
    await this.db.put(this.storeName, background);
  }

  async getBackground(id: string): Promise<CustomBackground | null> {
    return this.db.get<CustomBackground>(this.storeName, id);
  }

  async getAllBackgrounds(): Promise<CustomBackground[]> {
    return this.db.getAll<CustomBackground>(this.storeName);
  }

  async deleteBackground(id: string): Promise<void> {
    await this.db.delete(this.storeName, id);
  }

  async clearAllBackgrounds(): Promise<void> {
    await this.db.clear(this.storeName);
    this.imageCache.clear();
  }

  generateId(): string {
    return `bg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async loadImageAsUrl(path: string): Promise<string> {
    if (this.imageCache.has(path)) {
      return this.imageCache.get(path)!;
    }

    if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('/src/')) {
      return path;
    }

    if (window.electronAPI?.file?.readFile) {
      try {
        const result = await window.electronAPI.file.readFile(path, 'base64');
        if (result.success && result.content) {
          const ext = path.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' : 
                          ext === 'gif' ? 'image/gif' :
                          ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${result.content}`;
          this.imageCache.set(path, dataUrl);
          return dataUrl;
        }
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    }

    return path;
  }

  clearCache(): void {
    this.imageCache.clear();
  }
}
