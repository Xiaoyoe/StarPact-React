import { useState, useEffect, useCallback } from 'react';
import { Clapperboard, Zap, Stamp, ImageIcon, Camera, AlertCircle, Square, Play, Info, FileType, Upload, Sparkles, X, Maximize2 } from 'lucide-react';
import { SectionCard, FileDropZone, FormRow, Toggle, Slider, ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegRendererService, type MediaInfo } from '@/services/ffmpeg/FFmpegRendererService';
import { useFFmpegStore } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

export function AdvancedTools() {
  const [tab, setTab] = useState('compress');
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [mainFileIndex, setMainFileIndex] = useState(0);
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
  
  const [targetSize, setTargetSize] = useState(50);
  const [compressQuality, setCompressQuality] = useState('balanced');
  const [keepAudio, setKeepAudio] = useState(true);
  
  const [wmText, setWmText] = useState('FFmpeg Studio');
  const [wmPosition, setWmPosition] = useState('bottomright');
  const [wmOpacity, setWmOpacity] = useState(80);
  const [wmSize, setWmSize] = useState(24);
  const [wmColor, setWmColor] = useState('#ffffff');
  
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [gifLoop, setGifLoop] = useState(0);
  
  const [ssMode, setSSMode] = useState('interval');
  const [ssInterval, setSSInterval] = useState(5);
  const [ssFormat, setSSFormat] = useState('PNG');
  
  const [customFileName, setCustomFileName] = useState('');

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

  const getOutputFilePath = (inputFile: InputFile, extension: string, suffix?: string, customName?: string): string => {
    const inputPath = inputFile.path;
    const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
    const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
    const lastDotIndex = inputFile.name.lastIndexOf('.');
    const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
    
    const outputDir = outputPath || inputDir;
    const sep = outputDir.includes('\\') ? '\\' : '/';
    
    const finalName = customName && customName.trim() ? customName.trim() : `${inputName}${suffix ? `_${suffix}` : ''}`;
    
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

    let outputFilePath: string;
    let args: string[];

    switch (tab) {
      case 'compress':
        outputFilePath = generateUniquePath(getOutputFilePath(mainFile, 'mp4', 'compressed', customFileName));
        args = ffmpegRendererService.buildCompressArgs(mainFile.path, outputFilePath, {
          targetSizeMB: targetSize,
          quality: compressQuality as 'quality' | 'balanced' | 'size',
          keepAudio,
        });
        break;

      case 'watermark':
        outputFilePath = generateUniquePath(getOutputFilePath(mainFile, 'mp4', 'watermarked', customFileName));
        args = ffmpegRendererService.buildWatermarkArgs(mainFile.path, outputFilePath, {
          type: 'text',
          text: wmText,
          position: wmPosition,
          opacity: wmOpacity,
          fontSize: wmSize,
          color: wmColor,
        });
        break;

      case 'gif':
        outputFilePath = generateUniquePath(getOutputFilePath(mainFile, 'gif', undefined, customFileName));
        args = ffmpegRendererService.buildGifArgs(mainFile.path, outputFilePath, {
          startTime: gifStart,
          duration: gifDuration,
          fps: gifFps,
          width: gifWidth,
          loop: gifLoop,
        });
        break;

      case 'screenshot':
        const ext = ssFormat.toLowerCase() === 'jpg' ? 'jpg' : ssFormat.toLowerCase();
        outputFilePath = generateUniquePath(getOutputFilePath(mainFile, ext, 'frame_%04d', customFileName));
        args = ffmpegRendererService.buildScreenshotArgs(mainFile.path, outputFilePath, {
          mode: ssMode as 'interval' | 'count' | 'single' | 'tile',
          interval: ssInterval,
          format: ssFormat,
        });
        break;

      default:
        toast.error('该功能暂未实现');
        return;
    }

    const taskId = startTask('advancedTools', mainFile.name, mainFile.path, outputFilePath);
    addTaskLog(taskId, `[info] FFmpeg Studio - ${tab} 模块`);
    addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${args.join(' ')}`);

    try {
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
    const moduleTasks = tasks.filter(t => t.module === 'advancedTools' && activeTaskIds.has(t.id));
    if (moduleTasks.length > 0) {
      await stopTask(moduleTasks[0].id);
      toast.info('已停止处理');
    }
  };

  const currentModuleTask = tasks.find(t => t.module === 'advancedTools' && activeTaskIds.has(t.id));
  const isCurrentModuleProcessing = !!currentModuleTask;

  const mainFile = inputFiles.length > mainFileIndex ? inputFiles[mainFileIndex] : null;
  const hasThumbnail = showVideoThumbnail && mainFile && mainFile.thumbnail;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5" style={{ color: 'var(--warning-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>高级工具</h2>
          <Badge color="warning">实用</Badge>
          {isCurrentModuleProcessing && (
            <Badge color="success">
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

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'compress', label: '视频压缩', icon: <Zap className="w-4 h-4" /> },
          { key: 'watermark', label: '添加水印', icon: <Stamp className="w-4 h-4" /> },
          { key: 'gif', label: 'GIF生成', icon: <ImageIcon className="w-4 h-4" /> },
          { key: 'screenshot', label: '视频截图', icon: <Camera className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap`}
            style={{
              backgroundColor: tab === t.key ? 'var(--primary-light)' : 'var(--bg-tertiary)',
              color: tab === t.key ? 'var(--primary-color)' : 'var(--text-secondary)',
              border: `1px solid ${tab === t.key ? 'var(--primary-color)' : 'var(--border-color)'}`,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 space-y-4">
          {inputFiles.length > 0 && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileType className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件列表</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning-color)' }}>
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
                      backgroundColor: mainFileIndex === i ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                      border: mainFileIndex === i ? '1px solid var(--warning-color)' : '1px solid transparent'
                    }}
                    onClick={() => selectMainFile(i)}
                  >
                    {mainFileIndex === i && (
                      <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--warning-color)' }} />
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
              <Upload className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>文件导入</span>
            </div>
            <FileDropZone
              key={dropZoneKey}
              accept="video/*,audio/*,image/*"
              multiple
              label="拖拽媒体文件"
              onFiles={handleFilesSelected}
            />
          </div>

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
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
                .{tab === 'gif' ? 'gif' : tab === 'screenshot' ? ssFormat.toLowerCase() : 'mp4'}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          {mainFile && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--warning-color)' }}
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
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
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
              backgroundColor: isCurrentModuleProcessing ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-secondary)', 
              border: `1px solid ${isCurrentModuleProcessing ? 'var(--warning-color)' : 'var(--border-color)'}`,
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
                    : 'linear-gradient(135deg, var(--warning-color), #f59e0b)',
                  boxShadow: isCurrentModuleProcessing 
                    ? '0 4px 15px rgba(239, 68, 68, 0.4)' 
                    : '0 4px 15px rgba(245, 158, 11, 0.4)'
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

          {tab === 'compress' && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频压缩</span>
              </div>
              <div className="space-y-3">
                <Slider label="目标大小 (MB)" value={targetSize} onChange={setTargetSize} min={1} max={500} suffix=" MB" />
                <div>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>压缩策略</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'quality', label: '画质优先', desc: '保持高画质' },
                      { key: 'balanced', label: '均衡模式', desc: '画质与体积平衡' },
                      { key: 'size', label: '体积优先', desc: '最大压缩率' },
                    ].map(s => (
                      <button key={s.key} onClick={() => setCompressQuality(s.key)} className="flex-1 p-3 rounded-lg text-left transition-all"
                        style={{
                          backgroundColor: compressQuality === s.key ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                          border: `1px solid ${compressQuality === s.key ? 'var(--warning-color)' : 'transparent'}`,
                        }}>
                        <div className="text-xs font-medium" style={{ color: compressQuality === s.key ? 'var(--warning-color)' : 'var(--text-primary)' }}>{s.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle checked={keepAudio} onChange={setKeepAudio} label="保留原始音频（不重新编码）" />
              </div>
            </div>
          )}

          {tab === 'watermark' && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Stamp className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>添加水印</span>
              </div>
              <div className="space-y-3">
                <FormRow label="水印文字">
                  <input 
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    value={wmText} onChange={e => setWmText(e.target.value)}
                  />
                </FormRow>
                <div className="grid grid-cols-3 gap-4">
                  <FormRow label="位置">
                    <select 
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      value={wmPosition} onChange={e => setWmPosition(e.target.value)}
                    >
                      <option value="topleft">左上</option>
                      <option value="topright">右上</option>
                      <option value="bottomleft">左下</option>
                      <option value="bottomright">右下</option>
                      <option value="center">居中</option>
                    </select>
                  </FormRow>
                  <Slider label="字体大小" value={wmSize} onChange={setWmSize} min={12} max={72} suffix="px" />
                  <FormRow label="颜色">
                    <input type="color" className="w-full h-9 rounded-lg cursor-pointer bg-transparent" value={wmColor} onChange={e => setWmColor(e.target.value)} />
                  </FormRow>
                </div>
                <Slider label="透明度" value={wmOpacity} onChange={setWmOpacity} suffix="%" />
              </div>
            </div>
          )}

          {tab === 'gif' && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>GIF生成</span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormRow label="开始时间">
                    <input className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={gifStart} onChange={e => setGifStart(e.target.value)} />
                  </FormRow>
                  <FormRow label="持续时长 (秒)">
                    <input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={gifDuration} onChange={e => setGifDuration(e.target.value)} />
                  </FormRow>
                </div>
                <Slider label="帧率" value={gifFps} onChange={setGifFps} min={5} max={30} suffix=" fps" />
                <Slider label="宽度" value={gifWidth} onChange={setGifWidth} min={120} max={1920} suffix=" px" />
                <FormRow label="循环次数 (0=无限)">
                  <input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} type="number" value={gifLoop} onChange={e => setGifLoop(Number(e.target.value))} />
                </FormRow>
              </div>
            </div>
          )}

          {tab === 'screenshot' && (
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>视频截图</span>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[
                    { key: 'interval', label: '按间隔截图' },
                    { key: 'count', label: '按数量截图' },
                    { key: 'single', label: '单帧截图' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setSSMode(m.key)} className="flex-1 py-2 rounded-lg text-xs transition-all"
                      style={{
                        backgroundColor: ssMode === m.key ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                        color: ssMode === m.key ? 'var(--warning-color)' : 'var(--text-secondary)',
                        border: `1px solid ${ssMode === m.key ? 'var(--warning-color)' : 'transparent'}`,
                      }}>{m.label}</button>
                  ))}
                </div>
                {ssMode === 'interval' && <Slider label="间隔 (秒)" value={ssInterval} onChange={setSSInterval} min={1} max={60} suffix="s" />}
                {ssMode === 'count' && <FormRow label="截图数量"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="10" /></FormRow>}
                {ssMode === 'single' && <FormRow label="时间点"><input className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="00:01:00" /></FormRow>}
                <FormRow label="输出格式">
                  <div className="flex gap-1.5">
                    {['PNG', 'JPG', 'BMP', 'WebP'].map(f => (
                      <button key={f} onClick={() => setSSFormat(f)} className="px-3 py-1 rounded-md text-xs transition-all"
                        style={{
                          backgroundColor: ssFormat === f ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                          color: ssFormat === f ? 'var(--warning-color)' : 'var(--text-secondary)',
                          border: `1px solid ${ssFormat === f ? 'var(--warning-color)' : 'transparent'}`,
                        }}>{f}</button>
                    ))}
                  </div>
                </FormRow>
              </div>
            </div>
          )}
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
