import { create } from 'zustand';
import { ffmpegRendererService, type FFmpegProgress } from '@/services/ffmpeg/FFmpegRendererService';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

export type ProcessingModule = 'formatConvert' | 'audioProcess' | 'advancedTools' | 'commandBuilder' | 'icoConvert' | 'imageFormatConvert';

export interface ProcessingTask {
  id: string;
  module: ProcessingModule;
  fileName: string;
  inputPath: string;
  outputPath: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'stopped';
  error?: string;
  startTime: number;
  logs: string[];
}

interface FFmpegStore {
  isConfigured: boolean;
  isElectronEnv: boolean;
  outputPath: string;
  
  tasks: ProcessingTask[];
  activeTaskIds: Set<string>;
  
  checkConfig: () => Promise<void>;
  generateUniquePath: (basePath: string) => string;
  startTask: (module: ProcessingModule, fileName: string, inputPath: string, outputPath: string) => string;
  updateTaskProgress: (taskId: string, progress: number) => void;
  addTaskLog: (taskId: string, log: string) => void;
  completeTask: (taskId: string, success: boolean, error?: string) => void;
  stopTask: (taskId: string) => Promise<void>;
  removeTask: (taskId: string) => void;
  clearCompletedTasks: () => void;
  clearAllLogs: () => void;
  
  getTaskById: (taskId: string) => ProcessingTask | undefined;
  getActiveTasks: () => ProcessingTask[];
  getTaskLogs: (taskId: string) => string[];
}

const taskOutputPaths: Map<string, string> = new Map();

async function deleteFile(filePath: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.electronAPI?.file?.deleteFile) {
    const result = await window.electronAPI.file.deleteFile(filePath);
    return result.success;
  }
  return false;
}

export const useFFmpegStore = create<FFmpegStore>((set, get) => ({
  isConfigured: false,
  isElectronEnv: false,
  outputPath: '',
  tasks: [],
  activeTaskIds: new Set(),

  checkConfig: async () => {
    await ffmpegConfigStorage.ready();
    set({
      isConfigured: ffmpegConfigStorage.isValid(),
      outputPath: ffmpegConfigStorage.getOutputPath(),
      isElectronEnv: ffmpegRendererService.isElectron(),
    });
  },

  generateUniquePath: (basePath: string) => {
    return ffmpegRendererService.generateUniqueOutputPath(basePath);
  },

  startTask: (module, fileName, inputPath, outputPath) => {
    const taskId = `${module}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    taskOutputPaths.set(taskId, outputPath);
    
    const newTask: ProcessingTask = {
      id: taskId,
      module,
      fileName,
      inputPath,
      outputPath,
      progress: 0,
      status: 'processing',
      startTime: Date.now(),
      logs: [`[info] 开始处理: ${fileName}`, `[info] 输出到: ${outputPath}`],
    };

    set((state) => ({
      tasks: [newTask, ...state.tasks],
      activeTaskIds: new Set([...state.activeTaskIds, taskId]),
    }));

    return taskId;
  },

  updateTaskProgress: (taskId, progress) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, progress } : t
      ),
    }));
  },

  addTaskLog: (taskId, log) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, logs: [...t.logs.slice(-200), log] } : t
      ),
    }));
  },

  completeTask: (taskId, success, error) => {
    const outputPath = taskOutputPaths.get(taskId);
    
    if (!success && outputPath) {
      deleteFile(outputPath).catch(console.error);
    }
    
    taskOutputPaths.delete(taskId);
    ffmpegRendererService.clearFilePathCache(outputPath || '');

    set((state) => {
      const newActiveTaskIds = new Set(state.activeTaskIds);
      newActiveTaskIds.delete(taskId);

      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: success ? 'completed' : 'error',
                error,
                progress: success ? 100 : t.progress,
                logs: success
                  ? [...t.logs, '[done] ✅ 处理完成！']
                  : [...t.logs, `[error] ❌ 处理失败: ${error}`],
              }
            : t
        ),
        activeTaskIds: newActiveTaskIds,
      };
    });
  },

  stopTask: async (taskId) => {
    await ffmpegRendererService.stop();

    const outputPath = taskOutputPaths.get(taskId);
    
    if (outputPath) {
      await deleteFile(outputPath);
      taskOutputPaths.delete(taskId);
    }
    
    ffmpegRendererService.clearFilePathCache(outputPath || '');

    set((state) => {
      const newActiveTaskIds = new Set(state.activeTaskIds);
      newActiveTaskIds.delete(taskId);

      return {
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'stopped',
                logs: [...t.logs, '[info] 已停止处理，已删除未完成的文件'],
              }
            : t
        ),
        activeTaskIds: newActiveTaskIds,
      };
    });
  },

  removeTask: (taskId) => {
    taskOutputPaths.delete(taskId);

    set((state) => {
      const newActiveTaskIds = new Set(state.activeTaskIds);
      newActiveTaskIds.delete(taskId);

      return {
        tasks: state.tasks.filter((t) => t.id !== taskId),
        activeTaskIds: newActiveTaskIds,
      };
    });
  },

  clearCompletedTasks: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'error' && t.status !== 'stopped'),
    }));
  },

  clearAllLogs: () => {
    set((state) => ({
      tasks: state.tasks.map((t) => ({ ...t, logs: [] })),
    }));
  },

  getTaskById: (taskId) => {
    return get().tasks.find((t) => t.id === taskId);
  },

  getActiveTasks: () => {
    const state = get();
    return state.tasks.filter((t) => state.activeTaskIds.has(t.id));
  },

  getTaskLogs: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    return task?.logs || [];
  },
}));

let progressUnsubscribe: (() => void) | null = null;
let logUnsubscribe: (() => void) | null = null;
let listenersInitialized = false;

export function initFFmpegListeners() {
  if (listenersInitialized) return;
  
  if (progressUnsubscribe) progressUnsubscribe();
  if (logUnsubscribe) logUnsubscribe();

  progressUnsubscribe = ffmpegRendererService.onProgress((data: FFmpegProgress) => {
    if (data.taskId) {
      useFFmpegStore.getState().updateTaskProgress(data.taskId, data.progress);
    }
  });

  logUnsubscribe = ffmpegRendererService.onLog((data: { log: string; taskId?: string }) => {
    const cleanLog = data.log.trim();
    if (cleanLog && data.taskId) {
      useFFmpegStore.getState().addTaskLog(data.taskId, `[ffmpeg] ${cleanLog}`);
    }
  });
  
  listenersInitialized = true;
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initFFmpegListeners();
  } else {
    window.addEventListener('load', () => {
      initFFmpegListeners();
    });
  }
}
