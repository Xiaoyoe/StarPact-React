import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 网页快捷方式接口
 */
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

/**
 * 网页快捷方式存储服务
 */
export class WebShortcutStorage {
  private static get dbStorage(): IndexedDBStorage {
    try {
      return IndexedDBStorage.getInstance();
    } catch (error) {
      console.error('Failed to get IndexedDB instance:', error);
      return {
        put: async () => {},
        get: async () => null,
        getAll: async () => [],
        delete: async () => {},
        clear: async () => {},
        storeFile: async () => {},
        getFile: async () => null,
        exportDatabase: async () => new Blob(),
        importDatabase: async () => {},
        close: () => {}
      } as any;
    }
  }

  /**
   * 保存网页快捷方式
   * @param storagePath 存储路径（兼容参数）
   * @param shortcut 快捷方式数据
   * @returns 是否保存成功
   */
  static async saveShortcut(storagePath: string, shortcut: WebShortcut): Promise<boolean> {
    try {
      await this.dbStorage.put('web-shortcuts', shortcut);
      return true;
    } catch (error) {
      console.error('保存网页快捷方式失败:', error);
      return false;
    }
  }

  /**
   * 加载网页快捷方式
   * @param storagePath 存储路径（兼容参数）
   * @param shortcutId 快捷方式ID
   * @returns 快捷方式数据或null
   */
  static async loadShortcut(storagePath: string, shortcutId: string): Promise<WebShortcut | null> {
    try {
      const shortcut = await this.dbStorage.get<WebShortcut>('web-shortcuts', shortcutId);
      return shortcut;
    } catch (error) {
      console.error('加载网页快捷方式失败:', error);
      return null;
    }
  }

  /**
   * 获取所有网页快捷方式
   * @param storagePath 存储路径（兼容参数）
   * @returns 快捷方式数组
   */
  static async getAllShortcuts(storagePath: string): Promise<WebShortcut[]> {
    try {
      const shortcuts = await this.dbStorage.getAll<WebShortcut>('web-shortcuts');
      return shortcuts;
    } catch (error) {
      console.error('获取所有网页快捷方式失败:', error);
      return [];
    }
  }

  /**
   * 删除网页快捷方式
   * @param storagePath 存储路径（兼容参数）
   * @param shortcutId 快捷方式ID
   * @returns 是否删除成功
   */
  static async deleteShortcut(storagePath: string, shortcutId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('web-shortcuts', shortcutId);
      return true;
    } catch (error) {
      console.error('删除网页快捷方式失败:', error);
      return false;
    }
  }

  /**
   * 批量删除网页快捷方式
   * @param storagePath 存储路径（兼容参数）
   * @param shortcutIds 快捷方式ID数组
   * @returns 是否删除成功
   */
  static async deleteShortcuts(storagePath: string, shortcutIds: string[]): Promise<boolean> {
    try {
      for (const shortcutId of shortcutIds) {
        await this.dbStorage.delete('web-shortcuts', shortcutId);
      }
      return true;
    } catch (error) {
      console.error('批量删除网页快捷方式失败:', error);
      return false;
    }
  }
}

/**
 * 同步方法（兼容旧代码）
 */
export class WebShortcutStorageSync {
  static saveShortcut(storagePath: string, shortcut: WebShortcut): boolean {
    WebShortcutStorage.saveShortcut(storagePath, shortcut).catch(console.error);
    return true;
  }

  static loadShortcut(storagePath: string, shortcutId: string): WebShortcut | null {
    return null;
  }

  static getAllShortcuts(storagePath: string): WebShortcut[] {
    return [];
  }

  static deleteShortcut(storagePath: string, shortcutId: string): boolean {
    WebShortcutStorage.deleteShortcut(storagePath, shortcutId).catch(console.error);
    return true;
  }

  static deleteShortcuts(storagePath: string, shortcutIds: string[]): boolean {
    WebShortcutStorage.deleteShortcuts(storagePath, shortcutIds).catch(console.error);
    return true;
  }
}
