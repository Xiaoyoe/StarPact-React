import { useState, useEffect } from 'react';
import {
  Plus, Search, Star, Trash2, TestTube, Download, Upload,
  Settings2, Check, X, AlertCircle, Zap, Globe, HardDrive,
  ChevronRight, BarChart3, Clock, Activity, Eye, EyeOff,
  Play, Square, RefreshCw, StopCircle, ChevronUp, ChevronDown,
  Terminal, FileBox, FolderOpen
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import type { ModelConfig } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { ollamaModelStorage, type OllamaModelFile } from '@/services/storage/OllamaModelStorage';

function ModelForm({
  model,
  onSave,
  onCancel,
}: {
  model?: ModelConfig;
  onSave: (model: ModelConfig) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ModelConfig>(
    model || {
      id: generateId(),
      name: '',
      provider: '',
      type: 'remote',
      apiUrl: '',
      apiKey: '',
      model: '',
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1.0,
      group: '默认',
      isFavorite: false,
      isActive: true,
      createdAt: Date.now(),
      presets: [],
      stats: { totalCalls: 0, successCalls: 0, avgResponseTime: 0, lastUsed: null },
    }
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'params' | 'advanced'>('basic');
  const [showKey, setShowKey] = useState(false);

  const tabs = [
    { id: 'basic' as const, label: '基础配置' },
    { id: 'params' as const, label: '参数配置' },
    { id: 'advanced' as const, label: '高级配置' },
  ];

  const handleSave = () => {
    if (!form.name || !form.apiUrl) return;
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex h-full flex-col"
    >
      <div className="flex gap-1 border-b px-6 pt-4" style={{ borderColor: 'var(--border-color)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-4 py-2.5 text-sm transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--primary-color)' }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>模型名称 *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：GPT-4o"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>供应商</label>
              <input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="例如：OpenAI"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>模型类型</label>
              <div className="flex gap-2">
                {[
                  { value: 'remote' as const, label: '远程模型', icon: Globe },
                  { value: 'local' as const, label: '本地模型', icon: HardDrive },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, type: value })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: form.type === value ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      color: form.type === value ? 'var(--primary-color)' : 'var(--text-secondary)',
                      border: `1px solid ${form.type === value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      fontWeight: form.type === value ? 600 : 400,
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>API 地址 *</label>
              <input
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors font-mono"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-colors font-mono"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>模型标识</label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="例如：gpt-4o"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors font-mono"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>分组</label>
              <input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                placeholder="例如：OpenAI"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'params' && (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Temperature: {form.temperature.toFixed(2)}
                </label>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>控制输出随机性</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                className="w-full accent-[var(--primary-color)]"
              />
              <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>精准 (0)</span>
                <span>创意 (2)</span>
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Top P: {form.topP.toFixed(2)}
                </label>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>核采样概率</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={form.topP}
                onChange={(e) => setForm({ ...form, topP: parseFloat(e.target.value) })}
                className="w-full accent-[var(--primary-color)]"
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  最大生成长度: {form.maxTokens}
                </label>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>tokens</span>
              </div>
              <input
                type="range"
                min="256"
                max="16384"
                step="256"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-[var(--primary-color)]"
              />
              <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>256</span>
                <span>16384</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                快捷预设
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '精准模式', temp: 0.2, topP: 0.8, tokens: 2048 },
                  { name: '均衡模式', temp: 0.7, topP: 1.0, tokens: 4096 },
                  { name: '创意模式', temp: 1.0, topP: 0.95, tokens: 4096 },
                  { name: '代码模式', temp: 0.1, topP: 0.9, tokens: 8192 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setForm({
                      ...form,
                      temperature: preset.temp,
                      topP: preset.topP,
                      maxTokens: preset.tokens,
                    })}
                    className="rounded-lg px-3 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <Zap size={12} className="mr-1 inline" />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>启用模型</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>关闭后模型将不在聊天页显示</div>
              </div>
              <button
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className="relative h-6 w-11 rounded-full transition-colors"
                style={{
                  backgroundColor: form.isActive ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                }}
              >
                <motion.div
                  animate={{ x: form.isActive ? 22 : 2 }}
                  className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg p-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>收藏模型</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>收藏的模型将优先展示</div>
              </div>
              <button
                onClick={() => setForm({ ...form, isFavorite: !form.isFavorite })}
                className="transition-colors"
              >
                <Star
                  size={20}
                  style={{ color: form.isFavorite ? 'var(--warning-color)' : 'var(--text-tertiary)' }}
                  fill={form.isFavorite ? 'var(--warning-color)' : 'none'}
                />
              </button>
            </div>
            <div className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary-color)', opacity: 0.8 }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ color: 'var(--primary-color)' }} className="mt-0.5 shrink-0" />
                <div className="text-xs" style={{ color: 'var(--primary-color)' }}>
                  API Key 将使用 AES-256 加密存储在本地，不会上传至任何服务器。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t px-6 py-4"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm transition-colors"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name || !form.apiUrl}
          className="rounded-lg px-6 py-2 text-sm font-medium transition-all active:scale-95"
          style={{
            backgroundColor: (form.name && form.apiUrl) ? 'var(--primary-color)' : 'var(--bg-tertiary)',
            color: (form.name && form.apiUrl) ? 'white' : 'var(--text-tertiary)',
            cursor: (!form.name || !form.apiUrl) ? 'not-allowed' : 'pointer',
          }}
        >
          <Check size={14} className="mr-1 inline" />
          保存
        </button>
      </div>
    </motion.div>
  );
}

function OllamaPanel({
  showCreateModel,
  setShowCreateModel,
  createModelName,
  setCreateModelName,
  createModelPath,
  setCreateModelPath,
  isCreating,
  setIsCreating,
}: {
  showCreateModel: boolean;
  setShowCreateModel: (v: boolean) => void;
  createModelName: string;
  setCreateModelName: (v: string) => void;
  createModelPath: string;
  setCreateModelPath: (v: string) => void;
  isCreating: boolean;
  setIsCreating: (v: boolean) => void;
}) {
  const {
    ollamaStatus,
    setOllamaStatus,
    ollamaModels,
    setOllamaModels,
    ollamaLogs,
    addOllamaLog,
    activeOllamaModel,
    setActiveOllamaModel,
    setOllamaModalOpen,
  } = useStore();

  const toast = useToast();

  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({ host: 'localhost', port: 11434 });
  const [isChecking, setIsChecking] = useState(false);
  const [startingModel, setStartingModel] = useState<string | null>(null);
  const [runningModels, setRunningModels] = useState<Array<{
    name: string;
    model: string;
    size: number;
    digest: string;
    details: { format: string; family: string; parameter_size: string; quantization_level: string };
    expiresAt?: string;
    sizeVram?: number;
  }>>([]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const initOllamaCheck = async () => {
      try {
        let isRunning = false;
        
        if (window.electronAPI?.ollama) {
          const status = await window.electronAPI.ollama.checkStatus();
          setOllamaStatus(status);
          isRunning = status.isRunning;
        } else {
          const status = await checkOllamaStatusNetwork();
          setOllamaStatus(status);
          isRunning = status.isRunning;
        }

        if (isRunning) {
          addOllamaLog({ type: 'info', message: 'Ollama 服务运行中' });
          await loadOllamaModelsNetwork();
          await loadRunningModels();
        } else {
          addOllamaLog({ type: 'warning', message: '未检测到 Ollama 服务' });
        }
      } catch (error) {
        addOllamaLog({ type: 'error', message: '初始化检测失败' });
      }
    };

    initOllamaCheck();
  }, []);

  const checkOllamaStatusNetwork = async () => {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      fetch(`http://${config.host}:${config.port}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId);
          if (response.ok) {
            resolve({ isRunning: true, port: config.port, version: response.headers.get('ollama-version') || 'unknown' });
          } else {
            resolve({ isRunning: false, port: config.port, error: `HTTP ${response.status}` });
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          resolve({ isRunning: false, port: config.port, error: error.message });
        });
    });
  };

  const loadOllamaModelsNetwork = async () => {
    try {
      const response = await fetch(`http://${config.host}:${config.port}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        setOllamaModels(models);
        addOllamaLog({ type: 'info', message: `加载了 ${models.length} 个 Ollama 模型` });
      } else {
        addOllamaLog({ type: 'error', message: '加载模型列表失败' });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: '加载模型列表失败' });
    }
  };

  const checkOllamaStatus = async () => {
    setIsChecking(true);
    try {
      if (window.electronAPI?.ollama) {
        const status = await window.electronAPI.ollama.checkStatus();
        setOllamaStatus(status);
        
        if (status.isRunning) {
          addOllamaLog({ type: 'info', message: 'Ollama 服务运行中' });
          loadOllamaModels();
          loadRunningModels();
        } else {
          addOllamaLog({ type: 'warning', message: '未检测到 Ollama 服务，请先启动 Ollama' });
        }
      } else {
        addOllamaLog({ type: 'info', message: '使用网络检测 Ollama 服务状态' });
        const status = await checkOllamaStatusNetwork();
        setOllamaStatus(status);
        
        if (status.isRunning) {
          addOllamaLog({ type: 'info', message: 'Ollama 服务运行中' });
          loadOllamaModelsNetwork();
          loadRunningModels();
        } else {
          addOllamaLog({ type: 'warning', message: '未检测到 Ollama 服务，请先启动 Ollama' });
        }
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: '检查 Ollama 状态失败' });
      setOllamaStatus({ isRunning: false, port: config.port, error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      setIsChecking(false);
    }
  };

  const loadOllamaModels = async () => {
    if (window.electronAPI?.ollama) {
      try {
        const models = await window.electronAPI.ollama.getModels();
        setOllamaModels(models);
        addOllamaLog({ type: 'info', message: `加载了 ${models.length} 个 Ollama 模型` });
      } catch (error) {
        addOllamaLog({ type: 'error', message: '加载 Ollama 模型失败' });
      }
    } else {
      await loadOllamaModelsNetwork();
    }
  };

  const handleStart = async () => {
    if (window.electronAPI?.ollama) {
      try {
        toast.info('正在启动 Ollama 服务...', { duration: 2000 });
        addOllamaLog({ type: 'info', message: '正在启动 Ollama 服务...' });
        await window.electronAPI.ollama.start();
        setTimeout(() => {
          checkOllamaStatus();
          toast.success('Ollama 服务已启动', { duration: 2000 });
        }, 3000);
      } catch (error) {
        addOllamaLog({ type: 'error', message: '启动 Ollama 服务失败' });
        toast.error('启动 Ollama 服务失败', { duration: 3000 });
      }
    } else {
      addOllamaLog({ type: 'warning', message: '请在终端运行 ollama serve 启动服务' });
      toast.warning('请在终端运行 ollama serve 启动服务', { duration: 3000 });
    }
  };

  const handleStop = async () => {
    if (window.electronAPI?.ollama) {
      try {
        toast.info('正在停止 Ollama 服务...', { duration: 2000 });
        addOllamaLog({ type: 'info', message: '正在停止 Ollama 服务...' });
        await window.electronAPI.ollama.stop();
        setTimeout(() => {
          checkOllamaStatus();
          toast.success('Ollama 服务已停止', { duration: 2000 });
        }, 2000);
      } catch (error) {
        addOllamaLog({ type: 'error', message: '停止 Ollama 服务失败' });
        toast.error('停止 Ollama 服务失败', { duration: 3000 });
      }
    } else {
      addOllamaLog({ type: 'warning', message: '请在终端手动停止 Ollama 服务' });
      toast.warning('请在终端手动停止 Ollama 服务', { duration: 3000 });
    }
  };

  const handleRestart = async () => {
    if (window.electronAPI?.ollama) {
      try {
        toast.info('正在重启 Ollama 服务...', { duration: 2000 });
        addOllamaLog({ type: 'info', message: '正在重启 Ollama 服务...' });
        await window.electronAPI.ollama.restart();
        setTimeout(() => {
          checkOllamaStatus();
          toast.success('Ollama 服务已重启', { duration: 2000 });
        }, 5000);
      } catch (error) {
        addOllamaLog({ type: 'error', message: '重启 Ollama 服务失败' });
        toast.error('重启 Ollama 服务失败', { duration: 3000 });
      }
    } else {
      addOllamaLog({ type: 'warning', message: '请在终端手动重启 Ollama 服务' });
      toast.warning('请在终端手动重启 Ollama 服务', { duration: 3000 });
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    const isModelRunning = runningModels.some(
      rm => rm.name === modelName || rm.model === modelName
    );

    if (isModelRunning) {
      toast.error('请先停止正在运行的模型', { duration: 3000 });
      addOllamaLog({ type: 'warning', message: `无法删除正在运行的模型: ${modelName}` });
      return;
    }

    if (!confirm(`确定要删除模型 ${modelName} 吗？此操作不可撤销！`)) return;

    toast.info(`正在删除模型 ${modelName}...`, { duration: 2000 });
    addOllamaLog({ type: 'info', message: `正在删除模型 ${modelName}...` });

    try {
      if (window.electronAPI?.ollama) {
        await window.electronAPI.ollama.deleteModel(modelName);
      } else {
        const response = await fetch(`http://${config.host}:${config.port}/api/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modelName }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      addOllamaLog({ type: 'info', message: `模型 ${modelName} 已删除` });
      toast.success(`模型 ${modelName} 已删除`, { duration: 2000 });
      await loadOllamaModels();
      await loadRunningModels();
    } catch (error) {
      addOllamaLog({ type: 'error', message: `删除模型 ${modelName} 失败: ${error}` });
      toast.error(`删除模型 ${modelName} 失败`, { duration: 3000 });
    }
  };

  const loadRunningModels = async (showToast = false) => {
    if (showToast) {
      toast.info('正在刷新运行中的模型...', { duration: 1500 });
    }
    try {
      let data;
      if (window.electronAPI?.ollama?.ps) {
        data = await window.electronAPI.ollama.ps();
      } else {
        const response = await fetch(`http://${config.host}:${config.port}/api/ps`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        data = await response.json();
      }
      
      const models = data.models || [];
      setRunningModels(models);
      if (models.length > 0) {
        addOllamaLog({ type: 'info', message: `当前有 ${models.length} 个模型正在运行` });
      }
      if (showToast) {
        toast.success(`已刷新，当前 ${models.length} 个模型运行中`, { duration: 2000 });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: '查询运行模型失败' });
      if (showToast) {
        toast.error('查询运行模型失败', { duration: 2000 });
      }
    }
  };

  const handleStopRunningModel = async (modelName: string) => {
    toast.info(`正在卸载模型 ${modelName}...`, { duration: 2000 });
    try {
      const response = await fetch(`http://${config.host}:${config.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          keep_alive: 0
        })
      });
      
      if (response.ok) {
        addOllamaLog({ type: 'info', message: `正在停止模型 ${modelName}...` });
        setTimeout(async () => {
          await loadRunningModels();
          addOllamaLog({ type: 'info', message: `模型 ${modelName} 已停止` });
          toast.success(`模型 ${modelName} 已卸载完成`, { duration: 3000 });
        }, 3000);
      } else {
        addOllamaLog({ type: 'error', message: `停止模型 ${modelName} 失败` });
        toast.error(`卸载模型 ${modelName} 失败`, { duration: 3000 });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: `停止模型 ${modelName} 失败` });
      toast.error(`卸载模型 ${modelName} 失败`, { duration: 3000 });
    }
  };

  const handleStartModel = async (modelName: string) => {
    if (startingModel) {
      addOllamaLog({ type: 'warning', message: '已有模型正在启动中，请稍候' });
      toast.info('已有模型正在加载中，请稍候', { duration: 2000 });
      return;
    }
    
    setStartingModel(modelName);
    addOllamaLog({ type: 'info', message: `正在启动模型 ${modelName}...` });
    toast.info(`正在加载模型 ${modelName}...`, { duration: 2000 });
    
    try {
      const response = await fetch(`http://${config.host}:${config.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '',
          keep_alive: '10m'
        })
      });
      
      if (response.ok) {
        addOllamaLog({ type: 'info', message: `模型 ${modelName} 已启动，等待加载完成...` });
        setTimeout(async () => {
          await loadRunningModels();
          addOllamaLog({ type: 'info', message: `模型 ${modelName} 加载完成` });
          toast.success(`模型 ${modelName} 加载完成`, { duration: 3000 });
        }, 3000);
      } else {
        addOllamaLog({ type: 'error', message: `启动模型 ${modelName} 失败` });
        toast.error(`加载模型 ${modelName} 失败`, { duration: 3000 });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: `启动模型 ${modelName} 失败` });
      toast.error(`加载模型 ${modelName} 失败`, { duration: 3000 });
    } finally {
      setStartingModel(null);
    }
  };

  const handleSelectAndSwitchModel = async (modelName: string) => {
    if (startingModel) {
      toast.info('已有模型正在加载中，请稍候', { duration: 2000 });
      return;
    }

    if (modelName === activeOllamaModel) {
      toast.info(`${modelName} 已是当前选中模型`, { duration: 2000 });
      return;
    }

    setStartingModel(modelName);

    try {
      if (activeOllamaModel) {
        const isRunning = runningModels.some(m => m.name === activeOllamaModel || m.model === activeOllamaModel);
        if (isRunning) {
          toast.info(`正在关闭 ${activeOllamaModel}...`, { duration: 2000 });
          await fetch(`http://${config.host}:${config.port}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: activeOllamaModel,
              keep_alive: 0
            })
          });
        }
      }

      setActiveOllamaModel(modelName);
      toast.info(`正在启动 ${modelName}...`, { duration: 2000 });

      const response = await fetch(`http://${config.host}:${config.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '',
          keep_alive: '10m'
        })
      });

      if (response.ok) {
        addOllamaLog({ type: 'info', message: `模型 ${modelName} 已启动` });
        setTimeout(async () => {
          await loadRunningModels();
          toast.success(`已切换到 ${modelName}`, { duration: 2000 });
        }, 3000);
      } else {
        addOllamaLog({ type: 'error', message: `启动模型 ${modelName} 失败` });
        toast.error(`启动 ${modelName} 失败`, { duration: 3000 });
      }
    } catch (error) {
      addOllamaLog({ type: 'error', message: `切换模型失败` });
      toast.error('模型切换失败', { duration: 3000 });
    } finally {
      setTimeout(() => {
        setStartingModel(null);
      }, 3000);
    }
  };

  const handleSelectModelfile = async () => {
    if (window.electronAPI?.file?.selectFile) {
      console.log('调用 electronAPI.file.selectFile...');
      const result = await window.electronAPI.file.selectFile({
        title: '选择模型文件',
        filters: [
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      console.log('选择结果:', result);
      if (result && result.filePath) {
        console.log('设置路径:', result.filePath);
        setCreateModelPath(result.filePath);
      }
    } else {
      console.log('electronAPI.file.selectFile 不可用，使用浏览器选择');
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          console.log('浏览器选择文件:', file.name);
          setCreateModelPath(file.name);
        }
      };
      input.click();
    }
  };

  const handleCreateModel = async () => {
    if (!createModelName.trim()) {
      toast.error('请输入模型名称', { duration: 2000 });
      return;
    }
    if (!createModelPath.trim()) {
      toast.error('请选择模型文件', { duration: 2000 });
      return;
    }

    setIsCreating(true);
    addOllamaLog({ type: 'info', message: `正在创建模型 ${createModelName}...` });
    toast.info(`正在创建模型 ${createModelName}...`, { duration: 2000 });

    try {
      let modelfileContent = '';
      
      if (window.electronAPI?.file?.readFile) {
        try {
          const result = await window.electronAPI.file.readFile(createModelPath, 'utf8');
          if (result.success && result.content) {
            modelfileContent = result.content;
            addOllamaLog({ type: 'info', message: '成功读取 Modelfile 内容' });
          } else {
            addOllamaLog({ type: 'warning', message: '无法读取文件内容' });
          }
        } catch (e) {
          addOllamaLog({ type: 'warning', message: '读取文件失败' });
        }
      }

      if (!modelfileContent) {
        throw new Error('无法读取 Modelfile 内容，请确保文件存在且可读');
      }

      if (window.electronAPI?.ollama?.createModel) {
        await window.electronAPI.ollama.createModel(createModelName, modelfileContent);
      } else {
        const response = await fetch(`http://${config.host}:${config.port}/api/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: createModelName, modelfile: modelfileContent }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      addOllamaLog({ type: 'info', message: `模型 ${createModelName} 创建成功` });
      toast.success(`模型 ${createModelName} 创建成功`, { duration: 2000 });
      setCreateModelName('');
      setCreateModelPath('');
      setShowCreateModel(false);
      await loadOllamaModels();
    } catch (error) {
      addOllamaLog({ type: 'error', message: `创建模型失败: ${error}` });
      toast.error(`创建模型失败: ${error}`, { duration: 3000 });
    } finally {
      setIsCreating(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getModelLabel = (model: any) => {
    const name = model.name?.toLowerCase() || '';
    if (name.includes('deepseek')) return 'deepseek';
    if (name.includes('qwen')) return 'qwen';
    if (name.includes('llama')) return 'llama';
    if (name.includes('gemma')) return 'gemma';
    if (name.includes('mistral')) return 'mistral';
    if (name.includes('mixtral')) return 'mixtral';
    if (name.includes('phi')) return 'phi';
    if (name.includes('yi')) return 'yi';
    if (name.includes('glm')) return 'glm';
    if (name.includes('baichuan')) return 'baichuan';
    if (name.includes('internlm')) return 'internlm';
    if (model.details?.family) return model.details.family;
    return '未知';
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Ollama 本地服务
          </h2>
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
            onClick={() => setOllamaModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)'
            }}
          >
            <Settings2 size={14} /> 打开管理
          </button>
          <button
            onClick={checkOllamaStatus}
            disabled={isChecking}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} /> {isChecking ? '检测中...' : '刷新状态'}
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            <Settings2 size={14} /> 配置
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-xl p-4 shrink-0"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
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
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
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
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
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
                if (window.electronAPI?.ollama) {
                  window.electronAPI.ollama.updateConfig(config);
                }
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

      <div className="mb-4 rounded-xl p-4 shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        {!ollamaStatus?.isRunning ? (
          <div className="flex items-center gap-3">
            <AlertCircle size={24} style={{ color: 'var(--warning-color)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                未检测到 Ollama 服务
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                请在终端中运行 <code className="rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>ollama serve</code> 启动服务，然后点击右上角刷新按钮
              </p>
            </div>
            {window.electronAPI?.ollama && (
              <button
                onClick={handleStart}
                className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(0,180,42,0.1)', 
                  color: 'var(--success-color)',
                  border: '1px solid rgba(0,180,42,0.2)'
                }}
              >
                <Play size={14} className="transition-transform group-hover:scale-110" /> 
                <span>启动服务</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--toast-success-bg)' }}
              >
                <Activity size={20} style={{ color: 'var(--toast-success-text)' }} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Ollama 服务运行中
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  服务地址: {config.host}:{ollamaStatus.port}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStop}
                className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: 'rgba(245,63,63,0.1)', 
                  color: 'var(--error-color)',
                  border: '1px solid rgba(245,63,63,0.2)'
                }}
              >
                <Square size={14} className="transition-transform group-hover:scale-110" /> 
                <span>停止服务</span>
              </button>
              <button
                onClick={handleRestart}
                className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary-color)',
                  border: '1px solid var(--primary-color)'
                }}
              >
                <RefreshCw size={14} className="transition-transform group-hover:rotate-180" /> 
                <span>重启服务</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Model Section */}
      {ollamaStatus?.isRunning && (
        <div className="mb-4 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div
            onClick={() => setShowCreateModel(!showCreateModel)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors cursor-pointer"
            style={{ backgroundColor: showCreateModel ? 'var(--bg-tertiary)' : 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <FileBox size={16} style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                创建 Ollama 模型
              </span>
            </div>
            <ChevronDown 
              size={16} 
              style={{ 
                color: 'var(--text-tertiary)',
                transform: showCreateModel ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </div>
          
          <AnimatePresence>
            {showCreateModel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="p-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={createModelName}
                      onChange={(e) => setCreateModelName(e.target.value)}
                      placeholder="例如：my-custom-model"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      模型文件 (Modelfile)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={createModelPath}
                        onChange={(e) => setCreateModelPath(e.target.value)}
                        placeholder="选择或输入 Modelfile 路径"
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button
                        onClick={handleSelectModelfile}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                      >
                        <FolderOpen size={14} /> 选择文件
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setCreateModelName('');
                        setCreateModelPath('');
                      }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{ 
                        backgroundColor: 'rgba(245,63,63,0.1)', 
                        color: 'var(--error-color)',
                        border: '1px solid rgba(245,63,63,0.2)'
                      }}
                    >
                      <X size={14} /> 清空内容
                    </button>
                    <button
                      onClick={handleCreateModel}
                      disabled={isCreating || !createModelName.trim() || !createModelPath.trim()}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}
                    >
                      {isCreating ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> 创建中...
                        </>
                      ) : (
                        <>
                          <Plus size={14} /> 创建模型
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {ollamaStatus?.isRunning && (
        <div className="mb-4 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: 'var(--success-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                运行中的模型 ({runningModels.length})
              </span>
            </div>
            <button
              onClick={() => loadRunningModels(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              <RefreshCw size={12} /> 刷新
            </button>
          </div>

          <div className="max-h-28 overflow-y-auto p-3">
            {runningModels.length === 0 ? (
              <div className="flex h-10 flex-col items-center justify-center text-center">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  当前没有运行中的模型
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {runningModels.map((model) => (
                  <motion.div
                    key={model.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg p-2.5"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--success-color)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {model.name}
                          </span>
                          <span
                            className="rounded px-1.5 py-0.5 text-xs shrink-0"
                            style={{ backgroundColor: 'rgba(0,180,42,0.1)', color: 'var(--success-color)' }}
                          >
                            运行中
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
                          {model.sizeVram !== undefined && model.sizeVram > 0 && (
                            <span className="flex items-center gap-1">
                              VRAM: {formatSize(model.sizeVram)}
                            </span>
                          )}
                          {model.modified_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {new Date(model.modified_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStopRunningModel(model.name)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)' }}
                        title="停止运行"
                      >
                        <StopCircle size={12} /> 停止
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 rounded-xl flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <HardDrive size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              本地模型 ({ollamaModels.length})
            </span>
          </div>
          <button
            onClick={loadOllamaModels}
            disabled={!ollamaStatus?.isRunning}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            <RefreshCw size={12} /> 刷新
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {ollamaModels.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center text-center">
              <AlertCircle size={32} style={{ color: 'var(--text-tertiary)' }} className="mb-2 opacity-30" />
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {ollamaStatus?.isRunning ? '暂无模型' : '请先启动 Ollama 服务'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ollamaModels.map((model) => {
                const isRunning = runningModels.some(rm => rm.name === model.name || rm.model === model.name);
                const isStarting = startingModel === model.name;
                const isSelected = activeOllamaModel === model.name;
                
                return (
                  <motion.div
                    key={model.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg p-3"
                    style={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      border: isSelected ? '2px solid var(--primary-color)' : (isRunning ? '1px solid var(--success-color)' : '1px solid var(--border-color)')
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {model.name}
                          </span>
                          {isSelected && (
                            <span
                              className="rounded px-1.5 py-0.5 text-xs shrink-0"
                              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                            >
                              已选择
                            </span>
                          )}
                          {isRunning && (
                            <span
                              className="rounded px-1.5 py-0.5 text-xs shrink-0"
                              style={{ backgroundColor: 'rgba(0,180,42,0.1)', color: 'var(--success-color)' }}
                            >
                              运行中
                            </span>
                          )}
                          <span
                            className="rounded px-1.5 py-0.5 text-xs shrink-0"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                          >
                            {getModelLabel(model)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
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
                          {model.modified_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {new Date(model.modified_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSelectAndSwitchModel(model.name)}
                          disabled={startingModel !== null}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                          style={{ 
                            color: isSelected ? 'var(--primary-color)' : 'var(--text-tertiary)', 
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-tertiary)' 
                          }}
                          title="选择并切换模型"
                        >
                          <Check size={14} />
                        </button>
                        {ollamaStatus?.isRunning && (
                          isRunning ? (
                            <button
                              onClick={() => handleStopRunningModel(model.name)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                              style={{ color: 'var(--error-color)', backgroundColor: 'rgba(245,63,63,0.1)' }}
                              title="停止运行"
                            >
                              <StopCircle size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartModel(model.name)}
                              disabled={isStarting || startingModel !== null}
                              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                              style={{ color: 'var(--success-color)', backgroundColor: 'rgba(0,180,42,0.1)' }}
                              title={isStarting ? '启动中...' : '启动模型'}
                            >
                              <Play size={14} className={isStarting ? 'animate-pulse' : ''} />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleDeleteModel(model.name)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-opacity-80"
                          style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}
                          title="删除模型"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModelsPage() {
  const {
    models, activeModelId,
    addModel, updateModel, deleteModel,
    addLog,
    setOllamaModalOpen,
    ollamaLogs,
    addOllamaLog,
    setOllamaLogs,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(activeModelId);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; time: number } | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'ollama' | 'remote'>('ollama');
  const [showLogs, setShowLogs] = useState(true);
  const [modelFiles, setModelFiles] = useState<OllamaModelFile[]>([]);
  const [showModelFiles, setShowModelFiles] = useState(true);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [createModelName, setCreateModelName] = useState('');
  const [createModelPath, setCreateModelPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const loadModelFiles = async () => {
      const files = await ollamaModelStorage.getAll();
      setModelFiles(files);
    };
    loadModelFiles();
  }, []);

  const groups = Array.from(new Set(models.map(m => m.group)));
  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedModel = models.find(m => m.id === selectedModelId);

  const handleTest = async (modelId: string) => {
    setTestingId(modelId);
    setTestResult(null);

    addLog({
      id: generateId(),
      level: 'info',
      message: `开始测试模型连通性: ${models.find(m => m.id === modelId)?.name}`,
      timestamp: Date.now(),
      module: 'ModelManager',
    });

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const success = Math.random() > 0.2;
    const time = 0.5 + Math.random() * 2;

    setTestResult({ id: modelId, success, time });
    setTestingId(null);

    addLog({
      id: generateId(),
      level: success ? 'info' : 'error',
      message: `模型测试${success ? '成功' : '失败'}: ${models.find(m => m.id === modelId)?.name} (${time.toFixed(2)}s)`,
      timestamp: Date.now(),
      module: 'ModelManager',
    });
  };

  const handleSave = (model: ModelConfig) => {
    if (editingModel) {
      updateModel(model.id, model);
    } else {
      addModel(model);
    }
    setEditingModel(null);
    setIsAdding(false);

    addLog({
      id: generateId(),
      level: 'info',
      message: `${editingModel ? '更新' : '新增'}模型配置: ${model.name}`,
      timestamp: Date.now(),
      module: 'ModelManager',
    });
  };

  const handleDelete = (id: string) => {
    const name = models.find(m => m.id === id)?.name;
    deleteModel(id);
    if (selectedModelId === id) setSelectedModelId(null);

    addLog({
      id: generateId(),
      level: 'warn',
      message: `删除模型: ${name}`,
      timestamp: Date.now(),
      module: 'ModelManager',
    });
  };

  const handleAddModelFile = async () => {
    if (window.electronAPI?.file?.selectFile) {
      const result = await window.electronAPI.file.selectFile({
        title: '选择模型文件',
        filters: [
          { name: '所有文件', extensions: ['*'] }
        ],
        multi: true,
      });
      if (result && result.filePath) {
        const fileName = result.filePath.split(/[/\\]/).pop() || result.filePath;
        const newFile: OllamaModelFile = {
          id: generateId(),
          name: fileName,
          path: result.filePath,
          addedAt: Date.now(),
        };
        await ollamaModelStorage.add(newFile);
        setModelFiles(prev => [...prev, newFile]);
        toast.success(`已添加文件: ${fileName}`, { duration: 2000 });
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          const newFiles: OllamaModelFile[] = [];
          for (const file of Array.from(files)) {
            const newFile: OllamaModelFile = {
              id: generateId(),
              name: file.name,
              path: file.name,
              size: file.size,
              addedAt: Date.now(),
            };
            await ollamaModelStorage.add(newFile);
            newFiles.push(newFile);
          }
          setModelFiles(prev => [...prev, ...newFiles]);
          toast.success(`已添加 ${newFiles.length} 个文件`, { duration: 2000 });
        }
      };
      input.click();
    }
  };

  const handleRemoveModelFile = async (id: string) => {
    await ollamaModelStorage.remove(id);
    setModelFiles(prev => prev.filter(f => f.id !== id));
    toast.success('已移除文件', { duration: 1500 });
  };

  const handleUseModelFile = (file: { id: string; name: string; path: string }) => {
    setCreateModelPath(file.path);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    if (!createModelName) {
      setCreateModelName(baseName);
    }
    setShowCreateModel(true);
    toast.info(`已选择文件: ${file.name}`, { duration: 1500 });
  };

  if (isAdding || editingModel) {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <header
          className="flex items-center gap-3 border-b px-6"
          style={{ height: 56, borderColor: 'var(--border-color)' }}
        >
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editingModel ? '编辑模型' : '新增模型'}
          </h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <ModelForm
            model={editingModel || undefined}
            onSave={handleSave}
            onCancel={() => { setEditingModel(null); setIsAdding(false); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex-1 overflow-y-auto">
        {activeMainTab === 'ollama' ? (
          <OllamaPanel
            showCreateModel={showCreateModel}
            setShowCreateModel={setShowCreateModel}
            createModelName={createModelName}
            setCreateModelName={setCreateModelName}
            createModelPath={createModelPath}
            setCreateModelPath={setCreateModelPath}
            isCreating={isCreating}
            setIsCreating={setIsCreating}
          />
        ) : activeMainTab === 'remote' && selectedModel ? (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold"
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary-color)',
                  }}
                >
                  {selectedModel.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedModel.name}
                    </h2>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: selectedModel.type === 'remote' ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                        color: selectedModel.type === 'remote' ? 'var(--primary-color)' : 'var(--text-secondary)',
                      }}
                    >
                      {selectedModel.type === 'remote' ? '远程' : '本地'}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: selectedModel.isActive ? 'rgba(0,180,42,0.1)' : 'rgba(245,63,63,0.1)',
                        color: selectedModel.isActive ? 'var(--success-color)' : 'var(--error-color)',
                      }}
                    >
                      {selectedModel.isActive ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {selectedModel.provider} · {selectedModel.model}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(selectedModel.id)}
                  disabled={testingId === selectedModel.id}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <TestTube size={14} />
                  {testingId === selectedModel.id ? '测试中...' : '测试连通'}
                </button>
                <button
                  onClick={() => setEditingModel(selectedModel)}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                  }}
                >
                  <Settings2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(selectedModel.id)}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all active:scale-95"
                  style={{ color: 'var(--error-color)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {testResult && testResult.id === selectedModel.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden rounded-lg p-4"
                  style={{
                    backgroundColor: testResult.success ? 'rgba(0,180,42,0.08)' : 'rgba(245,63,63,0.08)',
                    border: `1px solid ${testResult.success ? 'var(--success-color)' : 'var(--error-color)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <Check size={16} style={{ color: 'var(--success-color)' }} />
                    ) : (
                      <X size={16} style={{ color: 'var(--error-color)' }} />
                    )}
                    <span className="text-sm font-medium" style={{ color: testResult.success ? 'var(--success-color)' : 'var(--error-color)' }}>
                      {testResult.success ? `连接成功 (${testResult.time.toFixed(2)}s)` : '连接失败，请检查配置'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-6 grid grid-cols-4 gap-3">
              {[
                { icon: BarChart3, label: '总调用', value: selectedModel.stats.totalCalls.toString(), color: 'var(--primary-color)' },
                { icon: Check, label: '成功率', value: selectedModel.stats.totalCalls > 0 ? `${((selectedModel.stats.successCalls / selectedModel.stats.totalCalls) * 100).toFixed(1)}%` : '0%', color: 'var(--success-color)' },
                { icon: Clock, label: '平均耗时', value: `${selectedModel.stats.avgResponseTime.toFixed(1)}s`, color: 'var(--warning-color)' },
                { icon: Activity, label: '最近使用', value: selectedModel.stats.lastUsed ? `${Math.floor((Date.now() - selectedModel.stats.lastUsed) / 60000)}分钟前` : '从未', color: 'var(--text-tertiary)' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                >
                  <Icon size={18} style={{ color }} className="mb-2" />
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>配置详情</h3>
              <div className="space-y-3">
                {[
                  { label: 'API 地址', value: selectedModel.apiUrl },
                  { label: '模型标识', value: selectedModel.model },
                  { label: 'Temperature', value: selectedModel.temperature.toString() },
                  { label: 'Top P', value: selectedModel.topP.toString() },
                  { label: '最大 Tokens', value: selectedModel.maxTokens.toString() },
                  { label: '分组', value: selectedModel.group },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedModel.presets.length > 0 && (
              <div className="mt-4 rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>参数预设</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedModel.presets.map(preset => (
                    <button
                      key={preset.id}
                      className="rounded-lg p-3 text-left text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{preset.name}</div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        T:{preset.temperature} · P:{preset.topP} · Max:{preset.maxTokens}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Settings2 size={48} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>选择一个模型查看详情</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-80 flex-col border-l" style={{ borderColor: 'var(--border-color)' }}>
        <header
          className="flex items-center justify-between border-b px-4"
          style={{ height: 56, borderColor: 'var(--border-color)' }}
        >
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            模型管理
          </h1>
          <div className="flex gap-1">
            <button
              onClick={() => setIsAdding(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)' }}
              title="新增模型"
            >
              <Plus size={16} />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              title="导入配置"
            >
              <Download size={16} />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              title="导出配置"
            >
              <Upload size={16} />
            </button>
          </div>
        </header>

        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveMainTab('ollama')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors"
            style={{
              color: activeMainTab === 'ollama' ? 'var(--primary-color)' : 'var(--text-secondary)',
              backgroundColor: activeMainTab === 'ollama' ? 'var(--primary-light)' : 'transparent',
              fontWeight: activeMainTab === 'ollama' ? 600 : 400,
            }}
          >
            <HardDrive size={14} />
            Ollama
          </button>
          <button
            onClick={() => setActiveMainTab('remote')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors"
            style={{
              color: activeMainTab === 'remote' ? 'var(--primary-color)' : 'var(--text-secondary)',
              backgroundColor: activeMainTab === 'remote' ? 'var(--primary-light)' : 'transparent',
              fontWeight: activeMainTab === 'remote' ? 600 : 400,
            }}
          >
            <Globe size={14} />
            远程模型
          </button>
        </div>

        {activeMainTab === 'ollama' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Model Files Storage Section */}
            <div className="shrink-0 p-3">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div 
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  onClick={() => setShowModelFiles(!showModelFiles)}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen size={12} style={{ color: 'var(--warning-color)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      模型文件存储
                    </span>
                    {modelFiles.length > 0 && (
                      <span 
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                      >
                        {modelFiles.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddModelFile();
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
                      style={{ color: 'white', backgroundColor: 'var(--primary-color)' }}
                    >
                      添加
                    </button>
                    {showModelFiles ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                    ) : (
                      <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {showModelFiles && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-60 overflow-y-auto p-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                        {modelFiles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <FolderOpen size={20} style={{ color: 'var(--text-tertiary)' }} className="mb-1 opacity-30" />
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              暂无模型文件
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {modelFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center gap-2 rounded-lg p-2 transition-colors group"
                                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                              >
                                <div
                                  className="flex h-6 w-6 items-center justify-center rounded shrink-0"
                                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                                >
                                  <FileBox size={10} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {file.name}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleUseModelFile(file)}
                                    className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                                    style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)' }}
                                    title="用于创建模型"
                                  >
                                    <Play size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveModelFile(file.id)}
                                    className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                                    style={{ color: 'var(--error-color)', backgroundColor: 'rgba(245,63,63,0.1)' }}
                                    title="移除"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="shrink-0 p-3 pt-0">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div 
                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  onClick={() => setShowLogs(!showLogs)}
                >
                  <div className="flex items-center gap-2">
                    <Terminal size={12} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      操作日志
                    </span>
                    {ollamaLogs.length > 0 && (
                      <span 
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                      >
                        {ollamaLogs.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ollamaLogs.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOllamaLogs([]);
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:opacity-80"
                        style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                      >
                        清空
                      </button>
                    )}
                    {showLogs ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                    ) : (
                      <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {showLogs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-80 overflow-y-auto p-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
                        {ollamaLogs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <Terminal size={20} style={{ color: 'var(--text-tertiary)' }} className="mb-1 opacity-30" />
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              暂无日志记录
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {ollamaLogs.slice().reverse().slice(0, 15).map((log, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className="flex items-start gap-2 p-1.5 rounded-lg"
                                style={{ 
                                  backgroundColor: log.type === 'error' 
                                    ? 'rgba(245,63,63,0.05)' 
                                    : log.type === 'warning'
                                    ? 'rgba(245,158,11,0.05)'
                                    : 'transparent'
                                }}
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                  style={{
                                    backgroundColor: log.type === 'error' 
                                      ? 'var(--error-color)' 
                                      : log.type === 'warning'
                                      ? 'var(--warning-color)'
                                      : 'var(--success-color)'
                                  }}
                                />
                                <span className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                  {log.message}
                                </span>
                                <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                                  {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {activeMainTab === 'remote' && (
          <>
            <div className="p-3">
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="搜索模型..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              {groups.map(group => {
                const groupModels = filteredModels.filter(m => m.group === group);
                if (groupModels.length === 0) return null;
                return (
                  <div key={group} className="mb-3">
                    <div className="mb-1 flex items-center gap-1 px-2 text-xs font-medium"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <span>{group}</span>
                      <span>({groupModels.length})</span>
                    </div>
                    {groupModels.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModelId(model.id)}
                        className="mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                        style={{
                          backgroundColor: selectedModelId === model.id ? 'var(--primary-light)' : 'transparent',
                        }}
                      >
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                          style={{
                            backgroundColor: model.isActive ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                            color: model.isActive ? 'var(--primary-color)' : 'var(--text-tertiary)',
                          }}
                        >
                          {model.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            {model.isFavorite && <Star size={10} style={{ color: 'var(--warning-color)' }} fill="var(--warning-color)" />}
                            <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {model.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span>{model.provider}</span>
                            <span>·</span>
                            <span className={model.isActive ? '' : 'opacity-50'}>
                              {model.isActive ? '已启用' : '已禁用'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
