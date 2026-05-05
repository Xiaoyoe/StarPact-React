import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model_id?: string;
  model_name?: string;
  is_streaming?: boolean;
  is_favorite?: boolean;
  thinking?: string;
  thinking_duration?: number;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model_id: string;
  created_at: number;
  updated_at: number;
  is_favorite: boolean;
  total_tokens?: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  type: string;
  api_url: string;
  api_key?: string;
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  is_active: boolean;
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([]);
  const activeConversationId = ref<string | null>(null);
  const models = ref<ModelConfig[]>([]);
  const activeModelId = ref<string | null>(null);
  const searchQuery = ref('');
  const isLoading = ref(false);

  const activeConversation = computed(() => {
    return conversations.value.find(c => c.id === activeConversationId.value);
  });

  const activeModel = computed(() => {
    return models.value.find(m => m.id === activeModelId.value);
  });

  const filteredConversations = computed(() => {
    if (!searchQuery.value) return conversations.value;
    const query = searchQuery.value.toLowerCase();
    return conversations.value.filter(c => 
      c.title.toLowerCase().includes(query)
    );
  });

  const loadConversations = async () => {
    try {
      const result = await invoke<Conversation[]>('get_conversations');
      conversations.value = result || [];
    } catch (error) {
      console.error('Failed to load conversations:', error);
      conversations.value = [];
    }
  };

  const loadModels = async () => {
    try {
      const result = await invoke<ModelConfig[]>('get_models');
      models.value = result || [];
      const activeModel = result?.find(m => m.is_active);
      if (activeModel) {
        activeModelId.value = activeModel.id;
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      models.value = [];
    }
  };

  const setActiveConversation = (id: string | null) => {
    activeConversationId.value = id;
  };

  const setActiveModel = (id: string | null) => {
    activeModelId.value = id;
  };

  const setSearchQuery = (query: string) => {
    searchQuery.value = query;
  };

  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createNewConversation = async () => {
    if (!activeModelId.value) {
      return null;
    }
    
    const conversation: Conversation = {
      id: `conv_${generateId()}`,
      title: '新对话',
      messages: [],
      model_id: activeModelId.value,
      created_at: Date.now(),
      updated_at: Date.now(),
      is_favorite: false,
    };
    
    conversations.value.unshift(conversation);
    activeConversationId.value = conversation.id;
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    conversations.value = conversations.value.filter(c => c.id !== conversationId);
    
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id || null;
    }
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  };

  const addMessage = async (conversationId: string, message: ChatMessage) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    conversation.messages.push(message);
    conversation.updated_at = Date.now();
    
    if (conversation.messages.length === 1 && message.role === 'user') {
      conversation.title = message.content.substring(0, 20) + (message.content.length > 20 ? '...' : '');
    }
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to add message:', error);
      return false;
    }
  };

  const updateMessage = async (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    const message = conversation.messages.find(m => m.id === messageId);
    if (!message) return false;
    
    Object.assign(message, updates);
    conversation.updated_at = Date.now();
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to update message:', error);
      return false;
    }
  };

  const deleteMessage = async (conversationId: string, messageId: string) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    conversation.messages = conversation.messages.filter(m => m.id !== messageId);
    conversation.updated_at = Date.now();
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  };

  const updateConversation = async (conversationId: string, updates: Partial<Conversation>) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    Object.assign(conversation, updates);
    conversation.updated_at = Date.now();
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return false;
    }
  };

  const toggleFavorite = async (conversationId: string) => {
    const conversation = conversations.value.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    conversation.is_favorite = !conversation.is_favorite;
    conversation.updated_at = Date.now();
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      return false;
    }
  };

  return {
    conversations,
    activeConversationId,
    models,
    activeModelId,
    searchQuery,
    isLoading,
    activeConversation,
    activeModel,
    filteredConversations,
    loadConversations,
    loadModels,
    setActiveConversation,
    setActiveModel,
    setSearchQuery,
    createNewConversation,
    deleteConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    updateConversation,
    toggleFavorite,
  };
});
