import { useState, useEffect } from 'react';
import { FileType, Music, Terminal as TerminalIcon, Settings, ListTodo, X, Trash2, Play, CheckCircle, Clock, Cog, Square, FolderOpen, ChevronDown, ChevronRight, Copy, Check, Image as ImageIcon, FileImage, FolderSync, Minimize2, Maximize2, Film } from 'lucide-react';
import { ProgressBar } from '@/components/ffmpeg';
import { FormatConvert } from './FormatConvert';
import { AudioProcess } from './AudioProcess';
import { AdvancedTools } from './AdvancedTools';
import { CommandBuilder } from './CommandBuilder';
import { IcoConverter } from './IcoConverter';
import { ImageFormatConvert } from './ImageFormatConvert';
import { FolderProcess } from './FolderProcess';
import { VideoProcess } from './VideoProcess';
import { FFmpegConfigModal } from '@/components/FFmpegConfigModal';
import { useFFmpegStore, type ProcessingModule, type ProcessingTask } from '@/stores/ffmpegStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useWallpaperStyle } from '@/hooks';

function TaskItem({ 
  task, 
  onOpenFolder, 
  onStop, 
  onRemove,
  isExpanded,
  onToggleExpand,
}: { 
  task: ProcessingTask; 
  onOpenFolder: (path: string) => void;
  onStop: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = async () => {
    const logContent = task.logs.join('\n');
    try {
      await navigator.clipboard.writeText(logContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleCopyTaskInfo = async () => {
    const info = [
      `文件名: ${task.fileName}`,
      `模块: ${getTypeLabel(task.module)}`,
      `状态: ${task.status}`,
      `进度: ${Math.floor(task.progress)}%`,
      `输入路径: ${task.inputPath}`,
      `输出路径: ${task.outputPath}`,
      task.error ? `错误: ${task.error}` : '',
    ].filter(Boolean).join('\n');
    
    try {
      await navigator.clipboard.writeText(info);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />;
      case 'processing':
        return <Play className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />;
      case 'completed':
        return <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success-color)' }} />;
      case 'stopped':
        return <Square className="w-3.5 h-3.5" style={{ color: 'var(--warning-color)' }} />;
      case 'error':
        return <X className="w-3.5 h-3.5" style={{ color: 'var(--error-color)' }} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: ProcessingModule) => {
    const labels: Record<ProcessingModule, string> = {
      formatConvert: '格式转换',
      audioProcess: '音频处理',
      advancedTools: '高级工具',
      commandBuilder: '命令构建',
    };
    return labels[type] || type;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(task.status)}
            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {task.fileName}
            </span>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 rounded transition-all duration-200 hover:scale-110"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
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
            {getTypeLabel(task.module)}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {task.status === 'processing' ? `${Math.floor(task.progress)}%` : 
             task.status === 'completed' ? '完成' : 
             task.status === 'error' ? '失败' : 
             task.status === 'stopped' ? '已停止' : '等待中'}
          </span>
        </div>
        
        {task.status === 'processing' && (
          <div className="mb-2">
            <ProgressBar value={Math.floor(task.progress)} label="" />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {formatTime(task.startTime)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyTaskInfo}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--text-tertiary)' }}
              title="复制任务信息"
            >
              {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
              {copied ? '已复制' : '复制'}
            </button>
            {task.status === 'processing' && (
              <button
                onClick={() => onStop(task.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all duration-200 hover:scale-105"
                style={{ color: 'var(--error-color)' }}
              >
                <Square className="w-2.5 h-2.5" />
                停止
              </button>
            )}
            {(task.status === 'completed' || task.status === 'error' || task.status === 'stopped') && (
              <button
                onClick={() => onRemove(task.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all duration-200 hover:scale-105"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Trash2 className="w-2.5 h-2.5" />
                移除
              </button>
            )}
            <button
              onClick={() => onOpenFolder(task.outputPath)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--primary-color)' }}
            >
              <FolderOpen className="w-2.5 h-2.5" />
              打开
            </button>
          </div>
        </div>

        {task.error && (
          <div className="text-[10px] mt-2 p-1 rounded" style={{ color: 'var(--error-color)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            {task.error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && task.logs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div 
              className="px-3 pb-3 pt-1"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  日志记录 ({task.logs.length} 条)
                </span>
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all duration-200 hover:scale-105"
                  style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}
                  title="复制全部日志"
                >
                  {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  {copied ? '已复制' : '复制日志'}
                </button>
              </div>
              <div 
                className="h-24 overflow-y-auto rounded-lg p-2 text-[10px] font-mono"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {task.logs.slice(-30).map((log, i) => (
                  <div key={i} style={{ 
                    color: log.startsWith('[error]') ? 'var(--error-color)' : 
                           log.startsWith('[done]') ? 'var(--success-color)' : 
                           log.startsWith('[info]') ? 'var(--text-tertiary)' : 'var(--text-secondary)'
                  }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function MediaToolsPage() {
  const [activeTab, setActiveTab] = useState('format');
  const [showTaskList, setShowTaskList] = useState(false);
  const [showFFmpegConfig, setShowFFmpegConfig] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showBottomNav, setShowBottomNav] = useState(true);
  
  const { chatWallpaper } = useStore();
  const wallpaperStyle = useWallpaperStyle(chatWallpaper);
  const { 
    tasks,
    activeTaskIds,
    stopTask,
    removeTask,
    clearCompletedTasks,
  } = useFFmpegStore();

  const isProcessing = activeTaskIds.size > 0;
  const activeTasks = tasks.filter(t => activeTaskIds.has(t.id));
  const completedTasks = tasks.filter(t => !activeTaskIds.has(t.id));

  const tabs = [
    { key: 'format', label: '格式转换', icon: <FileType className="w-4 h-4" /> },
    { key: 'audio', label: '音频处理', icon: <Music className="w-4 h-4" /> },
    { key: 'advanced', label: '高级工具', icon: <Settings className="w-4 h-4" /> },
    { key: 'ico', label: 'ICO转换', icon: <ImageIcon className="w-4 h-4" /> },
    { key: 'imageFormat', label: '图片转换', icon: <FileImage className="w-4 h-4" /> },
    { key: 'command', label: '命令构建', icon: <TerminalIcon className="w-4 h-4" /> },
  ];

  const processTabs = [
    { key: 'folder', label: '文件夹处理', icon: <FolderSync className="w-4 h-4" /> },
    { key: 'video', label: '视频处理', icon: <Film className="w-4 h-4" /> },
  ];

  const handleOpenFolder = async (filePath: string) => {
    if (typeof window !== 'undefined' && window.electronAPI?.file?.showInFolder) {
      await window.electronAPI.file.showInFolder(filePath);
    }
  };

  const handleStopTask = async (taskId: string) => {
    await stopTask(taskId);
  };

  const handleRemoveTask = (taskId: string) => {
    removeTask(taskId);
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    }
  };

  return (
    <div 
      className="h-full flex flex-col overflow-hidden p-6 relative" 
      style={{ 
        backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : 'none',
        ...wallpaperStyle
      }}
    >
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <div style={{ display: activeTab === 'format' ? 'block' : 'none' }}>
            <FormatConvert />
          </div>
          <div style={{ display: activeTab === 'audio' ? 'block' : 'none' }}>
            <AudioProcess />
          </div>
          <div style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
            <AdvancedTools />
          </div>
          <div style={{ display: activeTab === 'ico' ? 'block' : 'none' }}>
            <IcoConverter />
          </div>
          <div style={{ display: activeTab === 'imageFormat' ? 'block' : 'none' }}>
            <ImageFormatConvert />
          </div>
          <div style={{ display: activeTab === 'video' ? 'block' : 'none' }} className="h-full">
            <VideoProcess />
          </div>
          <div style={{ display: activeTab === 'folder' ? 'block' : 'none' }} className="h-full">
            <FolderProcess />
          </div>
          <div style={{ display: activeTab === 'command' ? 'block' : 'none' }}>
            <CommandBuilder />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showBottomNav ? (
          <motion.button
            key="expand"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={() => setShowBottomNav(true)}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-2xl flex items-center justify-center z-20 group"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              boxShadow: '0 10px 40px rgba(15, 23, 42, 0.3)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Maximize2 className="w-5 h-5 text-white transition-transform group-hover:rotate-180 duration-300" />
          </motion.button>
        ) : (
          <motion.div
            key="toolbar"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-6 left-6 right-6 z-20"
          >
            <div 
              className="rounded-2xl px-4 py-2"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                backdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 flex-1">
                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 group"
                      style={{
                        color: activeTab === tab.key ? 'white' : 'var(--text-tertiary)',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {activeTab === tab.key && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                            boxShadow: '0 4px 15px rgba(15, 23, 42, 0.4)',
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span className="transition-transform group-hover:scale-110">{tab.icon}</span>
                        <span className="text-[11px] font-medium whitespace-nowrap">{tab.label}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
                
                <div className="h-5 w-px" style={{ backgroundColor: 'var(--border-color)' }} />
                
                <div className="flex items-center gap-1">
                  {processTabs.map((tab) => (
                    <motion.button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 group"
                      style={{
                        color: activeTab === tab.key ? 'white' : 'var(--text-tertiary)',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {activeTab === tab.key && (
                        <motion.div
                          layoutId="activeProcessTab"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.15)',
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span className="transition-transform group-hover:scale-110">{tab.icon}</span>
                        <span className="text-[11px] font-medium whitespace-nowrap">{tab.label}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
                
                <div className="h-5 w-px" style={{ backgroundColor: 'var(--border-color)' }} />
                
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => {
                      setShowFFmpegConfig(true);
                      setShowTaskList(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300"
                    style={{ color: 'var(--text-tertiary)' }}
                    whileHover={{ scale: 1.03, color: 'var(--text-primary)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Cog className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">配置</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      setShowTaskList(!showTaskList);
                      setShowFFmpegConfig(false);
                    }}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300"
                    style={{ color: showTaskList ? 'var(--primary-color)' : 'var(--text-tertiary)' }}
                    whileHover={{ scale: 1.03, color: showTaskList ? 'var(--primary-color)' : 'var(--text-primary)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">任务</span>
                    {activeTaskIds.size > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold text-white"
                        style={{ 
                          background: 'linear-gradient(135deg, var(--error-color) 0%, #ec4899 100%)',
                          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {activeTaskIds.size}
                      </motion.span>
                    )}
                  </motion.button>
                  
                  <div className="h-5 w-px ml-1" style={{ backgroundColor: 'var(--border-color)' }} />
                  
                  <motion.button
                    onClick={() => setShowBottomNav(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ml-1"
                    style={{ color: 'var(--text-tertiary)' }}
                    whileHover={{ scale: 1.1, color: 'var(--text-primary)' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="absolute right-6 top-20 bottom-20 w-[300px] z-20"
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
                    任务列表 ({tasks.length})
                  </h3>
                  {completedTasks.length > 0 && (
                    <button
                      onClick={clearCompletedTasks}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-200 hover:scale-105"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <Trash2 className="w-3 h-3" />
                      清理已完成
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarGutter: 'stable', paddingRight: '8px' }}>
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <ListTodo className="w-10 h-10 mb-2" style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无任务</p>
                    </div>
                  ) : (
                    <>
                      {activeTasks.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--primary-color)' }}>
                            进行中 ({activeTasks.length})
                          </div>
                          {activeTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onOpenFolder={handleOpenFolder}
                              onStop={handleStopTask}
                              onRemove={handleRemoveTask}
                              isExpanded={expandedTaskId === task.id}
                              onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                            />
                          ))}
                        </div>
                      )}
                      
                      {completedTasks.length > 0 && (
                        <div>
                          <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                            已完成 ({completedTasks.length})
                          </div>
                          {completedTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onOpenFolder={handleOpenFolder}
                              onStop={handleStopTask}
                              onRemove={handleRemoveTask}
                              isExpanded={expandedTaskId === task.id}
                              onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isProcessing && activeTasks.length > 0 && (
                  <div 
                    className="mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                  >
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      总体进度
                    </div>
                    <div className="space-y-2">
                      {activeTasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                          <span className="text-[10px] truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>
                            {task.fileName}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {Math.floor(task.progress)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
