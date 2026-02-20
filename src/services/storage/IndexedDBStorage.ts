/**
 * IndexedDB存储服务
 * 封装IndexedDB操作，提供统一的存储API
 */
export class IndexedDBStorage {
  private static instance: IndexedDBStorage;
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null = null;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.dbName = 'starpact-db';
    this.dbVersion = 4; // 增加版本号，强制触发数据库升级
    this.initDatabase();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): IndexedDBStorage {
    if (!IndexedDBStorage.instance) {
      IndexedDBStorage.instance = new IndexedDBStorage();
    }
    return IndexedDBStorage.instance;
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

    request.onupgradeneeded = this.handleDatabaseUpgrade;
  }

  /**
   * 处理数据库升级
   */
  private handleDatabaseUpgrade = (event: IDBVersionChangeEvent): void => {
    const db = (event.target as IDBOpenDBRequest).result;
    
    // 创建配置存储
    if (!db.objectStoreNames.contains('config')) {
      db.createObjectStore('config', { keyPath: 'key' });
    }

    // 创建相册存储
    if (!db.objectStoreNames.contains('gallery')) {
      db.createObjectStore('gallery', { keyPath: 'id' });
    }

    // 创建视频播放列表存储
    if (!db.objectStoreNames.contains('video-playlists')) {
      db.createObjectStore('video-playlists', { keyPath: 'id' });
    }

    // 创建提示词模板存储
    if (!db.objectStoreNames.contains('prompt-templates')) {
      db.createObjectStore('prompt-templates', { keyPath: 'id' });
    }

    // 创建图片存储
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images', { keyPath: 'id' });
    }

    // 创建视频存储
    if (!db.objectStoreNames.contains('videos')) {
      db.createObjectStore('videos', { keyPath: 'id' });
    }

    // 创建网页快捷方式存储
    if (!db.objectStoreNames.contains('web-shortcuts')) {
      db.createObjectStore('web-shortcuts', { keyPath: 'id' });
    }

    // 创建聊天模型存储
    if (!db.objectStoreNames.contains('chat-model')) {
      db.createObjectStore('chat-model', { keyPath: 'id' });
    }

    console.log('IndexedDB数据库结构更新成功');
  };

  /**
   * 获取数据库实例
   */
  private async getDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = this.handleDatabaseUpgrade;
      
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
   * 存储数据
   * @param storeName 存储对象名称
   * @param data 要存储的数据
   */
  async put<T>(storeName: string, data: T): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store data'));
    });
  }

  /**
   * 获取数据
   * @param storeName 存储对象名称
   * @param key 数据键
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T | null);
      request.onerror = () => reject(new Error('Failed to get data'));
    });
  }

  /**
   * 获取所有数据
   * @param storeName 存储对象名称
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(new Error('Failed to get all data'));
    });
  }

  /**
   * 删除数据
   * @param storeName 存储对象名称
   * @param key 数据键
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete data'));
    });
  }

  /**
   * 清空存储
   * @param storeName 存储对象名称
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear store'));
    });
  }

  /**
   * 存储文件（Blob）
   * @param storeName 存储对象名称（images或videos）
   * @param id 文件ID
   * @param blob 文件Blob
   * @param metadata 文件元数据
   */
  async storeFile(storeName: 'images' | 'videos', id: string, blob: Blob, metadata: any): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const fileData = {
      id,
      blob,
      metadata,
      timestamp: Date.now()
    };
    
    const request = store.put(fileData);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store file'));
    });
  }

  /**
   * 获取文件
   * @param storeName 存储对象名称（images或videos）
   * @param id 文件ID
   */
  async getFile(storeName: 'images' | 'videos', id: string): Promise<{ blob: Blob; metadata: any } | null> {
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
  }

  /**
   * 导出数据库
   */
  async exportDatabase(): Promise<Blob> {
    const exportData: any = {};
    
    // 导出所有存储对象
    const stores = ['config', 'gallery', 'video-playlists', 'prompt-templates'];
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
        for (const item of data) {
          await this.put(storeName, item);
        }
      }
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}