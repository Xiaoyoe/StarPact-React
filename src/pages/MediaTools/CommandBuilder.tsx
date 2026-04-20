import { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Plus, BookOpen, Save, FolderOpen, Trash2, Edit2, Check, X, FileText, Zap } from 'lucide-react';
import { SectionCard, Badge } from '@/components/ffmpeg';
import { useToast } from '@/components/Toast';

const templates = [
  { name: '视频转MP4 (H.264)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4', category: '视频转换' },
  { name: '提取音频为MP3', cmd: 'ffmpeg -i input.mp4 -vn -c:a libmp3lame -b:a 320k output.mp3', category: '音频处理' },
  { name: '视频裁剪', cmd: 'ffmpeg -i input.mp4 -ss 00:01:00 -to 00:02:00 -c copy output.mp4', category: '视频编辑' },
  { name: '视频压缩 (2-pass)', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 1 -f null /dev/null && ffmpeg -i input.mp4 -c:v libx264 -b:v 1M -pass 2 output.mp4', category: '视频压缩' },
  { name: '添加水印', cmd: "ffmpeg -i input.mp4 -vf \"drawtext=text='Watermark':fontsize=24:fontcolor=white@0.8:x=w-tw-10:y=h-th-10\" output.mp4", category: '视频编辑' },
  { name: '生成GIF', cmd: 'ffmpeg -i input.mp4 -ss 0 -t 5 -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif', category: '格式转换' },
  { name: 'HLS切片', cmd: 'ffmpeg -i input.mp4 -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 output.m3u8', category: '流媒体' },
  { name: '视频截图 (每秒)', cmd: 'ffmpeg -i input.mp4 -vf fps=1 frame_%04d.png', category: '截图' },
  { name: '画面裁切 (crop)', cmd: 'ffmpeg -i input.mp4 -vf "crop=1280:720:320:180" output.mp4', category: '视频编辑' },
  { name: '多音轨混合', cmd: 'ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4', category: '音频处理' },
  { name: '视频变速2x', cmd: 'ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" output.mp4', category: '视频编辑' },
  { name: '缩略图拼图', cmd: 'ffmpeg -i input.mp4 -vf "select=not(mod(n\\,300)),scale=320:-1,tile=5x5" thumbnail.png', category: '截图' },
];

const docs = [
  { cat: '输入/输出', items: ['-i <file>', '-y (覆盖)', '-n (不覆盖)', '-f <format>', '-t <duration>', '-ss <start>', '-to <end>'] },
  { cat: '视频选项', items: ['-c:v <codec>', '-b:v <bitrate>', '-r <fps>', '-s <WxH>', '-vf <filter>', '-pix_fmt', '-preset', '-crf', '-vn (去除视频)'] },
  { cat: '音频选项', items: ['-c:a <codec>', '-b:a <bitrate>', '-ar <rate>', '-ac <channels>', '-af <filter>', '-an (去除音频)', '-vol <volume>'] },
  { cat: '视频滤镜', items: ['scale', 'crop', 'overlay', 'drawtext', 'subtitles', 'fps', 'setpts', 'transpose', 'hflip', 'vflip', 'eq', 'deinterlace'] },
  { cat: '音频滤镜', items: ['volume', 'atempo', 'afade', 'amix', 'loudnorm', 'aecho', 'equalizer', 'highpass', 'lowpass', 'afftdn'] },
];

interface CommandRecord {
  id: string;
  name: string;
  cmd: string;
  createdAt: number;
}

export function CommandBuilder() {
  const [command, setCommand] = useState('ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k output.mp4');
  const [commandRecords, setCommandRecords] = useState<CommandRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newRecordName, setNewRecordName] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [hoveredTemplateId, setHoveredTemplateId] = useState<number | null>(null);
  
  const toast = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('ffmpeg-command-records');
    if (saved) {
      try {
        setCommandRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load command records:', e);
      }
    }
  }, []);

  const saveToStorage = (records: CommandRecord[]) => {
    localStorage.setItem('ffmpeg-command-records', JSON.stringify(records));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('命令已复制到剪贴板');
  };

  const handleAddRecord = () => {
    if (!command.trim()) {
      toast.error('请输入命令');
      return;
    }
    
    const name = newRecordName.trim() || `命令 ${commandRecords.length + 1}`;
    const newRecord: CommandRecord = {
      id: Date.now().toString(),
      name,
      cmd: command,
      createdAt: Date.now(),
    };
    
    const newRecords = [newRecord, ...commandRecords];
    setCommandRecords(newRecords);
    saveToStorage(newRecords);
    setNewRecordName('');
    toast.success('命令已添加到记录');
  };

  const handleRemoveRecord = (id: string) => {
    const newRecords = commandRecords.filter(r => r.id !== id);
    setCommandRecords(newRecords);
    saveToStorage(newRecords);
    toast.success('命令记录已移除');
  };

  const handleLoadRecord = (record: CommandRecord) => {
    setCommand(record.cmd);
    toast.success(`已加载: ${record.name}`);
  };

  const handleEditName = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveName = (id: string) => {
    const newRecords = commandRecords.map(r => 
      r.id === id ? { ...r, name: editingName } : r
    );
    setCommandRecords(newRecords);
    saveToStorage(newRecords);
    setEditingId(null);
    setEditingName('');
  };

  const handleClearAll = () => {
    setCommandRecords([]);
    saveToStorage([]);
    toast.success('已清空所有命令记录');
  };

  const handleLoadTemplate = (index: number) => {
    setCommand(templates[index].cmd);
    setActiveTemplateId(index);
    toast.success(`已加载模板: ${templates[index].name}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedTemplates = templates.reduce((acc, template, index) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...template, index });
    return acc;
  }, {} as Record<string, (typeof templates[0] & { index: number })[]>);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-5 h-5" style={{ color: 'var(--error-color)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>命令行构建器</h2>
          <Badge color="red">高级</Badge>
          {commandRecords.length > 0 && (
            <Badge color="blue">{commandRecords.length} 条记录</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col min-h-0 overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <FileText className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>命令编辑</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <textarea
                className="w-full rounded-lg px-4 py-3 text-sm font-mono min-h-[120px] resize-y outline-none transition-all"
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)',
                }}
                value={command}
                onChange={e => { setCommand(e.target.value); setActiveTemplateId(null); }}
                placeholder="输入 FFmpeg 命令..."
                spellCheck={false}
              />
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecordName}
                    onChange={e => setNewRecordName(e.target.value)}
                    placeholder="记录名称（可选）"
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <button 
                    onClick={handleAddRecord} 
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-all hover:scale-105" 
                    style={{ background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> 
                    添加
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCopy} 
                    className="flex-1 px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]" 
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <Copy className="w-3.5 h-3.5" /> {copied ? '已复制!' : '复制命令'}
                  </button>
                  <button 
                    onClick={() => { setCommand(''); setActiveTemplateId(null); }} 
                    className="px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all hover:scale-[1.02]" 
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 清空
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>命令记录</span>
                  </div>
                  {commandRecords.length > 0 && (
                    <button 
                      onClick={handleClearAll}
                      className="text-xs px-2 py-1 rounded transition-colors hover:scale-105"
                      style={{ color: 'var(--error-color)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    >
                      清空全部
                    </button>
                  )}
                </div>
                {commandRecords.length === 0 ? (
                  <div className="text-center py-6 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <Save className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无命令记录</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {commandRecords.map((record) => (
                      <div 
                        key={record.id} 
                        className="p-2.5 rounded-lg transition-all group cursor-pointer hover:scale-[1.01]"
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                        onClick={() => handleLoadRecord(record)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingId === record.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={e => setEditingName(e.target.value)}
                                  className="flex-1 rounded px-2 py-0.5 text-xs outline-none"
                                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--primary-color)', color: 'var(--text-primary)' }}
                                  autoFocus
                                />
                                <button onClick={() => handleSaveName(record.id)} className="p-0.5" style={{ color: 'var(--success-color)' }}>
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{record.name}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); handleEditName(record.id, record.name); }}
                                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            <div className="text-xs font-mono truncate mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
                              {record.cmd.substring(0, 50)}...
                            </div>
                          </div>
                          <button 
                            onClick={e => { e.stopPropagation(); handleRemoveRecord(record.id); }} 
                            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            style={{ color: 'var(--error-color)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col min-h-0 overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <FolderOpen className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>命令模板</span>
            <Badge color="orange">{templates.length} 个</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: 'var(--warning-color)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{category}</span>
                  </div>
                  <div className="space-y-1.5">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.index}
                        onClick={() => handleLoadTemplate(template.index)}
                        onMouseEnter={() => setHoveredTemplateId(template.index)}
                        onMouseLeave={() => setHoveredTemplateId(null)}
                        className="p-3 rounded-lg cursor-pointer transition-all group"
                        style={{ 
                          backgroundColor: activeTemplateId === template.index 
                            ? 'var(--primary-light)' 
                            : hoveredTemplateId === template.index 
                              ? 'var(--bg-tertiary)'
                              : 'var(--bg-primary)', 
                          border: `1px solid ${activeTemplateId === template.index ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          transform: hoveredTemplateId === template.index ? 'scale(1.01)' : 'scale(1)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium mb-0.5" style={{ color: activeTemplateId === template.index ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                              {template.name}
                            </div>
                            <div className="text-xs font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {template.cmd.substring(0, 40)}...
                            </div>
                          </div>
                          <div 
                            className="px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            style={{ 
                              backgroundColor: activeTemplateId === template.index ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                              color: activeTemplateId === template.index ? 'white' : 'var(--text-secondary)',
                            }}
                          >
                            加载
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--info-color)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>参数参考</span>
                </div>
                <div className="space-y-3">
                  {docs.map((d, i) => (
                    <div key={i}>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--primary-color)' }}>{d.cat}</div>
                      <div className="flex flex-wrap gap-1">
                        {d.items.map((item, j) => (
                          <button
                            key={j}
                            onClick={() => setCommand(prev => prev + ' ' + item.split(' ')[0])}
                            className="px-2 py-0.5 rounded text-xs font-mono transition-all hover:scale-105"
                            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
