import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare, Bot, Settings, Plus, Search, Star,
  ChevronLeft, ChevronRight, Trash2, MoreHorizontal, FileText, Cpu, Settings2, Images, Play, ChevronUp, ChevronDown, BookOpen, Globe, Database, Sparkles, HardDrive, Check, X, Square, GripVertical, Clapperboard, Timer, Brain, MessageCircle, Image as ImageIcon, AlertTriangle, Maximize2, Monitor, Download, Sliders
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { configStorage } from '@/services/storage/ConfigStorage';
import { PerformanceModal } from '@/components/PerformanceModal';
import { ollamaModelService } from '@/services/OllamaModelService';
import { ConversationContextMenu } from '@/components/ConversationContextMenu';
import { WallpaperList } from '@/components/WallpaperList';
import { BackgroundStorage, type CustomBackground } from '@/services/storage/BackgroundStorage';
import { LocalImage } from '@/components/LocalImage';
import { DownloadGuideModal } from '@/components/DownloadGuideModal';

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
    ollamaNumCtx, setOllamaNumCtx,
    includeImagesInContext, setIncludeImagesInContext,
    deleteConfirmEnabled, setDeleteConfirmEnabled,
  } = useStore();

  const toast = useToast();

  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [hoveredConvRect, setHoveredConvRect] = useState<DOMRect | null>(null);
  const convItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [bottomPanelsVisible, setBottomPanelsVisible] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    conversation: { id: string; title: string; messageCount: number } | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    conversation: null,
  });
  const [wallpaperPopupOpen, setWallpaperPopupOpen] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [switchingModel, setSwitchingModel] = useState(false);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [previewWallpaper, setPreviewWallpaper] = useState('');
  const [previewWallpaperInfo, setPreviewWallpaperInfo] = useState<{ name: string; size?: number; path?: string } | null>(null);
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [downloadGuideOpen, setDownloadGuideOpen] = useState(false);
  
  const [panelOrder, setPanelOrder] = useState<string[]>(['model', 'performance', 'logs', 'wallpaper', 'database', 'download-guide']);
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
      const savedIncludeImagesInContext = configStorage.get('includeImagesInContext');
      const savedDeleteConfirmEnabled = configStorage.get('deleteConfirmEnabled');
      
      if (savedVerboseMode !== undefined) {
        setOllamaVerboseMode(savedVerboseMode);
      }
      if (savedThinkMode !== undefined) {
        setOllamaThinkMode(savedThinkMode);
      }
      if (savedChatMode !== undefined) {
        setOllamaChatMode(savedChatMode);
      }
      if (savedIncludeImagesInContext !== undefined) {
        setIncludeImagesInContext(savedIncludeImagesInContext);
      }
      if (savedDeleteConfirmEnabled !== undefined) {
        setDeleteConfirmEnabled(savedDeleteConfirmEnabled);
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
      title: '壁纸设置',
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
    {
      id: 'download-guide',
      icon: <Download size={14} />,
      title: '下载指南',
      subtitle: 'Ollama与FFmpeg安装',
      onClick: () => setDownloadGuideOpen(true),
    },
  ];

  const orderedPanelItems = panelOrder.map(id => panelItems.find(item => item.id === id)!).filter(Boolean);

  const handleThemeToggle = () => {
    let newTheme: string;
    if (isLightTheme) {
      newTheme = 'dark';
    } else {
      newTheme = 'light';
    }
    setTheme(newTheme);
    configStorage.set('theme', newTheme);
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 hover:scale-110 hover:bg-[var(--bg-tertiary)]"
                    style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Context Length Setting */}
              <div 
                className="px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <Sliders size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>上下文长度</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)' }}>
                      {ollamaNumCtx >= 1024 ? `${(ollamaNumCtx / 1024).toFixed(0)}K` : ollamaNumCtx}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1024"
                      max="131072"
                      step="1024"
                      value={ollamaNumCtx}
                      onChange={(e) => setOllamaNumCtx(parseInt(e.target.value))}
                      className="flex-1 h-1 rounded-lg appearance-none cursor-pointer"
                      style={{ backgroundColor: 'var(--border-color)' }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {[4096, 8192, 16384, 32768, 65536, 131072].map((ctx) => (
                      <button
                        key={ctx}
                        onClick={() => setOllamaNumCtx(ctx)}
                        className="px-2 py-0.5 text-xs rounded transition-all hover:scale-110 hover:shadow-md"
                        style={{
                          backgroundColor: ollamaNumCtx === ctx ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                          color: ollamaNumCtx === ctx ? 'white' : 'var(--text-secondary)',
                          fontWeight: ollamaNumCtx === ctx ? 600 : 400,
                        }}
                      >
                        {ctx >= 1024 ? `${ctx / 1024}K` : ctx}
                      </button>
                    ))}
                  </div>
                </div>
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

              {/* Delete Confirm Toggle */}
              <div 
                className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} style={{ color: 'var(--warning-color)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>删除确认</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    删除消息前确认
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newValue = !deleteConfirmEnabled;
                    setDeleteConfirmEnabled(newValue);
                    configStorage.set('deleteConfirmEnabled', newValue);
                    toast.info(newValue ? '已开启删除确认' : '已关闭删除确认', { duration: 2000 });
                  }}
                  className="relative flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ 
                    backgroundColor: deleteConfirmEnabled ? 'var(--success-color)' : 'var(--bg-tertiary)',
                  }}
                  title={deleteConfirmEnabled ? '关闭删除确认' : '开启删除确认'}
                >
                  <span
                    className="absolute h-5 w-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: '2px',
                      transform: deleteConfirmEnabled ? 'translateX(20px)' : 'translateX(0)',
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
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 hover:scale-[1.01] disabled:opacity-50"
                            style={{
                              backgroundColor: model.name === activeOllamaModel ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                              border: `1px solid ${model.name === activeOllamaModel ? 'var(--primary-color)' : 'transparent'}`,
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
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 hover:scale-[1.01]"
                            style={{
                              backgroundColor: model.id === activeModelId && !activeOllamaModel ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                              border: `1px solid ${model.id === activeModelId && !activeOllamaModel ? 'var(--primary-color)' : 'transparent'}`,
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
            className="fixed inset-0 z-50"
          >
            <div 
              className="absolute inset-0 bg-transparent"
              onClick={() => setWallpaperPopupOpen(false)}
            />
            <motion.div
              drag
              dragMomentum={false}
              initial={{ scale: 0.9, opacity: 0, x: 0, y: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden absolute"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-color)',
                left: '50%',
                top: '50%',
                marginLeft: '-320px',
                marginTop: '-240px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="flex items-center justify-between px-4 py-3 border-b cursor-grab select-none" 
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    选择聊天壁纸
                  </h3>
                </div>
                <button
                  onClick={() => setWallpaperPopupOpen(false)}
                  className="p-1 rounded-md transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-3 p-3" style={{ maxHeight: '70vh' }}>
                <div className="flex-1 flex flex-col min-w-0 gap-2">
                  <div 
                    className="flex-1 rounded-lg overflow-hidden flex flex-col"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center gap-2">
                        <Monitor size={12} style={{ color: 'var(--primary-color)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>预览</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {previewWallpaperInfo && (
                          <span 
                            className="text-[10px] px-2 py-0.5 rounded-md"
                            style={{ 
                              backgroundColor: 'var(--bg-tertiary)', 
                              color: 'var(--text-tertiary)' 
                            }}
                          >
                            {previewWallpaperInfo.name}
                            {previewWallpaperInfo.size && ` · ${(previewWallpaperInfo.size / 1024).toFixed(1)}KB`}
                          </span>
                        )}
                        {previewWallpaper && (
                          <button
                            onClick={() => setIsFullscreenPreview(true)}
                            className="p-1 rounded-md transition-all hover:scale-105"
                            style={{ 
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)'
                            }}
                            title="全屏预览"
                          >
                            <Maximize2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div 
                      className="flex-1 relative overflow-hidden min-h-[200px]"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {previewWallpaper ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LocalImage
                            path={previewWallpaper}
                            alt="当前壁纸"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                            style={{ backgroundColor: 'var(--bg-secondary)' }}
                          >
                            <Images size={24} style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>未设置壁纸</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-64 flex-shrink-0 max-h-[400px] overflow-y-auto">
                  <WallpaperList
                    selectedBackgroundId={selectedBackgroundId}
                    setSelectedBackgroundId={setSelectedBackgroundId}
                    previewWallpaper={previewWallpaper}
                    setPreviewWallpaper={setPreviewWallpaper}
                    previewWallpaperInfo={previewWallpaperInfo}
                    setPreviewWallpaperInfo={setPreviewWallpaperInfo}
                    customBackgrounds={customBackgrounds}
                    setCustomBackgrounds={setCustomBackgrounds}
                    showDoubleClickToggle={true}
                    showClearButton={false}
                    showHeader={true}
                    compact={true}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Wallpaper Preview */}
      <AnimatePresence>
        {isFullscreenPreview && previewWallpaper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setIsFullscreenPreview(false)}
          >
            <button
              onClick={() => setIsFullscreenPreview(false)}
              className="absolute top-4 right-4 p-2 rounded-lg transition-all hover:scale-105"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            >
              <X size={24} />
            </button>
            <div className="max-w-[95vw] max-h-[95vh] flex flex-col items-center">
              {previewWallpaperInfo && (
                <div className="mb-2 text-white text-sm">
                  {previewWallpaperInfo.name}
                  {previewWallpaperInfo.size && ` · ${(previewWallpaperInfo.size / 1024).toFixed(1)}KB`}
                </div>
              )}
              <img
                src={previewWallpaper}
                alt="全屏预览"
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      conversation: {
                        id: conv.id,
                        title: conv.title,
                        messageCount: conv.messages.length,
                      },
                    });
                  }}
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
                    <div 
                      ref={(el) => {
                        if (el) convItemRefs.current.set(conv.id, el);
                      }}
                      onMouseEnter={(e) => {
                        setHoveredConv(conv.id);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredConvRect(rect);
                      }}
                      onMouseLeave={() => {
                        setHoveredConv(null);
                        setHoveredConvRect(null);
                      }}
                    >
                      <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
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
                          {conv.totalTokens && conv.totalTokens > 0 && (
                            <>
                              <span>·</span>
                              <span style={{ color: 'var(--primary-color)' }}>
                                {conv.totalTokens >= 1000 ? `${(conv.totalTokens / 1000).toFixed(1)}K` : conv.totalTokens}
                                /{ollamaNumCtx >= 1024 ? `${(ollamaNumCtx / 1024).toFixed(0)}K` : ollamaNumCtx}
                              </span>
                            </>
                          )}
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
                  <motion.div
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
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  </motion.div>
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
          <div className="flex flex-col items-center justify-center py-2 gap-2">
            <motion.button
              onClick={() => setWebShortcutPopupOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="快捷网页"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Globe size={18} />
              </div>
            </motion.button>

            <motion.button
              onClick={() => setOllamaModalOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Ollama 管理器"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Cpu size={18} />
              </div>
            </motion.button>

            <motion.button
              onClick={handleThemeToggle}
              className="flex items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title={isLightTheme ? '切换到深色主题' : '切换到浅色主题'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {isLightTheme ? '☀️' : '🌙'}
              </div>
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center justify-around py-2">
            <motion.button
              onClick={handleThemeToggle}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title={isLightTheme ? '切换到深色主题' : '切换到浅色主题'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {isLightTheme ? '☀️' : '🌙'}
              </div>
            </motion.button>

            <motion.button
              onClick={() => setWebShortcutPopupOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="快捷网页"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Globe size={18} />
              </div>
            </motion.button>

            <motion.button
              onClick={() => setOllamaModalOpen(true)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="Ollama 管理器"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Cpu size={18} />
              </div>
            </motion.button>

            <motion.button
              onClick={() => setBottomPanelsVisible(!bottomPanelsVisible)}
              className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title={bottomPanelsVisible ? '收起面板' : '展开面板'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                {bottomPanelsVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </motion.button>
          </div>
        )}
      </motion.div>
      </motion.aside>

      <ConversationContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        title={contextMenu.conversation?.title || ''}
        messageCount={contextMenu.conversation?.messageCount || 0}
        onDelete={() => {
          if (contextMenu.conversation) {
            deleteConversation(contextMenu.conversation.id);
          }
        }}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
      />

      <DownloadGuideModal 
        isOpen={downloadGuideOpen} 
        onClose={() => setDownloadGuideOpen(false)} 
      />

      {hoveredConv && hoveredConvRect && sidebarCollapsed && createPortal(
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            left: hoveredConvRect.right + 12,
            top: hoveredConvRect.top + hoveredConvRect.height / 2,
            transform: 'translateY(-50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            className="px-3 py-2 rounded-lg whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              maxWidth: '200px',
            }}
          >
            <div className="flex items-center gap-1.5">
              {conversations.find(c => c.id === hoveredConv)?.isFavorite && (
                <Star size={12} style={{ color: 'var(--warning-color)' }} fill="var(--warning-color)" />
              )}
              <span
                className="text-sm font-medium truncate"
                style={{
                  color: activeConversationId === hoveredConv ? 'var(--primary-color)' : 'var(--text-primary)',
                  maxWidth: '160px',
                }}
              >
                {conversations.find(c => c.id === hoveredConv)?.title}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              <span>{models.find(m => m.id === conversations.find(c => c.id === hoveredConv)?.modelId)?.name || '未知模型'}</span>
              <span>·</span>
              <span>{formatTime(conversations.find(c => c.id === hoveredConv)?.updatedAt || 0)}</span>
            </div>
            {conversations.find(c => c.id === hoveredConv)?.messages?.length ? (
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {conversations.find(c => c.id === hoveredConv)?.messages.length} 条消息
              </div>
            ) : null}
          </div>
        </motion.div>,
        document.body
      )}
    </>
  );
}
