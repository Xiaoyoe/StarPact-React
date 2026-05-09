<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useFFmpegStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { ffmpegService, fileService } from '@/services';
import {
  Video, Info, AlertCircle, FileVideo,
  Copy, Check, Trash2, X, Plus, Film, MonitorPlay,
  Music, FileText, Loader2, BarChart3,
  Clock, HardDrive, Play, Pause, SkipBack, SkipForward,
  Scissors, RotateCcw, Maximize2, Download, FolderOpen
} from 'lucide-vue-next';

interface VideoFileInfo {
  path: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  audioCodec: string;
  audioSampleRate: number;
  audioChannels: number;
  audioBitrate: number;
  format: string;
  thumbnail: string;
  tag?: 'original' | 'edited' | 'before-merge' | 'after-merge';
}

const ffmpegStore = useFFmpegStore();
const toast = useToast();

const videos = ref<VideoFileInfo[]>([]);
const isDragging = ref(false);
const isLoading = ref(false);
const loadProgress = ref(0);
const loadingName = ref('');
const viewingIndex = ref(0);
const logs = ref<string[]>([]);

const videoPlayer = ref<HTMLVideoElement | null>(null);
const playerContainer = ref<HTMLDivElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isDraggingProgress = ref(false);
const isFullscreen = ref(false);
const videoOrientation = ref<'landscape' | 'portrait' | 'square'>('landscape');

const startTime = ref(0);
const endTime = ref(0);
const isSettingStart = ref(true);
const isCutting = ref(false);
const cutProgress = ref(0);

let unlisteners: Array<() => void> = [];

const currentVideo = computed(() => {
  return videos.value.length > 0 && viewingIndex.value < videos.value.length 
    ? videos.value[viewingIndex.value] 
    : null;
});

const videoSrc = computed(() => {
  if (!currentVideo.value) return '';
  return convertFileSrc(currentVideo.value.path);
});

const totalStats = computed(() => {
  if (videos.value.length === 0) return null;
  const totalDuration = videos.value.reduce((sum, v) => sum + v.duration, 0);
  const totalSize = videos.value.reduce((sum, v) => sum + v.size, 0);
  return { totalDuration, totalSize };
});

const clipDuration = computed(() => {
  if (endTime.value > startTime.value) {
    return endTime.value - startTime.value;
  }
  return 0;
});

const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

onMounted(async () => {
  await ffmpegStore.loadConfig();
  
  try {
    const unlistenDragEnter = await listen('tauri://drag-enter', () => {
      isDragging.value = true;
    });
    unlisteners.push(unlistenDragEnter);
    
    const unlistenDragLeave = await listen('tauri://drag-leave', () => {
      isDragging.value = false;
    });
    unlisteners.push(unlistenDragLeave);
    
    const unlistenDragDrop = await listen<{ paths: string[] }>('tauri://drag-drop', (event) => {
      isDragging.value = false;
      const paths = event.payload.paths;
      if (paths && paths.length > 0) {
        handleDroppedPaths(paths);
      }
    });
    unlisteners.push(unlistenDragDrop);
  } catch (error) {
    console.error('Failed to setup file drop listener:', error);
  }
});

onUnmounted(() => {
  unlisteners.forEach(unlisten => unlisten());
  unlisteners = [];
});

const addLog = (log: string) => {
  logs.value = [...logs.value.slice(-100), log];
};

const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatBitrate = (bps: number): string => {
  if (!bps || bps <= 0) return 'N/A';
  if (bps < 1000) return bps + ' bps';
  if (bps < 1000000) return (bps / 1000).toFixed(0) + ' kbps';
  return (bps / 1000000).toFixed(2) + ' Mbps';
};

const formatSampleRate = (hz: number): string => {
  if (!hz || hz <= 0) return 'N/A';
  if (hz >= 1000) return (hz / 1000).toFixed(1) + ' kHz';
  return hz + ' Hz';
};

