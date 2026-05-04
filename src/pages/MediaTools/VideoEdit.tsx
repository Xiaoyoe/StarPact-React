import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Scissors, RotateCw, RotateCcw, Combine, 
  Upload, Sparkles, Info, 
  Play, AlertCircle, Square, FileType, X, Maximize2, Film,
  Video, MonitorPlay, Music, Loader2, PanelLeftClose, PanelLeft, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Copy, Check, CheckCircle, Terminal as TerminalIcon, SkipBack, SkipForward, SwitchCamera, Rewind, FastForward, Plus, Download, Image, TrendingUp
} from 'lucide-react';
import { Toggle, Badge } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegRendererService } from '@/services/ffmpeg/FFmpegRendererService';
import { useFFmpegStore, type CompareVideoData, type PendingCompareVideos, type PendingVideosForEdit } from '@/stores/ffmpegStore';
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

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function VideoEdit() {
  const [tab, setTab] = useState('edit');
  const [videos, setVideos] = useState<VideoFileInfo[]>([]);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingName, setLoadingName] = useState('');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [videoInfoExpanded, setVideoInfoExpanded] = useState(true);
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState<string>('');
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isLoadingFrame, setIsLoadingFrame] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef(0);
  
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('');
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isInverseMode, setIsInverseMode] = useState(false);
  const [selectMode, setSelectMode] = useState<'start' | 'end'>('start');
  
  const [mergeOrder, setMergeOrder] = useState<number[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const { 
    isConfigured, 
    isElectronEnv, 
    outputPath, 
    tasks,
    activeTaskIds,
    checkConfig, 
    startTask, 
    completeTask, 
    stopTask,
    addTaskLog,
    generateUniquePath,
    setPendingCompareVideos,
    pendingVideosForEdit,
    clearPendingVideosForEdit,
    setActiveTab,
  } = useFFmpegStore();
  
  const toast = useToast();

  const currentVideo = videos.length > 0 && viewingIndex < videos.length ? videos[viewingIndex] : null;

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    if (pendingVideosForEdit && pendingVideosForEdit.paths.length > 0) {
      const loadPendingVideos = async () => {
        const newVideos: VideoFileInfo[] = [];
        for (const filePath of pendingVideosForEdit.paths) {
          const info = await loadVideoInfo(filePath);
          if (info) {
            newVideos.push(info);
          }
        }
        if (newVideos.length > 0) {
          setVideos(prev => {
            const existingPaths = new Set(prev.map(v => v.path));
            const uniqueNewVideos = newVideos.filter(v => !existingPaths.has(v.path));
            return [...prev, ...uniqueNewVideos];
          });
          setViewingIndex(0);
          toast.success(`已从视频整合导入 ${newVideos.length} 个视频`);
        }
        clearPendingVideosForEdit();
      };
      loadPendingVideos();
    }
  }, [pendingVideosForEdit, clearPendingVideosForEdit, toast]);

  useEffect(() => {
    if (videos.length > 0) {
      const newIndices = videos.map((_, i) => i);
      const existingValid = mergeOrder.filter(i => i < videos.length);
      const newItems = newIndices.filter(i => !mergeOrder.includes(i));
      setMergeOrder([...existingValid, ...newItems]);
    } else {
      setMergeOrder([]);
    }
  }, [videos.length]);

  const toggleMergeSelection = (index: number) => {
    if (mergeOrder.includes(index)) {
      setMergeOrder(mergeOrder.filter(i => i !== index));
    } else {
      setMergeOrder([...mergeOrder, index]);
    }
  };

  const moveMergeItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...mergeOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setMergeOrder(newOrder);
  };

  const calculateMergeDuration = (): number => {
    return mergeOrder.reduce((total, idx) => {
      if (idx < videos.length) {
        return total + videos[idx].duration;
      }
      return total;
    }, 0);
  };

  const checkMergeCompatibility = (): { 
    compatible: boolean; 
    issues: string[];
    details: { width: number; height: number; codec: string; fps: number; audioCodec: string } | null;
  } => {
    const selectedVideos = mergeOrder.map(idx => videos[idx]).filter(Boolean);
    if (selectedVideos.length < 2) return { compatible: true, issues: [], details: null };

    const first = selectedVideos[0];
    const issues: string[] = [];

    const sameResolution = selectedVideos.every(v => v.width === first.width && v.height === first.height);
    const sameCodec = selectedVideos.every(v => v.codec === first.codec);
    const sameFps = selectedVideos.every(v => Math.abs(v.fps - first.fps) < 0.5);
    const sameAudioCodec = selectedVideos.every(v => v.audioCodec === first.audioCodec);

    if (!sameResolution) issues.push('分辨率不一致');
    if (!sameCodec) issues.push('视频编码不一致');
    if (!sameFps) issues.push('帧率不一致');
    if (!sameAudioCodec) issues.push('音频编码不一致');

    return {
      compatible: issues.length === 0,
      issues,
      details: { width: first.width, height: first.height, codec: first.codec, fps: first.fps, audioCodec: first.audioCodec },
    };
  };

  const [mergeMode, setMergeMode] = useState<'auto' | 'reencode'>('auto');

  const getVideoFrame = useCallback(async (filePath: string, timeSeconds: number): Promise<string> => {
    try {
      await ffmpegConfigStorage.ready();
      const ffmpegPath = ffmpegConfigStorage.getFFmpegPath();
      if (ffmpegPath && window.electronAPI?.ffmpeg?.getVideoFrame) {
        const frame = await window.electronAPI.ffmpeg.getVideoFrame(ffmpegPath, filePath, timeSeconds);
        if (frame) return frame;
      }
    } catch {}
    return '';
  }, []);

  const convertToCompareData = useCallback((video: VideoFileInfo, tag: CompareVideoData['tag']): CompareVideoData => {
    return {
      path: video.path,
      name: video.name,
      size: video.size,
      duration: video.duration,
      width: video.width,
      height: video.height,
      codec: video.codec,
      fps: video.fps,
      bitrate: video.bitrate,
      audioCodec: video.audioCodec,
      audioSampleRate: video.audioSampleRate,
      audioChannels: video.audioChannels,
      audioBitrate: video.audioBitrate,
      format: video.format,
      thumbnail: video.thumbnail,
      tag,
    };
  }, []);

  const loadVideoInfoForCompare = useCallback(async (filePath: string, tag: CompareVideoData['tag']): Promise<CompareVideoData | null> => {
    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      if (!ffprobePath) return null;
      
      const mediaInfo = await window.electronAPI.ffmpeg.getMediaInfo(ffprobePath, filePath);
      if (!mediaInfo) return null;
      
      const thumbnail = await getVideoFrame(filePath, 1);
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      
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
        tag,
      };
    } catch {
      return null;
    }
  }, [getVideoFrame]);

  const importToCompare = useCallback(async (
    type: 'edit' | 'merge',
    originalVideos: VideoFileInfo[],
    outputFilePath: string
  ) => {
    const compareVideos: CompareVideoData[] = [];
    
    if (type === 'edit') {
      const originalData = convertToCompareData(originalVideos[0], 'original');
      compareVideos.push(originalData);
      
      const editedData = await loadVideoInfoForCompare(outputFilePath, 'edited');
      if (editedData) {
        compareVideos.push(editedData);
      }
    } else {
      for (const video of originalVideos) {
        const data = convertToCompareData(video, 'before-merge');
        compareVideos.push(data);
      }
      
      const mergedData = await loadVideoInfoForCompare(outputFilePath, 'after-merge');
      if (mergedData) {
        compareVideos.push(mergedData);
      }
    }
    
    if (compareVideos.length > 0) {
      const pendingData: PendingCompareVideos = {
        id: `compare-${Date.now()}`,
        type,
        videos: compareVideos,
        timestamp: Date.now(),
      };
      setPendingCompareVideos(pendingData);
      toast.success(`已自动导入 ${compareVideos.length} 个视频到视频整合，可切换查看对比`);
    }
  }, [convertToCompareData, loadVideoInfoForCompare, setPendingCompareVideos, toast]);

  useEffect(() => {
    if (videos.length > 0 && viewingIndex < videos.length) {
      const video = videos[viewingIndex];
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setStartTime('00:00:00');
      setEndTime('');
      setCurrentFrame('');
      
      const loadFrame = async () => {
        setIsLoadingFrame(true);
        const frame = await getVideoFrame(video.path, 1);
        if (frame) setCurrentFrame(frame);
        setIsLoadingFrame(false);
      };
      loadFrame();
    }
  }, [viewingIndex, videos, getVideoFrame]);

  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseFloat(timeStr) || 0;
  };

  const secondsToTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateClipDuration = (): string => {
    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = endTime ? parseTimeToSeconds(endTime) : (currentVideo?.duration || 0);
    const totalDuration = currentVideo?.duration || 0;
    
    if (endSeconds <= startSeconds) {
      return '00:00:00';
    }
    
    if (isInverseMode) {
      const remainingDuration = startSeconds + (totalDuration - endSeconds);
      return secondsToTime(Math.max(0, remainingDuration));
    } else {
      const duration = endSeconds - startSeconds;
      return secondsToTime(duration);
    }
  };

  const jumpToStartFrame = async () => {
    if (!currentVideo) return;
    const startSeconds = parseTimeToSeconds(startTime);
    setCurrentTime(startSeconds);
    currentTimeRef.current = startSeconds;
    
    setIsLoadingFrame(true);
    const frame = await getVideoFrame(currentVideo.path, startSeconds);
    if (frame) setCurrentFrame(frame);
    setIsLoadingFrame(false);
  };

  const jumpToEndFrame = async () => {
    if (!currentVideo) return;
    const endSeconds = endTime ? parseTimeToSeconds(endTime) : currentVideo.duration;
    setCurrentTime(endSeconds);
    currentTimeRef.current = endSeconds;
    
    setIsLoadingFrame(true);
    const frame = await getVideoFrame(currentVideo.path, endSeconds);
    if (frame) setCurrentFrame(frame);
    setIsLoadingFrame(false);
  };

  const formatTimeInput = (input: string): string => {
    const cleaned = input.replace(/[^\d:]/g, '');
    const parts = cleaned.split(':');
    
    if (parts.length === 1) {
      const num = parseInt(parts[0]) || 0;
      return secondsToTime(num);
    }
    
    if (parts.length === 2) {
      const m = parseInt(parts[0]) || 0;
      const s = Math.min(parseInt(parts[1]) || 0, 59);
      return secondsToTime(m * 60 + s);
    }
    
    if (parts.length >= 3) {
      const h = parseInt(parts[0]) || 0;
      const m = Math.min(parseInt(parts[1]) || 0, 59);
      const s = Math.min(parseInt(parts[2]) || 0, 59);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    return input;
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
  };

  const handleEndTimeBlur = () => {
    if (endTime && endTime !== '00:00:00') {
      const formatted = formatTimeInput(endTime);
      const seconds = parseTimeToSeconds(formatted);
      if (currentVideo && seconds > currentVideo.duration) {
        setEndTime(secondsToTime(currentVideo.duration));
      } else {
        setEndTime(formatted);
      }
    }
  };

  const buildFiltersStr = (): string => {
    const filters: string[] = [];
    if (rotation) {
      const transposeMap: Record<number, string> = {
        90: 'transpose=1',
        180: 'transpose=1,transpose=1',
        270: 'transpose=2',
      };
      if (transposeMap[rotation]) filters.push(transposeMap[rotation]);
    }
    if (flipH) filters.push('hflip');
    if (flipV) filters.push('vflip');
    return filters.join(',');
  };

  const generateFFmpegCommand = (): string => {
    if (!currentVideo) return '';
    
    const inputPath = currentVideo.path;
    const outputFileName = customFileName.trim() || `${currentVideo.name.split('.')[0]}_edited.mp4`;
    const startSec = parseTimeToSeconds(startTime);
    const endSec = endTime ? parseTimeToSeconds(endTime) : 0;
    const filters = buildFiltersStr();
    
    if (isInverseMode && startSec > 0 && endSec > 0 && startSec < endSec) {
      const part1Output = outputFileName.replace('.mp4', '_part1.mp4');
      const part2Output = outputFileName.replace('.mp4', '_part2.mp4');
      const listFile = outputFileName.replace('.mp4', '_list.txt');
      
      let cmd = '# 反选模式：删除选中区域\n';
      cmd += '# 第一步：提取开头部分\n';
      cmd += `ffmpeg -i "${inputPath}" -t ${startSec}`;
      cmd += filters ? ` -vf "${filters}" -c:v libx264 -preset fast -crf 23 -c:a copy` : ' -c copy';
      cmd += ` "${part1Output}"\n\n`;
      
      cmd += '# 第二步：提取结尾部分\n';
      cmd += `ffmpeg -ss ${endSec} -i "${inputPath}"`;
      cmd += filters ? ` -vf "${filters}" -c:v libx264 -preset fast -crf 23 -c:a copy` : ' -c copy';
      cmd += ` "${part2Output}"\n\n`;
      
      cmd += '# 第三步：创建合并列表\n';
      cmd += `echo "file '${part1Output}'" > "${listFile}"\n`;
      cmd += `echo "file '${part2Output}'" >> "${listFile}"\n\n`;
      
      cmd += '# 第四步：合并两部分\n';
      cmd += `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputFileName}"`;
      
      return cmd;
    }
    
    let cmd = 'ffmpeg';
    
    if (startSec > 0) {
      cmd += ` -ss ${startSec}`;
    }
    
    cmd += ` -i "${inputPath}"`;
    
    if (startSec > 0 && endSec > 0) {
      cmd += ` -t ${endSec - startSec}`;
    } else if (endSec > 0) {
      cmd += ` -to ${endSec}`;
    }
    
    if (filters) {
      cmd += ` -vf "${filters}" -c:v libx264 -preset fast -crf 23 -c:a copy`;
    } else {
      cmd += ' -c copy';
    }
    
    cmd += ` "${outputFileName}"`;
    
    return cmd;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const handleTimelineClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !currentVideo) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * currentVideo.duration;
    
    setCurrentTime(time);
    
    if (selectMode === 'start') {
      setStartTime(secondsToTime(time));
    } else {
      setEndTime(secondsToTime(time));
    }
    
    const frame = await getVideoFrame(currentVideo.path, time);
    if (frame) setCurrentFrame(frame);
  };

  const handleTimelineMouseDown = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !currentVideo) return;
    setIsDraggingTimeline(true);
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * currentVideo.duration;
    
    currentTimeRef.current = time;
    setCurrentTime(time);
    
    if (selectMode === 'start') {
      setStartTime(secondsToTime(time));
    } else {
      setEndTime(secondsToTime(time));
    }
    
    setIsLoadingFrame(true);
    const frame = await getVideoFrame(currentVideo.path, time);
    if (frame) setCurrentFrame(frame);
    setIsLoadingFrame(false);
  };

  useEffect(() => {
    if (!isDraggingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !currentVideo) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * currentVideo.duration;
      
      currentTimeRef.current = time;
      setCurrentTime(time);
    };

    const handleMouseUp = async () => {
      setIsDraggingTimeline(false);
      
      if (currentVideo) {
        const time = currentTimeRef.current;
        if (selectMode === 'start') {
          setStartTime(secondsToTime(time));
        } else {
          setEndTime(secondsToTime(time));
        }
        setIsLoadingFrame(true);
        const frame = await getVideoFrame(currentVideo.path, time);
        if (frame) setCurrentFrame(frame);
        setIsLoadingFrame(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTimeline, currentVideo]);

  const loadVideoInfo = async (filePath: string): Promise<VideoFileInfo | null> => {
    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      if (!ffprobePath) {
        return null;
      }
      
      const mediaInfo = await window.electronAPI.ffmpeg.getMediaInfo(ffprobePath, filePath);
      
      if (!mediaInfo) {
        return null;
      }
      
      const thumbnail = await getVideoFrame(filePath, 1);
      
      return {
        path: filePath,
        name: filePath.split(/[/\\]/).pop() || filePath,
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
      return null;
    }
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (!isElectronEnv || !isConfigured) {
      toast.error('请先配置 FFmpeg');
      return;
    }

    setIsLoading(true);
    setLoadProgress(0);
    
    const newVideos: VideoFileInfo[] = [];
    const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts', '.m2ts', '.ogv', '.3gp', '.f4v'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = (file as any).path;
      if (!filePath) continue;
      
      const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      if (!videoExts.includes(ext)) continue;
      
      setLoadingName(file.name);
      
      const info = await loadVideoInfo(filePath);
      if (info) {
        newVideos.push(info);
      }
      
      setLoadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
      setViewingIndex(0);
      setCustomFileName('');
      toast.success(`成功导入 ${newVideos.length} 个视频`);
    } else {
      toast.warning('没有成功解析任何视频文件');
    }
    
    setIsLoading(false);
    setLoadingName('');
  }, [isElectronEnv, isConfigured, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  }, [handleFilesSelected]);

  const selectMainFile = (index: number) => {
    setViewingIndex(index);
    setCustomFileName('');
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    if (viewingIndex >= videos.length - 1) {
      setViewingIndex(Math.max(0, videos.length - 2));
    }
  };

  const clearAllVideos = () => {
    setVideos([]);
    setViewingIndex(0);
    setCustomFileName('');
  };

  const sendAllToVideoProcess = async () => {
    if (videos.length === 0) {
      toast.info('没有视频可发送');
      return;
    }
    
    try {
      await ffmpegConfigStorage.ready();
      const ffprobePath = ffmpegConfigStorage.getFFprobePath();
      
      if (!ffprobePath) {
        toast.error('请先配置 FFmpeg');
        return;
      }
      
      const compareVideos: CompareVideoData[] = [];
      
      for (const video of videos) {
        const mediaInfo = await window.electronAPI.ffmpeg.getMediaInfo(ffprobePath, video.path);
        
        compareVideos.push({
          path: video.path,
          name: video.name,
          size: video.size,
          duration: video.duration,
          width: video.width,
          height: video.height,
          codec: video.codec,
          fps: video.fps,
          bitrate: video.bitrate,
          audioCodec: mediaInfo?.audio?.codec || '',
          audioSampleRate: mediaInfo?.audio?.sampleRate || 0,
          audioChannels: mediaInfo?.audio?.channels || 0,
          audioBitrate: mediaInfo?.audio?.bitrate || 0,
          format: video.name.split('.').pop() || '',
          thumbnail: video.thumbnail || '',
        });
      }
      
      setPendingCompareVideos({
        id: `videoEdit-${Date.now()}`,
        type: 'edit',
        videos: compareVideos,
        timestamp: Date.now(),
      });
      setActiveTab('video');
      toast.success(`已发送 ${videos.length} 个视频到视频整合`);
    } catch (error) {
      toast.error('发送失败');
    }
  };

  const getOutputFilePath = (video: VideoFileInfo, extension: string, suffix?: string, customName?: string): string => {
    const inputPath = video.path;
    const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
    const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
    const lastDotIndex = video.name.lastIndexOf('.');
    const inputName = lastDotIndex >= 0 ? video.name.substring(0, lastDotIndex) : video.name;
    
    const outputDir = outputPath || inputDir;
    const sep = outputDir.includes('\\') ? '\\' : '/';
    
    const now = new Date();
    const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const finalName = customName && customName.trim() 
      ? customName.trim() 
      : `${inputName}${suffix ? `_${suffix}` : ''}_${dateTimeSuffix}`;
    
    return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
  };

  const executeNormalEdit = async (startSec: number, endSec: number) => {
    const outputFilePath = generateUniquePath(getOutputFilePath(currentVideo!, 'mp4', 'edited', customFileName));
    
    const args = ffmpegRendererService.buildVideoEditArgs(currentVideo!.path, outputFilePath, {
      startTime: startSec > 0 ? startSec : undefined,
      endTime: endSec > 0 ? endSec : undefined,
      rotation,
      flipH,
      flipV,
    });

    const taskId = startTask('videoEdit', currentVideo!.name, currentVideo!.path, outputFilePath);
    addTaskLog(taskId, `[info] FFmpeg Studio - 视频编辑`);
    addTaskLog(taskId, `[info] 模式: 正选剪辑${rotation || flipH || flipV ? ' + 旋转/翻转' : ''}`);
    if (startSec > 0) addTaskLog(taskId, `[info] 起始时间: ${secondsToTime(startSec)} (${startSec}秒)`);
    if (endSec > 0) addTaskLog(taskId, `[info] 结束时间: ${secondsToTime(endSec)} (${endSec}秒)`);
    addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${args.join(' ')}`);

    try {
      const duration = endSec > 0 && startSec > 0
        ? endSec - startSec
        : endSec > 0
          ? endSec
          : startSec > 0
            ? currentVideo!.duration - startSec
            : currentVideo!.duration;
      const result = await ffmpegRendererService.executeWithProgress(args, duration, taskId);
      completeTask(taskId, result.success, result.error);
      if (result.success) {
        toast.success('处理完成！');
        await importToCompare('edit', [currentVideo!], outputFilePath);
      } else {
        toast.error('处理失败');
      }
    } catch (error) {
      completeTask(taskId, false, error instanceof Error ? error.message : '未知错误');
      toast.error('处理失败');
    }
  };

  const executeInverseCut = async (startSec: number, endSec: number) => {
    const outputFilePath = generateUniquePath(getOutputFilePath(currentVideo!, 'mp4', 'inversed', customFileName));
    
    const isWindows = outputFilePath.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const lastSepIndex = Math.max(outputFilePath.lastIndexOf('/'), outputFilePath.lastIndexOf('\\'));
    const outputDir = lastSepIndex > 0 ? outputFilePath.substring(0, lastSepIndex) : '';
    const tempFolder = `${outputDir}${separator}.temp_parts`;
    
    const baseName = outputFilePath.substring(lastSepIndex + 1).replace('.mp4', '') || 'output';
    const part1Path = `${tempFolder}${separator}${baseName}_part1.mp4`;
    const part2Path = `${tempFolder}${separator}${baseName}_part2.mp4`;

    const taskId = startTask('videoEdit', currentVideo!.name, currentVideo!.path, outputFilePath);
    addTaskLog(taskId, `[info] FFmpeg Studio - 视频编辑`);
    addTaskLog(taskId, `[info] 模式: 反选剪辑（删除选中区域）`);
    addTaskLog(taskId, `[info] 起始时间: ${secondsToTime(startSec)} (${startSec}秒)`);
    addTaskLog(taskId, `[info] 结束时间: ${secondsToTime(endSec)} (${endSec}秒)`);
    addTaskLog(taskId, `[info] 临时文件目录: ${tempFolder}`);

    if (window.electronAPI?.file?.createFolder) {
      const folderResult = await window.electronAPI.file.createFolder(tempFolder);
      if (!folderResult.success) {
        addTaskLog(taskId, `[error] 创建临时文件夹失败: ${folderResult.error}`);
        completeTask(taskId, false, '创建临时文件夹失败');
        toast.error('创建临时文件夹失败');
        return;
      }
      addTaskLog(taskId, `[info] 临时文件夹创建成功`);
    } else {
      addTaskLog(taskId, `[warn] 文件操作API不可用，尝试继续执行`);
    }

    const filesToMerge: string[] = [];

    try {
      const part1Args = ffmpegRendererService.buildInverseCutPart1Args(
        currentVideo!.path, part1Path, startSec, rotation, flipH, flipV
      );

      if (part1Args) {
        addTaskLog(taskId, `[info] 第一步：提取开头部分 (00:00:00 -> ${secondsToTime(startSec)})`);
        addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${part1Args.join(' ')}`);
        const result = await ffmpegRendererService.executeWithProgress(part1Args, startSec, taskId);

        if (!result.success) {
          addTaskLog(taskId, `[error] 提取开头部分失败: ${result.error || '未知错误'}`);
          completeTask(taskId, false, '提取开头部分失败');
          toast.error('处理失败');
          return;
        }
        addTaskLog(taskId, `[info] 开头部分提取成功`);
        filesToMerge.push(part1Path);
      } else {
        addTaskLog(taskId, `[info] 跳过开头部分（起始时间为0）`);
      }

      const part2Args = ffmpegRendererService.buildInverseCutPart2Args(
        currentVideo!.path, part2Path, endSec, rotation, flipH, flipV
      );

      if (part2Args) {
        addTaskLog(taskId, `[info] 第二步：提取结尾部分 (${secondsToTime(endSec)} -> 结尾)`);
        addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${part2Args.join(' ')}`);
        const result = await ffmpegRendererService.executeWithProgress(part2Args, currentVideo!.duration - endSec, taskId);

        if (!result.success) {
          addTaskLog(taskId, `[error] 提取结尾部分失败: ${result.error || '未知错误'}`);
          completeTask(taskId, false, '提取结尾部分失败');
          toast.error('处理失败');
          return;
        }
        addTaskLog(taskId, `[info] 结尾部分提取成功`);
        filesToMerge.push(part2Path);
      } else {
        addTaskLog(taskId, `[info] 跳过结尾部分`);
      }

      if (filesToMerge.length === 0) {
        completeTask(taskId, false, '没有有效的视频片段');
        toast.error('处理失败');
        return;
      }

      if (filesToMerge.length === 1) {
        addTaskLog(taskId, `[info] 只有一个片段，直接移动到输出位置`);
        if (window.electronAPI?.file?.renameFile) {
          const renameResult = await window.electronAPI.file.renameFile(filesToMerge[0], outputFilePath);
          if (renameResult.success) {
            completeTask(taskId, true);
            toast.success('处理完成！');
            await importToCompare('edit', [currentVideo!], outputFilePath);
          } else {
            completeTask(taskId, false, renameResult.error || '移动文件失败');
            toast.error('处理失败');
          }
        } else {
          completeTask(taskId, false, '文件操作API不可用');
          toast.error('处理失败');
        }
        return;
      }

      addTaskLog(taskId, `[info] 第三步：合并 ${filesToMerge.length} 个部分`);
      const mergeResult = await ffmpegRendererService.executeVideoMerge(filesToMerge, outputFilePath, taskId);
      completeTask(taskId, mergeResult.success, mergeResult.error);
      if (mergeResult.success) {
        addTaskLog(taskId, `[info] 临时文件已保存到: ${tempFolder}`);
        toast.success('处理完成！');
        await importToCompare('edit', [currentVideo!], outputFilePath);
      } else {
        toast.error('处理失败');
      }
    } catch (error) {
      completeTask(taskId, false, error instanceof Error ? error.message : '未知错误');
      toast.error('处理失败');
    }
  };

  const executeVideoMergeFlow = async () => {
    const selectedVideos = mergeOrder.map(idx => videos[idx]).filter(Boolean);
    
    if (selectedVideos.length < 2) {
      toast.error('合并功能需要至少选择2个视频文件');
      return;
    }
    
    const outputFilePath = generateUniquePath(getOutputFilePath(videos[0], 'mp4', 'merged', customFileName));
    const compat = checkMergeCompatibility();
    const needReencode = !compat.compatible && mergeMode === 'reencode';
    
    const taskId = startTask('videoEdit', videos[0].name, videos[0].path, outputFilePath);
    addTaskLog(taskId, `[info] FFmpeg Studio - 视频合并`);
    addTaskLog(taskId, `[info] 合并 ${selectedVideos.length} 个视频文件`);
    addTaskLog(taskId, `[info] 合并顺序: ${selectedVideos.map(v => v.name).join(' -> ')}`);
    addTaskLog(taskId, `[info] 合并模式: ${needReencode ? '重编码合并' : '快速合并'}`);
    if (compat.issues.length > 0) {
      addTaskLog(taskId, `[warn] 参数不一致: ${compat.issues.join(', ')}`);
    }

    try {
      let result;
      if (needReencode && compat.details) {
        addTaskLog(taskId, `[info] 目标编码: ${compat.details.width}x${compat.details.height} libx264 30fps aac`);
        result = await ffmpegRendererService.executeReencodeMerge(
          selectedVideos.map(v => v.path),
          outputFilePath,
          compat.details.width,
          compat.details.height,
          taskId
        );
      } else {
        result = await ffmpegRendererService.executeVideoMerge(
          selectedVideos.map(v => v.path),
          outputFilePath,
          taskId
        );
      }
      completeTask(taskId, result.success, result.error);
      if (result.success) {
        toast.success('处理完成！');
        await importToCompare('merge', selectedVideos, outputFilePath);
      } else {
        toast.error('处理失败');
      }
    } catch (error) {
      completeTask(taskId, false, error instanceof Error ? error.message : '未知错误');
      toast.error('处理失败');
    }
  };

  const handleStart = async () => {
    if (!isElectronEnv) {
      toast.error('请使用 Electron 模式运行此功能');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    if (videos.length === 0 || !currentVideo) {
      toast.error('请先选择要处理的文件');
      return;
    }

    const startSec = parseTimeToSeconds(startTime);
    const endSec = endTime ? parseTimeToSeconds(endTime) : 0;

    if (tab === 'edit') {
      if (isInverseMode && endSec > 0 && startSec < endSec) {
        await executeInverseCut(startSec, endSec);
      } else {
        await executeNormalEdit(startSec, endSec);
      }
    } else if (tab === 'merge') {
      await executeVideoMergeFlow();
    } else {
      toast.error('该功能暂未实现');
    }
  };

  const handleStop = async () => {
    const moduleTasks = tasks.filter(t => t.module === 'videoEdit' && activeTaskIds.has(t.id));
    if (moduleTasks.length > 0) {
      await stopTask(moduleTasks[0].id);
      toast.info('已停止处理');
    }
  };

  const saveCurrentFrame = async () => {
    if (!currentVideo || !isElectronEnv) {
      toast.error('请先选择视频');
      return;
    }
    
    try {
      await ffmpegConfigStorage.ready();
      const ffmpegPath = ffmpegConfigStorage.getFFmpegPath();
      
      if (!ffmpegPath) {
        toast.error('请先配置 FFmpeg');
        return;
      }
      
      const timeSeconds = currentTime;
      const baseName = currentVideo.name.replace(/\.[^.]+$/, '');
      
      let outputDir: string;
      if (outputPath && outputPath.trim()) {
        outputDir = outputPath.trim();
      } else {
        const videoPath = currentVideo.path;
        const lastSepIndex = Math.max(
          videoPath.lastIndexOf('/'),
          videoPath.lastIndexOf('\\')
        );
        outputDir = lastSepIndex >= 0 ? videoPath.substring(0, lastSepIndex) : '.';
      }
      
      const isWindows = outputDir.includes('\\') || (!outputDir.includes('/') && typeof process !== 'undefined' && process.platform === 'win32');
      const separator = isWindows ? '\\' : '/';
      
      const cleanDir = outputDir.endsWith(separator) ? outputDir.slice(0, -1) : outputDir;
      const outputPathFile = `${cleanDir}${separator}${baseName}_frame_${Math.floor(timeSeconds)}s.png`;
      
      const args = [
        '-ss', timeSeconds.toString(),
        '-i', currentVideo.path,
        '-vframes', '1',
        '-y',
        outputPathFile
      ];
      
      const result = await ffmpegRendererService.execute(args);
      
      if (result.success) {
        toast.success(`已保存帧到: ${outputPathFile}`);
      } else {
        toast.error('保存帧失败');
      }
    } catch (error) {
      toast.error('保存帧失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const currentModuleTask = tasks.find(t => t.module === 'videoEdit' && activeTaskIds.has(t.id));
  const isCurrentModuleProcessing = !!currentModuleTask;

  const renderSettings = () => {
    switch (tab) {
      case 'edit':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Scissors className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>时间剪辑</span>
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: isInverseMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                  color: isInverseMode ? 'var(--error-color)' : 'var(--primary-color)' 
                }}
              >
                {isInverseMode ? '反选' : '正选'}
              </span>
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}
              >
                {calculateClipDuration()}
              </span>
              <button
                onClick={() => {
                  setStartTime('00:00:00');
                  setEndTime('');
                  setRotation(0);
                  setFlipH(false);
                  setFlipV(false);
                  setIsInverseMode(false);
                }}
                className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all duration-200 hover:scale-105 hover:bg-[var(--bg-secondary)]"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-color)'
                }}
                title="重置所有设置"
              >
                <RotateCcw className="w-3 h-3" />
                重置
              </button>
            </div>
            
            <div 
              className="p-2 rounded-lg text-[10px] mb-2"
              style={{ 
                backgroundColor: isInverseMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                color: 'var(--text-secondary)' 
              }}
            >
              {isInverseMode 
                ? '反选：删除红色选中区域，保留其他部分' 
                : '正选：保留蓝色选中区域，删除其他部分'}
            </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-tertiary)' }}>开始时间</label>
                  <input 
                    className="w-full rounded-lg px-2 py-1.5 text-xs font-mono outline-none transition-all duration-200 hover:border-[var(--primary-color)] focus:border-[var(--primary-color)]" 
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    onBlur={() => {
                      if (startTime) {
                        const formatted = formatTimeInput(startTime);
                        setStartTime(formatted);
                      }
                    }}
                    placeholder="00:00:00"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-tertiary)' }}>结束时间</label>
                  <input 
                    className="w-full rounded-lg px-2 py-1.5 text-xs font-mono outline-none transition-all duration-200 hover:border-[var(--primary-color)] focus:border-[var(--primary-color)]" 
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                    value={endTime} 
                    onChange={e => handleEndTimeChange(e.target.value)} 
                    onBlur={handleEndTimeBlur}
                    placeholder="留空=到结尾" 
                  />
                </div>
              </div>

            <div className="h-px" style={{ backgroundColor: 'var(--border-color)' }} />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <RotateCw className="w-3 h-3" style={{ color: 'var(--primary-color)' }} />
                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>旋转镜像</label>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { value: 0, label: '不旋转' },
                  { value: 90, label: '顺时针90°' },
                  { value: 180, label: '180°' },
                  { value: 270, label: '逆时针90°' },
                ].map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRotation(r.value)}
                    className="py-1.5 rounded-lg text-xs transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      backgroundColor: rotation === r.value ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                      color: rotation === r.value ? 'var(--primary-color)' : 'var(--text-secondary)',
                      border: `1px solid ${rotation === r.value ? 'var(--primary-color)' : 'transparent'}`,
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Toggle checked={flipH} onChange={setFlipH} label="水平翻转" />
                <Toggle checked={flipV} onChange={setFlipV} label="垂直翻转" />
              </div>
            </div>
          </div>
        );
      case 'merge':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Combine className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频合并</span>
              </div>
              {videos.length > 1 && (
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}>
                  {mergeOrder.length}/{videos.length}
                </span>
              )}
            </div>
            
            {videos.length < 2 ? (
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <Combine className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>需要至少 2 个视频</p>
              </div>
            ) : (
              <>
                {mergeOrder.length >= 2 && (
                  <>
                    {(() => {
                      const compat = checkMergeCompatibility();
                      return compat.compatible ? (
                        <div 
                          className="flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-green-500/20 cursor-default"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                        >
                          <CheckCircle className="w-4 h-4" style={{ color: '#22c55e' }} />
                          <span className="text-xs font-medium" style={{ color: '#22c55e' }}>参数兼容</span>
                          <span className="text-xs font-mono ml-auto font-medium" style={{ color: '#22c55e' }}>
                            {secondsToTime(calculateMergeDuration())}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div 
                            className="p-2 rounded-lg transition-all"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                              <span className="text-xs font-medium" style={{ color: '#ef4444' }}>参数不一致</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {compat.issues.map((issue, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' }}>
                                  {issue}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setMergeMode('reencode')}
                              className="flex-1 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02]"
                              style={{
                                backgroundColor: mergeMode === 'reencode' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-tertiary)',
                                color: mergeMode === 'reencode' ? '#d97706' : 'var(--text-secondary)',
                                border: `1px solid ${mergeMode === 'reencode' ? '#f59e0b' : 'transparent'}`,
                              }}
                            >
                              重编码合并
                            </button>
                            <button
                              onClick={() => setMergeMode('auto')}
                              className="flex-1 text-xs py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02]"
                              style={{
                                backgroundColor: mergeMode === 'auto' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)',
                                color: mergeMode === 'auto' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                border: `1px solid ${mergeMode === 'auto' ? 'var(--primary-color)' : 'transparent'}`,
                              }}
                            >
                              快速合并
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>预计时长</span>
                            <span className="font-mono font-medium" style={{ color: 'var(--primary-color)' }}>
                              {secondsToTime(calculateMergeDuration())}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>拖拽调整顺序</span>
                  <button
                    onClick={() => {
                      if (mergeOrder.length === videos.length) {
                        setMergeOrder([]);
                      } else {
                        setMergeOrder(videos.map((_, i) => i));
                      }
                    }}
                    className="text-xs px-2 py-1 rounded transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    {mergeOrder.length === videos.length ? '取消全选' : '全选'}
                  </button>
                </div>
                
                <div 
                  className="rounded-lg p-1.5 space-y-1 max-h-40 overflow-y-auto"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {mergeOrder.map((videoIdx, orderIdx) => {
                    const video = videos[videoIdx];
                    if (!video) return null;
                    
                    return (
                      <div
                        key={videoIdx}
                        draggable
                        onDragStart={(e) => { setDraggedIndex(orderIdx); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverIndex(orderIdx); }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedIndex !== null && draggedIndex !== orderIdx) moveMergeItem(draggedIndex, orderIdx);
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-white/5 group"
                        style={{ 
                          backgroundColor: dragOverIndex === orderIdx ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                          border: `1px solid ${dragOverIndex === orderIdx ? 'var(--primary-color)' : 'transparent'}`,
                        }}
                      >
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {orderIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs truncate block" style={{ color: 'var(--text-primary)' }}>{video.name}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {secondsToTime(video.duration)} · {video.width}x{video.height}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleMergeSelection(videoIdx); }} 
                          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/20"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                {videos.filter((_, i) => !mergeOrder.includes(i)).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>未选中:</span>
                    <div className="flex flex-wrap gap-1">
                      {videos.map((video, idx) => 
                        !mergeOrder.includes(idx) && (
                          <button
                            key={idx}
                            onClick={() => toggleMergeSelection(idx)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all duration-200 hover:scale-105"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            <Plus className="w-3 h-3" />
                            <span className="max-w-[80px] truncate">{video.name}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 relative">
      <AnimatePresence>
        {(isLoadingFrame || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-50"
          >
            <div 
              className="mx-4 rounded-b-lg overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            >
              <div className="flex items-center gap-3 px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary-color)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {isLoading ? `正在加载: ${loadingName}` : '正在获取视频帧...'}
                </span>
                {isLoading && (
                  <span className="text-xs ml-auto" style={{ color: 'var(--primary-color)' }}>
                    {loadProgress}%
                  </span>
                )}
              </div>
              <div className="h-1 w-full relative" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                {isLoading ? (
                  <motion.div 
                    className="h-full"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${loadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <motion.div 
                    className="h-full"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>视频编辑</h2>
            <Badge color="blue">编辑</Badge>
            {isCurrentModuleProcessing && (
              <Badge color="success">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  处理中
                </span>
              </Badge>
            )}
          </div>
          
          {videos.length > 0 && (
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{ 
                backgroundColor: showAnalysis ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)', 
                border: showAnalysis ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
              }}
              onClick={() => setShowAnalysis(!showAnalysis)}
              title="点击查看视频分析"
            >
              <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: showAnalysis ? 'var(--primary-color)' : 'var(--text-tertiary)' }} />
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>文件:</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{videos.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>大小:</span>
                  <span className="font-medium" style={{ color: '#8b5cf6' }}>{formatSize(videos.reduce((sum, v) => sum + v.size, 0))}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ color: 'var(--text-tertiary)' }}>时长:</span>
                  <span className="font-medium" style={{ color: '#10b981' }}>{formatDuration(videos.reduce((sum, v) => sum + v.duration, 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all min-w-[120px] hover:scale-[1.02]`}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--primary-color)' : 'var(--border-color)'}`,
              backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = 'video/*';
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || []);
                handleFilesSelected(files);
              };
              input.click();
            }}
            title="导入视频文件"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary-color)' }} />
            ) : (
              <Upload className="w-4 h-4" style={{ color: isDragOver ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
            )}
            <span className="text-xs" style={{ color: isDragOver ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
              {isLoading ? `${loadProgress}%` : '导入视频'}
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            {[
              { key: 'edit', label: '编辑', icon: <Scissors className="w-3.5 h-3.5" /> },
              { key: 'merge', label: '合并', icon: <Combine className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: tab === t.key ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: tab === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={isCurrentModuleProcessing ? handleStop : handleStart}
            disabled={!isConfigured || !isElectronEnv || videos.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{ 
              background: isCurrentModuleProcessing 
                ? 'linear-gradient(135deg, var(--error-color), #ef4444)' 
                : 'linear-gradient(135deg, var(--primary-color), #2563eb)',
              boxShadow: isCurrentModuleProcessing 
                ? '0 2px 8px rgba(239, 68, 68, 0.3)' 
                : '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
            title={isCurrentModuleProcessing ? '停止处理' : '开始处理'}
          >
            {isCurrentModuleProcessing ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>停止</span>
                {currentModuleTask && currentModuleTask.progress !== undefined && (
                  <span className="text-[10px] opacity-80">
                    {Number.isFinite(currentModuleTask.progress) 
                      ? `${Math.floor(currentModuleTask.progress)}%` 
                      : '0%'}
                  </span>
                )}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>开始</span>
              </>
            )}
          </button>
          <button
            onClick={() => setTimelineVisible(!timelineVisible)}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            title={timelineVisible ? '隐藏进度操作栏' : '显示进度操作栏'}
          >
            {timelineVisible ? (
              <ChevronsDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronsUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
          <button
            onClick={() => setLeftPanelVisible(!leftPanelVisible)}
            className="p-2 rounded-lg transition-all"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            title={leftPanelVisible ? '隐藏左侧面板' : '显示左侧面板'}
          >
            {leftPanelVisible ? (
              <PanelLeftClose className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <PanelLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>
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

      <div className="flex gap-4 flex-1 min-h-0">
        <AnimatePresence>
          {leftPanelVisible && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-shrink-0 space-y-4 overflow-y-auto pr-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              {videos.length === 0 && (
                <div 
                  className="rounded-xl p-4 text-center cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)', 
                    border: `2px dashed ${isDragOver ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      handleFilesSelected(files);
                    };
                    input.click();
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    handleFilesSelected(files);
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: isDragOver ? 'var(--primary-color)' : 'var(--text-tertiary)' }} />
                  <p className="text-xs" style={{ color: isDragOver ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                    {isDragOver ? '松开导入视频' : '点击或拖拽导入视频'}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>支持 mp4, mkv, avi, mov, webm 等格式</p>
                </div>
              )}
              {videos.length > 0 && (
                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileType className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件列表</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}>
                        {videos.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={sendAllToVideoProcess}
                        className="text-[10px] px-2 py-1 rounded transition-colors"
                        style={{ color: 'var(--primary-color)' }}
                        title="发送所有视频到视频整合"
                      >
                        发送
                      </button>
                      <button
                        onClick={clearAllVideos}
                        className="text-[10px] px-2 py-1 rounded transition-colors"
                        style={{ color: 'var(--error-color)' }}
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {videos.map((v, i) => (
                      <div 
                        key={i} 
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all cursor-pointer group"
                        style={{ 
                          backgroundColor: viewingIndex === i ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                          border: viewingIndex === i ? '1px solid var(--primary-color)' : '1px solid transparent'
                        }}
                        onClick={() => selectMainFile(i)}
                      >
                        {viewingIndex === i && (
                          <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                        )}
                        <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{v.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeVideo(i); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                          style={{ color: 'var(--error-color)' }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输出文件名</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder="留空则使用默认名称"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                  />
                  <span 
                    className="px-2 py-2 rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                  >
                    .mp4
                  </span>
                </div>
              </div>

              {currentVideo && (
                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TerminalIcon className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>指令预览</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(generateFFmpegCommand())}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all"
                      style={{ 
                        backgroundColor: copied ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)', 
                        color: copied ? 'var(--success-color)' : 'var(--text-secondary)' 
                      }}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                  <div 
                    className="rounded-lg p-3 text-[10px] font-mono break-all max-h-32 overflow-y-auto"
                    style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    {generateFFmpegCommand() || '暂无指令'}
                  </div>
                </div>
              )}

              <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>导入视频</span>
                </div>
                <div
                  onClick={() => {
                    if (isLoading) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const files = Array.from((e.target as HTMLInputElement).files || []);
                      handleFilesSelected(files);
                    };
                    input.click();
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    handleFilesSelected(files);
                  }}
                  className="w-full flex flex-col items-center justify-center gap-2 py-4 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{ 
                    backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)', 
                    border: `2px dashed ${isDragOver ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary-color)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>导入中 {loadProgress}%...</span>
                      {loadingName && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>({loadingName})</span>}
                    </>
                  ) : isDragOver ? (
                    <>
                      <Upload className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                      <span style={{ color: 'var(--primary-color)' }}>松开导入视频</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>点击或拖拽视频文件</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-tertiary)' }}>
                  支持 mp4, mkv, avi, mov, webm 等格式
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className="flex-1 flex flex-col"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentVideo ? (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div 
                className="flex-1 rounded-xl overflow-hidden flex items-center justify-center min-h-0 relative"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                {showAnalysis ? (
                  <div className="w-full h-full flex flex-col p-4 overflow-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频分析</span>
                      <Badge color="blue">{videos.length} 个文件</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>总大小</div>
                        <div className="text-base font-bold" style={{ color: '#8b5cf6' }}>{formatSize(videos.reduce((sum, v) => sum + v.size, 0))}</div>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>总时长</div>
                        <div className="text-base font-bold" style={{ color: '#10b981' }}>{formatDuration(videos.reduce((sum, v) => sum + v.duration, 0))}</div>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--text-tertiary)' }}>平均帧率</div>
                        <div className="text-base font-bold" style={{ color: '#f59e0b' }}>{(videos.reduce((sum, v) => sum + v.fps, 0) / videos.length).toFixed(2)} fps</div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto space-y-2">
                      {videos.map((video, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer"
                          style={{ 
                            backgroundColor: viewingIndex === index ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                            border: viewingIndex === index ? '1px solid var(--primary-color)' : '1px solid transparent'
                          }}
                          onClick={() => selectMainFile(index)}
                        >
                          <div className="w-16 h-10 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt="" className="w-full h-full object-cover" draggable={false} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-4 h-4" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{video.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px]" style={{ color: '#8b5cf6' }}>{formatSize(video.size)}</span>
                              <span className="text-[10px]" style={{ color: '#10b981' }}>{formatDuration(video.duration)}</span>
                              <span className="text-[10px]" style={{ color: '#f59e0b' }}>{video.width}x{video.height}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                <div 
                  className="relative cursor-pointer group w-full h-full flex items-center justify-center"
                  onClick={() => (currentFrame || currentVideo.thumbnail) && setShowFullscreen(true)}
                >
                  {(currentFrame || currentVideo.thumbnail) ? (
                    <>
                      <img 
                        src={currentFrame || currentVideo.thumbnail} 
                        alt="视频预览" 
                        className="max-w-full max-h-full object-contain transition-transform duration-300"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                        }}
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                        <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Video className="w-12 h-12" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                    </div>
                  )}
                  <div 
                    className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between pointer-events-none"
                    style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
                  >
                    <span className="text-[10px] text-white">{currentVideo.width}x{currentVideo.height}</span>
                    <span className="text-[10px] text-white">{formatDuration(currentVideo.duration)}</span>
                  </div>
                  
                  {currentVideo && !showAnalysis && (
                    <button
                      onClick={(e) => { e.stopPropagation(); saveCurrentFrame(); }}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-white transition-all duration-200 z-10 hover:scale-105 hover:shadow-lg group"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                      title="保存当前帧为图片"
                    >
                      <Image className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" style={{ color: '#10b981' }} />
                      <span className="group-hover:text-green-400 transition-colors duration-200">保存帧</span>
                    </button>
                  )}
                </div>
                )}
              </div>

              <AnimatePresence>
                {tab === 'edit' && timelineVisible && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div 
                      className="rounded-xl p-4"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>时间轴</span>
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}
                          >
                            剪辑时长: {calculateClipDuration()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={jumpToStartFrame}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: 'var(--bg-tertiary)', 
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)'
                            }}
                            title="跳转到起始帧"
                          >
                            <Rewind className="w-3 h-3" />
                            起始帧
                          </button>
                          <button
                            onClick={jumpToEndFrame}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: 'var(--bg-tertiary)', 
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)'
                            }}
                            title="跳转到末尾帧"
                          >
                            <FastForward className="w-3 h-3" />
                            末尾帧
                          </button>
                          <div className="w-px h-4" style={{ backgroundColor: 'var(--border-color)' }} />
                          <button
                            onClick={() => setSelectMode('start')}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: selectMode === 'start' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)', 
                              color: selectMode === 'start' ? 'var(--primary-color)' : 'var(--text-secondary)',
                              border: `1px solid ${selectMode === 'start' ? 'var(--primary-color)' : 'var(--border-color)'}`
                            }}
                            title="选择起始时间模式"
                          >
                            <SkipBack className="w-3 h-3" />
                            起始
                          </button>
                          <button
                            onClick={() => setSelectMode('end')}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: selectMode === 'end' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)', 
                              color: selectMode === 'end' ? 'var(--primary-color)' : 'var(--text-secondary)',
                              border: `1px solid ${selectMode === 'end' ? 'var(--primary-color)' : 'var(--border-color)'}`
                            }}
                            title="选择结束时间模式"
                          >
                            <SkipForward className="w-3 h-3" />
                            末尾
                          </button>
                          <button
                            onClick={() => setIsInverseMode(!isInverseMode)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 hover:scale-105"
                            style={{ 
                              backgroundColor: isInverseMode ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)', 
                              color: isInverseMode ? 'var(--error-color)' : 'var(--text-secondary)',
                              border: `1px solid ${isInverseMode ? 'var(--error-color)' : 'var(--border-color)'}`
                            }}
                            title={isInverseMode ? '反选模式：删除选中区域' : '正常模式：保留选中区域'}
                          >
                            <SwitchCamera className="w-3 h-3" />
                            {isInverseMode ? '反选' : '正选'}
                          </button>
                          <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-tertiary)' }}>
                            {secondsToTime(currentTime)} / {formatDuration(currentVideo.duration)}
                          </span>
                        </div>
                      </div>
                      
                      <div 
                        ref={timelineRef}
                        className="relative h-12 rounded-lg overflow-hidden cursor-crosshair select-none"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        onMouseDown={handleTimelineMouseDown}
                      >
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(59, 130, 246, 0.1) 100%)'
                          }}
                        />
                        
                        <div className="absolute inset-0 flex items-center px-2">
                          <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${(currentTime / currentVideo.duration) * 100}%`,
                                backgroundColor: 'var(--primary-color)'
                              }}
                            />
                          </div>
                        </div>
                        
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-blue-500 rounded-full"
                          style={{ 
                            left: `${(currentTime / currentVideo.duration) * 100}%`,
                            transform: 'translateX(-50%)',
                            boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)'
                          }}
                        />
                        
                        {!isInverseMode ? (
                          <>
                            {parseTimeToSeconds(startTime) > 0 && (
                              <div 
                                className="absolute top-0 bottom-0 bg-blue-500/20 border-l-2 border-blue-500"
                                style={{ left: '0%', width: `${(parseTimeToSeconds(startTime) / currentVideo.duration) * 100}%` }}
                              />
                            )}
                            
                            {parseTimeToSeconds(endTime) > 0 && (
                              <div 
                                className="absolute top-0 bottom-0 bg-blue-500/20 border-r-2 border-blue-500"
                                style={{ right: '0%', width: `${((currentVideo.duration - parseTimeToSeconds(endTime)) / currentVideo.duration) * 100}%` }}
                              />
                            )}
                          </>
                        ) : (
                          <>
                            {parseTimeToSeconds(startTime) > 0 && parseTimeToSeconds(endTime) > 0 && parseTimeToSeconds(startTime) < parseTimeToSeconds(endTime) && (
                              <div 
                                className="absolute top-0 bottom-0 bg-red-500/30 border-x-2 border-red-500"
                                style={{ 
                                  left: `${(parseTimeToSeconds(startTime) / currentVideo.duration) * 100}%`, 
                                  width: `${((parseTimeToSeconds(endTime) - parseTimeToSeconds(startTime)) / currentVideo.duration) * 100}%` 
                                }}
                              />
                            )}
                            {parseTimeToSeconds(startTime) > 0 && parseTimeToSeconds(endTime) > 0 && parseTimeToSeconds(startTime) >= parseTimeToSeconds(endTime) && (
                              <>
                                <div 
                                  className="absolute top-0 bottom-0 bg-red-500/30 border-l-2 border-r-2 border-red-500"
                                  style={{ 
                                    left: '0%', 
                                    width: `${(parseTimeToSeconds(endTime) / currentVideo.duration) * 100}%` 
                                  }}
                                />
                                <div 
                                  className="absolute top-0 bottom-0 bg-red-500/30 border-l-2 border-r-2 border-red-500"
                                  style={{ 
                                    left: `${(parseTimeToSeconds(startTime) / currentVideo.duration) * 100}%`, 
                                    width: `${((currentVideo.duration - parseTimeToSeconds(startTime)) / currentVideo.duration) * 100}%` 
                                  }}
                                />
                              </>
                            )}
                          </>
                        )}
                        
                        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
                          <span>00:00:00</span>
                          <span>{formatDuration(currentVideo.duration)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div 
              className={`flex-1 rounded-xl flex flex-col items-center justify-center transition-all ${isDragOver ? 'ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)', border: isDragOver ? '2px dashed var(--primary-color)' : '1px solid var(--border-color)' }}
            >
              {isDragOver ? (
                <>
                  <Upload className="w-16 h-16 mb-4" style={{ color: 'var(--primary-color)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--primary-color)' }}>释放文件以导入</p>
                </>
              ) : (
                <>
                  <MonitorPlay className="w-16 h-16 mb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>请先导入视频文件</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>支持拖拽到此处或左侧区域</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            {renderSettings()}
          </div>
          
          {currentVideo && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <button
                onClick={() => setVideoInfoExpanded(!videoInfoExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 transition-all hover:brightness-[0.98]"
                style={{ backgroundColor: videoInfoExpanded ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频信息</span>
                </div>
                {videoInfoExpanded ? (
                  <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                )}
              </button>
              
              <AnimatePresence>
                {videoInfoExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-1 space-y-3">
                      <div className="pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex items-center gap-1 mb-2">
                              <Video className="w-3 h-3" style={{ color: 'var(--primary-color)' }} />
                              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>视频流</span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>分辨率</span>
                                <span style={{ color: 'var(--text-primary)' }}>{currentVideo.width}x{currentVideo.height}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>编码</span>
                                <span style={{ color: 'var(--text-primary)' }}>{currentVideo.codec || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>帧率</span>
                                <span style={{ color: 'var(--text-primary)' }}>{currentVideo.fps ? currentVideo.fps.toFixed(2) : 'N/A'} fps</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span style={{ color: 'var(--text-tertiary)' }}>码率</span>
                                <div className="flex items-center gap-1.5">
                                  <span style={{ color: 'var(--text-primary)' }}>{formatBitrate(currentVideo.bitrate)}</span>
                                  {formatBitrateAlt(currentVideo.bitrate) && (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>({formatBitrateAlt(currentVideo.bitrate)})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                            <div className="flex items-center gap-1 mb-2">
                              <Music className="w-3 h-3" style={{ color: 'var(--success-color)' }} />
                              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>音频流</span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>编码</span>
                                <span style={{ color: 'var(--text-primary)' }}>{currentVideo.audioCodec || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>采样率</span>
                                <span style={{ color: 'var(--text-primary)' }}>{formatSampleRate(currentVideo.audioSampleRate)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-tertiary)' }}>声道</span>
                                <span style={{ color: 'var(--text-primary)' }}>{currentVideo.audioChannels || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span style={{ color: 'var(--text-tertiary)' }}>码率</span>
                                <div className="flex items-center gap-1.5">
                                  <span style={{ color: 'var(--text-primary)' }}>{formatBitrate(currentVideo.audioBitrate)}</span>
                                  {formatBitrateAlt(currentVideo.audioBitrate) && (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>({formatBitrateAlt(currentVideo.audioBitrate)})</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="flex items-center gap-1 mb-2">
                          <FileType className="w-3 h-3" style={{ color: 'var(--warning-color)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>文件信息</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between items-start gap-2">
                            <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>文件名</span>
                            <span className="text-right break-all" title={currentVideo.name} style={{ color: 'var(--text-primary)' }}>{currentVideo.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-tertiary)' }}>大小</span>
                            <span style={{ color: 'var(--text-primary)' }}>{formatSize(currentVideo.size)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-tertiary)' }}>格式</span>
                            <span style={{ color: 'var(--text-primary)' }}>{currentVideo.format || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-tertiary)' }}>时长</span>
                            <span style={{ color: 'var(--text-primary)' }}>{formatDuration(currentVideo.duration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFullscreen && (currentFrame || currentVideo?.thumbnail) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="absolute -top-10 left-0 right-0 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{currentVideo?.name}</span>
              </div>
              <img 
                src={currentFrame || currentVideo?.thumbnail} 
                alt="视频预览" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-300"
                style={{ 
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
                }}
              />
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute -top-3 -right-3 p-2 rounded-full transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
              </button>
            </motion.div>
            <div className="absolute bottom-4 left-0 right-0 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              点击任意处关闭
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
