import { IndexedDBStorage } from './IndexedDBStorage';
import type { LogEntry } from '@/store';

export class LogStorage {
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

  static async saveLogs(logs: LogEntry[]): Promise<boolean> {
    try {
      await this.dbStorage.put('logs', {
        id: 'system-logs',
        data: logs,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('保存日志失败:', error);
      return false;
    }
  }

  static async loadLogs(): Promise<LogEntry[] | null> {
    try {
      const result = await this.dbStorage.get<{ data: LogEntry[] }>('logs', 'system-logs');
      return result?.data || null;
    } catch (error) {
      console.error('加载日志失败:', error);
      return null;
    }
  }

  static async clearLogs(): Promise<boolean> {
    try {
      await this.dbStorage.clear('logs');
      return true;
    } catch (error) {
      console.error('清空日志失败:', error);
      return false;
    }
  }
}
