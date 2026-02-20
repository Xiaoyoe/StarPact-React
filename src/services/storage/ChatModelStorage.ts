import { IndexedDBStorage } from './IndexedDBStorage';
import type { ModelConfig, Conversation } from '@/store';

export interface ChatModelData {
  id: string;
  type: 'models' | 'conversations' | 'activeModelId' | 'activeConversationId';
  data: ModelConfig[] | Conversation[] | string | null;
  updatedAt: number;
}

export class ChatModelStorage {
  private static get dbStorage(): IndexedDBStorage {
    try {
      return IndexedDBStorage.getInstance();
    } catch (error) {
      console.error('Failed to get IndexedDB instance:', error);
      return {
        put: async () => {},
        get: async () => null,
        getAll: async () => [],
        delete: async () => {},
        clear: async () => {},
        storeFile: async () => {},
        getFile: async () => null,
        exportDatabase: async () => new Blob(),
        importDatabase: async () => {},
        close: () => {}
      } as any;
    }
  }

  static async saveModels(models: ModelConfig[]): Promise<boolean> {
    try {
      await this.dbStorage.put('chat-model', {
        id: 'models',
        type: 'models',
        data: models,
        updatedAt: Date.now()
      });
      console.log('模型配置保存成功');
      return true;
    } catch (error) {
      console.error('保存模型配置失败:', error);
      return false;
    }
  }

  static async loadModels(): Promise<ModelConfig[] | null> {
    try {
      const result = await this.dbStorage.get<ChatModelData>('chat-model', 'models');
      return result?.data as ModelConfig[] || null;
    } catch (error) {
      console.error('加载模型配置失败:', error);
      return null;
    }
  }

  static async saveConversations(conversations: Conversation[]): Promise<boolean> {
    try {
      await this.dbStorage.put('chat-model', {
        id: 'conversations',
        type: 'conversations',
        data: conversations,
        updatedAt: Date.now()
      });
      console.log('聊天记录保存成功');
      return true;
    } catch (error) {
      console.error('保存聊天记录失败:', error);
      return false;
    }
  }

  static async loadConversations(): Promise<Conversation[] | null> {
    try {
      const result = await this.dbStorage.get<ChatModelData>('chat-model', 'conversations');
      return result?.data as Conversation[] || null;
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      return null;
    }
  }

  static async saveActiveModelId(modelId: string | null): Promise<boolean> {
    try {
      await this.dbStorage.put('chat-model', {
        id: 'activeModelId',
        type: 'activeModelId',
        data: modelId,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('保存活动模型ID失败:', error);
      return false;
    }
  }

  static async loadActiveModelId(): Promise<string | null> {
    try {
      const result = await this.dbStorage.get<ChatModelData>('chat-model', 'activeModelId');
      return result?.data as string | null;
    } catch (error) {
      console.error('加载活动模型ID失败:', error);
      return null;
    }
  }

  static async saveActiveConversationId(conversationId: string | null): Promise<boolean> {
    try {
      await this.dbStorage.put('chat-model', {
        id: 'activeConversationId',
        type: 'activeConversationId',
        data: conversationId,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('保存活动对话ID失败:', error);
      return false;
    }
  }

  static async loadActiveConversationId(): Promise<string | null> {
    try {
      const result = await this.dbStorage.get<ChatModelData>('chat-model', 'activeConversationId');
      return result?.data as string | null;
    } catch (error) {
      console.error('加载活动对话ID失败:', error);
      return null;
    }
  }

  static async exportData(): Promise<Blob | null> {
    try {
      const models = await this.loadModels();
      const conversations = await this.loadConversations();
      const activeModelId = await this.loadActiveModelId();
      const activeConversationId = await this.loadActiveConversationId();
      
      const exportData = {
        models,
        conversations,
        activeModelId,
        activeConversationId,
        exportedAt: Date.now()
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('导出数据失败:', error);
      return null;
    }
  }

  static async importData(data: { models?: ModelConfig[]; conversations?: Conversation[]; activeModelId?: string | null; activeConversationId?: string | null }): Promise<boolean> {
    try {
      if (data.models) {
        await this.saveModels(data.models);
      }
      if (data.conversations) {
        await this.saveConversations(data.conversations);
      }
      if (data.activeModelId !== undefined) {
        await this.saveActiveModelId(data.activeModelId);
      }
      if (data.activeConversationId !== undefined) {
        await this.saveActiveConversationId(data.activeConversationId);
      }
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  static async clearAll(): Promise<boolean> {
    try {
      await this.dbStorage.clear('chat-model');
      console.log('聊天模型数据已清空');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
}
