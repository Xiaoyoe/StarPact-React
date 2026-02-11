// 检查是否为浏览器环境（非 Electron）
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined' && !(typeof process !== 'undefined' && process.versions && process.versions.electron);

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

// 浏览器兼容的 fs 模块实现
const fs = isBrowser ? {
  existsSync: () => true,
  mkdirSync: () => {},
  writeFileSync: () => {},
  unlinkSync: () => {},
  readFileSync: () => '',
  readdirSync: () => [],
  rmSync: () => {}
} : require('fs');

/**
 * 存储管理器，负责处理存储路径和目录结构
 */
export class StorageManager {
  /**
   * 获取完整的存储路径
   * @param basePath 用户设置的基础存储路径
   * @returns 完整的存储路径，包含starpact-local目录
   */
  static getFullStoragePath(basePath: string): string {
    return path.join(basePath, 'starpact-local');
  }

  /**
   * 获取视频播放列表存储路径
   * @param basePath 用户设置的基础存储路径
   * @returns 视频播放列表存储路径
   */
  static getVideoPlaylistsPath(basePath: string): string {
    return path.join(this.getFullStoragePath(basePath), 'video-playlists');
  }

  /**
   * 获取图片存储路径
   * @param basePath 用户设置的基础存储路径
   * @returns 图片存储路径
   */
  static getGalleryPath(basePath: string): string {
    return path.join(this.getFullStoragePath(basePath), 'gallery');
  }

  /**
   * 获取配置存储路径
   * @param basePath 用户设置的基础存储路径
   * @returns 配置存储路径
   */
  static getConfigPath(basePath: string): string {
    return path.join(this.getFullStoragePath(basePath), 'config');
  }

  /**
   * 创建完整的目录结构
   * @param basePath 用户设置的基础存储路径
   * @returns 是否创建成功
   */
  static createDirectoryStructure(basePath: string): boolean {
    try {
      console.log('开始创建目录结构，基础路径:', basePath);
      
      if (isBrowser) {
        // 浏览器环境无法创建本地目录，返回 true
        console.log('浏览器环境，跳过目录创建');
        return true;
      }
      
      // 确保 fs 模块可用
      if (!fs || typeof fs.mkdirSync !== 'function') {
        console.error('fs 模块不可用');
        return false;
      }
      
      // 确保 path 模块可用
      if (!path || typeof path.join !== 'function') {
        console.error('path 模块不可用');
        return false;
      }
      
      // 构建目录路径
      const fullStoragePath = this.getFullStoragePath(basePath);
      const directories = [
        fullStoragePath,
        this.getVideoPlaylistsPath(basePath),
        this.getGalleryPath(basePath),
        this.getConfigPath(basePath)
      ];

      console.log('需要创建的目录:', directories);

      for (const dir of directories) {
        console.log('检查目录:', dir);
        
        if (!fs.existsSync(dir)) {
          console.log('目录不存在，开始创建:', dir);
          try {
            fs.mkdirSync(dir, { recursive: true });
            console.log('目录创建成功:', dir);
          } catch (mkdirError) {
            console.error('创建目录失败:', dir, '错误:', mkdirError);
            return false;
          }
        } else {
          console.log('目录已存在:', dir);
        }
      }

      console.log('目录结构创建成功');
      return true;
    } catch (error) {
      console.error('创建目录结构失败:', error);
      return false;
    }
  }

  /**
   * 验证存储路径是否有效
   * @param basePath 用户设置的基础存储路径
   * @returns 是否有效
   */
  static validateStoragePath(basePath: string): boolean {
    try {
      if (!basePath) return false;

      if (isBrowser) {
        // 浏览器环境无法访问本地文件系统，返回 true
        return true;
      }

      // 检查路径是否存在
      if (!fs.existsSync(basePath)) {
        return false;
      }

      // 检查路径是否可写
      const testPath = path.join(basePath, 'test-write.txt');
      fs.writeFileSync(testPath, 'test');
      fs.unlinkSync(testPath);

      return true;
    } catch (error) {
      console.error('验证存储路径失败:', error);
      return false;
    }
  }

  /**
   * 清理存储路径
   * @param basePath 用户设置的基础存储路径
   * @returns 是否清理成功
   */
  static cleanupStoragePath(basePath: string): boolean {
    try {
      if (isBrowser) {
        // 浏览器环境无法访问本地文件系统，返回 true
        return true;
      }
      
      const fullPath = this.getFullStoragePath(basePath);
      if (fs.existsSync(fullPath)) {
        // 这里可以添加清理逻辑，目前只是验证路径
        return true;
      }
      return false;
    } catch (error) {
      console.error('清理存储路径失败:', error);
      return false;
    }
  }
}
