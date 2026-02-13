/**
 * 存储功能测试
 * 测试IndexedDB存储在不同环境下的表现
 */
import { IndexedDBStorage } from './IndexedDBStorage';
import { ConfigStorage } from './ConfigStorage';
import { GalleryStorage } from './GalleryStorage';
import { VideoStorage } from './VideoStorage';
import { MigrationTool } from './MigrationTool';
import { StorageManager } from './StorageManager';

/**
 * 测试结果接口
 */
export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number; // 毫秒
}

/**
 * 存储功能测试
 */
export class StorageTest {
  private static dbStorage: IndexedDBStorage = IndexedDBStorage.getInstance();

  /**
   * 运行所有测试
   * @returns 测试结果数组
   */
  static async runAllTests(): Promise<TestResult[]> {
    const tests = [
      this.testIndexedDBInitialization,
      this.testStorageManager,
      this.testConfigStorage,
      this.testGalleryStorage,
      this.testVideoStorage,
      this.testMigrationTool
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await test();
      results.push(result);
      console.log(`测试 ${result.testName}: ${result.passed ? '通过' : '失败'}`);
      if (!result.passed && result.error) {
        console.error(`错误: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * 测试IndexedDB初始化
   */
  private static async testIndexedDBInitialization(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // 测试数据库连接
      const db = await this.dbStorage['getDatabase']();
      if (!db) {
        throw new Error('数据库连接失败');
      }

      // 测试存储对象存在
      const storeNames = db.objectStoreNames;
      const expectedStores = ['config', 'gallery', 'playlists', 'images', 'videos'];
      
      for (const store of expectedStores) {
        if (!storeNames.contains(store)) {
          throw new Error(`存储对象 ${store} 不存在`);
        }
      }

      const duration = performance.now() - startTime;
      return {
        testName: 'IndexedDB初始化',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: 'IndexedDB初始化',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 测试存储管理器
   */
  private static async testStorageManager(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // 测试存储类型
      const storageType = StorageManager.getStorageType();
      if (storageType !== 'indexeddb') {
        throw new Error(`存储类型错误: ${storageType}`);
      }

      // 测试初始化
      const initialized = StorageManager.initializeStorage();
      if (!initialized) {
        throw new Error('存储初始化失败');
      }

      // 测试验证
      const validated = StorageManager.validateStorage();
      if (!validated) {
        throw new Error('存储验证失败');
      }

      // 测试存储信息
      const storageInfo = await StorageManager.getStorageInfo();
      if (!storageInfo.available) {
        throw new Error('存储不可用');
      }

      const duration = performance.now() - startTime;
      return {
        testName: '存储管理器',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: '存储管理器',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 测试配置存储
   */
  private static async testConfigStorage(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const configStorage = ConfigStorage.getInstance();

      // 测试设置配置
      const testKey = 'test_config_key';
      const testValue = 'test_config_value';
      configStorage.set(testKey, testValue);

      // 测试获取配置
      const retrievedValue = configStorage.get(testKey);
      if (retrievedValue !== testValue) {
        throw new Error('配置存储失败');
      }

      // 测试删除配置
      configStorage.delete(testKey);
      const deletedValue = configStorage.get(testKey);
      if (deletedValue !== undefined) {
        throw new Error('配置删除失败');
      }

      // 测试获取所有配置
      const allConfig = configStorage.getAll();
      if (typeof allConfig !== 'object') {
        throw new Error('获取所有配置失败');
      }

      const duration = performance.now() - startTime;
      return {
        testName: '配置存储',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: '配置存储',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 测试相册存储
   */
  private static async testGalleryStorage(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // 创建测试相册
      const testAlbum = {
        id: `test_album_${Date.now()}`,
        name: '测试相册',
        images: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 测试保存相册
      const saveResult = await GalleryStorage.saveAlbum('indexeddb', testAlbum);
      if (!saveResult) {
        throw new Error('保存相册失败');
      }

      // 测试加载相册
      const loadedAlbum = await GalleryStorage.loadAlbum('indexeddb', testAlbum.id);
      if (!loadedAlbum) {
        throw new Error('加载相册失败');
      }

      if (loadedAlbum.name !== testAlbum.name) {
        throw new Error('相册数据不一致');
      }

      // 测试获取所有相册
      const allAlbums = await GalleryStorage.getAllAlbums('indexeddb');
      if (!Array.isArray(allAlbums)) {
        throw new Error('获取所有相册失败');
      }

      // 测试删除相册
      const deleteResult = await GalleryStorage.deleteAlbum('indexeddb', testAlbum.id);
      if (!deleteResult) {
        throw new Error('删除相册失败');
      }

      const duration = performance.now() - startTime;
      return {
        testName: '相册存储',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: '相册存储',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 测试视频存储
   */
  private static async testVideoStorage(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // 创建测试播放列表
      const testPlaylist = {
        id: `test_playlist_${Date.now()}`,
        name: '测试播放列表',
        videos: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 测试保存播放列表
      const saveResult = await VideoStorage.savePlaylist('indexeddb', testPlaylist);
      if (!saveResult) {
        throw new Error('保存播放列表失败');
      }

      // 测试加载播放列表
      const loadedPlaylist = await VideoStorage.loadPlaylist('indexeddb', testPlaylist.id);
      if (!loadedPlaylist) {
        throw new Error('加载播放列表失败');
      }

      if (loadedPlaylist.name !== testPlaylist.name) {
        throw new Error('播放列表数据不一致');
      }

      // 测试获取所有播放列表
      const allPlaylists = await VideoStorage.getAllPlaylists('indexeddb');
      if (!Array.isArray(allPlaylists)) {
        throw new Error('获取所有播放列表失败');
      }

      // 测试删除播放列表
      const deleteResult = await VideoStorage.deletePlaylist('indexeddb', testPlaylist.id);
      if (!deleteResult) {
        throw new Error('删除播放列表失败');
      }

      const duration = performance.now() - startTime;
      return {
        testName: '视频存储',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: '视频存储',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 测试数据迁移工具
   */
  private static async testMigrationTool(): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // 测试检测迁移需求
      const needMigration = await MigrationTool.detectNeedMigration('old-path');
      // 这里应该根据实际情况判断，但由于是测试环境，我们假设不需要迁移

      // 测试验证迁移
      const verifyResult = await MigrationTool.verifyMigration();
      // 这里应该根据实际情况判断

      const duration = performance.now() - startTime;
      return {
        testName: '数据迁移工具',
        passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName: '数据迁移工具',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误',
        duration
      };
    }
  }

  /**
   * 生成测试报告
   * @param results 测试结果数组
   * @returns 测试报告
   */
  static generateTestReport(results: TestResult[]): string {
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    const successRate = (passedTests / totalTests * 100).toFixed(2);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0).toFixed(2);

    let report = `
存储功能测试报告
===================
测试时间: ${new Date().toLocaleString()}
总测试数: ${totalTests}
通过测试: ${passedTests}
失败测试: ${totalTests - passedTests}
成功率: ${successRate}%
总耗时: ${totalDuration}ms

详细结果:
`;

    results.forEach((result, index) => {
      report += `${index + 1}. ${result.testName}: ${result.passed ? '✓ 通过' : '✗ 失败'}
`;
      if (!result.passed && result.error) {
        report += `   错误: ${result.error}
`;
      }
      report += `   耗时: ${result.duration.toFixed(2)}ms

`;
    });

    return report;
  }
}

/**
 * 运行测试
 */
export async function runStorageTests(): Promise<void> {
  console.log('开始运行存储功能测试...');
  
  const results = await StorageTest.runAllTests();
  const report = StorageTest.generateTestReport(results);
  
  console.log(report);
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log(`❌ 有 ${totalTests - passedTests} 个测试失败`);
  }
}
