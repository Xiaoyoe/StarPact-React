// 检查是否为浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

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
  readFileSync: () => '{}',
  readdirSync: () => [],
  unlinkSync: () => {}
} : require('fs');

import { StorageManager } from './StorageManager';

/**
 * 视频文件接口
 */
export interface VideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration: number;
  addedAt: number;
  filePath?: string; // 本地文件路径
}

/**
 * 视频播放列表接口
 */
export interface VideoPlaylist {
  id: string;
  name: string;
  videos: VideoFile[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 视频播放列表存储服务
 */
export class VideoPlaylistStorage {
  /**
   * 保存视频播放列表
   * @param storagePath 存储路径
   * @param playlist 播放列表数据
   * @returns 是否保存成功
   */
  static savePlaylist(storagePath: string, playlist: VideoPlaylist): boolean {
    try {
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      const playlistPath = path.join(playlistsPath, `${playlist.id}.json`);

      // 确保目录存在
      if (!fs.existsSync(playlistsPath)) {
        fs.mkdirSync(playlistsPath, { recursive: true });
      }

      // 保存播放列表数据
      fs.writeFileSync(
        playlistPath,
        JSON.stringify(playlist, null, 2),
        'utf8'
      );

      return true;
    } catch (error) {
      console.error('保存视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 加载视频播放列表
   * @param storagePath 存储路径
   * @param playlistId 播放列表ID
   * @returns 播放列表数据或null
   */
  static loadPlaylist(storagePath: string, playlistId: string): VideoPlaylist | null {
    try {
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      const playlistPath = path.join(playlistsPath, `${playlistId}.json`);

      if (!fs.existsSync(playlistPath)) {
        return null;
      }

      const data = fs.readFileSync(playlistPath, 'utf8');
      const playlist = JSON.parse(data) as VideoPlaylist;

      return playlist;
    } catch (error) {
      console.error('加载视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 获取所有视频播放列表
   * @param storagePath 存储路径
   * @returns 播放列表数组
   */
  static getAllPlaylists(storagePath: string): VideoPlaylist[] {
    try {
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);

      if (!fs.existsSync(playlistsPath)) {
        return [];
      }

      const files = fs.readdirSync(playlistsPath);
      const playlists: VideoPlaylist[] = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          const playlistId = path.basename(file, '.json');
          const playlist = this.loadPlaylist(storagePath, playlistId);
          if (playlist) {
            playlists.push(playlist);
          }
        }
      }

      return playlists;
    } catch (error) {
      console.error('获取所有视频播放列表失败:', error);
      return [];
    }
  }

  /**
   * 删除视频播放列表
   * @param storagePath 存储路径
   * @param playlistId 播放列表ID
   * @returns 是否删除成功
   */
  static deletePlaylist(storagePath: string, playlistId: string): boolean {
    try {
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      const playlistPath = path.join(playlistsPath, `${playlistId}.json`);

      if (fs.existsSync(playlistPath)) {
        fs.unlinkSync(playlistPath);
      }

      return true;
    } catch (error) {
      console.error('删除视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 导出视频播放列表
   * @param storagePath 存储路径
   * @param playlistId 播放列表ID
   * @param exportPath 导出路径
   * @returns 是否导出成功
   */
  static exportPlaylist(storagePath: string, playlistId: string, exportPath: string): boolean {
    try {
      const playlist = this.loadPlaylist(storagePath, playlistId);
      if (!playlist) {
        return false;
      }

      fs.writeFileSync(
        exportPath,
        JSON.stringify(playlist, null, 2),
        'utf8'
      );

      return true;
    } catch (error) {
      console.error('导出视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 导入视频播放列表
   * @param storagePath 存储路径
   * @param importPath 导入路径
   * @returns 导入的播放列表或null
   */
  static importPlaylist(storagePath: string, importPath: string): VideoPlaylist | null {
    try {
      const data = fs.readFileSync(importPath, 'utf8');
      const playlist = JSON.parse(data) as VideoPlaylist;

      // 生成新的ID，避免冲突
      const newPlaylist: VideoPlaylist = {
        ...playlist,
        id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: Date.now()
      };

      this.savePlaylist(storagePath, newPlaylist);
      return newPlaylist;
    } catch (error) {
      console.error('导入视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 处理视频文件的本地存储
   * @param storagePath 存储路径
   * @param videoFile 视频文件
   * @returns 处理后的视频文件
   */
  static processVideoFile(storagePath: string, videoFile: VideoFile): VideoFile {
    try {
      const videosPath = path.join(StorageManager.getVideoPlaylistsPath(storagePath), 'videos');
      
      // 确保视频目录存在
      if (!fs.existsSync(videosPath)) {
        fs.mkdirSync(videosPath, { recursive: true });
      }

      // 生成本地文件路径
      const safeFileName = this.getSafeFileName(videoFile.name);
      const localFilePath = path.join(videosPath, safeFileName);

      return {
        ...videoFile,
        filePath: localFilePath
      };
    } catch (error) {
      console.error('处理视频文件失败:', error);
      return videoFile;
    }
  }

  /**
   * 获取安全的文件名，处理中文和特殊字符
   * @param fileName 原始文件名
   * @returns 安全的文件名
   */
  private static getSafeFileName(fileName: string): string {
    // 保留中文，移除或替换特殊字符
    const safeName = fileName.replace(/[<>"|:*?]/g, '_');
    return safeName;
  }
}
