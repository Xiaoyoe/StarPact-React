import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Video, Info, AlertCircle, FileVideo,
  Copy, Check, Trash2, X, Plus, Film, MonitorPlay, 
  Music, FileText, Loader2
} from 'lucide-react';
import { Badge, Terminal } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { useFFmpegStore } from '@/stores/ffmpegStore';
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
}

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
  const lastRightClickRef = useRef<{ time: number; index: number } | null>(null);
  
  const { isConfigured, isElectronEnv, checkConfig } = useFFmpegStore();
  const toast = useToast();

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

  const addLog = (log: string) => {
    setLogs(prev => [...prev.slice(-100), log]);
  };

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
    setViewingIndex(index);
  };

  const selectAll = () => {
    if (videos.length > 0) {
      setSelectedIndices(new Set(videos.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    const lastClick = lastRightClickRef.current;
    
    if (lastClick && lastClick.index === index && now - lastClick.time < 500) {
      setSelectedIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
      lastRightClickRef.current = null;
      setContextMenu(null);
      return;
    }
    
    lastRightClickRef.current = { time: now, index };
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
    const selectedVideos = Array.from(selectedIndices).sort((a, b) => a - b).map(i => videos[i]).filter(Boolean);
    if (selectedVideos.length === 0) {
      toast.info('请先选择要复制的视频');
      return;
    }
    
    const text = selectedVideos.map((v, i) => `=== 视频 ${i + 1} ===\n${videoMainInfoToText(v)}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId('selected');
      toast.success(`已复制 ${selectedVideos.length} 个视频的主要信息`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const viewingVideo = videos.length > 0 && viewingIndex < videos.length ? videos[viewingIndex] : null;
  const selectedCount = selectedIndices.size;

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>视频处理</h2>
          <Badge color="blue">信息查看</Badge>
          {selectedCount > 0 && (
            <Badge color="cyan">已选择 {selectedCount} 个</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {videos.length > 0 && (
            <>
              <button
                onClick={copySelectedMainInfo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                {copiedId === 'selected' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                复制选中{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                onClick={copyAllInfo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
              >
                {copiedId === 'all' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                复制全部
              </button>
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-color)' }}
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
          className="col-span-7 space-y-3 overflow-y-auto pr-2" 
          style={{ scrollbarGutter: 'stable' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {videos.length === 0 ? (
            <div 
              className="h-full flex flex-col items-center justify-center rounded-2xl transition-all duration-300"
              style={{ 
                backgroundColor: isDragging ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-secondary)',
                border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
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
                    backgroundColor: isDragging ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <Video 
                    className="w-10 h-10 transition-colors duration-300" 
                    style={{ color: isDragging ? 'var(--primary-color)' : 'var(--text-tertiary)' }} 
                  />
                </div>
                <p className="text-lg font-medium mb-2" style={{ color: isDragging ? 'var(--primary-color)' : 'var(--text-primary)' }}>
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
                    background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  选择视频文件
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectFiles}
                  disabled={!isElectronEnv || !isConfigured || isLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加视频
                </button>
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  全选
                </button>
                <button
                  onClick={deselectAll}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  取消选择
                </button>
              </div>

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
                {videos.map((video, index) => {
                  const isViewing = index === viewingIndex;
                  const isSelected = selectedIndices.has(index);
                  
                  return (
                    <motion.div
                      key={`${video.path}-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] group relative"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        border: `2px solid ${isViewing ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        boxShadow: isViewing ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none',
                      }}
                      onClick={() => handleVideoClick(index)}
                      onContextMenu={(e) => handleContextMenu(e, index)}
                    >
                      <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileVideo className="w-8 h-8" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                          </div>
                        )}
                        
                        {isSelected && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)' }}
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
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); removeVideo(index); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        
                        {isSelected && (
                          <button
                            onClick={(e) => toggleMultiSelect(index, e)}
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
                            style={{ backgroundColor: 'var(--primary-color)' }}
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
                              {video.fps.toFixed(0)}fps
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
            </>
          )}
        </div>

        <div className="col-span-5 space-y-3 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
          <AnimatePresence mode="wait">
            {viewingVideo ? (
              <motion.div 
                key={viewingIndex}
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
                          <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                            {formatBitrate(viewingVideo.bitrate)}
                          </span>
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
                              <span className="px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                                {formatBitrate(viewingVideo.audioBitrate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center rounded-2xl"
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
        </div>
      )}
    </div>
  );
}
