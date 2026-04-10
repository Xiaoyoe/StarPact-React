import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  FolderOpen, Video, Merge, Layers, FolderSync, 
  Play, Square, Info, AlertCircle, FileVideo,
  ChevronDown, ChevronRight, HardDrive, Clock, MonitorPlay, Gauge, ExternalLink, X, Copy, Check
} from 'lucide-react';
import { Badge, ProgressBar, Terminal } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { useFFmpegStore } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

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

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div 
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200 hover:brightness-[0.98]"
        style={{ backgroundColor: isOpen ? 'var(--bg-tertiary)' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--primary-color)' }}>{icon}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FolderProcess() {
  const [folderPath, setFolderPath] = useState('');
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [operationProgress, setOperationProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [mergeOutputName, setMergeOutputName] = useState('merged_video.mp4');
  const [overwriteMerge, setOverwriteMerge] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFolderList, setShowFolderList] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const { isConfigured, isElectronEnv } = useFFmpegStore();
  const toast = useToast();

  useEffect(() => {
    if (folderPath) {
      setExpandedFolders(new Set([folderPath]));
    }
  }, [folderPath]);

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const triggerScan = (path: string) => {
      if (autoScan && isConfigured) {
        setTimeout(() => {
          scanVideos(true, path);
        }, 1500);
      }
    };
    
    const items = e.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          const file = item.getAsFile();
          if (file) {
            const path = (file as any).path || file.name;
            setFolderPath(path);
            setVideos([]);
            setLogs([]);
            toast.success(`已选择文件夹: ${path}`);
            triggerScan(path);
            return;
          }
        }
      }
    }
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const path = (file as any).path;
      if (path) {
        setFolderPath(path);
        setVideos([]);
        setLogs([]);
        toast.success(`已选择文件夹: ${path}`);
        triggerScan(path);
      }
    }
  }, [toast, autoScan, isConfigured]);

  const videoStats = useMemo(() => {
    if (videos.length === 0) return null;
    
    const fpsMap = new Map<number, number>();
    const resolutionMap = new Map<string, number>();
    const durationRanges = { short: 0, medium: 0, long: 0, veryLong: 0 };
    let totalSize = 0;
    let minDuration = Infinity;
    let maxDuration = 0;
    
    videos.forEach(video => {
      if (video.fps > 0) {
        const fps = Math.round(video.fps * 100) / 100;
        fpsMap.set(fps, (fpsMap.get(fps) || 0) + 1);
      }
      
      if (video.width > 0 && video.height > 0) {
        const res = `${video.width}x${video.height}`;
        resolutionMap.set(res, (resolutionMap.get(res) || 0) + 1);
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
    
    return {
      fpsMap: Array.from(fpsMap.entries()).sort((a, b) => a[0] - b[0]),
      resolutionMap: Array.from(resolutionMap.entries()).sort((a, b) => b[1] - a[1]),
      durationRanges,
      totalSize,
      minDuration: minDuration === Infinity ? 0 : minDuration,
      maxDuration,
      totalCount: videos.length
    };
  }, [videos]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const folderList = useMemo(() => {
    if (!folderPath || videos.length === 0) return [];
    
    const folderMap = new Map<string, { 
      path: string; 
      name: string;
      videos: VideoInfo[]; 
      count: number; 
      size: number;
      isRoot?: boolean;
    }>();
    
    const rootVideos: VideoInfo[] = [];
    
    videos.forEach(video => {
      const lastSep = video.path.includes('\\') ? '\\' : '/';
      const lastSepIndex = video.path.lastIndexOf(lastSep);
      const videoDir = lastSepIndex > 0 ? video.path.substring(0, lastSepIndex) : '';
      
      if (videoDir === folderPath) {
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
            name: videoDir.replace(folderPath, '.') || videoDir,
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
        path: folderPath,
        name: folderPath,
        videos: rootVideos,
        count: rootVideos.length,
        size: rootVideos.reduce((sum, v) => sum + v.size, 0),
        isRoot: true
      });
    }
    
    return result;
  }, [folderPath, videos]);

  const openFolder = async (path: string) => {
    if (window.electronAPI?.file?.showInFolder) {
      await window.electronAPI.file.showInFolder(path);
    }
  };

  const selectFolder = async () => {
    if (!isElectronEnv) {
      toast.error('请使用 Electron 模式运行此功能');
      return;
    }
    
    const result = await window.electronAPI.file.selectFolder({
      title: '选择视频文件夹',
    });
    
    if (result.success && result.path) {
      setFolderPath(result.path);
      setVideos([]);
      setLogs([]);
      
      if (autoScan && isConfigured) {
        setTimeout(() => {
          scanVideos(true, result.path);
        }, 1500);
      }
    }
  };

  const clearFolder = () => {
    setFolderPath('');
    setVideos([]);
    setLogs([]);
    setExpandedFolders(new Set());
  };

  const copyAllVideoInfo = async () => {
    if (videos.length === 0) {
      toast.info('没有视频信息可复制');
      return;
    }

    const lines = [
      `文件夹: ${folderPath}`,
      `视频总数: ${videos.length} 个`,
      `总大小: ${formatSize(videos.reduce((sum, v) => sum + v.size, 0))}`,
      '',
      '=== 视频列表 ===',
    ];

    videos.forEach((video, index) => {
      lines.push('');
      lines.push(`【视频 ${index + 1}】`);
      lines.push(`  文件名: ${video.name}`);
      lines.push(`  路径: ${video.path}`);
      lines.push(`  大小: ${formatSize(video.size)}`);
      lines.push(`  时长: ${formatDuration(video.duration)}`);
      lines.push(`  分辨率: ${video.width}x${video.height}`);
      lines.push(`  帧率: ${video.fps.toFixed(2)} fps`);
      lines.push(`  编码: ${video.codec}`);
      lines.push(`  码率: ${video.bitrate > 0 ? (video.bitrate / 1000).toFixed(0) + ' kbps' : 'N/A'}`);
    });

    if (videoStats) {
      lines.push('');
      lines.push('=== 统计信息 ===');
      
      if (videoStats.fpsMap.length > 0) {
        lines.push('帧率分布:');
        videoStats.fpsMap.forEach(([fps, count]) => {
          lines.push(`  ${fps}fps: ${count} 个`);
        });
      }
      
      if (videoStats.resolutionMap.length > 0) {
        lines.push('分辨率分布:');
        videoStats.resolutionMap.forEach(([res, count]) => {
          lines.push(`  ${res}: ${count} 个`);
        });
      }
      
      lines.push('时长分布:');
      if (videoStats.durationRanges.short > 0) lines.push(`  <1分钟: ${videoStats.durationRanges.short} 个`);
      if (videoStats.durationRanges.medium > 0) lines.push(`  1-5分钟: ${videoStats.durationRanges.medium} 个`);
      if (videoStats.durationRanges.long > 0) lines.push(`  5-30分钟: ${videoStats.durationRanges.long} 个`);
      if (videoStats.durationRanges.veryLong > 0) lines.push(`  >30分钟: ${videoStats.durationRanges.veryLong} 个`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      toast.success(`已复制 ${videos.length} 个视频的信息`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const scanVideos = async (clearLogs: boolean = true, targetPath?: string) => {
    const scanPath = targetPath || folderPath;
    
    if (!scanPath) {
      toast.error('请先选择文件夹');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    if (clearLogs) {
      setVideos([]);
      setLogs([]);
    }
    addLog('[info] 开始扫描文件夹...');

    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      console.log('[DEBUG] ffprobePath:', ffprobePath);
      console.log('[DEBUG] scanPath:', scanPath);
      console.log('[DEBUG] window.electronAPI:', window.electronAPI);
      console.log('[DEBUG] window.electronAPI.ffmpeg:', window.electronAPI?.ffmpeg);
      console.log('[DEBUG] scanFolderVideos:', window.electronAPI?.ffmpeg?.scanFolderVideos);
      
      if (!window.electronAPI?.ffmpeg?.scanFolderVideos) {
        addLog('[error] scanFolderVideos 方法不存在，请重启 Electron 应用');
        toast.error('API 未加载，请重启应用');
        setIsScanning(false);
        return;
      }
      
      if (!ffprobePath) {
        addLog('[error] FFprobe 路径未配置，请在配置中设置 FFmpeg bin 目录');
        toast.error('FFprobe 路径未配置');
        setIsScanning(false);
        return;
      }
      
      addLog(`[info] FFprobe 路径: ${ffprobePath}`);
      
      const progressUnsubscribe = window.electronAPI.ffmpeg.onProgress((progress) => {
        setScanProgress(progress.progress);
      });

      const result = await window.electronAPI.ffmpeg.scanFolderVideos(ffprobePath, scanPath);
      
      progressUnsubscribe();
      
      if (result.videos.length > 0) {
        setVideos(result.videos);
        addLog(`[done] 扫描完成，共找到 ${result.totalCount} 个视频文件`);
        addLog(`[info] 总大小: ${formatSize(result.totalSize)}`);
        toast.success(`扫描完成，找到 ${result.totalCount} 个视频`);
      } else {
        addLog('[warn] 未找到视频文件');
        toast.info('未找到视频文件');
      }
    } catch (error) {
      console.error('[ERROR] 扫描失败:', error);
      addLog(`[error] 扫描失败: ${error}`);
      toast.error('扫描失败');
    } finally {
      setIsScanning(false);
      setScanProgress(100);
    }
  };

  const mergeVideos = async () => {
    if (!folderPath) {
      toast.error('请先选择文件夹');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    setActiveOperation('merge');
    setOperationProgress(0);
    setLogs([]);
    addLog('[info] 开始合并视频...');
    addLog(`[info] 输出文件: ${mergeOutputName}`);

    try {
      await ffmpegConfigStorage.ready();
      const ffmpegPath = ffmpegConfigStorage.getFFmpegPath();
      
      const logUnsubscribe = window.electronAPI.ffmpeg.onLog((data) => {
        const log = typeof data === 'string' ? data : data.log;
        if (log.trim()) {
          addLog(`[ffmpeg] ${log.trim()}`);
        }
      });

      const result = await window.electronAPI.ffmpeg.mergeVideos({
        ffmpegPath,
        folderPath,
        outputName: mergeOutputName,
        overwrite: overwriteMerge,
      });
      
      logUnsubscribe();
      
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
      setActiveOperation(null);
    }
  };

  const classifyByFps = async () => {
    if (!folderPath) {
      toast.error('请先选择文件夹');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    setActiveOperation('classify');
    setOperationProgress(0);
    setLogs([]);
    addLog('[info] 开始按帧率分类视频...');

    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      const progressUnsubscribe = window.electronAPI.ffmpeg.onProgress((progress) => {
        setOperationProgress(progress.progress);
      });

      const result = await window.electronAPI.ffmpeg.classifyByFps(ffprobePath, folderPath);
      
      progressUnsubscribe();
      
      if (result.success) {
        addLog(`[done] 分类完成，共处理 ${result.classifiedCount} 个视频`);
        addLog(`[info] 创建的文件夹: ${result.folders.join(', ')}`);
        toast.success(`分类完成，创建了 ${result.folders.length} 个文件夹`);
        
        setTimeout(() => {
          scanVideos(false);
        }, 500);
      } else {
        addLog(`[error] 分类失败: ${result.error}`);
        toast.error(`分类失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`[error] 分类失败: ${error}`);
      toast.error('分类失败');
    } finally {
      setActiveOperation(null);
    }
  };

  const collectSubfolderVideos = async () => {
    if (!folderPath) {
      toast.error('请先选择文件夹');
      return;
    }

    setActiveOperation('collect');
    setLogs([]);
    addLog('[info] 开始归集子文件夹视频...');

    try {
      const result = await window.electronAPI.ffmpeg.collectSubfolderVideos(folderPath);
      
      if (result.success) {
        addLog(`[done] 归集完成，共移动 ${result.collectedCount} 个视频`);
        toast.success(`归集完成，移动了 ${result.collectedCount} 个视频`);
        
        if (result.collectedCount > 0) {
          setTimeout(() => {
            scanVideos(false);
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
      setActiveOperation(null);
    }
  };

  const stopOperation = async () => {
    await window.electronAPI.ffmpeg.stop();
    setActiveOperation(null);
    addLog('[info] 操作已停止');
    toast.info('操作已停止');
  };

  const isProcessing = isScanning || activeOperation !== null;

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>文件夹处理</h2>
          <Badge color="blue">批量操作</Badge>
          {isProcessing && (
            <Badge color="green">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                处理中
              </span>
            </Badge>
          )}
        </div>
      </div>

      {!isElectronEnv && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-yellow-600">请使用 Electron 模式运行此功能（运行 <code className="px-1 py-0.5 rounded bg-yellow-100">npm run electron:dev</code>）</span>
        </div>
      )}

      {isElectronEnv && !isConfigured && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-600">请先在右上角配置按钮中设置 FFmpeg bin 目录</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="col-span-4 space-y-4 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>选择文件夹</span>
              </div>
              {folderPath && (
                <button
                  onClick={clearFolder}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                >
                  <X className="w-3 h-3" />
                  清空
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectFolder}
                disabled={!isElectronEnv}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{ 
                  background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)'
                }}
              >
                <FolderOpen className="w-4 h-4" />
                选择文件夹
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScan}
                  onChange={(e) => setAutoScan(e.target.checked)}
                  className="rounded"
                />
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>自动解析</span>
              </label>
            </div>
            {folderPath && (
              <div className="mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>当前路径: </span>
                <span style={{ color: 'var(--text-primary)' }}>{folderPath}</span>
              </div>
            )}
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频信息解析</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFolderList}
                  onChange={(e) => setShowFolderList(e.target.checked)}
                  className="rounded"
                />
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>显示文件夹列表</span>
              </label>
            </div>
            <button
              onClick={scanVideos}
              disabled={!folderPath || !isConfigured || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {isScanning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isScanning ? '扫描中...' : '一键解析视频信息'}
            </button>
            {isScanning && (
              <div className="mt-3">
                <ProgressBar value={scanProgress} label="扫描进度" />
              </div>
            )}
            {videos.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-tertiary)' }}>视频数量</span>
                    <span style={{ color: 'var(--primary-color)' }}>{videos.length} 个</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span style={{ color: 'var(--text-tertiary)' }}>总大小</span>
                    <span style={{ color: 'var(--primary-color)' }}>{formatSize(videos.reduce((sum, v) => sum + v.size, 0))}</span>
                  </div>
                </div>
                
                {videoStats && (
                  <div className="p-2 rounded-lg text-xs space-y-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    {videoStats.fpsMap.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Gauge className="w-3 h-3" style={{ color: 'var(--primary-color)' }} />
                          <span style={{ color: 'var(--text-tertiary)' }}>帧率分布</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {videoStats.fpsMap.map(([fps, count]) => (
                            <span 
                              key={fps}
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              {fps}fps: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {videoStats.resolutionMap.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <MonitorPlay className="w-3 h-3" style={{ color: 'var(--primary-color)' }} />
                          <span style={{ color: 'var(--text-tertiary)' }}>分辨率分布</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {videoStats.resolutionMap.slice(0, 6).map(([res, count]) => (
                            <span 
                              key={res}
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              {res}: {count}
                            </span>
                          ))}
                          {videoStats.resolutionMap.length > 6 && (
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
                            >
                              +{videoStats.resolutionMap.length - 6} 更多
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {(videoStats.durationRanges.short + videoStats.durationRanges.medium + videoStats.durationRanges.long + videoStats.durationRanges.veryLong) > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" style={{ color: 'var(--primary-color)' }} />
                          <span style={{ color: 'var(--text-tertiary)' }}>时长分布</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {videoStats.durationRanges.short > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              &lt;1分钟: {videoStats.durationRanges.short}
                            </span>
                          )}
                          {videoStats.durationRanges.medium > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              1-5分钟: {videoStats.durationRanges.medium}
                            </span>
                          )}
                          {videoStats.durationRanges.long > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              5-30分钟: {videoStats.durationRanges.long}
                            </span>
                          )}
                          {videoStats.durationRanges.veryLong > 0 && (
                            <span 
                              className="px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                            >
                              &gt;30分钟: {videoStats.durationRanges.veryLong}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <CollapsibleSection title="无损合并视频" icon={<Merge className="w-4 h-4" />} defaultOpen={true}>
            <div className="space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>输出文件名</label>
                <input
                  type="text"
                  value={mergeOutputName}
                  onChange={(e) => setMergeOutputName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="merged_video.mp4"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={overwriteMerge}
                  onChange={(e) => setOverwriteMerge(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="overwrite" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  覆盖已存在的文件
                </label>
              </div>
              <button
                onClick={mergeVideos}
                disabled={!folderPath || !isConfigured || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {activeOperation === 'merge' ? <Square className="w-4 h-4" /> : <Merge className="w-4 h-4" />}
                {activeOperation === 'merge' ? '合并中...' : '开始合并'}
              </button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="按帧率分类" icon={<Layers className="w-4 h-4" />} defaultOpen={true}>
            <div className="space-y-3">
              <div className="text-xs p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                自动读取每个视频帧率，创建 FPS_24、FPS_30 等文件夹并分类
              </div>
              <button
                onClick={classifyByFps}
                disabled={!folderPath || !isConfigured || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {activeOperation === 'classify' ? <Square className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                {activeOperation === 'classify' ? '分类中...' : '开始分类'}
              </button>
              {activeOperation === 'classify' && (
                <ProgressBar value={operationProgress} label="分类进度" />
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="归集子文件夹视频" icon={<FolderSync className="w-4 h-4" />} defaultOpen={true}>
            <div className="space-y-3">
              <div className="text-xs p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                搜索所有嵌套子文件夹里的视频，移动到当前目录统一管理
              </div>
              <button
                onClick={collectSubfolderVideos}
                disabled={!folderPath || isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {activeOperation === 'collect' ? <Square className="w-4 h-4" /> : <FolderSync className="w-4 h-4" />}
                {activeOperation === 'collect' ? '归集中...' : '开始归集'}
              </button>
            </div>
          </CollapsibleSection>
        </div>

        <div 
          className="col-span-8 space-y-4 overflow-y-auto pr-2" 
          style={{ scrollbarGutter: 'stable' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!folderPath ? (
            <div 
              className="h-full flex flex-col items-center justify-center rounded-2xl transition-all duration-300"
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
                  <FolderOpen 
                    className="w-10 h-10 transition-colors duration-300" 
                    style={{ color: isDragging ? '#06b6d4' : 'var(--text-tertiary)' }} 
                  />
                </div>
                <p className="text-lg font-medium mb-2" style={{ color: isDragging ? '#06b6d4' : 'var(--text-primary)' }}>
                  {isDragging ? '松开以选择文件夹' : '拖拽文件夹到此处'}
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  或点击左侧"选择文件夹"按钮
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['MP4', 'MKV', 'AVI', 'MOV', 'WMV', 'FLV', 'WebM'].map((format) => (
                    <span 
                      key={format}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {videos.length > 0 && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <FileVideo className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    {videos.length}
                  </span>
                </div>
                <button
                  onClick={copyAllVideoInfo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all duration-200 hover:scale-105"
                  style={{ 
                    background: copied ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)'
                  }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '已复制' : '复制信息'}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th className="px-4 py-2 text-left" style={{ color: 'var(--text-tertiary)' }}>文件名</th>
                      <th className="px-4 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>大小</th>
                      <th className="px-4 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>时长</th>
                      <th className="px-4 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>分辨率</th>
                      <th className="px-4 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>编码</th>
                      <th className="px-4 py-2 text-center" style={{ color: 'var(--text-tertiary)' }}>帧率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video, index) => (
                      <tr key={index} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td className="px-4 py-2 truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }} title={video.name}>
                          {video.name}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          {formatSize(video.size)}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          {formatDuration(video.duration)}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          {video.width}x{video.height}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          {video.codec}
                        </td>
                        <td className="px-4 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                          {video.fps.toFixed(2)} fps
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showFolderList && (folderList.length > 0 || folderPath) && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件夹列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    {folderList.length}
                  </span>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {folderList.map((folder, index) => {
                  const isExpanded = expandedFolders.has(folder.path);
                  return (
                    <div key={folder.path} style={{ borderBottom: index < folderList.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div 
                        className="flex items-center justify-between px-4 py-2 cursor-pointer transition-all hover:brightness-95"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                        onClick={() => toggleFolder(folder.path)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                          ) : (
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                          )}
                          <FolderOpen 
                            className="w-4 h-4 flex-shrink-0" 
                            style={{ color: folder.isRoot ? 'var(--primary-color)' : 'var(--warning-color)' }} 
                          />
                          <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                            {folder.isRoot ? folder.name : folder.name}
                          </span>
                          {folder.isRoot && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                              根目录
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {folder.count} 个视频 · {formatSize(folder.size)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openFolder(folder.path);
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-all"
                            title="在资源管理器中打开"
                          >
                            <ExternalLink className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                          </button>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && folder.videos.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <div className="px-4 py-2 space-y-1">
                              {folder.videos.map((video, vIndex) => (
                                <div 
                                  key={vIndex}
                                  className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-all hover:brightness-95"
                                  style={{ backgroundColor: 'var(--bg-primary)' }}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Video className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                                    <span className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }} title={video.name}>
                                      {video.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                    <span>{formatSize(video.size)}</span>
                                    <span>{formatDuration(video.duration)}</span>
                                    {video.width > 0 && (
                                      <span>{video.width}x{video.height}</span>
                                    )}
                                    {video.fps > 0 && (
                                      <span>{video.fps.toFixed(2)}fps</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {isProcessing && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--primary-color)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {isScanning ? '正在扫描视频...' : 
                     activeOperation === 'merge' ? '正在合并视频...' :
                     activeOperation === 'classify' ? '正在分类视频...' :
                     activeOperation === 'collect' ? '正在归集视频...' : '处理中...'}
                  </span>
                </div>
                <button
                  onClick={stopOperation}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--error-color), #ef4444)',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <Square className="w-4 h-4" />
                  停止
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
