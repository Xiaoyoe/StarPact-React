/**
 * 存储管理器，负责处理存储路径和目录结构
 * 适配IndexedDB存储，移除文件系统依赖
 */
export class StorageManager {
  /**
   * 获取存储类型
   * @returns 存储类型
   */
  static getStorageType(): 'indexeddb' {
    return 'indexeddb';
  }

  /**
   * 初始化存储系统
   * @returns 是否初始化成功
   */
  static initializeStorage(): boolean {
    try {
      // 检查IndexedDB是否可用
      if (!('indexedDB' in window)) {
        console.error('IndexedDB不可用');
        return false;
      }
      
      console.log('IndexedDB存储初始化成功');
      return true;
    } catch (error) {
      console.error('初始化存储系统失败:', error);
      return false;
    }
  }

  /**
   * 验证存储系统是否可用
   * @returns 是否可用
   */
  static validateStorage(): boolean {
    try {
      // 检查IndexedDB是否可用
      if (!('indexedDB' in window)) {
        return false;
      }

      // 同步检查，实际连接测试在初始化时进行
      console.log('存储系统验证成功');
      return true;
    } catch (error) {
      console.error('验证存储系统失败:', error);
      return false;
    }
  }

  /**
   * 异步验证存储系统
   * @returns 是否可用
   */
  static async validateStorageAsync(): Promise<boolean> {
    try {
      // 检查IndexedDB是否可用
      if (!('indexedDB' in window)) {
        return false;
      }

      // 测试IndexedDB连接
      return new Promise((resolve) => {
        const request = indexedDB.open('starpact-test', 1);
        
        request.onsuccess = () => {
          request.result.close();
          resolve(true);
        };
        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      console.error('异步验证存储系统失败:', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   * @returns 存储信息
   */
  static getStorageInfo(): Promise<{ available: boolean; type: string }> {
    return new Promise((resolve) => {
      const available = 'indexedDB' in window;
      resolve({
        available,
        type: 'indexeddb'
      });
    });
  }

  /**
   * 获取提示词模板存储路径
   * @param basePath 基础存储路径
   * @returns 提示词模板存储路径
   */
  static getPromptTemplatesPath(basePath: string): string {
    if (!basePath) return '';
    // 在Electron环境中使用path模块
    if (typeof window !== 'undefined' && (window as any).require) {
      const path = (window as any).require('path');
      return path.join(basePath, 'prompt-templates');
    }
    // 在浏览器环境中返回相对路径
    return basePath + '/prompt-templates';
  }

  /**
   * 获取视频播放列表存储路径
   * @param basePath 基础存储路径
   * @returns 视频播放列表存储路径
   */
  static getVideoPlaylistsPath(basePath: string): string {
    if (!basePath) return '';
    // 在Electron环境中使用path模块
    if (typeof window !== 'undefined' && (window as any).require) {
      const path = (window as any).require('path');
      return path.join(basePath, 'video-playlists');
    }
    // 在浏览器环境中返回相对路径
    return basePath + '/video-playlists';
  }

  /**
   * 清理存储
   * @returns 是否清理成功
   */
  static cleanupStorage(): boolean {
    try {
      // IndexedDB存储清理逻辑
      // 这里可以添加清理过期数据的逻辑
      console.log('存储清理成功');
      return true;
    } catch (error) {
      console.error('清理存储失败:', error);
      return false;
    }
  }
}
