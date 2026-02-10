import { StorageManager } from './StorageManager';

// 检查是否为浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// 条件导入 Electron 模块
let app: any = null;
let Store: any = null;
if (!isBrowser) {
  try {
    const electron = require('electron');
    app = electron.app;
    Store = require('electron-store');
  } catch (error) {
    console.warn('Electron 模块不可用:', error);
  }
}

// 浏览器兼容的 path 模块实现
const path = isBrowser ? {
  join: (...parts: string[]) => parts.join('/'),
  resolve: (part: string) => part,
  basename: (filePath: string) => filePath.split('/').pop() || '',
  extname: (filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }
} : require('path');

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
  // 存储路径
  storagePath: string;
  // 其他配置项
  [key: string]: any;
}

/**
 * 应用配置存储服务
 */
export class ConfigStorage {
  private static instance: ConfigStorage;
  private store: Store<AppConfig>;

  /**
   * 私有构造函数
   */
  private constructor() {
    if (isBrowser) {
      // 浏览器环境使用 localStorage
      this.store = this.createBrowserStore() as any;
    } else {
      // Electron 环境使用 electron-store
      const configPath = this.getConfigPath();
      this.store = new Store<AppConfig>({
        cwd: configPath,
        name: 'app-config',
        defaults: {
          theme: 'light',
          fontSize: 14,
          layoutMode: 'comfortable',
          sendOnEnter: true,
          storagePath: this.getDefaultStoragePath()
        }
      });
    }
  }

  /**
   * 创建浏览器环境的存储实现
   */
  private createBrowserStore() {
    const STORAGE_KEY = 'starpact-app-config';
    
    // 从 localStorage 加载配置
    const loadConfig = (): AppConfig => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error('加载配置失败:', error);
      }
      
      // 默认配置
      return {
        theme: 'light',
        fontSize: 14,
        layoutMode: 'comfortable',
        sendOnEnter: true,
        storagePath: this.getDefaultStoragePath()
      };
    };
    
    // 保存配置到 localStorage
    const saveConfig = (config: AppConfig) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch (error) {
        console.error('保存配置失败:', error);
      }
    };
    
    let config = loadConfig();
    
    return {
      get: <T extends keyof AppConfig>(key: T, defaultValue?: AppConfig[T]) => {
        return config[key] !== undefined ? config[key] : defaultValue;
      },
      set: <T extends keyof AppConfig>(key: T, value: AppConfig[T]) => {
        config[key] = value;
        saveConfig(config);
      },
      delete: (key: keyof AppConfig) => {
        delete config[key];
        saveConfig(config);
      },
      reset: () => {
        config = {
          theme: 'light',
          fontSize: 14,
          layoutMode: 'comfortable',
          sendOnEnter: true,
          storagePath: this.getDefaultStoragePath()
        };
        saveConfig(config);
      },
      onDidChange: <T extends keyof AppConfig>(key: T, callback: (newValue: AppConfig[T], oldValue: AppConfig[T]) => void) => {
        // 浏览器环境中不支持实时监听，返回一个空函数
        return () => {};
      },
      get store() {
        return config;
      }
    };
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
   * 获取配置路径
   * @returns 配置文件路径
   */
  private getConfigPath(): string {
    if (app?.getPath) {
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'config');
    }
    // 浏览器环境中返回一个安全的默认路径
    return 'config';
  }

  /**
   * 获取默认存储路径
   * @returns 默认存储路径
   */
  private getDefaultStoragePath(): string {
    if (app?.getPath) {
      const documentsPath = app.getPath('documents');
      return path.join(documentsPath, 'starpact-local');
    }
    // 浏览器环境中返回一个安全的默认路径
    return 'starpact-local';
  }

  /**
   * 获取配置值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  get<T extends keyof AppConfig>(key: T, defaultValue?: AppConfig[T]): AppConfig[T] {
    return this.store.get(key, defaultValue);
  }

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void {
    this.store.set(key, value);
  }

  /**
   * 删除配置值
   * @param key 配置键
   */
  delete(key: keyof AppConfig): void {
    this.store.delete(key);
  }

  /**
   * 获取所有配置
   * @returns 所有配置
   */
  getAll(): AppConfig {
    return this.store.store;
  }

  /**
   * 重置配置为默认值
   */
  reset(): void {
    this.store.reset();
  }

  /**
   * 导出配置
   * @param exportPath 导出路径
   * @returns 是否导出成功
   */
  exportConfig(exportPath: string): boolean {
    try {
      const config = this.getAll();
      
      if (isBrowser) {
        // 浏览器环境使用文件下载 API
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      } else {
        // Electron 环境使用 fs 模块
        const fs = require('fs');
        fs.writeFileSync(exportPath, JSON.stringify(config, null, 2), 'utf8');
        return true;
      }
    } catch (error) {
      console.error('导出配置失败:', error);
      return false;
    }
  }

  /**
   * 导入配置
   * @param importPath 导入路径
   * @returns 是否导入成功
   */
  importConfig(importPath: string): boolean {
    try {
      let config: AppConfig;
      
      if (isBrowser) {
        // 浏览器环境需要通过文件上传 API 获取文件内容
        // 这里简化处理，实际使用时需要通过文件输入框获取文件
        console.warn('浏览器环境不支持直接通过路径导入配置，请使用文件选择器');
        return false;
      } else {
        // Electron 环境使用 fs 模块
        const fs = require('fs');
        const data = fs.readFileSync(importPath, 'utf8');
        config = JSON.parse(data) as AppConfig;
      }
      
      // 验证配置有效性
      if (typeof config === 'object' && config !== null) {
        // 清除现有配置
        Object.keys(this.store.store).forEach(key => {
          this.store.delete(key);
        });
        
        // 设置新配置
        Object.entries(config).forEach(([key, value]) => {
          this.store.set(key, value);
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }

  /**
   * 迁移配置到新的存储路径
   * @param newStoragePath 新的存储路径
   * @returns 是否迁移成功
   */
  migrateConfig(newStoragePath: string): boolean {
    try {
      // 更新存储路径配置
      this.set('storagePath', newStoragePath);
      
      // 自动创建目录结构
      StorageManager.createDirectoryStructure(newStoragePath);
      
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
    return this.store.onDidChange(key, callback);
  }
}

/**
 * 配置存储实例
 */
export const configStorage = ConfigStorage.getInstance();
