import { StorageManager } from './StorageManager';

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
  readFileSync: () => '{}',
  readdirSync: () => [],
  unlinkSync: () => {}
} : require('fs');

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
  filePath: string; // 本地文件路径
  thumbnailPath?: string; // 缩略图路径
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
  /**
   * 保存视频播放列表
   * @param storagePath 存储路径
   * @param playlist 播放列表数据
   * @returns 是否保存成功
   */
  static savePlaylist(storagePath: string, playlist: VideoPlaylist): boolean {
    try {
      console.log('开始保存视频播放列表，存储路径:', storagePath);
      
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      console.log('播放列表存储路径:', playlistsPath);
      
      const playlistPath = path.join(playlistsPath, `${playlist.id}.json`);
      console.log('播放列表文件路径:', playlistPath);

      // 确保目录存在
      if (!fs.existsSync(playlistsPath)) {
        console.log('目录不存在，开始创建:', playlistsPath);
        fs.mkdirSync(playlistsPath, { recursive: true });
        console.log('目录创建成功');
      } else {
        console.log('目录已存在:', playlistsPath);
      }

      // 保存播放列表数据
      console.log('准备写入播放列表数据，视频数量:', playlist.videos.length);
      fs.writeFileSync(
        playlistPath,
        JSON.stringify(playlist, null, 2),
        'utf8'
      );
      console.log('播放列表数据保存成功');

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
      console.log('开始获取所有视频播放列表，存储路径:', storagePath);
      
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      console.log('播放列表存储路径:', playlistsPath);

      if (!fs.existsSync(playlistsPath)) {
        console.log('播放列表存储路径不存在');
        return [];
      }

      console.log('播放列表存储路径存在');
      const files = fs.readdirSync(playlistsPath);
      console.log('目录中的文件数量:', files.length);
      console.log('目录中的文件:', files);
      
      const playlists: VideoPlaylist[] = [];

      for (const file of files) {
        if (path.extname(file) === '.json') {
          console.log('找到播放列表文件:', file);
          const playlistId = path.basename(file, '.json');
          console.log('播放列表ID:', playlistId);
          const playlist = this.loadPlaylist(storagePath, playlistId);
          if (playlist) {
            console.log('加载播放列表成功:', playlist.name, '视频数量:', playlist.videos.length);
            playlists.push(playlist);
          } else {
            console.log('加载播放列表失败:', playlistId);
          }
        } else {
          console.log('跳过非播放列表文件:', file);
        }
      }

      console.log('最终加载的播放列表数量:', playlists.length);
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
   * 保存视频文件到本地
   * @param storagePath 存储路径
   * @param videoFile 视频文件
   * @returns 保存的视频元数据或null
   */
  static async saveVideoFile(storagePath: string, videoFile: File): Promise<VideoMetadata | null> {
    try {
      console.log('开始保存视频文件，存储路径:', storagePath);
      console.log('视频文件名:', videoFile.name);
      console.log('视频文件大小:', videoFile.size);
      console.log('视频文件类型:', videoFile.type);
      console.log('是否为浏览器环境:', isBrowser);
      
      // 浏览器环境：使用Data URL
      if (isBrowser) {
        console.log('浏览器环境，使用Data URL');
        return new Promise<VideoMetadata>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            console.log('Data URL 生成成功');
            const metadata: VideoMetadata = {
              id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: videoFile.name,
              size: videoFile.size,
              type: videoFile.type,
              url: e.target?.result as string || '',
              duration: 0, // 后续可以通过视频处理库获取
              width: 0, // 后续可以通过视频处理库获取
              height: 0, // 后续可以通过视频处理库获取
              addedAt: Date.now(),
              filePath: ''
            };
            resolve(metadata);
          };
          reader.onerror = (error) => {
            console.error('FileReader 错误:', error);
            resolve(null);
          };
          reader.readAsDataURL(videoFile);
        });
      }

      // Node.js 环境：保存到本地文件系统
      console.log('Node.js 环境，保存到本地文件系统');
      const playlistsPath = StorageManager.getVideoPlaylistsPath(storagePath);
      console.log('播放列表路径:', playlistsPath);
      
      const videosPath = path.join(playlistsPath, 'videos');
      console.log('视频存储路径:', videosPath);
      
      const thumbnailsPath = path.join(playlistsPath, 'thumbnails');
      console.log('缩略图存储路径:', thumbnailsPath);

      // 确保目录存在
      if (!fs.existsSync(videosPath)) {
        console.log('视频存储路径不存在，开始创建:', videosPath);
        fs.mkdirSync(videosPath, { recursive: true });
        console.log('视频存储路径创建成功');
      } else {
        console.log('视频存储路径已存在:', videosPath);
      }

      if (!fs.existsSync(thumbnailsPath)) {
        console.log('缩略图存储路径不存在，开始创建:', thumbnailsPath);
        fs.mkdirSync(thumbnailsPath, { recursive: true });
        console.log('缩略图存储路径创建成功');
      } else {
        console.log('缩略图存储路径已存在:', thumbnailsPath);
      }

      // 生成本地文件路径
      const safeFileName = this.getSafeFileName(videoFile.name);
      console.log('安全文件名:', safeFileName);
      
      const localFilePath = path.join(videosPath, safeFileName);
      console.log('本地文件路径:', localFilePath);

      // 保存视频文件
      try {
        // 尝试读取文件内容
        let fileContent;
        if (videoFile.path) {
          // Electron 环境，文件有路径
          console.log('Electron 环境，文件路径:', videoFile.path);
          fileContent = fs.readFileSync(videoFile.path);
          console.log('文件读取成功，大小:', fileContent.length);
        } else {
          // 浏览器环境或其他环境，使用 FileReader
          console.log('非 Electron 环境，使用 FileReader');
          fileContent = await new Promise<Buffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              console.log('FileReader 读取成功，大小:', arrayBuffer.byteLength);
              resolve(Buffer.from(arrayBuffer));
            };
            reader.onerror = (error) => {
              console.error('FileReader 错误:', error);
              reject(error);
            };
            reader.readAsArrayBuffer(videoFile);
          });
        }
        
        // 写入文件
        console.log('准备写入文件:', localFilePath);
        fs.writeFileSync(localFilePath, fileContent);
        console.log('文件写入成功');
      } catch (readError) {
        console.error('读取视频文件失败:', readError);
        // 回退到使用Data URL
        console.log('回退到使用Data URL');
        return new Promise<VideoMetadata>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            console.log('回退 Data URL 生成成功');
            const metadata: VideoMetadata = {
              id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: videoFile.name,
              size: videoFile.size,
              type: videoFile.type,
              url: e.target?.result as string || '',
              duration: 0,
              width: 0,
              height: 0,
              addedAt: Date.now(),
              filePath: ''
            };
            resolve(metadata);
          };
          reader.onerror = (error) => {
            console.error('回退 FileReader 错误:', error);
            resolve(null);
          };
          reader.readAsDataURL(videoFile);
        });
      }

      // 创建视频元数据
      console.log('创建视频元数据');
      const metadata: VideoMetadata = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type,
        url: `file://${localFilePath}`,
        duration: 0, // 后续可以通过视频处理库获取
        width: 0, // 后续可以通过视频处理库获取
        height: 0, // 后续可以通过视频处理库获取
        addedAt: Date.now(),
        filePath: localFilePath
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
   * @param storagePath 存储路径
   * @param videoId 视频ID
   * @param playlistId 播放列表ID
   * @returns 是否删除成功
   */
  static deleteVideoFile(storagePath: string, videoId: string, playlistId: string): boolean {
    try {
      const playlist = this.loadPlaylist(storagePath, playlistId);
      if (!playlist) {
        return false;
      }

      const video = playlist.videos.find(vid => vid.id === videoId);
      if (!video) {
        return false;
      }

      // 删除本地视频文件
      if (video.filePath && fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
      }

      // 删除缩略图文件
      if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
        fs.unlinkSync(video.thumbnailPath);
      }

      // 从播放列表中移除视频
      playlist.videos = playlist.videos.filter(vid => vid.id !== videoId);
      playlist.updatedAt = Date.now();

      // 如果删除的是封面视频，清除封面视频ID
      if (playlist.coverVideoId === videoId) {
        playlist.coverVideoId = playlist.videos.length > 0 ? playlist.videos[0].id : undefined;
      }

      // 保存更新后的播放列表
      return this.savePlaylist(storagePath, playlist);
    } catch (error) {
      console.error('删除视频文件失败:', error);
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
        updatedAt: Date.now(),
        videos: playlist.videos.map(video => ({
          ...video,
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };

      this.savePlaylist(storagePath, newPlaylist);
      return newPlaylist;
    } catch (error) {
      console.error('导入视频播放列表失败:', error);
      return null;
    }
  }

  /**
   * 搜索视频
   * @param storagePath 存储路径
   * @param query 搜索关键词
   * @returns 匹配的视频元数据数组
   */
  static searchVideos(storagePath: string, query: string): VideoMetadata[] {
    try {
      const playlists = this.getAllPlaylists(storagePath);
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
   * 获取安全的文件名，处理中文和特殊字符
   * @param fileName 原始文件名
   * @returns 安全的文件名
   */
  private static getSafeFileName(fileName: string): string {
    // 保留中文，移除或替换特殊字符
    const safeName = fileName.replace(/[<>"]|:*?/g, '_');
    return safeName;
  }
}
