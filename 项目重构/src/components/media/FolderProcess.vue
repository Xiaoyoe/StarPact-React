<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { useFFmpegStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { ffmpegService, fileService } from '@/services';
import { ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import {
  FolderOpen, Video, Merge, Layers, FolderSync,
  Play, Square, Info, AlertCircle, FileVideo,
  ChevronDown, ChevronRight, Clock, MonitorPlay, Gauge, ExternalLink, X, Copy, Check,
  ArrowUp, ArrowDown, ArrowUpDown
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
const operationProgress = ref(0);
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
const contextMenu = ref<{ x: number; y: number; video: VideoInfo } | null>(null);
let unlisteners: Array<() => void> = [];

const videoStats = computed(() => {
  if (videos.value.length === 0) return null;
  
  const fpsMap = new Map<number, number>();
  const resolutionMap = new Map<string, number>();
  const bitrateMap = new Map<string, number>();
  const durationRanges = { short: 0, medium: 0, long: 0, veryLong: 0 };
  let totalSize = 0;
  let minDuration = Infinity;
  let maxDuration = 0;
  
  videos.value.forEach(video => {
    if (video.fps > 0) {
      const fps = Math.round(video.fps * 100) / 100;
      fpsMap.set(fps, (fpsMap.get(fps) || 0) + 1);
    }
    
    if (video.width > 0 && video.height > 0) {
      const res = `${video.width}x${video.height}`;
      resolutionMap.set(res, (resolutionMap.get(res) || 0) + 1);
    }
    
    if (video.bitrate > 0) {
      let bitrateRange: string;
      const mbps = video.bitrate / 1000000;
      
      if (mbps < 1) {
        bitrateRange = '<1 Mbps';
      } else if (mbps < 5) {
        bitrateRange = '1-5 Mbps';
      } else if (mbps < 10) {
        bitrateRange = '5-10 Mbps';
      } else if (mbps < 20) {
        bitrateRange = '10-20 Mbps';
      } else {
        bitrateRange = '>20 Mbps';
      }
      
      bitrateMap.set(bitrateRange, (bitrateMap.get(bitrateRange) || 0) + 1);
    }
    
    if (video.duration > 0) {
      if (video.duration < 60) {
        durationRanges.short++;
      } else if (video.duration < 300) {
        durationRanges.medium++;
      } else if (video.duration < 1800) {
        durationRanges.long++;
      } else {
        durationRanges.veryLong++;
      }
      minDuration = Math.min(minDuration, video.duration);
      maxDuration = Math.max(maxDuration, video.duration);
    }
    
    totalSize += video.size;
  });
  
  const bitrateOrder = ['<1 Mbps', '1-5 Mbps', '5-10 Mbps', '10-20 Mbps', '>20 Mbps'];
  
  return {
    fpsMap: Array.from(fpsMap.entries()).sort((a, b) => a[0] - b[0]),
    resolutionMap: Array.from(resolutionMap.entries()).sort((a, b) => b[1] - a[1]),
    bitrateMap: Array.from(bitrateMap.entries()).sort((a, b) => bitrateOrder.indexOf(a[0]) - bitrateOrder.indexOf(b[0])),
    durationRanges,
    totalSize,
    minDuration: minDuration === Infinity ? 0 : minDuration,
    maxDuration,
    totalCount: videos.value.length
  };
});

const folderTotalInfo = computed(() => {
  if (videos.value.length === 0) return null;
  const totalSize = videos.value.reduce((sum, v) => sum + v.size, 0);
  const totalDuration = videos.value.reduce((sum, v) => sum + v.duration, 0);
  return { totalSize, totalDuration };
});

const folderList = computed(() => {
  if (!folderPath.value || videos.value.length === 0) return [];
  
  const folderMap = new Map<string, { 
    path: string; 
    name: string;
    videos: VideoInfo[]; 
    count: number; 
    size: number;
    isRoot?: boolean;
  }>();
  
  const rootVideos: VideoInfo[] = [];
  
  videos.value.forEach(video => {
    const lastSep = video.path.includes('\\') ? '\\' : '/';
    const lastSepIndex = video.path.lastIndexOf(lastSep);
    const videoDir = lastSepIndex > 0 ? video.path.substring(0, lastSepIndex) : '';
    
    if (videoDir === folderPath.value) {
      rootVideos.push(video);
    } else if (videoDir) {
      const existing = folderMap.get(videoDir);
      if (existing) {
        existing.videos.push(video);
        existing.count++;
        existing.size += video.size;
      } else {
        folderMap.set(videoDir, { 
          path: videoDir, 
          name: videoDir.replace(folderPath.value, '.') || videoDir,
          videos: [video], 
          count: 1, 
          size: video.size 
        });
      }
    }
  });
  
  const result = Array.from(folderMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  
  if (rootVideos.length > 0) {
    result.unshift({
      path: folderPath.value,
      name: folderPath.value,
      videos: rootVideos,
      count: rootVideos.length,
      size: rootVideos.reduce((sum, v) => sum + v.size, 0),
      isRoot: true
    });
  }
  
  return result;
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
  
  window.addEventListener('click', () => {
    contextMenu.value = null;
  });
});

onUnmounted(() => {
  unlisteners.forEach(unlisten => unlisten());
  unlisteners = [];
  window.removeEventListener('click', () => {
    contextMenu.value = null;
  });
});

const handleDroppedPaths = async (paths: string[]) => {
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts', '.m2ts', '.ogv', '.3gp', '.f4v'];
  
  for (const path of paths) {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    
    if (videoExts.includes(ext)) {
      const lastSep = path.includes('\\') ? '\\' : '/';
      const lastSepIndex = path.lastIndexOf(lastSep);
      const folderPathValue = lastSepIndex > 0 ? path.substring(0, lastSepIndex) : path;
      
      folderPath.value = folderPathValue;
      videos.value = [];
      logs.value = [];
      toast.success(`已检测到视频文件，自动选择所在文件夹: ${folderPathValue}`);
      
      if (autoScan.value && ffmpegStore.isConfigured) {
        setTimeout(() => scanVideos(), 1500);
      }
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const stat = await invoke<{ isDirectory: boolean; isFile: boolean }>('file_get_stats', { filePath: path });
      
      if (stat.isDirectory) {
        folderPath.value = path;
        videos.value = [];
        logs.value = [];
        toast.success(`已选择文件夹: ${path}`);
        
        if (autoScan.value && ffmpegStore.isConfigured) {
          setTimeout(() => scanVideos(), 1500);
        }
        return;
      }
    } catch (error) {
      console.error('Failed to check path:', error);
    }
  }
  
  toast.error('请拖入文件夹或视频文件');
};

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

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const clearFolder = () => {
  folderPath.value = '';
  videos.value = [];
  logs.value = [];
  expandedFolders.value = new Set();
};

const clearFolderList = () => {
  videos.value = [];
  logs.value = [];
  expandedFolders.value = new Set();
  toast.success('已清空文件夹列表');
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

    if (result.videos && result.videos.length > 0) {
      videos.value = result.videos as VideoInfo[];
      addLog(`[done] 扫描完成，共找到 ${result.totalCount} 个视频文件`);
      addLog(`[info] 总大小: ${formatSize(result.totalSize)}`);
      toast.success(`扫描完成，找到 ${result.totalCount} 个视频`);
    } else {
      addLog('[warn] 未找到视频文件');
      addLog(`[info] 扫描的文件夹: ${folderPath.value}`);
      addLog(`[info] 请确认文件夹中包含以下格式的视频文件: .mp4, .mkv, .avi, .mov, .wmv, .flv, .webm, .m4v, .ts, .mts, .m2ts, .ogv, .3gp, .f4v`);
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

const classifyByFps = async () => {
  if (!folderPath.value) {
    toast.error('请先选择文件夹');
    return;
  }

  if (!ffmpegStore.config.ffprobePath) {
    toast.error('请先配置 FFmpeg');
    return;
  }

  activeOperation.value = 'classify';
  operationProgress.value = 0;
  logs.value = [];
  addLog('[info] 开始按帧率分类视频...');

  try {
    const unlistenProgress = await ffmpegService.onProgress((p) => {
      if (p.progress) operationProgress.value = p.progress;
    });

    const result = await ffmpegService.classifyByFps(
      ffmpegStore.config.ffprobePath,
      folderPath.value
    );

    unlistenProgress();

    if (result.success) {
      addLog(`[done] 分类完成，共处理 ${result.classifiedCount} 个视频`);
      addLog(`[info] 创建的文件夹: ${result.folders.join(', ')}`);
      toast.success(`分类完成，创建了 ${result.folders.length} 个文件夹`);
      
      setTimeout(() => {
        scanVideos();
      }, 500);
    } else {
      addLog(`[error] 分类失败: ${result.error}`);
      toast.error(`分类失败: ${result.error}`);
    }
  } catch (error) {
    addLog(`[error] 分类失败: ${error}`);
    toast.error('分类失败');
  } finally {
    activeOperation.value = null;
  }
};

const collectSubfolderVideos = async () => {
  if (!folderPath.value) {
    toast.error('请先选择文件夹');
    return;
  }

  activeOperation.value = 'collect';
  logs.value = [];
  addLog('[info] 开始归集子文件夹视频...');

  try {
    const result = await ffmpegService.collectSubfolderVideos(folderPath.value);

    if (result.success) {
      addLog(`[done] 归集完成，共移动 ${result.collectedCount} 个视频`);
      toast.success(`归集完成，移动了 ${result.collectedCount} 个视频`);
      
      if (result.collectedCount > 0) {
        setTimeout(() => {
          scanVideos();
        }, 500);
      }
    } else {
      addLog(`[error] 归集失败: ${result.error}`);
      toast.error(`归集失败: ${result.error}`);
    }
  } catch (error) {
    addLog(`[error] 归集失败: ${error}`);
    toast.error('归集失败');
  } finally {
    activeOperation.value = null;
  }
};

const stopOperation = async () => {
  await ffmpegService.stop();
  activeOperation.value = null;
  addLog('[info] 操作已停止');
  toast.info('操作已停止');
};

const openFolder = async (path: string) => {
  await fileService.showInFolder(path);
};

const handleContextMenu = (e: MouseEvent, video: VideoInfo) => {
  e.preventDefault();
  e.stopPropagation();
  contextMenu.value = { x: e.clientX, y: e.clientY, video };
};

const openFileLocation = async (video: VideoInfo) => {
  await fileService.showInFolder(video.path);
  contextMenu.value = null;
};

const copyVideoInfo = async (video: VideoInfo) => {
  const info = [
    `文件名: ${video.name}`,
    `路径: ${video.path}`,
    `大小: ${formatSize(video.size)}`,
    `时长: ${formatDuration(video.duration)}`,
    `分辨率: ${video.width}x${video.height}`,
    `帧率: ${video.fps.toFixed(2)} fps`,
    `编码: ${video.codec}`,
    `码率: ${formatBitrate(video.bitrate)}`,
  ].join('\n');
  
  try {
    await navigator.clipboard.writeText(info);
    toast.success('已复制视频信息');
  } catch {
    toast.error('复制失败');
  }
  contextMenu.value = null;
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
    lines.push('');
    lines.push(`【视频 ${index + 1}】`);
    lines.push(`  文件名: ${video.name}`);
    lines.push(`  路径: ${video.path}`);
    lines.push(`  大小: ${formatSize(video.size)}`);
    lines.push(`  时长: ${formatDuration(video.duration)}`);
    lines.push(`  分辨率: ${video.width}x${video.height}`);
    lines.push(`  帧率: ${video.fps.toFixed(2)} fps`);
    lines.push(`  编码: ${video.codec}`);
    lines.push(`  码率: ${formatBitrate(video.bitrate)}`);
  });

  if (videoStats.value) {
    lines.push('');
    lines.push('=== 统计信息 ===');
    
    if (videoStats.value.fpsMap.length > 0) {
      lines.push('帧率分布:');
      videoStats.value.fpsMap.forEach(([fps, count]) => {
        lines.push(`  ${fps}fps: ${count} 个`);
      });
    }
    
    if (videoStats.value.resolutionMap.length > 0) {
      lines.push('分辨率分布:');
      videoStats.value.resolutionMap.forEach(([res, count]) => {
        lines.push(`  ${res}: ${count} 个`);
      });
    }
    
    if (videoStats.value.bitrateMap.length > 0) {
      lines.push('码率分布:');
      videoStats.value.bitrateMap.forEach(([bitrate, count]) => {
        lines.push(`  ${bitrate}: ${count} 个`);
      });
    }
    
    lines.push('时长分布:');
    lines.push(`  <1分钟: ${videoStats.value.durationRanges.short} 个`);
    lines.push(`  1-5分钟: ${videoStats.value.durationRanges.medium} 个`);
    lines.push(`  5-30分钟: ${videoStats.value.durationRanges.long} 个`);
    lines.push(`  >30分钟: ${videoStats.value.durationRanges.veryLong} 个`);
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    copied.value = true;
    toast.success(`已复制 ${videos.value.length} 个视频的信息`);
    setTimeout(() => copied.value = false, 2000);
  } catch {
    toast.error('复制失败');
  }
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
  <div 
    class="folder-process"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
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
          <div class="drop-hint" :class="{ active: isDragging }">
            <FolderSync v-if="isDragging" :size="24" class="drop-icon" />
            <span>{{ isDragging ? '松开以导入文件夹' : '或拖动文件夹到此处' }}</span>
          </div>
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
            <label class="checkbox-row" style="margin-left: auto; margin-bottom: 0;">
              <input type="checkbox" v-model="showFolderList" />
              <span>显示文件夹列表</span>
            </label>
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

          <div v-if="videos.length > 0 && videoStats" class="stats-detail-card">
            <div v-if="videoStats.fpsMap.length > 0" class="stats-detail-section">
              <div class="stats-detail-title">
                <Gauge :size="12" />
                <span>帧率分布</span>
              </div>
              <div class="stats-tags">
                <span v-for="[fps, count] in videoStats.fpsMap" :key="fps" class="tag">
                  {{ fps }}fps: {{ count }}
                </span>
              </div>
            </div>
            
            <div v-if="videoStats.resolutionMap.length > 0" class="stats-detail-section">
              <div class="stats-detail-title">
                <MonitorPlay :size="12" />
                <span>分辨率分布</span>
              </div>
              <div class="stats-tags">
                <span v-for="[res, count] in videoStats.resolutionMap.slice(0, 6)" :key="res" class="tag">
                  {{ res }}: {{ count }}
                </span>
                <span v-if="videoStats.resolutionMap.length > 6" class="tag more">
                  +{{ videoStats.resolutionMap.length - 6 }} 更多
                </span>
              </div>
            </div>
            
            <div v-if="videoStats.bitrateMap.length > 0" class="stats-detail-section">
              <div class="stats-detail-title">
                <Gauge :size="12" />
                <span>码率分布</span>
              </div>
              <div class="stats-tags">
                <span v-for="[bitrate, count] in videoStats.bitrateMap" :key="bitrate" class="tag">
                  {{ bitrate }}: {{ count }}
                </span>
              </div>
            </div>
            
            <div class="stats-detail-section">
              <div class="stats-detail-title">
                <Clock :size="12" />
                <span>时长分布</span>
              </div>
              <div class="stats-tags">
                <span v-if="videoStats.durationRanges.short > 0" class="tag">
                  &lt;1分钟: {{ videoStats.durationRanges.short }}
                </span>
                <span v-if="videoStats.durationRanges.medium > 0" class="tag">
                  1-5分钟: {{ videoStats.durationRanges.medium }}
                </span>
                <span v-if="videoStats.durationRanges.long > 0" class="tag">
                  5-30分钟: {{ videoStats.durationRanges.long }}
                </span>
                <span v-if="videoStats.durationRanges.veryLong > 0" class="tag">
                  &gt;30分钟: {{ videoStats.durationRanges.veryLong }}
                </span>
              </div>
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

        <div class="card collapsible">
          <div class="card-header clickable">
            <Layers :size="16" class="icon-primary" />
            <span>按帧率分类</span>
          </div>
          <div class="card-body">
            <div class="hint-text">
              自动读取每个视频帧率，创建 FPS_24、FPS_30 等文件夹并分类
            </div>
            <button 
              class="btn-secondary"
              :disabled="!folderPath || !ffmpegStore.isConfigured || isProcessing"
              @click="classifyByFps"
            >
              <Square v-if="activeOperation === 'classify'" :size="16" />
              <Layers v-else :size="16" />
              {{ activeOperation === 'classify' ? '分类中...' : '开始分类' }}
            </button>
            <ProgressBar v-if="activeOperation === 'classify'" :value="operationProgress" label="分类进度" />
          </div>
        </div>

        <div class="card collapsible">
          <div class="card-header clickable">
            <FolderSync :size="16" class="icon-primary" />
            <span>归集子文件夹视频</span>
          </div>
          <div class="card-body">
            <div class="hint-text">
              搜索所有嵌套子文件夹里的视频，移动到当前目录统一管理
            </div>
            <button 
              class="btn-secondary"
              :disabled="!folderPath || isProcessing"
              @click="collectSubfolderVideos"
            >
              <Square v-if="activeOperation === 'collect'" :size="16" />
              <FolderSync v-else :size="16" />
              {{ activeOperation === 'collect' ? '归集中...' : '开始归集' }}
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="!folderPath" class="empty-state" :class="{ dragging: isDragging }">
          <div class="empty-icon">
            <FolderOpen :size="40" />
          </div>
          <p class="empty-title">{{ isDragging ? '松开以选择文件夹' : '拖拽文件夹到此处' }}</p>
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
                      <span class="th-content">
                        文件名
                        <ArrowUp v-if="sortField === 'name' && sortOrder === 'asc'" :size="12" />
                        <ArrowDown v-else-if="sortField === 'name' && sortOrder === 'desc'" :size="12" />
                        <ArrowUpDown v-else :size="12" class="opacity-30" />
                      </span>
                    </th>
                    <th @click="toggleSort('size')">
                      <span class="th-content">大小</span>
                    </th>
                    <th @click="toggleSort('duration')">
                      <span class="th-content">时长</span>
                    </th>
                    <th @click="toggleSort('width')">
                      <span class="th-content">分辨率</span>
                    </th>
                    <th>编码</th>
                    <th @click="toggleSort('fps')">
                      <span class="th-content">帧率</span>
                    </th>
                    <th @click="toggleSort('bitrate')">
                      <span class="th-content">码率</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="(video, index) in sortedVideos" 
                    :key="video.path"
                    :class="{ highlighted: highlightedIndex === index }"
                    @click="highlightedIndex = highlightedIndex === index ? null : index"
                    @contextmenu="handleContextMenu($event, video)"
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

          <div v-if="showFolderList && (folderList.length > 0 || folderPath)" class="folder-list-card">
            <div class="folder-list-header">
              <div class="header-left">
                <FolderOpen :size="16" class="icon-primary" />
                <span>文件夹列表</span>
                <span class="count-badge">{{ folderList.length }}</span>
              </div>
              <button v-if="folderList.length > 0" class="btn-clear" @click="clearFolderList">
                <X :size="12" />清空
              </button>
            </div>
            <div class="folder-list-content">
              <div v-for="(folder, index) in folderList" :key="folder.path" class="folder-item">
                <div 
                  class="folder-item-header"
                  @click="toggleFolder(folder.path)"
                >
                  <div class="folder-info">
                    <ChevronDown v-if="expandedFolders.has(folder.path)" :size="16" class="chevron" />
                    <ChevronRight v-else :size="16" class="chevron" />
                    <FolderOpen 
                      :size="16" 
                      :class="['folder-icon', { 'root': folder.isRoot }]" 
                    />
                    <span class="folder-name">{{ folder.name }}</span>
                    <span v-if="folder.isRoot" class="root-badge">根目录</span>
                  </div>
                  <div class="folder-stats">
                    <span>{{ folder.count }} 个视频 · {{ formatSize(folder.size) }}</span>
                    <button 
                      class="btn-icon"
                      @click.stop="openFolder(folder.path)"
                      title="在资源管理器中打开"
                    >
                      <ExternalLink :size="14" />
                    </button>
                  </div>
                </div>
                <div v-if="expandedFolders.has(folder.path) && folder.videos.length > 0" class="folder-videos">
                  <div 
                    v-for="(video, vIndex) in folder.videos" 
                    :key="vIndex"
                    class="video-item"
                  >
                    <div class="video-info">
                      <Video :size="12" class="video-icon" />
                      <span class="video-name">{{ video.name }}</span>
                    </div>
                    <div class="video-stats">
                      <span>{{ formatSize(video.size) }}</span>
                      <span>{{ formatDuration(video.duration) }}</span>
                      <span v-if="video.width > 0">{{ video.width }}x{{ video.height }}</span>
                      <span v-if="video.fps > 0">{{ video.fps.toFixed(2) }}fps</span>
                    </div>
                  </div>
                </div>
              </div>
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
                 activeOperation === 'merge' ? '正在合并视频...' :
                 activeOperation === 'classify' ? '正在分类视频...' :
                 activeOperation === 'collect' ? '正在归集视频...' : '处理中...' }}
            </span>
            <button class="btn-stop" @click="stopOperation">
              <Square :size="14" />
              停止
            </button>
          </div>
        </template>
      </div>
    </div>

    <div 
      v-if="contextMenu" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <button class="context-menu-item" @click="openFileLocation(contextMenu.video)">
        <FolderOpen :size="14" class="icon-primary" />
        打开文件位置
      </button>
      <div class="context-menu-divider" />
      <button class="context-menu-item" @click="copyVideoInfo(contextMenu.video)">
        <Copy :size="14" class="icon-cyan" />
        复制视频信息
      </button>
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

.left-panel {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.right-panel {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
  scrollbar-gutter: stable;
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

.icon-cyan {
  color: #06b6d4;
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

.drop-hint {
  margin-top: 12px;
  padding: 16px;
  text-align: center;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-hint.active {
  border-color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
}

.drop-icon {
  animation: pulse 1s ease-in-out infinite;
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

.stats-detail-card {
  margin-top: 12px;
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
}

.stats-detail-section {
  margin-bottom: 8px;
}

.stats-detail-section:last-child {
  margin-bottom: 0;
}

.stats-detail-title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  color: var(--text-tertiary);
}

.stats-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 11px;
}

.tag.more {
  color: var(--text-tertiary);
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

.hint-text {
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
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

.th-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.opacity-30 {
  opacity: 0.3;
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

.folder-list-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.folder-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
}

.folder-list-content {
  max-height: 400px;
  overflow-y: auto;
}

.folder-item {
  border-bottom: 1px solid var(--border-color);
}

.folder-item:last-child {
  border-bottom: none;
}

.folder-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: var(--bg-primary);
}

.folder-item-header:hover {
  filter: brightness(0.98);
}

.folder-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.chevron {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.folder-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.folder-icon.root {
  color: var(--primary-color);
}

.folder-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.root-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
  flex-shrink: 0;
}

.folder-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.btn-icon {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.folder-videos {
  background-color: var(--bg-tertiary);
  padding: 8px 16px;
}

.video-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  background-color: var(--bg-primary);
  margin-bottom: 4px;
}

.video-item:last-child {
  margin-bottom: 0;
}

.video-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.video-icon {
  color: var(--primary-color);
  flex-shrink: 0;
}

.video-name {
  font-size: 11px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 10px;
  color: var(--text-tertiary);
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

.btn-stop {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-stop:hover {
  transform: scale(1.05);
}

.context-menu {
  position: fixed;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.context-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.context-menu-item:hover {
  background-color: var(--bg-tertiary);
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
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

.terminal-output::-webkit-scrollbar {
  width: 4px;
}

.terminal-output::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 2px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}
</style>
