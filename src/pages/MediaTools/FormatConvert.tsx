import { useState, useEffect, useCallback } from 'react';
import { 
  FileType, Settings, Gauge, Film, Music2, MonitorPlay, 
  Upload, ChevronDown, ChevronRight, Sparkles, Zap, Info,
  AlertCircle
} from 'lucide-react';
import { SectionCard, FileDropZone, FormRow, Toggle, Slider, Tabs, ProgressBar, Terminal, Badge } from '@/components/ffmpeg';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegRendererService, type FFmpegProgress, type MediaInfo } from '@/services/ffmpeg/FFmpegRendererService';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';
import { useToast } from '@/components/Toast';

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
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const toast = useToast();

  const formats = mode === 'video' ? videoFormats : audioFormats;

  useEffect(() => {
    const checkConfig = async () => {
      await ffmpegConfigStorage.ready();
      setIsConfigured(ffmpegConfigStorage.isValid());
      setOutputPath(ffmpegConfigStorage.getOutputPath());
      setIsElectronEnv(ffmpegRendererService.isElectron());
    };
    checkConfig();
  }, []);

  useEffect(() => {
    const unsubscribeProgress = ffmpegRendererService.onProgress((p: FFmpegProgress) => {
      setProgress(p.progress);
      if (p.frame > 0) {
        setLogs(prev => [...prev.slice(-50), `[progress] frame=${p.frame} fps=${p.fps} size=${p.size} time=${p.time} bitrate=${p.bitrate} speed=${p.speed}`]);
      }
    });

    const unsubscribeLog = ffmpegRendererService.onLog((log: string) => {
      const cleanLog = log.trim();
      if (cleanLog) {
        setLogs(prev => [...prev.slice(-100), `[ffmpeg] ${cleanLog}`]);
      }
    });

    return () => {
      unsubscribeProgress();
      unsubscribeLog();
    };
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

    if (inputFilesData.length > 0 && inputFilesData[0].path) {
      const mediaInfo = await ffmpegRendererService.getMediaInfo(inputFilesData[0].path);
      if (mediaInfo) {
        setInputFiles(prev => prev.map((f, i) => i === 0 ? { ...f, mediaInfo } : f));
      }
    }
  }, []);

  const getOutputFilePath = (inputFile: InputFile): string => {
    const inputPath = inputFile.path;
    const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
    const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
    const lastDotIndex = inputFile.name.lastIndexOf('.');
    const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
    
    const outputDir = outputPath || inputDir;
    const extension = targetFormat.toLowerCase();
    const sep = outputDir.includes('\\') ? '\\' : '/';
    
    return outputDir ? `${outputDir}${sep}${inputName}_converted.${extension}` : `${inputName}_converted.${extension}`;
  };

  const handleStart = async () => {
    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    if (inputFiles.length === 0) {
      toast.error('请先选择要转换的文件');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([
      '[info] FFmpeg Studio v1.0 - 格式转换模块',
      `[info] 目标格式: ${targetFormat}`,
      `[info] 视频编码: ${vCodec} | 音频编码: ${aCodec}`,
      `[info] 预设: ${preset} | CRF: ${crf}`,
      `[info] 分辨率: ${resolution} | 像素格式: ${pixFmt}`,
      hwAccel ? '[info] 硬件加速: 已启用 (NVENC/QSV)' : '[info] 硬件加速: 未启用',
      twoPass ? '[info] 二次编码: 已启用' : '',
      '[info] 开始处理...',
    ].filter(Boolean));

    try {
      for (const inputFile of inputFiles) {
        const outputFilePath = getOutputFilePath(inputFile);
        
        setLogs(prev => [...prev, `[info] 处理文件: ${inputFile.name}`]);
        setLogs(prev => [...prev, `[info] 输出到: ${outputFilePath}`]);

        const args = ffmpegRendererService.buildConvertArgs(
          inputFile.path,
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

        const duration = inputFile.mediaInfo?.duration;
        const result = await ffmpegRendererService.executeWithProgress(args, duration);

        if (result.success) {
          setLogs(prev => [...prev, `[done] ✅ ${inputFile.name} 转换完成！`]);
        } else {
          setLogs(prev => [...prev, `[error] ❌ ${inputFile.name} 转换失败: ${result.error}`]);
        }
      }

      setProgress(100);
      setLogs(prev => [...prev, '[done] ✅ 所有任务完成！']);
      toast.success('转换完成！');
    } catch (error) {
      setLogs(prev => [...prev, `[error] 处理出错: ${error instanceof Error ? error.message : '未知错误'}`]);
      toast.error('转换失败');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleStop = async () => {
    await ffmpegRendererService.stop();
    setIsProcessing(false);
    setLogs(prev => [...prev, '[info] 已停止处理']);
    toast.info('已停止处理');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileType className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>格式转换</h2>
          <Badge color="blue">全格式</Badge>
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
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输入文件</span>
            </div>
            <FileDropZone
              accept={mode === 'video' ? 'video/*' : 'audio/*'}
              multiple
              label={mode === 'video' ? '拖拽视频文件' : '拖拽音频文件'}
              onFiles={handleFilesSelected}
            />
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
                  className="px-2 py-1.5 rounded-md text-xs font-medium transition-all text-center"
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

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>快速预设</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: '高质量', desc: '大文件，最佳画质', crf: 18, preset: 'slow' },
                { name: '均衡', desc: '画质体积平衡', crf: 23, preset: 'medium' },
                { name: '压缩', desc: '小文件，较快速度', crf: 28, preset: 'fast' },
                { name: '极速', desc: '最快速度，较大文件', crf: 23, preset: 'ultrafast' },
              ].map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setCrf(p.crf); setPreset(p.preset); }}
                  className="p-2 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: crf === p.crf && preset === p.preset ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    border: `1px solid ${crf === p.crf && preset === p.preset ? 'var(--primary-color)' : 'transparent'}`,
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

          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={isProcessing ? handleStop : handleStart} 
                disabled={!isConfigured || !isElectronEnv}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: isProcessing ? 'linear-gradient(135deg, var(--error-color), #ef4444)' : 'linear-gradient(135deg, var(--primary-color), #8b5cf6)' }}
              >
                <Sparkles className="w-4 h-4" />
                {isProcessing ? '停止' : '开始转换'}
              </button>
              {isProcessing && (
                <div className="flex-1">
                  <ProgressBar value={Math.floor(progress)} label="转换进度" />
                </div>
              )}
              {!isProcessing && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <Info className="w-3.5 h-3.5" />
                  <span>点击开始按钮执行转换任务</span>
                </div>
              )}
            </div>
            {logs.length > 0 && (
              <div className="mt-4">
                <Terminal lines={logs} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