const getThumbnail = async (filePath: string): Promise<string> => {
  try {
    if (!ffmpegStore.config.ffmpegPath) return '';
    const thumbnail = await ffmpegService.extractFrame(
      ffmpegStore.config.ffmpegPath,
      filePath,
      1
    );
    return thumbnail;
  } catch {
    return '';
  }
};

const handleDroppedPaths = async (paths: string[]) => {
  if (!ffmpegStore.isConfigured) {
    toast.error('请先配置 FFmpeg');
    return;
  }
  
  isLoading.value = true;
  loadProgress.value = 0;
  
  const newVideos: VideoFileInfo[] = [];
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts', '.m2ts', '.ogv', '.3gp', '.f4v'];
  
  for (const path of paths) {
    try {
      const stat = await fileService.getFileStats(path);
      
      if (stat.isDirectory) {
        addLog(`[info] 扫描文件夹: ${path}`);
        const result = await ffmpegService.scanFolderVideos(
          ffmpegStore.config.ffprobePath,
          path
        );
        
        if (result.videos && result.videos.length > 0) {
          addLog(`[info] 找到 ${result.videos.length} 个视频文件`);
          
          for (let i = 0; i < result.videos.length; i++) {
            const v = result.videos[i] as any;
            const thumbnail = await getThumbnail(v.path);
            
            newVideos.push({
              path: v.path,
              name: v.name,
              size: v.size,
              duration: v.duration,
              width: v.width,
              height: v.height,
              codec: v.codec,
              fps: v.fps,
              bitrate: v.bitrate,
              audioCodec: v.audioCodec || '',
              audioSampleRate: v.audioSampleRate || 0,
              audioChannels: v.audioChannels || 0,
              audioBitrate: v.audioBitrate || 0,
              format: v.format || v.name.split('.').pop() || '',
              thumbnail,
            });
            
            loadProgress.value = Math.round(((i + 1) / result.videos.length) * 100);
            loadingName.value = v.name;
          }
        } else {
          addLog(`[warn] 文件夹中未找到视频文件`);
        }
      } else {
        const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
        if (!videoExts.includes(ext)) continue;
        
        const fileName = path.split(/[/\\]/).pop() || path;
        loadingName.value = fileName;
        
        const mediaInfo = await ffmpegService.getMediaInfo(
          ffmpegStore.config.ffprobePath,
          path
        );
        
        if (mediaInfo) {
          const thumbnail = await getThumbnail(path);
          
          newVideos.push({
            path,
            name: fileName,
            size: mediaInfo.size || 0,
            duration: mediaInfo.duration || 0,
            width: mediaInfo.video?.width || 0,
            height: mediaInfo.video?.height || 0,
            codec: mediaInfo.video?.codec || '',
            fps: mediaInfo.video?.fps || 0,
            bitrate: mediaInfo.video?.bitrate || 0,
            audioCodec: mediaInfo.audio?.codec || '',
            audioSampleRate: mediaInfo.audio?.sampleRate || 0,
            audioChannels: mediaInfo.audio?.channels || 0,
            audioBitrate: mediaInfo.audio?.bitrate || 0,
            format: mediaInfo.format || '',
            thumbnail,
          });
          addLog(`[done] 已加载: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Failed to process path:', error);
    }
  }
  
  if (newVideos.length > 0) {
    videos.value = [...videos.value, ...newVideos];
    viewingIndex.value = 0;
    toast.success(`已加载 ${newVideos.length} 个视频`);
  } else {
    toast.info('未找到有效的视频文件');
  }
  
  isLoading.value = false;
  loadingName.value = '';
};

const selectFiles = async () => {
  const paths = await fileService.selectFile({
    title: '选择视频文件',
    multiple: true,
    filters: [
      { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  
  if (!paths || (Array.isArray(paths) && paths.length === 0)) return;
  
  const pathArray = Array.isArray(paths) ? paths : [paths];
  await handleDroppedPaths(pathArray);
};

const selectFolder = async () => {
  const path = await fileService.selectFolder({
    title: '选择视频文件夹',
  });
  
  if (!path) return;
  
  await handleDroppedPaths([path]);
};

const handleVideoClick = (index: number) => {
  viewingIndex.value = index;
  resetClip();
};

const removeVideo = (index: number) => {
  videos.value = videos.value.filter((_, i) => i !== index);
  if (viewingIndex.value === index) {
    viewingIndex.value = Math.max(0, index - 1);
  } else if (viewingIndex.value > index) {
    viewingIndex.value--;
  }
};

const clearAll = () => {
  videos.value = [];
  logs.value = [];
  viewingIndex.value = 0;
  resetClip();
};

const togglePlay = () => {
  if (!videoPlayer.value) return;
  
  if (isPlaying.value) {
    videoPlayer.value.pause();
  } else {
    videoPlayer.value.play();
  }
  isPlaying.value = !isPlaying.value;
};

const skip = (seconds: number) => {
  if (!videoPlayer.value) return;
  videoPlayer.value.currentTime += seconds;
};

const handleTimeUpdate = () => {
  if (!videoPlayer.value || isDraggingProgress.value) return;
  currentTime.value = videoPlayer.value.currentTime;
};

const handleLoadedMetadata = () => {
  if (!videoPlayer.value) return;
  duration.value = videoPlayer.value.duration;
  endTime.value = duration.value;
  
  const videoWidth = videoPlayer.value.videoWidth;
  const videoHeight = videoPlayer.value.videoHeight;
  
  if (videoWidth > videoHeight) {
    videoOrientation.value = 'landscape';
  } else if (videoWidth < videoHeight) {
    videoOrientation.value = 'portrait';
  } else {
    videoOrientation.value = 'square';
  }
};

const handleVideoEnded = () => {
  isPlaying.value = false;
};

const startDrag = (event: MouseEvent) => {
  if (!videoPlayer.value) return;
  
  isDraggingProgress.value = true;
  updateProgressFromMouse(event);
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingProgress.value) return;
    updateProgressFromMouse(e);
  };
  
  const handleMouseUp = () => {
    isDraggingProgress.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

const updateProgressFromMouse = (event: MouseEvent) => {
  if (!playerContainer.value || !videoPlayer.value) return;
  
  const progressBar = playerContainer.value.querySelector('.progress-container') as HTMLElement;
  if (!progressBar) return;
  
  const rect = progressBar.getBoundingClientRect();
  const pos = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  videoPlayer.value.currentTime = pos * duration.value;
  currentTime.value = pos * duration.value;
};

const setClipPoint = () => {
  if (isSettingStart.value) {
    startTime.value = currentTime.value;
    isSettingStart.value = false;
    toast.success(`起始点已设置: ${formatDuration(currentTime.value)}`);
  } else {
    if (currentTime.value <= startTime.value) {
      toast.error('结束点必须大于起始点');
      return;
    }
    endTime.value = currentTime.value;
    isSettingStart.value = true;
    toast.success(`结束点已设置: ${formatDuration(currentTime.value)}`);
  }
};

const jumpToStart = () => {
  if (!videoPlayer.value) return;
  videoPlayer.value.currentTime = startTime.value;
};

const jumpToEnd = () => {
  if (!videoPlayer.value) return;
  videoPlayer.value.currentTime = endTime.value;
};

const resetClip = () => {
  startTime.value = 0;
  endTime.value = duration.value;
  isSettingStart.value = true;
};

const handleCut = async () => {
  if (!currentVideo.value) {
    toast.error('请先选择视频');
    return;
  }
  
  if (endTime.value <= startTime.value) {
    toast.error('请设置有效的裁剪时间段');
    return;
  }

  if (!ffmpegStore.isConfigured) {
    toast.error('请先配置 FFmpeg');
    return;
  }

  const inputPath = currentVideo.value.path;
  const inputName = currentVideo.value.name.replace(/\.[^/.]+$/, '');
  const defaultOutputName = `${inputName}_cut_${formatDuration(startTime.value).replace(/:/g, '-')}_${formatDuration(endTime.value).replace(/:/g, '-')}.mp4`;
  
  const outputPath = await fileService.saveFile({
    title: '保存裁剪后的视频',
    defaultPath: defaultOutputName,
    filters: [
      { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });

  if (!outputPath) return;

  isCutting.value = true;
  addLog(`[info] 开始裁剪视频: ${currentVideo.value.name}`);
  addLog(`[info] 时间段: ${formatDuration(startTime.value)} - ${formatDuration(endTime.value)}`);
  addLog(`[info] 时长: ${formatDuration(clipDuration.value)}`);
  addLog(`[info] 输出路径: ${outputPath}`);

  try {
    const args = [
      '-i', inputPath,
      '-ss', startTime.value.toString(),
      '-to', endTime.value.toString(),
      '-c', 'copy',
      '-avoid_negative_ts', '1',
      outputPath
    ];

    const result = await ffmpegService.execute({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args: args,
    });

    if (result.success) {
      addLog(`[done] 裁剪完成: ${outputPath}`);
      toast.success('视频裁剪成功！');
      
      const stat = await fileService.getFileStats(outputPath);
      if (stat.exists) {
        addLog(`[info] 输出文件大小: ${formatSize(stat.size)}`);
      }
    } else {
      addLog(`[error] 裁剪失败: ${result.error}`);
      toast.error('视频裁剪失败');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    addLog(`[error] 裁剪出错: ${errorMsg}`);
    toast.error('视频裁剪出错');
  } finally {
    isCutting.value = false;
  }
};

const toggleFullscreen = () => {
  if (!videoPlayer.value) return;
  
  if (!document.fullscreenElement) {
    videoPlayer.value.requestFullscreen().then(() => {
      isFullscreen.value = true;
    }).catch(err => {
      toast.error('无法进入全屏模式');
    });
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false;
    });
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!videoPlayer.value || !currentVideo.value) return;
  
  switch (event.key) {
    case ' ':
      event.preventDefault();
      togglePlay();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      skip(-5);
      break;
    case 'ArrowRight':
      event.preventDefault();
      skip(5);
      break;
    case 'f':
    case 'F':
      event.preventDefault();
      toggleFullscreen();
      break;
  }
};

const openFileLocation = async (index: number) => {
  const video = videos.value[index];
  if (!video) return;
  await fileService.showInFolder(video.path);
};

const copyVideoInfo = async () => {
  if (!currentVideo.value) return;
  
  const lines = [
    `文件名: ${currentVideo.value.name}`,
    `路径: ${currentVideo.value.path}`,
    `大小: ${formatSize(currentVideo.value.size)}`,
    `时长: ${formatDuration(currentVideo.value.duration)}`,
    `格式: ${currentVideo.value.format}`,
    '',
    '--- 视频流 ---',
    `分辨率: ${currentVideo.value.width}x${currentVideo.value.height}`,
    `编码: ${currentVideo.value.codec}`,
    `帧率: ${currentVideo.value.fps.toFixed(2)} fps`,
    `码率: ${formatBitrate(currentVideo.value.bitrate)}`,
  ];
  
  if (currentVideo.value.audioCodec) {
    lines.push('', '--- 音频流 ---');
    lines.push(`编码: ${currentVideo.value.audioCodec}`);
    if (currentVideo.value.audioSampleRate) lines.push(`采样率: ${formatSampleRate(currentVideo.value.audioSampleRate)}`);
    if (currentVideo.value.audioChannels) lines.push(`声道数: ${currentVideo.value.audioChannels}`);
    if (currentVideo.value.audioBitrate) lines.push(`码率: ${formatBitrate(currentVideo.value.audioBitrate)}`);
  }
  
  const text = lines.join('\n');
  
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制视频信息');
  } catch {
    toast.error('复制失败');
  }
};
</script>

<template>
  <div class="video-process" @keydown="handleKeydown" tabindex="0">
    <div class="header">
      <div class="title-row">
        <div class="icon-wrapper">
          <Film :size="16" />
        </div>
        <h2>视频处理</h2>
        <span class="badge primary">视频剪辑</span>
        <span v-if="videos.length > 0" class="badge gray">{{ videos.length }} 个视频</span>
        <div v-if="totalStats" class="total-stats">
          <span class="stat-item">
            <Clock :size="12" />
            {{ formatDuration(totalStats.totalDuration) }}
          </span>
          <span>·</span>
          <span class="stat-item">
            <HardDrive :size="12" />
            {{ formatSize(totalStats.totalSize) }}
          </span>
        </div>
      </div>
      <div v-if="videos.length > 0" class="header-actions">
        <button class="btn-clear" @click="clearAll">
          <Trash2 :size="14" />
          清空
        </button>
      </div>
    </div>

    <div v-if="!ffmpegStore.isConfigured" class="warning-banner">
      <AlertCircle :size="16" />
      <span>请先配置 FFmpeg bin 目录</span>
    </div>

    <div v-if="isLoading" class="loading-banner">
      <div class="loading-content">
        <Loader2 :size="16" class="spin" />
        <span>正在加载: {{ loadingName }}</span>
        <span class="progress-badge">{{ loadProgress }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${loadProgress}%` }" />
      </div>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div v-if="videos.length === 0" :class="['empty-state', { dragging: isDragging }]">
          <div class="empty-icon">
            <Video :size="48" />
          </div>
          <p class="empty-title">{{ isDragging ? '松开以添加视频' : '拖拽视频文件到此处' }}</p>
          <p class="empty-desc">或点击下方按钮选择文件</p>
          <div class="btn-group">
            <button class="btn-add" @click="selectFiles" :disabled="!ffmpegStore.isConfigured">
              <Plus :size="14" />
              选择视频文件
            </button>
            <button class="btn-folder" @click="selectFolder" :disabled="!ffmpegStore.isConfigured">
              <FolderOpen :size="14" />
              扫描文件夹
            </button>
          </div>
        </div>

        <template v-else>
          <div class="panel-header">
            <div class="panel-title">
              <Film :size="16" class="icon-primary" />
              <span>视频列表</span>
              <span class="count-badge">{{ videos.length }}</span>
            </div>
          </div>

          <div class="video-list">
            <div
              v-for="(video, index) in videos"
              :key="video.path"
              :class="['video-item', { active: index === viewingIndex }]"
              @click="handleVideoClick(index)"
              @contextmenu.prevent="openFileLocation(index)"
            >
              <div class="video-thumbnail">
                <img v-if="video.thumbnail" :src="video.thumbnail" :alt="video.name" />
                <Film v-else :size="24" class="placeholder-icon" />
                <span class="duration-badge">{{ formatDuration(video.duration) }}</span>
                <button class="remove-btn" @click.stop="removeVideo(index)">
                  <X :size="10" />
                </button>
              </div>
              <div class="video-info">
                <p class="video-name" :title="video.name">{{ video.name }}</p>
                <div class="video-tags">
                  <span class="tag purple">{{ formatSize(video.size) }}</span>
                  <span class="tag blue">{{ video.width }}x{{ video.height }}</span>
                  <span class="tag green">{{ video.fps.toFixed(2) }}fps</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div ref="playerContainer" class="middle-panel">
        <div v-if="!currentVideo" class="player-empty">
          <div class="empty-icon">
            <MonitorPlay :size="48" />
          </div>
          <p>选择视频开始播放</p>
        </div>

        <template v-else>
          <div :class="['player-wrapper', videoOrientation]">
            <div class="player-container">
              <video
                ref="videoPlayer"
                :src="videoSrc"
                class="video-player"
                @timeupdate="handleTimeUpdate"
                @loadedmetadata="handleLoadedMetadata"
                @ended="handleVideoEnded"
              />
              
              <div class="player-overlay">
                <button class="play-btn-large" @click="togglePlay">
                  <Play v-if="!isPlaying" :size="48" />
                  <Pause v-else :size="48" />
                </button>
              </div>
            </div>
          </div>

          <div class="player-controls">
            <div class="progress-container" @mousedown="startDrag">
              <div class="progress-bar">
                <div class="progress-played" :style="{ width: `${progress}%` }" />
                <div 
                  v-if="startTime > 0"
                  class="clip-marker clip-start"
                  :style="{ left: `${(startTime / duration) * 100}%` }"
                />
                <div 
                  v-if="endTime < duration"
                  class="clip-marker clip-end"
                  :style="{ left: `${(endTime / duration) * 100}%` }"
                />
                <div 
                  v-if="startTime > 0 || endTime < duration"
                  class="clip-selection"
                  :style="{ 
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }"
                />
                <div class="progress-handle" :style="{ left: `${progress}%` }" />
              </div>
            </div>

            <div class="controls-row">
              <div class="controls-left">
                <button class="control-btn" @click="skip(-5)" title="后退5秒 (←)">
                  <SkipBack :size="16" />
                </button>
                <button class="control-btn play-btn" @click="togglePlay" title="播放/暂停 (空格)">
                  <Play v-if="!isPlaying" :size="18" />
                  <Pause v-else :size="18" />
                </button>
                <button class="control-btn" @click="skip(5)" title="前进5秒 (→)">
                  <SkipForward :size="16" />
                </button>
                <span class="time-display">
                  {{ formatDuration(currentTime) }} / {{ formatDuration(duration) }}
                </span>
              </div>

              <div class="controls-right">
                <span v-if="clipDuration > 0" class="clip-duration">
                  剪辑时长: {{ formatDuration(clipDuration) }}
                </span>
                <button class="control-btn" @click="toggleFullscreen" title="全屏 (F)">
                  <Maximize2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="right-panel">
        <div v-if="!currentVideo" class="panel-empty">
          <div class="empty-icon">
            <Info :size="48" />
          </div>
          <p>选择视频查看详情</p>
        </div>

        <template v-else>
          <div class="detail-section">
            <div class="section-header">
              <Video :size="16" class="icon-primary" />
              <span>视频详情</span>
              <span class="index-badge">{{ viewingIndex + 1 }}/{{ videos.length }}</span>
            </div>
            <div class="section-content">
              <div class="info-group">
                <div class="info-row">
                  <span class="label">文件名</span>
                  <span class="value truncate" :title="currentVideo.name">{{ currentVideo.name }}</span>
                </div>
                <div class="info-row">
                  <span class="label">大小</span>
                  <span class="tag purple">{{ formatSize(currentVideo.size) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">时长</span>
                  <span class="tag pink">{{ formatDuration(currentVideo.duration) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">分辨率</span>
                  <span class="tag blue">{{ currentVideo.width }}x{{ currentVideo.height }}</span>
                </div>
                <div class="info-row">
                  <span class="label">帧率</span>
                  <span class="tag green">{{ currentVideo.fps.toFixed(2) }} fps</span>
                </div>
                <div class="info-row">
                  <span class="label">码率</span>
                  <span class="tag orange">{{ formatBitrate(currentVideo.bitrate) }}</span>
                </div>
              </div>
              <button class="btn-copy-info" @click="copyVideoInfo">
                <Copy :size="12" />
                复制信息
              </button>
            </div>
          </div>

          <div class="clip-section">
            <div class="section-header">
              <Scissors :size="16" class="icon-primary" />
              <span>剪辑工具</span>
            </div>
            <div class="section-content">
              <div class="time-display-row">
                <div class="time-box">
                  <span class="time-label">起始</span>
                  <span class="time-value">{{ formatDuration(startTime) }}</span>
                </div>
                <div class="time-box">
                  <span class="time-label">结束</span>
                  <span class="time-value">{{ formatDuration(endTime) }}</span>
                </div>
                <div v-if="clipDuration > 0" class="time-box highlight">
                  <span class="time-label">时长</span>
                  <span class="time-value">{{ formatDuration(clipDuration) }}</span>
                </div>
              </div>

              <div class="mode-selector">
                <button 
                  :class="['mode-btn', { active: isSettingStart }]"
                  @click="isSettingStart = true"
                >
                  <SkipBack :size="14" />
                  设置起始点
                </button>
                <button 
                  :class="['mode-btn', { active: !isSettingStart }]"
                  @click="isSettingStart = false"
                >
                  <SkipForward :size="14" />
                  设置结束点
                </button>
              </div>

              <button class="btn-mark" @click="setClipPoint">
                <Scissors :size="14" />
                {{ isSettingStart ? '标记当前位置为起始点' : '标记当前位置为结束点' }}
              </button>

              <div class="quick-actions">
                <button class="quick-btn" @click="jumpToStart" :disabled="startTime === 0">
                  <SkipBack :size="12" />
                  跳转起始
                </button>
                <button class="quick-btn" @click="jumpToEnd" :disabled="endTime === duration">
                  <SkipForward :size="12" />
                  跳转结束
                </button>
                <button class="quick-btn" @click="resetClip">
                  <RotateCcw :size="12" />
                  重置
                </button>
              </div>

              <button class="btn-execute" @click="handleCut" :disabled="clipDuration === 0 || isCutting">
                <Loader2 v-if="isCutting" :size="16" class="spin" />
                <Scissors v-else :size="16" />
                {{ isCutting ? '正在裁剪...' : '开始裁剪视频' }}
              </button>
            </div>
          </div>

          <div class="log-section">
            <div class="section-header">
              <FileText :size="16" class="icon-primary" />
              <span>操作日志</span>
            </div>
            <div class="log-content">
              <div v-for="(log, i) in logs.slice(-20)" :key="i" class="log-item">
                {{ log }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-process {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  outline: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: rgba(6, 182, 212, 0.15);
  color: var(--primary-color);
}

h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.badge.primary {
  background-color: rgba(6, 182, 212, 0.15);
  color: var(--primary-color);
}

.badge.gray {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
}

.total-stats {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: var(--bg-tertiary);
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background-color: rgba(239, 68, 68, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  transform: scale(1.05);
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

.loading-banner {
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.spin {
  animation: spin 1s linear infinite;
  color: var(--primary-color);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: var(--primary-color);
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.progress-bar {
  height: 4px;
  border-radius: 2px;
  background-color: var(--bg-tertiary);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--primary-color), #8b5cf6);
  transition: width 0.3s;
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 16px;
  min-height: 0;
}

@media (max-width: 1400px) {
  .content-grid {
    grid-template-columns: 240px 1fr 280px;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 220px 1fr 260px;
    gap: 12px;
  }
}

@media (max-width: 1000px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.left-panel {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  min-height: 0;
  overflow: hidden;
  max-height: 100%;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  transition: all 0.3s;
}

.empty-state.dragging {
  background-color: rgba(6, 182, 212, 0.1);
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  margin-bottom: 16px;
  color: var(--text-tertiary);
}

.empty-state.dragging .empty-icon {
  background-color: rgba(6, 182, 212, 0.15);
  color: var(--primary-color);
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state.dragging .empty-title {
  color: var(--primary-color);
}

.empty-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 200px;
}

.btn-add,
.btn-folder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add {
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
}

.btn-folder {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-add:hover:not(:disabled),
.btn-folder:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-add:disabled,
.btn-folder:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.icon-primary {
  color: var(--primary-color);
}

.count-badge {
  padding: 2px 8px;
  border-radius: 12px;
  background-color: var(--primary-color);
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.video-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-gutter: stable;
}

.video-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.video-item:hover {
  border-color: var(--primary-color);
  transform: translateX(4px);
}

.video-item.active {
  border-color: var(--primary-color);
  background-color: rgba(6, 182, 212, 0.1);
}

.video-thumbnail {
  position: relative;
  width: 80px;
  height: 60px;
  border-radius: 6px;
  background-color: var(--bg-primary);
  overflow: hidden;
  flex-shrink: 0;
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-tertiary);
  opacity: 0.5;
}

.duration-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  padding: 2px 4px;
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 9px;
  font-weight: 500;
}

.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background-color: rgba(239, 68, 68, 0.9);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.video-item:hover .remove-btn {
  opacity: 1;
}

.video-info {
  flex: 1;
  min-width: 0;
}

.video-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 500;
}

.tag.purple {
  background-color: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
}

.tag.blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.tag.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.tag.orange {
  background-color: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.tag.pink {
  background-color: rgba(236, 72, 153, 0.15);
  color: #f472b6;
}

.middle-panel {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  min-height: 0;
  overflow: hidden;
}

.player-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.player-empty .empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.player-empty p {
  font-size: 14px;
  color: var(--text-tertiary);
}

.player-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 0;
}

.player-wrapper.landscape .player-container {
  width: 100%;
  max-height: 100%;
}

.player-wrapper.portrait .player-container {
  height: 100%;
  max-width: 100%;
}

.player-wrapper.square .player-container {
  width: 100%;
  height: 100%;
}

.player-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-color: #000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.player-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s;
}

.player-container:hover .player-overlay {
  opacity: 1;
}

.play-btn-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background-color: rgba(6, 182, 212, 0.9);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3);
}

.play-btn-large:hover {
  transform: scale(1.1);
  background-color: var(--primary-color);
}

.player-controls {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.progress-container {
  height: 40px;
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 12px;
  padding: 8px 0;
  position: relative;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: var(--bg-tertiary);
  transition: height 0.2s;
}

.progress-container:hover .progress-bar {
  height: 8px;
}

.progress-played {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--primary-color), #06b6d4);
  transition: width 0.1s;
  position: relative;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--primary-color);
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
  cursor: grab;
  transition: transform 0.2s;
  z-index: 2;
}

.progress-container:hover .progress-handle {
  transform: translate(-50%, -50%) scale(1.2);
}

.progress-handle:active {
  cursor: grabbing;
}

.clip-marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 3px;
  background-color: #10b981;
  z-index: 3;
}

.clip-start {
  border-radius: 2px 0 0 2px;
}

.clip-end {
  border-radius: 0 2px 2px 0;
}

.clip-selection {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: rgba(16, 185, 129, 0.2);
  border-top: 2px solid #10b981;
  border-bottom: 2px solid #10b981;
  z-index: 1;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background-color: var(--primary-color);
  color: white;
}

.control-btn.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
}

.control-btn.play-btn:hover {
  transform: scale(1.1);
}

.time-display {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
  margin-left: 8px;
}

.clip-duration {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: rgba(16, 185, 129, 0.15);
  color: #34d399;
  font-weight: 500;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  gap: 16px;
}

.panel-empty .empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.panel-empty p {
  font-size: 14px;
  color: var(--text-tertiary);
}

.detail-section,
.clip-section,
.log-section {
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.index-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-tertiary);
  font-size: 11px;
}

.section-content {
  padding: 16px;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-row .label {
  color: var(--text-tertiary);
}

.info-row .value {
  color: var(--text-primary);
  text-align: right;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.btn-copy-info {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-info:hover {
  background-color: var(--bg-primary);
}

.time-display-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.time-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
}

.time-box.highlight {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.time-label {
  font-size: 10px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.time-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: monospace;
}

.time-box.highlight .time-value {
  color: #34d399;
}

.mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mode-btn.active {
  background-color: rgba(6, 182, 212, 0.15);
  border-color: var(--primary-color);
  color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.btn-mark {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}

.btn-mark:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: rgba(6, 182, 212, 0.1);
}

.quick-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-execute {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
}

.btn-execute:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.35);
}

.btn-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  scrollbar-gutter: stable;
}

.log-item {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: monospace;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-color);
}

.log-item:last-child {
  border-bottom: none;
}

.video-list::-webkit-scrollbar {
  width: 6px;
}

.video-list::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.video-list::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 3px;
  transition: background 0.2s;
}

.video-list::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.right-panel::-webkit-scrollbar {
  width: 6px;
}

.right-panel::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.right-panel::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 3px;
  transition: background 0.2s;
}

.right-panel::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.log-content::-webkit-scrollbar {
  width: 4px;
}

.log-content::-webkit-scrollbar-track {
  background: transparent;
}

.log-content::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 2px;
}

.log-content::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}
</style>
