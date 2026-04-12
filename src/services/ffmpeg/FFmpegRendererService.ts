import { ffmpegConfigStorage } from '../storage/FFmpegConfigStorage';

export interface FFmpegProgress {
  frame: number;
  fps: number;
  size: string;
  time: string;
  bitrate: string;
  speed: string;
  progress: number;
  taskId?: string;
}

export interface MediaInfo {
  duration: number;
  format: string;
  video?: {
    width: number;
    height: number;
    codec: string;
    fps: number;
    bitrate: number;
  };
  audio?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}

export interface ExecuteResult {
  success: boolean;
  error?: string;
  output?: string;
}

type ProgressCallback = (progress: FFmpegProgress) => void;
type LogCallback = (data: { log: string; taskId?: string }) => void;

class FFmpegRendererService {
  private static instance: FFmpegRendererService;
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private logCallbacks: Set<LogCallback> = new Set();
  private unsubscribeProgress: (() => void) | null = null;
  private unsubscribeLog: (() => void) | null = null;
  private isElectronEnv: boolean = false;
  private listenersSetup: boolean = false;

  private constructor() {
    this.checkEnvironment();
    this.setupListeners();
  }

  private checkEnvironment() {
    this.isElectronEnv = typeof window !== 'undefined' && 
                         typeof window.electronAPI !== 'undefined' && 
                         typeof window.electronAPI.ffmpeg !== 'undefined';
  }

  static getInstance(): FFmpegRendererService {
    if (!FFmpegRendererService.instance) {
      FFmpegRendererService.instance = new FFmpegRendererService();
    }
    return FFmpegRendererService.instance;
  }

  private setupListeners() {
    if (this.listenersSetup) return;
    
    this.checkEnvironment();
    
    if (this.isElectronEnv && window.electronAPI?.ffmpeg) {
      this.unsubscribeProgress = window.electronAPI.ffmpeg.onProgress((progress) => {
        this.progressCallbacks.forEach(cb => cb(progress));
      });

      this.unsubscribeLog = window.electronAPI.ffmpeg.onLog((data) => {
        this.logCallbacks.forEach(cb => cb(data));
      });
      
      this.listenersSetup = true;
    }
  }

  isElectron(): boolean {
    this.checkEnvironment();
    return this.isElectronEnv;
  }

  onProgress(callback: ProgressCallback): () => void {
    this.setupListeners();
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  onLog(callback: LogCallback): () => void {
    this.setupListeners();
    this.logCallbacks.add(callback);
    return () => {
      this.logCallbacks.delete(callback);
    };
  }

  async validatePath(binPath: string): Promise<{ valid: boolean; ffmpegPath: string; ffprobePath: string; error?: string }> {
    if (!this.isElectronEnv) {
      return { valid: false, ffmpegPath: '', ffprobePath: '', error: '请在 Electron 应用中使用此功能（运行 npm run electron:dev）' };
    }
    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.validatePath(binPath);
    }
    return { valid: false, ffmpegPath: '', ffprobePath: '', error: 'Electron API 不可用' };
  }

  async execute(args: string[]): Promise<ExecuteResult> {
    if (!this.isElectronEnv) {
      return { success: false, error: '请在 Electron 应用中使用此功能（运行 npm run electron:dev）' };
    }
    
    const config = ffmpegConfigStorage.getConfig();
    
    if (!config.ffmpegPath) {
      return { success: false, error: 'FFmpeg 路径未配置，请在配置中设置 FFmpeg bin 目录' };
    }

    if (!config.isValid) {
      return { success: false, error: 'FFmpeg 配置无效，请检测配置' };
    }

    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.execute({
        ffmpegPath: config.ffmpegPath,
        args,
        outputPath: config.outputPath,
      });
    }

