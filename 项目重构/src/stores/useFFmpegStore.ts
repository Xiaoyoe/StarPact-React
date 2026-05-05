import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { storageService, type FfmpegConfig as RustFfmpegConfig } from '@/services/tauri/storage';

export type ProcessingModule = 
  | 'formatConvert' 
  | 'audioProcess' 
  | 'advancedTools' 
  | 'commandBuilder' 
  | 'icoConvert' 
  | 'imageFormatConvert' 
  | 'folderProcess' 
  | 'videoProcess' 
  | 'videoEdit';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'stopped' | 'error';

export interface ProcessingTask {
  id: string;
  fileName: string;
  module: ProcessingModule;
  status: ProcessingStatus;
  progress: number;
  inputPath: string;
  outputPath: string;
  startTime: number;
  error?: string;
  logs: string[];
}

export interface FFmpegConfig {
  binPath: string;
  ffmpegPath: string;
  ffprobePath: string;
  configured: boolean;
}

export const useFFmpegStore = defineStore('ffmpeg', () => {
  const tasks = ref<ProcessingTask[]>([]);
  const activeTaskIds = ref<Set<string>>(new Set());
  const config = ref<FFmpegConfig>({
    binPath: '',
    ffmpegPath: '',
    ffprobePath: '',
    configured: false,
  });
  const activeTab = ref('format');
  const onTabChangeCallback = ref<((tab: string) => void) | null>(null);

  const isConfigured = computed(() => config.value.configured);
  const activeTasks = computed(() => 
    tasks.value.filter(t => activeTaskIds.value.has(t.id))
  );
  const completedTasks = computed(() => 
    tasks.value.filter(t => !activeTaskIds.value.has(t.id))
  );
  const isProcessing = computed(() => activeTaskIds.value.size > 0);

  function addTask(task: Omit<ProcessingTask, 'id' | 'startTime' | 'logs'>): string {
    const id = crypto.randomUUID();
    const newTask: ProcessingTask = {
      ...task,
      id,
      startTime: Date.now(),
      logs: [],
    };
    tasks.value.unshift(newTask);
    if (task.status === 'processing') {
      activeTaskIds.value.add(id);
    }
    return id;
  }

  function updateTask(id: string, updates: Partial<ProcessingTask>) {
    const task = tasks.value.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      if (updates.status && updates.status !== 'processing') {
        activeTaskIds.value.delete(id);
      }
    }
  }

  function addTaskLog(id: string, log: string) {
    const task = tasks.value.find(t => t.id === id);
    if (task) {
      task.logs.push(log);
    }
  }

  function stopTask(id: string) {
    activeTaskIds.value.delete(id);
    const task = tasks.value.find(t => t.id === id);
    if (task) {
      task.status = 'stopped';
    }
  }

  function removeTask(id: string) {
    tasks.value = tasks.value.filter(t => t.id !== id);
    activeTaskIds.value.delete(id);
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(t => activeTaskIds.value.has(t.id));
  }

  function setConfig(newConfig: Partial<FFmpegConfig>) {
    Object.assign(config.value, newConfig);
  }

  function setActiveTab(tab: string) {
    activeTab.value = tab;
    if (onTabChangeCallback.value) {
      onTabChangeCallback.value(tab);
    }
  }

  function setOnTabChange(callback: ((tab: string) => void) | null) {
    onTabChangeCallback.value = callback;
  }

  async function loadConfig() {
    try {
      const savedConfig = await storageService.getFfmpegConfig();
      config.value = {
        binPath: savedConfig.bin_path,
        ffmpegPath: savedConfig.ffmpeg_path,
        ffprobePath: savedConfig.ffprobe_path,
        configured: savedConfig.configured,
      };
    } catch (error) {
      console.error('Failed to load FFmpeg config:', error);
    }
  }

  async function saveConfig() {
    try {
      await storageService.saveFfmpegConfig({
        bin_path: config.value.binPath,
        ffmpeg_path: config.value.ffmpegPath,
        ffprobe_path: config.value.ffprobePath,
        configured: config.value.configured,
        default_preset: '',
        output_dir: '',
      });
    } catch (error) {
      console.error('Failed to save FFmpeg config:', error);
    }
  }

  return {
    tasks,
    activeTaskIds,
    config,
    activeTab,
    isConfigured,
    activeTasks,
    completedTasks,
    isProcessing,
    addTask,
    updateTask,
    addTaskLog,
    stopTask,
    removeTask,
    clearCompletedTasks,
    setConfig,
    setActiveTab,
    setOnTabChange,
    loadConfig,
    saveConfig,
  };
});
