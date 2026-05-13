<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useModelStore, useConversationStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/common/Modal.vue';
import {
  Plus, Star, Trash2, Settings2, Globe, HardDrive, 
  RefreshCw, Check, Eye, EyeOff, Zap, Server, 
  Download, AlertCircle, Cpu, Search, Send, MessageSquare,
  Play, ChevronDown, ChevronRight,
  Power, PowerOff, Sliders, Activity, Copy
} from 'lucide-vue-next';
import type { ModelConfig, LocalModelProvider } from '@/types';
import type { OllamaModel, LMStudioModel } from '@/types/ollama';
import { chatService, type CompletionStats } from '@/services/chatService';

const modelStore = useModelStore();
const conversationStore = useConversationStore();
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
const lmstudioExpanded = ref(true);

const ollamaHost = ref('localhost');
const ollamaPort = ref(11434);
const ollamaChecking = ref(false);
const ollamaExpanded = ref(true);
const ollamaPullName = ref('');

const testChatInput = ref('');
const testChatOutput = ref('');
const testChatStreaming = ref(false);

const showConfirmDialog = ref(false);
const confirmMessage = ref('');
const confirmCallback = ref<(() => void) | null>(null);

const showModelInfoModal = ref(false);
const selectedModelInfo = ref<Record<string, unknown> | null>(null);
const selectedModelName = ref('');

const showParamsModal = ref(false);
const editingParamsModel = ref<ModelConfig | null>(null);
const tempParams = ref({
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 4096,
});

const switchingModel = ref(false);
const switchingModelName = ref('');

const runningModels = ref<Array<{ name: string; size?: number; digest?: string }>>([]);
const checkingRunningModels = ref(false);

const sidebarWidth = ref(280);
const isResizing = ref(false);
const minSidebarWidth = 200;
const maxSidebarWidth = 400;

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

const presetOptions = [
  { name: '精准模式', temp: 0.2, topP: 0.8, tokens: 2048 },
  { name: '均衡模式', temp: 0.7, topP: 1.0, tokens: 4096 },
  { name: '创意模式', temp: 1.0, topP: 0.95, tokens: 4096 },
  { name: '代码模式', temp: 0.1, topP: 0.9, tokens: 8192 },
];

onMounted(async () => {
  await modelStore.loadModels();
  await checkAllServices();
  await checkRunningModels();
});

const checkAllServices = async () => {
  await checkLMStudioConnection();
  await checkOllamaConnection();
};

const checkRunningModels = async () => {
  checkingRunningModels.value = true;
  try {
    const models = await modelStore.getOllamaRunningModels(ollamaHost.value, ollamaPort.value);
    runningModels.value = models;
  } catch (error) {
    console.error('Failed to get running models:', error);
    runningModels.value = [];
  } finally {
    checkingRunningModels.value = false;
  }
};

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

const showConfirm = (message: string, callback: () => void) => {
  confirmMessage.value = message;
  confirmCallback.value = callback;
  showConfirmDialog.value = true;
};

const handleConfirmYes = () => {
  if (confirmCallback.value) {
    confirmCallback.value();
  }
  showConfirmDialog.value = false;
  confirmCallback.value = null;
};

const handleConfirmNo = () => {
  showConfirmDialog.value = false;
  confirmCallback.value = null;
};

const checkLMStudioConnection = async () => {
  lmstudioChecking.value = true;
  try {
    const status = await modelStore.checkLMStudioStatus(lmstudioHost.value, lmstudioPort.value);
    if (status?.running) {
      toast.success(`LM Studio 已连接 (${lmstudioHost.value}:${lmstudioPort.value})`);
    } else {
      toast.warning('LM Studio 服务未运行');
    }
  } catch (error) {
    console.error('LM Studio connection error:', error);
    toast.error('连接失败');
  } finally {
    lmstudioChecking.value = false;
  }
};

const checkOllamaConnection = async () => {
  ollamaChecking.value = true;
  try {
    const status = await modelStore.checkOllamaStatus(ollamaHost.value, ollamaPort.value);
    if (status?.running) {
      toast.success(`Ollama 已连接 (${ollamaHost.value}:${ollamaPort.value})`);
      await checkRunningModels();
    } else {
      toast.warning('Ollama 服务未运行');
      runningModels.value = [];
    }
  } catch (error) {
    console.error('Ollama connection error:', error);
    toast.error('连接失败');
    runningModels.value = [];
  } finally {
    ollamaChecking.value = false;
  }
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
        toast.success(`找到 ${availableModels.value.length} 个模型`);
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
        toast.success(`找到 ${availableModels.value.length} 个模型`);
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
    await conversationStore.loadModels();
  } catch (error) {
    toast.error('保存模型失败');
  }
};

const handleDeleteModel = (id: string) => {
  showConfirm('确定要删除这个模型吗？', async () => {
    await modelStore.deleteModel(id);
    toast.success('模型已删除');
    await conversationStore.loadModels();
  });
};

