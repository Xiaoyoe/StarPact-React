import { invoke } from '@tauri-apps/api/core';
import type { ChatMessage, ModelConfig } from '@/stores';

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
    let thinkingStartTime = 0;
    let thinkingTime = 0;
    let completionTokens = 0;
    let promptTokens = 0;

    try {
      if (options.model.provider === 'ollama') {
        await this.streamOllamaChat(options, callbacks, (stats) => {
          completionTokens = stats.completionTokens;
          promptTokens = stats.promptTokens;
          if (stats.thinkingTime) {
            thinkingTime = stats.thinkingTime;
          }
        });
      } else {
        await this.streamRemoteChat(options, callbacks, (stats) => {
          completionTokens = stats.completionTokens;
          promptTokens = stats.promptTokens;
        });
      }

      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      callbacks.onComplete({
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        responseTime,
        thinkingTime,
        tokensPerSecond: completionTokens / responseTime,
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async streamOllamaChat(
    options: ChatOptions,
    callbacks: StreamCallbacks,
    onStats: (stats: Partial<CompletionStats>) => void
  ): Promise<void> {
    const messages = this.buildMessages(options);

    const request = {
      model: options.model.model,
      messages,
      stream: true,
      options: {
        temperature: options.temperature || options.model.temperature,
        top_p: options.model.top_p,
        num_ctx: options.model.max_tokens,
      },
    };

    let currentContent = '';
    let currentThinking = '';
    let isThinking = false;
    let promptTokens = 0;
    let completionTokens = 0;

    await invoke('stream_ollama_chat', {
      request,
      onEvent: (event: any) => {
        if (event.done) {
          onStats({
            promptTokens: event.prompt_eval_count || 0,
            completionTokens: event.eval_count || 0,
          });
          return;
        }

        const content = event.message?.content || '';
        
        if (options.thinkMode) {
          if (content.includes('<think')) {
            isThinking = true;
            thinkingStartTime = Date.now();
          }
          
          if (isThinking) {
            if (content.includes('</think')) {
              isThinking = false;
              const thinkingTime = (Date.now() - thinkingStartTime) / 1000;
              onStats({ thinkingTime });
            } else {
              currentThinking += content;
              callbacks.onThinking?.(currentThinking);
            }
          } else {
            currentContent += content;
            callbacks.onToken(content);
          }
        } else {
          currentContent += content;
          callbacks.onToken(content);
        }
      },
    });
  }

  private async streamRemoteChat(
    options: ChatOptions,
    callbacks: StreamCallbacks,
    onStats: (stats: Partial<CompletionStats>) => void
  ): Promise<void> {
    const messages = this.buildMessages(options);

    const request = {
      model: options.model.model,
      messages,
      stream: true,
      max_tokens: options.maxTokens || options.model.max_tokens,
      temperature: options.temperature || options.model.temperature,
    };

    let completionTokens = 0;

    await invoke('stream_remote_chat', {
      url: options.model.api_url,
      apiKey: options.model.api_key,
      request,
      onEvent: (event: any) => {
        if (event.done) {
          onStats({
            completionTokens,
            promptTokens: event.usage?.prompt_tokens || 0,
          });
          return;
        }

        const content = event.choices?.[0]?.delta?.content || '';
        if (content) {
          completionTokens++;
          callbacks.onToken(content);
        }
      },
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
      if (model.provider === 'ollama') {
        const result = await invoke<boolean>('test_ollama_connection', {
          model: model.model,
        });
        return result;
      } else {
        const result = await invoke<boolean>('test_remote_connection', {
          url: model.api_url,
          apiKey: model.api_key,
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
