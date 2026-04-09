import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface FFmpegExecuteOptions {
  ffmpegPath: string;
  args: string[];
  outputPath?: string;
}

export interface FFmpegProgress {
  frame: number;
  fps: number;
  size: string;
  time: string;
  bitrate: string;
  speed: string;
  progress: number;
}

export interface MediaInfo {
  duration: number;
  format: string;
  size: number;
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

export interface VideoFileInfo {
  path: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
}

export interface ScanFolderResult {
  videos: VideoFileInfo[];
  totalCount: number;
  totalSize: number;
}

export interface MergeResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface ClassifyResult {
  success: boolean;
  classifiedCount: number;
  folders: string[];
  error?: string;
}

export interface CollectResult {
  success: boolean;
  collectedCount: number;
  error?: string;
}

export class FFmpegService {
  private static instance: FFmpegService;
  private currentProcess: ChildProcess | null = null;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  validatePath(binPath: string): { valid: boolean; ffmpegPath: string; ffprobePath: string; error?: string } {
    const normalizedPath = binPath.replace(/\\/g, '/');
    
    const ffmpegPath = path.join(normalizedPath, 'ffmpeg.exe');
    const ffprobePath = path.join(normalizedPath, 'ffprobe.exe');
    
    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);
    
    if (!ffmpegExists) {
      return { valid: false, ffmpegPath: '', ffprobePath: '', error: 'ffmpeg.exe not found' };
    }
    
    return { 
      valid: true, 
      ffmpegPath: ffmpegPath, 
      ffprobePath: ffprobeExists ? ffprobePath : '' 
    };
  }

