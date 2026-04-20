import { create } from 'zustand';
import { ChatModelStorage } from '@/services/storage/ChatModelStorage';
import { LogStorage } from '@/services/storage/LogStorage';

// ========== Types ==========
export type ThemeType = 'light' | 'dark' | 'tech-blue' | 'eye-care' | 'midnight-blue' | 'forest-green' | 'coral-orange' | 'lavender-purple' | 'mint-cyan' | 'caramel-brown' | 'sakura-pink' | 'deep-sea-blue' | 'amber-gold';

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

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// ========== Store ==========
interface AppState {
  // Theme
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;

  // Wallpaper
  chatWallpaper: string;
  setChatWallpaper: (wallpaper: string) => void;

  // Navigation
  activePage: 'chat' | 'models' | 'settings' | 'compare' | 'ini-config' | 'gallery' | 'video-player' | 'prompt-templates' | 'media-tools';
  setActivePage: (page: 'chat' | 'models' | 'settings' | 'compare' | 'ini-config' | 'gallery' | 'video-player' | 'prompt-templates' | 'media-tools') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Models
  models: ModelConfig[];
  activeModelId: string | null;
  addModel: (model: ModelConfig) => void;
  updateModel: (id: string, updates: Partial<ModelConfig>) => void;
  deleteModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  toggleModelFavorite: (id: string) => void;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  addConversation: (conv: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;

  // Logs
  logs: LogEntry[];
  logsPanelOpen: boolean;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setLogsPanelOpen: (open: boolean) => void;

  // Settings
  fontSize: number;
  setFontSize: (size: number) => void;
  layoutMode: 'compact' | 'comfortable' | 'wide';
  setLayoutMode: (mode: 'compact' | 'comfortable' | 'wide') => void;
  sendOnEnter: boolean;
  setSendOnEnter: (val: boolean) => void;
  storagePath: string;
  setStoragePath: (path: string) => void;
  compactMode: boolean;
  setCompactMode: (val: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Web Shortcuts
  webShortcutPopupOpen: boolean;
  setWebShortcutPopupOpen: (open: boolean) => void;

  // Data Manager
  dataManagerOpen: boolean;
  setDataManagerOpen: (open: boolean) => void;

  // Performance Modal
  performanceModalOpen: boolean;
  setPerformanceModalOpen: (open: boolean) => void;

  // Ollama
  ollamaModalOpen: boolean;
  setOllamaModalOpen: (open: boolean) => void;
  ollamaStatus: any;
  setOllamaStatus: (status: any) => void;
  ollamaModels: any[];
  setOllamaModels: (models: any[]) => void;
  ollamaLogs: any[];
  addOllamaLog: (log: any) => void;
  setOllamaLogs: (logs: any[]) => void;
  activeOllamaModel: string | null;
  setActiveOllamaModel: (modelName: string | null) => void;
  ollamaVerboseMode: boolean;
  setOllamaVerboseMode: (verbose: boolean) => void;
  ollamaThinkMode: boolean;
  setOllamaThinkMode: (think: boolean) => void;
  ollamaChatMode: 'single' | 'multi';
  setOllamaChatMode: (mode: 'single' | 'multi') => void;
  ollamaNumCtx: number;
  setOllamaNumCtx: (numCtx: number) => void;
  includeImagesInContext: boolean;
  setIncludeImagesInContext: (include: boolean) => void;
  deleteConfirmEnabled: boolean;
  setDeleteConfirmEnabled: (enabled: boolean) => void;

  // Ollama Pull Tasks
  pullTasks: Map<string, import('@/services/OllamaPullService').PullTask>;
  setPullTasks: (tasks: Map<string, import('@/services/OllamaPullService').PullTask>) => void;

  // Performance Metrics
  performanceMetrics: {
    requestId: string;
    modelName: string;
    conversationTitle: string;
    timestamp: number;
    modelLoadTime: number;
    promptEvalTime: number;
    inferenceTime: number;
    totalTime: number;
    totalTokens: number;
    throughput: number;
    firstTokenTime: number;
    promptTokens: number;
    completionTokens: number;
    temperature: number;
    topP: number;
    contextLength: number;
    numCtx: number;
    imageCount: number;
    currentRoundTokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    previousRoundTokens: {
      prompt: number;
      completion: number;
      total: number;
    } | null;
    totalConversationTokens: {
      prompt: number;
      completion: number;
      total: number;
    };
  } | null;
  setPerformanceMetrics: (metrics: any) => void;
  resetPerformanceMetrics: () => void;  resetPerformanceMetrics: () => void;

  // Persistence
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
  hydrateFromStorage: () => Promise<void>;
}

export const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Default models
const defaultModels: ModelConfig[] = [];

// Demo conversations
const demoConversations: Conversation[] = [
  {
    id: 'conv1',
    title: '关于React性能优化的讨论',
    modelId: 'gpt4',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    isFavorite: true,
    messages: [
      { id: 'm1', role: 'user', content: '请介绍一下 React 18 中有哪些主要的性能优化方案？', timestamp: Date.now() - 3600000 },
      { id: 'm2', role: 'assistant', content: `# React 18 性能优化方案

React 18 带来了多项重要的性能优化特性，以下是主要方案：

## 1. 自动批处理（Automatic Batching）
React 18 将所有状态更新自动批处理为一次渲染，包括 Promise、setTimeout 和事件处理中的更新。

\`\`\`tsx
// React 18 自动批处理
function handleClick() {
  setCount(c => c + 1);  // 不会触发重渲染
  setFlag(f => !f);       // 不会触发重渲染
  // React 只会在最后进行一次重渲染
}
\`\`\`

## 2. Transitions API
通过 \`useTransition\` 和 \`startTransition\` 区分紧急和非紧急更新：

\`\`\`tsx
import { useTransition } from 'react';

function SearchResults() {
  const [isPending, startTransition] = useTransition();
  
  function handleChange(e) {
    // 紧急更新：输入框内容
    setInputValue(e.target.value);
    
    // 非紧急更新：搜索结果
    startTransition(() => {
      setSearchQuery(e.target.value);
    });
  }
}
\`\`\`

## 3. useDeferredValue
延迟更新非关键 UI 部分：

\`\`\`tsx
const deferredValue = useDeferredValue(searchQuery);
\`\`\`

## 4. Suspense 改进
支持服务端渲染的 Suspense，配合 React.lazy 实现更好的代码分割。

## 5. 并发渲染（Concurrent Rendering）
React 可以中断渲染以处理更高优先级的更新，提升用户体验。

> **总结**：合理使用这些新特性，可以显著提升应用的响应速度和用户体验。`, timestamp: Date.now() - 3580000, modelName: 'GPT-4o' },
    ],
  },
  {
    id: 'conv2',
    title: 'Python FastAPI 项目结构设计',
    modelId: 'claude3',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
    isFavorite: false,
    messages: [
      { id: 'm3', role: 'user', content: '帮我设计一个 FastAPI 后端项目的目录结构', timestamp: Date.now() - 7200000 },
      { id: 'm4', role: 'assistant', content: `# FastAPI 项目目录结构设计

以下是一个推荐的 FastAPI 项目结构：

\`\`\`
project/
├── app/
│   ├── __init__.py
│   ├── main.py              # 应用入口
│   ├── config.py             # 配置管理
│   ├── dependencies.py       # 依赖注入
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py     # 路由聚合
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   └── items.py
│   │   │   └── schemas/
│   │   │       ├── auth.py
│   │   │       ├── users.py
│   │   │       └── items.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py       # 安全相关
│   │   └── exceptions.py     # 异常处理
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py           # 数据模型
│   ├── services/
│   │   ├── __init__.py
│   │   └── user_service.py   # 业务逻辑
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   └── helpers.py
│   └── db/
│       ├── __init__.py
│       ├── database.py       # 数据库连接
│       └── migrations/
├── tests/
├── .env
├── requirements.txt
└── docker-compose.yml
\`\`\`

这种结构遵循 **关注点分离** 原则，便于维护和扩展。`, timestamp: Date.now() - 7180000, modelName: 'Claude 3.5 Sonnet' },
    ],
  },
  {
    id: 'conv3',
    title: '机器学习入门指南',
    modelId: 'deepseek',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    isFavorite: false,
    messages: [
      { id: 'm5', role: 'user', content: '作为一个编程初学者，如何系统学习机器学习？', timestamp: Date.now() - 86400000 },
      { id: 'm6', role: 'assistant', content: `# 机器学习系统学习路径

## 📚 第一阶段：数学基础（2-4周）
- **线性代数**：矩阵运算、特征值分解
- **概率论**：条件概率、贝叶斯定理
- **微积分**：梯度、偏导数

## 💻 第二阶段：编程基础（2-4周）
- Python 基础语法
- NumPy、Pandas 数据处理
- Matplotlib 数据可视化

## 🤖 第三阶段：经典算法（4-6周）
| 算法 | 类型 | 难度 |
|------|------|------|
| 线性回归 | 回归 | ⭐ |
| 逻辑回归 | 分类 | ⭐⭐ |
| 决策树 | 分类/回归 | ⭐⭐ |
| SVM | 分类 | ⭐⭐⭐ |
| 随机森林 | 集成 | ⭐⭐⭐ |

## 🧠 第四阶段：深度学习（6-8周）
1. 神经网络基础
2. CNN（图像识别）
3. RNN/LSTM（序列数据）
4. Transformer（NLP）

> 💡 **建议**：边学边做项目，从 Kaggle 入门竞赛开始实践！`, timestamp: Date.now() - 86380000, modelName: 'DeepSeek V3' },
    ],
  },
];

export const useStore = create<AppState>((set, get) => {
  const debouncedSaveModels = debounce(async (models: ModelConfig[]) => {
    try {
      await ChatModelStorage.saveModels(models);
      console.log('模型保存成功:', models.length, '个模型');
    } catch (error) {
      console.error('模型保存失败:', error);
    }
  }, 300);

  const debouncedSaveConversations = debounce(async (conversations: Conversation[]) => {
    if (get().isHydrated) {
      await ChatModelStorage.saveConversations(conversations);
    }
  }, 300);

  const debouncedSaveActiveModelId = debounce(async (modelId: string | null) => {
    if (get().isHydrated) {
      await ChatModelStorage.saveActiveModelId(modelId);
    }
  }, 300);

  const debouncedSaveActiveConversationId = debounce(async (conversationId: string | null) => {
    if (get().isHydrated) {
      await ChatModelStorage.saveActiveConversationId(conversationId);
    }
  }, 300);

  const debouncedSaveLogs = debounce(async (logs: LogEntry[]) => {
    if (get().isHydrated) {
      await LogStorage.saveLogs(logs);
    }
  }, 500);

  const applyTheme = (theme: ThemeType) => {
    document.documentElement.className = theme === 'light' ? '' : `theme-${theme}`;
  };

  return {
  // Theme
  theme: 'light',
  setTheme: (theme) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyTheme(theme);
        set({ theme });
      });
    } else {
      applyTheme(theme);
      set({ theme });
    }
  },

