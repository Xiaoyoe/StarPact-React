import { invoke } from '@tauri-apps/api/core';

export interface VideoItem {
  id: string;
  name: string;
  path: string;
  size: number;
  duration: number;
  added_at: number;
  thumbnail?: string;
}

export interface VideoPlaylist {
  id: string;
  name: string;
  videos: VideoItem[];
  created_at: number;
  updated_at: number;
}

export interface LayoutVideo {
  video_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  opacity: number;
  volume: number;
  muted: boolean;
}

export interface MultiVideoLayout {
  id: string;
  name: string;
  videos: LayoutVideo[];
  grid_columns: number;
  grid_rows: number;
}

export const videoService = {
  async getVideoPlaylists(): Promise<VideoPlaylist[]> {
    return await invoke<VideoPlaylist[]>('get_video_playlists');
  },

  async saveVideoPlaylists(playlists: VideoPlaylist[]): Promise<void> {
    await invoke('save_video_playlists', { playlists });
  },

  async createVideoPlaylist(name: string): Promise<VideoPlaylist> {
    return await invoke<VideoPlaylist>('create_video_playlist', { name });
  },

  async addVideoToPlaylist(playlistId: string, video: VideoItem): Promise<void> {
    await invoke('add_video_to_playlist', { playlistId, video });
  },

  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    await invoke('remove_video_from_playlist', { playlistId, videoId });
  },

  async deleteVideoPlaylist(playlistId: string): Promise<void> {
    await invoke('delete_video_playlist', { playlistId });
  },

  async getMultiVideoLayouts(): Promise<MultiVideoLayout[]> {
    return await invoke<MultiVideoLayout[]>('get_multi_video_layouts');
  },

  async saveMultiVideoLayouts(layouts: MultiVideoLayout[]): Promise<void> {
    await invoke('save_multi_video_layouts', { layouts });
  },

  async createMultiVideoLayout(name: string, gridColumns: number, gridRows: number): Promise<MultiVideoLayout> {
    return await invoke<MultiVideoLayout>('create_multi_video_layout', { name, gridColumns, gridRows });
  },

  async addVideoToLayout(layoutId: string, video: LayoutVideo): Promise<void> {
    await invoke('add_video_to_layout', { layoutId, video });
  },

  async updateLayoutVideo(layoutId: string, videoId: string, updates: LayoutVideo): Promise<void> {
    await invoke('update_layout_video', { layoutId, videoId, updates });
  },

  async deleteMultiVideoLayout(layoutId: string): Promise<void> {
    await invoke('delete_multi_video_layout', { layoutId });
  },
};
