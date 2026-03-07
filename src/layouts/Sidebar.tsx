import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Bot, Settings, Plus, Search, Star,
  ChevronLeft, ChevronRight, Trash2, MoreHorizontal, FileText, Cpu, Settings2, Images, Play, ChevronUp, ChevronDown, BookOpen, Globe, Database, Sparkles, HardDrive, Check, X, Square, GripVertical, Clapperboard, Timer, Brain, MessageCircle, Image as ImageIcon
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { configStorage } from '@/services/storage/ConfigStorage';
import { PerformanceModal } from '@/components/PerformanceModal';
import { ollamaModelService } from '@/services/OllamaModelService';

interface PanelItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

export function Sidebar() {
  const {
    activePage, setActivePage,
    sidebarCollapsed, toggleSidebar,
    conversations, activeConversationId, setActiveConversation,
    addConversation, deleteConversation,
    models, activeModelId, setActiveModel,
    logs, setLogsPanelOpen,
    searchQuery, setSearchQuery,
    ollamaModalOpen, setOllamaModalOpen,
    theme, setTheme,
    webShortcutPopupOpen, setWebShortcutPopupOpen,
    dataManagerOpen, setDataManagerOpen,
    chatWallpaper, setChatWallpaper,
    ollamaModels, activeOllamaModel, setActiveOllamaModel,
    ollamaStatus,
    performanceModalOpen, setPerformanceModalOpen,
    ollamaVerboseMode, setOllamaVerboseMode,
    ollamaThinkMode, setOllamaThinkMode,
    ollamaChatMode, setOllamaChatMode,
    includeImagesInContext, setIncludeImagesInContext,
    showTokenEstimate, setShowTokenEstimate,
  } = useStore();

  const toast = useToast();

  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [bottomPanelsVisible, setBottomPanelsVisible] = useState(true);
  const [wallpaperPopupOpen, setWallpaperPopupOpen] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [switchingModel, setSwitchingModel] = useState(false);
  
  const [panelOrder, setPanelOrder] = useState<string[]>(['model', 'performance', 'logs', 'wallpaper', 'database']);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');

  useEffect(() => {
    const loadConfig = async () => {
      await configStorage.ready();
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      if (savedAppNameDisplay) {
        setAppNameDisplay(savedAppNameDisplay);
      }
      
      const savedVerboseMode = configStorage.get('ollamaVerboseMode');
      const savedThinkMode = configStorage.get('ollamaThinkMode');
      const savedChatMode = configStorage.get('ollamaChatMode');
      const savedShowTokenEstimate = configStorage.get('showTokenEstimate');
      const savedIncludeImagesInContext = configStorage.get('includeImagesInContext');
      
      if (savedVerboseMode !== undefined) {
        setOllamaVerboseMode(savedVerboseMode);
      }
      if (savedThinkMode !== undefined) {
        setOllamaThinkMode(savedThinkMode);
      }
      if (savedChatMode !== undefined) {
        setOllamaChatMode(savedChatMode);
      }
      if (savedShowTokenEstimate !== undefined) {
        setShowTokenEstimate(savedShowTokenEstimate);
      }
      if (savedIncludeImagesInContext !== undefined) {
        setIncludeImagesInContext(savedIncludeImagesInContext);
      }
    };
    loadConfig();

    const checkInterval = setInterval(loadConfig, 1000);
    return () => clearInterval(checkInterval);
  }, []);

  const activeModel = models.find(m => m.id === activeModelId);
  const isLightTheme = theme === 'light';
  const isDarkTheme = theme === 'dark';

  const handleSwitchOllamaModel = async (newModelName: string) => {
    if (ollamaModelService.isSwitching()) {
      toast.info('正在切换模型中，请稍候', { duration: 2000 });
      return;
    }

    await ollamaModelService.switchModel(
      newModelName,
      toast,
      () => {
        setShowModelSelect(false);
      },
      () => {
        // 错误处理已在服务中完成
      }
    );
  };

  const handleStopCurrentModel = async () => {
    if (!activeOllamaModel && !activeModelId) {
      toast.info('当前没有运行中的模型', { duration: 2000 });
      return;
    }

    if (activeOllamaModel) {
      await ollamaModelService.stopModel(
        activeOllamaModel,
        toast,
        () => {
          setShowModelSelect(false);
        },
        () => {
          // 错误处理已在服务中完成
        }
      );
    } else if (activeModelId) {
      const currentModelName = activeModel?.name || '模型';
      setActiveModel(null);
      toast.success(`已取消选择 ${currentModelName}`, { duration: 2000 });
      setShowModelSelect(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...panelOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    setPanelOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const panelItems: PanelItem[] = [
    {
      id: 'model',
      icon: <Sparkles size={14} />,
      title: '模型指示器',
      subtitle: activeOllamaModel || activeModel?.name || '未选择模型',
      onClick: () => setShowModelSelect(true),
    },
    {
      id: 'performance',
      icon: <Timer size={14} />,
      title: '性能查看',
      subtitle: '运行耗时与指标',
      onClick: () => setPerformanceModalOpen(true),
    },
    {
      id: 'logs',
      icon: <FileText size={13} />,
      title: '系统日志',
      subtitle: `${logs.length} 条记录`,
      onClick: () => setLogsPanelOpen(true),
    },
    {
      id: 'wallpaper',
      icon: <Images size={14} />,
      title: '聊天壁纸设置',
      subtitle: chatWallpaper ? '已设置壁纸' : '未设置壁纸',
      onClick: () => setWallpaperPopupOpen(true),
    },
    {
      id: 'database',
      icon: <Database size={14} />,
      title: '数据库管理',
      subtitle: '查看本地存储数据',
      onClick: () => setDataManagerOpen(true),
    },
  ];

  const orderedPanelItems = panelOrder.map(id => panelItems.find(item => item.id === id)!).filter(Boolean);

  const handleThemeToggle = () => {
    if (isLightTheme) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewChat = () => {
    const newConv = {
      id: generateId(),
      title: '新对话',
      messages: [],
      modelId: activeModelId || models[0]?.id || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };
    addConversation(newConv);
    setActivePage('chat');
  };

  const navItems = [
    { id: 'chat' as const, icon: MessageSquare, label: '聊天' },
    { id: 'models' as const, icon: Bot, label: '模型管理' },
    { id: 'gallery' as const, icon: Images, label: '图片管理' },
    { id: 'video-player' as const, icon: Play, label: '视频播放器' },
    { id: 'media-tools' as const, icon: Clapperboard, label: '媒体工具' },
    { id: 'prompt-templates' as const, icon: BookOpen, label: '提示词模板' },
    { id: 'compare' as const, icon: FileText, label: '文本对比' },
    { id: 'ini-config' as const, icon: Settings2, label: 'INI配置' },
    { id: 'settings' as const, icon: Settings, label: '设置' },
  ];

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  return (
    <>
      {/* Model Selector Modal */}
      <AnimatePresence>
        {showModelSelect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowModelSelect(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--primary-light)' }}
                  >
                    <Sparkles size={18} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      选择模型
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      当前: {activeOllamaModel || activeModel?.name || '未选择'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStopCurrentModel}
                    disabled={!activeOllamaModel && !activeModelId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{ 
                      color: activeOllamaModel ? 'var(--error-color)' : 'var(--text-secondary)', 
                      backgroundColor: activeOllamaModel ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                    title={activeOllamaModel ? '停止当前模型' : '取消选择当前模型'}
                  >
                    <Square size={12} />
                    {activeOllamaModel ? '停止模型' : '取消选择'}
                  </button>
                  <button
                    onClick={() => setShowModelSelect(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Token Estimate Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <Database size={14} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Token 估算</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>显示对话 token 数</span>
                </div>
                <button
                  onClick={() => {
                    const newValue = !showTokenEstimate;
                    setShowTokenEstimate(newValue);
                    configStorage.set('showTokenEstimate', newValue);
                    toast.info(newValue ? '已开启 Token 估算显示' : '已关闭 Token 估算显示', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: showTokenEstimate ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={showTokenEstimate ? '关闭 Token 估算' : '开启 Token 估算'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: showTokenEstimate ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Verbose Mode Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <Timer size={14} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>详细模式</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>开启后显示性能指标</span>
                </div>
                <button
                  onClick={() => {
                    const newValue = !ollamaVerboseMode;
                    setOllamaVerboseMode(newValue);
                    configStorage.set('ollamaVerboseMode', newValue);
                    toast.info(newValue ? '已开启详细模式，下次请求将显示性能指标' : '已关闭详细模式', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: ollamaVerboseMode ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={ollamaVerboseMode ? '关闭详细模式' : '开启详细模式'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: ollamaVerboseMode ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Think Mode Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <Brain size={14} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>思考模式</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>启用模型思考能力</span>
                </div>
                <button
                  onClick={() => {
                    const newValue = !ollamaThinkMode;
                    setOllamaThinkMode(newValue);
                    configStorage.set('ollamaThinkMode', newValue);
                    toast.info(newValue ? '已开启思考模式' : '已关闭思考模式', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: ollamaThinkMode ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={ollamaThinkMode ? '关闭思考模式' : '开启思考模式'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: ollamaThinkMode ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Chat Mode Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>对话模式</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {ollamaChatMode === 'multi' ? '多轮对话(有记忆)' : '单轮对话(无记忆)'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newMode = ollamaChatMode === 'multi' ? 'single' : 'multi';
                    setOllamaChatMode(newMode);
                    configStorage.set('ollamaChatMode', newMode);
                    toast.info(newMode === 'multi' ? '已切换到多轮对话模式，AI将记住上下文' : '已切换到单轮对话模式，每次对话独立', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: ollamaChatMode === 'multi' ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={ollamaChatMode === 'multi' ? '切换到单轮对话' : '切换到多轮对话'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: ollamaChatMode === 'multi' ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Include Images Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} style={{ color: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>携带图片</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    多轮对话包含图片
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newValue = !includeImagesInContext;
                    setIncludeImagesInContext(newValue);
                    configStorage.set('includeImagesInContext', newValue);
                    toast.info(newValue ? '多轮对话将携带图片数据' : '多轮对话将不携带图片数据', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: includeImagesInContext ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={includeImagesInContext ? '关闭图片携带' : '开启图片携带'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: includeImagesInContext ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Content */}
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border-color)' }}>
                {/* 左侧：Ollama 本地模型 */}
                <div className="flex flex-col">
                  <div className="px-4 py-3 text-xs font-medium shrink-0 flex items-center gap-2 border-b" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <HardDrive size={14} />
                    Ollama 本地模型
                  </div>
                  <div className="overflow-y-auto max-h-80 flex-1 p-2">
                    {ollamaStatus?.isRunning && ollamaModels.length > 0 ? (
                      <div className="space-y-1">
                        {ollamaModels.map((model: any) => (
                          <button
                            key={`ollama-${model.name}`}
                            onClick={() => handleSwitchOllamaModel(model.name)}
                            disabled={switchingModel}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-50"
                            style={{
                              backgroundColor: model.name === activeOllamaModel ? 'var(--primary-light)' : 'transparent',
                              border: `1px solid ${model.name === activeOllamaModel ? 'var(--primary-color)' : 'var(--border-light)'}`,
                            }}
                          >
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold shrink-0"
                              style={{
                                backgroundColor: 'rgba(0,180,42,0.1)',
                                color: 'var(--success-color)',
                              }}
                            >
                              {model.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                              </div>
                              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {model.details?.parameter_size || '未知大小'}
                              </div>
                            </div>
                            {model.name === activeOllamaModel && (
                              <Check size={16} className="shrink-0" style={{ color: 'var(--primary-color)' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <HardDrive size={32} className="mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {ollamaStatus?.isRunning ? '暂无本地模型' : 'Ollama 未连接'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          请在模型管理中启动 Ollama
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：远程模型 */}
                <div className="flex flex-col">
                  <div className="px-4 py-3 text-xs font-medium shrink-0 flex items-center gap-2 border-b" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <Globe size={14} />
                    远程模型
                  </div>
                  <div className="overflow-y-auto max-h-80 flex-1 p-2">
                    {models.filter(m => m.isActive).length > 0 ? (
                      <div className="space-y-1">
                        {models.filter(m => m.isActive).map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setActiveModel(model.id);
                              setActiveOllamaModel(null);
                              setShowModelSelect(false);
                              toast.success(`已切换到 ${model.name}`, { duration: 2000 });
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                            style={{
                              backgroundColor: model.id === activeModelId && !activeOllamaModel ? 'var(--primary-light)' : 'transparent',
                              border: `1px solid ${model.id === activeModelId && !activeOllamaModel ? 'var(--primary-color)' : 'var(--border-light)'}`,
                            }}
                          >
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold shrink-0"
                              style={{
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary-color)',
                              }}
                            >
                              {model.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                              </div>
                              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {model.provider}
                              </div>
                            </div>
                            {model.id === activeModelId && !activeOllamaModel && (
                              <Check size={16} className="shrink-0" style={{ color: 'var(--primary-color)' }} />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <Globe size={32} className="mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                          暂无远程模型
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          请在模型管理中添加
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallpaper Selection Popup */}
      <AnimatePresence>
        {wallpaperPopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4"
            onClick={() => setWallpaperPopupOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                选择聊天壁纸
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { id: 'ling', name: '玲', path: '/src/images/background/ling.jpg' },
                  { id: 'xue', name: '雪', path: '/src/images/background/xue.png' },
                  { id: 'pool', name: '泳池', path: '/src/images/background/五女泳池.jpg' },
                  { id: 'girl', name: '宅家少女', path: '/src/images/background/宅家少女.png' }
                ].map((wallpaper) => (
                  <button
                    key={wallpaper.id}
                    onClick={() => {
                      setChatWallpaper(wallpaper.path);
                      setWallpaperPopupOpen(false);
                    }}
                    className="rounded-lg overflow-hidden transition-all active:scale-[0.98]"
                    style={{
                      border: `2px solid ${chatWallpaper === wallpaper.path ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={wallpaper.path}
                        alt={wallpaper.name}
                        className="w-full h-full object-cover"
                      />
                      {chatWallpaper === wallpaper.path && (
                        <div className="absolute inset-0 bg-primary-color bg-opacity-20 flex items-center justify-center">
                          <div className="bg-primary-color text-white text-xs px-2 py-1 rounded-full">
                            ✓ 当前
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {wallpaper.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setWallpaperPopupOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setChatWallpaper('');
                    setWallpaperPopupOpen(false);
                  }}
                  className="rounded-lg px-4 py-2 text-sm transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  清除壁纸
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Modal */}
      <PerformanceModal isOpen={performanceModalOpen} onClose={() => setPerformanceModalOpen(false)} />

      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 68 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex h-full flex-col border-r no-select"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          paddingBottom: '60px'
        }}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-3" style={{ height: 56 }}>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Bot size={18} color="white" />
            </div>
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {appNameDisplay === 'chinese' ? '星约' : 'Starpact'}
            </span>
          </motion.div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 font-medium transition-all",
            "hover:opacity-90 active:scale-[0.98]"
          )}
          style={{
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Plus size={18} />
          {!sidebarCollapsed && <span>新建对话</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-3 pb-2">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
                "hover:opacity-80"
              )}
              style={{
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                backgroundColor: activePage === item.id ? 'var(--primary-light)' : 'transparent',
                color: activePage === item.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: activePage === item.id ? 600 : 400,
              }}
            >
              <item.icon size={18} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1" style={{ borderTop: '1px solid var(--border-light)' }} />

      {/* Search (chat page only) */}
      {!sidebarCollapsed && activePage === 'chat' && (
        <div className="px-3 py-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          >
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="搜索对话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Conversations List */}
      {activePage === 'chat' && (
        <div className="flex-1 overflow-y-auto px-3 py-1">
          {!sidebarCollapsed && (
            <div className="mb-1 px-1 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              对话记录 ({filteredConversations.length})
            </div>
          )}
          <AnimatePresence>
            {filteredConversations.map((conv) => {
              const convModel = models.find(m => m.id === conv.modelId);
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                  onClick={() => setActiveConversation(conv.id)}
                  className={cn(
                    "group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                    "hover:opacity-90"
                  )}
                  style={{
                    backgroundColor: activeConversationId === conv.id ? 'var(--primary-light)' : 'transparent',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}
                >
                  {sidebarCollapsed ? (
                    <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          {conv.isFavorite && <Star size={12} style={{ color: 'var(--warning-color)' }} fill="var(--warning-color)" />}
                          <span
                            className="truncate text-sm"
                            style={{
                              color: activeConversationId === conv.id ? 'var(--primary-color)' : 'var(--text-primary)',
                              fontWeight: activeConversationId === conv.id ? 500 : 400,
                            }}
                          >
                            {conv.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <span>{convModel?.name || '未知模型'}</span>
                          <span>·</span>
                          <span>{formatTime(conv.updatedAt)}</span>
                        </div>
                      </div>
                      {hoveredConv === conv.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 内容占位符，确保展开面板位置一致 */}
      {activePage !== 'chat' && <div className="flex-1"></div>}

      {/* Bottom panels (with animation) */}
      {!sidebarCollapsed && (
        <AnimatePresence>
          {bottomPanelsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full"
            >
              <div className="px-3 py-2 space-y-1" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {orderedPanelItems.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={item.onClick}
                    className="flex cursor-pointer items-center gap-2 rounded-lg p-2.5 transition-all"
                    style={{ 
                      backgroundColor: draggedIndex === index ? 'var(--bg-tertiary)' : 'var(--bg-primary)', 
                      border: `1px solid ${dragOverIndex === index ? 'var(--primary-color)' : 'var(--border-light)'}`,
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transform: dragOverIndex === index ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {item.subtitle}
                      </div>
                    </div>
                    <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Bottom navigation bar */}
      <motion.div 
        className="border-t" 
        initial={{ width: sidebarCollapsed ? 68 : 280 }}
        animate={{ width: sidebarCollapsed ? 68 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--border-color)',
          position: 'fixed',
          bottom: 0,
          zIndex: 10
        }}
      >
        {sidebarCollapsed ? (
          /* 侧边栏收缩状态：垂直排列，只显示三个按钮 */
          <div className="flex flex-col items-center justify-center py-2 gap-2">
            {/* Web shortcut button */}
            <button
              onClick={() => setWebShortcutPopupOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title="快捷网页"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Globe size={18} />
              </div>
            </button>

            {/* Ollama manager button */}
            <button
              onClick={() => setOllamaModalOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title="Ollama 管理器"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Cpu size={18} />
              </div>
            </button>

            {/* Theme toggle button */}
            <button
              onClick={handleThemeToggle}
              className="flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title={isLightTheme ? '切换到深色主题' : '切换到浅色主题'}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {isLightTheme ? '☀️' : '🌙'}
              </div>
            </button>
          </div>
        ) : (
          /* 侧边栏展开状态：水平排列，显示四个按钮 */
          <div className="flex items-center justify-around py-2">
            {/* Theme toggle button */}
            <button
              onClick={handleThemeToggle}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title={isLightTheme ? '切换到深色主题' : '切换到浅色主题'}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {isLightTheme ? '☀️' : '🌙'}
              </div>
            </button>

            {/* Web shortcut button */}
            <button
              onClick={() => setWebShortcutPopupOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title="快捷网页"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Globe size={18} />
              </div>
            </button>

            {/* Ollama manager button */}
            <button
              onClick={() => setOllamaModalOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title="Ollama 管理器"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Cpu size={18} />
              </div>
            </button>

            {/* Expand/collapse button */}
            <button
              onClick={() => setBottomPanelsVisible(!bottomPanelsVisible)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100/50"
              style={{ color: 'var(--text-secondary)' }}
              title={bottomPanelsVisible ? '收起面板' : '展开面板'}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {bottomPanelsVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>
          </div>
        )}
      </motion.div>
      </motion.aside>
    </>
  );
}
