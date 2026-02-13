/**
 * 优化的IndexedDB存储服务
 * 实现性能优化和兼容性增强
 */
export class IndexedDBStorageOptimized {
  private static instance: IndexedDBStorageOptimized;
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 缓存过期时间：5分钟

  /**
   * 私有构造函数
   */
  private constructor() {
    this.dbName = 'starpact-db';
    this.dbVersion = 2; // 版本升级以支持索引
    this.initDatabase();
    this.cleanupCache();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): IndexedDBStorageOptimized {
    if (!IndexedDBStorageOptimized.instance) {
      IndexedDBStorageOptimized.instance = new IndexedDBStorageOptimized();
    }
    return IndexedDBStorageOptimized.instance;
  }

  /**
   * 初始化数据库
   */
  private initDatabase(): void {
    const request = indexedDB.open(this.dbName, this.dbVersion);

    request.onerror = (event) => {
      console.error('IndexedDB初始化失败:', event);
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB初始化成功');
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建配置存储
      if (!db.objectStoreNames.contains('config')) {
        const configStore = db.createObjectStore('config', { keyPath: 'key' });
      }

      // 创建相册存储
      if (!db.objectStoreNames.contains('gallery')) {
        const galleryStore = db.createObjectStore('gallery', { keyPath: 'id' });
        galleryStore.createIndex('name', 'name', { unique: false });
      }

      // 创建播放列表存储
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistsStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistsStore.createIndex('name', 'name', { unique: false });
      }

      // 创建图片存储
      if (!db.objectStoreNames.contains('images')) {
        const imagesStore = db.createObjectStore('images', { keyPath: 'id' });
        imagesStore.createIndex('name', 'metadata.name', { unique: false });
      }

      // 创建视频存储
      if (!db.objectStoreNames.contains('videos')) {
        const videosStore = db.createObjectStore('videos', { keyPath: 'id' });
        videosStore.createIndex('name', 'metadata.name', { unique: false });
      }

      console.log('IndexedDB数据库结构更新成功');
    };
  }

  /**
   * 获取数据库实例
   */
  private async getDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      
      request.onerror = (event) => {
        reject(new Error('Failed to open IndexedDB'));
      };
    });
  }

  /**
   * 清理缓存
   */
  private cleanupCache(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.cacheExpiry.entries()) {
        if (now > expiry) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): any {
    const now = Date.now();
    if (this.cache.has(key) && this.cacheExpiry.get(key) && now < this.cacheExpiry.get(key)!) {
      return this.cache.get(key);
    }
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setToCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * 清除缓存
   */
  private clearCache(prefix?: string): void {
    if (prefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 批量存储数据
   * @param storeName 存储对象名称
   * @param items 要存储的数据数组
   */
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      let completed = 0;
      let errorOccurred = false;

      items.forEach(item => {
        const request = store.put(item);
        
        request.onsuccess = () => {
          completed++;
          if (completed === items.length) {
            resolve();
          }
        };
        
        request.onerror = (event) => {
          if (!errorOccurred) {
            errorOccurred = true;
            reject(new Error('Bulk put failed'));
          }
        };
      });

      transaction.onerror = (event) => {
        if (!errorOccurred) {
          reject(new Error('Transaction failed'));
        }
      };
    });
  }

  /**
   * 存储数据
   * @param storeName 存储对象名称
   * @param data 要存储的数据
   */
  async put<T>(storeName: string, data: T): Promise<void> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          // 更新缓存
          if (data && typeof data === 'object' && 'id' in data) {
            const cacheKey = `${storeName}:${data.id}`;
            this.setToCache(cacheKey, data);
          }
          resolve();
        };
        request.onerror = () => reject(new Error('Failed to store data'));
      });
    } catch (error) {
      console.error('Put operation failed:', error);
      throw error;
    }
  }

  /**
   * 获取数据
   * @param storeName 存储对象名称
   * @param key 数据键
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    try {
      // 尝试从缓存获取
      const cacheKey = `${storeName}:${key}`;
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as T | null;
          if (result) {
            // 设置缓存
            this.setToCache(cacheKey, result);
          }
          resolve(result);
        };
        request.onerror = () => reject(new Error('Failed to get data'));
      });
    } catch (error) {
      console.error('Get operation failed:', error);
      return null;
    }
  }

  /**
   * 通过索引获取数据
   * @param storeName 存储对象名称
   * @param indexName 索引名称
   * @param value 索引值
   */
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[] | null> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result as T[]);
        };
        request.onerror = () => reject(new Error('Failed to get data by index'));
      });
    } catch (error) {
      console.error('Get by index operation failed:', error);
      return null;
    }
  }

  /**
   * 获取所有数据
   * @param storeName 存储对象名称
   * @param limit 限制数量
   * @param offset 偏移量
   */
  async getAll<T>(storeName: string, limit?: number, offset?: number): Promise<T[]> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      let request: IDBRequest;

      if (limit || offset) {
        // 实现分页查询
        request = store.getAll();
      } else {
        request = store.getAll();
      }

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let results = request.result as T[];
          
          // 应用分页
          if (offset) {
            results = results.slice(offset);
          }
          if (limit) {
            results = results.slice(0, limit);
          }
          
          resolve(results);
        };
        request.onerror = () => reject(new Error('Failed to get all data'));
      });
    } catch (error) {
      console.error('Get all operation failed:', error);
      return [];
    }
  }

  /**
   * 删除数据
   * @param storeName 存储对象名称
   * @param key 数据键
   */
  async delete(storeName: string, key: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          // 清除缓存
          const cacheKey = `${storeName}:${key}`;
          this.cache.delete(cacheKey);
          this.cacheExpiry.delete(cacheKey);
          resolve();
        };
        request.onerror = () => reject(new Error('Failed to delete data'));
      });
    } catch (error) {
      console.error('Delete operation failed:', error);
      throw error;
    }
  }

  /**
   * 清空存储
   * @param storeName 存储对象名称
   */
  async clear(storeName: string): Promise<void> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          // 清除相关缓存
          this.clearCache(`${storeName}:`);
          resolve();
        };
        request.onerror = () => reject(new Error('Failed to clear store'));
      });
    } catch (error) {
      console.error('Clear operation failed:', error);
      throw error;
    }
  }

  /**
   * 存储文件（Blob）
   * @param storeName 存储对象名称（images或videos）
   * @param id 文件ID
   * @param blob 文件Blob
   * @param metadata 文件元数据
   */
  async storeFile(storeName: 'images' | 'videos', id: string, blob: Blob, metadata: any): Promise<void> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // 优化：对于大型文件，可以考虑压缩
      const fileData = {
        id,
        blob,
        metadata,
        timestamp: Date.now()
      };
      
      const request = store.put(fileData);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => reject(new Error('Failed to store file'));
      });
    } catch (error) {
      console.error('Store file operation failed:', error);
      throw error;
    }
  }

  /**
   * 获取文件
   * @param storeName 存储对象名称（images或videos）
   * @param id 文件ID
   */
  async getFile(storeName: 'images' | 'videos', id: string): Promise<{ blob: Blob; metadata: any } | null> {
    try {
      const db = await this.getDatabase();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve({ blob: result.blob, metadata: result.metadata });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(new Error('Failed to get file'));
      });
    } catch (error) {
      console.error('Get file operation failed:', error);
      return null;
    }
  }

  /**
   * 导出数据库
   */
  async exportDatabase(): Promise<Blob> {
    const exportData: any = {};
    
    // 导出所有存储对象
    const stores = ['config', 'gallery', 'playlists'];
    for (const store of stores) {
      exportData[store] = await this.getAll(store);
    }

    // 注意：文件数据（images和videos）由于可能很大，这里不导出
    // 实际应用中可能需要分块导出或提供选择性导出

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * 导入数据库
   * @param blob 导出的数据库Blob
   */
  async importDatabase(blob: Blob): Promise<void> {
    const text = await blob.text();
    const importData = JSON.parse(text);

    // 导入所有存储对象
    for (const [storeName, data] of Object.entries(importData)) {
      if (Array.isArray(data)) {
        // 使用批量操作优化性能
        await this.bulkPut(storeName, data);
      }
    }

    // 清除缓存
    this.clearCache();
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.clearCache();
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<{
    stores: {
      name: string;
      count: number;
    }[];
    cacheSize: number;
  }> {
    const db = await this.getDatabase();
    const stores: { name: string; count: number }[] = [];

    for (const storeName of db.objectStoreNames) {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      await new Promise((resolve) => {
        countRequest.onsuccess = () => {
          stores.push({ name: storeName, count: countRequest.result });
          resolve(null);
        };
      });
    }

    return {
      stores,
      cacheSize: this.cache.size
    };
  }
}

/**
 * 优化的IndexedDB存储实例
 */
export const indexedDBStorageOptimized = IndexedDBStorageOptimized.getInstance();
