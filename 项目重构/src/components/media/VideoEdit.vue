<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Film, Scissors, Combine, RotateCw, FlipHorizontal, FlipVertical, Play, Pause, Square, Upload, ChevronDown, ChevronRight, Sparkles, Info, AlertCircle, Maximize2, X } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import type { MediaInfo } from '@/types/ffmpeg';

const ffmpegStore = useFFmpegStore();

const tab = ref('cut');
const inputFiles = ref<InputFile[]>([]);
const mainFileIndex = ref(0);
const dropZoneKey = ref(0);
const customFileName = ref('');
const showFullscreen = ref(false);

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

const startTime = ref(0);
const endTime = ref(0);
const currentTime = ref(0);
const isPlaying = ref(false);
const rotation = ref(0);
const flipH = ref(false);
const flipV = ref(false);
const videoElement = ref<HTMLVideoElement | null>(null);
const timelineRef = ref<HTMLDivElement | null>(null);

const mainFile = computed(() => inputFiles.value.length > mainFileIndex.value ? inputFiles.value[mainFileIndex.value] : null);
const duration = computed(() => mainFile.value?.mediaInfo?.duration || 0);

const currentModuleTask = computed(() => {
  return ffmpegStore.tasks.find(t => t.module === 'videoEdit' && ffmpegStore.activeTaskIds.has(t.id));
});
const isCurrentModuleProcessing = computed(() => !!currentModuleTask.value);

const handleFilesSelected = async (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const inputFilesData: InputFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    inputFilesData.push({
      file,
      path: (file as any).path || file.name,
      name: file.name,
      size: file.size,
    });
  }

  inputFiles.value = inputFilesData;
  mainFileIndex.value = 0;
  customFileName.value = '';

  await loadMainFileInfo(inputFilesData, 0);
};

const loadMainFileInfo = async (files: InputFile[], index: number) => {
  if (files.length > index && files[index].path) {
    const mediaInfo = await ffmpegService.getMediaInfo(
      ffmpegStore.config.ffprobePath,
      files[index].path
    );
    if (mediaInfo) {
      inputFiles.value = inputFiles.value.map((f, i) => i === index ? { ...f, mediaInfo } : f);
      endTime.value = mediaInfo.duration || 0;
    }
  }
};

const selectMainFile = async (index: number) => {
  mainFileIndex.value = index;
  customFileName.value = '';
  await loadMainFileInfo(inputFiles.value, index);
};

const clearAllFiles = () => {
  inputFiles.value = [];
  mainFileIndex.value = 0;
  customFileName.value = '';
  startTime.value = 0;
  endTime.value = 0;
  currentTime.value = 0;
  dropZoneKey.value++;
};

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  return parseFloat(timeStr) || 0;
};

const togglePlay = () => {
  if (!videoElement.value) return;
  
  if (isPlaying.value) {
    videoElement.value.pause();
  } else {
    videoElement.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const seekTo = (time: number) => {
  if (!videoElement.value) return;
  videoElement.value.currentTime = time;
  currentTime.value = time;
};

const handleTimeUpdate = () => {
  if (!videoElement.value) return;
  currentTime.value = videoElement.value.currentTime;
  
  if (currentTime.value >= endTime.value && isPlaying.value) {
    videoElement.value.pause();
    isPlaying.value = false;
  }
};

const handleVideoEnded = () => {
  isPlaying.value = false;
};

const setStartTime = () => {
  startTime.value = currentTime.value;
};

const setEndTime = () => {
  endTime.value = currentTime.value;
};

const getOutputFilePath = (extension: string, suffix?: string): string => {
  if (!mainFile.value) return '';
  
  const inputPath = mainFile.value.path;
  const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
  const lastDotIndex = mainFile.value.name.lastIndexOf('.');
  const inputName = lastDotIndex >= 0 ? mainFile.value.name.substring(0, lastDotIndex) : mainFile.value.name;
  
  const outputDir = inputDir;
  const sep = outputDir.includes('\\') ? '\\' : '/';
  
  const now = new Date();
  const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  
  const finalName = customFileName.value.trim() 
    ? customFileName.value.trim() 
    : `${inputName}${suffix ? `_${suffix}` : ''}_${dateTimeSuffix}`;
  
  return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
};

const buildCutArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  if (startTime.value > 0) {
    args.push('-ss', formatTime(startTime.value));
  }
  
  if (endTime.value < duration.value) {
    args.push('-to', formatTime(endTime.value));
  }
  
  args.push('-c', 'copy');
  args.push('-y');
  args.push(getOutputFilePath('mp4', 'cut'));
  
  return args;
};

const buildRotateArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  const filterParts: string[] = [];
  
  if (rotation.value !== 0) {
    filterParts.push(`transpose=${rotation.value === 90 ? 1 : rotation.value === 180 ? 2 : rotation.value === 270 ? 2 : 0}`);
    if (rotation.value === 270) {
      filterParts.push('transpose=1');
    }
  }
  
  if (flipH.value) {
    filterParts.push('hflip');
  }
  
  if (flipV.value) {
    filterParts.push('vflip');
  }
  
  if (filterParts.length > 0) {
    args.push('-vf', filterParts.join(','));
  }
  
  args.push('-c:a', 'copy');
  args.push('-y');
  args.push(getOutputFilePath('mp4', 'rotated'));
  
  return args;
};

