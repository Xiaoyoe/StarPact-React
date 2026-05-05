import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export const fileService = {
  async selectFolder(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
    const selected = await open({
      directory: true,
      multiple: false,
      title: options?.title || '选择文件夹',
      defaultPath: options?.defaultPath,
    });
    
    return typeof selected === 'string' ? selected : null;
  },

  async selectFile(options?: { 
    title?: string; 
    defaultPath?: string; 
    filters?: FileFilter[];
    multiple?: boolean;
  }): Promise<string | string[] | null> {
    const selected = await open({
      multiple: options?.multiple ?? false,
      title: options?.title || '选择文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters,
    });
    
    if (selected === null) {
      return null;
    }
    
    return selected;
  },

  async saveFile(options?: { 
    title?: string; 
    defaultPath?: string; 
    filters?: FileFilter[];
  }): Promise<string | null> {
    const selected = await save({
      title: options?.title || '保存文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters,
    });
    
    return selected;
  },

  async readFile(filePath: string): Promise<string> {
    return invoke<string>('file_read', { filePath });
  },

  async writeFile(filePath: string, content: string): Promise<void> {
    return invoke('file_write', { filePath, content });
  },

  async deleteFile(filePath: string): Promise<void> {
    return invoke('file_delete', { filePath });
  },

  async createFolder(folderPath: string): Promise<void> {
    return invoke('file_create_folder', { folderPath });
  },

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    return invoke('file_rename', { oldPath, newPath });
  },

  async getFileStats(filePath: string): Promise<{
    size: number;
    createdTime: number;
    modifiedTime: number;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    return invoke('file_get_stats', { filePath });
  },

  async showInFolder(filePath: string): Promise<void> {
    return invoke('file_show_in_folder', { filePath });
  },

  async openExternal(url: string): Promise<void> {
    await shellOpen(url);
  },
};
