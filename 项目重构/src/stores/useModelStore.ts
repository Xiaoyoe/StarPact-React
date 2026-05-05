import { defineStore } from 'pinia';
import type { ModelConfig, ModelPreset } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ModelState {
  models: ModelConfig[];
  activeModelId: string | null;
  loading: boolean;
}

export const useModelStore = defineStore('model', {
  state: (): ModelState => ({
    models: [],
    activeModelId: null,
    loading: false,
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
  },
});
