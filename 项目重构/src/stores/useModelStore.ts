import { defineStore } from 'pinia';
import type { ModelConfig, ModelPreset, LocalModelProvider, LocalServiceConfig } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import type { OllamaModel, LMStudioModel, LocalServiceStatus, OllamaStatus, LMStudioStatus } from '@/types/ollama';

interface ModelState {
  models: ModelConfig[];
  activeModelId: string | null;
  loading: boolean;
  ollamaStatus: OllamaStatus | null;
  lmstudioStatus: LMStudioStatus | null;
  ollamaModels: OllamaModel[];
  lmstudioModels: LMStudioModel[];
  localServices: Map<string, LocalServiceStatus>;
  runningModels: Map<string, boolean>;
}

export const useModelStore = defineStore('model', {
  state: (): ModelState => ({
    models: [],
    activeModelId: null,
    loading: false,
    ollamaStatus: null,
    lmstudioStatus: null,
    ollamaModels: [],
    lmstudioModels: [],
    localServices: new Map(),
    runningModels: new Map(),
  }),

  getters: {
    activeModel: (state) => 
      state.models.find(m => m.id === state.activeModelId),
    
    favoriteModels: (state) => 
      state.models.filter(m => m.isFavorite),
    
    modelsByGroup: (state) => {
      const groups: Record<string, ModelConfig[]> = {};
      state.models.forEach(model => {
        if (!groups[model.group]) {
          groups[model.group] = [];
        }
        groups[model.group].push(model);
      });
      return groups;
    },

    localModels: (state) => 
      state.models.filter(m => m.type === 'local'),
    
    remoteModels: (state) => 
      state.models.filter(m => m.type === 'remote'),
  },

  actions: {
    async loadModels() {
      this.loading = true;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const models = await invoke<ModelConfig[]>('get_models');
        this.models = models;
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        this.loading = false;
      }
    },

    async addModel(model: Omit<ModelConfig, 'id' | 'createdAt' | 'stats'>) {
      const newModel: ModelConfig = {
        ...model,
        id: uuidv4(),
        createdAt: Date.now(),
        stats: {
          totalCalls: 0,
          successCalls: 0,
          avgResponseTime: 0,
          lastUsed: null,
        },
      };
      
      this.models.push(newModel);
      await this.saveModels();
      
      return newModel;
    },

    async updateModel(id: string, updates: Partial<ModelConfig>) {
      const index = this.models.findIndex(m => m.id === id);
      if (index !== -1) {
        this.models[index] = { ...this.models[index], ...updates };
        await this.saveModels();
      }
    },

    async deleteModel(id: string) {
      this.models = this.models.filter(m => m.id !== id);
      if (this.activeModelId === id) {
        this.activeModelId = this.models[0]?.id ?? null;
      }
      await this.saveModels();
    },

    setActiveModel(id: string) {
      this.activeModelId = id;
    },

    toggleFavorite(id: string) {
      const model = this.models.find(m => m.id === id);
      if (model) {
        model.isFavorite = !model.isFavorite;
        this.saveModels();
      }
    },

    async addPreset(modelId: string, preset: Omit<ModelPreset, 'id'>) {
      const model = this.models.find(m => m.id === modelId);
      if (model) {
        model.presets.push({
          ...preset,
          id: uuidv4(),
        });
        await this.saveModels();
      }
    },

    async saveModels() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_models', { models: this.models });
      } catch (error) {
        console.error('Failed to save models:', error);
      }
    },

    async checkOllamaStatus(host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        const status = await invoke<LocalServiceStatus>('check_local_service', { 
          provider: 'ollama', 
          host, 
          port 
        });
        
        this.ollamaStatus = {
          running: status.running,
          version: status.version,
          models: [],
        };
        
        if (status.running) {
          const models = await invoke<OllamaModel[]>('ollama_get_models_with_addr', { host, port });
          this.ollamaModels = models;
          this.ollamaStatus.models = models;
          
          const psResult = await invoke<{ models: Array<{ name: string }> }>('ollama_ps', { host, port });
          if (psResult?.models) {
            psResult.models.forEach((m: { name: string }) => {
              this.runningModels.set(`ollama-${m.name}`, true);
            });
          }
        } else {
          this.ollamaModels = [];
        }
        
        return this.ollamaStatus;
      } catch (error) {
        console.error('Failed to check Ollama status:', error);
        this.ollamaStatus = { running: false, version: undefined, models: [] };
        this.ollamaModels = [];
        return null;
      }
    },

    async checkLMStudioStatus(host: string = 'localhost', port: number = 1234) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        const status = await invoke<LocalServiceStatus>('check_local_service', { 
          provider: 'lmstudio', 
          host, 
          port 
        });
        
        this.lmstudioStatus = {
          running: status.running,
          version: status.version,
          models: [],
        };
        
        if (status.running) {
          const models = await invoke<LMStudioModel[]>('lmstudio_get_models_with_addr', { host, port });
          this.lmstudioModels = models;
          this.lmstudioStatus.models = models;
          
          models.forEach(m => {
            this.runningModels.set(`lmstudio-${m.id}`, true);
          });
        } else {
          this.lmstudioModels = [];
        }
        
        return this.lmstudioStatus;
      } catch (error) {
        console.error('Failed to check LM Studio status:', error);
        this.lmstudioStatus = { running: false, version: undefined, models: [] };
        this.lmstudioModels = [];
        return null;
      }
    },

    async pullOllamaModel(modelName: string, host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('ollama_pull_model_with_addr', { host, port, modelName });
        await this.checkOllamaStatus(host, port);
      } catch (error) {
        console.error('Failed to pull Ollama model:', error);
        throw error;
      }
    },

    async deleteOllamaModel(modelName: string, host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('ollama_delete_model_with_addr', { host, port, modelName });
        await this.checkOllamaStatus(host, port);
      } catch (error) {
        console.error('Failed to delete Ollama model:', error);
        throw error;
      }
    },

    async showOllamaModel(modelName: string, host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke('ollama_show_model_with_addr', { host, port, modelName });
        return info;
      } catch (error) {
        console.error('Failed to show Ollama model:', error);
        throw error;
      }
    },

    async runOllamaModel(modelName: string, host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('ollama_run_model_with_addr', { host, port, modelName });
        this.runningModels.set(`ollama-${modelName}`, true);
        await this.checkOllamaStatus(host, port);
      } catch (error) {
        console.error('Failed to run Ollama model:', error);
        throw error;
      }
    },

    async stopOllamaModel(modelName: string, host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('ollama_stop_model_with_addr', { host, port, modelName });
        this.runningModels.delete(`ollama-${modelName}`);
        await this.checkOllamaStatus(host, port);
      } catch (error) {
        console.error('Failed to stop Ollama model:', error);
        throw error;
      }
    },

    async getOllamaRunningModels(host: string = 'localhost', port: number = 11434) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<{ models: Array<{ name: string }> }>('ollama_ps', { host, port });
        return result?.models || [];
      } catch (error) {
        console.error('Failed to get running models:', error);
        return [];
      }
    },

    isModelRunning(provider: string, modelName: string): boolean {
      return this.runningModels.get(`${provider}-${modelName}`) || false;
    },

    createLocalModelConfig(
      provider: LocalModelProvider,
      modelId: string,
      modelName: string,
      host?: string,
      port?: number
    ): Omit<ModelConfig, 'id' | 'createdAt' | 'stats'> {
      const defaultPorts: Record<LocalModelProvider, number> = {
        lmstudio: 1234,
        ollama: 11434,
        custom: 8080,
      };

      const defaultHosts: Record<LocalModelProvider, string> = {
        lmstudio: 'localhost',
        ollama: 'localhost',
        custom: 'localhost',
      };

      const finalHost = host || defaultHosts[provider];
      const finalPort = port || defaultPorts[provider];
      const baseUrl = `http://${finalHost}:${finalPort}`;

      const apiUrls: Record<LocalModelProvider, string> = {
        lmstudio: `${baseUrl}/v1/chat/completions`,
        ollama: `${baseUrl}/api/chat`,
        custom: `${baseUrl}/v1/chat/completions`,
      };

      const providerNames: Record<LocalModelProvider, string> = {
        lmstudio: 'LM Studio',
        ollama: 'Ollama',
        custom: 'Custom Local',
      };

      return {
        name: modelName,
        provider: providerNames[provider],
        type: 'local',
        apiUrl: apiUrls[provider],
        apiKey: '',
        model: modelId,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
        group: '本地模型',
        isFavorite: false,
        isActive: true,
        presets: [],
        localProvider: provider,
        localServiceConfig: {
          provider,
          host: finalHost,
          port: finalPort,
          baseUrl,
        },
        supportsVision: provider === 'ollama',
        supportsStreaming: true,
      };
    },

    async addLocalModelFromService(
      provider: LocalModelProvider,
      modelId: string,
      modelName: string,
      host?: string,
      port?: number
    ) {
      const modelConfig = this.createLocalModelConfig(provider, modelId, modelName, host, port);
      return await this.addModel(modelConfig);
    },

    setActiveModelByConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'stats'>) {
      const tempId = `temp-${Date.now()}`;
      const tempModel: ModelConfig = {
        ...config,
        id: tempId,
        createdAt: Date.now(),
        stats: {
          totalCalls: 0,
          successCalls: 0,
          avgResponseTime: 0,
          lastUsed: null,
        },
      };
      
      const existingIndex = this.models.findIndex(m => 
        m.type === 'local' && 
        m.localProvider === config.localProvider && 
        m.model === config.model
      );
      
      if (existingIndex >= 0) {
        this.activeModelId = this.models[existingIndex].id;
      } else {
        this.models.push(tempModel);
        this.activeModelId = tempId;
      }
    },
  },
});
