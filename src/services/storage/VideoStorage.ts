import { StorageManager } from './StorageManager';
import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 视频元数据接口
 */
export interface VideoMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration: number; // 视频时长（秒）
  width: number; // 视频宽度
  height: number; // 视频高度
  addedAt: number; // 添加时间戳
  filePath: string; // 本地文件路径（兼容旧数据）
  thumbnailPath?: string; // 缩略图路径（兼容旧数据）
  tags?: string[]; // 视频标签
  description?: string; // 视频描述
}

/**
 * 视频播放列表接口
 */
export interface VideoPlaylist {
  id: string;
  name: string;
  videos: VideoMetadata[];
  createdAt: number;
  updatedAt: number;
  coverVideoId?: string; // 封面视频ID
  description?: string; // 播放列表描述
}

/**
 * 视频存储服务
 */
export class VideoStorage {
  private static get dbStorage(): IndexedDBStorage {
    try {
      return IndexedDBStorage.getInstance();
    } catch (error) {
      console.error('Failed to get IndexedDB instance:', error);
      // 返回一个空对象，避免应用崩溃
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
   * 保存视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlist 播放列表数据
   * @returns 是否保存成功
   */
  static async savePlaylist(storagePath: string, playlist: VideoPlaylist): Promise<boolean> {
    try {
      console.log('开始保存视频播放列表');
      
      // 使用IndexedDB存储播放列表数据
      await this.dbStorage.put('playlists', playlist);
      console.log('播放列表数据保存成功，视频数量:', playlist.videos.length);

      return true;
    } catch (error) {
      console.error('保存视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 加载视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlistId 播放列表ID
   * @returns 播放列表数据或null
   */
  static async loadPlaylist(storagePath: string, playlistId: string): Promise<VideoPlaylist | null> {
    try {
      const playlist = await this.dbStorage.get<VideoPlaylist>('playlists', playlistId);
      return playlist;
    } catch (error) {
      console.error('加载视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 获取所有视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @returns 播放列表数组
   */
  static async getAllPlaylists(storagePath: string): Promise<VideoPlaylist[]> {
    try {
      console.log('开始获取所有视频播放列表');
      
      const playlists = await this.dbStorage.getAll<VideoPlaylist>('playlists');
      console.log('最终加载的播放列表数量:', playlists.length);
      return playlists;
    } catch (error) {
      console.error('获取所有视频播放列表失败:', error);
      return [];
    }
  }

  /**
   * 删除视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlistId 播放列表ID
   * @returns 是否删除成功
   */
  static async deletePlaylist(storagePath: string, playlistId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('playlists', playlistId);
      return true;
    } catch (error) {
      console.error('删除视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 保存视频文件到IndexedDB
   * @param storagePath 存储路径（兼容参数）
   * @param videoFile 视频文件
   * @returns 保存的视频元数据或null
   */
  static async saveVideoFile(storagePath: string, videoFile: File): Promise<VideoMetadata | null> {
    try {
      console.log('开始保存视频文件');
      console.log('视频文件名:', videoFile.name);
      console.log('视频文件大小:', videoFile.size);
      console.log('视频文件类型:', videoFile.type);
      
      // 生成视频ID
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 读取文件为Blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          resolve(new Blob([arrayBuffer], { type: videoFile.type }));
        };
        reader.onerror = (error) => {
          console.error('FileReader 错误:', error);
          reject(error);
        };
        reader.readAsArrayBuffer(videoFile);
      });
      
      // 存储视频文件到IndexedDB
      await this.dbStorage.storeFile('videos', videoId, blob, {
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type
      });
      
      // 创建视频元数据
      console.log('创建视频元数据');
      const metadata: VideoMetadata = {
        id: videoId,
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type,
        url: URL.createObjectURL(blob),
        duration: 0, // 后续可以通过视频处理库获取
        width: 0, // 后续可以通过视频处理库获取
        height: 0, // 后续可以通过视频处理库获取
        addedAt: Date.now(),
        filePath: '' // IndexedDB存储不需要文件路径
      };

      console.log('视频元数据创建成功');
      return metadata;
    } catch (error) {
      console.error('保存视频文件失败:', error);
      return null;
    }
  }

  /**
   * 删除视频文件
   * @param storagePath 存储路径（兼容参数）
   * @param videoId 视频ID
   * @param playlistId 播放列表ID
   * @returns 是否删除成功
   */
  static async deleteVideoFile(storagePath: string, videoId: string, playlistId: string): Promise<boolean> {
    try {
      const playlist = await this.loadPlaylist(storagePath, playlistId);
      if (!playlist) {
        return false;
      }

      // 从IndexedDB删除视频文件
      await this.dbStorage.delete('videos', videoId);

      // 从播放列表中移除视频
      playlist.videos = playlist.videos.filter(vid => vid.id !== videoId);
      playlist.updatedAt = Date.now();

      // 如果删除的是封面视频，清除封面视频ID
      if (playlist.coverVideoId === videoId) {
        playlist.coverVideoId = playlist.videos.length > 0 ? playlist.videos[0].id : undefined;
      }

      // 保存更新后的播放列表
      return await this.savePlaylist(storagePath, playlist);
    } catch (error) {
      console.error('删除视频文件失败:', error);
      return false;
    }
  }

  /**
   * 导出视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlistId 播放列表ID
   * @returns 导出的播放列表Blob
   */
  static async exportPlaylist(storagePath: string, playlistId: string): Promise<Blob | null> {
    try {
      const playlist = await this.loadPlaylist(storagePath, playlistId);
      if (!playlist) {
        return null;
      }

      const jsonString = JSON.stringify(playlist, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // 触发文件下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${playlist.name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return blob;
    } catch (error) {
      console.error('导出视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 导入视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlistData 播放列表数据
   * @returns 导入的播放列表或null
   */
  static async importPlaylist(storagePath: string, playlistData: VideoPlaylist): Promise<VideoPlaylist | null> {
    try {
      // 生成新的ID，避免冲突
      const newPlaylist: VideoPlaylist = {
        ...playlistData,
        id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: Date.now(),
        videos: playlistData.videos.map(video => ({
          ...video,
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      await this.savePlaylist(storagePath, newPlaylist);
      return newPlaylist;
    } catch (error) {
      console.error('导入视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 从文件导入视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param file 播放列表文件
   * @returns 导入的播放列表或null
   */
  static async importPlaylistFromFile(storagePath: string, file: File): Promise<VideoPlaylist | null> {
    try {
      const text = await file.text();
      const playlist = JSON.parse(text) as VideoPlaylist;
      return await this.importPlaylist(storagePath, playlist);
    } catch (error) {
      console.error('从文件导入视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 搜索视频
   * @param storagePath 存储路径（兼容参数）
   * @param query 搜索关键词
   * @returns 匹配的视频元数据数组
   */
  static async searchVideos(storagePath: string, query: string): Promise<VideoMetadata[]> {
    try {
      const playlists = await this.getAllPlaylists(storagePath);
      const allVideos = playlists.flatMap(playlist => playlist.videos);

      return allVideos.filter(video => 
        video.name.toLowerCase().includes(query.toLowerCase()) ||
        video.description?.toLowerCase().includes(query.toLowerCase()) ||
        video.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    } catch (error) {
      console.error('搜索视频失败:', error);
      return [];
    }
  }

  /**
   * 获取视频文件
   * @param videoId 视频ID
   * @returns 视频Blob或null
   */
  static async getVideoFile(videoId: string): Promise<Blob | null> {
    try {
      const fileData = await this.dbStorage.getFile('videos', videoId);
      return fileData?.blob || null;
    } catch (error) {
      console.error('获取视频文件失败:', error);
      return null;
    }
  }
}

/**
 * 同步方法（兼容旧代码）
 */
export class VideoStorageSync {
  /**
   * 同步保存播放列表（内部使用异步实现）
   */
  static savePlaylist(storagePath: string, playlist: VideoPlaylist): boolean {
    VideoStorage.savePlaylist(storagePath, playlist).catch(console.error);
    return true;
  }

  /**
   * 同步加载播放列表（内部使用异步实现）
   */
  static loadPlaylist(storagePath: string, playlistId: string): VideoPlaylist | null {
    // 注意：这里返回null，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步获取所有播放列表（内部使用异步实现）
   */
  static getAllPlaylists(storagePath: string): VideoPlaylist[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }

  /**
   * 同步删除播放列表（内部使用异步实现）
   */
  static deletePlaylist(storagePath: string, playlistId: string): boolean {
    VideoStorage.deletePlaylist(storagePath, playlistId).catch(console.error);
    return true;
  }

  /**
   * 同步删除视频文件（内部使用异步实现）
   */
  static deleteVideoFile(storagePath: string, videoId: string, playlistId: string): boolean {
    VideoStorage.deleteVideoFile(storagePath, videoId, playlistId).catch(console.error);
    return true;
  }

  /**
   * 同步导出播放列表（内部使用异步实现）
   */
  static exportPlaylist(storagePath: string, playlistId: string, exportPath: string): boolean {
    VideoStorage.exportPlaylist(storagePath, playlistId).catch(console.error);
    return true;
  }

  /**
   * 同步导入播放列表（内部使用异步实现）
   */
  static importPlaylist(storagePath: string, importPath: string): VideoPlaylist | null {
    // 注意：这里返回null，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步搜索视频（内部使用异步实现）
   */
  static searchVideos(storagePath: string, query: string): VideoMetadata[] {
    // 注意：这里返回空数组，实际使用时应该使用异步方法
    return [];
  }
}
