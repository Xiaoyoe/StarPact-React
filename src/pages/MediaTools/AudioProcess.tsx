import { useState, useEffect, useCallback } from 'react';
import { 
  Music, Volume2, AudioLines, FileAudio, Disc3, 
  Upload, ChevronDown, ChevronRight, Sparkles, Info, 
  Play, Pause, SkipBack, SkipForward, Waves, AlertCircle, Square, FileType, X, Maximize2, Image as ImageIcon
} from 'lucide-react';
import { SectionCard, FileDropZone, FormRow, Toggle, Slider, Tabs, ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegRendererService, type MediaInfo } from '@/services/ffmpeg/FFmpegRendererService';
import { useFFmpegStore } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

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
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ backgroundColor: isOpen ? 'var(--bg-tertiary)' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--success-color)' }}>{icon}</span>
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

function WaveformPreview({ mediaInfo }: { mediaInfo?: MediaInfo }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>波形预览</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <SkipBack className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button className="p-1.5 rounded-md transition-colors" style={{ backgroundColor: 'var(--success-color)' }}>
            <Play className="w-3.5 h-3.5" style={{ color: 'white' }} />
          </button>
          <button className="p-1.5 rounded-md transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <SkipForward className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
      <div 
        className="h-20 rounded-lg flex items-center justify-center overflow-hidden relative"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-px h-full px-2">
          {Array.from({ length: 100 }).map((_, i) => (
            <div 
              key={i} 
              className="w-1 rounded-full transition-all" 
              style={{ 
                height: `${15 + Math.sin(i * 0.25) * 35 + Math.random() * 15}%`, 
                backgroundColor: i === 45 ? 'var(--success-color)' : 'rgba(16, 185, 129, 0.3)' 
              }} 
            />
          ))}
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5" style={{ backgroundColor: 'var(--success-color)' }} />
        <div className="absolute bottom-2 left-3 text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>00:00:00</div>
        <div className="absolute bottom-2 right-3 text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {mediaInfo ? formatDuration(mediaInfo.duration) : '00:00:00'}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          采样率: {mediaInfo?.audio?.sampleRate ? `${(mediaInfo.audio.sampleRate / 1000).toFixed(1)}kHz` : '44.1kHz'}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>|</span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          声道: {mediaInfo?.audio?.channels === 1 ? '单声道' : mediaInfo?.audio?.channels === 2 ? '立体声' : '立体声'}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>|</span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          时长: {mediaInfo ? formatDuration(mediaInfo.duration) : '--:--'}
        </span>
      </div>
    </div>
  );
}

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

