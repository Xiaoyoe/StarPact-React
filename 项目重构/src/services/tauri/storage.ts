import { invoke } from '@tauri-apps/api/core';

export interface DataDirInfo {
  exe_dir: string;
  data_dir: string;
  config_path: string;
  database_path: string;
  images_dir: string;
  videos_dir: string;
  ffmpeg_dir: string;
  backups_dir: string;
}

export interface AppConfig {
  theme: string;
  language: string;
  ffmpeg: FfmpegConfig;
  ollama: OllamaConfig;
  ui: UiConfig;
  modules: Record<string, ModuleConfig>;
}

export interface FfmpegConfig {
  bin_path: string;
  ffmpeg_path: string;
  ffprobe_path: string;
  configured: boolean;
  default_preset: string;
  output_dir: string;
}

export interface OllamaConfig {
  api_url: string;
  default_model: string;
}

export interface UiConfig {
  show_bottom_nav: boolean;
  sidebar_collapsed: boolean;
  window_size: WindowSize;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface ModuleConfig {
  path: string;
  enabled: boolean;
}

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created_at: number;
}

export const storageService = {
  async getDataDirInfo(): Promise<DataDirInfo> {
    return invoke('storage_get_data_dir_info');
  },

  async ensureDirs(): Promise<void> {
    return invoke('storage_ensure_dirs');
  },

  async getConfig(): Promise<AppConfig> {
    return invoke('storage_get_config');
  },

  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    return invoke('storage_update_config', { updates });
  },

  async getFfmpegConfig(): Promise<FfmpegConfig> {
    return invoke('storage_get_ffmpeg_config');
  },

  async saveFfmpegConfig(config: FfmpegConfig): Promise<void> {
    return invoke('storage_save_ffmpeg_config', { config });
  },

  async getModulePath(module: string): Promise<string | null> {
    return invoke('storage_get_module_path', { module });
  },

  async saveModulePath(module: string, path: string): Promise<void> {
    return invoke('storage_save_module_path', { module, path });
  },

  async createBackup(name?: string): Promise<string> {
    return invoke('storage_create_backup', { name });
  },

  async restoreBackup(backupPath: string): Promise<void> {
    return invoke('storage_restore_backup', { backupPath });
  },

  async listBackups(): Promise<BackupInfo[]> {
    return invoke('storage_list_backups');
  },

  async deleteBackup(backupPath: string): Promise<void> {
    return invoke('storage_delete_backup', { backupPath });
  },

  async getModels(): Promise<any[]> {
    return invoke('get_models');
  },

  async saveModels(models: any[]): Promise<void> {
    return invoke('save_models', { models });
  },

  async getConversations(): Promise<any[]> {
    return invoke('get_conversations');
  },

  async saveConversations(conversations: any[]): Promise<void> {
    return invoke('save_conversations', { conversations });
  },
};
