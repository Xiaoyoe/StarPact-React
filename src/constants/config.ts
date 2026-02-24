export const APP_CONFIG = {
  name: '星约',
  version: '1.0.0',
  description: '多功能智能桌面应用',
} as const;

export const STORAGE_KEYS = {
  THEME: 'starpact-theme',
  SETTINGS: 'starpact-settings',
  MODELS: 'starpact-models',
  CONVERSATIONS: 'starpact-conversations',
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
