import { defineStore } from 'pinia';
import type { Conversation, ChatMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingMessageId: string | null;
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    streamingMessageId: null,
  }),

  getters: {
    activeConversation: (state) => 
      state.conversations.find(c => c.id === state.activeConversationId),
    
    recentConversations: (state) => 
      [...state.conversations]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10),
    
    favoriteConversations: (state) => 
      state.conversations.filter(c => c.isFavorite),
  },

  actions: {
    async loadConversations() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const conversations = await invoke<Conversation[]>('get_conversations');
        this.conversations = conversations;
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    },

    createConversation(title: string, modelId: string): Conversation {
      const conversation: Conversation = {
        id: uuidv4(),
        title,
        messages: [],
        modelId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
      };
      
      this.conversations.unshift(conversation);
      this.activeConversationId = conversation.id;
      this.saveConversations();
      
      return conversation;
    },

    async deleteConversation(id: string) {
      this.conversations = this.conversations.filter(c => c.id !== id);
      if (this.activeConversationId === id) {
        this.activeConversationId = this.conversations[0]?.id ?? null;
      }
      await this.saveConversations();
    },

    setActiveConversation(id: string | null) {
      this.activeConversationId = id;
    },

    addMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage | null {
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (conversation) {
        const newMessage: ChatMessage = {
          ...message,
          id: uuidv4(),
          timestamp: Date.now(),
        };
        conversation.messages.push(newMessage);
        conversation.updatedAt = Date.now();
        this.saveConversations();
        return newMessage;
      }
      return null;
    },

    updateMessage(conversationId: string, messageId: string, updates: Partial<ChatMessage>) {
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (conversation) {
        const message = conversation.messages.find(m => m.id === messageId);
        if (message) {
          Object.assign(message, updates);
          conversation.updatedAt = Date.now();
          this.saveConversations();
        }
      }
    },

    deleteMessage(conversationId: string, messageId: string) {
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.messages = conversation.messages.filter(m => m.id !== messageId);
        conversation.updatedAt = Date.now();
        this.saveConversations();
      }
    },

    setStreamingMessageId(id: string | null) {
      this.streamingMessageId = id;
    },

    toggleFavorite(id: string) {
      const conversation = this.conversations.find(c => c.id === id);
      if (conversation) {
        conversation.isFavorite = !conversation.isFavorite;
        this.saveConversations();
      }
    },

    async saveConversations() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_conversations', { conversations: this.conversations });
      } catch (error) {
        console.error('Failed to save conversations:', error);
      }
    },
  },
});