const handleSetActive = async (id: string) => {
  const model = modelStore.models.find(m => m.id === id);
  if (!model) return;
  
  switchingModel.value = true;
  switchingModelName.value = model.name;
  
  try {
    modelStore.setActiveModel(id);
    conversationStore.setActiveModel(id);
    
    if (model.type === 'local') {
      const provider = (model.localProvider || model.provider).toLowerCase();
      
      if (provider === 'ollama') {
        const host = model.localServiceConfig?.host || ollamaHost.value;
        const port = model.localServiceConfig?.port || ollamaPort.value;
        await modelStore.runOllamaModel(model.model, host, port);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    toast.success(`已切换到 ${model.name}`);
  } catch (error) {
    toast.error('切换模型失败');
  } finally {
    switchingModel.value = false;
    switchingModelName.value = '';
  }
};

const handleStopCurrentModel = async () => {
  const activeModel = modelStore.activeModel;
  if (!activeModel) {
    toast.warning('没有活动的模型');
    return;
  }
  
  switchingModel.value = true;
  switchingModelName.value = activeModel.name;
  
  try {
    if (activeModel.type === 'local') {
      const provider = (activeModel.localProvider || activeModel.provider).toLowerCase();
      
      if (provider === 'ollama') {
        const host = activeModel.localServiceConfig?.host || ollamaHost.value;
        const port = activeModel.localServiceConfig?.port || ollamaPort.value;
        await modelStore.stopOllamaModel(activeModel.model, host, port);
        toast.success(`已停止模型 ${activeModel.name}`);
      } else if (provider === 'lmstudio') {
        toast.info('LM Studio 模型请在 LM Studio 中手动卸载');
      }
    } else {
      toast.info('远程模型无需停止');
    }
  } catch (error) {
    toast.error('停止模型失败');
  } finally {
    switchingModel.value = false;
    switchingModelName.value = '';
  }
};

const handleToggleFavorite = (id: string) => {
  modelStore.toggleFavorite(id);
};

const applyPreset = (preset: typeof presetOptions[0]) => {
  form.value.temperature = preset.temp;
  form.value.topP = preset.topP;
  form.value.maxTokens = preset.tokens;
};

const handlePullOllamaModel = async () => {
  const modelName = ollamaPullName.value.trim();
  if (!modelName) {
    toast.warning('请输入模型名称');
    return;
  }
  toast.info(`正在拉取模型 ${modelName}...`);
  try {
    await modelStore.pullOllamaModel(modelName, ollamaHost.value, ollamaPort.value);
    toast.success(`模型 ${modelName} 拉取成功`);
    ollamaPullName.value = '';
  } catch (error) {
    toast.error('拉取模型失败');
  }
};

const handleRunOllamaModel = async (modelName: string) => {
  toast.info(`正在加载模型 ${modelName}...`);
  try {
    await modelStore.runOllamaModel(modelName, ollamaHost.value, ollamaPort.value);
    toast.success(`模型 ${modelName} 已加载到内存`);
    await checkRunningModels();
  } catch (error) {
    toast.error('加载模型失败');
  }
};

const handleStopOllamaModel = async (modelName: string) => {
  try {
    await modelStore.stopOllamaModel(modelName, ollamaHost.value, ollamaPort.value);
    toast.success(`模型 ${modelName} 已从内存卸载`);
    await checkRunningModels();
  } catch (error) {
    toast.error('卸载模型失败');
  }
};

const handleOpenParamsModal = (model: ModelConfig) => {
  editingParamsModel.value = model;
  tempParams.value = {
    temperature: model.temperature,
    topP: model.topP,
    maxTokens: model.maxTokens,
  };
  showParamsModal.value = true;
};

const handleSaveParams = async () => {
  if (editingParamsModel.value) {
    await modelStore.updateModel(editingParamsModel.value.id, {
      temperature: tempParams.value.temperature,
      topP: tempParams.value.topP,
      maxTokens: tempParams.value.maxTokens,
    });
    toast.success('参数已更新');
    showParamsModal.value = false;
    editingParamsModel.value = null;
  }
};

const handleCopyOutput = async () => {
  if (testChatOutput.value) {
    try {
      await navigator.clipboard.writeText(testChatOutput.value);
      toast.success('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
    }
  }
};

const handleUseLMStudioModel = async (model: LMStudioModel) => {
  switchingModel.value = true;
  switchingModelName.value = model.id;
  
  try {
    const config = modelStore.createLocalModelConfig('lmstudio', model.id, model.id, lmstudioHost.value, lmstudioPort.value);
    await modelStore.addModel(config);
    modelStore.setActiveModelByConfig(config);
    await conversationStore.loadModels();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    toast.success(`已切换到 ${model.id}`);
  } catch (error) {
    toast.error('切换模型失败');
  } finally {
    switchingModel.value = false;
    switchingModelName.value = '';
  }
};

const handleUseOllamaModel = async (model: OllamaModel) => {
  switchingModel.value = true;
  switchingModelName.value = model.name;
  
  try {
    const config = modelStore.createLocalModelConfig('ollama', model.name, model.name, ollamaHost.value, ollamaPort.value);
    await modelStore.addModel(config);
    modelStore.setActiveModelByConfig(config);
    await conversationStore.loadModels();
    
    await modelStore.runOllamaModel(model.name, ollamaHost.value, ollamaPort.value);
    
    toast.success(`已切换到 ${model.name}`);
  } catch (error) {
    toast.error('切换模型失败');
  } finally {
    switchingModel.value = false;
    switchingModelName.value = '';
  }
};

const handleAddLocalModel = async (provider: 'lmstudio' | 'ollama', model: { id?: string; name: string }) => {
  const config = modelStore.createLocalModelConfig(
    provider,
    model.id || model.name,
    model.name,
    provider === 'lmstudio' ? lmstudioHost.value : ollamaHost.value,
    provider === 'lmstudio' ? lmstudioPort.value : ollamaPort.value,
  );
  await modelStore.addModel(config);
  await conversationStore.loadModels();
  toast.success(`已添加模型 ${model.name}`);
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} GB`;
};

const handleTestChat = async () => {
  if (!testChatInput.value.trim()) {
    toast.warning('请输入测试消息');
    return;
  }
  
  if (!modelStore.activeModel) {
    toast.warning('请先选择一个模型');
    return;
  }
  
  testChatStreaming.value = true;
  testChatOutput.value = '';
  
  try {
    await chatService.streamChat(
      {
        model: modelStore.activeModel,
        messages: [{ 
          id: 'test-msg', 
          role: 'user', 
          content: testChatInput.value, 
          timestamp: Date.now() 
        }],
      },
      {
        onToken: (token) => {
          testChatOutput.value += token;
        },
        onComplete: (stats: CompletionStats) => {
          testChatStreaming.value = false;
          toast.success(`生成完成，耗时 ${stats.responseTime.toFixed(2)}s`);
        },
        onError: (error) => {
          testChatStreaming.value = false;
          toast.error(`生成失败: ${error}`);
        },
      }
    );
  } catch (error) {
    testChatStreaming.value = false;
    toast.error('请求失败');
  }
};

watch([lmstudioHost, lmstudioPort], () => {
  modelStore.lmstudioStatus = null;
  modelStore.lmstudioModels = [];
});

watch([ollamaHost, ollamaPort], () => {
  modelStore.ollamaStatus = null;
  modelStore.ollamaModels = [];
});

const startResize = (_e: MouseEvent) => {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
};

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return;
  const container = document.querySelector('.content-wrapper');
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const newWidth = containerRect.right - e.clientX;
  if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
    sidebarWidth.value = newWidth;
  }
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};
</script>

<template>
  <div class="models-page">
    <div v-if="switchingModel" class="switching-overlay">
      <div class="switching-modal">
        <RefreshCw :size="24" class="animate-spin" />
        <span>正在切换模型 {{ switchingModelName }}...</span>
      </div>
    </div>

    <div class="content-wrapper" :style="{ gridTemplateColumns: `1fr ${sidebarWidth}px` }">
      <div class="main-panel">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="search-box">
              <Search :size="16" class="search-icon" />
              <input v-model="searchQuery" type="text" placeholder="搜索模型配置..." />
            </div>
            <span class="model-count">{{ modelStore.models.length }} 个模型</span>
          </div>
          <div class="toolbar-right">
            <div v-if="runningModels.length > 0" class="running-badge">
              <Activity :size="12" />
              <span>{{ runningModels.length }} 个运行中</span>
              <button class="badge-refresh" @click="checkRunningModels" :disabled="checkingRunningModels">
                <RefreshCw :size="10" :class="{ 'animate-spin': checkingRunningModels }" />
              </button>
            </div>
            <Button 
              v-if="modelStore.activeModel" 
              variant="secondary" 
              size="sm"
              @click="handleStopCurrentModel"
              :disabled="switchingModel"
            >
              <PowerOff :size="14" />
              停止
            </Button>
            <Button variant="secondary" size="sm" @click="checkAllServices">
              <RefreshCw :size="14" />
              刷新
            </Button>
            <Button variant="primary" size="sm" @click="handleAddModel">
              <Plus :size="14" />
              添加
            </Button>
          </div>
        </div>

        <div v-if="runningModels.length > 0" class="running-models-section">
          <div class="section-title-bar">
            <Activity :size="16" class="pulse-icon" />
            <h3>运行中的模型</h3>
            <span class="running-badge-count">{{ runningModels.length }}</span>
            <button class="section-refresh-btn" @click="checkRunningModels" :disabled="checkingRunningModels">
              <RefreshCw :size="14" :class="{ 'animate-spin': checkingRunningModels }" />
            </button>
          </div>
          <div class="running-cards-grid">
            <div v-for="model in runningModels" :key="model.name" class="running-model-card">
              <div class="running-card-header">
                <div class="running-card-icon">
                  <Server :size="18" />
                </div>
                <div class="running-card-info">
                  <h4 class="running-card-name">{{ model.name }}</h4>
                  <p class="running-card-provider">Ollama</p>
                </div>
                <div class="running-status-badge">
                  <span class="status-dot"></span>
                  <span>运行中</span>
                </div>
              </div>
              <div class="running-card-body">
                <div class="running-card-meta">
                  <div class="meta-row">
                    <span class="meta-label">模型名称</span>
                    <span class="meta-value">{{ model.name }}</span>
                  </div>
                  <div v-if="model.size" class="meta-row">
                    <span class="meta-label">大小</span>
                    <span class="meta-value">{{ formatSize(model.size) }}</span>
                  </div>
                </div>
              </div>
              <div class="running-card-footer">
                <button 
                  class="running-use-btn"
                  @click="handleUseOllamaModel({ name: model.name, size: model.size || 0, digest: model.digest || '', modified_at: '' })"
                  :disabled="switchingModel"
                >
                  <Zap :size="14" />
                  使用
                </button>
                <button class="running-stop-btn" @click="handleStopOllamaModel(model.name)">
                  <PowerOff :size="14" />
                  停止
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="modelStore.loading" class="loading-state">
          <RefreshCw :size="24" class="animate-spin" />
          <span>加载中...</span>
        </div>

        <div v-else-if="modelStore.models.length === 0" class="empty-state">
          <div class="empty-icon">
            <HardDrive :size="48" />
          </div>
          <h3>暂无模型配置</h3>
          <p>点击「添加」或从右侧本地服务中选择模型</p>
        </div>

        <div v-else class="models-grid">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            class="model-card"
            :class="{ active: model.id === modelStore.activeModelId }"
          >
            <div class="card-header">
              <div class="card-icon" :class="model.type">
                <Globe v-if="model.type === 'remote'" :size="16" />
                <HardDrive v-else :size="16" />
              </div>
              <div class="card-info">
                <h4 class="card-title">{{ model.name }}</h4>
                <p class="card-provider">{{ model.provider }}</p>
              </div>
              <button class="star-btn" :class="{ active: model.isFavorite }" @click="handleToggleFavorite(model.id)">
                <Star :size="14" />
              </button>
            </div>
            
            <div class="card-body">
              <div class="card-meta">
                <span class="meta-item">
                  <span class="meta-label">模型</span>
                  <span class="meta-value">{{ model.model }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">温度</span>
                  <span class="meta-value">{{ model.temperature }}</span>
                </span>
              </div>
            </div>
            
            <div class="card-footer">
              <button class="footer-btn" @click="handleOpenParamsModal(model)" title="参数">
                <Sliders :size="13" />
              </button>
              <button class="footer-btn" @click="handleEditModel(model)" title="编辑">
                <Settings2 :size="13" />
              </button>
              <button class="footer-btn danger" @click="handleDeleteModel(model.id)" title="删除">
                <Trash2 :size="13" />
              </button>
              <button
                v-if="model.id !== modelStore.activeModelId"
                class="use-btn"
                @click="handleSetActive(model.id)"
              >
                <Zap :size="12" />
                使用
              </button>
              <div v-else class="active-indicator">
                <Check :size="12" />
                使用中
              </div>
            </div>
          </div>
        </div>

        <div v-if="modelStore.activeModel" class="test-section">
          <div class="active-model-card">
            <div class="model-card-icon" :class="modelStore.activeModel.type">
              <Globe v-if="modelStore.activeModel.type === 'remote'" :size="20" />
              <Server v-else :size="20" />
            </div>
            <div class="model-card-info">
              <div class="model-card-name">{{ modelStore.activeModel.name }}</div>
              <div class="model-card-meta">
                <span class="meta-tag">{{ modelStore.activeModel.provider }}</span>
                <span class="meta-divider">·</span>
                <span class="meta-tag">{{ modelStore.activeModel.model }}</span>
              </div>
            </div>
            <div class="model-card-status">
              <span class="status-indicator active"></span>
              <span class="status-text">使用中</span>
            </div>
            <div class="model-card-actions">
              <button class="action-btn" @click="handleOpenParamsModal(modelStore.activeModel)">
                <Sliders :size="14" />
              </button>
              <button class="action-btn" @click="handleEditModel(modelStore.activeModel)">
                <Settings2 :size="14" />
              </button>
              <button class="action-btn danger" @click="handleStopCurrentModel">
                <PowerOff :size="14" />
              </button>
            </div>
          </div>

          <div class="test-panel">
            <div class="test-header">
              <div class="header-left">
                <MessageSquare :size="18" />
                <h3>测试对话</h3>
              </div>
              <div class="header-right">
                <span class="typing-indicator" :class="{ active: testChatStreaming }">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </span>
                <span v-if="testChatStreaming" class="streaming-text">生成中...</span>
              </div>
            </div>
            
            <div class="test-input-area">
              <textarea 
                v-model="testChatInput" 
                placeholder="输入测试消息，与当前模型对话..."
                :disabled="testChatStreaming"
                rows="4"
                class="test-textarea"
              ></textarea>
            </div>
            
            <div class="test-actions">
              <Button variant="primary" size="sm" @click="handleTestChat" :disabled="!testChatInput.trim() || testChatStreaming" class="send-btn">
                <Send :size="14" />
                {{ testChatStreaming ? '生成中...' : '发送测试' }}
              </Button>
              <Button variant="secondary" size="sm" @click="testChatInput = ''; testChatOutput = ''" class="clear-btn">
                <Trash2 :size="14" />
                清空
              </Button>
            </div>
            
            <div v-if="testChatOutput" class="test-output">
              <div class="output-header">
                <span class="output-label">响应结果</span>
                <button class="copy-btn" @click="handleCopyOutput">
                  <Copy :size="12" />
                  复制
                </button>
              </div>
              <div class="output-content">{{ testChatOutput }}</div>
            </div>
          </div>
        </div>
      </div>

      <div 
        class="resize-handle" 
        :class="{ active: isResizing }"
        @mousedown="startResize"
      ></div>

      <div class="services-panel">
        <div class="services-header">
          <h2>本地服务</h2>
          <div class="services-status">
            <span class="status-item" :class="{ active: modelStore.lmstudioStatus?.running }">
              <Cpu :size="12" />
              LM Studio
            </span>
            <span class="status-item" :class="{ active: modelStore.ollamaStatus?.running }">
              <Server :size="12" />
              Ollama
            </span>
          </div>
        </div>

        <div v-if="runningModels.length > 0" class="running-section">
          <div class="running-header">
            <Activity :size="14" class="running-icon" />
            <span>运行中</span>
            <span class="running-count">{{ runningModels.length }}</span>
            <button class="refresh-btn" @click="checkRunningModels" :disabled="checkingRunningModels">
              <RefreshCw :size="12" :class="{ 'animate-spin': checkingRunningModels }" />
            </button>
          </div>
          <div class="running-list">
            <div v-for="model in runningModels" :key="model.name" class="running-item">
              <span>{{ model.name }}</span>
              <button class="stop-btn" @click="handleStopOllamaModel(model.name)">
                <PowerOff :size="12" />
              </button>
            </div>
          </div>
        </div>

        <div class="service-card" :class="{ connected: modelStore.lmstudioStatus?.running }">
          <div class="service-header" @click="lmstudioExpanded = !lmstudioExpanded">
            <div class="service-info">
              <Cpu :size="16" />
              <span class="service-name">LM Studio</span>
              <span class="service-status" :class="{ active: modelStore.lmstudioStatus?.running }">
                {{ modelStore.lmstudioStatus?.running ? '已连接' : '未连接' }}
              </span>
            </div>
            <ChevronDown v-if="lmstudioExpanded" :size="14" />
            <ChevronRight v-else :size="14" />
          </div>

          <div v-if="lmstudioExpanded" class="service-body">
            <div class="connection-row">
              <div class="address-input">
                <span>http://</span>
                <input v-model="lmstudioHost" type="text" placeholder="localhost" />
                <span>:</span>
                <input v-model.number="lmstudioPort" type="number" placeholder="1234" />
              </div>
              <Button variant="secondary" size="sm" @click="checkLMStudioConnection" :disabled="lmstudioChecking">
                <RefreshCw :size="12" :class="{ 'animate-spin': lmstudioChecking }" />
              </Button>
            </div>

            <div v-if="modelStore.lmstudioStatus?.running && modelStore.lmstudioModels.length > 0" class="models-list">
              <div v-for="model in modelStore.lmstudioModels" :key="model.id" class="model-item">
                <span class="model-name">{{ model.id }}</span>
                <div class="model-actions">
                  <button class="action-btn" @click="handleAddLocalModel('lmstudio', { id: model.id, name: model.id })">
                    <Plus :size="12" />
                  </button>
                  <button class="action-btn primary" @click="handleUseLMStudioModel(model)">
                    <Play :size="12" />
                  </button>
                </div>
              </div>
            </div>
            <div v-else-if="modelStore.lmstudioStatus?.running" class="empty-text">
              暂无已加载模型
            </div>
            <div v-else class="offline-text">
              服务未运行
            </div>
          </div>
        </div>

        <div class="service-card" :class="{ connected: modelStore.ollamaStatus?.running }">
          <div class="service-header" @click="ollamaExpanded = !ollamaExpanded">
            <div class="service-info">
              <Server :size="16" />
              <span class="service-name">Ollama</span>
              <span class="service-status" :class="{ active: modelStore.ollamaStatus?.running }">
                {{ modelStore.ollamaStatus?.running ? '已连接' : '未连接' }}
              </span>
            </div>
            <ChevronDown v-if="ollamaExpanded" :size="14" />
            <ChevronRight v-else :size="14" />
          </div>

          <div v-if="ollamaExpanded" class="service-body">
            <div class="connection-row">
              <div class="address-input">
                <span>http://</span>
                <input v-model="ollamaHost" type="text" placeholder="localhost" />
                <span>:</span>
                <input v-model.number="ollamaPort" type="number" placeholder="11434" />
              </div>
              <Button variant="secondary" size="sm" @click="checkOllamaConnection" :disabled="ollamaChecking">
                <RefreshCw :size="12" :class="{ 'animate-spin': ollamaChecking }" />
              </Button>
            </div>

            <div v-if="modelStore.ollamaStatus?.running" class="ollama-content">
              <div class="pull-row">
                <input v-model="ollamaPullName" type="text" placeholder="拉取模型，如 llama3.2" />
                <Button variant="primary" size="sm" @click="handlePullOllamaModel" :disabled="!ollamaPullName.trim()">
                  <Download :size="12" />
                </Button>
              </div>

              <div v-if="modelStore.ollamaModels.length > 0" class="models-list">
                <div v-for="model in modelStore.ollamaModels" :key="model.name" class="model-item">
                  <div class="model-info">
                    <span class="model-name">{{ model.name }}</span>
                    <span class="model-size">{{ formatSize(model.size) }}</span>
                  </div>
                  <div class="model-actions">
                    <button 
                      v-if="!runningModels.some(r => r.name === model.name)" 
                      class="action-btn run" 
                      @click="handleRunOllamaModel(model.name)"
                    >
                      <Power :size="12" />
                    </button>
                    <button 
                      v-else 
                      class="action-btn stop" 
                      @click="handleStopOllamaModel(model.name)"
                    >
                      <PowerOff :size="12" />
                    </button>
                    <button class="action-btn" @click="handleAddLocalModel('ollama', model)">
                      <Plus :size="12" />
                    </button>
                    <button class="action-btn primary" @click="handleUseOllamaModel(model)">
                      <Play :size="12" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-text">
                暂无已安装模型
              </div>
            </div>
            <div v-else class="offline-text">
              服务未运行
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
            <button class="type-btn" :class="{ active: formModelType === 'remote' }" @click="formModelType = 'remote'; form.type = 'remote'">
              <Globe :size="20" />
              <div class="type-info"><span class="type-name">远程模型</span><span class="type-desc">OpenAI、Claude等联网API</span></div>
            </button>
            <button class="type-btn" :class="{ active: formModelType === 'local' }" @click="formModelType = 'local'; form.type = 'local'">
              <HardDrive :size="20" />
              <div class="type-info"><span class="type-name">本地模型</span><span class="type-desc">LM Studio、Ollama等</span></div>
            </button>
          </div>
        </div>

        <div v-if="formModelType === 'local'" class="form-section">
          <h3 class="section-title">本地服务</h3>
          <div class="provider-selector">
            <button class="provider-btn" :class="{ active: localProvider === 'lmstudio' }" @click="localProvider = 'lmstudio'; customPort = 1234">LM Studio</button>
            <button class="provider-btn" :class="{ active: localProvider === 'ollama' }" @click="localProvider = 'ollama'; customPort = 11434">Ollama</button>
          </div>
          <div class="connection-config">
            <div class="form-row">
              <div class="form-field"><label>主机</label><input v-model="customHost" type="text" placeholder="localhost" /></div>
              <div class="form-field"><label>端口</label><input v-model="customPort" type="number" placeholder="1234" /></div>
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
              <option v-for="m in availableModels" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">基础配置</h3>
          <div class="form-grid">
            <div class="form-field"><label>模型名称 *</label><input v-model="form.name" type="text" placeholder="例如：GPT-4o" /></div>
            <div class="form-field"><label>供应商</label><input v-model="form.provider" type="text" placeholder="例如：OpenAI" /></div>
            <div class="form-field full-width"><label>API 地址 *</label><input v-model="form.apiUrl" type="text" placeholder="https://api.openai.com/v1/chat/completions" class="font-mono" /></div>
            <div v-if="formModelType === 'remote'" class="form-field full-width">
              <label>API Key</label>
              <div class="api-key-input">
                <input :type="showApiKey ? 'text' : 'password'" v-model="form.apiKey" placeholder="sk-..." class="font-mono" />
                <button class="toggle-visibility" @click="showApiKey = !showApiKey"><Eye v-if="!showApiKey" :size="16" /><EyeOff v-else :size="16" /></button>
              </div>
            </div>
            <div class="form-field"><label>模型标识</label><input v-model="form.model" type="text" placeholder="例如：gpt-4o" class="font-mono" /></div>
            <div class="form-field"><label>分组</label><input v-model="form.group" type="text" placeholder="例如：OpenAI" /></div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-header"><h3 class="section-title">参数配置</h3><label class="toggle-label"><input type="checkbox" v-model="useCustomParams" /><span>自定义参数</span></label></div>
          <div v-if="useCustomParams" class="params-config">
            <div class="form-grid-3">
              <div class="form-field"><label>Temperature</label><input v-model.number="form.temperature" type="number" min="0" max="2" step="0.1" /><span class="field-hint">0-2，越高越随机</span></div>
              <div class="form-field"><label>Top P</label><input v-model.number="form.topP" type="number" min="0" max="1" step="0.1" /><span class="field-hint">0-1，核采样</span></div>
              <div class="form-field"><label>最大 Tokens</label><input v-model.number="form.maxTokens" type="number" min="256" max="16384" step="256" /><span class="field-hint">256-16384</span></div>
            </div>
            <div class="presets"><label>快捷预设</label><div class="preset-buttons"><button v-for="preset in presetOptions" :key="preset.name" class="preset-btn" @click="applyPreset(preset)"><Zap :size="12" />{{ preset.name }}</button></div></div>
          </div>
          <div v-else class="default-params"><Settings2 :size="24" /><p>使用默认参数配置</p><span>开启"自定义参数"可调整 Temperature、Top P 等参数</span></div>
        </div>

        <div class="form-section">
          <h3 class="section-title">高级配置</h3>
          <div class="advanced-options">
            <div class="option-item"><div class="option-info"><span class="option-name">启用模型</span><span class="option-desc">关闭后模型将不在聊天页显示</span></div><label class="switch"><input type="checkbox" v-model="form.isActive" /><span class="slider"></span></label></div>
            <div class="option-item"><div class="option-info"><span class="option-name">收藏模型</span><span class="option-desc">收藏的模型将优先展示</span></div><button class="favorite-btn" @click="form.isFavorite = !form.isFavorite"><Star :size="20" :class="{ active: form.isFavorite }" /></button></div>
          </div>
        </div>

        <div v-if="formModelType === 'remote'" class="security-notice"><AlertCircle :size="16" /><span>API Key 将使用 AES-256 加密存储在本地，不会上传至任何服务器。</span></div>
      </div>

      <template #footer>
        <div class="modal-actions">
          <Button variant="secondary" @click="showAddModal = false">取消</Button>
          <Button variant="primary" @click="handleSaveModel" :disabled="!form.name || !form.apiUrl"><Check :size="16" />{{ editingModel ? '保存修改' : '添加模型' }}</Button>
        </div>
      </template>
    </Modal>

    <Modal v-if="showConfirmDialog" @close="handleConfirmNo">
      <template #header>
        <h2>确认操作</h2>
      </template>
      <div class="confirm-content">
        <AlertCircle :size="32" class="confirm-icon" />
        <p>{{ confirmMessage }}</p>
      </div>
      <template #footer>
        <div class="modal-actions">
          <Button variant="secondary" @click="handleConfirmNo">取消</Button>
          <Button variant="primary" @click="handleConfirmYes">确认</Button>
        </div>
      </template>
    </Modal>

    <Modal v-if="showModelInfoModal" @close="showModelInfoModal = false">
      <template #header>
        <h2>模型信息 - {{ selectedModelName }}</h2>
      </template>
      <div class="model-info-content">
        <pre v-if="selectedModelInfo">{{ JSON.stringify(selectedModelInfo, null, 2) }}</pre>
      </div>
      <template #footer>
        <div class="modal-actions">
          <Button variant="secondary" @click="showModelInfoModal = false">关闭</Button>
        </div>
      </template>
    </Modal>

    <Modal v-if="showParamsModal" @close="showParamsModal = false">
      <template #header>
        <h2>调整参数 - {{ editingParamsModel?.name }}</h2>
      </template>
      <div class="params-modal-content">
        <div class="form-grid-3">
          <div class="form-field">
            <label>Temperature</label>
            <input v-model.number="tempParams.temperature" type="number" min="0" max="2" step="0.1" />
            <span class="field-hint">0-2，越高越随机</span>
          </div>
          <div class="form-field">
            <label>Top P</label>
            <input v-model.number="tempParams.topP" type="number" min="0" max="1" step="0.1" />
            <span class="field-hint">0-1，核采样</span>
          </div>
          <div class="form-field">
            <label>最大 Tokens</label>
            <input v-model.number="tempParams.maxTokens" type="number" min="256" max="16384" step="256" />
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
              @click="tempParams.temperature = preset.temp; tempParams.topP = preset.topP; tempParams.maxTokens = preset.tokens"
            >
              <Zap :size="12" />{{ preset.name }}
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="modal-actions">
          <Button variant="secondary" @click="showParamsModal = false">取消</Button>
          <Button variant="primary" @click="handleSaveParams"><Check :size="16" />保存</Button>
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
  background: transparent;
}

.switching-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.switching-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 48px;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.content-wrapper {
  flex: 1;
  display: grid;
  gap: 0;
  overflow: hidden;
  position: relative;
}

.resize-handle {
  position: absolute;
  right: v-bind('sidebarWidth + "px"');
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.2s;
  transform: translateX(3px);
}

.resize-handle:hover,
.resize-handle.active {
  background: var(--primary-color);
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

.main-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: transparent;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(var(--bg-secondary-rgb, 30, 30, 35), 0.8);
  backdrop-filter: blur(10px);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  position: relative;
  width: 200px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
}

.search-box input {
  width: 100%;
  padding: 8px 10px 8px 32px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.search-box input:focus {
  border-color: var(--primary-color);
}

.model-count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.running-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  font-size: 11px;
  font-weight: 500;
}

.badge-refresh {
  padding: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #10b981;
}

.running-models-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.section-title-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section-title-bar h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.pulse-icon {
  color: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.running-badge-count {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
}

.section-refresh-btn {
  margin-left: auto;
  padding: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.section-refresh-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.running-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.running-model-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.3);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08));
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
}

.running-model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
}

.running-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.running-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #10b981;
}

.running-card-info {
  flex: 1;
  min-width: 0;
}

.running-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.running-card-provider {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 3px 0 0;
}

.running-status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 11px;
  font-weight: 500;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.running-card-body {
  margin-bottom: 12px;
}

.running-card-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.meta-row .meta-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.meta-row .meta-value {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
}

.running-card-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(16, 185, 129, 0.2);
}

.running-use-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #10b981, #06b6d4);
  border-radius: 8px;
  cursor: pointer;
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.running-use-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(16, 185, 129, 0.4);
}

.running-use-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.running-stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  cursor: pointer;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.running-stop-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-tertiary);
  gap: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  padding: 16px;
}

.model-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(var(--bg-secondary-rgb, 30, 30, 35), 0.5);
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
  cursor: default;
}

.model-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.model-card.active {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon.remote {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  color: #3b82f6;
}

.card-icon.local {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15));
  color: #10b981;
}

.card-info {
  flex: 1;
  min-width: 0;
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

.card-provider {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 3px 0 0;
}

.star-btn {
  padding: 5px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: 4px;
  transition: all 0.2s;
}

.star-btn:hover {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.star-btn.active {
  color: #f59e0b;
  fill: #f59e0b;
}

.card-body {
  margin-bottom: 10px;
}

.card-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.meta-label {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: ui-monospace, monospace;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.footer-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.2s;
}

.footer-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(59, 130, 246, 0.1);
}

.footer-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.use-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 6px 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.use-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(59, 130, 246, 0.4);
}

.active-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 6px 10px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 6px;
  color: #10b981;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.test-section {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.active-model-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
  backdrop-filter: blur(12px);
}

.model-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-card-icon.remote {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  color: #3b82f6;
}

.model-card-icon.local {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2));
  color: #10b981;
}

.model-card-info {
  flex: 1;
  min-width: 0;
}

.model-card-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.model-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.meta-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 11px;
}

.meta-divider {
  color: var(--text-tertiary);
  font-size: 12px;
}

.model-card-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.15);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.status-indicator.active {
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #10b981;
}

.model-card-actions {
  display: flex;
  gap: 8px;
}

.model-card-actions .action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.model-card-actions .action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(59, 130, 246, 0.1);
}

.model-card-actions .action-btn.danger:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.test-panel {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: rgba(var(--bg-secondary-rgb, 30, 30, 35), 0.6);
  backdrop-filter: blur(12px);
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.typing-indicator.active {
  opacity: 1;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.streaming-text {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 500;
}

.test-input-area {
  margin-bottom: 14px;
}

.test-textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: rgba(var(--bg-tertiary-rgb, 20, 20, 25), 0.8);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.test-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.test-textarea::placeholder {
  color: var(--text-tertiary);
}

.test-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 16px;
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.test-output {
  padding: 16px;
  border-radius: 10px;
  background: rgba(var(--bg-tertiary-rgb, 20, 20, 25), 0.8);
  border: 1px solid var(--border-color);
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.output-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.output-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.output-content::-webkit-scrollbar {
  width: 6px;
}

.output-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.output-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.output-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.services-panel {
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: rgba(var(--bg-secondary-rgb, 30, 30, 35), 0.5);
  backdrop-filter: blur(8px);
}

.services-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
}

.services-header h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.services-status {
  display: flex;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.status-item.active {
  color: #10b981;
}

.running-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(16, 185, 129, 0.03);
}

.running-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.running-icon {
  color: #10b981;
}

.running-count {
  padding: 1px 5px;
  border-radius: 6px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 10px;
}

.refresh-btn {
  margin-left: auto;
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
}

.running-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.running-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: rgba(16, 185, 129, 0.05);
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-primary);
}

.stop-btn {
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #ef4444;
}

.service-card {
  border-bottom: 1px solid var(--border-color);
}

.service-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
}

.service-header:hover {
  background: var(--bg-tertiary);
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.service-status {
  font-size: 10px;
  color: var(--text-tertiary);
}

.service-status.active {
  color: #10b981;
}

.service-body {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-row {
  display: flex;
  gap: 6px;
}

.address-input {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-tertiary);
}

.address-input input {
  flex: 1;
  min-width: 0;
  padding: 6px 2px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 11px;
  outline: none;
}

.address-input input:last-child {
  width: 40px;
  flex: none;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-size {
  font-size: 9px;
  color: var(--text-tertiary);
}

.model-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
}

.action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.action-btn.run {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.action-btn.stop {
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.empty-text, .offline-text {
  padding: 8px;
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
}

.ollama-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pull-row {
  display: flex;
  gap: 6px;
}

.pull-row input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 11px;
  outline: none;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 60vh;
  overflow-y: auto;
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
  border-radius: 10px;
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
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 5px;
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
  border-radius: 6px;
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
  border-radius: 8px;
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
  border-radius: 6px;
  font-size: 12px;
  color: var(--primary-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
  gap: 16px;
}

.confirm-icon {
  color: #f59e0b;
}

.confirm-content p {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
}

.model-info-content {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.model-info-content pre {
  margin: 0;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
}

.params-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .content-wrapper {
    grid-template-columns: 1fr;
  }
  
  .services-panel {
    border-left: none;
    border-top: 1px solid var(--border-color);
  }
}
</style>