  async execute(options: FFmpegExecuteOptions): Promise<{ success: boolean; error?: string; output?: string }> {
    return new Promise((resolve) => {
      if (!options.ffmpegPath) {
        resolve({ success: false, error: 'FFmpeg path not configured' });
        return;
      }

      const args = ['-y', ...options.args];
      
      this.currentProcess = spawn(options.ffmpegPath, args, {
        windowsHide: true,
      });

      let stderr = '';
      let stdout = '';

      this.currentProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      this.currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        this.sendLog(data.toString());
      });

      this.currentProcess.on('error', (err) => {
        this.currentProcess = null;
        resolve({ success: false, error: err.message });
      });

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
    });
  }

  async executeWithProgress(
    options: FFmpegExecuteOptions,
    duration?: number
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!options.ffmpegPath) {
        resolve({ success: false, error: 'FFmpeg path not configured' });
        return;
      }

      const args = ['-y', ...options.args, '-progress', 'pipe:1'];
      
      this.currentProcess = spawn(options.ffmpegPath, args, {
        windowsHide: true,
      });

      let stderr = '';
      let progressBuffer = '';

      this.currentProcess.stdout?.on('data', (data) => {
        progressBuffer += data.toString();
        this.parseProgress(progressBuffer, duration);
        progressBuffer = '';
      });

      this.currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        this.sendLog(data.toString());
        this.parseProgressFromStderr(data.toString(), duration);
      });

      this.currentProcess.on('error', (err) => {
        this.currentProcess = null;
        resolve({ success: false, error: err.message });
      });

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          this.sendProgress({ progress: 100 });
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
    });
  }

  stop(): boolean {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  async getMediaInfo(ffprobePath: string, filePath: string): Promise<MediaInfo | null> {
    return new Promise((resolve) => {
      if (!ffprobePath || !fs.existsSync(ffprobePath)) {
        resolve(null);
        return;
      }

      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const process = spawn(ffprobePath, args, { windowsHide: true });
      let stdout = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const info = JSON.parse(stdout);
            const mediaInfo: MediaInfo = {
              duration: parseFloat(info.format?.duration) || 0,
              format: info.format?.format_name || 'unknown',
              size: 0,
            };

            try {
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                mediaInfo.size = stats.size;
              }
            } catch {}

            for (const stream of info.streams || []) {
              if (stream.codec_type === 'video' && !mediaInfo.video) {
                mediaInfo.video = {
                  width: stream.width || 0,
                  height: stream.height || 0,
                  codec: stream.codec_name || 'unknown',
                  fps: this.parseFps(stream.r_frame_rate) || 0,
                  bitrate: parseInt(stream.bit_rate) || 0,
                };
              } else if (stream.codec_type === 'audio' && !mediaInfo.audio) {
                mediaInfo.audio = {
                  codec: stream.codec_name || 'unknown',
                  sampleRate: parseInt(stream.sample_rate) || 0,
                  channels: stream.channels || 0,
                  bitrate: parseInt(stream.bit_rate) || 0,
                };
              }
            }

            resolve(mediaInfo);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      process.on('error', () => {
        resolve(null);
      });
    });
  }

  private parseFps(frameRate: string): number {
    if (!frameRate) return 0;
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(frameRate) || 0;
  }

  private parseProgress(data: string, duration?: number) {
    const progress: Partial<FFmpegProgress> = {};
    
    const frameMatch = data.match(/frame=(\d+)/);
    const fpsMatch = data.match(/fps=(\d+)/);
    const sizeMatch = data.match(/size=\s*(\d+)(kB|mB|kB)?/);
    const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
    const bitrateMatch = data.match(/bitrate=\s*([\d.]+)(kbits\/s|Mbits\/s)/);
    const speedMatch = data.match(/speed=\s*([\d.]+)x/);

    if (frameMatch) progress.frame = parseInt(frameMatch[1]);
    if (fpsMatch) progress.fps = parseInt(fpsMatch[1]);
    if (sizeMatch) progress.size = sizeMatch[1] + (sizeMatch[2] || 'kB');
    if (timeMatch) progress.time = timeMatch[1];
    if (bitrateMatch) progress.bitrate = bitrateMatch[1] + bitrateMatch[2];
    if (speedMatch) progress.speed = speedMatch[1] + 'x';

    if (duration && timeMatch) {
      const currentTime = this.parseTimeToSeconds(timeMatch[1]);
      progress.progress = Math.min(100, Math.round((currentTime / duration) * 100));
    }

    if (Object.keys(progress).length > 0) {
      this.sendProgress(progress as FFmpegProgress);
    }
  }

  private parseProgressFromStderr(data: string, duration?: number) {
    const progress: Partial<FFmpegProgress> = {};
    
    const frameMatch = data.match(/frame=\s*(\d+)/);
    const fpsMatch = data.match(/fps=\s*([\d.]+)/);
    const sizeMatch = data.match(/size=\s*(\d+)(kB|mB)?/);
    const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
    const bitrateMatch = data.match(/bitrate=\s*([\d.]+)(kbits\/s|Mbits\/s)/);
    const speedMatch = data.match(/speed=\s*([\d.]+)x/);

    if (frameMatch) progress.frame = parseInt(frameMatch[1]);
    if (fpsMatch) progress.fps = parseFloat(fpsMatch[1]);
    if (sizeMatch) progress.size = sizeMatch[1] + (sizeMatch[2] || 'kB');
    if (timeMatch) progress.time = timeMatch[1];
    if (bitrateMatch) progress.bitrate = bitrateMatch[1] + bitrateMatch[2];
    if (speedMatch) progress.speed = speedMatch[1] + 'x';

    if (duration && timeMatch) {
      const currentTime = this.parseTimeToSeconds(timeMatch[1]);
      progress.progress = Math.min(100, Math.round((currentTime / duration) * 100));
    }

    if (Object.keys(progress).length > 0) {
      this.sendProgress(progress as FFmpegProgress);
    }
  }

  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  private sendProgress(progress: FFmpegProgress) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('ffmpeg:progress', progress);
    }
  }

  private sendLog(log: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('ffmpeg:log', log);
    }
  }

  private videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts', '.m2ts', '.ogv', '.3gp', '.f4v'];

  async scanFolderVideos(ffprobePath: string, folderPath: string): Promise<ScanFolderResult> {
    const videos: VideoFileInfo[] = [];
    let totalSize = 0;

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.videoExtensions.includes(ext)) {
            const stats = fs.statSync(fullPath);
            videos.push({
              path: fullPath,
              name: item.name,
              size: stats.size,
              duration: 0,
              width: 0,
              height: 0,
              codec: '',
              fps: 0,
              bitrate: 0,
            });
            totalSize += stats.size;
          }
        }
      }
    };

    try {
      scanDir(folderPath);
    } catch (error) {
      return { videos: [], totalCount: 0, totalSize: 0 };
    }

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const mediaInfo = await this.getMediaInfo(ffprobePath, video.path);
      if (mediaInfo) {
        video.duration = mediaInfo.duration;
        video.width = mediaInfo.video?.width || 0;
        video.height = mediaInfo.video?.height || 0;
        video.codec = mediaInfo.video?.codec || '';
        video.fps = mediaInfo.video?.fps || 0;
        video.bitrate = mediaInfo.video?.bitrate || 0;
      }
      this.sendProgress({ progress: Math.round(((i + 1) / videos.length) * 100) } as FFmpegProgress);
    }

    return { videos, totalCount: videos.length, totalSize };
  }

  async mergeVideos(ffmpegPath: string, folderPath: string, outputName: string, overwrite: boolean): Promise<MergeResult> {
    const videoFiles: string[] = [];

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.videoExtensions.includes(ext)) {
            videoFiles.push(fullPath);
          }
        }
      }
    };

    try {
      scanDir(folderPath);
    } catch (error) {
      return { success: false, error: '无法读取文件夹' };
    }

    if (videoFiles.length === 0) {
      return { success: false, error: '文件夹中没有视频文件' };
    }

    videoFiles.sort();

    const outputPath = path.join(folderPath, outputName);
    
    if (fs.existsSync(outputPath) && !overwrite) {
      return { success: false, error: '输出文件已存在' };
    }

    const listFilePath = path.join(folderPath, 'filelist.txt');
    const listContent = videoFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listFilePath, listContent, 'utf-8');

    return new Promise((resolve) => {
      const args = ['-f', 'concat', '-safe', '0', '-i', listFilePath, '-c', 'copy', '-y', outputPath];
      
      this.currentProcess = spawn(ffmpegPath, args, { windowsHide: true });

      let stderr = '';

      this.currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        this.sendLog(data.toString());
      });

      this.currentProcess.on('error', (err) => {
        this.currentProcess = null;
        try { fs.unlinkSync(listFilePath); } catch {}
        resolve({ success: false, error: err.message });
      });

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        try { fs.unlinkSync(listFilePath); } catch {}
        if (code === 0) {
          resolve({ success: true, outputPath });
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
    });
  }

  async classifyByFps(ffprobePath: string, folderPath: string): Promise<ClassifyResult> {
    const videoFiles: { path: string; name: string; fps: number }[] = [];

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.videoExtensions.includes(ext)) {
            videoFiles.push({ path: fullPath, name: item.name, fps: 0 });
          }
        }
      }
    };

    try {
      scanDir(folderPath);
    } catch (error) {
      return { success: false, classifiedCount: 0, folders: [], error: '无法读取文件夹' };
    }

    if (videoFiles.length === 0) {
      return { success: false, classifiedCount: 0, folders: [], error: '文件夹中没有视频文件' };
    }

    const fpsFolders = new Set<string>();

    for (let i = 0; i < videoFiles.length; i++) {
      const video = videoFiles[i];
      const mediaInfo = await this.getMediaInfo(ffprobePath, video.path);
      if (mediaInfo && mediaInfo.video) {
        video.fps = Math.round(mediaInfo.video.fps);
      }
      this.sendProgress({ progress: Math.round(((i + 1) / videoFiles.length) * 100) } as FFmpegProgress);
    }

    for (const video of videoFiles) {
      if (video.fps > 0) {
        const fpsFolderName = `FPS_${video.fps}`;
        const fpsFolderPath = path.join(folderPath, fpsFolderName);
        
        if (!fs.existsSync(fpsFolderPath)) {
          fs.mkdirSync(fpsFolderPath, { recursive: true });
        }
        
        fpsFolders.add(fpsFolderName);
        
        const destPath = path.join(fpsFolderPath, video.name);
        if (!fs.existsSync(destPath)) {
          fs.renameSync(video.path, destPath);
        } else {
          const baseName = path.basename(video.name, path.extname(video.name));
          const ext = path.extname(video.name);
          let counter = 1;
          let newDestPath = path.join(fpsFolderPath, `${baseName}_${counter}${ext}`);
          while (fs.existsSync(newDestPath)) {
            counter++;
            newDestPath = path.join(fpsFolderPath, `${baseName}_${counter}${ext}`);
          }
          fs.renameSync(video.path, newDestPath);
        }
      }
    }

    return { success: true, classifiedCount: videoFiles.length, folders: Array.from(fpsFolders) };
  }

  async collectSubfolderVideos(folderPath: string): Promise<CollectResult> {
    const videoFiles: { path: string; name: string }[] = [];

    const scanDir = (dir: string, rootDir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (fullPath !== rootDir) {
            scanDir(fullPath, rootDir);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (this.videoExtensions.includes(ext)) {
            if (dir !== rootDir) {
              videoFiles.push({ path: fullPath, name: item.name });
            }
          }
        }
      }
    };

    try {
      scanDir(folderPath, folderPath);
    } catch (error) {
      return { success: false, collectedCount: 0, error: '无法读取文件夹' };
    }

    if (videoFiles.length === 0) {
      return { success: true, collectedCount: 0 };
    }

    let collectedCount = 0;

    for (const video of videoFiles) {
      const destPath = path.join(folderPath, video.name);
      
      if (!fs.existsSync(destPath)) {
        fs.renameSync(video.path, destPath);
        collectedCount++;
      } else {
        const baseName = path.basename(video.name, path.extname(video.name));
        const ext = path.extname(video.name);
        let counter = 1;
        let newDestPath = path.join(folderPath, `${baseName}_${counter}${ext}`);
        while (fs.existsSync(newDestPath)) {
          counter++;
          newDestPath = path.join(folderPath, `${baseName}_${counter}${ext}`);
        }
        fs.renameSync(video.path, newDestPath);
        collectedCount++;
      }
    }

    return { success: true, collectedCount };
  }
}

export const ffmpegService = FFmpegService.getInstance();