export function AudioProcess() {
  const [tab, setTab] = useState('extract');
  const [audioFormat, setAudioFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState(192);
  const [sampleRate, setSampleRate] = useState('44100');
  const [volume, setVolume] = useState(100);
  const [normalize, setNormalize] = useState(false);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [bassBoost, setBassBoost] = useState(0);
  const [trebleBoost, setTrebleBoost] = useState(0);
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('');
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [mainFileIndex, setMainFileIndex] = useState(0);
  const [customFileName, setCustomFileName] = useState('');
  const [dropZoneKey, setDropZoneKey] = useState(0);
  const [showVideoThumbnail, setShowVideoThumbnail] = useState(true);
  const [showFullscreen, setShowFullscreen] = useState(false);
  
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
  }, []);

  const loadMainFileInfo = useCallback(async (files: InputFile[], index: number) => {
    if (files.length > index && files[index].path) {
      const mediaInfo = await ffmpegRendererService.getMediaInfo(files[index].path);
      if (mediaInfo) {
        setInputFiles(prev => prev.map((f, i) => i === index ? { ...f, mediaInfo } : f));
        
        if (showVideoThumbnail && mediaInfo.video) {
          const thumbnail = await ffmpegRendererService.getVideoFrame(files[index].path, 0);
          if (thumbnail) {
            setInputFiles(prev => prev.map((f, i) => i === index ? { ...f, thumbnail } : f));
          }
        }
      }
    }
  }, [showVideoThumbnail]);

  const selectMainFile = async (index: number) => {
    setMainFileIndex(index);
    setCustomFileName('');
    loadMainFileInfo(inputFiles, index);
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
    const extension = audioFormat.toLowerCase();
    const sep = outputDir.includes('\\') ? '\\' : '/';
    
    const finalName = customName && customName.trim() ? customName.trim() : `${inputName}_audio`;
    
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
      toast.error('请先选择要处理的文件');
      return;
    }

    const baseOutputPath = getOutputFilePath(mainFile, customFileName);
    const outputFilePath = generateUniquePath(baseOutputPath);
    const taskId = startTask('audioProcess', mainFile.name, mainFile.path, outputFilePath);

    addTaskLog(taskId, '[info] FFmpeg Studio - 音频处理模块');
    addTaskLog(taskId, `[info] 模式: ${tab === 'extract' ? '提取音频' : tab === 'adjust' ? '音频调节' : tab === 'mix' ? '音频混合' : '音效处理'}`);

    try {
      const args = ffmpegRendererService.buildAudioExtractArgs(
        mainFile.path,
        outputFilePath,
        {
          format: audioFormat,
          bitrate,
          sampleRate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          volume,
          normalize,
          fadeIn: fadeIn > 0 ? fadeIn : undefined,
          fadeOut: fadeOut > 0 ? fadeOut : undefined,
        }
      );

      const duration = mainFile.mediaInfo?.duration;
      const result = await ffmpegRendererService.executeWithProgress(args, duration, taskId);

      completeTask(taskId, result.success, result.error);
      if (result.success) {
        toast.success('处理完成！');
      } else {
        toast.error('处理失败');
      }
    } catch (error) {
      completeTask(taskId, false, error instanceof Error ? error.message : '未知错误');
      toast.error('处理失败');
    }
  };

  const handleStop = async () => {
    const moduleTasks = tasks.filter(t => t.module === 'audioProcess' && activeTaskIds.has(t.id));
    if (moduleTasks.length > 0) {
      await stopTask(moduleTasks[0].id);
      toast.info('已停止处理');
    }
  };

  const currentModuleTask = tasks.find(t => t.module === 'audioProcess' && activeTaskIds.has(t.id));
  const isCurrentModuleProcessing = !!currentModuleTask;

  const mainFile = inputFiles.length > mainFileIndex ? inputFiles[mainFileIndex] : null;
  const hasThumbnail = showVideoThumbnail && mainFile && mainFile.thumbnail;

  const renderSettings = () => {
    switch (tab) {
      case 'extract':
        return (
          <CollapsibleSection title="提取设置" icon={<FileAudio className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-4">
              <FormRow label="输出格式">
                <select 
                  className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  value={audioFormat}
                  onChange={e => setAudioFormat(e.target.value)}
                >
                  {['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'OPUS', 'M4A', 'WMA'].map(f => <option key={f}>{f}</option>)}
                </select>
              </FormRow>
              <Slider label="比特率" value={bitrate} onChange={setBitrate} min={64} max={512} suffix=" kbps" />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="开始时间">
                <input 
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                />
              </FormRow>
              <FormRow label="结束时间 (留空=全部)">
                <input 
                  className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" 
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                  placeholder="可选" 
                />
              </FormRow>
            </div>
          </CollapsibleSection>
        );
      case 'adjust':
        return (
          <CollapsibleSection title="音量调节" icon={<Volume2 className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <Slider label="音量" value={volume} onChange={setVolume} min={0} max={500} suffix="%" />
              <div className="flex items-end">
                <Toggle checked={normalize} onChange={setNormalize} label="音量标准化 (loudnorm)" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Slider label="淡入时长" value={fadeIn} onChange={setFadeIn} max={30} suffix="s" />
              <Slider label="淡出时长" value={fadeOut} onChange={setFadeOut} max={30} suffix="s" />
            </div>
          </CollapsibleSection>
        );
      case 'mix':
        return (
          <CollapsibleSection title="混合参数" icon={<Disc3 className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-4">
              <FormRow label="混合模式">
                <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <option>叠加混合 (amix)</option>
                  <option>拼接合并 (concat)</option>
                  <option>交叉淡化 (acrossfade)</option>
                </select>
              </FormRow>
              <Slider label="主音轨音量" value={100} onChange={() => {}} suffix="%" />
              <Slider label="副音轨音量" value={50} onChange={() => {}} suffix="%" />
            </div>
            <FormRow label="交叉淡化时长">
              <input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="2" />
            </FormRow>
          </CollapsibleSection>
        );
      case 'effects':
        return (
          <>
            <CollapsibleSection title="音效处理" icon={<AudioLines className="w-4 h-4" />}>
              <div className="grid grid-cols-2 gap-4">
                <Slider label="低音增强" value={bassBoost} onChange={setBassBoost} max={20} suffix="dB" />
                <Slider label="高音增强" value={trebleBoost} onChange={setTrebleBoost} max={20} suffix="dB" />
              </div>
              <Toggle checked={noiseReduction} onChange={setNoiseReduction} label="降噪 (afftdn)" />
            </CollapsibleSection>
            <CollapsibleSection title="均衡器 & 效果" icon={<Music className="w-4 h-4" />} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <FormRow label="均衡器预设">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>无</option>
                    <option>流行</option>
                    <option>摇滚</option>
                    <option>古典</option>
                    <option>爵士</option>
                    <option>电子</option>
                    <option>人声增强</option>
                  </select>
                </FormRow>
                <FormRow label="回声效果">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>无</option>
                    <option>小房间</option>
                    <option>大厅</option>
                    <option>教堂</option>
                    <option>洞穴</option>
                  </select>
                </FormRow>
              </div>
            </CollapsibleSection>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5" style={{ color: 'var(--success-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>音频处理</h2>
          <Badge color="green">专业</Badge>
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
            { key: 'extract', label: '提取音频', icon: <FileAudio className="w-3.5 h-3.5" /> },
            { key: 'adjust', label: '音量调节', icon: <Volume2 className="w-3.5 h-3.5" /> },
            { key: 'mix', label: '音频混合', icon: <Disc3 className="w-3.5 h-3.5" /> },
            { key: 'effects', label: '音效处理', icon: <AudioLines className="w-3.5 h-3.5" /> },
          ]}
          active={tab}
          onChange={setTab}
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
                  <FileType className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)' }}>
                    {inputFiles.length}
                  </span>
                </div>
                <button
                  onClick={clearAllFiles}
                  className="text-xs px-2 py-1 rounded-md transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--error-color)' }}
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
                      backgroundColor: mainFileIndex === i ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                      border: mainFileIndex === i ? '1px solid var(--success-color)' : '1px solid transparent'
                    }}
                    onClick={() => selectMainFile(i)}
                  >
                    {mainFileIndex === i && (
                      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--success-color)' }} />
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
              <Upload className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件导入</span>
            </div>
            <FileDropZone
              key={dropZoneKey}
              accept="video/*,audio/*"
              multiple
              label="拖拽视频/音频文件"
              onFiles={handleFilesSelected}
            />
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileAudio className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
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
                .{audioFormat.toLowerCase()}
              </span>
            </div>
          </div>

          {tab === 'mix' && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Disc3 className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>混合文件</span>
              </div>
              <FileDropZone accept="audio/*" multiple label="拖拽要混合的音频" />
            </div>
          )}

          <WaveformPreview mediaInfo={mainFile?.mediaInfo} />

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>快速预设</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: '高质量', desc: '320kbps MP3', bitrate: 320, format: 'MP3' },
                { name: '标准', desc: '192kbps MP3', bitrate: 192, format: 'MP3' },
                { name: '无损', desc: 'FLAC 格式', bitrate: 0, format: 'FLAC' },
                { name: '兼容', desc: 'AAC 格式', bitrate: 192, format: 'AAC' },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setBitrate(p.bitrate || 192); setAudioFormat(p.format); }}
                  className="p-2 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: audioFormat === p.format && (p.bitrate === 0 || bitrate === p.bitrate) ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${audioFormat === p.format && (p.bitrate === 0 || bitrate === p.bitrate) ? 'var(--success-color)' : 'transparent'}`,
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-3">
          {mainFile && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--success-color)' }}
            >
              <div className="flex">
                {hasThumbnail && (
                  <div 
                    className="relative w-48 h-32 flex-shrink-0 cursor-pointer group"
                    onClick={() => setShowFullscreen(true)}
                  >
                    <img 
                      src={mainFile.thumbnail!} 
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
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>主文件</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{mainFile.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{(mainFile.size / 1024 / 1024).toFixed(1)} MB</span>
                      {mainFile.mediaInfo?.audio && (
                        <>
                          <span>{mainFile.mediaInfo.audio.codec}</span>
                          <span>{mainFile.mediaInfo.audio.sampleRate ? `${(mainFile.mediaInfo.audio.sampleRate / 1000).toFixed(1)}kHz` : ''}</span>
                        </>
                      )}
                      {mainFile.mediaInfo && (
                        <span>{mainFile.mediaInfo.duration?.toFixed(1)}s</span>
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
              backgroundColor: isCurrentModuleProcessing ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', 
              border: `1px solid ${isCurrentModuleProcessing ? 'var(--success-color)' : 'var(--border-color)'}`,
              transition: 'all 0.3s ease'
            }}
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={isCurrentModuleProcessing ? handleStop : handleStart} 
                disabled={!isConfigured || !isElectronEnv}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-lg"
                style={{ 
                  background: isCurrentModuleProcessing 
                    ? 'linear-gradient(135deg, var(--error-color), #ef4444)' 
                    : 'linear-gradient(135deg, var(--success-color), #10b981)',
                  boxShadow: isCurrentModuleProcessing 
                    ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                    : '0 4px 15px rgba(16, 185, 129, 0.4)'
                }}
              >
                {isCurrentModuleProcessing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isCurrentModuleProcessing ? '停止处理' : '开始处理'}
              </button>
              {isCurrentModuleProcessing && currentModuleTask && (
                <div className="flex-1">
                  <ProgressBar value={Math.floor(currentModuleTask.progress)} label="处理进度" />
                </div>
              )}
              {!isCurrentModuleProcessing && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <Info className="w-3.5 h-3.5" />
                  <span>选择文件后点击开始处理</span>
                </div>
              )}
            </div>
            {isCurrentModuleProcessing && currentModuleTask && currentModuleTask.logs.length > 0 && (
              <div className="mt-3">
                <Terminal lines={currentModuleTask.logs} />
              </div>
            )}
          </div>

          {renderSettings()}
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
                src={mainFile!.thumbnail!} 
                alt="视频预览" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setShowFullscreen(false)}
                className="absolute -top-3 -right-3 p-2 rounded-full transition-all"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
              </button>
              <div 
                className="absolute -bottom-12 left-0 right-0 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{mainFile?.name}</span>
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
