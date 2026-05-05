<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFFmpegStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { ffmpegService, fileService } from '@/services';
import { ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import {
  FolderOpen, Video, Merge, Layers, FolderSync,
  Play, Square, Info, AlertCircle, FileVideo,
  ChevronDown, ChevronRight, Clock, MonitorPlay, Gauge, ExternalLink, X, Copy, Check,
  Film, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-vue-next';

interface VideoInfo {
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

type SortField = 'name' | 'size' | 'duration' | 'width' | 'fps' | 'bitrate';
type SortOrder = 'asc' | 'desc' | 'default';

const ffmpegStore = useFFmpegStore();
const toast = useToast();

const folderPath = ref('');
const videos = ref<VideoInfo[]>([]);
const isScanning = ref(false);
const scanProgress = ref(0);
const activeOperation = ref<string | null>(null);
const logs = ref<string[]>([]);
const mergeOutputName = ref('merged_video.mp4');
const overwriteMerge = ref(false);
const expandedFolders = ref<Set<string>>(new Set());
const showFolderList = ref(true);
const autoScan = ref(true);
const copied = ref(false);
const highlightedIndex = ref<number | null>(null);
const sortField = ref<SortField>('name');
const sortOrder = ref<SortOrder>('default');
const isDragging = ref(false);

onMounted(async () => {
  await ffmpegStore.loadConfig();
});

watch(folderPath, (path) => {
  if (path) {
    expandedFolders.value = new Set([path]);
  }
});

const addLog = (log: string) => {
  logs.value = [...logs.value.slice(-100), log];
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const formatDuration = (seconds: number): string => {
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

const videoStats = computed(() => {
  if (videos.value.length === 0) return null;
  
  const fpsMap = new Map<number, number>();
  const resolutionMap = new Map<string, number>();
  const durationRanges = { short: 0, medium: 0, long: 0, veryLong: 0 };
  let totalSize = 0;
  
  videos.value.forEach(video => {
    if (video.fps > 0) {
      const fps = Math.round(video.fps * 100) / 100;
      fpsMap.set(fps, (fpsMap.get(fps) || 0) + 1);
    }
    
    if (video.width > 0 && video.height > 0) {
      const res = `${video.width}x${video.height}`;
      resolutionMap.set(res, (resolutionMap.get(res) || 0) + 1);
    }
    
    if (video.duration > 0) {
      if (video.duration < 60) durationRanges.short++;
      else if (video.duration < 300) durationRanges.medium++;
      else if (video.duration < 1800) durationRanges.long++;
      else durationRanges.veryLong++;
    }
    
    totalSize += video.size;
  });
  
  return {
    fpsMap: Array.from(fpsMap.entries()).sort((a, b) => a[0] - b[0]),
    resolutionMap: Array.from(resolutionMap.entries()).sort((a, b) => b[1] - a[1]),
    durationRanges,
    totalSize,
    totalCount: videos.value.length
  };
});

const folderTotalInfo = computed(() => {
  if (videos.value.length === 0) return null;
  const totalSize = videos.value.reduce((sum, v) => sum + v.size, 0);
  const totalDuration = videos.value.reduce((sum, v) => sum + v.duration, 0);
  return { totalSize, totalDuration };
});

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    if (sortOrder.value === 'default') sortOrder.value = 'asc';
    else if (sortOrder.value === 'asc') sortOrder.value = 'desc';
    else sortOrder.value = 'default';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
};

const sortedVideos = computed(() => {
  if (sortOrder.value === 'default') return videos.value;
  const sorted = [...videos.value];
  sorted.sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortField.value) {
      case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
      case 'size': aVal = a.size; bVal = b.size; break;
      case 'duration': aVal = a.duration; bVal = b.duration; break;
      case 'width': aVal = a.width * a.height; bVal = b.width * b.height; break;
      case 'fps': aVal = a.fps; bVal = b.fps; break;
      case 'bitrate': aVal = a.bitrate; bVal = b.bitrate; break;
    }
    if (typeof aVal === 'string') {
      return sortOrder.value === 'asc' 
        ? aVal.localeCompare(bVal as string) 
        : (bVal as string).localeCompare(aVal);
    }
    return sortOrder.value === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });
  return sorted;
});

const selectFolder = async () => {
  const path = await fileService.selectFolder({ title: '选择视频文件夹' });
  if (path) {
    folderPath.value = path;
    videos.value = [];
    logs.value = [];
    toast.success(`已选择文件夹: ${path}`);
    
    if (autoScan.value && ffmpegStore.isConfigured) {
      setTimeout(() => scanVideos(), 1500);
    }
  }
};

const clearFolder = () => {
  folderPath.value = '';
  videos.value = [];
  logs.value = [];
  expandedFolders.value = new Set();
};

const scanVideos = async () => {
  if (!folderPath.value) {
    toast.error('请先选择文件夹');
    return;
  }

  if (!ffmpegStore.config.ffprobePath) {
    toast.error('请先配置 FFmpeg');
    return;
  }

  isScanning.value = true;
  scanProgress.value = 0;
  videos.value = [];
  logs.value = [];
  addLog('[info] 开始扫描文件夹...');

  try {
    const unlistenProgress = await ffmpegService.onProgress((p) => {
      if (p.progress) scanProgress.value = p.progress;
    });

    const result = await ffmpegService.scanFolderVideos(
      ffmpegStore.config.ffprobePath,
      folderPath.value
    );

    unlistenProgress();

    if (result.videos.length > 0) {
      videos.value = result.videos as VideoInfo[];
      addLog(`[done] 扫描完成，共找到 ${result.totalCount} 个视频文件`);
      addLog(`[info] 总大小: ${formatSize(result.totalSize)}`);
      toast.success(`扫描完成，找到 ${result.totalCount} 个视频`);
    } else {
      addLog('[warn] 未找到视频文件');
      toast.info('未找到视频文件');
    }
  } catch (error) {
    console.error('扫描失败:', error);
    addLog(`[error] 扫描失败: ${error}`);
    toast.error('扫描失败');
  } finally {
    isScanning.value = false;
    scanProgress.value = 100;
  }
};

const mergeVideos = async () => {
  if (!folderPath.value) {
    toast.error('请先选择文件夹');
    return;
  }

  if (!ffmpegStore.config.ffmpegPath) {
    toast.error('请先配置 FFmpeg');
    return;
  }

  activeOperation.value = 'merge';
  logs.value = [];
  addLog('[info] 开始合并视频...');
  addLog(`[info] 输出文件: ${mergeOutputName.value}`);

  try {
    const result = await ffmpegService.mergeVideos(
      ffmpegStore.config.ffmpegPath,
      folderPath.value,
      mergeOutputName.value,
      overwriteMerge.value
    );

    if (result.success) {
      addLog(`[done] 合并完成: ${result.outputPath}`);
      toast.success('视频合并完成！');
    } else {
      addLog(`[error] 合并失败: ${result.error}`);
      toast.error(`合并失败: ${result.error}`);
    }
  } catch (error) {
    addLog(`[error] 合并失败: ${error}`);
    toast.error('合并失败');
  } finally {
    activeOperation.value = null;
  }
};

const copyAllVideoInfo = async () => {
  if (videos.value.length === 0) {
    toast.info('没有视频信息可复制');
    return;
  }

  const lines = [
    `文件夹: ${folderPath.value}`,
    `视频总数: ${videos.value.length} 个`,
    `总大小: ${formatSize(videos.value.reduce((sum, v) => sum + v.size, 0))}`,
    '',
    '=== 视频列表 ===',
  ];

  videos.value.forEach((video, index) => {
    lines.push(`【视频 ${index + 1}】 ${video.name}`);
    lines.push(`  大小: ${formatSize(video.size)} | 时长: ${formatDuration(video.duration)}`);
    lines.push(`  分辨率: ${video.width}x${video.height} | 帧率: ${video.fps.toFixed(2)}fps`);
  });

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copied.value = true;
    toast.success(`已复制 ${videos.value.length} 个视频的信息`);
    setTimeout(() => copied.value = false, 2000);
  } catch {
    toast.error('复制失败');
  }
};

