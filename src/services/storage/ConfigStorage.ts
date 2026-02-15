import { StorageManager } from './StorageManager';
import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 应用配置接口
 */
export interface AppConfig {
  // 主题设置
  theme: string;
  // 字体大小
  fontSize: number;
  // 布局模式
  layoutMode: 'compact' | 'comfortable' | 'wide';
  // Enter发送
  sendOnEnter: boolean;
  // 存储路径（保留字段，兼容旧配置）
  storagePath: string;
  // 其他配置项
  [key: string]: any;
}

/**
 * 应用配置存储服务
 */
export class ConfigStorage {
  private static instance: ConfigStorage;
  private dbStorage: IndexedDBStorage;
  private configCache: AppConfig;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.dbStorage = IndexedDBStorage.getInstance();
    this.configCache = this.getDefaultConfig();
    this.loadConfig();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AppConfig {
    return {
      theme: 'light',
      fontSize: 14,
      layoutMode: 'comfortable',
      sendOnEnter: true,
      storagePath: 'indexeddb' // 使用索引数据库
    };
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      // 延迟加载，确保 IndexedDB 初始化完成
      await new Promise(resolve => setTimeout(resolve, 500));
      const storedConfig = await this.dbStorage.get<{ data: AppConfig }>('config', 'app-config');
      if (storedConfig && storedConfig.data) {
        this.configCache = { ...this.getDefaultConfig(), ...storedConfig.data };
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      // 加载失败时使用默认配置
      this.configCache = this.getDefaultConfig();
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      await this.dbStorage.put('config', {
        key: 'app-config',
        data: this.configCache
      });
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 获取单例实例
   * @returns ConfigStorage实例
   */
  static getInstance(): ConfigStorage {
    if (!ConfigStorage.instance) {
      ConfigStorage.instance = new ConfigStorage();
    }
    return ConfigStorage.instance;
  }

  /**
   * 获取配置值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  get<T extends keyof AppConfig>(key: T, defaultValue?: AppConfig[T]): AppConfig[T] {
    return this.configCache[key] !== undefined ? this.configCache[key] : defaultValue;
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void {
    this.configCache[key] = value;
    this.saveConfig();
  }

  /**
   * 删除配置值
   * @param key 配置键
   */
  delete(key: keyof AppConfig): void {
    delete this.configCache[key];
    this.saveConfig();
  }

  /**
   * 获取所有配置
   * @returns 所有配置
   */
  getAll(): AppConfig {
    return { ...this.configCache };
  }

  /**
   * 重置配置为默认值
   */
  reset(): void {
    this.configCache = this.getDefaultConfig();
    this.saveConfig();
  }

  /**
   * 导出配置
   * @returns 配置Blob
   */
  exportConfig(): Blob {
    try {
      const config = this.getAll();
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      
      // 触发文件下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return blob;
    } catch (error) {
      console.error('导出配置失败:', error);
      throw error;
    }
  }

  /**
   * 导入配置
   * @param configData 配置数据
   * @returns 是否导入成功
   */
  importConfig(configData: AppConfig): boolean {
    try {
      // 验证配置有效性
      if (typeof configData === 'object' && configData !== null) {
        // 设置新配置
        this.configCache = { ...this.getDefaultConfig(), ...configData };
        this.saveConfig();
        return true;
      }
      return false;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }

  /**
   * 从文件导入配置
   * @param file 配置文件
   * @returns 是否导入成功
   */
  async importConfigFromFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const config = JSON.parse(text) as AppConfig;
      return this.importConfig(config);
    } catch (error) {
      console.error('从文件导入配置失败:', error);
      return false;
    }
  }

  /**
   * 迁移配置
   * @returns 是否迁移成功
   */
  migrateConfig(): boolean {
    try {
      // IndexedDB存储不需要路径迁移
      console.log('配置迁移成功');
      return true;
    } catch (error) {
      console.error('迁移配置失败:', error);
      return false;
    }
  }

  /**
   * 监听配置变化
   * @param key 配置键
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onDidChange<T extends keyof AppConfig>(key: T, callback: (newValue: AppConfig[T], oldValue: AppConfig[T]) => void): () => void {
    // IndexedDB环境中不支持实时监听，返回一个空函数
    return () => {};
  }
}

/**
 * 配置存储实例
 */
export const configStorage = ConfigStorage.getInstance();
