export const APP_CONFIG = {
  name: 'AI Model WebUI',
  version: '1.0.0',
  description: '智能模型交互平台',
} as const;

export const STORAGE_KEYS = {
  THEME: 'ai-webui-theme',
  SETTINGS: 'ai-webui-settings',
  MODELS: 'ai-webui-models',
  CONVERSATIONS: 'ai-webui-conversations',
} as const;

export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;

export const UI_CONFIG = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 68,
  HEADER_HEIGHT: 56,
  INPUT_MAX_HEIGHT: 140,
  TOAST_DURATION: 3000,
} as const;
