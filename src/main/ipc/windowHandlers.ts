import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { mainWindow } from '../index';

export function registerWindowHandlers() {
  ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.MAXIMIZE, () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE, () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MAXIMIZED, () => {
    if (mainWindow) {
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.RESIZE, (_event, width: number, height: number) => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      }
      mainWindow.setSize(width, height);
      mainWindow.center();
      return { success: true, width, height };
    }
    return { success: false };
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_SIZE, () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize();
      return { width, height };
    }
    return null;
  });
}
