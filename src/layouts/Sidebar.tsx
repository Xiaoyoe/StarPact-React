import { useState } from 'react';
import {
  MessageSquare, Bot, Settings, ScrollText, Plus, Search, Star,
  ChevronLeft, ChevronRight, Trash2, MoreHorizontal, FileText, Cpu, Settings2, Images, Play, ChevronUp, ChevronDown, Lock, Unlock, BookOpen, Globe, Database
} from 'lucide-react';
import { useStore, generateId } from '@/store';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const {
    activePage, setActivePage,
    sidebarCollapsed, toggleSidebar,
    conversations, activeConversationId, setActiveConversation,
    addConversation, deleteConversation,
    models, activeModelId,
    logs, setLogsPanelOpen,
    searchQuery, setSearchQuery,
    ollamaModalOpen, setOllamaModalOpen,
    theme, setTheme,
    webShortcutPopupOpen, setWebShortcutPopupOpen,
    dataManagerOpen, setDataManagerOpen,
    chatWallpaper, setChatWallpaper,
  } = useStore();

  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [bottomPanelsVisible, setBottomPanelsVisible] = useState(true);
  const [wallpaperPopupOpen, setWallpaperPopupOpen] = useState(false);

  const activeModel = models.find(m => m.id === activeModelId);
  const isLightTheme = theme === 'light';
  const isDarkTheme = theme === 'dark';

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
    { id: 'logs' as const, icon: ScrollText, label: '日志' },
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
                {/* Logs panel */}
                <div
                  onClick={() => setLogsPanelOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2.5"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  >
                    <FileText size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      系统日志
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {logs.length} 条记录
                    </div>
                  </div>
                  <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>

                {/* Chat Wallpaper Setting */}
                <div
                  onClick={() => setWallpaperPopupOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2.5 transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  >
                    <Images size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      聊天壁纸设置
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {chatWallpaper ? '已设置壁纸' : '未设置壁纸'}
                    </div>
                  </div>
                  <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>

                {/* Database indicator */}
                <div
                  onClick={() => setDataManagerOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-lg p-2.5 transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  >
                    <Database size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      数据库管理
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      查看本地存储数据
                    </div>
                  </div>
                  <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>

                {/* Test Model 2 */}
                <div
                  className="flex items-center gap-2 rounded-lg p-2.5"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  >
                    L
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      llama3-70b
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Meta
                    </div>
                  </div>
                  <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>

                {/* Test Model 3 */}
                <div
                  className="flex items-center gap-2 rounded-lg p-2.5"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  >
                    C
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      claude-3-opus
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Anthropic
                    </div>
                  </div>
                  <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>
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
