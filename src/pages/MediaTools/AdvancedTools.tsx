import { useState, useEffect, useCallback } from 'react';
import { Zap, Stamp, Subtitles, GitMerge, SplitSquareVertical, ImageIcon, Camera, Radio, Clapperboard, AlertCircle, Square } from 'lucide-react';
import { SectionCard, FileDropZone, FormRow, Toggle, Slider, Tabs, ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import { ffmpegRendererService, type MediaInfo } from '@/services/ffmpeg/FFmpegRendererService';
import { useFFmpegStore } from '@/stores/ffmpegStore';
import { useToast } from '@/components/Toast';

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
}

export function AdvancedTools() {
  const [tab, setTab] = useState('compress');
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  
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
  
  const [subFormat, setSubFormat] = useState('srt');
  const [subMode, setSubMode] = useState('burn');
  const [subFontSize, setSubFontSize] = useState(24);
  const [subtitlePath, setSubtitlePath] = useState('');
  
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [gifLoop, setGifLoop] = useState(0);
  
  const [ssMode, setSSMode] = useState('interval');
  const [ssInterval, setSSInterval] = useState(5);
  const [ssFormat, setSSFormat] = useState('PNG');
  
  const [streamUrl, setStreamUrl] = useState('rtmp://');
  const [streamBitrate, setStreamBitrate] = useState(2500);
  const [customFileName, setCustomFileName] = useState('');

  useEffect(() => {
    checkConfig();
  }, [checkConfig]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const inputFilesData: InputFile[] = files.map(file => ({
      file,
      path: (file as any).path || file.name,
      name: file.name,
      size: file.size,
    }));

    setInputFiles(inputFilesData);
    setCustomFileName('');

    if (inputFilesData.length > 0 && inputFilesData[0].path) {
      const mediaInfo = await ffmpegRendererService.getMediaInfo(inputFilesData[0].path);
      if (mediaInfo) {
        setInputFiles(prev => prev.map((f, i) => i === 0 ? { ...f, mediaInfo } : f));
      }
    }
  }, []);

  const handleSubtitleSelected = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSubtitlePath((files[0] as any).path || files[0].name);
    }
  }, []);

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

    if (inputFiles.length === 0) {
      toast.error('请先选择要处理的文件');
      return;
    }

    const inputFile = inputFiles[0];
    let outputFilePath: string;
    let args: string[];

    switch (tab) {
      case 'compress':
        outputFilePath = generateUniquePath(getOutputFilePath(inputFile, 'mp4', 'compressed', customFileName));
        args = ffmpegRendererService.buildCompressArgs(inputFile.path, outputFilePath, {
          targetSizeMB: targetSize,
          quality: compressQuality as 'quality' | 'balanced' | 'size',
          keepAudio,
        });
        break;

      case 'watermark':
        outputFilePath = generateUniquePath(getOutputFilePath(inputFile, 'mp4', 'watermarked', customFileName));
        args = ffmpegRendererService.buildWatermarkArgs(inputFile.path, outputFilePath, {
          type: 'text',
          text: wmText,
          position: wmPosition,
          opacity: wmOpacity,
          fontSize: wmSize,
          color: wmColor,
        });
        break;

      case 'subtitle':
        if (!subtitlePath) {
          toast.error('请先选择字幕文件');
          return;
        }
        outputFilePath = generateUniquePath(getOutputFilePath(inputFile, 'mp4', 'subtitled', customFileName));
        args = ffmpegRendererService.buildSubtitleArgs(inputFile.path, outputFilePath, {
          subtitlePath,
          mode: subMode as 'burn' | 'embed',
          fontSize: subFontSize,
        });
        break;

      case 'gif':
        outputFilePath = generateUniquePath(getOutputFilePath(inputFile, 'gif', undefined, customFileName));
        args = ffmpegRendererService.buildGifArgs(inputFile.path, outputFilePath, {
          startTime: gifStart,
          duration: gifDuration,
          fps: gifFps,
          width: gifWidth,
          loop: gifLoop,
        });
        break;

      case 'screenshot':
        const ext = ssFormat.toLowerCase();
        outputFilePath = getOutputFilePath(inputFile, ext === 'jpg' ? 'jpg' : ext, 'frame_%04d');
        args = ffmpegRendererService.buildScreenshotArgs(inputFile.path, outputFilePath, {
          mode: ssMode as 'interval' | 'count' | 'single' | 'tile',
          interval: ssInterval,
          format: ssFormat,
        });
        break;

      default:
        toast.error('该功能暂未实现');
        return;
    }

    const taskId = startTask('advancedTools', inputFile.name, inputFile.path, outputFilePath);
    addTaskLog(taskId, `[info] FFmpeg Studio - ${tab} 模块`);
    addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${args.join(' ')}`);

    try {
      const duration = inputFile.mediaInfo?.duration;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5" style={{ color: 'var(--warning-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>高级工具</h2>
          <Badge color="orange">Pro</Badge>
          {isCurrentModuleProcessing && (
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

      <Tabs
        tabs={[
          { key: 'compress', label: '压缩', icon: <Zap className="w-3.5 h-3.5" /> },
          { key: 'watermark', label: '水印', icon: <Stamp className="w-3.5 h-3.5" /> },
          { key: 'subtitle', label: '字幕', icon: <Subtitles className="w-3.5 h-3.5" /> },
          { key: 'merge', label: '合并', icon: <GitMerge className="w-3.5 h-3.5" /> },
          { key: 'split', label: '拆分', icon: <SplitSquareVertical className="w-3.5 h-3.5" /> },
          { key: 'gif', label: 'GIF', icon: <ImageIcon className="w-3.5 h-3.5" /> },
          { key: 'screenshot', label: '截图', icon: <Camera className="w-3.5 h-3.5" /> },
          { key: 'stream', label: '推流', icon: <Radio className="w-3.5 h-3.5" /> },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <SectionCard title="输入文件" icon={<Clapperboard className="w-4 h-4" />}>
            <FileDropZone accept="video/*,audio/*,image/*" multiple label="拖拽媒体文件" onFiles={handleFilesSelected} />
            {inputFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {inputFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="输出文件名" icon={<Zap className="w-4 h-4" />}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="留空则使用默认名称（原文件名_功能后缀）"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
              />
            </div>
            {customFileName && customFileName.trim() && inputFiles.length > 0 && (
              <div className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                预览: {customFileName.trim()}.{tab === 'gif' ? 'gif' : 'mp4'}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="col-span-2 space-y-4">
          {tab === 'compress' && (
            <SectionCard title="视频压缩" icon={<Zap className="w-4 h-4" />}>
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
            </SectionCard>
          )}

          {tab === 'watermark' && (
            <SectionCard title="水印设置" icon={<Stamp className="w-4 h-4" />}>
              <div className="space-y-3">
                <Tabs tabs={[{ key: 'text', label: '文字水印' }, { key: 'image', label: '图片水印' }]} active="text" onChange={() => {}} />
                <FormRow label="水印文字"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={wmText} onChange={e => setWmText(e.target.value)} /></FormRow>
                <div className="grid grid-cols-2 gap-3">
                  <FormRow label="位置">
                    <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={wmPosition} onChange={e => setWmPosition(e.target.value)}>
                      <option value="topleft">左上</option><option value="topright">右上</option>
                      <option value="bottomleft">左下</option><option value="bottomright">右下</option>
                      <option value="center">居中</option>
                    </select>
                  </FormRow>
                  <FormRow label="颜色"><input type="color" className="w-full h-9 rounded-lg cursor-pointer bg-transparent" value={wmColor} onChange={e => setWmColor(e.target.value)} /></FormRow>
                </div>
                <Slider label="不透明度" value={wmOpacity} onChange={setWmOpacity} suffix="%" />
                <Slider label="字体大小" value={wmSize} onChange={setWmSize} min={8} max={72} suffix="px" />
              </div>
            </SectionCard>
          )}

          {tab === 'subtitle' && (
            <SectionCard title="字幕处理" icon={<Subtitles className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setSubMode('burn')} className="flex-1 p-3 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: subMode === 'burn' ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-tertiary)',
                      color: subMode === 'burn' ? '#ec4899' : 'var(--text-secondary)',
                      border: `1px solid ${subMode === 'burn' ? '#ec4899' : 'transparent'}`,
                    }}>烧录字幕 (硬字幕)</button>
                  <button onClick={() => setSubMode('embed')} className="flex-1 p-3 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: subMode === 'embed' ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-tertiary)',
                      color: subMode === 'embed' ? '#ec4899' : 'var(--text-secondary)',
                      border: `1px solid ${subMode === 'embed' ? '#ec4899' : 'transparent'}`,
                    }}>内嵌字幕 (软字幕)</button>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>字幕文件</div>
                  <FileDropZone accept=".srt,.ass,.ssa,.vtt,.sub" label="拖拽字幕文件" onFiles={handleSubtitleSelected} />
                  {subtitlePath && (
                    <div className="mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      已选择: {subtitlePath}
                    </div>
                  )}
                </div>
                <FormRow label="字幕格式">
                  <div className="flex gap-1.5">
                    {['srt', 'ass', 'ssa', 'vtt'].map(f => (
                      <button key={f} onClick={() => setSubFormat(f)} className="px-3 py-1 rounded-md text-xs transition-all"
                        style={{
                          backgroundColor: subFormat === f ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-tertiary)',
                          color: subFormat === f ? '#06b6d4' : 'var(--text-secondary)',
                          border: `1px solid ${subFormat === f ? '#06b6d4' : 'transparent'}`,
                        }}>{f.toUpperCase()}</button>
                    ))}
                  </div>
                </FormRow>
                {subMode === 'burn' && <Slider label="字体大小" value={subFontSize} onChange={setSubFontSize} min={12} max={48} suffix="px" />}
              </div>
            </SectionCard>
          )}

          {tab === 'merge' && (
            <SectionCard title="文件合并" icon={<GitMerge className="w-4 h-4" />}>
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>将多个视频/音频文件按顺序合并为一个文件。请在左侧添加多个文件。</p>
                <FormRow label="合并模式">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>快速合并 (concat demuxer) - 同格式</option>
                    <option>重编码合并 (concat filter) - 不同格式</option>
                  </select>
                </FormRow>
                <FormRow label="过渡效果">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>无</option><option>淡入淡出 (xfade)</option><option>滑动</option><option>擦除</option><option>溶解</option>
                  </select>
                </FormRow>
                <Toggle checked={true} onChange={() => {}} label="统一分辨率和帧率" />
              </div>
            </SectionCard>
          )}

          {tab === 'split' && (
            <SectionCard title="文件拆分" icon={<SplitSquareVertical className="w-4 h-4" />}>
              <div className="space-y-3">
                <FormRow label="拆分模式">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>按时长拆分</option><option>按大小拆分</option><option>按数量拆分</option><option>按场景检测拆分</option>
                  </select>
                </FormRow>
                <FormRow label="每段时长 (秒)"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="60" /></FormRow>
                <Toggle checked={true} onChange={() => {}} label="无损拆分 (copy codec)" />
              </div>
            </SectionCard>
          )}

          {tab === 'gif' && (
            <SectionCard title="GIF 生成" icon={<ImageIcon className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormRow label="开始时间"><input className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={gifStart} onChange={e => setGifStart(e.target.value)} /></FormRow>
                  <FormRow label="持续时长 (秒)"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={gifDuration} onChange={e => setGifDuration(e.target.value)} /></FormRow>
                </div>
                <Slider label="帧率" value={gifFps} onChange={setGifFps} min={5} max={30} suffix=" fps" />
                <Slider label="宽度" value={gifWidth} onChange={setGifWidth} min={120} max={1920} suffix=" px" />
                <FormRow label="循环次数 (0=无限)"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} type="number" value={gifLoop} onChange={e => setGifLoop(Number(e.target.value))} /></FormRow>
                <Toggle checked={true} onChange={() => {}} label="高质量调色板 (palettegen)" />
              </div>
            </SectionCard>
          )}

          {tab === 'screenshot' && (
            <SectionCard title="视频截图" icon={<Camera className="w-4 h-4" />}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[
                    { key: 'interval', label: '按间隔截图' },
                    { key: 'count', label: '按数量截图' },
                    { key: 'single', label: '单帧截图' },
                    { key: 'tile', label: '缩略图拼图' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setSSMode(m.key)} className="flex-1 py-2 rounded-lg text-xs transition-all"
                      style={{
                        backgroundColor: ssMode === m.key ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-tertiary)',
                        color: ssMode === m.key ? '#8b5cf6' : 'var(--text-secondary)',
                        border: `1px solid ${ssMode === m.key ? '#8b5cf6' : 'transparent'}`,
                      }}>{m.label}</button>
                  ))}
                </div>
                {ssMode === 'interval' && <Slider label="间隔 (秒)" value={ssInterval} onChange={setSSInterval} min={1} max={60} suffix="s" />}
                {ssMode === 'count' && <FormRow label="截图数量"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="10" /></FormRow>}
                {ssMode === 'single' && <FormRow label="时间点"><input className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="00:01:00" /></FormRow>}
                {ssMode === 'tile' && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormRow label="列数"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="5" /></FormRow>
                    <FormRow label="行数"><input className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} defaultValue="5" /></FormRow>
                  </div>
                )}
                <FormRow label="输出格式">
                  <div className="flex gap-1.5">
                    {['PNG', 'JPG', 'BMP', 'WebP'].map(f => (
                      <button key={f} onClick={() => setSSFormat(f)} className="px-3 py-1 rounded-md text-xs transition-all"
                        style={{
                          backgroundColor: ssFormat === f ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-tertiary)',
                          color: ssFormat === f ? '#8b5cf6' : 'var(--text-secondary)',
                          border: `1px solid ${ssFormat === f ? '#8b5cf6' : 'transparent'}`,
                        }}>{f}</button>
                    ))}
                  </div>
                </FormRow>
              </div>
            </SectionCard>
          )}

          {tab === 'stream' && (
            <SectionCard title="推流设置" icon={<Radio className="w-4 h-4" />}>
              <div className="space-y-3">
                <FormRow label="推流协议">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>RTMP</option><option>RTSP</option><option>HLS</option><option>SRT</option><option>UDP</option>
                  </select>
                </FormRow>
                <FormRow label="推流地址"><input className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="rtmp://live.example.com/stream/key" /></FormRow>
                <Slider label="码率" value={streamBitrate} onChange={setStreamBitrate} min={500} max={10000} suffix=" kbps" />
                <FormRow label="编码器">
                  <select className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option>H.264 (libx264)</option><option>H.265 (libx265)</option><option>NVENC H.264</option>
                  </select>
                </FormRow>
                <Toggle checked={false} onChange={() => {}} label="循环推流" />
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <SectionCard title="" icon={null}>
        <div className="flex items-center gap-4 mb-3">
          <button 
            onClick={isCurrentModuleProcessing ? handleStop : handleStart} 
            disabled={!isConfigured || !isElectronEnv}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all" 
            style={{ background: isCurrentModuleProcessing ? 'linear-gradient(135deg, var(--error-color), #ef4444)' : 'linear-gradient(135deg, var(--warning-color), #f59e0b)' }}
          >
            {isCurrentModuleProcessing ? <Square className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {isCurrentModuleProcessing ? '停止' : '⚡ 开始处理'}
          </button>
          {isCurrentModuleProcessing && currentModuleTask && <div className="flex-1"><ProgressBar value={Math.floor(currentModuleTask.progress)} label="处理进度" /></div>}
        </div>
        {currentModuleTask && currentModuleTask.logs.length > 0 && <Terminal lines={currentModuleTask.logs} />}
      </SectionCard>
    </div>
  );
}
