import { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Play, BookOpen, Save, FolderOpen, Trash2, AlertCircle, Square } from 'lucide-react';
import { SectionCard, Terminal, Badge, ProgressBar } from '@/components/ffmpeg';
import { ffmpegRendererService, type FFmpegProgress } from '@/services/ffmpeg/FFmpegRendererService';
import { ffmpegConfigStorage } from '@/services/storage/FFmpegConfigStorage';
import { useToast } from '@/components/Toast';

const templates = [
  { name: '视频转MP4 (H.264)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4' },
  { name: '提取音频为MP3', cmd: 'ffmpeg -i input.mp4 -vn -c:a libmp3lame -b:a 320k output.mp3' },
  { name: '视频裁剪', cmd: 'ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c copy output.mp4' },
  { name: '视频压缩 (2-pass)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 1 -f null /dev/null && ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 2 output.mp4' },
  { name: '添加水印', cmd: "ffmpeg -i input.mp4 -vf \"drawtext=text='Watermark':fontsize=24:fontcolor=white@0.8:x=W-tw-10:y=H-th-10\" output.mp4" },
  { name: '生成GIF', cmd: 'ffmpeg -i input.mp4 -ss 0 -t 5 -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif' },
  { name: '视频合并', cmd: 'ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4' },
  { name: '添加硬字幕', cmd: "ffmpeg -i input.mp4 -vf subtitles=subtitle.srt output.mp4" },
  { name: 'HLS切片', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 output.m3u8' },
  { name: '视频截图 (每秒)', cmd: 'ffmpeg -i input.mp4 -vf fps=1 frame_%04d.png' },
  { name: 'RTMP推流', cmd: 'ffmpeg -re -i input.mp4 -c:v libx264 -preset veryfast -b:v 2500k -c:a aac -f flv rtmp://server/live/stream' },
  { name: '画面裁切 (crop)', cmd: 'ffmpeg -i input.mp4 -vf "crop=1280:720:320:180" output.mp4' },
  { name: '多音轨混合', cmd: 'ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4' },
  { name: '视频变速2x', cmd: 'ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" output.mp4' },
  { name: '缩略图拼图', cmd: 'ffmpeg -i input.mp4 -vf "select=not(mod(n\\,300)),scale=320:-1,tile=5x5" thumbnail.png' },
];

const docs = [
  { cat: '输入/输出', items: ['-i <file>', '-y (覆盖)', '-n (不覆盖)', '-f <format>', '-t <duration>', '-ss <start>', '-to <end>'] },
  { cat: '视频选项', items: ['-c:v <codec>', '-b:v <bitrate>', '-r <fps>', '-s <WxH>', '-vf <filter>', '-pix_fmt', '-preset', '-crf', '-vn (去除视频)'] },
  { cat: '音频选项', items: ['-c:a <codec>', '-b:a <bitrate>', '-ar <rate>', '-ac <channels>', '-af <filter>', '-an (去除音频)', '-vol <volume>'] },
  { cat: '视频滤镜', items: ['scale', 'crop', 'overlay', 'drawtext', 'subtitles', 'fps', 'setpts', 'transpose', 'hflip', 'vflip', 'eq', 'deinterlace'] },
  { cat: '音频滤镜', items: ['volume', 'atempo', 'afade', 'amix', 'loudnorm', 'aecho', 'equalizer', 'highpass', 'lowpass', 'afftdn'] },
];

export function CommandBuilder() {
  const [command, setCommand] = useState('ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4');
  const [savedCommands, setSavedCommands] = useState<{ name: string; cmd: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const checkConfig = async () => {
      await ffmpegConfigStorage.ready();
      setIsConfigured(ffmpegConfigStorage.isValid());
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

  const handleCopy = () => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const name = prompt('保存命令名称:');
    if (name) setSavedCommands(prev => [...prev, { name, cmd: command }]);
  };

  const parseCommand = (cmd: string): string[] => {
    const ffmpegIndex = cmd.toLowerCase().indexOf('ffmpeg');
    if (ffmpegIndex === -1) return [];
    
    const argsStr = cmd.substring(ffmpegIndex + 6).trim();
    const args: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  };

  const handleRun = async () => {
    if (!isElectronEnv) {
      toast.error('请使用 Electron 模式运行此功能（运行 npm run electron:dev）');
      return;
    }

    if (!isConfigured) {
      toast.error('请先在配置中设置 FFmpeg bin 目录');
      return;
    }

    if (!command.trim()) {
      toast.error('请输入 FFmpeg 命令');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([
      `[info] $ ${command}`,
      '[info] 开始执行...',
    ]);

    try {
      const args = parseCommand(command);
      
      if (args.length === 0) {
        setLogs(prev => [...prev, '[error] 无法解析命令']);
        setIsProcessing(false);
        return;
      }

      const result = await ffmpegRendererService.executeWithProgress(args);

      if (result.success) {
        setLogs(prev => [...prev, '[done] ✅ 命令执行完成！']);
        toast.success('执行完成');
      } else {
        setLogs(prev => [...prev, `[error] ❌ 执行失败: ${result.error}`]);
        toast.error('执行失败');
      }
    } catch (error) {
      setLogs(prev => [...prev, `[error] 执行出错: ${error instanceof Error ? error.message : '未知错误'}`]);
      toast.error('执行失败');
    } finally {
      setTimeout(() => setIsProcessing(false), 500);
    }
  };

  const handleStop = async () => {
    await ffmpegRendererService.stop();
    setIsProcessing(false);
    setLogs(prev => [...prev, '[info] 已停止执行']);
    toast.info('已停止');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5" style={{ color: 'var(--error-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>命令行构建器</h2>
          <Badge color="red">高级</Badge>
        </div>
        <button onClick={() => setShowDocs(!showDocs)} className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
          <BookOpen className="w-3.5 h-3.5" /> {showDocs ? '隐藏文档' : '参考文档'}
        </button>
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

      <div className={`grid gap-4 ${showDocs ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <div className={showDocs ? 'col-span-2' : ''}>
          <SectionCard title="FFmpeg 命令" icon={<TerminalIcon className="w-4 h-4" />}>
            <div className="space-y-3">
              <textarea
                className="w-full rounded-lg px-4 py-3 text-sm font-mono min-h-[100px] resize-y outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="输入 FFmpeg 命令..."
                spellCheck={false}
              />
              <div className="flex gap-2">
                <button 
                  onClick={isProcessing ? handleStop : handleRun} 
                  disabled={!isConfigured || !isElectronEnv} 
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 transition-all" 
                  style={{ background: isProcessing ? 'linear-gradient(135deg, var(--error-color), #ef4444)' : 'linear-gradient(135deg, var(--primary-color), #8b5cf6)' }}
                >
                  {isProcessing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} 
                  {isProcessing ? '停止' : '执行'}
                </button>
                <button onClick={handleCopy} className="px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                  <Copy className="w-3.5 h-3.5" /> {copied ? '已复制!' : '复制'}
                </button>
                <button onClick={handleSave} className="px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                  <Save className="w-3.5 h-3.5" /> 保存
                </button>
                <button onClick={() => setCommand('')} className="px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                  <Trash2 className="w-3.5 h-3.5" /> 清空
                </button>
              </div>
            </div>
          </SectionCard>

          {(isProcessing || logs.length > 0) && (
            <div className="mt-4">
              <SectionCard title="执行输出" icon={<TerminalIcon className="w-4 h-4" />}>
                {isProcessing && <div className="mb-3"><ProgressBar value={Math.floor(progress)} label="执行进度" /></div>}
                <Terminal lines={logs} />
              </SectionCard>
            </div>
          )}

          <div className="mt-4">
            <SectionCard title="命令模板" icon={<FolderOpen className="w-4 h-4" />}>
              <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setCommand(t.cmd)}
                    className="text-left p-3 rounded-lg transition-all group"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="text-xs font-medium mb-1 group-hover:text-primary-color" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                    <div className="text-xs font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{t.cmd}</div>
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          {savedCommands.length > 0 && (
            <div className="mt-4">
              <SectionCard title="已保存命令" icon={<Save className="w-4 h-4" />}>
                <div className="space-y-2">
                  {savedCommands.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>{s.cmd}</span>
                      <button onClick={() => setCommand(s.cmd)} className="text-xs" style={{ color: 'var(--primary-color)' }}>加载</button>
                      <button onClick={() => setSavedCommands(prev => prev.filter((_, j) => j !== i))} style={{ color: 'var(--text-tertiary)' }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        {showDocs && (
          <div className="col-span-1">
            <SectionCard title="FFmpeg 参考" icon={<BookOpen className="w-4 h-4" />} className="max-h-[calc(100vh-180px)] overflow-y-auto">
              <div className="space-y-4">
                {docs.map((d, i) => (
                  <div key={i}>
                    <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--primary-color)' }}>{d.cat}</div>
                    <div className="flex flex-wrap gap-1">
                      {d.items.map((item, j) => (
                        <button
                          key={j}
                          onClick={() => setCommand(prev => prev + ' ' + item.split(' ')[0])}
                          className="px-2 py-0.5 rounded text-xs font-mono transition-all"
                          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
