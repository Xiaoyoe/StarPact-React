import { useState, useEffect } from 'react';
import { Clapperboard, FileType, Music, Terminal as TerminalIcon, Settings, ListTodo, X, Trash2, Play, CheckCircle, Clock, Cog, Square, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Tabs, ProgressBar } from '@/components/ffmpeg';
import { FormatConvert } from './FormatConvert';
import { AudioProcess } from './AudioProcess';
import { AdvancedTools } from './AdvancedTools';
import { CommandBuilder } from './CommandBuilder';
import { FFmpegConfigModal } from '@/components/FFmpegConfigModal';
import { useFFmpegStore, type ProcessingModule, type ProcessingTask } from '@/stores/ffmpegStore';
import { motion, AnimatePresence } from 'framer-motion';

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
            className="p-1 rounded transition-colors"
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
            {task.status === 'processing' && (
              <button
                onClick={() => onStop(task.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
                style={{ color: 'var(--error-color)' }}
              >
                <Square className="w-2.5 h-2.5" />
                停止
              </button>
            )}
            {(task.status === 'completed' || task.status === 'error' || task.status === 'stopped') && (
              <button
                onClick={() => onRemove(task.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Trash2 className="w-2.5 h-2.5" />
                移除
              </button>
            )}
            <button
              onClick={() => onOpenFolder(task.outputPath)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
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
            {activeTaskIds.size > 0 && (
              <span
                className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white animate-pulse"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {activeTaskIds.size}
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
              className="absolute right-6 top-20 bottom-6 w-[300px] z-20"
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
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all hover:opacity-70"
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
