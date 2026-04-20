import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Video, Info, AlertCircle, FileVideo,
  Copy, Check, Trash2, X, Plus, Film, MonitorPlay, 
  Music, FileText, Loader2, BarChart3, GitCompare, 
  ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Minus,
  FolderOpen, Send, Filter, PanelLeftClose, PanelLeft, Columns, Rows
} from 'lucide-react';
import { Badge, Terminal } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { useFFmpegStore, type CompareVideoData, type PendingVideosForEdit } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

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
type FilterMode = 'all' | 'processed';

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBitrate(bps: number): string {
  if (!bps || bps <= 0) return 'N/A';
  if (bps < 1000) return bps + ' bps';
  if (bps < 1000000) return (bps / 1000).toFixed(0) + ' kbps';
  return (bps / 1000000).toFixed(2) + ' Mbps';
}

function formatBitrateAlt(bps: number): string | null {
  if (!bps || bps <= 0) return null;
  if (bps >= 1000000) return (bps / 1000).toFixed(0) + ' kbps';
  if (bps >= 1000) return bps + ' bps';
  return null;
}

function formatSampleRate(hz: number): string {
  if (!hz || hz <= 0) return 'N/A';
  if (hz >= 1000) return (hz / 1000).toFixed(1) + ' kHz';
  return hz + ' Hz';
}

function videoInfoToText(video: VideoFileInfo): string {
  const lines = [
    `文件名: ${video.name}`,
    `路径: ${video.path}`,
    `大小: ${formatSize(video.size)}`,
    `时长: ${formatDuration(video.duration)}`,
    `格式: ${video.format}`,
    '',
    '--- 视频流 ---',
    `分辨率: ${video.width}x${video.height}`,
    `编码: ${video.codec}`,
    `帧率: ${video.fps.toFixed(2)} fps`,
    `码率: ${formatBitrate(video.bitrate)}`,
  ];
  
  if (video.audioCodec) {
    lines.push('', '--- 音频流 ---');
    lines.push(`编码: ${video.audioCodec}`);
    if (video.audioSampleRate) lines.push(`采样率: ${formatSampleRate(video.audioSampleRate)}`);
    if (video.audioChannels) lines.push(`声道数: ${video.audioChannels}`);
    if (video.audioBitrate) lines.push(`码率: ${formatBitrate(video.audioBitrate)}`);
  }
  
  return lines.join('\n');
}

function videoMainInfoToText(video: VideoFileInfo): string {
  const lines = [
    `文件名: ${video.name}`,
    `分辨率: ${video.width}x${video.height}`,
    `帧率: ${video.fps.toFixed(2)} fps`,
    `码率: ${formatBitrate(video.bitrate)}`,
    `时长: ${formatDuration(video.duration)}`,
    `大小: ${formatSize(video.size)}`,
  ];
  return lines.join('\n');
}

