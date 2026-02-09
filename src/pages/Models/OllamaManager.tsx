import { useState, useEffect } from 'react';
import {
  Play, Square, RefreshCw, Download, Trash2, Check, AlertCircle,
  Activity, HardDrive, Clock, Zap, Settings2, ChevronDown
} from 'lucide-react';
import { useStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import type { OllamaModel, OllamaPullProgress } from '@/shared/types/ollama';

export function OllamaManager() {
  const {
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

  useEffect(() => {
    checkOllamaStatus();
    
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
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const status = await window.electronAPI.ollama.checkStatus();
      setOllamaStatus(status);
      
      if (status.isRunning) {
        loadOllamaModels();
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: '检查 Ollama 状态失败' });
    }
  };

  const loadOllamaModels = async () => {
    try {
      const models = await window.electronAPI.ollama.getModels();
      setOllamaModels(models);
      addOllamaLog({ type: 'info', message: `加载了 ${models.length} 个 Ollama 模型` });
    } catch (error) {
      addOllamaLog({ type: 'error', message: '加载 Ollama 模型失败' });
    }
  };

  const handleStart = async () => {
    try {
      await window.electronAPI.ollama.start();
      addOllamaLog({ type: 'info', message: '正在启动 Ollama 服务...' });
      setTimeout(checkOllamaStatus, 3000);
    } catch (error) {
      addOllamaLog({ type: 'error', message: '启动 Ollama 服务失败' });
    }
  };

  const handleStop = async () => {
    try {
      await window.electronAPI.ollama.stop();
      addOllamaLog({ type: 'info', message: '正在停止 Ollama 服务...' });
      setTimeout(checkOllamaStatus, 2000);
    } catch (error) {
      addOllamaLog({ type: 'error', message: '停止 Ollama 服务失败' });
    }
  };

  const handleRestart = async () => {
    try {
      await window.electronAPI.ollama.restart();
      addOllamaLog({ type: 'info', message: '正在重启 Ollama 服务...' });
      setTimeout(checkOllamaStatus, 5000);
    } catch (error) {
      addOllamaLog({ type: 'error', message: '重启 Ollama 服务失败' });
    }
  };

  const handlePullModel = async (modelName: string) => {
    setPullingModel(modelName);
    setPullProgress(null);

    const progressCleanup = window.electronAPI.ollama.onPullProgress((progress) => {
      setPullProgress(progress);
      addOllamaLog({ type: 'info', message: `拉取模型: ${progress.status}` });
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
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-6"
        style={{ height: 56, borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ollama 管理
          </h1>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              backgroundColor: ollamaStatus?.isRunning ? 'var(--toast-success-bg)' : 'var(--toast-error-bg)',
              color: ollamaStatus?.isRunning ? 'var(--toast-success-text)' : 'var(--toast-error-text)',
            }}
          >
            {ollamaStatus?.isRunning ? '运行中' : '未运行'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkOllamaStatus}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} /> 刷新状态
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            <Settings2 size={14} /> 配置
          </button>
        </div>
      </header>

      {/* Config Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b px-6 py-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="grid grid-cols-2 gap-4">
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
                    backgroundColor: 'var(--bg-primary)',
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
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => {
                window.electronAPI.ollama.updateConfig(config);
                setShowConfig(false);
              }}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
            >
              保存配置
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Card */}
      <div className="mx-6 mt-6 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: ollamaStatus?.isRunning ? 'var(--toast-success-bg)' : 'var(--toast-error-bg)',
              }}
            >
              <Activity
                size={24}
                style={{ color: ollamaStatus?.isRunning ? 'var(--toast-success-text)' : 'var(--toast-error-text)' }}
              />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {ollamaStatus?.isRunning ? 'Ollama 服务运行中' : 'Ollama 服务未运行'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {ollamaStatus?.isRunning ? `端口: ${ollamaStatus.port}` : '点击下方按钮启动服务'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!ollamaStatus?.isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                style={{ backgroundColor: 'var(--btn-success-bg)', color: 'var(--btn-success-text)' }}
              >
                <Play size={16} /> 启动服务
              </button>
            ) : (
              <>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)' }}
                >
                  <Square size={16} /> 停止服务
                </button>
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
                >
                  <RefreshCw size={16} /> 重启服务
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Models List */}
      <div className="mx-6 mt-6 flex-1 overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
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
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            <RefreshCw size={14} /> 刷新列表
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {ollamaModels.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <AlertCircle size={48} style={{ color: 'var(--text-tertiary)' }} className="mb-4 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {ollamaStatus?.isRunning ? '暂无模型，请拉取模型' : '请先启动 Ollama 服务'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ollamaModels.map((model) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
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
                      
                      <div className="mb-3 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {model.details?.parameter_size && (
                          <span className="flex items-center gap-1">
                            <Zap size={12} /> {model.details.parameter_size}
                          </span>
                        )}
                        {model.size > 0 && (
                          <span className="flex items-center gap-1">
                            <HardDrive size={12} /> {formatSize(model.size)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {formatTime(model.modified_at)}
                        </span>
                      </div>

                      {model.details?.quantization_level && (
                        <div className="mb-3 rounded-md px-2 py-1 text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                          量化: {model.details.quantization_level}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteModel(model.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="删除模型"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pull Model Panel */}
      <div className="mx-6 mt-6 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          拉取新模型
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入模型名称，例如: llama3.2"
            className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-primary)',
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
            className="mt-4 rounded-lg p-4"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                正在拉取: {pullingModel}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {pullProgress.status}
              </span>
            </div>
            {pullProgress.total && pullProgress.completed !== undefined && (
              <div className="mb-2">
                <div className="mb-1 flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>进度</span>
                  <span>
                    {formatSize(pullProgress.completed)} / {formatSize(pullProgress.total)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  />
                </div>
              </div>
            )}
            {pullProgress.digest && (
              <div className="rounded-md px-2 py-1 text-xs font-mono" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                {pullProgress.digest}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Logs Panel */}
      <div className="mx-6 mt-6 rounded-xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            操作日志
          </h3>
          <button
            onClick={() => addOllamaLog({ type: 'info', message: '日志已清空' })}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            清空
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {ollamaLogs.length === 0 ? (
            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              暂无日志
            </p>
          ) : (
            ollamaLogs.slice().reverse().map((log, idx) => (
              <div
                key={idx}
                className="mb-2 flex items-start gap-2 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="mt-0.5 min-w-[60px] rounded px-1.5 py-0.5 text-center font-mono"
                  style={{
                    backgroundColor: log.type === 'error' ? 'var(--toast-error-bg)' : 'var(--toast-info-bg)',
                    color: log.type === 'error' ? 'var(--toast-error-text)' : 'var(--toast-info-text)',
                  }}
                >
                  {log.type.toUpperCase()}
                </span>
                <span className="flex-1">{log.message}</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
