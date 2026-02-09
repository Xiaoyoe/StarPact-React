import { useState, useEffect } from 'react';
import {
  RefreshCw, Download, Trash2, AlertCircle,
  Activity, HardDrive, Clock, Zap, Settings2, X, CheckCircle2, XCircle
} from 'lucide-react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import type { OllamaModel, OllamaPullProgress } from '@/shared/types/ollama';

export function OllamaModal() {
  const {
    ollamaModalOpen, setOllamaModalOpen,
    ollamaStatus,
    setOllamaStatus,
    ollamaModels,
    setOllamaModels,
    ollamaLogs,
    addOllamaLog,
  } = useStore();

  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<OllamaPullProgress | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ host: 'localhost', port: 11434 });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (ollamaModalOpen) {
      checkOllamaStatus();
      
      if (window.electronAPI?.ollama) {
        const cleanup = window.electronAPI.ollama.onStatus((status) => {
          setOllamaStatus(status);
        });
        
        const logCleanup = window.electronAPI.ollama.onLog((log) => {
          addOllamaLog(log);
        });

        return () => {
          cleanup();
          logCleanup();
        };
      }
    }
  }, [ollamaModalOpen]);

  const checkOllamaStatus = async () => {
    if (!window.electronAPI?.ollama) {
      addOllamaLog({ type: 'error', message: 'Electron API 不可用，请在 Electron 环境中使用' });
      return;
    }
    
    setIsChecking(true);
    try {
      const status = await window.electronAPI.ollama.checkStatus();
      setOllamaStatus(status);
      
      if (status.isRunning) {
        addOllamaLog({ type: 'info', message: 'Ollama 服务运行中' });
        loadOllamaModels();
      } else {
        addOllamaLog({ type: 'warning', message: '未检测到 Ollama 服务，请先启动 Ollama' });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: '检查 Ollama 状态失败' });
    } finally {
      setIsChecking(false);
    }
  };

  const loadOllamaModels = async () => {
    if (!window.electronAPI?.ollama) {
      addOllamaLog({ type: 'error', message: 'Electron API 不可用' });
      return;
    }
    
    try {
      const models = await window.electronAPI.ollama.getModels();
      setOllamaModels(models);
      addOllamaLog({ type: 'info', message: `加载了 ${models.length} 个 Ollama 模型` });
    } catch (error) {
      addOllamaLog({ type: 'error', message: '加载 Ollama 模型失败' });
    }
  };

  const handlePullModel = async (modelName: string) => {
    if (!window.electronAPI?.ollama) {
      addOllamaLog({ type: 'error', message: 'Electron API 不可用' });
      return;
    }
    
    setPullingModel(modelName);
    setPullProgress(null);

    const progressCleanup = window.electronAPI.ollama.onPullProgress((progress) => {
      setPullProgress(progress);
      addOllamaLog({ type: 'info', message: `拉取模型: ${progress.status || '进行中...'}` });
    });

    try {
      await window.electronAPI.ollama.pullModel(modelName);
      addOllamaLog({ type: 'info', message: `模型 ${modelName} 拉取完成` });
      await loadOllamaModels();
    } catch (error) {
      addOllamaLog({ type: 'error', message: `拉取模型 ${modelName} 失败` });
    } finally {
      setPullingModel(null);
      setPullProgress(null);
      progressCleanup();
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`确定要删除模型 ${modelName} 吗？`)) return;

    try {
      await window.electronAPI.ollama.deleteModel(modelName);
      addOllamaLog({ type: 'info', message: `模型 ${modelName} 已删除` });
      await loadOllamaModels();
    } catch (error) {
      addOllamaLog({ type: 'error', message: `删除模型 ${modelName} 失败` });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {ollamaModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOllamaModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-h-[90vh] w-[800px] overflow-hidden rounded-2xl"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-6"
              style={{ height: 56, borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'var(--primary-light)' }}
                >
                  <Activity size={20} style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Ollama 管理
                  </h2>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: ollamaStatus?.isRunning ? 'var(--toast-success-bg)' : 'var(--toast-error-bg)',
                        color: ollamaStatus?.isRunning ? 'var(--toast-success-text)' : 'var(--toast-error-text)',
                      }}
                    >
                      {ollamaStatus?.isRunning ? (
                        <>
                          <CheckCircle2 size={12} /> 运行中
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> 未运行
                        </>
                      )}
                    </span>
                    {ollamaStatus?.isRunning && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        端口: {ollamaStatus.port}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={checkOllamaStatus}
                  disabled={isChecking}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                  title="检查状态"
                >
                  <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setOllamaModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[calc(90vh-56px)] flex-col overflow-hidden">
              {/* Status Info */}
              <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
                {!ollamaStatus?.isRunning ? (
                  <div className="flex items-center gap-3 rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <AlertCircle size={24} style={{ color: 'var(--text-warning)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        未检测到 Ollama 服务
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        请在终端中运行 <code className="rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>ollama serve</code> 启动服务，然后点击右上角刷新按钮
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <CheckCircle2 size={24} style={{ color: 'var(--text-success)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Ollama 服务运行正常
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        服务地址: {config.host}:{config.port}
                      </p>
                    </div>
                  </div>
                )}

                {/* Config Toggle */}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  <Settings2 size={14} /> {showConfig ? '隐藏配置' : '显示配置'}
                </button>

                {/* Config Panel */}
                <AnimatePresence>
                  {showConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 grid grid-cols-2 gap-4"
                    >
                      <div>
                        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          主机地址
                        </label>
                        <input
                          type="text"
                          value={config.host}
                          onChange={(e) => setConfig({ ...config, host: e.target.value })}
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          端口
                        </label>
                        <input
                          type="number"
                          value={config.port}
                          onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Models List */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2">
                    <HardDrive size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      本地模型 ({ollamaModels.length})
                    </span>
                  </div>
                  <button
                    onClick={loadOllamaModels}
                    disabled={!ollamaStatus?.isRunning}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <RefreshCw size={14} /> 刷新列表
                  </button>
                </div>

                <div className="overflow-y-auto p-6">
                  {!ollamaStatus?.isRunning ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center">
                      <XCircle size={48} style={{ color: 'var(--text-tertiary)' }} className="mb-4 opacity-30" />
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        请先启动 Ollama 服务
                      </p>
                    </div>
                  ) : ollamaModels.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center">
                      <AlertCircle size={48} style={{ color: 'var(--text-tertiary)' }} className="mb-4 opacity-30" />
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        暂无模型，请在下方拉取模型
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {ollamaModels.map((model) => (
                        <motion.div
                          key={model.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg p-4"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                              </span>
                              <span
                                className="rounded px-1.5 py-0.5 text-xs"
                                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                              >
                                {model.details?.family || '未知'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteModel(model.name)}
                              className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              title="删除模型"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          
                          <div className="mb-2 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {model.details?.parameter_size && (
                              <span className="flex items-center gap-1">
                                <Zap size={10} /> {model.details.parameter_size}
                              </span>
                            )}
                            {model.size > 0 && (
                              <span className="flex items-center gap-1">
                                <HardDrive size={10} /> {formatSize(model.size)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {formatTime(model.modified_at)}
                            </span>
                          </div>

                          {model.details?.quantization_level && (
                            <div className="rounded-md px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                              量化: {model.details.quantization_level}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pull Model Panel */}
              <div className="border-t px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  拉取新模型
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入模型名称，例如: llama3.2"
                    className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={!ollamaStatus?.isRunning || pullingModel !== null}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="模型名称"]') as HTMLInputElement;
                      if (input?.value) {
                        handlePullModel(input.value);
                      }
                    }}
                    disabled={!ollamaStatus?.isRunning || pullingModel !== null}
                    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      backgroundColor: (ollamaStatus?.isRunning && pullingModel === null) ? 'var(--btn-primary-bg)' : 'var(--bg-tertiary)',
                      color: (ollamaStatus?.isRunning && pullingModel === null) ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
                    }}
                  >
                    <Download size={16} /> {pullingModel ? '拉取中...' : '拉取模型'}
                  </button>
                </div>

                {pullProgress && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-lg p-3"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{pullingModel}</span>
                      <span>{pullProgress.status || '拉取中...'}</span>
                    </div>
                    {pullProgress.completed !== undefined && pullProgress.total !== undefined && (
                      <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: 'var(--primary-color)' }}
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Logs Panel */}
              <div className="border-t px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    操作日志
                  </h3>
                  <button
                    onClick={() => setOllamaLogs([])}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    清空日志
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg p-3 text-xs" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  {ollamaLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>暂无日志</p>
                  ) : (
                    ollamaLogs.slice().reverse().map((log, index) => (
                      <div key={index} className="mb-1 flex items-start gap-2">
                        <span
                          className="rounded px-1.5 py-0.5"
                          style={{
                            backgroundColor:
                              log.type === 'error'
                                ? 'var(--toast-error-bg)'
                                : log.type === 'warning'
                                ? 'var(--toast-warning-bg)'
                                : 'var(--toast-success-bg)',
                            color:
                              log.type === 'error'
                                ? 'var(--toast-error-text)'
                                : log.type === 'warning'
                                ? 'var(--toast-warning-text)'
                                : 'var(--toast-success-text)',
                          }}
                        >
                          {log.type.toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
