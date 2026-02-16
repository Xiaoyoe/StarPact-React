/**
 * 视频存储测试脚本
 * 验证各种视频操作场景，确保内存数据和IndexDB数据保持一致
 */

import { VideoStorage, VideoMetadata, VideoPlaylist } from './VideoStorage';
import { VideoPlaylistStorage } from './VideoPlaylistStorage';
import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * 视频存储测试类
 */
export class VideoStorageTest {
  private static testStoragePath = 'test-storage';
  private static testPlaylistId: string;
  private static testVideoId: string;

  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<void> {
    console.log('开始运行视频存储测试...');
    
    try {
      await this.test1_CreatePlaylist();
      await this.test2_AddVideo();
      await this.test3_VerifyDataConsistency();
      await this.test4_RemoveVideo();
      await this.test5_ClearPlaylist();
      await this.test6_VerifyEmptyState();
      
      console.log('✅ 所有视频存储测试通过！');
    } catch (error) {
      console.error('❌ 视频存储测试失败:', error);
    }
  }

  /**
   * 测试1: 创建播放列表
   */
  private static async test1_CreatePlaylist(): Promise<void> {
    console.log('\n测试1: 创建播放列表');
    
    // 创建测试播放列表
    const testPlaylist: VideoPlaylist = {
      id: `playlist_${Date.now()}`,
      name: '测试播放列表',
      videos: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.testPlaylistId = testPlaylist.id;
    
    const success = await VideoStorage.savePlaylist(this.testStoragePath, testPlaylist);
    console.log('创建播放列表结果:', success ? '成功' : '失败');
    
    if (!success) {
      throw new Error('创建播放列表失败');
    }
    
    // 验证播放列表是否创建成功
    const loadedPlaylist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    console.log('验证播放列表创建:', loadedPlaylist ? '成功' : '失败');
    
    if (!loadedPlaylist) {
      throw new Error('播放列表创建后无法加载');
    }
  }

  /**
   * 测试2: 添加视频
   */
  private static async test2_AddVideo(): Promise<void> {
    console.log('\n测试2: 添加视频');
    
    // 创建测试视频文件
    const testVideoFile = new File(
      ['test video content'],
      'test-video.mp4',
      { type: 'video/mp4' }
    );
    
    // 保存视频文件
    const videoMetadata = await VideoStorage.saveVideoFile(this.testStoragePath, testVideoFile);
    console.log('保存视频文件结果:', videoMetadata ? '成功' : '失败');
    
    if (!videoMetadata) {
      throw new Error('保存视频文件失败');
    }
    
    this.testVideoId = videoMetadata.id;
    
    // 获取当前播放列表
    const playlist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    if (!playlist) {
      throw new Error('无法加载播放列表');
    }
    
    // 添加视频到播放列表
    playlist.videos.push(videoMetadata);
    playlist.updatedAt = Date.now();
    
    const updateSuccess = await VideoStorage.savePlaylist(this.testStoragePath, playlist);
    console.log('更新播放列表结果:', updateSuccess ? '成功' : '失败');
    
    if (!updateSuccess) {
      throw new Error('更新播放列表失败');
    }
  }

  /**
   * 测试3: 验证数据一致性
   */
  private static async test3_VerifyDataConsistency(): Promise<void> {
    console.log('\n测试3: 验证数据一致性');
    
    // 从内存获取播放列表
    const memoryPlaylist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    console.log('从内存获取播放列表:', memoryPlaylist ? '成功' : '失败');
    
    if (!memoryPlaylist) {
      throw new Error('无法从内存获取播放列表');
    }
    
    // 直接从IndexedDB获取数据
    const dbStorage = IndexedDBStorage.getInstance();
    const dbPlaylist = await dbStorage.get<VideoPlaylist>('video-playlists', this.testPlaylistId);
    console.log('从IndexedDB获取播放列表:', dbPlaylist ? '成功' : '失败');
    
    if (!dbPlaylist) {
      throw new Error('无法从IndexedDB获取播放列表');
    }
    
    // 验证数据一致性
    const memoryVideoCount = memoryPlaylist.videos.length;
    const dbVideoCount = dbPlaylist.videos.length;
    
    console.log('内存中的视频数量:', memoryVideoCount);
    console.log('IndexedDB中的视频数量:', dbVideoCount);
    
    if (memoryVideoCount !== dbVideoCount) {
      throw new Error('内存数据与IndexedDB数据不一致');
    }
    
    console.log('✅ 数据一致性验证通过');
  }

  /**
   * 测试4: 移除视频
   */
  private static async test4_RemoveVideo(): Promise<void> {
    console.log('\n测试4: 移除视频');
    
    // 移除视频
    const removeSuccess = await VideoStorage.deleteVideoFile(
      this.testStoragePath, 
      this.testVideoId, 
      this.testPlaylistId
    );
    console.log('移除视频结果:', removeSuccess ? '成功' : '失败');
    
    if (!removeSuccess) {
      throw new Error('移除视频失败');
    }
    
    // 验证视频是否被移除
    const playlist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    const videoExists = playlist?.videos.some(video => video.id === this.testVideoId);
    console.log('验证视频移除:', videoExists ? '失败' : '成功');
    
    if (videoExists) {
      throw new Error('视频移除后仍然存在');
    }
  }

  /**
   * 测试5: 清空播放列表
   */
  private static async test5_ClearPlaylist(): Promise<void> {
    console.log('\n测试5: 清空播放列表');
    
    // 获取当前播放列表
    const playlist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    if (!playlist) {
      throw new Error('无法加载播放列表');
    }
    
    // 清空视频
    playlist.videos = [];
    playlist.updatedAt = Date.now();
    
    const clearSuccess = await VideoStorage.savePlaylist(this.testStoragePath, playlist);
    console.log('清空播放列表结果:', clearSuccess ? '成功' : '失败');
    
    if (!clearSuccess) {
      throw new Error('清空播放列表失败');
    }
  }

  /**
   * 测试6: 验证空状态
   */
  private static async test6_VerifyEmptyState(): Promise<void> {
    console.log('\n测试6: 验证空状态');
    
    // 验证播放列表为空
    const playlist = await VideoStorage.loadPlaylist(this.testStoragePath, this.testPlaylistId);
    const isEmpty = playlist?.videos.length === 0;
    console.log('验证播放列表为空:', isEmpty ? '成功' : '失败');
    
    if (!isEmpty) {
      throw new Error('播放列表未清空');
    }
    
    // 清理测试数据
    await VideoStorage.deletePlaylist(this.testStoragePath, this.testPlaylistId);
    console.log('清理测试数据完成');
    
    console.log('✅ 空状态验证通过');
  }

  /**
   * 测试视频文件存储
   */
  static async testVideoFileStorage(): Promise<void> {
    console.log('\n测试视频文件存储');
    
    // 创建测试视频文件
    const testVideoFile = new File(
      ['test video content for file storage'],
      'test-file-storage.mp4',
      { type: 'video/mp4' }
    );
    
    // 保存视频文件
    const videoMetadata = await VideoStorage.saveVideoFile(this.testStoragePath, testVideoFile);
    console.log('保存视频文件结果:', videoMetadata ? '成功' : '失败');
    
    if (!videoMetadata) {
      throw new Error('保存视频文件失败');
    }
    
    // 尝试获取视频文件
    const videoFile = await VideoStorage.getVideoFile(videoMetadata.id);
    console.log('获取视频文件结果:', videoFile ? '成功' : '失败');
    
    if (!videoFile) {
      throw new Error('获取视频文件失败');
    }
    
    console.log('✅ 视频文件存储测试通过');
  }

  /**
   * 测试播放列表管理
   */
  static async testPlaylistManagement(): Promise<void> {
    console.log('\n测试播放列表管理');
    
    // 创建测试播放列表
    const playlist1: VideoPlaylist = {
      id: `playlist_${Date.now()}_1`,
      name: '测试播放列表1',
      videos: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const playlist2: VideoPlaylist = {
      id: `playlist_${Date.now()}_2`,
      name: '测试播放列表2',
      videos: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // 保存播放列表
    await VideoStorage.savePlaylist(this.testStoragePath, playlist1);
    await VideoStorage.savePlaylist(this.testStoragePath, playlist2);
    
    // 获取所有播放列表
    const playlists = await VideoStorage.getAllPlaylists(this.testStoragePath);
    console.log('获取所有播放列表数量:', playlists.length);
    
    if (playlists.length < 2) {
      throw new Error('获取播放列表数量不正确');
    }
    
    // 删除一个播放列表
    await VideoStorage.deletePlaylist(this.testStoragePath, playlist1.id);
    
    // 验证删除结果
    const remainingPlaylists = await VideoStorage.getAllPlaylists(this.testStoragePath);
    console.log('删除后剩余播放列表数量:', remainingPlaylists.length);
    
    if (remainingPlaylists.length !== playlists.length - 1) {
      throw new Error('播放列表删除失败');
    }
    
    // 清理测试数据
    await VideoStorage.deletePlaylist(this.testStoragePath, playlist2.id);
    
    console.log('✅ 播放列表管理测试通过');
  }
}

// 测试类导出，可在其他文件中调用
// 例如：import { VideoStorageTest } from './VideoStorageTest';
// VideoStorageTest.runAllTests();
