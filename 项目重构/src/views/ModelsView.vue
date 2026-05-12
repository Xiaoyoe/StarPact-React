<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useModelStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Modal from '@/components/common/Modal.vue';
import {
  Plus, Star, Trash2, Settings2, Globe, HardDrive, 
  RefreshCw, Check, X, Eye, EyeOff, Zap, Activity,
  Server, Download, AlertCircle, Cpu
} from 'lucide-vue-next';
import type { ModelConfig, LocalModelProvider } from '@/types';
import type { OllamaModel, LMStudioModel } from '@/types/ollama';

const modelStore = useModelStore();
const toast = useToast();

const searchQuery = ref('');
const showAddModal = ref(false);
const editingModel = ref<ModelConfig | null>(null);
const showApiKey = ref(false);
const useCustomParams = ref(false);
const formModelType = ref<'remote' | 'local'>('remote');
const localProvider = ref<LocalModelProvider>('lmstudio');
const customHost = ref('localhost');
const customPort = ref(1234);
const fetchingModels = ref(false);
const availableModels = ref<{id: string; name: string}[]>([]);

const lmstudioHost = ref('localhost');
const lmstudioPort = ref(1234);
const lmstudioChecking = ref(false);

const ollamaHost = ref('localhost');
const ollamaPort = ref(11434);
const ollamaChecking = ref(false);

const form = ref<Omit<ModelConfig, 'id' | 'createdAt' | 'stats'>>({
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
  presets: [],
});