const openFolder = async (path: string) => {
  await fileService.showInFolder(path);
};

const toggleFolder = (path: string) => {
  const newSet = new Set(expandedFolders.value);
  if (newSet.has(path)) newSet.delete(path);
  else newSet.add(path);
  expandedFolders.value = newSet;
};

const isProcessing = computed(() => isScanning.value || activeOperation.value !== null);
</script>

<template>
  <div class="folder-process">
    <div class="header">
      <div class="title-row">
        <FolderOpen class="icon" :size="20" />
        <h2>文件夹分析</h2>
        <Badge color="blue">批量操作</Badge>
        <Badge v-if="isProcessing" color="green">
          <span class="pulse-dot" />处理中
        </Badge>
      </div>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="card">
          <div class="card-header">
            <FolderOpen :size="16" class="icon-primary" />
            <span>选择文件夹</span>
            <button v-if="folderPath" class="btn-clear" @click="clearFolder">
              <X :size="12" />清空
            </button>
          </div>
          <button class="btn-primary" @click="selectFolder">
            <FolderOpen :size="16" />选择文件夹
          </button>
          <label class="checkbox-row">
            <input type="checkbox" v-model="autoScan" />
            <span>自动解析</span>
          </label>
          <div v-if="folderPath" class="path-display">
            <span class="label">当前路径:</span>
            <span class="value">{{ folderPath }}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <Video :size="16" class="icon-primary" />
            <span>视频信息解析</span>
          </div>
          <button 
            class="btn-secondary" 
            :disabled="!folderPath || !ffmpegStore.isConfigured || isProcessing"
            @click="scanVideos"
          >
            <Square v-if="isScanning" :size="16" />
            <Play v-else :size="16" />
            {{ isScanning ? '扫描中...' : '一键解析视频信息' }}
          </button>
          <ProgressBar v-if="isScanning" :value="scanProgress" label="扫描进度" />
          
          <div v-if="videos.length > 0" class="stats-card">
            <div class="stat-row">
              <span>视频数量</span>
              <span class="value-primary">{{ videos.length }} 个</span>
            </div>
            <div class="stat-row">
              <span>总大小</span>
              <span class="value-primary">{{ formatSize(videos.reduce((s, v) => s + v.size, 0)) }}</span>
            </div>
            <div class="stat-row">
              <span>总时长</span>
              <span class="value-primary">{{ formatDuration(videos.reduce((s, v) => s + v.duration, 0)) }}</span>
            </div>
          </div>
        </div>

        <div class="card collapsible">
          <div class="card-header clickable">
            <Merge :size="16" class="icon-primary" />
            <span>无损合并视频</span>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>输出文件名</label>
              <input 
                type="text" 
                v-model="mergeOutputName" 
                placeholder="merged_video.mp4"
              />
            </div>
            <label class="checkbox-row">
              <input type="checkbox" v-model="overwriteMerge" />
              <span>覆盖已存在的文件</span>
            </label>
            <button 
              class="btn-secondary"
              :disabled="!folderPath || !ffmpegStore.isConfigured || isProcessing"
              @click="mergeVideos"
            >
              <Merge :size="16" />
              {{ activeOperation === 'merge' ? '合并中...' : '开始合并' }}
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="!folderPath" class="empty-state" :class="{ dragging: isDragging }">
          <div class="empty-icon">
            <FolderOpen :size="40" />
          </div>
          <p class="empty-title">拖拽文件夹到此处</p>
          <p class="empty-desc">或点击左侧"选择文件夹"按钮</p>
          <div class="format-tags">
            <span v-for="f in ['MP4', 'MKV', 'AVI', 'MOV', 'WMV', 'FLV', 'WebM']" :key="f">{{ f }}</span>
          </div>
        </div>

        <template v-else>
          <div v-if="videos.length > 0" class="video-list-card">
            <div class="video-list-header">
              <div class="header-left">
                <FileVideo :size="16" class="icon-primary" />
                <span>视频列表</span>
                <span class="count-badge">{{ videos.length }}</span>
                <span v-if="folderTotalInfo" class="total-info">
                  总大小: {{ formatSize(folderTotalInfo.totalSize) }} · 
                  总时长: {{ formatDuration(folderTotalInfo.totalDuration) }}
                </span>
              </div>
              <div class="header-actions">
                <button class="btn-action purple" @click="copyAllVideoInfo">
                  <Check v-if="copied" :size="14" />
                  <Copy v-else :size="14" />
                  {{ copied ? '已复制' : '复制信息' }}
                </button>
              </div>
            </div>
            <div class="video-table-container">
              <table class="video-table">
                <thead>
                  <tr>
                    <th @click="toggleSort('name')">
                      文件名
                      <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" :size="12" />
                      <ArrowDown v-else-if="sortField === 'name' && sortOrder === 'desc'" :size="12" />
                    </th>
                    <th @click="toggleSort('size')">大小</th>
                    <th @click="toggleSort('duration')">时长</th>
                    <th @click="toggleSort('width')">分辨率</th>
                    <th>编码</th>
                    <th @click="toggleSort('fps')">帧率</th>
                    <th @click="toggleSort('bitrate')">码率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(video, index) in sortedVideos" 
                    :key="video.path"
                    :class="{ highlighted: highlightedIndex === index }"
                    @click="highlightedIndex = highlightedIndex === index ? null : index"
                  >
                    <td class="name-cell">{{ video.name }}</td>
                    <td>{{ formatSize(video.size) }}</td>
                    <td>{{ formatDuration(video.duration) }}</td>
                    <td>{{ video.width }}x{{ video.height }}</td>
                    <td>{{ video.codec }}</td>
                    <td>{{ video.fps.toFixed(2) }} fps</td>
                    <td>{{ formatBitrate(video.bitrate) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="logs.length > 0" class="logs-card">
            <div class="logs-header">
              <Info :size="16" class="icon-primary" />
              <span>操作日志</span>
              <button class="btn-clear" @click="logs = []">清空</button>
            </div>
            <Terminal :lines="logs" />
          </div>

          <div v-if="isProcessing" class="processing-card">
            <span class="pulse-dot" />
            <span>
              {{ isScanning ? '正在扫描视频...' : 
                 activeOperation === 'merge' ? '正在合并视频...' : '处理中...' }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-process {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.header {
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-row h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.icon {
  color: var(--primary-color);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  min-height: 0;
}

.left-panel, .right-panel {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.icon-primary {
  color: var(--primary-color);
}

.btn-clear {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background-color: var(--hover-bg);
}

.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: scale(1.02);
}

.btn-secondary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  transform: scale(1.02);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
}

.path-display {
  margin-top: 12px;
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
}

.path-display .label {
  color: var(--text-tertiary);
}

.path-display .value {
  color: var(--text-primary);
  word-break: break-all;
}

.stats-card {
  margin-top: 12px;
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: var(--text-tertiary);
}

.value-primary {
  color: var(--primary-color);
}

.card-body {
  padding-top: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.form-group input:focus {
  border-color: var(--primary-color);
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
  border-color: #06b6d4;
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

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.format-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.format-tags span {
  padding: 4px 8px;
  border-radius: 6px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.video-list-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.video-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.count-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
  font-size: 12px;
}

.total-info {
  font-size: 12px;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.btn-action.cyan {
  background: linear-gradient(135deg, #0891b2, #06b6d4);
}

.btn-action.purple {
  background: linear-gradient(135deg, #8b5cf6, #a78bfa);
}

.btn-action:hover {
  transform: scale(1.05);
}

.video-table-container {
  max-height: 320px;
  overflow-y: auto;
}

.video-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.video-table th {
  padding: 8px 12px;
  text-align: left;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.video-table th:hover {
  color: var(--text-primary);
}

.video-table td {
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.video-table tr:hover {
  background-color: var(--bg-tertiary);
}

.video-table tr.highlighted {
  background-color: rgba(6, 182, 212, 0.1);
}

.video-table tr.highlighted td {
  color: var(--primary-color);
}

.name-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logs-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.logs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.processing-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: rgba(139, 92, 246, 0.1);
  border: 1px solid var(--primary-color);
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-primary);
}
</style>
