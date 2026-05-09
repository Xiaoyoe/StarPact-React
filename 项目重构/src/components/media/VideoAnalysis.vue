<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { useFFmpegStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { ffmpegService, fileService } from '@/services';
import {
  Video, Info, AlertCircle, FileVideo,
  Copy, Check, Trash2, X, Plus, Film, MonitorPlay,
  Music, FileText, Loader2, BarChart3,
  Clock, HardDrive, GitCompare, ArrowUp, ArrowDown,
  Send, Columns, PanelLeft, PanelLeftClose
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

type SortField = 'name' | 'size' | 'duration' | 'width' | 'fps' | 'bitrate';
type SortOrder = 'asc' | 'desc';
type RightPanelTab = 'detail' | 'compare' | 'stats';

const ffmpegStore = useFFmpegStore();
const toast = useToast();

const videos = ref<VideoFileInfo[]>([]);
const isDragging = ref(false);
const isLoading = ref(false);
const loadProgress = ref(0);
const loadingName = ref('');
const viewingIndex = ref(0);
const selectedIndices = ref<Set<number>>(new Set());
const logs = ref<string[]>([]);
const sortField = ref<SortField>('name');
const sortOrder = ref<SortOrder>('asc');
const rightPanelTab = ref<RightPanelTab>('detail');
const panelView = ref<'both' | 'left' | 'right'>('both');
const copiedId = ref<string | null>(null);

let unlisteners: Array<() => void> = [];

const currentVideo = computed(() => {
  return videos.value.length > 0 && viewingIndex.value < videos.value.length 
    ? videos.value[viewingIndex.value] 
    : null;
});

const totalStats = computed(() => {
  if (videos.value.length === 0) return null;
  const totalDuration = videos.value.reduce((sum, v) => sum + v.duration, 0);
  const totalSize = videos.value.reduce((sum, v) => sum + v.size, 0);
  return { totalDuration, totalSize };
});

const selectedVideos = computed(() => {
  return Array.from(selectedIndices.value)
    .sort((a, b) => a - b)
    .map(i => videos.value[i])
    .filter(Boolean);
});

const selectedCount = computed(() => selectedIndices.value.size);

const stats = computed(() => {
  if (videos.value.length === 0) return null;
  
  const totalSize = videos.value.reduce((sum, v) => sum + v.size, 0);
  const totalDuration = videos.value.reduce((sum, v) => sum + v.duration, 0);
  const avgBitrate = videos.value.reduce((sum, v) => sum + v.bitrate, 0) / videos.value.length;
  const avgFps = videos.value.reduce((sum, v) => sum + v.fps, 0) / videos.value.length;
  
  const resolutions = videos.value.map(v => v.width * v.height);
  const maxResolution = Math.max(...resolutions);
  const minResolution = Math.min(...resolutions);
  
  const codecs = [...new Set(videos.value.map(v => v.codec).filter(Boolean))];
  const audioCodecs = [...new Set(videos.value.map(v => v.audioCodec).filter(Boolean))];
  const formats = [...new Set(videos.value.map(v => v.format).filter(Boolean))];
  
  return {
    count: videos.value.length,
    totalSize,
    totalDuration,
    avgBitrate,
    avgFps,
    maxResolution,
    minResolution,
    codecs,
    audioCodecs,
    formats,
  };
});

const compareData = computed(() => {
  if (selectedVideos.value.length < 2) return null;
  
  const sizes = selectedVideos.value.map(v => v.size);
  const durations = selectedVideos.value.map(v => v.duration);
  const bitrates = selectedVideos.value.map(v => v.bitrate);
  const fpsList = selectedVideos.value.map(v => v.fps);
  const resolutions = selectedVideos.value.map(v => v.width * v.height);
  
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  const maxBitrate = Math.max(...bitrates);
  const minBitrate = Math.min(...bitrates);
  const maxFps = Math.max(...fpsList);
  const minFps = Math.min(...fpsList);
  const maxRes = Math.max(...resolutions);
  const minRes = Math.min(...resolutions);
  
  return {
    sizes,
    durations,
    bitrates,
    fpsList,
    resolutions,
    maxSize,
    minSize,
    maxDuration,
    minDuration,
    maxBitrate,
    minBitrate,
    maxFps,
    minFps,
    maxRes,
    minRes,
  };
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

watch(selectedCount, (count) => {
  if (count >= 2) {
    rightPanelTab.value = 'compare';
  }
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

const handleVideoClick = (index: number) => {
  viewingIndex.value = index;
  if (selectedCount.value < 2) {
    rightPanelTab.value = 'detail';
  }
};

const toggleSelect = (index: number, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    const newSet = new Set(selectedIndices.value);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedIndices.value = newSet;
  } else {
    selectedIndices.value = new Set([index]);
  }
};

const selectAll = () => {
  if (videos.value.length > 0) {
    selectedIndices.value = new Set(videos.value.map((_, i) => i));
  }
};

const deselectAll = () => {
  selectedIndices.value = new Set();
  rightPanelTab.value = 'detail';
};

const removeVideo = (index: number) => {
  videos.value = videos.value.filter((_, i) => i !== index);
  if (viewingIndex.value === index) {
    viewingIndex.value = Math.max(0, index - 1);
  } else if (viewingIndex.value > index) {
    viewingIndex.value--;
  }
  selectedIndices.value = new Set();
};

const clearAll = () => {
  videos.value = [];
  logs.value = [];
  viewingIndex.value = 0;
  selectedIndices.value = new Set();
};

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
};

const togglePanelView = () => {
  if (panelView.value === 'both') panelView.value = 'left';
  else if (panelView.value === 'left') panelView.value = 'right';
  else panelView.value = 'both';
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
    copiedId.value = 'detail';
    toast.success('已复制视频信息');
    setTimeout(() => copiedId.value = null, 2000);
  } catch {
    toast.error('复制失败');
  }
};

const copySelectedMainInfo = async () => {
  if (selectedVideos.value.length === 0) {
    toast.info('请先选择要复制的视频');
    return;
  }
  
  const lines = selectedVideos.value.map(v => 
    `${v.name}: ${formatSize(v.size)} | ${formatDuration(v.duration)} | ${v.width}x${v.height} | ${v.fps.toFixed(2)}fps | ${formatBitrate(v.bitrate)}`
  );
  
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copiedId.value = 'selected';
    toast.success(`已复制 ${selectedVideos.value.length} 个视频的主要信息`);
    setTimeout(() => copiedId.value = null, 2000);
  } catch {
    toast.error('复制失败');
  }
};

const copyAllInfo = async () => {
  if (videos.value.length === 0) return;
  
  const allText = videos.value.map((v, i) => {
    const lines = [
      `=== 视频 ${i + 1} ===`,
      `文件名: ${v.name}`,
      `大小: ${formatSize(v.size)}`,
      `时长: ${formatDuration(v.duration)}`,
      `分辨率: ${v.width}x${v.height}`,
      `帧率: ${v.fps.toFixed(2)} fps`,
      `码率: ${formatBitrate(v.bitrate)}`,
    ];
    return lines.join('\n');
  }).join('\n\n');
  
  try {
    await navigator.clipboard.writeText(allText);
    copiedId.value = 'all';
    toast.success(`已复制 ${videos.value.length} 个视频的信息`);
    setTimeout(() => copiedId.value = null, 2000);
  } catch {
    toast.error('复制失败');
  }
};

const openFileLocation = async (index: number) => {
  const video = videos.value[index];
  if (!video) return;
  await fileService.showInFolder(video.path);
};
</script>

<template>
  <div class="video-analysis">
    <div class="header">
      <div class="title-row">
        <div class="icon-wrapper">
          <Film :size="16" />
        </div>
        <h2>视频分析</h2>
        <span class="badge primary">信息查看</span>
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
        <span v-if="selectedCount > 0" class="badge cyan">已选择 {{ selectedCount }} 个</span>
      </div>
      <div v-if="videos.length > 0" class="header-actions">
        <div class="view-toggle">
          <button 
            :class="['toggle-btn', { active: panelView === 'both' }]"
            @click="panelView = 'both'"
            title="显示左右双栏"
          >
            <Columns :size="14" />
            双栏
          </button>
          <button 
            :class="['toggle-btn', { active: panelView === 'left' }]"
            @click="panelView = 'left'"
            title="仅显示左侧"
          >
            <PanelLeft :size="14" />
            左侧
          </button>
          <button 
            :class="['toggle-btn', { active: panelView === 'right' }]"
            @click="panelView = 'right'"
            title="仅显示右侧"
          >
            <PanelLeftClose :size="14" />
            右侧
          </button>
        </div>
        
        <button class="btn-send" @click="copySelectedMainInfo">
          <Send :size="14" />
          发送到视频处理{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
        
        <button class="btn-copy" @click="copySelectedMainInfo">
          <Check v-if="copiedId === 'selected'" :size="14" class="text-green-400" />
          <Copy v-else :size="14" />
          复制选中{{ selectedCount > 0 ? ` (${selectedCount})` : '' }}
        </button>
        
        <button class="btn-copy" @click="copyAllInfo">
          <Check v-if="copiedId === 'all'" :size="14" class="text-green-400" />
          <Copy v-else :size="14" />
          复制全部
        </button>
        
        <button class="btn-danger" @click="clearAll">
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
      <div v-show="panelView !== 'right'" :class="['left-panel', { 'full-width': panelView === 'left' }]">
        <div v-if="videos.length === 0" :class="['empty-state', { dragging: isDragging }]">
          <div class="empty-icon">
            <Video :size="48" />
          </div>
          <p class="empty-title">{{ isDragging ? '松开以添加视频' : '拖拽视频文件到此处' }}</p>
          <p class="empty-desc">或点击下方按钮选择文件</p>
          <button class="btn-add" @click="selectFiles" :disabled="!ffmpegStore.isConfigured">
            <Plus :size="14" />
            选择视频文件
          </button>
        </div>

        <template v-else>
          <div class="video-grid-header">
            <div class="header-left">
              <Film :size="16" class="icon-primary" />
              <span>视频列表</span>
              <span class="count-badge">{{ videos.length }}</span>
            </div>
            <div class="header-right">
              <button class="sort-btn" @click="toggleSort('name')">
                名称
                <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" :size="12" />
                <ArrowDown v-if="sortField === 'name' && sortOrder === 'desc'" :size="12" />
              </button>
              <button class="sort-btn" @click="toggleSort('size')">
                大小
                <ArrowUp v-if="sortField === 'size' && sortOrder === 'asc'" :size="12" />
                <ArrowDown v-if="sortField === 'size' && sortOrder === 'desc'" :size="12" />
              </button>
              <button class="sort-btn" @click="toggleSort('duration')">
                时长
                <ArrowUp v-if="sortField === 'duration' && sortOrder === 'asc'" :size="12" />
                <ArrowDown v-if="sortField === 'duration' && sortOrder === 'desc'" :size="12" />
              </button>
              <button class="action-btn" @click="selectAll">全选</button>
              <button class="action-btn" @click="deselectAll">取消</button>
            </div>
          </div>

          <div class="video-grid">
            <div
              v-for="(video, index) in videos"
              :key="video.path"
              :class="['video-item', { 
                viewing: index === viewingIndex,
                selected: selectedIndices.has(index)
              }]"
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
                <button 
                  v-if="selectedIndices.has(index)"
                  class="select-indicator"
                  @click.stop="toggleSelect(index, $event)"
                >
                  <Check :size="12" />
                </button>
              </div>
              <div class="video-info">
                <p class="video-name" :title="video.name">{{ video.name }}</p>
                <div class="video-tags">
                  <span class="tag purple">{{ formatSize(video.size) }}</span>
                  <span class="tag blue">{{ video.width }}x{{ video.height }}</span>
                  <span class="tag green">{{ video.fps.toFixed(2) }}fps</span>
                  <span class="tag orange">{{ formatBitrate(video.bitrate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-show="panelView !== 'left'" :class="['right-panel', { 'full-width': panelView === 'right' }]">
        <div v-if="videos.length === 0" class="panel-empty">
          <div class="empty-icon">
            <Info :size="48" />
          </div>
          <p>导入视频后查看详情</p>
        </div>

        <template v-else>
          <div class="panel-tabs">
            <button 
              :class="['tab-btn', { active: rightPanelTab === 'detail' }]"
              @click="rightPanelTab = 'detail'"
            >
              <Video :size="14" />
              详情
            </button>
            <button 
              :class="['tab-btn', { active: rightPanelTab === 'compare' }]"
              @click="rightPanelTab = 'compare'"
            >
              <GitCompare :size="14" />
              对比{{ selectedCount > 0 ? `(${selectedCount})` : '' }}
            </button>
            <button 
              :class="['tab-btn', { active: rightPanelTab === 'stats' }]"
              @click="rightPanelTab = 'stats'"
            >
              <BarChart3 :size="14" />
              统计
            </button>
          </div>

          <div v-if="rightPanelTab === 'detail' && currentVideo" class="detail-panel">
            <div class="detail-card">
              <div class="detail-header">
                <div class="header-left">
                  <Video :size="16" class="icon-primary" />
                  <span>视频详情</span>
                  <span class="index-badge">{{ viewingIndex + 1 }}/{{ videos.length }}</span>
                </div>
                <button class="btn-copy" @click="copyVideoInfo">
                  <Check v-if="copiedId === 'detail'" :size="12" class="text-green-400" />
                  <Copy v-else :size="12" />
                  {{ copiedId === 'detail' ? '已复制' : '复制信息' }}
                </button>
              </div>
              <div class="detail-body">
                <div class="section">
                  <div class="section-title">
                    <FileText :size="14" class="icon-primary" />
                    <span>基本信息</span>
                  </div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="label">文件名</span>
                      <span class="value truncate" :title="currentVideo.name">{{ currentVideo.name }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">路径</span>
                      <span class="value truncate" :title="currentVideo.path">{{ currentVideo.path }}</span>
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
                      <span class="label">格式</span>
                      <span class="value">{{ currentVideo.format }}</span>
                    </div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">
                    <MonitorPlay :size="14" class="icon-primary" />
                    <span>视频流</span>
                  </div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="label">分辨率</span>
                      <span class="tag blue">{{ currentVideo.width }}x{{ currentVideo.height }}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">编码</span>
                      <span class="value">{{ currentVideo.codec }}</span>
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
                </div>

                <div v-if="currentVideo.audioCodec" class="section">
                  <div class="section-title">
                    <Music :size="14" class="icon-primary" />
                    <span>音频流</span>
                  </div>
                  <div class="info-grid">
                    <div class="info-row">
                      <span class="label">编码</span>
                      <span class="value">{{ currentVideo.audioCodec }}</span>
                    </div>
                    <div v-if="currentVideo.audioSampleRate > 0" class="info-row">
                      <span class="label">采样率</span>
                      <span class="value">{{ formatSampleRate(currentVideo.audioSampleRate) }}</span>
                    </div>
                    <div v-if="currentVideo.audioChannels > 0" class="info-row">
                      <span class="label">声道</span>
                      <span class="value">{{ currentVideo.audioChannels === 1 ? '单声道' : currentVideo.audioChannels === 2 ? '立体声' : `${currentVideo.audioChannels}声道` }}</span>
                    </div>
                    <div v-if="currentVideo.audioBitrate > 0" class="info-row">
                      <span class="label">码率</span>
                      <span class="tag orange">{{ formatBitrate(currentVideo.audioBitrate) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="rightPanelTab === 'compare'" class="compare-panel">
            <div v-if="selectedVideos.length < 2" class="compare-empty">
              <GitCompare :size="48" class="empty-icon" />
              <p>选择至少 2 个视频进行对比</p>
              <p class="hint">按住 Ctrl 点击视频可多选</p>
            </div>
            <div v-else class="compare-content">
              <div class="compare-header">
                <GitCompare :size="16" class="icon-primary" />
                <span>视频对比</span>
                <span class="count-badge">{{ selectedVideos.length }} 个视频</span>
              </div>
              <div class="compare-table">
                <table>
                  <thead>
                    <tr>
                      <th>属性</th>
                      <th v-for="(video, i) in selectedVideos" :key="i">{{ video.name }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>大小</td>
                      <td v-for="(video, i) in selectedVideos" :key="i">
                        <span 
                          :class="['compare-value', { 
                            'max': compareData?.maxSize === video.size && compareData?.minSize !== video.size,
                            'min': compareData?.minSize === video.size && compareData?.maxSize !== video.size
                          }]"
                        >
                          {{ formatSize(video.size) }}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>时长</td>
                      <td v-for="(video, i) in selectedVideos" :key="i">
                        <span 
                          :class="['compare-value', { 
                            'max': compareData?.maxDuration === video.duration && compareData?.minDuration !== video.duration,
                            'min': compareData?.minDuration === video.duration && compareData?.maxDuration !== video.duration
                          }]"
                        >
                          {{ formatDuration(video.duration) }}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>分辨率</td>
                      <td v-for="(video, i) in selectedVideos" :key="i">
                        <span 
                          :class="['compare-value', { 
                            'max': compareData?.maxRes === video.width * video.height && compareData?.minRes !== video.width * video.height,
                            'min': compareData?.minRes === video.width * video.height && compareData?.maxRes !== video.width * video.height
                          }]"
                        >
                          {{ video.width }}x{{ video.height }}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>帧率</td>
                      <td v-for="(video, i) in selectedVideos" :key="i">
                        <span 
                          :class="['compare-value', { 
                            'max': compareData?.maxFps === video.fps && compareData?.minFps !== video.fps,
                            'min': compareData?.minFps === video.fps && compareData?.maxFps !== video.fps
                          }]"
                        >
                          {{ video.fps.toFixed(2) }} fps
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>码率</td>
                      <td v-for="(video, i) in selectedVideos" :key="i">
                        <span 
                          :class="['compare-value', { 
                            'max': compareData?.maxBitrate === video.bitrate && compareData?.minBitrate !== video.bitrate,
                            'min': compareData?.minBitrate === video.bitrate && compareData?.maxBitrate !== video.bitrate
                          }]"
                        >
                          {{ formatBitrate(video.bitrate) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div v-else-if="rightPanelTab === 'stats' && stats" class="stats-panel">
            <div class="stats-card">
              <div class="stats-header">
                <BarChart3 :size="16" class="icon-primary" />
                <span>视频统计</span>
              </div>
              <div class="stats-content">
                <div class="stat-item">
                  <span class="label">视频总数</span>
                  <span class="value">{{ stats.count }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">总大小</span>
                  <span class="value">{{ formatSize(stats.totalSize) }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">总时长</span>
                  <span class="value">{{ formatDuration(stats.totalDuration) }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">平均码率</span>
                  <span class="value">{{ formatBitrate(stats.avgBitrate) }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">平均帧率</span>
                  <span class="value">{{ stats.avgFps.toFixed(2) }} fps</span>
                </div>
                <div class="stat-item">
                  <span class="label">视频编码</span>
                  <span class="value">{{ stats.codecs.join(', ') }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">音频编码</span>
                  <span class="value">{{ stats.audioCodecs.join(', ') }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">格式</span>
                  <span class="value">{{ stats.formats.join(', ') }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-analysis {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
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

.badge.cyan {
  background-color: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
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
  flex-wrap: wrap;
}

.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background-color: var(--primary-color);
  color: white;
}

.btn-send {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.15);
}

.btn-send:hover {
  transform: scale(1.05);
}

.btn-copy {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  background-color: var(--bg-primary);
}

.btn-danger {
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

.btn-danger:hover {
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
  grid-template-columns: 7fr 5fr;
  gap: 16px;
  min-height: 0;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.left-panel.full-width {
  grid-column: 1 / -1;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.right-panel.full-width {
  grid-column: 1 / -1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  background-color: var(--bg-secondary);
  min-height: 400px;
  transition: all 0.3s;
}

.empty-state.dragging {
  border-color: var(--primary-color);
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

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.2);
}

.btn-add:hover:not(:disabled) {
  transform: scale(1.05);
}

.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.video-grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.header-left {
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

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.video-item {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.video-item:hover {
  transform: scale(1.02);
  border-color: var(--primary-color);
}

.video-item.viewing {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.15);
}

.video-item.selected {
  border-color: #06b6d4;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.25);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 100px;
  background-color: var(--bg-tertiary);
  overflow: hidden;
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
  bottom: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  font-weight: 500;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
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

.select-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background-color: rgba(6, 182, 212, 0.9);
  color: white;
  cursor: pointer;
}

.video-info {
  padding: 8px;
}

.video-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.tag {
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 8px;
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

.panel-empty p {
  font-size: 14px;
  color: var(--text-tertiary);
}

.panel-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background-color: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: rgba(6, 182, 212, 0.15);
  color: var(--primary-color);
}

.tab-btn:hover:not(.active) {
  background-color: var(--bg-tertiary);
}

.detail-panel,
.compare-panel,
.stats-panel {
  flex: 1;
  overflow-y: auto;
}

.detail-card {
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
}

.index-badge {
  padding: 2px 8px;
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-tertiary);
  font-size: 11px;
}

.detail-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
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

.compare-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  gap: 12px;
}

.compare-empty .empty-icon {
  color: var(--text-tertiary);
}

.compare-empty p {
  font-size: 14px;
  color: var(--text-secondary);
}

.compare-empty .hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.compare-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compare-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.compare-table {
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.compare-table table {
  width: 100%;
  border-collapse: collapse;
}

.compare-table th,
.compare-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
}

.compare-table th {
  background-color: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.compare-table td {
  color: var(--text-secondary);
}

.compare-value {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.compare-value.max {
  background-color: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.compare-value.min {
  background-color: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.stats-card {
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.stats-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-content .stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  font-size: 12px;
}

.stats-content .stat-item .label {
  color: var(--text-tertiary);
}

.stats-content .stat-item .value {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
