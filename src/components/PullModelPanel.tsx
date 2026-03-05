import { useState, useEffect, useRef } from 'react';
import { Download, Pause, X, RefreshCw, Plus, ChevronDown, FolderOpen, ChevronUp, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ollamaPullService, type PullTask, type PullProgress } from '@/services/OllamaPullService';
import { useStore } from '@/store';
import { useToast } from '@/components/Toast';

interface PullModelPanelProps {
  showCreateModel?: boolean;
  setShowCreateModel?: (v: boolean) => void;
  createModelName?: string;
  setCreateModelName?: (v: string) => void;
  createModelPath?: string;
  setCreateModelPath?: (v: string) => void;
  createModelFile?: File | null;
  setCreateModelFile?: (v: File | null) => void;
  handleCreateModel?: () => void;
  handleSelectModelfile?: () => void;
}

export function PullModelPanel({
  showCreateModel = false,
  setShowCreateModel = () => {},
  createModelName = '',
  setCreateModelName = () => {},
  createModelPath = '',
  setCreateModelPath = () => {},
  createModelFile = null,
  setCreateModelFile = () => {},
  handleCreateModel = () => {},
  handleSelectModelfile = () => {},
}: PullModelPanelProps) {
  const [modelName, setModelName] = useState('');
  const [showPullSection, setShowPullSection] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { pullTasks, setPullTasks, addOllamaLog } = useStore();

  useEffect(() => {
    const unsubscribe = ollamaPullService.subscribe((tasks) => {
      setPullTasks(tasks);
    });
    return unsubscribe;
  }, [setPullTasks]);

  const activeTasks = Array.from(pullTasks.values()).filter(
    task => task.status === 'downloading' || task.status === 'paused'
  );

  const hasActiveTasks = activeTasks.length > 0;

  const handlePull = async () => {
    if (!modelName.trim()) {
      toast.error('请输入模型名称', { duration: 2000 });
      inputRef.current?.focus();
      return;
    }

    addOllamaLog({ type: 'info', message: `开始拉取模型: ${modelName}` });

    try {
      await ollamaPullService.pullModel(
        modelName.trim(),
        () => {},
        () => {
          toast.success(`模型 ${modelName} 拉取成功！`, { duration: 3000 });
          addOllamaLog({ type: 'info', message: `模型 ${modelName} 拉取完成` });
          setModelName('');
        },
        (error) => {
          toast.error(`拉取失败: ${error}`, { duration: 3000 });
          addOllamaLog({ type: 'error', message: `拉取模型 ${modelName} 失败: ${error}` });
        }
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('启动拉取失败', { duration: 2000 });
      }
    }
  };

  const handlePause = (taskId: string) => {
    ollamaPullService.pausePull(taskId);
    toast.info('已暂停下载，进度已保存', { duration: 2000 });
  };

  const handleResume = async (task: PullTask) => {
    addOllamaLog({ type: 'info', message: `继续拉取模型: ${task.modelName}` });
    
    try {
      await ollamaPullService.pullModel(
        task.modelName,
        () => {},
        () => {
          toast.success(`模型 ${task.modelName} 拉取成功！`, { duration: 3000 });
          addOllamaLog({ type: 'info', message: `模型 ${task.modelName} 拉取完成` });
        },
        (error) => {
          toast.error(`拉取失败: ${error}`, { duration: 3000 });
          addOllamaLog({ type: 'error', message: `拉取模型 ${task.modelName} 失败: ${error}` });
        }
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('继续拉取失败', { duration: 2000 });
      }
    }
  };

  const handleCancel = (taskId: string, modelName: string) => {
    ollamaPullService.cancelPull(taskId);
    toast.info(`已取消下载 ${modelName}，已下载内容将被清除`, { duration: 3000 });
    addOllamaLog({ type: 'info', message: `已取消下载模型: ${modelName}` });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytes?: number, startTime?: number) => {
    if (!bytes || !startTime) return '';
    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed <= 0) return '';
    const speed = bytes / elapsed;
    return `${formatSize(speed)}/s`;
  };

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* 拉取模型头部 - 始终显示 */}
      <button
        onClick={() => setShowPullSection(!showPullSection)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ backgroundColor: showPullSection || hasActiveTasks ? 'var(--bg-tertiary)' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <Download size={16} style={{ color: 'var(--primary-color)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            拉取模型
          </span>
          {hasActiveTasks && (
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
            >
              {activeTasks.length} 个任务
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: showPullSection || hasActiveTasks ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
        </motion.div>
      </button>

      {/* 拉取模型内容 - 可折叠 */}
      <AnimatePresence>
        {(showPullSection || hasActiveTasks) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2">
              <div className="flex gap-2 mb-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePull()}
                  placeholder="输入模型名称，如: llama3.2, deepseek-r1:1.5b"
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={handlePull}
                  disabled={!modelName.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                  }}
                >
                  <Download size={14} />
                  开始拉取
                </button>
              </div>

              {/* 下载任务列表 */}
              {hasActiveTasks && (
                <div className="space-y-3 mb-3">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {task.status === 'downloading' ? (
                            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
                          ) : (
                            <Pause size={14} style={{ color: 'var(--warning-color)' }} />
                          )}
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {task.modelName}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-xs"
                            style={{
                              backgroundColor: task.status === 'downloading' ? 'var(--primary-light)' : 'rgba(245,166,35,0.1)',
                              color: task.status === 'downloading' ? 'var(--primary-color)' : 'var(--warning-color)',
                            }}
                          >
                            {task.status === 'downloading' ? '下载中' : '已暂停'}
                          </span>
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--primary-color)' }}>
                          {task.progress.percentage || 0}%
                        </span>
                      </div>

                      {/* 进度条 */}
                      {task.progress.total && task.progress.completed && (
                        <>
                          <div
                            className="h-2 rounded-full overflow-hidden mb-2"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress.percentage || 0}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                            <span>{formatSize(task.progress.completed)} / {formatSize(task.progress.total)}</span>
                            <span>{formatSpeed(task.progress.completed, task.startTime)}</span>
                          </div>
                        </>
                      )}

                      {/* 状态信息 */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {task.progress.status}
                        </span>
                        <div className="flex items-center gap-1">
                          {task.status === 'paused' ? (
                            <button
                              onClick={() => handleResume(task)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                            >
                              <Play size={12} /> 继续
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePause(task.id)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                              style={{ backgroundColor: 'rgba(245,166,35,0.1)', color: 'var(--warning-color)' }}
                            >
                              <Pause size={12} /> 暂停
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(task.id, task.modelName)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                            style={{ backgroundColor: 'rgba(245,63,63,0.1)', color: 'var(--error-color)' }}
                          >
                            <X size={12} /> 取消
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <p>💡 <strong>暂停</strong>：保留进度，可继续下载 | <strong>取消</strong>：清除任务和已下载内容</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分隔线 */}
      <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

      {/* 创建模型区域 */}
      <div>
        <button
          onClick={() => setShowCreateModel(!showCreateModel)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{ backgroundColor: showCreateModel ? 'var(--bg-tertiary)' : 'transparent' }}
        >
          <div className="flex items-center gap-2">
            <Plus size={16} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              创建 Ollama 模型
            </span>
          </div>
          <motion.div
            animate={{ rotate: showCreateModel ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
          </motion.div>
        </button>

        <AnimatePresence>
          {showCreateModel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={createModelName}
                    onChange={(e) => setCreateModelName(e.target.value)}
                    placeholder="输入模型名称，如: my-custom-model"
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Modelfile 路径
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createModelPath}
                      onChange={(e) => setCreateModelPath(e.target.value)}
                      placeholder="选择或输入 Modelfile 路径"
                      className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={handleSelectModelfile}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <FolderOpen size={16} />
                      选择文件
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setCreateModelName('');
                      setCreateModelPath('');
                      setCreateModelFile(null);
                      setShowCreateModel(false);
                    }}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateModel}
                    disabled={!createModelName.trim() || !createModelPath.trim()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                    }}
                  >
                    <Plus size={16} /> 创建模型
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
