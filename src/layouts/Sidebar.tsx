import { useState, useRef } from 'react';
import {
  MessageSquare, Bot, Settings, Plus, Search, Star,
  ChevronLeft, ChevronRight, Trash2, MoreHorizontal, FileText, Cpu, Settings2, Images, Play, ChevronUp, ChevronDown, BookOpen, Globe, Database, Sparkles, HardDrive, Check, X, Square, GripVertical
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/Toast';

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
  } = useStore();

  const toast = useToast();

  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [bottomPanelsVisible, setBottomPanelsVisible] = useState(true);
  const [wallpaperPopupOpen, setWallpaperPopupOpen] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [switchingModel, setSwitchingModel] = useState(false);
  
  const [panelOrder, setPanelOrder] = useState<string[]>(['model', 'logs', 'wallpaper', 'database']);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const activeModel = models.find(m => m.id === activeModelId);
  const isLightTheme = theme === 'light';
  const isDarkTheme = theme === 'dark';

  const handleSwitchOllamaModel = async (newModelName: string) => {
    if (switchingModel) {
      toast.info('正在切换模型中，请稍候', { duration: 2000 });
      return;
    }

    if (newModelName === activeOllamaModel) {
      setShowModelSelect(false);
      return;
    }

    setSwitchingModel(true);
    setShowModelSelect(false);

    try {
      if (activeOllamaModel) {
        toast.info(`正在关闭 ${activeOllamaModel}...`, { duration: 2000 });
        await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeOllamaModel,
            keep_alive: 0
          })
        });
      }

      setActiveOllamaModel(newModelName);
      setActiveModel(null);
      toast.info(`正在启动 ${newModelName}...`, { duration: 2000 });

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: newModelName,
          prompt: '',
          keep_alive: '10m'
        })
      });

      if (response.ok) {
        setTimeout(() => {
          toast.success(`已切换到 ${newModelName}`, { duration: 2000 });
        }, 2000);
      } else {
        toast.error(`启动 ${newModelName} 失败`, { duration: 3000 });
      }
    } catch (error) {
      toast.error('模型切换失败', { duration: 3000 });
    } finally {
      setTimeout(() => {
        setSwitchingModel(false);
      }, 3000);
    }
  };

  const handleStopCurrentModel = async () => {
    if (!activeOllamaModel && !activeModelId) {
      toast.info('当前没有运行中的模型', { duration: 2000 });
      return;
    }

    try {
      if (activeOllamaModel) {
        toast.info(`正在停止 ${activeOllamaModel}...`, { duration: 2000 });
        await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: activeOllamaModel,
            keep_alive: 0
          })
        });
        setActiveOllamaModel(null);
        toast.success(`已停止 ${activeOllamaModel}`, { duration: 2000 });
      } else if (activeModelId) {
        const currentModelName = activeModel?.name || '模型';
        setActiveModel(null);
        toast.success(`已取消选择 ${currentModelName}`, { duration: 2000 });
      }
      setShowModelSelect(false);
    } catch (error) {
      toast.error('停止模型失败', { duration: 3000 });
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
              AI WebUI
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
