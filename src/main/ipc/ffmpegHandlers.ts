import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import { ffmpegService } from '../services/ffmpeg/FFmpegService';
import { mainWindow } from '../index';

export function registerFFmpegHandlers() {
  ffmpegService.setMainWindow(mainWindow!);

  ipcMain.handle(IPC_CHANNELS.FFMPEG.VALIDATE_PATH, async (_event, binPath: string) => {
    return ffmpegService.validatePath(binPath);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.EXECUTE, async (_event, options: {
    ffmpegPath: string;
    args: string[];
    outputPath?: string;
  }) => {
    return ffmpegService.execute(options);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.EXECUTE_WITH_PROGRESS, async (_event, options: {
    ffmpegPath: string;
    args: string[];
    outputPath?: string;
    duration?: number;
  }) => {
    return ffmpegService.executeWithProgress(options, options.duration);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.STOP, async () => {
    return ffmpegService.stop();
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.GET_MEDIA_INFO, async (_event, ffprobePath: string, filePath: string) => {
    return ffmpegService.getMediaInfo(ffprobePath, filePath);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.SCAN_FOLDER_VIDEOS, async (_event, ffprobePath: string, folderPath: string) => {
    return ffmpegService.scanFolderVideos(ffprobePath, folderPath);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.MERGE_VIDEOS, async (_event, options: {
    ffmpegPath: string;
    folderPath: string;
    outputName: string;
    overwrite: boolean;
  }) => {
    return ffmpegService.mergeVideos(options.ffmpegPath, options.folderPath, options.outputName, options.overwrite);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.CLASSIFY_BY_FPS, async (_event, ffprobePath: string, folderPath: string) => {
    return ffmpegService.classifyByFps(ffprobePath, folderPath);
  });

  ipcMain.handle(IPC_CHANNELS.FFMPEG.COLLECT_SUBFOLDER_VIDEOS, async (_event, folderPath: string) => {
    return ffmpegService.collectSubfolderVideos(folderPath);
  });
}
