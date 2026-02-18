import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { mainWindow } from '../index';

/**
 * 注册窗口控制相关的 IPC 处理器
 */
export function registerWindowHandlers() {
  // 最小化窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  // 最大化/还原窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW.MAXIMIZE, () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE, () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // 获取窗口最大化状态
  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MAXIMIZED, () => {
    if (mainWindow) {
      return mainWindow.isMaximized();
    }
    return false;
  });
}
