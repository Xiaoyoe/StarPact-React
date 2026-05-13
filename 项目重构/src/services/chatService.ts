import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ModelConfig } from '@/types';
import type { ChatMessage } from '@/stores/useConversationStore';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete: (stats: CompletionStats) => void;
  onError: (error: string) => void;
}

export interface CompletionStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime: number;
  thinkingTime?: number;
  tokensPerSecond?: number;
}

export interface ChatOptions {
  model: ModelConfig;
  messages: ChatMessage[];
  thinkMode?: boolean;
  verbose?: boolean;
  images?: string[];
  maxTokens?: number;
  temperature?: number;
}

class ChatService {
  async streamChat(options: ChatOptions, callbacks: StreamCallbacks): Promise<void> {
    const startTime = Date.now();
    let thinkingTime = 0;
    let completionTokens = 0;
    let promptTokens = 0;

    try {
      const provider = options.model.provider.toLowerCase();
      
      if (provider === 'ollama') {
        const stats = await this.streamOllamaChat(options, callbacks);
        completionTokens = stats.completionTokens;
        promptTokens = stats.promptTokens;
        thinkingTime = stats.thinkingTime || 0;
      } else {
        const stats = await this.streamRemoteChat(options, callbacks);
        completionTokens = stats.completionTokens;
        promptTokens = stats.promptTokens;
      }

      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      callbacks.onComplete({
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        responseTime,
        thinkingTime,
        tokensPerSecond: responseTime > 0 ? completionTokens / responseTime : 0,
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async streamOllamaChat(
    options: ChatOptions,
    callbacks: StreamCallbacks
  ): Promise<CompletionStats> {
    const messages = this.buildMessages(options);
    
    const apiUrl = options.model.apiUrl || 'http://localhost:11434/api/chat';
    
    const request: Record<string, unknown> = {
      url: apiUrl,
      model: options.model.model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature || options.model.temperature,
        top_p: options.model.topP,
        num_ctx: options.model.maxTokens,
      },
    };

    let completionTokens = 0;
    let promptTokens = 0;
    let thinkingTime = 0;
    let currentThinking = '';
    let isThinking = false;
    let thinkingStartTime = 0;

    return new Promise(async (resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Connection timeout'));
        }
      }, 600000);

      try {
        const unlisten = await listen<{
          done?: boolean;
          message?: { content: string };
          prompt_eval_count?: number;
          eval_count?: number;
          thinking?: string;
        }>('ollama:chat_event', (event) => {
          if (resolved) return;
          
          const payload = event.payload;
          
          if (payload.done) {
            clearTimeout(timeout);
            resolved = true;
            unlisten();
            resolve({
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              responseTime: 0,
              thinkingTime,
            });
            return;
          }

          if (payload.prompt_eval_count) {
            promptTokens = payload.prompt_eval_count;
          }
          if (payload.eval_count) {
            completionTokens = payload.eval_count;
          }

          const content = payload.message?.content || '';
          
          if (options.thinkMode && content) {
            if (content.includes('<think')) {
              isThinking = true;
              thinkingStartTime = Date.now();
            }
            
            if (isThinking) {
              if (content.includes('</think')) {
                isThinking = false;
                thinkingTime = (Date.now() - thinkingStartTime) / 1000;
              } else {
                currentThinking += content;
                callbacks.onThinking?.(currentThinking);
              }
            } else {
              completionTokens++;
              callbacks.onToken(content);
            }
          } else if (content) {
            completionTokens++;
            callbacks.onToken(content);
          }
        });

        await invoke('stream_ollama_chat', { request });
        
      } catch (error) {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          reject(error);
        }
      }
    });
  }

  private async streamRemoteChat(
    options: ChatOptions,
    callbacks: StreamCallbacks
  ): Promise<CompletionStats> {
    const messages = this.buildMessages(options);

    const request = {
      model: options.model.model,
      messages,
      stream: true,
      max_tokens: options.maxTokens || options.model.maxTokens,
      temperature: options.temperature || options.model.temperature,
    };

    let completionTokens = 0;
    let promptTokens = 0;

    return new Promise(async (resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Connection timeout'));
        }
      }, 600000);

      try {
        const unlisten = await listen<{
          done?: boolean;
          choices?: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number };
        }>('remote:chat_event', (event) => {
          if (resolved) return;
          
          const payload = event.payload;
          
          if (payload.done) {
            clearTimeout(timeout);
            resolved = true;
            unlisten();
            resolve({
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              responseTime: 0,
            });
            return;
          }

          const content = payload.choices?.[0]?.delta?.content || '';
          if (content) {
            completionTokens++;
            callbacks.onToken(content);
          }

          if (payload.usage?.prompt_tokens) {
            promptTokens = payload.usage.prompt_tokens;
          }
        });

        await invoke('stream_remote_chat', {
          url: options.model.apiUrl,
          apiKey: options.model.apiKey,
          request,
        });
        
      } catch (error) {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          reject(error);
        }
      }
    });
  }

  private buildMessages(options: ChatOptions): Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    images?: string[];
  }> {
    const messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      images?: string[];
    }> = [];

    for (const msg of options.messages) {
      const message: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        images?: string[];
      } = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.role === 'user' && msg.images && msg.images.length > 0) {
        message.images = msg.images;
      }

      messages.push(message);
    }

    if (options.images && options.images.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        lastUserMessage.images = options.images;
      }
    }

    return messages;
  }

  async testConnection(model: ModelConfig): Promise<boolean> {
    try {
      if (model.provider.toLowerCase() === 'ollama') {
        const result = await invoke<boolean>('test_ollama_connection', {
          model: model.model,
        });
        return result;
      } else {
        const result = await invoke<boolean>('test_remote_connection', {
          url: model.apiUrl,
          apiKey: model.apiKey,
          model: model.model,
        });
        return result;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getAvailableModels(provider: string): Promise<string[]> {
    try {
      if (provider === 'ollama') {
        const models = await invoke<string[]>('get_ollama_models');
        return models;
      }
      return [];
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }
}

export const chatService = new ChatService();
