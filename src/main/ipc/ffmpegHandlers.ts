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
}
