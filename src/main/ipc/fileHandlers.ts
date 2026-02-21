import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from './channels';
import * as fs from 'fs';
import * as path from 'path';

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

  // 处理选择文件的请求
  ipcMain.handle(IPC_CHANNELS.FILE.SELECT_FILE, async (event, options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multi?: boolean;
  }) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      
      const properties: Array<'openFile' | 'multiSelections'> = ['openFile'];
      if (options?.multi) {
        properties.push('multiSelections');
      }
      
      const result = await dialog.showOpenDialog(window, {
        title: options?.title || '选择文件',
        properties,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          filePath: result.filePaths[0],
          filePaths: result.filePaths,
        };
      } else {
        return {
          success: false,
          filePath: null,
          filePaths: null,
        };
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      return {
        success: false,
        filePath: null,
        filePaths: null,
        error: (error as Error).message,
      };
    }
  });

  // 处理读取文件内容的请求
  ipcMain.handle(IPC_CHANNELS.FILE.READ_FILE, async (event, filePath: string, encoding: string = 'utf8') => {
    try {
      const content = await fs.promises.readFile(filePath, encoding);
      return {
        success: true,
        content,
      };
    } catch (error) {
      console.error('读取文件失败:', error);
      return {
        success: false,
        content: null,
        error: (error as Error).message,
      };
    }
  });
}