const filteredModels = computed(() => {
  if (!searchQuery.value) return modelStore.models;
  return modelStore.models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    m.group.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const groupedModels = computed(() => {
  const groups: Record<string, ModelConfig[]> = {};
  filteredModels.value.forEach(model => {
    if (!groups[model.group]) {
      groups[model.group] = [];
    }
    groups[model.group].push(model);
  });
  return groups;
});

const presetOptions = [
  { name: '精准模式', temp: 0.2, topP: 0.8, tokens: 2048 },
  { name: '均衡模式', temp: 0.7, topP: 1.0, tokens: 4096 },
  { name: '创意模式', temp: 1.0, topP: 0.95, tokens: 4096 },
  { name: '代码模式', temp: 0.1, topP: 0.9, tokens: 8192 },
];

onMounted(async () => {
  await modelStore.loadModels();
  await modelStore.checkLMStudioStatus(lmstudioHost.value, lmstudioPort.value);
  await modelStore.checkOllamaStatus(ollamaHost.value, ollamaPort.value);
});

const handleAddModel = () => {
  editingModel.value = null;
  resetForm();
  showAddModal.value = true;
};

const handleEditModel = (model: ModelConfig) => {
  editingModel.value = model;
  form.value = { ...model };
  formModelType.value = model.type;
  localProvider.value = model.localProvider || 'lmstudio';
  useCustomParams.value = true;
  showAddModal.value = true;
};

const resetForm = () => {
  form.value = {
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
    presets: [],
  };
  formModelType.value = 'remote';
  localProvider.value = 'lmstudio';
  customHost.value = 'localhost';
  customPort.value = 1234;
  availableModels.value = [];
  useCustomParams.value = false;
};

const handleFetchLocalModels = async () => {
  fetchingModels.value = true;
  availableModels.value = [];
  
  try {
    if (localProvider.value === 'lmstudio') {
      const status = await modelStore.checkLMStudioStatus(customHost.value, customPort.value);
      if (status?.running) {
        availableModels.value = modelStore.lmstudioModels.map(m => ({
          id: m.id,
          name: m.id,
        }));
        if (availableModels.value.length > 0) {
          const firstModel = availableModels.value[0];
          form.value = {
            ...form.value,
            type: 'local',
            provider: 'LM Studio',
            apiUrl: `http://${customHost.value}:${customPort.value}/v1/chat/completions`,
            model: firstModel.id,
            name: form.value.name || firstModel.name,
            group: '本地模型',
            localProvider: 'lmstudio',
          };
        }
      } else {
        toast.error('LM Studio 服务未运行，请先启动 LM Studio');
      }
    } else if (localProvider.value === 'ollama') {
      const status = await modelStore.checkOllamaStatus(customHost.value, customPort.value);
      if (status?.running) {
        availableModels.value = modelStore.ollamaModels.map(m => ({
          id: m.name,
          name: m.name,
        }));
        if (availableModels.value.length > 0) {
          const firstModel = availableModels.value[0];
          form.value = {
            ...form.value,
            type: 'local',
            provider: 'Ollama',
            apiUrl: `http://${customHost.value}:${customPort.value}/api/chat`,
            model: firstModel.id,
            name: form.value.name || firstModel.name,
            group: '本地模型',
            localProvider: 'ollama',
          };
        }
      } else {
        toast.error('Ollama 服务未运行，请先启动 Ollama');
      }
    }
  } catch (error) {
    toast.error('获取本地模型失败');
  } finally {
    fetchingModels.value = false;
  }
};

const handleSelectLocalModel = (modelId: string) => {
  const selectedModel = availableModels.value.find(m => m.id === modelId);
  if (selectedModel) {
    const apiUrl = localProvider.value === 'lmstudio'
      ? `http://${customHost.value}:${customPort.value}/v1/chat/completions`
      : `http://${customHost.value}:${customPort.value}/api/chat`;
    
    form.value = {
      ...form.value,
      type: 'local',
      provider: localProvider.value === 'lmstudio' ? 'LM Studio' : 'Ollama',
      apiUrl,
      model: modelId,
      name: selectedModel.name,
      group: '本地模型',
      localProvider: localProvider.value,
    };
  }
};

const handleSaveModel = async () => {
  if (!form.value.name || !form.value.apiUrl) {
    toast.error('请填写模型名称和 API 地址');
    return;
  }

  try {
    if (editingModel.value) {
      await modelStore.updateModel(editingModel.value.id, form.value);
      toast.success('模型已更新');
    } else {
      await modelStore.addModel(form.value);
      toast.success('模型添加成功');
    }
    showAddModal.value = false;
    resetForm();
  } catch (error) {
    toast.error('保存模型失败');
  }
};

const handleDeleteModel = async (id: string) => {
  if (confirm('确定要删除这个模型吗？')) {
    await modelStore.deleteModel(id);
    toast.success('模型已删除');
  }
};

const handleSetActive = (id: string) => {
  modelStore.setActiveModel(id);
  toast.success('已切换模型');
};

const handleToggleFavorite = (id: string) => {
  modelStore.toggleFavorite(id);
};

const applyPreset = (preset: typeof presetOptions[0]) => {
  form.value.temperature = preset.temp;
  form.value.topP = preset.topP;
  form.value.maxTokens = preset.tokens;
};

const checkLMStudioConnection = async () => {
  lmstudioChecking.value = true;
  try {
    await modelStore.checkLMStudioStatus(lmstudioHost.value, lmstudioPort.value);
    if (modelStore.lmstudioStatus?.running) {
      toast.success('LM Studio 连接成功');
    } else {
      toast.warning('LM Studio 服务未运行');
    }
  } catch (error) {
    toast.error('连接失败');
  } finally {
    lmstudioChecking.value = false;
  }
};

const checkOllamaConnection = async () => {
  ollamaChecking.value = true;
  try {
    await modelStore.checkOllamaStatus(ollamaHost.value, ollamaPort.value);
    if (modelStore.ollamaStatus?.running) {
      toast.success('Ollama 连接成功');
    } else {
      toast.warning('Ollama 服务未运行');
    }
  } catch (error) {
    toast.error('连接失败');
  } finally {
    ollamaChecking.value = false;
  }
};

const handlePullOllamaModel = async () => {
  const modelName = prompt('请输入要拉取的模型名称，例如: llama3.2');
  if (modelName) {
    toast.info(`正在拉取模型 ${modelName}...`);
    try {
      await modelStore.pullOllamaModel(modelName);
      toast.success(`模型 ${modelName} 拉取成功`);
    } catch (error) {
      toast.error(`拉取模型失败`);
    }
  }
};

const handleDeleteOllamaModel = async (modelName: string) => {
  if (confirm(`确定要删除 Ollama 模型 ${modelName} 吗？`)) {
    try {
      await modelStore.deleteOllamaModel(modelName);
      toast.success(`模型 ${modelName} 已删除`);
    } catch (error) {
      toast.error('删除模型失败');
    }
  }
};

const handleUseLMStudioModel = (model: LMStudioModel) => {
  const config = modelStore.createLocalModelConfig('lmstudio', model.id, model.id, lmstudioHost.value, lmstudioPort.value);
  modelStore.setActiveModelByConfig(config);
  toast.success(`已切换到 ${model.id}`);
};

const handleUseOllamaModel = (model: OllamaModel) => {
  const config = modelStore.createLocalModelConfig('ollama', model.name, model.name, ollamaHost.value, ollamaPort.value);
  modelStore.setActiveModelByConfig(config);
  toast.success(`已切换到 ${model.name}`);
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} GB`;
};
</script>

<template>
  <div class="models-page">
    <div class="page-header">
      <h1>模型管理</h1>
      <div class="header-actions">
        <Button variant="primary" @click="handleAddModel">
          <Plus :size="16" />
          添加模型
        </Button>
      </div>
    </div>

    <div class="two-column-layout">
      <div class="left-column">
        <div class="column-header">
          <h2><Settings2 :size="18" /> 模型配置</h2>
          <Input v-model="searchQuery" placeholder="搜索模型..." />
        </div>

        <div v-if="modelStore.loading" class="loading-state">
          <RefreshCw :size="24" class="animate-spin" />
          <span>加载中...</span>
        </div>

        <div v-else-if="modelStore.models.length === 0" class="empty-state">
          <AlertCircle :size="48" />
          <p>暂无模型配置</p>
          <Button variant="primary" @click="handleAddModel">
            <Plus :size="16" />
            添加第一个模型
          </Button>
        </div>

        <div v-else class="models-list">
          <div v-for="(models, group) in groupedModels" :key="group" class="model-group">
            <h3 class="group-title">{{ group }}</h3>
            <div
              v-for="model in models"
              :key="model.id"
              class="model-card"
              :class="{ active: model.id === modelStore.activeModelId }"
            >
              <div class="card-left">
                <div class="card-icon" :class="model.type">
                  <Globe v-if="model.type === 'remote'" :size="18" />
                  <HardDrive v-else :size="18" />
                </div>
              </div>
              
              <div class="card-center">
                <div class="card-title-row">
                  <h4 class="card-title">{{ model.name }}</h4>
                  <span class="card-badge" :class="model.type">
                    {{ model.type === 'remote' ? '远程' : '本地' }}
                  </span>
                </div>
                <div class="card-meta-row">
                  <span class="meta-item">
                    <span class="meta-label">模型:</span>
                    <span class="meta-value">{{ model.model }}</span>
                  </span>
                  <span class="meta-divider">|</span>
                  <span class="meta-item">
                    <span class="meta-label">温度:</span>
                    <span class="meta-value">{{ model.temperature }}</span>
                  </span>
                </div>
              </div>
              
              <div class="card-right">
                <button
                  class="icon-btn"
                  :class="{ active: model.isFavorite }"
                  @click="handleToggleFavorite(model.id)"
                  title="收藏"
                >
                  <Star :size="15" />
                </button>
                <button class="icon-btn" @click="handleEditModel(model)" title="编辑">
                  <Settings2 :size="15" />
                </button>
                <button class="icon-btn danger" @click="handleDeleteModel(model.id)" title="删除">
                  <Trash2 :size="15" />
                </button>
                
                <div class="action-divider"></div>
                
                <button
                  v-if="model.id !== modelStore.activeModelId"
                  class="use-btn"
                  @click="handleSetActive(model.id)"
                >
                  <Zap :size="14" />
                  使用
                </button>
                <div v-else class="active-tag">
                  <Check :size="12" />
                  使用中
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="service-section">
          <div class="service-header">
            <div class="service-info">
              <div class="service-icon lmstudio">
                <Cpu :size="20" />
              </div>
              <div>
                <h2>LM Studio</h2>
                <p>本地大模型推理平台</p>
              </div>
            </div>
            <div class="service-status" :class="{ online: modelStore.lmstudioStatus?.running }">
              <span class="status-dot"></span>
              {{ modelStore.lmstudioStatus?.running ? '已连接' : '未连接' }}
            </div>
          </div>
          
          <div class="connection-bar">
            <div class="address-input">
              <span>http://</span>
              <input v-model="lmstudioHost" type="text" placeholder="localhost" />
              <span>:</span>
              <input v-model.number="lmstudioPort" type="number" placeholder="1234" />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              @click="checkLMStudioConnection"
              :disabled="lmstudioChecking"
            >
              <RefreshCw :size="14" :class="{ 'animate-spin': lmstudioChecking }" />
            </Button>
          </div>

          <div v-if="!modelStore.lmstudioStatus?.running" class="service-offline-mini">
            <AlertCircle :size="32" />
            <p>服务未运行</p>
          </div>

          <div v-else-if="(modelStore.lmstudioModels?.length || 0) === 0" class="service-empty-mini">
            <Cpu :size="32" />
            <p>暂无已加载的模型</p>
          </div>

          <div v-else class="service-models-list">
            <div 
              v-for="model in modelStore.lmstudioModels" 
              :key="model.id" 
              class="service-model-card"
            >
              <div class="card-left">
                <div class="card-icon lmstudio">
                  <Cpu :size="16" />
                </div>
              </div>
              
              <div class="card-center">
                <div class="card-title-row">
                  <h4 class="card-title">{{ model.id }}</h4>
                  <span class="card-badge lmstudio">LM Studio</span>
                </div>
              </div>
              
              <div class="card-right">
                <button class="use-btn-sm" @click="handleUseLMStudioModel(model)">
                  <Zap :size="12" />
                  使用
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="service-section">
          <div class="service-header">
            <div class="service-info">
              <div class="service-icon ollama">
                <Server :size="20" />
              </div>
              <div>
                <h2>Ollama</h2>
                <p>本地大模型运行工具</p>
              </div>
            </div>
            <div class="service-status" :class="{ online: modelStore.ollamaStatus?.running }">
              <span class="status-dot"></span>
              {{ modelStore.ollamaStatus?.running ? '已连接' : '未连接' }}
              <span v-if="modelStore.ollamaStatus?.version" class="version">v{{ modelStore.ollamaStatus.version }}</span>
            </div>
          </div>
          
          <div class="connection-bar">
            <div class="address-input">
              <span>http://</span>
              <input v-model="ollamaHost" type="text" placeholder="localhost" />
              <span>:</span>
              <input v-model.number="ollamaPort" type="number" placeholder="11434" />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              @click="checkOllamaConnection"
              :disabled="ollamaChecking"
            >
              <RefreshCw :size="14" :class="{ 'animate-spin': ollamaChecking }" />
            </Button>
          </div>

          <div v-if="!modelStore.ollamaStatus?.running" class="service-offline-mini">
            <AlertCircle :size="32" />
            <p>服务未运行</p>
          </div>

          <div v-else-if="(modelStore.ollamaModels?.length || 0) === 0" class="service-empty-mini">
            <Server :size="32" />
            <p>暂无已安装的模型</p>
            <Button variant="ghost" size="sm" @click="handlePullOllamaModel">
              <Download :size="14" />
              拉取模型
            </Button>
          </div>

          <div v-else class="service-models-list">
            <div 
              v-for="model in modelStore.ollamaModels" 
              :key="model.name" 
              class="service-model-card"
            >
              <div class="card-left">
                <div class="card-icon ollama">
                  <Server :size="16" />
                </div>
              </div>
              
              <div class="card-center">
                <div class="card-title-row">
                  <h4 class="card-title">{{ model.name }}</h4>
                  <span class="card-badge ollama">Ollama</span>
                </div>
                <div class="card-meta-row">
                  <span class="meta-item">
                    <template v-if="model.details?.parameter_size">{{ model.details.parameter_size }} · </template>
                    {{ formatSize(model.size) }}
                  </span>
                </div>
              </div>
              
              <div class="card-right">
                <button class="icon-btn-sm danger" @click="handleDeleteOllamaModel(model.name)" title="删除">
                  <Trash2 :size="13" />
                </button>
                <button class="use-btn-sm" @click="handleUseOllamaModel(model)">
                  <Zap :size="12" />
                  使用
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal v-if="showAddModal" @close="showAddModal = false">
      <template #header>
        <h2>{{ editingModel ? '编辑模型' : '添加新模型' }}</h2>
      </template>
      
      <div class="modal-content">
        <div class="form-section">
          <h3 class="section-title">模型类型</h3>
          <div class="type-selector">
            <button
              class="type-btn"
              :class="{ active: formModelType === 'remote' }"
              @click="formModelType = 'remote'; form.type = 'remote'"
            >
              <Globe :size="20" />
              <div class="type-info">
                <span class="type-name">远程模型</span>
                <span class="type-desc">OpenAI、Claude等联网API</span>
              </div>
            </button>
            <button
              class="type-btn"
              :class="{ active: formModelType === 'local' }"
              @click="formModelType = 'local'; form.type = 'local'"
            >
              <HardDrive :size="20" />
              <div class="type-info">
                <span class="type-name">本地模型</span>
                <span class="type-desc">LM Studio、Ollama等本地服务</span>
              </div>
            </button>
          </div>
        </div>

        <div v-if="formModelType === 'local'" class="form-section">
          <h3 class="section-title">本地服务</h3>
          <div class="provider-selector">
            <button
              class="provider-btn"
              :class="{ active: localProvider === 'lmstudio' }"
              @click="localProvider = 'lmstudio'; customPort = 1234"
            >
              LM Studio
            </button>
            <button
              class="provider-btn"
              :class="{ active: localProvider === 'ollama' }"
              @click="localProvider = 'ollama'; customPort = 11434"
            >
              Ollama
            </button>
          </div>
          
          <div class="connection-config">
            <div class="form-row">
              <div class="form-field">
                <label>主机</label>
                <input v-model="customHost" type="text" placeholder="localhost" />
              </div>
              <div class="form-field">
                <label>端口</label>
                <input v-model="customPort" type="number" placeholder="1234" />
              </div>
            </div>
            <Button variant="secondary" @click="handleFetchLocalModels" :disabled="fetchingModels">
              <RefreshCw :size="16" :class="{ 'animate-spin': fetchingModels }" />
              {{ fetchingModels ? '获取中...' : '获取本地模型' }}
            </Button>
          </div>

          <div v-if="availableModels.length > 0" class="available-models">
            <label>选择模型</label>
            <select v-model="form.model" @change="handleSelectLocalModel(form.model)">
              <option value="">请选择模型</option>
              <option v-for="m in availableModels" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">基础配置</h3>
          <div class="form-grid">
            <div class="form-field">
              <label>模型名称 *</label>
              <input v-model="form.name" type="text" placeholder="例如：GPT-4o" />
            </div>
            <div class="form-field">
              <label>供应商</label>
              <input v-model="form.provider" type="text" placeholder="例如：OpenAI" />
            </div>
            <div class="form-field full-width">
              <label>API 地址 *</label>
              <input v-model="form.apiUrl" type="text" placeholder="https://api.openai.com/v1/chat/completions" class="font-mono" />
            </div>
            <div v-if="formModelType === 'remote'" class="form-field full-width">
              <label>API Key</label>
              <div class="api-key-input">
                <input :type="showApiKey ? 'text' : 'password'" v-model="form.apiKey" placeholder="sk-..." class="font-mono" />
                <button class="toggle-visibility" @click="showApiKey = !showApiKey">
                  <Eye v-if="!showApiKey" :size="16" />
                  <EyeOff v-else :size="16" />
                </button>
              </div>
            </div>
            <div class="form-field">
              <label>模型标识</label>
              <input v-model="form.model" type="text" placeholder="例如：gpt-4o" class="font-mono" />
            </div>
            <div class="form-field">
              <label>分组</label>
              <input v-model="form.group" type="text" placeholder="例如：OpenAI" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">参数配置</h3>
            <label class="toggle-label">
              <input type="checkbox" v-model="useCustomParams" />
              <span>自定义参数</span>
            </label>
          </div>
          
          <div v-if="useCustomParams" class="params-config">
            <div class="form-grid-3">
              <div class="form-field">
                <label>Temperature</label>
                <input v-model.number="form.temperature" type="number" min="0" max="2" step="0.1" />
                <span class="field-hint">0-2，越高越随机</span>
              </div>
              <div class="form-field">
                <label>Top P</label>
                <input v-model.number="form.topP" type="number" min="0" max="1" step="0.1" />
                <span class="field-hint">0-1，核采样</span>
              </div>
              <div class="form-field">
                <label>最大 Tokens</label>
                <input v-model.number="form.maxTokens" type="number" min="256" max="16384" step="256" />
                <span class="field-hint">256-16384</span>
              </div>
            </div>

            <div class="presets">
              <label>快捷预设</label>
              <div class="preset-buttons">
                <button
                  v-for="preset in presetOptions"
                  :key="preset.name"
                  class="preset-btn"
                  @click="applyPreset(preset)"
                >
                  <Zap :size="12" />
                  {{ preset.name }}
                </button>
              </div>
            </div>
          </div>
          <div v-else class="default-params">
            <Settings2 :size="24" />
            <p>使用默认参数配置</p>
            <span>开启"自定义参数"可调整 Temperature、Top P 等参数</span>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">高级配置</h3>
          <div class="advanced-options">
            <div class="option-item">
              <div class="option-info">
                <span class="option-name">启用模型</span>
                <span class="option-desc">关闭后模型将不在聊天页显示</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.isActive" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="option-item">
              <div class="option-info">
                <span class="option-name">收藏模型</span>
                <span class="option-desc">收藏的模型将优先展示</span>
              </div>
              <button class="favorite-btn" @click="form.isFavorite = !form.isFavorite">
                <Star :size="20" :class="{ active: form.isFavorite }" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="formModelType === 'remote'" class="security-notice">
          <AlertCircle :size="16" />
          <span>API Key 将使用 AES-256 加密存储在本地，不会上传至任何服务器。</span>
        </div>
      </div>

      <template #footer>
        <div class="modal-actions">
          <Button variant="secondary" @click="showAddModal = false">取消</Button>
          <Button variant="primary" @click="handleSaveModel" :disabled="!form.name || !form.apiUrl">
            <Check :size="16" />
            {{ editingModel ? '保存修改' : '添加模型' }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.models-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.two-column-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 0;
  overflow: hidden;
}

.left-column {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px 24px;
  border-right: 1px solid var(--border-color);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.column-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.column-header .input-wrapper {
  flex: 1;
  max-width: 300px;
}

.right-column {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
  gap: 20px;
  background: var(--bg-primary);
}

.service-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
  gap: 16px;
}

.empty-state p {
  font-size: 16px;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-card,
.service-model-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.model-card:hover,
.service-model-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
}

.model-card.active {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%);
}

.card-left {
  flex-shrink: 0;
}

.card-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon.remote {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  color: #3b82f6;
}

.card-icon.local {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%);
  color: #10b981;
}

.card-icon.lmstudio {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%);
  color: #8b5cf6;
}

.card-icon.ollama {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
  color: #10b981;
}

.card-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.card-badge.remote {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.card-badge.local {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.card-badge.lmstudio {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.card-badge.ollama {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.card-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.meta-label {
  color: var(--text-tertiary);
}

.meta-value {
  color: var(--text-secondary);
  font-weight: 500;
}

.meta-divider {
  color: var(--border-color);
}

.card-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.icon-btn.active {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.icon-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.icon-btn-sm {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn-sm:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.icon-btn-sm.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.action-divider {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 2px;
}

.use-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  background: var(--primary-color);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.use-btn:hover {
  background: #4f46e5;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.use-btn-sm {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  background: var(--primary-color);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.2s;
}

.use-btn-sm:hover {
  background: #4f46e5;
}

.active-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  color: #10b981;
  font-size: 12px;
  font-weight: 500;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon.lmstudio {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%);
  color: #8b5cf6;
}

.service-icon.ollama {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%);
  color: #10b981;
}

.service-info h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.service-info p {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 2px 0 0 0;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.service-status.online {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.version {
  font-size: 10px;
  opacity: 0.7;
}

.connection-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.address-input {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.address-input span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.address-input input {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  width: 80px;
}

.address-input input:focus {
  border-color: var(--primary-color);
}

.address-input input:last-of-type {
  width: 60px;
  text-align: center;
}

.service-offline-mini,
.service-empty-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
  gap: 10px;
}

.service-offline-mini p,
.service-empty-mini p {
  font-size: 13px;
  margin: 0;
}

.service-models-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 4px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.type-btn:hover {
  border-color: var(--primary-color);
}

.type-btn.active {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.type-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.type-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.provider-selector {
  display: flex;
  gap: 8px;
}

.provider-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.provider-btn:hover {
  border-color: var(--primary-color);
}

.provider-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.connection-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-field input,
.form-field select {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-field input:focus,
.form-field select:focus {
  border-color: var(--primary-color);
}

.field-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.api-key-input {
  position: relative;
}

.api-key-input input {
  width: 100%;
  padding-right: 40px;
}

.toggle-visibility {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
}

.available-models {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.available-models select {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.toggle-label input {
  width: 16px;
  height: 16px;
}

.params-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.presets label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.default-params {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-tertiary);
  text-align: center;
  gap: 8px;
}

.default-params p {
  margin: 0;
  font-size: 14px;
}

.default-params span {
  font-size: 12px;
}

.advanced-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.option-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: 0.2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.favorite-btn {
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.2s;
}

.favorite-btn:hover {
  color: var(--text-primary);
}

.favorite-btn .active {
  color: #f59e0b;
  fill: #f59e0b;
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  font-size: 12px;
  color: var(--primary-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