function CompareValue({ 
  value, 
  isMax, 
  isMin, 
  showDiff = false,
  diffPercent = 0 
}: { 
  value: string; 
  isMax?: boolean; 
  isMin?: boolean; 
  showDiff?: boolean;
  diffPercent?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  let bgColor = 'transparent';
  let textColor = 'var(--text-primary)';
  
  if (isMax && !isMin) {
    bgColor = isHovered ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)';
    textColor = '#34d399';
  } else if (isMin && !isMax) {
    bgColor = isHovered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)';
    textColor = '#f87171';
  }
  
  return (
    <div className="flex flex-col items-center">
      <span 
        className="px-2 py-1 rounded text-xs font-medium transition-all duration-200 cursor-default"
        style={{ backgroundColor: bgColor, color: textColor }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isMax && !isMin ? '最大值' : isMin && !isMax ? '最小值' : undefined}
      >
        {value}
      </span>
      {showDiff && diffPercent !== 0 && (
        <span 
          className="text-[10px] mt-0.5 flex items-center gap-0.5"
          style={{ color: diffPercent > 0 ? '#34d399' : '#f87171' }}
        >
          {diffPercent > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
          {Math.abs(diffPercent).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export function VideoProcess() {
  const [videos, setVideos] = useState<VideoFileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingName, setLoadingName] = useState('');
  const [viewingIndex, setViewingIndex] = useState<number>(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('detail');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [panelView, setPanelView] = useState<'both' | 'left' | 'right'>('both');
  const lastLeftClickRef = useRef<{ time: number; index: number } | null>(null);
  
  const { 
    isConfigured, 
    isElectronEnv, 
    checkConfig,
    pendingCompareVideos,
    clearPendingCompareVideos,
    setPendingVideosForEdit,
    setActiveTab,
  } = useFFmpegStore();
  const toast = useToast();

  const filteredVideos = useMemo(() => {
    if (filterMode === 'all') return videos;
    return videos.filter(v => v.tag && ['edited', 'after-merge'].includes(v.tag));
  }, [videos, filterMode]);

  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        case 'duration':
          aVal = a.duration;
          bVal = b.duration;
          break;
        case 'width':
          aVal = a.width * a.height;
          bVal = b.width * b.height;
          break;
        case 'fps':
          aVal = a.fps;
          bVal = b.fps;
          break;
        case 'bitrate':
          aVal = a.bitrate;
          bVal = b.bitrate;
          break;
      }
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal as string) 
          : (bVal as string).localeCompare(aVal);
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [filteredVideos, sortField, sortOrder]);

  const stats = useMemo(() => {
    if (videos.length === 0) return null;
    
    const totalSize = videos.reduce((sum, v) => sum + v.size, 0);
    const totalDuration = videos.reduce((sum, v) => sum + v.duration, 0);
    const avgBitrate = videos.reduce((sum, v) => sum + v.bitrate, 0) / videos.length;
    const avgFps = videos.reduce((sum, v) => sum + v.fps, 0) / videos.length;
    
    const resolutions = videos.map(v => v.width * v.height);
    const maxResolution = Math.max(...resolutions);
    const minResolution = Math.min(...resolutions);
    
    const codecs = [...new Set(videos.map(v => v.codec).filter(Boolean))];
    const audioCodecs = [...new Set(videos.map(v => v.audioCodec).filter(Boolean))];
    const formats = [...new Set(videos.map(v => v.format).filter(Boolean))];
    
    const sizes = videos.map(v => v.size);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    
    const durations = videos.map(v => v.duration);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    return {
      count: videos.length,
      totalSize,
      totalDuration,
      avgBitrate,
      avgFps,
      maxResolution,
      minResolution,
      maxSize,
      minSize,
      maxDuration,
      minDuration,
      codecs,
      audioCodecs,
      formats,
    };
  }, [videos]);

  const selectedVideos = useMemo(() => {
    return Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(i => videos[i])
      .filter(Boolean);
  }, [selectedIndices, videos]);

  const compareData = useMemo(() => {
    if (selectedVideos.length < 2) return null;
    
    const sizes = selectedVideos.map(v => v.size);
    const durations = selectedVideos.map(v => v.duration);
    const bitrates = selectedVideos.map(v => v.bitrate);
    const fpsList = selectedVideos.map(v => v.fps);
    const resolutions = selectedVideos.map(v => v.width * v.height);
    
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
  }, [selectedVideos]);

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    if (videos.length > 0 && viewingIndex >= videos.length) {
      setViewingIndex(Math.max(0, videos.length - 1));
    }
  }, [videos.length, viewingIndex]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (selectedIndices.size >= 2) {
      setRightPanelTab('compare');
    }
  }, [selectedIndices.size]);

  const addLog = (log: string) => {
    setLogs(prev => [...prev.slice(-100), log]);
  };

  useEffect(() => {
    if (pendingCompareVideos && pendingCompareVideos.videos.length > 0) {
      const newVideos: VideoFileInfo[] = pendingCompareVideos.videos.map((v: CompareVideoData) => ({
        path: v.path,
        name: v.name,
        size: v.size,
        duration: v.duration,
        width: v.width,
        height: v.height,
        codec: v.codec,
        fps: v.fps,
        bitrate: v.bitrate,
        audioCodec: v.audioCodec,
        audioSampleRate: v.audioSampleRate,
        audioChannels: v.audioChannels,
        audioBitrate: v.audioBitrate,
        format: v.format,
        thumbnail: v.thumbnail,
        tag: v.tag,
      }));
      
      setVideos(prev => {
        const existingPaths = new Set(prev.map(v => v.path));
        const uniqueNewVideos = newVideos.filter(v => !existingPaths.has(v.path));
        return [...prev, ...uniqueNewVideos];
      });
      
      setTimeout(() => {
        setVideos(prev => {
          const newIndices = new Set<number>();
          prev.forEach((v, i) => {
            if (newVideos.some(nv => nv.path === v.path)) {
              newIndices.add(i);
            }
          });
          setSelectedIndices(newIndices);
          return prev;
        });
      }, 100);
      
      addLog(`[info] 从视频处理导入 ${newVideos.length} 个视频`);
      clearPendingCompareVideos();
    }
  }, [pendingCompareVideos, clearPendingCompareVideos]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getThumbnail = async (filePath: string): Promise<string> => {
    try {
      await ffmpegConfigStorage.ready();
      const ffmpegPath = ffmpegConfigStorage.getFFmpegPath();
      if (ffmpegPath && window.electronAPI?.ffmpeg?.getVideoFrame) {
        const frame = await window.electronAPI.ffmpeg.getVideoFrame(ffmpegPath, filePath, 1);
        if (frame) return frame;
      }
    } catch {}
    return '';
  };

  const loadVideoInfo = async (filePath: string): Promise<VideoFileInfo | null> => {
    if (!isConfigured || !isElectronEnv) {
      addLog(`[error] FFmpeg 未配置或非 Electron 环境`);
      return null;
    }
    
    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      if (!ffprobePath) {
        addLog(`[error] FFprobe 路径未配置`);
        return null;
      }
      
      const mediaInfo = await window.electronAPI.ffmpeg.getMediaInfo(ffprobePath, filePath);
      if (!mediaInfo) {
        addLog(`[error] 无法获取视频信息: ${filePath}`);
        return null;
      }
      
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      const thumbnail = await getThumbnail(filePath);
      
      return {
        path: filePath,
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
      };
    } catch (error) {
      addLog(`[error] 读取视频信息失败: ${error}`);
      return null;
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!isElectronEnv || !isConfigured) {
      toast.error('请先配置 FFmpeg');
      return;
    }
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    addLog(`[info] 开始加载 ${files.length} 个视频文件...`);
    
    const newVideos: VideoFileInfo[] = [];
    const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts', '.m2ts', '.ogv', '.3gp', '.f4v'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = (file as any).path;
      if (!filePath) continue;
      
      const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      if (!videoExts.includes(ext)) continue;
      
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      setLoadingName(fileName);
      
      const info = await loadVideoInfo(filePath);
      if (info) {
        newVideos.push(info);
        addLog(`[done] 已加载: ${info.name}`);
      }
      
      setLoadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
      setViewingIndex(0);
      setSelectedIndices(new Set());
      toast.success(`已加载 ${newVideos.length} 个视频`);
    } else {
      toast.info('未找到有效的视频文件');
    }
    
    setIsLoading(false);
    setLoadingName('');
  }, [isElectronEnv, isConfigured]);

  const selectFiles = async () => {
    if (!isElectronEnv) {
      toast.error('请使用 Electron 模式运行此功能');
      return;
    }
    
    const result = await window.electronAPI.file.selectFiles?.({
      title: '选择视频文件',
      filters: [
        { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    
    if (!result?.success || !result?.filePaths?.length) return;
    
    setIsLoading(true);
    setLoadProgress(0);
    addLog(`[info] 开始加载 ${result.filePaths.length} 个视频文件...`);
    
    const newVideos: VideoFileInfo[] = [];
    
    for (let i = 0; i < result.filePaths.length; i++) {
      const fileName = result.filePaths[i].split(/[/\\]/).pop() || result.filePaths[i];
      setLoadingName(fileName);
      
      const info = await loadVideoInfo(result.filePaths[i]);
      if (info) {
        newVideos.push(info);
        addLog(`[done] 已加载: ${info.name}`);
      }
      setLoadProgress(Math.round(((i + 1) / result.filePaths.length) * 100));
    }
    
    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
      setViewingIndex(0);
      setSelectedIndices(new Set());
      toast.success(`已加载 ${newVideos.length} 个视频`);
    }
    
    setIsLoading(false);
    setLoadingName('');
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    if (viewingIndex === index) {
      setViewingIndex(Math.max(0, index - 1));
    } else if (viewingIndex > index) {
      setViewingIndex(viewingIndex - 1);
    }
    setSelectedIndices(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const clearAll = () => {
    setVideos([]);
    setLogs([]);
    setSelectedIndices(new Set());
    setViewingIndex(0);
  };

  const toggleMultiSelect = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleVideoClick = (index: number) => {
    const now = Date.now();
    const lastClick = lastLeftClickRef.current;
    
    if (lastClick && lastClick.index === index && now - lastClick.time < 400) {
      setSelectedIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
      lastLeftClickRef.current = null;
      return;
    }
    
    lastLeftClickRef.current = { time: now, index };
    setViewingIndex(index);
    setHighlightedIndex(null);
    if (selectedIndices.size < 2) {
      setRightPanelTab('detail');
    }
  };

  const selectAll = () => {
    if (videos.length > 0) {
      setSelectedIndices(new Set(videos.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
    setRightPanelTab('detail');
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  };

  const contextMenuSelect = () => {
    if (!contextMenu) return;
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      newSet.add(contextMenu.index);
      return newSet;
    });
    setContextMenu(null);
  };

  const contextMenuDeselect = () => {
    if (!contextMenu) return;
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(contextMenu.index);
      return newSet;
    });
    setContextMenu(null);
  };

  const contextMenuSelectAll = () => {
    if (videos.length > 0) {
      setSelectedIndices(new Set(videos.map((_, i) => i)));
    }
    setContextMenu(null);
  };

  const contextMenuInvert = () => {
    setSelectedIndices(prev => {
      const newSet = new Set<number>();
      videos.forEach((_, i) => {
        if (!prev.has(i)) newSet.add(i);
      });
      return newSet;
    });
    setContextMenu(null);
  };

  const copyVideoInfo = async (video: VideoFileInfo, id: string) => {
    const text = videoInfoToText(video);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('已复制视频信息');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const copyAllInfo = async () => {
    if (videos.length === 0) return;
    const allText = videos.map((v, i) => `=== 视频 ${i + 1} ===\n${videoInfoToText(v)}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedId('all');
      toast.success(`已复制 ${videos.length} 个视频的信息`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const copySelectedMainInfo = async () => {
    const selectedVideosList = Array.from(selectedIndices).sort((a, b) => a - b).map(i => videos[i]).filter(Boolean);
    if (selectedVideosList.length === 0) {
      toast.info('请先选择要复制的视频');
      return;
    }
    
    const text = selectedVideosList.map((v, i) => `=== 视频 ${i + 1} ===\n${videoMainInfoToText(v)}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('selected');
      toast.success(`已复制 ${selectedVideosList.length} 个视频的主要信息`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const copyCompareInfo = async () => {
    if (!compareData || selectedVideos.length < 2) return;
    
    const lines = selectedVideos.map((v, i) => {
      return `${v.name}: ${formatSize(v.size)} | ${formatDuration(v.duration)} | ${v.width}x${v.height} | ${v.fps.toFixed(2)}fps | ${formatBitrate(v.bitrate)}`;
    });
    
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedId('compare');
      toast.success('已复制对比信息');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const sendToVideoEdit = () => {
    const selectedVideosList = Array.from(selectedIndices).sort((a, b) => a - b).map(i => videos[i]).filter(Boolean);
    if (selectedVideosList.length === 0) {
      toast.info('请先选择要发送的视频');
      return;
    }
    
    const paths = selectedVideosList.map(v => v.path);
    const pendingData: PendingVideosForEdit = {
      paths,
      timestamp: Date.now(),
    };
    setPendingVideosForEdit(pendingData);
    setActiveTab('videoEdit');
    toast.success(`已发送 ${paths.length} 个视频到视频处理`);
  };

  const openFileLocation = async (index: number) => {
    const video = videos[index];
    if (!video) return;
    
    if (window.electronAPI?.file?.showInFolder) {
      await window.electronAPI.file.showInFolder(video.path);
    } else {
      toast.error('此功能需要 Electron 环境');
    }
  };

  const togglePanelView = () => {
    setPanelView(prev => {
      if (prev === 'both') return 'left';
      if (prev === 'left') return 'right';
      return 'both';
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const viewingVideo = videos.length > 0 && viewingIndex < videos.length ? videos[viewingIndex] : null;
  const selectedCount = selectedIndices.size;

  return (
    <div className="h-full flex flex-col space-y-3">
      <div 
        className="flex items-center justify-between flex-shrink-0 px-4 py-3 rounded-xl"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}
          >
            <Film className="w-4 h-4" style={{ color: '#06b6d4' }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'white' }}>视频整合</h2>
          <Badge color="blue">信息查看</Badge>
          {selectedCount > 0 && (
            <Badge color="cyan">已选择 {selectedCount} 个</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {videos.length > 0 && (
            <>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <button
                  onClick={() => setPanelView('both')}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: panelView === 'both' ? 'rgba(6, 182, 212, 0.8)' : 'transparent',
                    color: panelView === 'both' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  }}
                  title="显示左右双栏"
                >
                  <Columns className="w-3 h-3" />
                  双栏
                </button>
                <button
                  onClick={() => setPanelView('left')}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: panelView === 'left' ? 'rgba(6, 182, 212, 0.8)' : 'transparent',
                    color: panelView === 'left' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  }}
                  title="仅显示左侧"
                >
                  <PanelLeft className="w-3 h-3" />
                  左侧
                </button>
                <button
                  onClick={() => setPanelView('right')}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: panelView === 'right' ? 'rgba(6, 182, 212, 0.8)' : 'transparent',
                    color: panelView === 'right' ? 'white' : 'rgba(255, 255, 255, 0.7)',
                  }}
                  title="仅显示右侧"
                >
                  <PanelLeftClose className="w-3 h-3" />
                  右侧
                </button>
              </div>
              <button
                onClick={sendToVideoEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
                }}
              >
                <Send className="w-3 h-3" />
                发送到视频处理{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                onClick={copySelectedMainInfo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                {copiedId === 'selected' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                复制选中{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                onClick={copyAllInfo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                {copiedId === 'all' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                复制全部
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <Trash2 className="w-3 h-3" />
                清空
              </button>
            </>
          )}
        </div>
      </div>

      {!isElectronEnv && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-yellow-600">请使用 Electron 模式运行此功能</span>
        </div>
      )}

      {isElectronEnv && !isConfigured && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-600">请先配置 FFmpeg bin 目录</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <div 
          className={`flex flex-col ${panelView === 'right' ? 'hidden' : panelView === 'left' ? 'col-span-12' : 'col-span-7'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {videos.length === 0 ? (
            <div 
              className="h-full flex flex-col items-center justify-center rounded-2xl transition-all duration-300 flex-1"
              style={{ 
                backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-secondary)',
                border: `2px dashed ${isDragging ? '#06b6d4' : 'var(--border-color)'}`,
                minHeight: '400px',
              }}
            >
              <motion.div
                animate={{ scale: isDragging ? 1.1 : 1, y: isDragging ? -10 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex flex-col items-center"
              >
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ 
                    backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-tertiary)',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <Video 
                    className="w-10 h-10 transition-colors duration-300" 
                    style={{ color: isDragging ? '#06b6d4' : 'var(--text-tertiary)' }} 
                  />
                </div>
                <p className="text-lg font-medium mb-2" style={{ color: isDragging ? '#06b6d4' : 'var(--text-primary)' }}>
                  {isDragging ? '松开以添加视频' : '拖拽视频文件到此处'}
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  或点击下方按钮选择文件
                </p>
                <button
                  onClick={selectFiles}
                  disabled={!isElectronEnv || !isConfigured}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  选择视频文件
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <div 
                className="sticky top-0 z-10 pb-3"
                style={{ 
                  backgroundColor: 'transparent',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={selectFiles}
                    disabled={!isElectronEnv || !isConfigured || isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    style={{ 
                      background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(6, 182, 212, 0.15)'
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    添加视频
                  </button>
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    全选
                  </button>
                  <button
                    onClick={deselectAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    取消选择
                  </button>
                  <div className="flex-1" />
                  <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <button
                      onClick={() => setFilterMode('all')}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                      style={{ 
                        backgroundColor: filterMode === 'all' ? 'var(--primary-color)' : 'transparent',
                        color: filterMode === 'all' ? 'white' : 'var(--text-tertiary)',
                      }}
                      title="显示全部视频"
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setFilterMode('processed')}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                      style={{ 
                        backgroundColor: filterMode === 'processed' ? '#10b981' : 'transparent',
                        color: filterMode === 'processed' ? 'white' : 'var(--text-tertiary)',
                      }}
                      title="只显示剪辑后或合并后的视频"
                    >
                      <Filter className="w-3 h-3" />
                      处理后
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>排序:</span>
                  {[
                    { field: 'name' as SortField, label: '名称' },
                    { field: 'size' as SortField, label: '大小' },
                    { field: 'duration' as SortField, label: '时长' },
                    { field: 'width' as SortField, label: '分辨率' },
                    { field: 'fps' as SortField, label: '帧率' },
                    { field: 'bitrate' as SortField, label: '码率' },
                  ].map(item => (
                    <button
                      key={item.field}
                      onClick={() => toggleSort(item.field)}
                      className="flex items-center gap-0.5 px-2 py-1 rounded text-xs transition-all duration-200"
                      style={{ 
                        backgroundColor: sortField === item.field ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                        color: sortField === item.field ? 'var(--primary-color)' : 'var(--text-tertiary)',
                      }}
                    >
                      {item.label}
                      {sortField === item.field && (
                        sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div 
                className="flex-1 overflow-y-auto pr-2"
                style={{ scrollbarGutter: 'stable' }}
              >

              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary-color)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      正在加载视频...
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                      {loadProgress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <motion.div 
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--primary-color), #8b5cf6)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${loadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {loadingName && (
                    <p className="text-xs mt-2 truncate" style={{ color: 'var(--text-tertiary)' }}>
                      当前: {loadingName}
                    </p>
                  )}
                </motion.div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {sortedVideos.map((video, sortedIndex) => {
                  const originalIndex = videos.findIndex(v => v.path === video.path);
                  const isViewing = originalIndex === viewingIndex;
                  const isSelected = selectedIndices.has(originalIndex);
                  const isHighlighted = highlightedIndex === originalIndex;
                  
                  return (
                    <motion.div
                      key={`${video.path}-${originalIndex}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: sortedIndex * 0.02 }}
                      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] group relative"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        border: `2px solid ${isHighlighted ? '#f59e0b' : isViewing ? '#06b6d4' : isSelected ? 'rgba(6, 182, 212, 0.5)' : 'var(--border-color)'}`,
                        boxShadow: isHighlighted ? '0 2px 12px rgba(245, 158, 11, 0.3)' : isViewing ? '0 2px 8px rgba(6, 182, 212, 0.15)' : 'none',
                      }}
                      onClick={() => handleVideoClick(originalIndex)}
                      onContextMenu={(e) => handleContextMenu(e, originalIndex)}
                    >
                      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileVideo className="w-8 h-8" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                          </div>
                        )}
                        
                        {(isSelected || isHighlighted) && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ backgroundColor: isHighlighted ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)' }}
                          />
                        )}
                        
                        {video.duration > 0 && (
                          <span 
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white z-10"
                            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                          >
                            {formatDuration(video.duration)}
                          </span>
                        )}
                        
                        {video.tag && (
                          <span 
                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white z-10"
                            style={{ 
                              backgroundColor: video.tag === 'original' ? '#8b5cf6' 
                                : video.tag === 'edited' ? '#10b981'
                                : video.tag === 'before-merge' ? '#f59e0b'
                                : '#06b6d4',
                            }}
                          >
                            {video.tag === 'original' ? '原始' 
                              : video.tag === 'edited' ? '剪辑后'
                              : video.tag === 'before-merge' ? '合并前'
                              : '合并后'}
                          </span>
                        )}
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); removeVideo(originalIndex); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        
                        {isSelected && (
                          <button
                            onClick={(e) => toggleMultiSelect(originalIndex, e)}
                            className="absolute top-1 left-1 w-5 h-5 rounded flex items-center justify-center transition-all duration-200 z-10"
                            style={{ 
                              backgroundColor: 'rgba(6, 182, 212, 0.9)',
                              borderRadius: '4px',
                            }}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </button>
                        )}

                        {isViewing && !isSelected && (
                          <div 
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white z-10"
                            style={{ backgroundColor: '#0891b2' }}
                          >
                            查看中
                          </div>
                        )}
                        
                        {isSelected && (
                          <div 
                            className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white z-10"
                            style={{ backgroundColor: 'rgba(6, 182, 212, 0.9)' }}
                          >
                            已选择
                          </div>
                        )}
                      </div>
                      
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }} title={video.name}>
                          {video.name}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {video.size > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                              {formatSize(video.size)}
                            </span>
                          )}
                          {video.width > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                              {video.width}x{video.height}
                            </span>
                          )}
                          {video.fps > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                              {video.fps.toFixed(2)}fps
                            </span>
                          )}
                          {video.bitrate > 0 && (
                            <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                              {formatBitrate(video.bitrate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              </div>
            </>
          )}
        </div>

        <div className={`space-y-3 overflow-y-auto pr-2 ${panelView === 'left' ? 'hidden' : panelView === 'right' ? 'col-span-12' : 'col-span-5'}`} style={{ scrollbarGutter: 'stable' }}>
          {videos.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              {[
                { key: 'detail' as RightPanelTab, label: '详情', icon: <Video className="w-3.5 h-3.5" /> },
                { key: 'compare' as RightPanelTab, label: `对比${selectedCount > 0 ? `(${selectedCount})` : ''}`, icon: <GitCompare className="w-3.5 h-3.5" /> },
                { key: 'stats' as RightPanelTab, label: '统计', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRightPanelTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-all duration-200"
                  style={{ 
                    backgroundColor: rightPanelTab === tab.key ? 'var(--primary-light)' : 'transparent',
                    color: rightPanelTab === tab.key ? 'var(--primary-color)' : 'var(--text-tertiary)',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {rightPanelTab === 'detail' && viewingVideo && (
              <motion.div 
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div 
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频详情</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                          {viewingIndex + 1}/{videos.length}
                        </span>
                      </div>
                      <button
                        onClick={() => copyVideoInfo(viewingVideo, 'detail')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all hover:scale-105"
                        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                      >
                        {copiedId === 'detail' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {copiedId === 'detail' ? '已复制' : '复制信息'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>基本信息</span>
                      </div>
                      <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>文件名</span>
                          <span style={{ color: 'var(--text-primary)' }} className="truncate ml-2 max-w-[200px]" title={viewingVideo.name}>{viewingVideo.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>路径</span>
                          <span style={{ color: 'var(--text-primary)' }} className="truncate ml-2 max-w-[200px]" title={viewingVideo.path}>{viewingVideo.path}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>大小</span>
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                            {formatSize(viewingVideo.size)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>时长</span>
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                            {formatDuration(viewingVideo.duration)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>格式</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingVideo.format}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MonitorPlay className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频流</span>
                      </div>
                      <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>分辨率</span>
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                            {viewingVideo.width}x{viewingVideo.height}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>编码</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingVideo.codec}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>帧率</span>
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                            {viewingVideo.fps.toFixed(2)} fps
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: 'var(--text-tertiary)' }}>码率</span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                              {formatBitrate(viewingVideo.bitrate)}
                            </span>
                            {formatBitrateAlt(viewingVideo.bitrate) && (
                              <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', fontSize: '10px' }}>
                                {formatBitrateAlt(viewingVideo.bitrate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {viewingVideo.audioCodec && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Music className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>音频流</span>
                        </div>
                        <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-tertiary)' }}>编码</span>
                            <span style={{ color: 'var(--text-primary)' }}>{viewingVideo.audioCodec}</span>
                          </div>
                          {viewingVideo.audioSampleRate > 0 && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'var(--text-tertiary)' }}>采样率</span>
                              <span style={{ color: 'var(--text-primary)' }}>{formatSampleRate(viewingVideo.audioSampleRate)}</span>
                            </div>
                          )}
                          {viewingVideo.audioChannels > 0 && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: 'var(--text-tertiary)' }}>声道</span>
                              <span style={{ color: 'var(--text-primary)' }}>{viewingVideo.audioChannels === 1 ? '单声道' : viewingVideo.audioChannels === 2 ? '立体声' : `${viewingVideo.audioChannels}声道`}</span>
                            </div>
                          )}
                          {viewingVideo.audioBitrate > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span style={{ color: 'var(--text-tertiary)' }}>码率</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                                  {formatBitrate(viewingVideo.audioBitrate)}
                                </span>
                                {formatBitrateAlt(viewingVideo.audioBitrate) && (
                                  <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', color: '#d97706', fontSize: '10px' }}>
                                    {formatBitrateAlt(viewingVideo.audioBitrate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {rightPanelTab === 'compare' && (
              <motion.div 
                key="compare"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {selectedVideos.length < 2 ? (
                  <div 
                    className="rounded-xl p-6 flex flex-col items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', minHeight: '300px' }}
                  >
                    <GitCompare className="w-12 h-12 mb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                    <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>请选择至少 2 个视频进行对比</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
                      右键点击视频卡片可快速选择
                    </p>
                  </div>
                ) : compareData && (
                  <div 
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitCompare className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频对比</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                            {selectedVideos.length} 个视频
                          </span>
                        </div>
                        <button
                          onClick={copyCompareInfo}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all hover:scale-105"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                        >
                          {copiedId === 'compare' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copiedId === 'compare' ? '已复制' : '复制对比'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th className="text-left py-2 px-2 font-medium" style={{ color: 'var(--text-tertiary)' }}>属性</th>
                            {selectedVideos.map((v, i) => {
                              const originalIndex = videos.findIndex(vid => vid.path === v.path);
                              const isHighlighted = highlightedIndex === originalIndex;
                              return (
                                <th 
                                  key={i} 
                                  className="text-center py-2 px-2 font-medium min-w-[100px] cursor-pointer transition-all duration-200"
                                  style={{ 
                                    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)',
                                    backgroundColor: isHighlighted ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                                  }}
                                  onClick={() => {
                                    if (originalIndex !== -1) {
                                      setHighlightedIndex(isHighlighted ? null : originalIndex);
                                      setViewingIndex(originalIndex);
                                    }
                                  }}
                                >
                                  <div className="truncate max-w-[80px] mx-auto" title={v.name}>{v.name}</div>
                                  {v.tag && (
                                    <span 
                                      className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                      style={{ 
                                        backgroundColor: v.tag === 'original' ? '#8b5cf6' 
                                          : v.tag === 'edited' ? '#10b981'
                                          : v.tag === 'before-merge' ? '#f59e0b'
                                          : '#06b6d4',
                                      }}
                                    >
                                      {v.tag === 'original' ? '原始' 
                                        : v.tag === 'edited' ? '剪辑后'
                                        : v.tag === 'before-merge' ? '合并前'
                                        : '合并后'}
                                    </span>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>文件大小</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <CompareValue 
                                  value={formatSize(v.size)}
                                  isMax={compareData.maxSize === v.size && compareData.maxSize !== compareData.minSize}
                                  isMin={compareData.minSize === v.size && compareData.maxSize !== compareData.minSize}
                                />
                              </td>
                            ))}
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>时长</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <CompareValue 
                                  value={formatDuration(v.duration)}
                                  isMax={compareData.maxDuration === v.duration && compareData.maxDuration !== compareData.minDuration}
                                  isMin={compareData.minDuration === v.duration && compareData.maxDuration !== compareData.minDuration}
                                />
                              </td>
                            ))}
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>分辨率</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <CompareValue 
                                  value={`${v.width}x${v.height}`}
                                  isMax={compareData.maxRes === v.width * v.height && compareData.maxRes !== compareData.minRes}
                                  isMin={compareData.minRes === v.width * v.height && compareData.maxRes !== compareData.minRes}
                                />
                              </td>
                            ))}
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>帧率</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <CompareValue 
                                  value={`${v.fps.toFixed(2)} fps`}
                                  isMax={compareData.maxFps === v.fps && compareData.maxFps !== compareData.minFps}
                                  isMin={compareData.minFps === v.fps && compareData.maxFps !== compareData.minFps}
                                />
                              </td>
                            ))}
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>码率</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <CompareValue 
                                  value={formatBitrate(v.bitrate)}
                                  isMax={compareData.maxBitrate === v.bitrate && compareData.maxBitrate !== compareData.minBitrate}
                                  isMin={compareData.minBitrate === v.bitrate && compareData.maxBitrate !== compareData.minBitrate}
                                />
                              </td>
                            ))}
                          </tr>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>视频编码</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                                  {v.codec || 'N/A'}
                                </span>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>音频编码</td>
                            {selectedVideos.map((v, i) => (
                              <td key={i} className="py-2 px-2 text-center">
                                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                                  {v.audioCodec || 'N/A'}
                                </span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }} />
                          <span>最大值</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }} />
                          <span>最小值</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {rightPanelTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {stats ? (
                  <>
                    <div 
                      className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>总体统计</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>视频数量</div>
                          <div className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>{stats.count}</div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>总大小</div>
                          <div className="text-lg font-bold" style={{ color: '#a78bfa' }}>{formatSize(stats.totalSize)}</div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>总时长</div>
                          <div className="text-lg font-bold" style={{ color: '#f472b6' }}>{formatDuration(stats.totalDuration)}</div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>平均码率</div>
                          <div className="text-lg font-bold" style={{ color: '#fbbf24' }}>{formatBitrate(stats.avgBitrate)}</div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>范围统计</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>文件大小范围</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              {formatSize(stats.minSize)}
                            </span>
                            <Minus className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                              {formatSize(stats.maxSize)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>时长范围</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              {formatDuration(stats.minDuration)}
                            </span>
                            <Minus className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                              {formatDuration(stats.maxDuration)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>分辨率范围</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                              {Math.round(Math.sqrt(stats.minResolution))}p
                            </span>
                            <Minus className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                              {Math.round(Math.sqrt(stats.maxResolution))}p
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <MonitorPlay className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>编码统计</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>视频编码 ({stats.codecs.length} 种)</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.codecs.map((codec, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                                {codec}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>音频编码 ({stats.audioCodecs.length} 种)</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.audioCodecs.map((codec, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                                {codec}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-[10px] mb-2" style={{ color: 'var(--text-tertiary)' }}>文件格式 ({stats.formats.length} 种)</div>
                          <div className="flex flex-wrap gap-1">
                            {stats.formats.map((format, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                                {format}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div 
                    className="rounded-xl p-6 flex flex-col items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', minHeight: '300px' }}
                  >
                    <BarChart3 className="w-12 h-12 mb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>添加视频后查看统计信息</p>
                  </div>
                )}
              </motion.div>
            )}

            {rightPanelTab === 'detail' && !viewingVideo && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-6 flex flex-col items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  minHeight: '400px',
                }}
              >
                <Info className="w-12 h-12 mb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>添加视频后查看详情</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
                  拖拽或选择视频文件
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {logs.length > 0 && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>操作日志</span>
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                >
                  清空
                </button>
              </div>
              <Terminal lines={logs} />
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed rounded-lg shadow-xl py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            minWidth: '140px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedIndices.has(contextMenu.index) ? (
            <button
              onClick={contextMenuDeselect}
              className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="w-3.5 h-3.5" style={{ color: 'rgba(6, 182, 212, 0.9)' }} />
              取消选择
            </button>
          ) : (
            <button
              onClick={contextMenuSelect}
              className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Check className="w-3.5 h-3.5" style={{ color: 'rgba(6, 182, 212, 0.9)' }} />
              选择此视频
            </button>
          )}
          <div className="my-1" style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
          <button
            onClick={contextMenuSelectAll}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />
            全选
          </button>
          <button
            onClick={contextMenuInvert}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Check className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
            反选
          </button>
          <button
            onClick={deselectAll}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            取消全部选择
          </button>
          <div className="my-1" style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />
          <button
            onClick={() => {
              if (contextMenu) {
                removeVideo(contextMenu.index);
                setContextMenu(null);
              }
            }}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--error-color)' }} />
            移除此视频
          </button>
          <button
            onClick={() => {
              if (contextMenu) {
                openFileLocation(contextMenu.index);
                setContextMenu(null);
              }
            }}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent' }
          >
            <FolderOpen className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />
            打开文件位置
          </button>
          <button
            onClick={() => {
              if (contextMenu) {
                setSelectedIndices(prev => {
                  const newSet = new Set(prev);
                  newSet.add(contextMenu.index);
                  return newSet;
                });
                sendToVideoEdit();
                setContextMenu(null);
              }
            }}
            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Send className="w-3.5 h-3.5" style={{ color: '#06b6d4' }} />
            发送到视频处理
          </button>
        </div>
      )}
    </div>
  );
}
