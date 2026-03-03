import { IndexedDBStorage } from './IndexedDBStorage';

export interface FFmpegConfig {
  binPath: string;
  ffmpegPath: string;
  ffprobePath: string;
  ffplayPath: string;
  outputPath: string;
  lastChecked: number;
  isValid: boolean;
  showVideoThumbnail: boolean;
}

export class FFmpegConfigStorage {
  private static instance: FFmpegConfigStorage;
  private dbStorage: IndexedDBStorage;
  private configCache: FFmpegConfig | null = null;
  private loadPromise: Promise<void>;
  private isReady: boolean = false;

  private constructor() {
    this.dbStorage = IndexedDBStorage.getInstance();
    this.loadPromise = this.loadConfig();
  }

  private getDefaultConfig(): FFmpegConfig {
    return {
      binPath: '',
      ffmpegPath: '',
      ffprobePath: '',
      ffplayPath: '',
      outputPath: '',
      lastChecked: 0,
      isValid: false,
      showVideoThumbnail: true,
    };
  }

  private async loadConfig(): Promise<void> {
    try {
      const storedConfig = await this.dbStorage.get<FFmpegConfig>('ffmpeg-config', 'ffmpeg-settings');
      if (storedConfig) {
        this.configCache = { ...this.getDefaultConfig(), ...storedConfig };
      } else {
        this.configCache = this.getDefaultConfig();
      }
      this.isReady = true;
    } catch (error) {
      console.error('加载 FFmpeg 配置失败:', error);
      this.configCache = this.getDefaultConfig();
      this.isReady = true;
    }
  }

  async ready(): Promise<void> {
    if (this.isReady) {
      return;
    }
    await this.loadPromise;
  }

  private async saveConfig(): Promise<void> {
    try {
      if (this.configCache) {
        await this.dbStorage.put('ffmpeg-config', {
          key: 'ffmpeg-settings',
          ...this.configCache,
        });
      }
    } catch (error) {
      console.error('保存 FFmpeg 配置失败:', error);
    }
  }

  static getInstance(): FFmpegConfigStorage {
    if (!FFmpegConfigStorage.instance) {
      FFmpegConfigStorage.instance = new FFmpegConfigStorage();
    }
    return FFmpegConfigStorage.instance;
  }

  getConfig(): FFmpegConfig {
    return this.configCache ? { ...this.configCache } : this.getDefaultConfig();
  }

  async setBinPath(path: string): Promise<FFmpegConfig> {
    if (this.configCache) {
      this.configCache.binPath = path;
      this.configCache.ffmpegPath = path ? `${path}/ffmpeg.exe` : '';
      this.configCache.ffprobePath = path ? `${path}/ffprobe.exe` : '';
      this.configCache.ffplayPath = path ? `${path}/ffplay.exe` : '';
      this.configCache.lastChecked = Date.now();
      await this.saveConfig();
    }
    return this.getConfig();
  }

  async setOutputPath(path: string): Promise<void> {
    if (this.configCache) {
      this.configCache.outputPath = path;
      await this.saveConfig();
    }
  }

  async setValid(isValid: boolean): Promise<void> {
    if (this.configCache) {
      this.configCache.isValid = isValid;
      this.configCache.lastChecked = Date.now();
      await this.saveConfig();
    }
  }

  async setShowVideoThumbnail(show: boolean): Promise<void> {
    if (this.configCache) {
      this.configCache.showVideoThumbnail = show;
      await this.saveConfig();
    }
  }

  getShowVideoThumbnail(): boolean {
    return this.configCache?.showVideoThumbnail ?? true;
  }

  async updateConfig(config: Partial<FFmpegConfig>): Promise<void> {
    if (this.configCache) {
      this.configCache = { ...this.configCache, ...config };
      await this.saveConfig();
    }
  }

  async reset(): Promise<void> {
    this.configCache = this.getDefaultConfig();
    await this.saveConfig();
  }

  getFFmpegPath(): string {
    return this.configCache?.ffmpegPath || '';
  }

  getFFprobePath(): string {
    return this.configCache?.ffprobePath || '';
  }

  getFFplayPath(): string {
    return this.configCache?.ffplayPath || '';
  }

  getBinPath(): string {
    return this.configCache?.binPath || '';
  }

  getOutputPath(): string {
    return this.configCache?.outputPath || '';
  }

  isValid(): boolean {
    return this.configCache?.isValid || false;
  }
}

export const ffmpegConfigStorage = FFmpegConfigStorage.getInstance();