  // Wallpaper
  chatWallpaper: '',
  setChatWallpaper: (wallpaper) => set({ chatWallpaper: wallpaper }),

  // Navigation
  activePage: 'chat',
  setActivePage: (page) => set({ activePage: page }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Models
  models: defaultModels,
  activeModelId: null,
  addModel: (model) => {
    set((state) => {
      const newModels = [...state.models, model];
      debouncedSaveModels(newModels);
      return { models: newModels };
    });
  },
  updateModel: (id, updates) => {
    set((state) => {
      const newModels = state.models.map((m) => (m.id === id ? { ...m, ...updates } : m));
      debouncedSaveModels(newModels);
      return { models: newModels };
    });
  },
  deleteModel: (id) => {
    set((state) => {
      const newModels = state.models.filter((m) => m.id !== id);
      const newActiveModelId = state.activeModelId === id ? (newModels[0]?.id ?? null) : state.activeModelId;
      debouncedSaveModels(newModels);
      if (state.activeModelId === id) {
        debouncedSaveActiveModelId(newActiveModelId);
      }
      return { models: newModels, activeModelId: newActiveModelId };
    });
  },
  setActiveModel: (id) => {
    set({ activeModelId: id });
    debouncedSaveActiveModelId(id);
  },
  toggleModelFavorite: (id) => {
    set((state) => {
      const newModels = state.models.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
      debouncedSaveModels(newModels);
      return { models: newModels };
    });
  },

  // Conversations
  conversations: [],
  activeConversationId: null,
  addConversation: (conv) => {
    set((state) => {
      const newConversations = [conv, ...state.conversations];
      debouncedSaveConversations(newConversations);
      debouncedSaveActiveConversationId(conv.id);
      return { conversations: newConversations, activeConversationId: conv.id };
    });
  },
  updateConversation: (id, updates) => {
    set((state) => {
      const newConversations = state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c));
      debouncedSaveConversations(newConversations);
      return { conversations: newConversations };
    });
  },
  deleteConversation: (id) => {
    set((state) => {
      const newConversations = state.conversations.filter((c) => c.id !== id);
      const newActiveConversationId = state.activeConversationId === id
        ? (newConversations[0]?.id ?? null)
        : state.activeConversationId;
      debouncedSaveConversations(newConversations);
      if (state.activeConversationId === id) {
        debouncedSaveActiveConversationId(newActiveConversationId);
      }
      return { conversations: newConversations, activeConversationId: newActiveConversationId };
    });
  },
  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    debouncedSaveActiveConversationId(id);
  },
  addMessage: (conversationId, message) => {
    set((state) => {
      const newConversations = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
          : c
      );
      debouncedSaveConversations(newConversations);
      return { conversations: newConversations };
    });
  },
  updateMessage: (conversationId, messageId, updates) => {
    set((state) => {
      const newConversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
            }
          : c
      );
      debouncedSaveConversations(newConversations);
      return { conversations: newConversations };
    });
  },
  deleteMessage: (conversationId, messageId) => {
    set((state) => {
      const newConversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            }
          : c
      );
      debouncedSaveConversations(newConversations);
      return { conversations: newConversations };
    });
  },

  // Logs
  logs: [
    { id: 'l1', level: 'info', message: '系统启动成功', timestamp: Date.now() - 60000, module: 'System' },
    { id: 'l2', level: 'info', message: '加载模型配置: 6个模型已就绪', timestamp: Date.now() - 55000, module: 'ModelManager' },
    { id: 'l3', level: 'info', message: '后端服务连接成功 (localhost:8000)', timestamp: Date.now() - 50000, module: 'Connection' },
    { id: 'l4', level: 'warn', message: 'LLaMA 3.1 70B 本地模型未启动', timestamp: Date.now() - 45000, module: 'ModelManager' },
    { id: 'l5', level: 'info', message: '主题加载: 浅色主题', timestamp: Date.now() - 40000, module: 'Theme' },
    { id: 'l6', level: 'debug', message: '对话历史加载完成: 3条记录', timestamp: Date.now() - 35000, module: 'Storage' },
  ],
  logsPanelOpen: false,
  addLog: (log) => set((state) => {
    const newLogs = [...state.logs, log];
    debouncedSaveLogs(newLogs);
    return { logs: newLogs };
  }),
  clearLogs: () => {
    set({ logs: [] });
    LogStorage.clearLogs();
  },
  setLogsPanelOpen: (open) => set({ logsPanelOpen: open }),

  // Settings
  fontSize: 14,
  setFontSize: (size) => set({ fontSize: size }),
  layoutMode: 'comfortable',
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  sendOnEnter: true,
  setSendOnEnter: (val) => set({ sendOnEnter: val }),
  storagePath: '',
  setStoragePath: (path) => set({ storagePath: path }),
  compactMode: false,
  setCompactMode: (val) => set({ compactMode: val }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Web Shortcuts
  webShortcutPopupOpen: false,
  setWebShortcutPopupOpen: (open) => set({ webShortcutPopupOpen: open }),

  // Data Manager
  dataManagerOpen: false,
  setDataManagerOpen: (open) => set({ dataManagerOpen: open }),

  // Performance Modal
  performanceModalOpen: false,
  setPerformanceModalOpen: (open) => set({ performanceModalOpen: open }),

  // Ollama
  ollamaModalOpen: false,
  setOllamaModalOpen: (open) => set({ ollamaModalOpen: open }),
  ollamaStatus: null,
  setOllamaStatus: (status) => set({ ollamaStatus: status }),
  ollamaModels: [],
  setOllamaModels: (models) => set({ ollamaModels: models }),
  ollamaLogs: [],
  addOllamaLog: (log) => set((state) => ({
    ollamaLogs: [...state.ollamaLogs, { ...log, timestamp: Date.now() }],
  })),
  setOllamaLogs: (logs) => set({ ollamaLogs: logs }),
  activeOllamaModel: null as string | null,
  setActiveOllamaModel: (modelName) => set({ activeOllamaModel: modelName }),
  ollamaVerboseMode: false,
  setOllamaVerboseMode: (verbose) => set({ ollamaVerboseMode: verbose }),
  ollamaThinkMode: true,
  setOllamaThinkMode: (think) => set({ ollamaThinkMode: think }),
  ollamaChatMode: 'multi' as 'single' | 'multi',
  setOllamaChatMode: (mode) => set({ ollamaChatMode: mode }),
  ollamaNumCtx: 4096,
  setOllamaNumCtx: (numCtx) => set({ ollamaNumCtx: numCtx }),
  includeImagesInContext: true,
  setIncludeImagesInContext: (include) => set({ includeImagesInContext: include }),
  deleteConfirmEnabled: true,
  setDeleteConfirmEnabled: (enabled) => set({ deleteConfirmEnabled: enabled }),

  // Ollama Pull Tasks
  pullTasks: new Map(),
  setPullTasks: (tasks) => set({ pullTasks: tasks }),

  // Performance Metrics
  performanceMetrics: null,
  setPerformanceMetrics: (metrics) => set({ performanceMetrics: metrics }),

  // Persistence
  isHydrated: false,
  setHydrated: (value) => set({ isHydrated: value }),
  hydrateFromStorage: async () => {
    try {
      const [models, conversations, activeModelId, activeConversationId] = await Promise.all([
        ChatModelStorage.loadModels(),
        ChatModelStorage.loadConversations(),
        ChatModelStorage.loadActiveModelId(),
        ChatModelStorage.loadActiveConversationId(),
      ]);

      if (models && models.length > 0) {
        set({ models });
      }

      if (conversations && conversations.length > 0) {
        set({ conversations });
      }

      if (activeModelId) {
        set({ activeModelId });
      }

      if (activeConversationId) {
        set({ activeConversationId });
      }

      set({ isHydrated: true });
      console.log('Store hydrated from storage successfully');
    } catch (error) {
      console.error('Failed to hydrate store from storage:', error);
      set({ isHydrated: false });
    }
  },
}});

export async function initializeStoreFromStorage() {
  const store = useStore.getState();
  
  try {
    const [models, conversations, activeModelId, activeConversationId, logs] = await Promise.all([
      ChatModelStorage.loadModels(),
      ChatModelStorage.loadConversations(),
      ChatModelStorage.loadActiveModelId(),
      ChatModelStorage.loadActiveConversationId(),
      LogStorage.loadLogs(),
    ]);
    
    if (models && models.length > 0) {
      useStore.setState({ models });
    }
    
    if (conversations && conversations.length > 0) {
      useStore.setState({ conversations });
    }
    
    if (logs && logs.length > 0) {
      useStore.setState({ logs });
    }
    
    if (activeModelId) {
      store.setActiveModel(activeModelId);
    }
    
    if (activeConversationId) {
      store.setActiveConversation(activeConversationId);
    }

    const { configStorage } = await import('@/services/storage/ConfigStorage');
    await configStorage.ready();
    const savedTheme = configStorage.get('theme');
    if (savedTheme) {
      store.setTheme(savedTheme);
    }
    
    store.setHydrated(true);
    console.log('Store hydrated from storage successfully');
  } catch (error) {
    console.error('Failed to hydrate store from storage:', error);
    store.setHydrated(false);
  }
}

