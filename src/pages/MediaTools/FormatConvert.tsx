import { useState, useEffect, useCallback } from 'react';
import { 
  FileType, Settings, Gauge, Film, Music2, MonitorPlay, 
  Upload, ChevronDown, ChevronRight, Sparkles, Info,
  AlertCircle, Square, Play, Zap, Image as ImageIcon, Eye, EyeOff, X, Maximize2
} from 'lucide-react';
import { SectionCard, FileDropZone, FormRow, Toggle, Slider, Tabs, ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegRendererService, type MediaInfo } from '@/services/ffmpeg/FFmpegRendererService';
import { useFFmpegStore } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

const videoFormats = ['MP4', 'AVI', 'MKV', 'MOV', 'WebM', 'FLV', 'WMV', 'MPEG', 'TS', '3GP', 'OGV'];
const audioFormats = ['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'WMA', 'OPUS', 'AC3', 'AIFF', 'M4A'];
const videoCodecs = ['H.264 (libx264)', 'H.265 (libx265)', 'VP9', 'VP8', 'AV1 (libaom)', 'ProRes', 'MPEG-4', 'copy (不转码)'];
const audioCodecs = ['AAC', 'MP3 (libmp3lame)', 'Opus', 'Vorbis', 'FLAC', 'PCM', 'AC3', 'copy (不转码)'];
const presets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];
const pixFmts = ['yuv420p', 'yuv422p', 'yuv444p', 'yuv420p10le', 'rgb24', 'auto'];
const resolutions = ['原始', '3840x2160 (4K)', '2560x1440 (2K)', '1920x1080 (1080p)', '1280x720 (720p)', '854x480 (480p)', '640x360 (360p)', '自定义'];

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
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

