import { IndexedDBStorage } from './IndexedDBStorage';

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
  file?: File; // 原始File对象
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
  static async savePlaylist(_storagePath: string, playlist: VideoPlaylist): Promise<boolean> {
    try {
      await this.dbStorage.put('video-playlists', playlist);
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
  static async loadPlaylist(_storagePath: string, playlistId: string): Promise<VideoPlaylist | null> {
    try {
      const playlist = await this.dbStorage.get<VideoPlaylist>('video-playlists', playlistId);
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
  static async getAllPlaylists(_storagePath: string): Promise<VideoPlaylist[]> {
    try {
      const playlists = await this.dbStorage.getAll<VideoPlaylist>('video-playlists');
      
      // 处理每个播放列表中的视频文件，重新生成有效的 Blob URL
      const processedPlaylists = await Promise.all(
        playlists.map(async (playlist) => {
          const processedVideos = await Promise.all(
            playlist.videos.map(async (video) => {
              // 检查视频是否有 ID，无论 URL 状态如何，都尝试从 IndexedDB 获取视频文件
              if (video.id) {
                try {
                  // 从 IndexedDB 中获取视频文件
                  const videoData = await this.dbStorage.getFile('videos', video.id);
                  if (videoData && videoData.blob) {
                    // 重新生成 Blob URL
                    const newBlobUrl = URL.createObjectURL(videoData.blob);
                    return {
                      ...video,
                      url: newBlobUrl
                    };
                  }
                } catch (error) {
                  console.error('获取视频文件失败:', error);
                }
              }
              return video;
            })
          );
          
          return {
            ...playlist,
            videos: processedVideos
          };
        })
      );
      
      return processedPlaylists;
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
  static async deletePlaylist(_storagePath: string, playlistId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('video-playlists', playlistId);
      return true;
    } catch (error) {
      console.error('删除视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 导出视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param playlistId 播放列表ID
   * @param exportPath 导出路径（兼容参数）
   * @returns 是否导出成功
   */
  static async exportPlaylist(_storagePath: string, playlistId: string, _exportPath: string): Promise<boolean> {
    try {
      const playlist = await this.loadPlaylist('', playlistId);
      if (!playlist) {
        return false;
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

      return true;
    } catch (error) {
      console.error('导出视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 导入视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @param importPath 导入路径（兼容参数）
   * @returns 导入的播放列表或null
   */
  static async importPlaylist(_storagePath: string, _importPath: string): Promise<VideoPlaylist | null> {
    try {
      // 注意：此方法在IndexedDB环境中不使用，实际使用时应使用importPlaylistFromFile方法
      return null;
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
  static async importPlaylistFromFile(_storagePath: string, file: File): Promise<VideoPlaylist | null> {
    try {
      const text = await file.text();
      const playlist = JSON.parse(text) as VideoPlaylist;

      // 生成新的ID，避免冲突
      const newPlaylist: VideoPlaylist = {
        ...playlist,
        id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        updatedAt: Date.now()
      };

      await this.savePlaylist('', newPlaylist);
      return newPlaylist;
    } catch (error) {
      console.error('从文件导入视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 处理视频文件的IndexedDB存储
   * @param storagePath 存储路径（兼容参数）
   * @param videoFile 视频文件
   * @returns 处理后的视频文件
   */
  static async processVideoFile(_storagePath: string, videoFile: VideoFile): Promise<VideoFile> {
    try {
      // 如果视频文件是File对象，存储到IndexedDB
      if (videoFile.file instanceof File) {
        const file = videoFile.file;
        const videoId = videoFile.id || `video_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // 读取文件为Blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            resolve(new Blob([arrayBuffer], { type: file.type }));
          };
          reader.onerror = (error) => {
            console.error('FileReader 错误:', error);
            reject(error);
          };
          reader.readAsArrayBuffer(file);
        });
        
        // 存储视频文件到IndexedDB
        await this.dbStorage.storeFile('videos', videoId, blob, {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // 生成Blob URL并返回
        const blobUrl = URL.createObjectURL(blob);
        return {
          ...videoFile,
          id: videoId,
          url: blobUrl,
          // 移除file对象，避免存储大型对象
          file: undefined
        };
      }

      return videoFile;
    } catch (error) {
      console.error('处理视频文件失败:', error);
      return videoFile;
    }
  }

  /**
   * 加载视频文件并生成有效的 Blob URL
   * @param videoId 视频ID
   * @returns 视频对象（包含有效 Blob URL）或 null
   */
  static async loadVideoWithBlobUrl(videoId: string): Promise<{ blob: Blob; url: string } | null> {
    try {
      const videoData = await this.dbStorage.getFile('videos', videoId);
      if (videoData && videoData.blob) {
        const blobUrl = URL.createObjectURL(videoData.blob);
        return {
          blob: videoData.blob,
          url: blobUrl
        };
      }
      return null;
    } catch (error) {
      console.error('加载视频失败:', error);
      return null;
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

  /**
   * 清空所有视频播放列表
   * @param storagePath 存储路径（兼容参数）
   * @returns 是否清空成功
   */
  static async clearAllPlaylists(_storagePath: string): Promise<boolean> {
    try {
      await this.dbStorage.clear('video-playlists');
      return true;
    } catch (error) {
      console.error('清空所有视频播放列表失败:', error);
      return false;
    }
  }

  /**
   * 删除视频文件
   * @param videoId 视频ID
   * @returns 是否删除成功
   */
  static async deleteVideoFile(videoId: string): Promise<boolean> {
    try {
      await this.dbStorage.delete('videos', videoId);
      return true;
    } catch (error) {
      console.error('删除视频文件失败:', error);
      return false;
    }
  }

  /**
   * 批量删除视频文件
   * @param videoIds 视频ID数组
   * @returns 是否所有视频都删除成功
   */
  static async deleteVideoFiles(videoIds: string[]): Promise<boolean> {
    try {
      for (const videoId of videoIds) {
        await this.deleteVideoFile(videoId);
      }
      return true;
    } catch (error) {
      console.error('批量删除视频文件失败:', error);
      return false;
    }
  }
}

/**
 * 同步方法（兼容旧代码）
 * 注意：此方法仅用于兼容旧代码，实际使用时应优先使用异步方法
 */
export class VideoPlaylistStorageSync {
  /**
   * 同步保存播放列表（内部使用异步实现）
   */
  static savePlaylist(storagePath: string, playlist: VideoPlaylist): boolean {
    VideoPlaylistStorage.savePlaylist(storagePath, playlist).catch(console.error);
    return true;
  }

  /**
   * 同步加载播放列表（内部使用异步实现）
   */
  static loadPlaylist(_storagePath: string, _playlistId: string): VideoPlaylist | null {
    // 注意：同步方法无法返回异步加载的结果，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步获取所有播放列表（内部使用异步实现）
   */
  static getAllPlaylists(_storagePath: string): VideoPlaylist[] {
    // 注意：同步方法无法返回异步加载的结果，实际使用时应该使用异步方法
    return [];
  }

  /**
   * 同步删除播放列表（内部使用异步实现）
   */
  static deletePlaylist(storagePath: string, playlistId: string): boolean {
    VideoPlaylistStorage.deletePlaylist(storagePath, playlistId).catch(console.error);
    return true;
  }

  /**
   * 同步导出播放列表（内部使用异步实现）
   */
  static exportPlaylist(storagePath: string, playlistId: string, exportPath: string): boolean {
    VideoPlaylistStorage.exportPlaylist(storagePath, playlistId, exportPath).catch(console.error);
    return true;
  }

  /**
   * 同步导入播放列表（内部使用异步实现）
   */
  static importPlaylist(_storagePath: string, _importPath: string): VideoPlaylist | null {
    // 注意：同步方法无法返回异步加载的结果，实际使用时应该使用异步方法
    return null;
  }

  /**
   * 同步处理视频文件（内部使用异步实现）
   */
  static processVideoFile(storagePath: string, videoFile: VideoFile): VideoFile {
    VideoPlaylistStorage.processVideoFile(storagePath, videoFile).catch(console.error);
    return videoFile;
  }

  /**
   * 导出所有播放列表到本地文件夹
   * @param folderPath 文件夹路径
   * @returns 是否导出成功
   */
  static async exportToLocalFolder(folderPath: string): Promise<boolean> {
    try {
      const playlists = await VideoPlaylistStorage.getAllPlaylists('');
      const jsonString = JSON.stringify(playlists, null, 2);
      const fileName = `video-playlists-${new Date().toISOString().split('T')[0]}.json`;
      
      // 在Electron环境中使用fs模块写入文件
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs');
        const path = (window as any).require('path');
        const filePath = path.join(folderPath, fileName);
        
        fs.writeFileSync(filePath, jsonString, 'utf8');
        console.log('成功导出播放列表到本地文件夹:', filePath);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导出播放列表到本地文件夹失败:', error);
      return false;
    }
  }

  /**
   * 从本地文件导入播放列表
   * @param filePath 文件路径
   * @returns 导入的播放列表数量
   */
  static async importFromLocalFile(filePath: string): Promise<number> {
    try {
      // 在Electron环境中使用fs模块读取文件
      if (typeof window !== 'undefined' && (window as any).require) {
        const fs = (window as any).require('fs');
        const jsonString = fs.readFileSync(filePath, 'utf8');
        const playlists = JSON.parse(jsonString) as VideoPlaylist[];
        
        let importedCount = 0;
        for (const playlist of playlists) {
          // 生成新的ID，避免冲突
          const newPlaylist: VideoPlaylist = {
            ...playlist,
            id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            updatedAt: Date.now()
          };
          
          const success = await VideoPlaylistStorage.savePlaylist('', newPlaylist);
          if (success) {
            importedCount++;
          }
        }
        
        console.log('成功从本地文件导入播放列表:', importedCount, '个');
        return importedCount;
      }
      
      return 0;
    } catch (error) {
      console.error('从本地文件导入播放列表失败:', error);
      return 0;
    }
  }
}
