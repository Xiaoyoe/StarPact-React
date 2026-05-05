export interface FfmpegOptions {
  ffmpegPath: string;
  args: string[];
  taskId?: string;
  duration?: number;
}

export interface FfmpegResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface FfmpegProgress {
  taskId?: string;
  frame?: number;
  fps?: number;
  size?: string;
  time?: string;
  bitrate?: string;
  speed?: string;
  progress?: number;
}

export interface MediaInfo {
  duration: number;
  format: string;
  size: number;
  video?: {
    width: number;
    height: number;
    codec: string;
    fps: number;
    bitrate: number;
  };
  audio?: {
    codec: string;
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}

export interface VideoFile {
  path: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
}

export interface FfmpegConfig {
  binPath: string;
  ffmpegPath: string;
  ffprobePath: string;
}
