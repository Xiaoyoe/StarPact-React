export type ThemeType = 
  | 'light' 
  | 'dark' 
  | 'tech-blue' 
  | 'eye-care' 
  | 'midnight-blue' 
  | 'forest-green' 
  | 'coral-orange' 
  | 'lavender-purple' 
  | 'mint-cyan' 
  | 'caramel-brown' 
  | 'sakura-pink' 
  | 'deep-sea-blue' 
  | 'amber-gold';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  type: 'remote' | 'local';
  apiUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  group: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: number;
  presets: ModelPreset[];
  stats: ModelStats;
}

export interface ModelPreset {
  id: string;
  name: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

export interface ModelStats {
  totalCalls: number;
  successCalls: number;
  avgResponseTime: number;
  lastUsed: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  modelName?: string;
  isStreaming?: boolean;
  isFavorite?: boolean;
  thinking?: string;
  showThinking?: boolean;
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

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  module: string;
}

export type PageType = 
  | 'chat' 
  | 'models' 
  | 'settings' 
  | 'compare' 
  | 'ini-config' 
  | 'gallery' 
  | 'video-player' 
  | 'prompt-templates' 
  | 'media-tools';
