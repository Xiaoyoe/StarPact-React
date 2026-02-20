import { IndexedDBStorage } from './IndexedDBStorage';

export interface StorageStats {
  storeName: string;
  count: number;
  size: number;
  lastUpdated: number | null;
  health: 'healthy' | 'warning' | 'error';
  message?: string;
}

export interface StorageHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  stores: StorageStats[];
  totalSize: number;
  totalRecords: number;
  checkedAt: number;
}

export class StorageMonitor {
  private static stores = [
    'config',
    'gallery',
    'video-playlists',
    'prompt-templates',
    'images',
    'videos',
    'web-shortcuts',
    'chat-model'
  ];

  static async getStoreStats(storeName: string): Promise<StorageStats> {
    try {
      const dbStorage = IndexedDBStorage.getInstance();
      const allData = await dbStorage.getAll<any>(storeName);
      const count = allData.length;
      
      const jsonString = JSON.stringify(allData);
      const size = new Blob([jsonString]).size;
      
      const lastUpdated = allData.length > 0 
        ? Math.max(...allData.map(item => item.updatedAt || item.timestamp || 0))
        : null;
      
      let health: 'healthy' | 'warning' | 'error' = 'healthy';
      let message: string | undefined;
      
      if (size > 50 * 1024 * 1024) {
        health = 'warning';
        message = '存储空间较大，建议清理';
      }
      
      return {
        storeName,
        count,
        size,
        lastUpdated,
        health,
        message
      };
    } catch (error) {
      return {
        storeName,
        count: 0,
        size: 0,
        lastUpdated: null,
        health: 'error',
        message: `获取存储状态失败: ${error}`
      };
    }
  }

  static async getHealthReport(): Promise<StorageHealthReport> {
    try {
      const storeStats = await Promise.all(
        this.stores.map(store => this.getStoreStats(store))
      );
      
      const totalSize = storeStats.reduce((sum, stats) => sum + stats.size, 0);
      const totalRecords = storeStats.reduce((sum, stats) => sum + stats.count, 0);
      
      const hasError = storeStats.some(s => s.health === 'error');
      const hasWarning = storeStats.some(s => s.health === 'warning');
      
      let overall: 'healthy' | 'warning' | 'error' = 'healthy';
      if (hasError) {
        overall = 'error';
      } else if (hasWarning) {
        overall = 'warning';
      }
      
      return {
        overall,
        stores: storeStats,
        totalSize,
        totalRecords,
        checkedAt: Date.now()
      };
    } catch (error) {
      console.error('获取存储健康报告失败:', error);
      return {
        overall: 'error',
        stores: [],
        totalSize: 0,
        totalRecords: 0,
        checkedAt: Date.now()
      };
    }
  }

  static formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  static async checkStorageAvailability(): Promise<{
    available: boolean;
    type: string;
    estimatedQuota?: number;
    estimatedUsage?: number;
  }> {
    try {
      if (!('indexedDB' in window)) {
        return {
          available: false,
          type: 'none'
        };
      }

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          available: true,
          type: 'indexeddb',
          estimatedQuota: estimate.quota,
          estimatedUsage: estimate.usage
        };
      }

      return {
        available: true,
        type: 'indexeddb'
      };
    } catch (error) {
      console.error('检查存储可用性失败:', error);
      return {
        available: false,
        type: 'unknown'
      };
    }
  }

  static async clearStore(storeName: string): Promise<boolean> {
    try {
      const dbStorage = IndexedDBStorage.getInstance();
      await dbStorage.clear(storeName);
      console.log(`存储 ${storeName} 已清空`);
      return true;
    } catch (error) {
      console.error(`清空存储 ${storeName} 失败:`, error);
      return false;
    }
  }
}
