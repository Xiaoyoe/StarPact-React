import { IndexedDBStorage } from './IndexedDBStorage';

export interface SavedFile {
  id: string;
  name: string;
  content: string;
  side: 'left' | 'right';
  timestamp: string;
}

export interface AutoSaveData {
  id: string;
  left: string;
  right: string;
  time: string;
}

const STORE_NAME = 'text-contrast';
const AUTO_SAVE_ID = 'auto_save';
const SAVES_INDEX_ID = 'saves_index';

class TextContrastStorageClass {
  private dbStorage: IndexedDBStorage;

  constructor() {
    this.dbStorage = IndexedDBStorage.getInstance();
  }

  async loadAutoSave(): Promise<AutoSaveData | null> {
    try {
      const data = await this.dbStorage.get<AutoSaveData>(STORE_NAME, AUTO_SAVE_ID);
      return data || null;
    } catch {
      return null;
    }
  }

  async saveAutoSave(left: string, right: string): Promise<void> {
    try {
      await this.dbStorage.put<AutoSaveData>(STORE_NAME, {
        id: AUTO_SAVE_ID,
        left,
        right,
        time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }

  async loadSavesIndex(): Promise<SavedFile[]> {
    try {
      const data = await this.dbStorage.get<{ id: string; files: SavedFile[] }>(STORE_NAME, SAVES_INDEX_ID);
      return data?.files || [];
    } catch {
      return [];
    }
  }

  async persistSavesIndex(saves: SavedFile[]): Promise<void> {
    try {
      await this.dbStorage.put(STORE_NAME, {
        id: SAVES_INDEX_ID,
        files: saves,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('保存文件索引失败:', error);
    }
  }

  isValidSaveName(name: string): boolean {
    return /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(name);
  }
}

export const TextContrastStorage = new TextContrastStorageClass();
