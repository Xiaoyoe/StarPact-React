import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import type { ModelConfig } from '@/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelId?: string;
  modelName?: string;
  isStreaming?: boolean;
  isFavorite?: boolean;
  thinking?: string;
  thinkingDuration?: number;
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  totalTokens?: number;
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([]);
  const activeConversationId = ref<string | null>(null);
  const models = ref<ModelConfig[]>([]);
  const activeModelId = ref<string | null>(null);
  const searchQuery = ref('');
  const isLoading = ref(false);

  const deleteConfirmEnabled = ref(true);
  const ollamaVerboseMode = ref(false);
  const ollamaThinkMode = ref(false);
  const ollamaChatMode = ref<'single' | 'multi'>('multi');
  const includeImagesInContext = ref(false);
  const showWelcomePage = ref(true);
  const compactMode = ref(false);
  const showNavigationDots = ref(true);
  const autoHideInputEnabled = ref(false);

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
      const activeModel = result?.find(m => m.isActive);
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
    const conversation: Conversation = {
      id: `conv_${generateId()}`,
      title: '新对话',
      messages: [],
      modelId: activeModelId.value || 'default',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
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
    conversation.updatedAt = Date.now();
    
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
    conversation.updatedAt = Date.now();
    
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
    conversation.updatedAt = Date.now();
    
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
    conversation.updatedAt = Date.now();
    
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
    
    conversation.isFavorite = !conversation.isFavorite;
    conversation.updatedAt = Date.now();
    
    try {
      await invoke('save_conversations', { conversations: conversations.value });
      return true;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      return false;
    }
  };

  const setDeleteConfirmEnabled = (enabled: boolean) => {
    deleteConfirmEnabled.value = enabled;
  };

  const setOllamaVerboseMode = (enabled: boolean) => {
    ollamaVerboseMode.value = enabled;
  };

  const setOllamaThinkMode = (enabled: boolean) => {
    ollamaThinkMode.value = enabled;
  };

  const setOllamaChatMode = (mode: 'single' | 'multi') => {
    ollamaChatMode.value = mode;
  };

  const setIncludeImagesInContext = (enabled: boolean) => {
    includeImagesInContext.value = enabled;
  };

  const setShowWelcomePage = (show: boolean) => {
    showWelcomePage.value = show;
  };

  const setCompactMode = (compact: boolean) => {
    compactMode.value = compact;
  };

  const setShowNavigationDots = (show: boolean) => {
    showNavigationDots.value = show;
  };

  const setAutoHideInputEnabled = (enabled: boolean) => {
    autoHideInputEnabled.value = enabled;
  };

  return {
    conversations,
    activeConversationId,
    models,
    activeModelId,
    searchQuery,
    isLoading,
    deleteConfirmEnabled,
    ollamaVerboseMode,
    ollamaThinkMode,
    ollamaChatMode,
    includeImagesInContext,
    showWelcomePage,
    compactMode,
    showNavigationDots,
    autoHideInputEnabled,
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
    setDeleteConfirmEnabled,
    setOllamaVerboseMode,
    setOllamaThinkMode,
    setOllamaChatMode,
    setIncludeImagesInContext,
    setShowWelcomePage,
    setCompactMode,
    setShowNavigationDots,
    setAutoHideInputEnabled,
  };
});
