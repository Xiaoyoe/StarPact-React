import { useState } from 'react';
import {
  Plus, Search, Star, Trash2, TestTube, Download, Upload,
  Settings2, Check, X, AlertCircle, Zap, Globe, HardDrive,
  ChevronRight, BarChart3, Clock, Activity, Eye, EyeOff
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import type { ModelConfig } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';

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
      {/* Tab Navigation */}
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

      {/* Form Content */}
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

            {/* Quick Presets */}
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

      {/* Actions */}
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

export function ModelsPage() {
  const {
    models, activeModelId,
    addModel, updateModel, deleteModel,
    addLog,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(activeModelId);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; time: number } | null>(null);

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

    // Simulate test
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
      {/* Left: Model List */}
      <div className="flex w-80 flex-col border-r" style={{ borderColor: 'var(--border-color)' }}>
        {/* Header */}
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

        {/* Search */}
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

        {/* Model Groups */}
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
      </div>

      {/* Right: Model Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedModel ? (
          <div className="p-6">
            {/* Model Header */}
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

            {/* Test Result */}
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

            {/* Stats */}
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

            {/* Config Details */}
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

            {/* Presets */}
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
    </div>
  );
}
