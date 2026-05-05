import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { OllamaModel, OllamaStatus, OllamaPullProgress } from '@/types/ollama';

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[];
  }>;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_ctx?: number;
    num_predict?: number;
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message?: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export const ollamaService = {
  async checkStatus(): Promise<OllamaStatus> {
    return invoke<OllamaStatus>('ollama_check_status');
  },

  async getModels(): Promise<OllamaModel[]> {
    return invoke<OllamaModel[]>('ollama_get_models');
  },

  async pullModel(modelName: string): Promise<void> {
    return invoke('ollama_pull_model', { modelName });
  },

  async deleteModel(modelName: string): Promise<void> {
    return invoke('ollama_delete_model', { modelName });
  },

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return invoke<OllamaChatResponse>('ollama_chat', {
      model: request.model,
      messages: request.messages,
      options: request.options,
    });
  },

  onPullProgress(callback: (progress: OllamaPullProgress) => void) {
    return listen<OllamaPullProgress>('ollama:pull_progress', (event) => {
      callback(event.payload);
    });
  },
};
