import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { FfmpegOptions, FfmpegResult, FfmpegProgress, MediaInfo, VideoFile } from '@/types/ffmpeg';

export const ffmpegService = {
  async execute(options: FfmpegOptions): Promise<FfmpegResult> {
    return invoke<FfmpegResult>('ffmpeg_execute', { options });
  },

  async executeWithProgress(options: FfmpegOptions): Promise<FfmpegResult> {
    return invoke<FfmpegResult>('ffmpeg_execute_with_progress', { options });
  },

  async stop(): Promise<boolean> {
    return invoke<boolean>('ffmpeg_stop');
  },

  async getMediaInfo(ffprobePath: string, filePath: string): Promise<MediaInfo | null> {
    return invoke<MediaInfo | null>('ffmpeg_get_media_info', { ffprobePath, filePath });
  },

  async validatePath(binPath: string): Promise<{ valid: boolean; ffmpegPath: string; ffprobePath: string; error?: string }> {
    return invoke('ffmpeg_validate_path', { binPath });
  },

  async scanFolderVideos(ffprobePath: string, folderPath: string): Promise<{ videos: VideoFile[]; totalCount: number; totalSize: number }> {
    return invoke('ffmpeg_scan_folder_videos', { ffprobePath, folderPath });
  },

  async mergeVideos(ffmpegPath: string, folderPath: string, outputName: string, overwrite: boolean): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    return invoke('ffmpeg_merge_videos', { ffmpegPath, folderPath, outputName, overwrite });
  },

  onProgress(callback: (progress: FfmpegProgress) => void) {
    return listen<FfmpegProgress>('ffmpeg:progress', (event) => {
      callback(event.payload);
    });
  },

  onLog(callback: (log: string, taskId?: string) => void) {
    return listen<{ log: string; taskId?: string }>('ffmpeg:log', (event) => {
      callback(event.payload.log, event.payload.taskId);
    });
  },
};
