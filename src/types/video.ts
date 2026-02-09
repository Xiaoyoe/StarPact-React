export interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url: string;
  duration: number;
  addedAt: number;
}

export interface VideoFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

export interface VideoInfo {
  width: number;
  height: number;
}

export type RepeatMode = 'off' | 'one' | 'all';
export type SortBy = 'name' | 'size' | 'date' | 'duration';
export type SortOrder = 'asc' | 'desc';
export type SidebarTab = 'playlist' | 'filters' | 'info';

export const DEFAULT_FILTERS: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
};
