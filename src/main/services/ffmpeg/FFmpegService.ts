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
            };

            for (const stream of info.streams || []) {
              if (stream.codec_type === 'video' && !mediaInfo.video) {
                mediaInfo.video = {
                  width: stream.width || 0,
                  height: stream.height || 0,
                  codec: stream.codec_name || 'unknown',
                  fps: this.parseFps(stream.r_frame_rate) || 0,
                  bitrate: stream.bit_rate || 0,
                };
              } else if (stream.codec_type === 'audio' && !mediaInfo.audio) {
                mediaInfo.audio = {
                  codec: stream.codec_name || 'unknown',
                  sampleRate: stream.sample_rate || 0,
                  channels: stream.channels || 0,
                  bitrate: stream.bit_rate || 0,
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
}

export const ffmpegService = FFmpegService.getInstance();
