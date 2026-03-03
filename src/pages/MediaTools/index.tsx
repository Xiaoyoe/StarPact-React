import { useState } from 'react';
import { Clapperboard, FileType, Music, Terminal as TerminalIcon, Settings, ListTodo, X, Trash2, Play, CheckCircle, Clock, Cog } from 'lucide-react';
import { Tabs } from '@/components/ffmpeg';
import { FormatConvert } from './FormatConvert';
import { AudioProcess } from './AudioProcess';
import { AdvancedTools } from './AdvancedTools';
import { CommandBuilder } from './CommandBuilder';
import { FFmpegConfigModal } from '@/components/FFmpegConfigModal';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskItem {
  id: string;
  name: string;
  type: 'format' | 'audio' | 'advanced' | 'command';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
}

export function MediaToolsPage() {
  const [activeTab, setActiveTab] = useState('format');
  const [showTaskList, setShowTaskList] = useState(true);
  const [showFFmpegConfig, setShowFFmpegConfig] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', name: '视频转MP4', type: 'format', status: 'processing', progress: 65, createdAt: new Date() },
    { id: '2', name: '提取音频', type: 'audio', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 300000) },
    { id: '3', name: '生成GIF', type: 'advanced', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 600000) },
    { id: '4', name: '视频压缩-项目演示', type: 'format', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 900000) },
    { id: '5', name: '音频降噪处理', type: 'audio', status: 'processing', progress: 32, createdAt: new Date(Date.now() - 120000) },
    { id: '6', name: '添加水印-公司Logo', type: 'advanced', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 180000) },
    { id: '7', name: 'MKV转MP4', type: 'format', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 240000) },
    { id: '8', name: '提取字幕', type: 'advanced', status: 'failed', progress: 45, createdAt: new Date(Date.now() - 300000) },
    { id: '9', name: '音频混合-背景音乐', type: 'audio', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 360000) },
    { id: '10', name: '视频截图-每秒一帧', type: 'advanced', status: 'processing', progress: 88, createdAt: new Date(Date.now() - 420000) },
    { id: '11', name: 'FLAC转MP3', type: 'audio', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 480000) },
    { id: '12', name: '视频合并-宣传片', type: 'advanced', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 540000) },
    { id: '13', name: 'WebM转MP4', type: 'format', status: 'processing', progress: 15, createdAt: new Date(Date.now() - 60000) },
    { id: '14', name: '音量标准化', type: 'audio', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 660000) },
    { id: '15', name: '生成缩略图拼图', type: 'advanced', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 720000) },
    { id: '16', name: 'AVI转MKV', type: 'format', status: 'failed', progress: 72, createdAt: new Date(Date.now() - 780000) },
    { id: '17', name: '淡入淡出效果', type: 'audio', status: 'processing', progress: 50, createdAt: new Date(Date.now() - 90000) },
    { id: '18', name: 'RTMP推流测试', type: 'advanced', status: 'pending', progress: 0, createdAt: new Date(Date.now() - 840000) },
  ]);

  const tabs = [
    { key: 'format', label: '格式转换', icon: <FileType className="w-4 h-4" /> },
    { key: 'audio', label: '音频处理', icon: <Music className="w-4 h-4" /> },
    { key: 'advanced', label: '高级工具', icon: <Settings className="w-4 h-4" /> },
    { key: 'command', label: '命令构建', icon: <TerminalIcon className="w-4 h-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'format':
        return <FormatConvert />;
      case 'audio':
        return <AudioProcess />;
      case 'advanced':
        return <AdvancedTools />;
      case 'command':
        return <CommandBuilder />;
      default:
        return <FormatConvert />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      format: '格式转换',
      audio: '音频处理',
      advanced: '高级工具',
      command: '命令构建',
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />;
      case 'processing':
        return <Play className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />;
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success-color)' }} />;
      case 'failed':
        return <X className="w-3.5 h-3.5" style={{ color: 'var(--error-color)' }} />;
      default:
        return null;
    }
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => t.status !== 'completed'));
  };

  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'processing').length;

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--primary-light)' }}>
            <Clapperboard className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>媒体工具</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>FFmpeg 多媒体处理工具集</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
          <button
            onClick={() => setShowFFmpegConfig(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Cog className="w-4 h-4" />
            <span className="text-xs font-medium">配置</span>
          </button>
          <button
            onClick={() => setShowTaskList(!showTaskList)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: showTaskList ? 'var(--primary-light)' : 'var(--bg-tertiary)',
              color: showTaskList ? 'var(--primary-color)' : 'var(--text-secondary)',
              border: `1px solid ${showTaskList ? 'var(--primary-color)' : 'var(--border-color)'}`,
            }}
          >
            <ListTodo className="w-4 h-4" />
            <span className="text-xs font-medium">任务列表</span>
            {pendingCount > 0 && (
              <span
                className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div style={{ paddingRight: '12px' }}>
          {renderContent()}
        </div>
      </div>

      <AnimatePresence>
        {showTaskList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-10"
              style={{ backgroundColor: 'transparent' }}
              onClick={() => setShowTaskList(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute right-6 top-20 bottom-6 w-[280px] z-20"
            >
              <div
                className="h-full rounded-xl p-4 flex flex-col shadow-2xl"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    任务列表
                  </h3>
                  <button
                    onClick={clearCompleted}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all hover:opacity-70"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                    清除已完成
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarGutter: 'stable', paddingRight: '8px' }}>
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <ListTodo className="w-10 h-10 mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无任务</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-primary)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-xs font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>
                              {task.name}
                            </span>
                          </div>
                          <button
                            onClick={() => removeTask(task.id)}
                            className="p-1 rounded hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {getTypeLabel(task.type)}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {task.status === 'processing' ? `${task.progress}%` : task.status === 'completed' ? '完成' : task.status === 'failed' ? '失败' : '等待中'}
                          </span>
                        </div>
                        {task.status === 'processing' && (
                          <div
                            className="h-1 rounded-full overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${task.progress}%`,
                                background: 'linear-gradient(90deg, var(--primary-color), #8b5cf6)',
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FFmpegConfigModal
        isOpen={showFFmpegConfig}
        onClose={() => setShowFFmpegConfig(false)}
      />
    </div>
  );
}