const handleStart = async () => {
  if (!ffmpegStore.isConfigured) {
    alert('请先在配置中设置 FFmpeg bin 目录');
    return;
  }

  if (inputFiles.value.length === 0 || !mainFile.value) {
    alert('请先选择要处理的文件');
    return;
  }

  let args: string[];
  let outputPath: string;

  switch (tab.value) {
    case 'cut':
      args = buildCutArgs();
      outputPath = getOutputFilePath('mp4', 'cut');
      break;
    case 'rotate':
      args = buildRotateArgs();
      outputPath = getOutputFilePath('mp4', 'rotated');
      break;
    default:
      alert('该功能暂未实现');
      return;
  }

  const taskId = ffmpegStore.addTask({
    fileName: mainFile.value!.name,
    module: 'videoEdit',
    status: 'processing',
    progress: 0,
    inputPath: mainFile.value!.path,
    outputPath,
  });

  ffmpegStore.addTaskLog(taskId, `[info] FFmpeg Studio - 视频编辑模块`);
  ffmpegStore.addTaskLog(taskId, `[info] 模式: ${tab.value === 'cut' ? '裁剪' : '旋转/翻转'}`);

  try {
    const result = await ffmpegService.executeWithProgress({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args,
      taskId,
      duration: mainFile.value!.mediaInfo?.duration,
    });

    ffmpegStore.updateTask(taskId, {
      status: result.success ? 'completed' : 'error',
      progress: 100,
      error: result.error,
    });

    if (result.success) {
      ffmpegStore.addTaskLog(taskId, '[done] 处理完成');
    } else {
      ffmpegStore.addTaskLog(taskId, `[error] 处理失败: ${result.error}`);
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, {
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    });
    ffmpegStore.addTaskLog(taskId, `[error] 处理失败: ${error}`);
  }
};

const handleStop = async () => {
  if (currentModuleTask.value) {
    await ffmpegService.stop();
    ffmpegStore.stopTask(currentModuleTask.value.id);
  }
};

watch(mainFile, (newFile) => {
  if (newFile && newFile.mediaInfo) {
    endTime.value = newFile.mediaInfo.duration || 0;
    startTime.value = 0;
    currentTime.value = 0;
  }
});
</script>

