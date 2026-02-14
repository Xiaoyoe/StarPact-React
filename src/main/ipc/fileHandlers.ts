import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from './channels';

/**
 * 注册文件操作相关的IPC处理程序
 */
export function registerFileHandlers() {
  // 处理选择文件夹的请求
  ipcMain.handle(IPC_CHANNELS.FILE.SELECT_FOLDER, async (event, options?: {
    title?: string;
    defaultPath?: string;
  }) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      
      const result = await dialog.showOpenDialog(window, {
        title: options?.title || '选择文件夹',
        properties: ['openDirectory'],
        defaultPath: options?.defaultPath,
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          path: result.filePaths[0],
        };
      } else {
        return {
          success: false,
          path: null,
        };
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      return {
        success: false,
        path: null,
        error: (error as Error).message,
      };
    }
  });
}