export function FormatConvert() {
  const [mode, setMode] = useState('video');
  const [targetFormat, setTargetFormat] = useState('MP4');
  const [vCodec, setVCodec] = useState('H.264 (libx264)');
  const [aCodec, setACodec] = useState('AAC');
  const [preset, setPreset] = useState('medium');
  const [crf, setCrf] = useState(23);
  const [resolution, setResolution] = useState('原始');
  const [fps, setFps] = useState(30);
  const [changeFps, setChangeFps] = useState(false);
  const [audioBitrate, setAudioBitrate] = useState(192);
  const [sampleRate, setSampleRate] = useState('44100');
  const [channels, setChannels] = useState('2');
  const [pixFmt, setPixFmt] = useState('yuv420p');
  const [hwAccel, setHwAccel] = useState(false);
  const [twoPass, setTwoPass] = useState(false);
  const [fastStart, setFastStart] = useState(true);
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [mainFileIndex, setMainFileIndex] = useState(0);
  const [customFileName, setCustomFileName] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showVideoThumbnail, setShowVideoThumbnail] = useState(true);
  const [dropZoneKey, setDropZoneKey] = useState(0);
  
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
  } = useFFmpegStore();
  
  const toast = useToast();

  const formats = mode === 'video' ? videoFormats : audioFormats;

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  useEffect(() => {
    const loadThumbnailSetting = async () => {
      await ffmpegConfigStorage.ready();
      setShowVideoThumbnail(ffmpegConfigStorage.getShowVideoThumbnail());
    };
    loadThumbnailSetting();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFullscreen) {
        setShowFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const inputFilesData: InputFile[] = files.map(file => ({
      file,
      path: (file as any).path || file.name,
      name: file.name,
      size: file.size,
    }));

    setInputFiles(inputFilesData);
    setMainFileIndex(0);
    setCustomFileName('');

    await loadMainFileInfo(inputFilesData, 0);
  }, [mode]);

  const loadMainFileInfo = useCallback(async (files: InputFile[], index: number) => {
    if (files.length > index && files[index].path) {
      const mediaInfo = await ffmpegRendererService.getMediaInfo(files[index].path);
      if (mediaInfo) {
        setInputFiles(prev => prev.map((f, i) => i === index ? { ...f, mediaInfo } : f));
        
        if (showVideoThumbnail && mode === 'video' && mediaInfo.video) {
          const thumbnail = await ffmpegRendererService.getVideoFrame(files[index].path, 0);
          if (thumbnail) {
            setInputFiles(prev => prev.map((f, i) => i === index ? { ...f, thumbnail } : f));
            setShowPreview(true);
          }
        }
      }
    }
  }, [mode, showVideoThumbnail]);

  const selectMainFile = async (index: number) => {
    setMainFileIndex(index);
    setCustomFileName('');
    loadMainFileInfo(inputFiles, index);
  };

  const removeFile = (index: number) => {
    setInputFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setInputFiles([]);
    setMainFileIndex(0);
    setCustomFileName('');
    setDropZoneKey(prev => prev + 1);
  };

  const getOutputFilePath = (inputFile: InputFile, customName?: string): string => {
    const inputPath = inputFile.path;
    const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
    const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
    const lastDotIndex = inputFile.name.lastIndexOf('.');
    const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
    
    const outputDir = outputPath || inputDir;
    const extension = targetFormat.toLowerCase();
    const sep = outputDir.includes('\\') ? '\\' : '/';
    
    const finalName = customName && customName.trim() ? customName.trim() : `${inputName}_converted`;
    
    return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
  };

  const handleStart = async () => {
    if (!isElectronEnv) {
      toast.error('请使用 Electron 模式运行此功能（运行 npm run electron:dev）');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    if (inputFiles.length === 0 || !mainFile) {
      toast.error('请先选择要转换的文件');
      return;
    }

    const baseOutputPath = getOutputFilePath(mainFile, customFileName);
    const outputFilePath = generateUniquePath(baseOutputPath);
    const taskId = startTask('formatConvert', mainFile.name, mainFile.path, outputFilePath);

    addTaskLog(taskId, '[info] FFmpeg Studio v1.0 - 格式转换模块');
    addTaskLog(taskId, `[info] 目标格式: ${targetFormat}`);
    addTaskLog(taskId, `[info] 视频编码: ${vCodec} | 音频编码: ${aCodec}`);
    addTaskLog(taskId, `[info] 预设: ${preset} | CRF: ${crf}`);
    addTaskLog(taskId, `[info] 分辨率: ${resolution} | 像素格式: ${pixFmt}`);
    if (hwAccel) addTaskLog(taskId, '[info] 硬件加速: 已启用 (NVENC/QSV)');
    if (twoPass) addTaskLog(taskId, '[info] 二次编码: 已启用');

    try {
      const args = ffmpegRendererService.buildConvertArgs(
        mainFile.path,
        outputFilePath,
        {
          videoCodec: vCodec,
          audioCodec: aCodec,
          preset,
          crf,
          resolution,
          fps: changeFps ? fps : undefined,
          audioBitrate,
          sampleRate,
          channels,
          pixFmt,
          hwAccel,
          twoPass,
          fastStart,
        }
      );

      const duration = mainFile.mediaInfo?.duration;
      const result = await ffmpegRendererService.executeWithProgress(args, duration, taskId);

      completeTask(taskId, result.success, result.error);
      if (result.success) {
        toast.success('转换完成！');
      } else {
        toast.error('转换失败');
      }
    } catch (error) {
      completeTask(taskId, false, error instanceof Error ? error.message : '未知错误');
      toast.error('转换失败');
    }
  };

  const handleStop = async () => {
    const moduleTasks = tasks.filter(t => t.module === 'formatConvert' && activeTaskIds.has(t.id));
    if (moduleTasks.length > 0) {
      await stopTask(moduleTasks[0].id);
      toast.info('已停止处理');
    }
  };

  const currentModuleTask = tasks.find(t => t.module === 'formatConvert' && activeTaskIds.has(t.id));
  const isCurrentModuleProcessing = !!currentModuleTask;

  const mainFile = inputFiles.length > mainFileIndex ? inputFiles[mainFileIndex] : null;
  const hasThumbnail = showVideoThumbnail && mainFile && mainFile.thumbnail;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileType className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>格式转换</h2>
          <Badge color="blue">全格式</Badge>
          {isCurrentModuleProcessing && (
            <Badge color="green">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                处理中
              </span>
            </Badge>
          )}
        </div>
        <Tabs
          tabs={[
            { key: 'video', label: '视频转换', icon: <Film className="w-3.5 h-3.5" /> },
            { key: 'audio', label: '音频转换', icon: <Music2 className="w-3.5 h-3.5" /> },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {!isElectronEnv && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-yellow-600">请使用 Electron 模式运行此功能（运行 <code className="px-1 py-0.5 rounded bg-yellow-100">npm run electron:dev</code>）</span>
        </div>
      )}

      {isElectronEnv && !isConfigured && (
        <div 
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-600">请先在右上角配置按钮中设置 FFmpeg bin 目录</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 space-y-4">
          {inputFiles.length > 0 && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileType className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
                    {inputFiles.length}
                  </span>
                </div>
                <button
                  onClick={clearAllFiles}
                  className="text-xs px-2 py-1 rounded-md transition-all duration-200 hover:scale-105"
                  style={{ backgroundColor: 'var(--error-light)', color: 'var(--error-color)' }}
                >
                  清空
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {inputFiles.map((f, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer"
                    style={{ 
                      backgroundColor: mainFileIndex === i ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                      border: mainFileIndex === i ? '1px solid var(--primary-color)' : '1px solid transparent'
                    }}
                    onClick={() => selectMainFile(i)}
                  >
                    {mainFileIndex === i && (
                      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                    )}
                    <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                    <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                点击文件可设为主文件
              </div>
            </div>
          )}

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件导入</span>
            </div>
            <FileDropZone
              key={dropZoneKey}
              accept={mode === 'video' ? 'video/*' : 'audio/*'}
              multiple
              label={mode === 'video' ? '拖拽视频文件' : '拖拽音频文件'}
              onFiles={handleFilesSelected}
            />
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileType className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
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
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
              >
                .{targetFormat.toLowerCase()}
              </span>
            </div>
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileType className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输出格式</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {formats.map((f) => (
                <button
                  key={f}
                  onClick={() => setTargetFormat(f)}
                  className="px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:scale-105 text-center"
                  style={{
                    backgroundColor: targetFormat === f ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    color: targetFormat === f ? 'var(--primary-color)' : 'var(--text-secondary)',
                    border: `1px solid ${targetFormat === f ? 'var(--primary-color)' : 'transparent'}`,
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-3">
          {mainFile && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--primary-color)' }}
            >
              <div className="flex">
                {hasThumbnail && (
                  <div 
                    className="relative w-48 h-32 flex-shrink-0 cursor-pointer group"
                    onClick={() => setShowFullscreen(true)}
                  >
                    <img 
                      src={mainFile.thumbnail} 
                      alt="视频预览" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div 
                      className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white' }}
                    >
                      {mainFile.mediaInfo?.video?.width}x{mainFile.mediaInfo?.video?.height}
                    </div>
                  </div>
                )}
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>主文件</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{mainFile.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{(mainFile.size / 1024 / 1024).toFixed(1)} MB</span>
                      {mainFile.mediaInfo?.video && (
                        <>
                          <span>{mainFile.mediaInfo.video.codec}</span>
                          <span>{mainFile.mediaInfo.video.fps?.toFixed(1)} fps</span>
                          <span>{mainFile.mediaInfo.duration?.toFixed(1)}s</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div 
            className="rounded-xl p-4"
            style={{ 
              backgroundColor: isCurrentModuleProcessing ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-secondary)', 
              border: `1px solid ${isCurrentModuleProcessing ? '#06b6d4' : 'var(--border-color)'}`,
              transition: 'all 0.3s ease'
            }}
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={isCurrentModuleProcessing ? handleStop : handleStart} 
                disabled={!isConfigured || !isElectronEnv}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 hover:scale-105 shadow-lg"
                style={{ 
                  background: isCurrentModuleProcessing 
                    ? 'linear-gradient(135deg, var(--error-color), #ef4444)' 
                    : 'linear-gradient(135deg, #0891b2, #06b6d4)',
                  boxShadow: isCurrentModuleProcessing 
                    ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                    : '0 2px 8px rgba(6, 182, 212, 0.2)'
                }}
              >
                {isCurrentModuleProcessing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isCurrentModuleProcessing ? '停止转换' : '开始转换'}
              </button>
              {isCurrentModuleProcessing && currentModuleTask && (
                <div className="flex-1">
                  <ProgressBar value={Math.floor(currentModuleTask.progress)} label="转换进度" />
                </div>
              )}
              {!isCurrentModuleProcessing && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <Info className="w-3.5 h-3.5" />
                  <span>选择文件后点击开始转换</span>
                </div>
              )}
            </div>
            {isCurrentModuleProcessing && currentModuleTask && currentModuleTask.logs.length > 0 && (
              <div className="mt-3">
                <Terminal lines={currentModuleTask.logs} />
              </div>
            )}
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>快速预设</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: '高质量', desc: '大文件，最佳画质', crf: 18, preset: 'slow' },
                { name: '均衡', desc: '画质体积平衡', crf: 23, preset: 'medium' },
                { name: '压缩', desc: '小文件，较快速度', crf: 28, preset: 'fast' },
                { name: '极速', desc: '最快速度，较大文件', crf: 23, preset: 'ultrafast' },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setCrf(p.crf); setPreset(p.preset); }}
                  className="p-3 rounded-lg text-left transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: crf === p.crf && preset === p.preset ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    border: `1px solid ${crf === p.crf && preset === p.preset ? 'var(--primary-color)' : 'transparent'}`,
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <CollapsibleSection title="编码设置" icon={<Settings className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-4">
              <FormRow label="视频编码器">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={vCodec} 
                  onChange={e => setVCodec(e.target.value)}
                >
                  {videoCodecs.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormRow>
              <FormRow label="音频编码器">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={aCodec} 
                  onChange={e => setACodec(e.target.value)}
                >
                  {audioCodecs.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormRow>
              <FormRow label="编码预设">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={preset} 
                  onChange={e => setPreset(e.target.value)}
                >
                  {presets.map(p => <option key={p}>{p}</option>)}
                </select>
              </FormRow>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Slider label="CRF (质量)" value={crf} onChange={setCrf} min={0} max={51} />
              <FormRow label="像素格式">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={pixFmt} 
                  onChange={e => setPixFmt(e.target.value)}
                >
                  {pixFmts.map(p => <option key={p}>{p}</option>)}
                </select>
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="视频参数" icon={<MonitorPlay className="w-4 h-4" />} defaultOpen={mode === 'video'}>
            <div className="grid grid-cols-3 gap-4">
              <FormRow label="分辨率">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={resolution} 
                  onChange={e => setResolution(e.target.value)}
                >
                  {resolutions.map(r => <option key={r}>{r}</option>)}
                </select>
              </FormRow>
              <div className="col-span-2">
                <Toggle checked={changeFps} onChange={setChangeFps} label="修改帧率" />
                {changeFps && (
                  <div className="mt-2">
                    <Slider label="帧率 (FPS)" value={fps} onChange={setFps} min={1} max={120} suffix=" fps" />
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="音频参数" icon={<Music2 className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-4">
              <Slider label="比特率" value={audioBitrate} onChange={setAudioBitrate} min={64} max={512} suffix=" kbps" />
              <FormRow label="采样率">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={sampleRate} 
                  onChange={e => setSampleRate(e.target.value)}
                >
                  {['8000', '16000', '22050', '44100', '48000', '96000'].map(s => <option key={s}>{s} Hz</option>)}
                </select>
              </FormRow>
              <FormRow label="声道">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={channels} 
                  onChange={e => setChannels(e.target.value)}
                >
                  <option value="1">单声道</option>
                  <option value="2">立体声</option>
                  <option value="6">5.1 环绕声</option>
                  <option value="8">7.1 环绕声</option>
                </select>
              </FormRow>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="高级选项" icon={<Gauge className="w-4 h-4" />} defaultOpen={false}>
            <div className="grid grid-cols-3 gap-4">
              <Toggle checked={hwAccel} onChange={setHwAccel} label="硬件加速 (NVENC/QSV/AMF)" />
              <Toggle checked={twoPass} onChange={setTwoPass} label="二次编码 (Two-Pass)" />
              <Toggle checked={fastStart} onChange={setFastStart} label="快速启动 (moov前移)" />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <AnimatePresence>
        {showFullscreen && hasThumbnail && (
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
              <img 
                src={mainFile!.thumbnail} 
                alt="视频预览" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute -top-3 -right-3 p-2 rounded-full transition-all duration-200 hover:scale-110"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
              </button>
              <div 
                className="absolute -bottom-12 left-0 right-0 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{mainFile?.name}</span>
                <span className="mx-2">•</span>
                <span>{mainFile?.mediaInfo?.video?.width}x{mainFile?.mediaInfo?.video?.height}</span>
                <span className="mx-2">•</span>
                <span>{mainFile?.mediaInfo?.video?.codec}</span>
              </div>
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
