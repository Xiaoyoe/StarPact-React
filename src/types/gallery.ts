export interface ImageItem {
  id: string;
  name: string;
  url: string;
  path?: string;
  width: number;
  height: number;
  size: number;
  type: string;
  tags: string[];
  favorite: boolean;
  isLongImage: boolean;
  aspectRatio: number;
  dateAdded: Date;
}

export interface ImageFolder {
  id: string;
  name: string;
  images: ImageItem[];
}

export type ViewMode = 'grid' | 'list' | 'waterfall';
export type SortBy = 'name' | 'date' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface EditState {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export const defaultEditState: EditState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
};
