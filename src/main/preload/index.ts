import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

contextBridge.exposeInMainWorld('electronAPI', {
  ollama: {
    checkStatus: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.CHECK_STATUS),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.STOP),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.RESTART),
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.GET_CONFIG),
    updateConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.UPDATE_CONFIG, config),
    getModels: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.GET_MODELS),
    chat: (options: any) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.CHAT, options),
    streamChat: (options: any) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.STREAM_CHAT, options),
    pullModel: (modelName: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.PULL_MODEL, modelName),
    deleteModel: (modelName: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.DELETE_MODEL, modelName),
    getModelInfo: (modelName: string) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.GET_MODEL_INFO, modelName),
    copyModel: (source: string, destination: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.COPY_MODEL, { source, destination }),
    generateEmbedding: (text: string, model?: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.GENERATE_EMBEDDING, { text, model }),
    ps: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.PS),
    createModel: (name: string, modelfile: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.CREATE_MODEL, { name, modelfile }),
    
    onStatus: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on('ollama:status', listener);
      return () => ipcRenderer.removeListener('ollama:status', listener);
    },
    
    onLog: (callback: (log: any) => void) => {
      const listener = (_event: any, log: any) => callback(log);
      ipcRenderer.on('ollama:log', listener);
      return () => ipcRenderer.removeListener('ollama:log', listener);
    },
    
    onChatChunk: (callback: (chunk: string) => void) => {
      const listener = (_event: any, chunk: string) => callback(chunk);
      ipcRenderer.on('ollama:chatChunk', listener);
      return () => ipcRenderer.removeListener('ollama:chatChunk', listener);
    },
    
    onPullProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('ollama:pullProgress', listener);
      return () => ipcRenderer.removeListener('ollama:pullProgress', listener);
    },
  },
  file: {
    selectFolder: (options?: {
      title?: string;
      defaultPath?: string;
    }) => ipcRenderer.invoke(IPC_CHANNELS.FILE.SELECT_FOLDER, options),
    selectFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
      multi?: boolean;
    }) => ipcRenderer.invoke(IPC_CHANNELS.FILE.SELECT_FILE, options),
    readFile: (filePath: string, encoding?: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.FILE.READ_FILE, filePath, encoding),
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE),
    getMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.GET_MAXIMIZED),
    resize: (width: number, height: number) => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.RESIZE, width, height),
    getSize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.GET_SIZE),
  },
  ffmpeg: {
    validatePath: (binPath: string) => ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.VALIDATE_PATH, binPath),
    execute: (options: { ffmpegPath: string; args: string[]; outputPath?: string }) => 
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.EXECUTE, options),
    executeWithProgress: (options: { ffmpegPath: string; args: string[]; outputPath?: string; duration?: number }) => 
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.EXECUTE_WITH_PROGRESS, options),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.STOP),
    getMediaInfo: (ffprobePath: string, filePath: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.FFMPEG.GET_MEDIA_INFO, ffprobePath, filePath),
    
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('ffmpeg:progress', listener);
      return () => ipcRenderer.removeListener('ffmpeg:progress', listener);
    },
    
    onLog: (callback: (log: string) => void) => {
      const listener = (_event: any, log: string) => callback(log);
      ipcRenderer.on('ffmpeg:log', listener);
      return () => ipcRenderer.removeListener('ffmpeg:log', listener);
    },
  },
});

declare global {
  interface Window {
    electronAPI: {
      ollama: {
        checkStatus: () => Promise<any>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        restart: () => Promise<void>;
        getConfig: () => Promise<any>;
        updateConfig: (config: any) => Promise<any>;
        getModels: () => Promise<any[]>;
        chat: (options: any) => Promise<any>;
        streamChat: (options: any) => Promise<any>;
        pullModel: (modelName: string) => Promise<void>;
        deleteModel: (modelName: string) => Promise<void>;
        getModelInfo: (modelName: string) => Promise<any>;
        copyModel: (source: string, destination: string) => Promise<void>;
        generateEmbedding: (text: string, model?: string) => Promise<number[]>;
        ps: () => Promise<any>;
        createModel: (name: string, modelfile: string) => Promise<any>;
        onStatus: (callback: (status: any) => void) => () => void;
        onLog: (callback: (log: any) => void) => () => void;
        onChatChunk: (callback: (chunk: string) => void) => () => void;
        onPullProgress: (callback: (progress: any) => void) => () => void;
      };
      file: {
        selectFolder: (options?: {
          title?: string;
          defaultPath?: string;
        }) => Promise<{
          success: boolean;
          path: string | null;
          error?: string;
        }>;
        selectFile: (options?: {
          title?: string;
          defaultPath?: string;
          filters?: Array<{ name: string; extensions: string[] }>;
          multi?: boolean;
        }) => Promise<{
          success: boolean;
          filePath: string | null;
          filePaths?: string[] | null;
          error?: string;
        }>;
        readFile: (filePath: string, encoding?: string) => Promise<{
          success: boolean;
          content: string | null;
          error?: string;
        }>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        getMaximized: () => Promise<boolean>;
        resize: (width: number, height: number) => Promise<{ success: boolean; width?: number; height?: number }>;
        getSize: () => Promise<{ width: number; height: number } | null>;
      };
      ffmpeg: {
        validatePath: (binPath: string) => Promise<{
          valid: boolean;
          ffmpegPath: string;
          ffprobePath: string;
          error?: string;
        }>;
        execute: (options: {
          ffmpegPath: string;
          args: string[];
          outputPath?: string;
        }) => Promise<{
          success: boolean;
          error?: string;
          output?: string;
        }>;
        executeWithProgress: (options: {
          ffmpegPath: string;
          args: string[];
          outputPath?: string;
          duration?: number;
        }) => Promise<{
          success: boolean;
          error?: string;
        }>;
        stop: () => Promise<boolean>;
        getMediaInfo: (ffprobePath: string, filePath: string) => Promise<{
          duration: number;
          format: string;
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
        } | null>;
        onProgress: (callback: (progress: {
          frame: number;
          fps: number;
          size: string;
          time: string;
          bitrate: string;
          speed: string;
          progress: number;
        }) => void) => () => void;
        onLog: (callback: (log: string) => void) => () => void;
      };
    };
  }
}