    return { success: false, error: 'Electron API 不可用' };
  }

  async executeWithProgress(args: string[], duration?: number, taskId?: string): Promise<ExecuteResult> {
    if (!this.isElectronEnv) {
      return { success: false, error: '请在 Electron 应用中使用此功能（运行 npm run electron:dev）' };
    }
    
    const config = ffmpegConfigStorage.getConfig();
    
    if (!config.ffmpegPath) {
      return { success: false, error: 'FFmpeg 路径未配置，请在配置中设置 FFmpeg bin 目录' };
    }

    if (!config.isValid) {
      return { success: false, error: 'FFmpeg 配置无效，请检测配置' };
    }

    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.executeWithProgress({
        ffmpegPath: config.ffmpegPath,
        args,
        outputPath: config.outputPath,
        duration,
        taskId,
      });
    }

    return { success: false, error: 'Electron API 不可用' };
  }

  async stop(): Promise<boolean> {
    if (!this.isElectronEnv) {
      return false;
    }
    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.stop();
    }
    return false;
  }

  async getMediaInfo(filePath: string): Promise<MediaInfo | null> {
    if (!this.isElectronEnv) {
      return null;
    }
    
    const config = ffmpegConfigStorage.getConfig();
    
    if (!config.ffprobePath) {
      return null;
    }

    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.getMediaInfo(config.ffprobePath, filePath);
    }

    return null;
  }

  async getVideoFrame(filePath: string, timeSeconds: number = 0): Promise<string | null> {
    if (!this.isElectronEnv) {
      return null;
    }
    
    const config = ffmpegConfigStorage.getConfig();
    
    if (!config.ffmpegPath) {
      return null;
    }

    if (window.electronAPI?.ffmpeg) {
      return window.electronAPI.ffmpeg.getVideoFrame(config.ffmpegPath, filePath, timeSeconds);
    }

    return null;
  }

  getOutputPath(): string {
    return ffmpegConfigStorage.getOutputPath();
  }

  getFFmpegPath(): string {
    return ffmpegConfigStorage.getFFmpegPath();
  }

  getFFprobePath(): string {
    return ffmpegConfigStorage.getFFprobePath();
  }

  isConfigured(): boolean {
    return ffmpegConfigStorage.isValid();
  }

  generateUniqueOutputPath(basePath: string): string {
    const lastDotIndex = basePath.lastIndexOf('.');
    if (lastDotIndex === -1) return basePath;
    
    const dir = basePath.substring(0, Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\'), 0));
    const fileName = basePath.substring(Math.max(basePath.lastIndexOf('/'), basePath.lastIndexOf('\\')) + 1);
    
    const extDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = extDotIndex >= 0 ? fileName.substring(0, extDotIndex) : fileName;
    const ext = extDotIndex >= 0 ? fileName.substring(extDotIndex) : '';
    
    let counter = 1;
    let newPath = basePath;
    
    while (this.fileExistsCache.has(newPath)) {
      newPath = dir ? `${dir}${dir.includes('\\') ? '\\' : '/'}${nameWithoutExt}_${counter}${ext}` : `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
    
    this.fileExistsCache.add(newPath);
    return newPath;
  }

  clearFilePathCache(path: string): void {
    this.fileExistsCache.delete(path);
  }

  private fileExistsCache: Set<string> = new Set();

  buildConvertArgs(
    inputPath: string,
    outputPath: string,
    options: {
      videoCodec?: string;
      audioCodec?: string;
      preset?: string;
      crf?: number;
      resolution?: string;
      fps?: number;
      audioBitrate?: number;
      sampleRate?: string;
      channels?: string;
      pixFmt?: string;
      hwAccel?: boolean;
      twoPass?: boolean;
      fastStart?: boolean;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    if (options.videoCodec && options.videoCodec !== 'copy (不转码)') {
      const codecMap: Record<string, string> = {
        'H.264 (libx264)': 'libx264',
        'H.265 (libx265)': 'libx265',
        'VP9': 'libvpx-vp9',
        'VP8': 'libvpx',
        'AV1 (libaom)': 'libaom-av1',
        'ProRes': 'prores_ks',
        'MPEG-4': 'mpeg4',
      };
      const codec = codecMap[options.videoCodec] || options.videoCodec;
      args.push('-c:v', codec);

      if (options.preset && ['libx264', 'libx265'].includes(codec)) {
        args.push('-preset', options.preset);
      }

      if (options.crf !== undefined && ['libx264', 'libx265', 'libvpx-vp9'].includes(codec)) {
        args.push('-crf', String(options.crf));
      }

      if (options.pixFmt && options.pixFmt !== 'auto') {
        args.push('-pix_fmt', options.pixFmt);
      }
    } else if (options.videoCodec === 'copy (不转码)') {
      args.push('-c:v', 'copy');
    }

    if (options.audioCodec && options.audioCodec !== 'copy (不转码)') {
      const codecMap: Record<string, string> = {
        'AAC': 'aac',
        'MP3 (libmp3lame)': 'libmp3lame',
        'Opus': 'libopus',
        'Vorbis': 'libvorbis',
        'FLAC': 'flac',
        'PCM': 'pcm_s16le',
        'AC3': 'ac3',
      };
      const codec = codecMap[options.audioCodec] || options.audioCodec;
      args.push('-c:a', codec);

      if (options.audioBitrate) {
        args.push('-b:a', `${options.audioBitrate}k`);
      }

      if (options.sampleRate) {
        args.push('-ar', options.sampleRate);
      }

      if (options.channels) {
        args.push('-ac', options.channels);
      }
    } else if (options.audioCodec === 'copy (不转码)') {
      args.push('-c:a', 'copy');
    }

    if (options.resolution && options.resolution !== '原始' && options.resolution !== '自定义') {
      const resMap: Record<string, string> = {
        '3840x2160 (4K)': '3840:2160',
        '2560x1440 (2K)': '2560:1440',
        '1920x1080 (1080p)': '1920:1080',
        '1280x720 (720p)': '1280:720',
        '854x480 (480p)': '854:480',
        '640x360 (360p)': '640:360',
      };
      const res = resMap[options.resolution];
      if (res) {
        args.push('-vf', `scale=${res}`);
      }
    }

    if (options.fps) {
      args.push('-r', String(options.fps));
    }

    if (options.fastStart) {
      args.push('-movflags', '+faststart');
    }

    args.push(outputPath);

    return args;
  }

  buildAudioExtractArgs(
    inputPath: string,
    outputPath: string,
    options: {
      format?: string;
      bitrate?: number;
      sampleRate?: string;
      startTime?: string;
      endTime?: string;
      volume?: number;
      normalize?: boolean;
      fadeIn?: number;
      fadeOut?: number;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    if (options.startTime) {
      args.push('-ss', options.startTime);
    }

    if (options.endTime) {
      args.push('-to', options.endTime);
    }

    args.push('-vn');

    const formatCodecMap: Record<string, { codec: string; ext: string }> = {
      'MP3': { codec: 'libmp3lame', ext: 'mp3' },
      'AAC': { codec: 'aac', ext: 'm4a' },
      'WAV': { codec: 'pcm_s16le', ext: 'wav' },
      'FLAC': { codec: 'flac', ext: 'flac' },
      'OGG': { codec: 'libvorbis', ext: 'ogg' },
      'OPUS': { codec: 'libopus', ext: 'opus' },
      'M4A': { codec: 'aac', ext: 'm4a' },
      'WMA': { codec: 'wmav2', ext: 'wma' },
    };

    const formatInfo = formatCodecMap[options.format || 'MP3'];
    if (formatInfo) {
      args.push('-c:a', formatInfo.codec);
    }

    if (options.bitrate && options.format !== 'FLAC' && options.format !== 'WAV') {
      args.push('-b:a', `${options.bitrate}k`);
    }

    if (options.sampleRate) {
      args.push('-ar', options.sampleRate);
    }

    const audioFilters: string[] = [];

    if (options.volume && options.volume !== 100) {
      const volumeDb = (options.volume - 100) / 10;
      audioFilters.push(`volume=${volumeDb}dB`);
    }

    if (options.normalize) {
      audioFilters.push('loudnorm');
    }

    if (options.fadeIn && options.fadeIn > 0) {
      audioFilters.push(`afade=t=in:st=0:d=${options.fadeIn}`);
    }

    if (options.fadeOut && options.fadeOut > 0) {
      audioFilters.push(`afade=t=out:st=0:d=${options.fadeOut}`);
    }

    if (audioFilters.length > 0) {
      args.push('-af', audioFilters.join(','));
    }

    args.push(outputPath);

    return args;
  }

  buildGifArgs(
    inputPath: string,
    outputPath: string,
    options: {
      startTime?: string;
      duration?: string;
      fps?: number;
      width?: number;
      loop?: number;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    if (options.startTime) {
      args.push('-ss', options.startTime);
    }

    if (options.duration) {
      args.push('-t', options.duration);
    }

    const filters: string[] = [];
    
    if (options.fps) {
      filters.push(`fps=${options.fps}`);
    }

    if (options.width) {
      filters.push(`scale=${options.width}:-1:flags=lanczos`);
    }

    filters.push('split[s0][s1]');
    filters.push('[s0]palettegen[p]');
    filters.push('[s1][p]paletteuse');

    args.push('-vf', filters.join(','));

    if (options.loop !== undefined) {
      args.push('-loop', String(options.loop));
    }

    args.push(outputPath);

    return args;
  }

  buildScreenshotArgs(
    inputPath: string,
    outputPattern: string,
    options: {
      mode?: 'interval' | 'count' | 'single' | 'tile';
      interval?: number;
      count?: number;
      timePoint?: string;
      cols?: number;
      rows?: number;
      format?: string;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    switch (options.mode) {
      case 'interval':
        if (options.interval) {
          args.push('-vf', `fps=1/${options.interval}`);
        }
        break;
      case 'count':
        if (options.count) {
          args.push('-vf', `select='not(mod(n\\,${Math.floor(100 / options.count)}))'`);
        }
        break;
      case 'single':
        if (options.timePoint) {
          args.push('-ss', options.timePoint);
          args.push('-vframes', '1');
        }
        break;
      case 'tile':
        const tileFilters: string[] = ['select=not(mod(n\\,300))'];
        if (options.cols && options.rows) {
          tileFilters.push(`scale=320:-1`);
          tileFilters.push(`tile=${options.cols}x${options.rows}`);
        }
        args.push('-vf', tileFilters.join(','));
        break;
    }

    const formatMap: Record<string, string> = {
      'PNG': 'png',
      'JPG': 'mjpeg',
      'BMP': 'bmp',
      'WebP': 'webp',
    };

    if (options.format) {
      args.push('-f', 'image2');
      if (options.format === 'JPG') {
        args.push('-q:v', '2');
      }
    }

    args.push(outputPattern);

    return args;
  }

  buildWatermarkArgs(
    inputPath: string,
    outputPath: string,
    options: {
      type: 'text' | 'image';
      text?: string;
      imagePath?: string;
      position?: string;
      opacity?: number;
      fontSize?: number;
      color?: string;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    if (options.type === 'image' && options.imagePath) {
      args.push('-i', options.imagePath);
    }

    let filter: string;

    if (options.type === 'text' && options.text) {
      const escapedText = options.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');
      const alpha = (options.opacity || 80) / 100;
      
      const textPositionMap: Record<string, { x: string; y: string }> = {
        'topleft': { x: '10', y: '10' },
        'topright': { x: 'w-tw-10', y: '10' },
        'bottomleft': { x: '10', y: 'h-th-10' },
        'bottomright': { x: 'w-tw-10', y: 'h-th-10' },
        'center': { x: '(w-tw)/2', y: '(h-th)/2' },
      };
      
      const pos = textPositionMap[options.position || 'bottomright'] || textPositionMap.bottomright;
      filter = `drawtext=text='${escapedText}':fontsize=${options.fontSize || 24}:fontcolor=${options.color || 'white'}@${alpha}:x=${pos.x}:y=${pos.y}`;
    } else if (options.type === 'image') {
      const alpha = (options.opacity || 80) / 100;
      
      const imagePositionMap: Record<string, string> = {
        'topleft': '10:10',
        'topright': 'W-w-10:10',
        'bottomleft': '10:H-h-10',
        'bottomright': 'W-w-10:H-h-10',
        'center': '(W-w)/2:(H-h)/2',
      };
      
      const pos = imagePositionMap[options.position || 'bottomright'] || imagePositionMap.bottomright;
      filter = `overlay=${pos}:format=auto:alpha=${alpha}`;
    } else {
      filter = 'null';
    }

    args.push('-vf', filter);
    args.push('-c:a', 'copy');
    args.push(outputPath);

    return args;
  }



  buildCompressArgs(
    inputPath: string,
    outputPath: string,
    options: {
      targetSizeMB: number;
      quality: 'quality' | 'balanced' | 'size';
      keepAudio?: boolean;
    }
  ): string[] {
    const args: string[] = ['-i', inputPath];

    const crfMap = {
      'quality': 18,
      'balanced': 23,
      'size': 28,
    };

    const presetMap = {
      'quality': 'slow',
      'balanced': 'medium',
      'size': 'fast',
    };

    args.push('-c:v', 'libx264');
    args.push('-preset', presetMap[options.quality]);
    args.push('-crf', String(crfMap[options.quality]));

    if (options.keepAudio) {
      args.push('-c:a', 'copy');
    } else {
      args.push('-c:a', 'aac');
      args.push('-b:a', '128k');
    }

    args.push('-movflags', '+faststart');
    args.push(outputPath);

    return args;
  }

  buildRemoveWatermarkArgs(
    inputPath: string,
    outputPath: string,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
      mode: 'blur' | 'fill' | 'inpaint';
      blurStrength?: number;
      outputFormat?: 'video' | 'image';
    }
  ): string[] {
    const args: string[] = ['-i', inputPath];

    const { x, y, width, height, mode, outputFormat = 'video' } = options;

    let filter: string;

    switch (mode) {
      case 'blur':
        filter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}`;
        break;
      case 'fill':
        filter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}:show=0`;
        break;
      case 'inpaint':
        filter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}`;
        break;
      default:
        filter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}`;
    }

    args.push('-vf', filter);

    if (outputFormat === 'image') {
      args.push('-vframes', '1');
      args.push('-update', '1');
    } else {
      args.push('-c:a', 'copy');
    }
    
    args.push(outputPath);

    return args;
  }

  buildVideoCutArgs(
    inputPath: string,
    outputPath: string,
    options: {
      startTime?: string;
      endTime?: string;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    if (options.startTime) {
      args.push('-ss', options.startTime);
    }

    if (options.endTime) {
      args.push('-to', options.endTime);
    }

    args.push('-c', 'copy');
    args.push(outputPath);

    return args;
  }

  buildVideoRotateArgs(
    inputPath: string,
    outputPath: string,
    options: {
      rotation?: number;
      flipH?: boolean;
      flipV?: boolean;
    } = {}
  ): string[] {
    const args: string[] = ['-i', inputPath];

    const filters: string[] = [];

    if (options.rotation) {
      const transposeMap: Record<number, string> = {
        90: 'transpose=1',
        180: 'transpose=1,transpose=1',
        270: 'transpose=2',
      };
      if (transposeMap[options.rotation]) {
        filters.push(transposeMap[options.rotation]);
      }
    }

    if (options.flipH) {
      filters.push('hflip');
    }

    if (options.flipV) {
      filters.push('vflip');
    }

    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }

    args.push('-c:a', 'copy');
    args.push(outputPath);

    return args;
  }

  private buildVideoFilters(rotation?: number, flipH?: boolean, flipV?: boolean): string[] {
    const filters: string[] = [];
    if (rotation) {
      const transposeMap: Record<number, string> = {
        90: 'transpose=1',
        180: 'transpose=1,transpose=1',
        270: 'transpose=2',
      };
      if (transposeMap[rotation]) filters.push(transposeMap[rotation]);
    }
    if (flipH) filters.push('hflip');
    if (flipV) filters.push('vflip');
    return filters;
  }

  buildVideoEditArgs(
    inputPath: string,
    outputPath: string,
    options: {
      startTime?: number;
      endTime?: number;
      rotation?: number;
      flipH?: boolean;
      flipV?: boolean;
    } = {}
  ): string[] {
    const args: string[] = [];
    const filters = this.buildVideoFilters(options.rotation, options.flipH, options.flipV);
    const startSec = options.startTime || 0;
    const endSec = options.endTime || 0;
    const hasCut = startSec > 0 || endSec > 0;

    if (hasCut && startSec > 0) {
      args.push('-ss', String(startSec));
    }

    args.push('-i', inputPath);

    if (hasCut) {
      if (startSec > 0 && endSec > 0) {
        args.push('-t', String(endSec - startSec));
      } else if (endSec > 0) {
        args.push('-to', String(endSec));
      }
    }

    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
      args.push('-c:a', 'copy');
    } else {
      args.push('-c', 'copy');
    }

    args.push('-avoid_negative_ts', 'make_zero');
    args.push(outputPath);

    return args;
  }

  buildInverseCutPart1Args(
    inputPath: string,
    outputPath: string,
    startSeconds: number,
    rotation?: number,
    flipH?: boolean,
    flipV?: boolean
  ): string[] | null {
    if (startSeconds <= 0) return null;

    const args: string[] = ['-i', inputPath];
    const filters = this.buildVideoFilters(rotation, flipH, flipV);

    args.push('-t', String(startSeconds));

    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
      args.push('-c:a', 'copy');
    } else {
      args.push('-c', 'copy');
    }

    args.push(outputPath);
    return args;
  }

  buildInverseCutPart2Args(
    inputPath: string,
    outputPath: string,
    endSeconds: number,
    rotation?: number,
    flipH?: boolean,
    flipV?: boolean
  ): string[] | null {
    if (endSeconds <= 0) return null;

    const args: string[] = ['-ss', String(endSeconds), '-i', inputPath];
    const filters = this.buildVideoFilters(rotation, flipH, flipV);

    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
      args.push('-c:a', 'copy');
    } else {
      args.push('-c', 'copy');
    }

    args.push('-avoid_negative_ts', 'make_zero');
    args.push(outputPath);
    return args;
  }

  buildVideoMergeArgs(
    inputPaths: string[],
    outputPath: string,
    concatListPath: string
  ): string[] {
    const args: string[] = ['-f', 'concat', '-safe', '0'];
    
    args.push('-i', concatListPath);
    args.push('-c', 'copy');
    args.push(outputPath);

    return args;
  }

  getVideoMergeFileList(inputPaths: string[]): string {
    return inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  }

  async executeVideoMerge(
    inputPaths: string[],
    outputPath: string,
    taskId?: string
  ): Promise<ExecuteResult> {
    if (!this.isElectronEnv) {
      return { success: false, error: '请在 Electron 应用中使用此功能（运行 npm run electron:dev）' };
    }
    
    const config = ffmpegConfigStorage.getConfig();
    
    if (!config.ffmpegPath) {
      return { success: false, error: 'FFmpeg 路径未配置，请在配置中设置 FFmpeg bin 目录' };
    }

    if (!config.isValid) {
      return { success: false, error: 'FFmpeg 配置无效，请检测配置' };
    }

    if (window.electronAPI?.ffmpeg) {
      const fileListContent = this.getVideoMergeFileList(inputPaths);
      
      return window.electronAPI.ffmpeg.executeMerge({
        ffmpegPath: config.ffmpegPath,
        outputPath: config.outputPath,
        fileListContent,
        outputFilePath: outputPath,
        taskId,
      });
    }

    return { success: false, error: 'Electron API 不可用' };
  }

  destroy() {
    if (this.unsubscribeProgress) {
      this.unsubscribeProgress();
    }
    if (this.unsubscribeLog) {
      this.unsubscribeLog();
    }
    this.progressCallbacks.clear();
    this.logCallbacks.clear();
  }
}

export const ffmpegRendererService = FFmpegRendererService.getInstance();