<template>
  <div class="video-edit">
    <div class="header">
      <div class="title-row">
        <Film :size="20" class="icon primary" />
        <h2>视频编辑</h2>
        <span class="badge primary">专业</span>
        <span v-if="isCurrentModuleProcessing" class="badge green">
          <span class="pulse-dot" />处理中
        </span>
      </div>
      <div class="mode-tabs">
        <button 
          v-for="t in [
            { key: 'cut', label: '裁剪', icon: Scissors },
            { key: 'merge', label: '合并', icon: Combine },
            { key: 'rotate', label: '旋转/翻转', icon: RotateCw },
          ]"
          :key="t.key"
          :class="['mode-tab', { active: tab === t.key }]"
          @click="tab = t.key"
        >
          <component :is="t.icon" :size="14" />
          <span>{{ t.label }}</span>
        </button>
      </div>
    </div>

    <div v-if="!ffmpegStore.isConfigured" class="warning-banner">
      <AlertCircle :size="16" />
      <span>请先在配置中设置 FFmpeg bin 目录</span>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div v-if="inputFiles.length > 0" class="card">
          <div class="card-header">
            <Film :size="16" class="icon primary" />
            <span class="card-title">文件列表</span>
            <span class="file-count primary">{{ inputFiles.length }}</span>
            <button class="btn-clear" @click="clearAllFiles">清空</button>
          </div>
          <div class="file-list">
            <div 
              v-for="(file, index) in inputFiles" 
              :key="index"
              :class="['file-item', { active: mainFileIndex === index }]"
              @click="selectMainFile(index)"
            >
              <Sparkles v-if="mainFileIndex === index" :size="12" class="star-icon primary" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
            </div>
          </div>
          <div class="file-hint">点击文件可设为主文件</div>
        </div>

        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon primary" />
            <span class="card-title">文件导入</span>
          </div>
          <label :key="dropZoneKey" class="drop-zone">
            <input 
              type="file" 
              accept="video/*"
              multiple
              @change="handleFilesSelected"
            />
            <div class="drop-zone-content">
              <Upload :size="32" class="upload-icon" />
              <p>拖拽视频文件</p>
              <p class="hint">或点击选择文件</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <Film :size="16" class="icon primary" />
            <span class="card-title">输出文件名</span>
          </div>
          <div class="filename-input">
            <input 
              type="text" 
              v-model="customFileName"
              placeholder="留空则使用默认名称"
            />
            <span class="extension">.mp4</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="mainFile" class="card video-card">
          <div class="video-container">
            <video
              ref="videoElement"
              :src="`file://${mainFile.path}`"
              @timeupdate="handleTimeUpdate"
              @ended="handleVideoEnded"
            />
            <div class="video-overlay">
              <button class="play-btn" @click="togglePlay">
                <Pause v-if="isPlaying" :size="24" />
                <Play v-else :size="24" />
              </button>
            </div>
          </div>
          
          <div class="timeline-container">
            <div class="time-display">
              <span>{{ formatTime(currentTime) }}</span>
              <span>/</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
            
            <div ref="timelineRef" class="timeline">
              <div class="timeline-track">
                <div class="timeline-range" :style="{ left: `${(startTime / duration) * 100}%`, width: `${((endTime - startTime) / duration) * 100}%` }" />
                <div class="timeline-progress" :style="{ width: `${(currentTime / duration) * 100}%` }" />
                <div class="timeline-handle start" :style="{ left: `${(startTime / duration) * 100}%` }" />
                <div class="timeline-handle end" :style="{ left: `${(endTime / duration) * 100}%` }" />
                <div class="timeline-cursor" :style="{ left: `${(currentTime / duration) * 100}%` }" />
              </div>
            </div>
            
            <div class="timeline-controls">
              <button class="time-btn" @click="setStartTime">设为起点</button>
              <button class="time-btn" @click="setEndTime">设为终点</button>
            </div>
          </div>
        </div>

        <div v-if="tab === 'cut'" class="card">
          <div class="card-header">
            <Scissors :size="16" class="icon primary" />
            <span class="card-title">裁剪设置</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>开始时间</label>
                <input type="text" :value="formatTime(startTime)" @input="startTime = parseTime(($event.target as HTMLInputElement).value)" class="mono" />
              </div>
              <div class="form-group">
                <label>结束时间</label>
                <input type="text" :value="formatTime(endTime)" @input="endTime = parseTime(($event.target as HTMLInputElement).value)" class="mono" />
              </div>
              <div class="form-group">
                <label>时长</label>
                <input type="text" :value="formatTime(endTime - startTime)" readonly class="mono readonly" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="tab === 'rotate'" class="card">
          <div class="card-header">
            <RotateCw :size="16" class="icon primary" />
            <span class="card-title">旋转/翻转设置</span>
          </div>
          <div class="card-body">
            <div class="rotation-grid">
              <button 
                v-for="r in [
                  { value: 0, label: '0°' },
                  { value: 90, label: '90°' },
                  { value: 180, label: '180°' },
                  { value: 270, label: '270°' },
                ]"
                :key="r.value"
                :class="['rotation-btn', { active: rotation === r.value }]"
                @click="rotation = r.value"
              >
                {{ r.label }}
              </button>
            </div>
            <div class="flip-grid">
              <label class="checkbox-label">
                <input type="checkbox" v-model="flipH" />
                <FlipHorizontal :size="16" />
                水平翻转
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="flipV" />
                <FlipVertical :size="16" />
                垂直翻转
              </label>
            </div>
          </div>
        </div>

        <div :class="['action-card', { processing: isCurrentModuleProcessing }]">
          <div class="action-row">
            <button 
              :disabled="!ffmpegStore.isConfigured"
              :class="['action-btn', { stop: isCurrentModuleProcessing }]"
              @click="isCurrentModuleProcessing ? handleStop() : handleStart()"
            >
              <Square v-if="isCurrentModuleProcessing" :size="16" />
              <Play v-else :size="16" />
              <span>{{ isCurrentModuleProcessing ? '停止处理' : '开始处理' }}</span>
            </button>
            <div v-if="isCurrentModuleProcessing && currentModuleTask" class="progress-info">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${currentModuleTask.progress}%` }" />
              </div>
              <span class="progress-text">{{ Math.floor(currentModuleTask.progress) }}%</span>
            </div>
            <div v-else class="hint-text">
              <Info :size="14" />
              <span>选择文件后点击开始处理</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-edit {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  color: var(--primary-color);
}

.icon.primary {
  color: var(--primary-color);
}

h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.badge.primary {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.badge.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.mode-tabs {
  display: flex;
  gap: 4px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab:hover {
  background-color: var(--hover-bg);
}

.mode-tab.active {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 12px;
  flex-shrink: 0;
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 8px;
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.file-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.file-count.primary {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.btn-clear {
  margin-left: auto;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  transform: scale(1.05);
}

.file-list {
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.file-item:hover {
  background-color: var(--hover-bg);
}

.file-item.active {
  background-color: rgba(59, 130, 246, 0.15);
  border: 1px solid var(--primary-color);
}

.star-icon.primary {
  color: var(--primary-color);
}

.file-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.file-hint {
  padding: 8px 16px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.drop-zone {
  display: block;
  padding: 24px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}

.drop-zone input {
  display: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.upload-icon {
  opacity: 0.5;
}

.drop-zone-content p {
  font-size: 12px;
  margin: 0;
}

.drop-zone-content .hint {
  font-size: 10px;
}

.filename-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
}

.filename-input input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.filename-input input:focus {
  border-color: var(--primary-color);
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.video-card {
  display: flex;
  flex-direction: column;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background-color: black;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.video-container:hover .video-overlay {
  opacity: 1;
}

.play-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.timeline-container {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-family: monospace;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.timeline {
  position: relative;
  height: 32px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 100%;
}

.timeline-range {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: rgba(59, 130, 246, 0.3);
  border-left: 2px solid var(--primary-color);
  border-right: 2px solid var(--primary-color);
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: rgba(59, 130, 246, 0.5);
}

.timeline-handle {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background-color: var(--primary-color);
  cursor: ew-resize;
  transform: translateX(-50%);
}

.timeline-cursor {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: white;
  transform: translateX(-50%);
}

.timeline-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.time-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.time-btn:hover {
  background-color: var(--hover-bg);
}

.card-body {
  padding: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-group input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.form-group input.mono {
  font-family: monospace;
}

.form-group input.readonly {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.form-group input:focus {
  border-color: var(--primary-color);
}

.rotation-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.rotation-btn {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.rotation-btn:hover {
  background-color: var(--hover-bg);
}

.rotation-btn.active {
  background-color: rgba(59, 130, 246, 0.15);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.flip-grid {
  display: flex;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

.action-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s;
}

.action-card.processing {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: var(--primary-color);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), #2563eb);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.action-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.stop {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.progress-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #2563eb);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-tertiary);
  min-width: 40px;
}

.hint-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
