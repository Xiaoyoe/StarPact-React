import { useState, useEffect, useMemo, memo } from 'react';
import {
  Palette, Type, Monitor, Info, RefreshCw, Download, MessageSquareQuote, LogOut, Bell, ScrollText, Trash2, AlertCircle, AlertTriangle, Bug, Search, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, X, Sparkles, Database, Shield, HardDrive
} from 'lucide-react';
import { useStore } from '@/store';
import type { LogEntry } from '@/store';
import { motion } from 'framer-motion';
import { BackgroundStorage, type CustomBackground } from '@/services/storage/BackgroundStorage';
import { LocalImage } from '@/components/LocalImage';
import { IndexedDBStorageStatus } from '@/components/IndexedDBStorageStatus';


const logLevelConfig = {
  info: { 
    color: '#3B82F6', 
    bg: 'rgba(59, 130, 246, 0.1)', 
    label: 'INFO',
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  warn: { 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.1)', 
    label: 'WARN',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  error: { 
    color: '#EF4444', 
    bg: 'rgba(239, 68, 68, 0.1)', 
    label: 'ERROR',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  debug: { 
    color: '#8B5CF6', 
    bg: 'rgba(139, 92, 246, 0.1)', 
    label: 'DEBUG',
    borderColor: 'rgba(139, 92, 246, 0.3)'
  },
};

const logLevelIcons = {
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
  debug: Bug,
};

interface SettingsLogItemProps {
  log: LogEntry;
}

const SettingsLogItem = memo(function SettingsLogItem({ log }: SettingsLogItemProps) {
  const config = logLevelConfig[log.level];
  const Icon = logLevelIcons[log.level];
  const time = new Date(log.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
  const dateStr = `${time.getMonth() + 1}/${time.getDate()}`;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl transition-colors duration-150 hover:brightness-[0.98]"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        borderLeft: `3px solid ${config.borderColor}`
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: config.bg }}
      >
        <Icon size={16} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-mono font-semibold tracking-wide"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            {config.label}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ 
            color: 'var(--text-secondary)', 
            backgroundColor: 'var(--bg-tertiary)' 
          }}>
            {log.module}
          </span>
          <span className="text-xs font-mono ml-auto flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <span>{dateStr}</span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)' }}></span>
            <span>{timeStr}</span>
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {log.message}
        </p>
      </div>
    </div>
  );
});

import { configStorage } from '@/services/storage/ConfigStorage';
import type { SplashScreenType } from '@/services/storage/ConfigStorage';
import { useToast } from '@/components/Toast';
import { AboutSection } from './about';
import { WallpaperList } from '@/components/WallpaperList';
import { useWallpaperStyle } from '@/hooks';

const QUOTE_INTERVAL_OPTIONS = [
  { value: 10, label: '10 秒' },
  { value: 3600, label: '1 小时' },
  { value: 86400, label: '24 小时' },
] as const;

export function SettingsPage() {
  const {
    theme, setTheme,
    chatWallpaper, setChatWallpaper,
    sendOnEnter, setSendOnEnter,
    storagePath, setStoragePath,
    logs, clearLogs,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'wallpaper' | 'general' | 'data-management' | 'about'>('appearance');
  const [dailyQuoteEnabled, setDailyQuoteEnabled] = useState(false);
  const [dailyQuoteInterval, setDailyQuoteInterval] = useState<10 | 3600 | 86400>(10);
  const [chatNotificationEnabled, setChatNotificationEnabled] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(true);
  const [galleryDefaultLayout, setGalleryDefaultLayout] = useState<'grid' | 'waterfall' | 'list'>('grid');
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');
  const [defaultPage, setDefaultPage] = useState<'chat' | 'models' | 'settings' | 'compare' | 'ini-config' | 'gallery' | 'video-player' | 'prompt-templates' | 'media-tools'>('chat');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [logFilterLevel, setLogFilterLevel] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [currentWindowSize, setCurrentWindowSize] = useState<{ width: number; height: number } | null>(null);
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [previewWallpaper, setPreviewWallpaper] = useState<string>('');
  const [previewWallpaperInfo, setPreviewWallpaperInfo] = useState<{ name: string; size?: number; path?: string } | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [splashScreenEnabled, setSplashScreenEnabled] = useState(true);
  const [splashScreenType, setSplashScreenType] = useState<SplashScreenType>('full');
  const LOG_PAGE_SIZE = 30;
  const toast = useToast();
  const wallpaperStyle = useWallpaperStyle(chatWallpaper);
  


  // 从配置加载提示词模板存储路径


  // 从配置加载壁纸设置
  useEffect(() => {
    const savedWallpaper = configStorage.get('chatWallpaper');
    if (savedWallpaper) {
      setChatWallpaper(savedWallpaper);
    }
  }, []);

  // 保存壁纸设置到配置
  useEffect(() => {
    configStorage.set('chatWallpaper', chatWallpaper);
  }, [chatWallpaper]);



  // 从配置存储加载设置
  useEffect(() => {
    const loadSettings = async () => {
      await configStorage.ready();
      const savedSendOnEnter = configStorage.get('sendOnEnter');
      const savedStoragePath = configStorage.get('storagePath');
      const savedDailyQuote = configStorage.get('dailyQuote');
      const savedChatNotification = configStorage.get('chatNotification');
      const savedCloseConfirm = configStorage.get('closeConfirm');
      const savedGalleryDefaultLayout = configStorage.get('galleryDefaultLayout');
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      const savedDefaultPage = configStorage.get('defaultPage');
      const savedSplashScreenEnabled = configStorage.get('splashScreenEnabled');
      const savedSplashScreenType = configStorage.get('splashScreenType');

      if (savedSendOnEnter !== undefined) setSendOnEnter(savedSendOnEnter);
      if (savedStoragePath) setStoragePath(savedStoragePath);
      if (savedDailyQuote) {
        setDailyQuoteEnabled(savedDailyQuote.enabled ?? true);
        setDailyQuoteInterval(savedDailyQuote.interval ?? 10);
      }
      if (savedChatNotification) {
        setChatNotificationEnabled(savedChatNotification.enabled ?? false);
      }
      if (savedCloseConfirm !== undefined) setCloseConfirm(savedCloseConfirm);
      if (savedGalleryDefaultLayout) setGalleryDefaultLayout(savedGalleryDefaultLayout);
      if (savedAppNameDisplay) setAppNameDisplay(savedAppNameDisplay);
      if (savedDefaultPage) setDefaultPage(savedDefaultPage);
      if (savedSplashScreenEnabled !== undefined) setSplashScreenEnabled(savedSplashScreenEnabled);
      if (savedSplashScreenType) setSplashScreenType(savedSplashScreenType);
      setConfigLoaded(true);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (customBackgrounds.length > 0) return;
    const loadCustomBackgrounds = async () => {
      try {
        const backgrounds = await BackgroundStorage.getInstance().getAllBackgrounds();
        if (backgrounds.length > 0) {
          setCustomBackgrounds(backgrounds);
        }
      } catch (error) {
        console.error('Failed to load custom backgrounds:', error);
      }
    };
    loadCustomBackgrounds();
  }, [customBackgrounds.length]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('theme', theme);
    }
  }, [theme, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('sendOnEnter', sendOnEnter);
    }
  }, [sendOnEnter, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('storagePath', storagePath);
    }
  }, [storagePath, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('dailyQuote', {
        enabled: dailyQuoteEnabled,
        interval: dailyQuoteInterval
      });
    }
  }, [dailyQuoteEnabled, dailyQuoteInterval, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('chatNotification', {
        enabled: chatNotificationEnabled
      });
    }
  }, [chatNotificationEnabled, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('closeConfirm', closeConfirm);
    }
  }, [closeConfirm, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('galleryDefaultLayout', galleryDefaultLayout);
    }
  }, [galleryDefaultLayout, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('appNameDisplay', appNameDisplay);
    }
  }, [appNameDisplay, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('defaultPage', defaultPage);
    }
  }, [defaultPage, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('splashScreenEnabled', splashScreenEnabled);
    }
  }, [splashScreenEnabled, configLoaded]);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('splashScreenType', splashScreenType);
    }
  }, [splashScreenType, configLoaded]);



  useEffect(() => {
    const loadWindowSize = async () => {
      if (typeof window !== 'undefined' && window.electronAPI?.window?.getSize) {
        const size = await window.electronAPI.window.getSize();
        if (size) {
          setCurrentWindowSize(size);
        }
      }
    };
    loadWindowSize();
  }, []);

  const themeCategories = {
    light: {
      name: 'Light 主题',
      desc: '明亮清爽风格',
      themes: [
        { id: 'light', name: '浅色主题', desc: '经典明亮风格', colors: ['#FFFFFF', '#165DFF', '#F2F3F5'] },
        { id: 'tech-blue', name: '科技蓝', desc: '专业科技风格', colors: ['#FFFFFF', '#0A49C1', '#F8FBFF'] },
        { id: 'eye-care', name: '护眼绿', desc: '自然舒适风格', colors: ['#FCFFFE', '#2A9D8F', '#F2FAF8'] },
      ]
    },
    night: {
      name: 'Night 主题',
      desc: '深色护眼风格',
      themes: [
        { id: 'dark', name: '深色主题', desc: '护眼暗色风格', colors: ['#17171A', '#3C7EFF', '#232324'] },
        { id: 'midnight-blue', name: '午夜蓝', desc: '深邃科技风格', colors: ['#121212', '#589EFF', '#1E1E20'] },
        { id: 'forest-green', name: '森林绿', desc: '自然清新风格', colors: ['#0F172A', '#22C55E', '#064E3B'] },
        { id: 'coral-orange', name: '珊瑚橙', desc: '温暖活力风格', colors: ['#0F172A', '#F97316', '#7C2D12'] },
        { id: 'lavender-purple', name: '薰衣草紫', desc: '优雅浪漫风格', colors: ['#0F172A', '#8B5CF6', '#312E81'] },
        { id: 'mint-cyan', name: '薄荷青', desc: '凉爽清新风格', colors: ['#0F172A', '#06B6D4', '#0E7490'] },
        { id: 'caramel-brown', name: '焦糖棕', desc: '温暖复古风格', colors: ['#0F172A', '#D97706', '#78350F'] },
        { id: 'sakura-pink', name: '樱花粉', desc: '柔和甜美风格', colors: ['#0F172A', '#EC4899', '#7E1D40'] },
        { id: 'deep-sea-blue', name: '深海蓝', desc: '深邃专业风格', colors: ['#0F172A', '#1E40AF', '#1E3A8A'] },
        { id: 'amber-gold', name: '琥珀金', desc: '奢华温暖风格', colors: ['#0F172A', '#F59E0B', '#78350F'] },
      ]
    }
  };

  const tabs = [
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'wallpaper' as const, label: '壁纸', icon: Palette },
    { id: 'general' as const, label: '通用', icon: Monitor },
    { id: 'data-management' as const, label: '数据', icon: Database },
    { id: 'about' as const, label: '关于', icon: Info },
  ];

  const filteredLogs = useMemo(() => {
    let result = logs;
    
    if (logFilterLevel !== 'all') {
      result = result.filter(l => l.level === logFilterLevel);
    }
    
    if (logSearchQuery.trim()) {
      const query = logSearchQuery.toLowerCase();
      result = result.filter(l => 
        l.message.toLowerCase().includes(query) || 
        l.module.toLowerCase().includes(query)
      );
    }
    
    return [...result].sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, logFilterLevel, logSearchQuery]);

  const logTotalPages = Math.ceil(filteredLogs.length / LOG_PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (logCurrentPage - 1) * LOG_PAGE_SIZE;
    return filteredLogs.slice(start, start + LOG_PAGE_SIZE);
  }, [filteredLogs, logCurrentPage]);

  const logCounts = useMemo(() => ({
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  }), [logs]);

  const handleExportLogs = () => {
    const data = filteredLogs.map(log => ({
      time: new Date(log.timestamp).toISOString(),
      level: log.level,
      module: log.module,
      message: log.message
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('日志导出成功');
  };

  const handleLogFilterChange = (level: string) => {
    setLogFilterLevel(level);
    setLogCurrentPage(1);
  };

  const handleLogSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogSearchQuery(e.target.value);
    setLogCurrentPage(1);
  };



  return (
    <div 
      className="flex flex-col h-full" 
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : 'none',
        ...wallpaperStyle
      }}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'data-management' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Storage Status Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <HardDrive size={16} style={{ color: 'var(--primary-color)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  存储状态
                </h3>
              </div>
              <IndexedDBStorageStatus onRefresh={() => toast.success('存储状态已刷新')} />
              
              <div
                className="rounded-xl p-4 mt-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h4 className="mb-2 text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Shield size={12} style={{ color: 'var(--success-color)' }} /> 安全提示
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  IndexedDB 数据仅存储在本地浏览器中，不会上传至任何远程服务器。
                  清空浏览器数据可能会导致数据丢失，建议定期导出备份。
                </p>
              </div>
            </section>

            {/* Logs Section */}
            <section>
              <div 
                className="flex items-center justify-between mb-4 pb-3 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <ScrollText size={16} style={{ color: 'var(--primary-color)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    系统日志
                  </h3>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                  >
                    {logs.length} 条记录
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearLogs}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                    style={{ 
                      color: 'var(--error-color)', 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <Trash2 size={12} /> 清空
                  </button>
                  <button
                    onClick={handleExportLogs}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                    style={{ 
                      color: 'var(--text-secondary)', 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <Download size={12} /> 导出
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="搜索日志..."
                    value={logSearchQuery}
                    onChange={handleLogSearchChange}
                    className="bg-transparent text-sm outline-none flex-1"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { id: 'all', label: '全部', color: 'var(--primary-color)' },
                    { id: 'info', label: '信息', color: '#3B82F6' },
                    { id: 'warn', label: '警告', color: '#F59E0B' },
                    { id: 'error', label: '错误', color: '#EF4444' },
                    { id: 'debug', label: '调试', color: '#8B5CF6' },
                  ].map(level => (
                    <button
                      key={level.id}
                      onClick={() => handleLogFilterChange(level.id)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: logFilterLevel === level.id ? level.color : 'var(--bg-secondary)',
                        color: logFilterLevel === level.id ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${logFilterLevel === level.id ? level.color : 'var(--border-color)'}`,
                      }}
                    >
                      {level.label} ({logCounts[level.id as keyof typeof logCounts]})
                    </button>
                  ))}
                </div>
              </div>

              {/* Log List */}
              <div 
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <div 
                  className="max-h-[400px] overflow-y-auto p-2 space-y-1.5"
                >
                  {paginatedLogs.length === 0 ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="text-center">
                        <Info size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {logSearchQuery ? '未找到匹配的日志' : '暂无日志记录'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    paginatedLogs.map((log) => (
                      <SettingsLogItem key={log.id} log={log} />
                    ))
                  )}
                </div>

                {logTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => setLogCurrentPage(p => Math.max(1, p - 1))}
                      disabled={logCurrentPage === 1}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs px-2" style={{ color: 'var(--text-secondary)' }}>
                      {logCurrentPage} / {logTotalPages}
                    </span>
                    <button
                      onClick={() => setLogCurrentPage(p => Math.min(logTotalPages, p + 1))}
                      disabled={logCurrentPage === logTotalPages}
                      className="p-1 rounded disabled:opacity-30"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <>
            {activeTab === 'wallpaper' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
                style={{ margin: '-2rem', padding: '2rem' }}
              >
                <section className="flex-1 flex gap-4 overflow-hidden">
                  <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                          聊天壁纸
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          选择或上传壁纸，为界面添加个性化背景
                        </p>
                      </div>
                    </div>

                    <div 
                      className="flex-1 rounded-xl overflow-hidden flex flex-col"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-2">
                          <Monitor size={14} style={{ color: 'var(--primary-color)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>当前壁纸预览</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {previewWallpaperInfo && (
                            <span 
                              className="text-[10px] px-2 py-0.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ 
                                backgroundColor: 'var(--bg-tertiary)', 
                                color: 'var(--text-tertiary)' 
                              }}
                              onClick={async () => {
                                if (previewWallpaperInfo.path && window.electronAPI?.file?.showInFolder) {
                                  try {
                                    await window.electronAPI.file.showInFolder(previewWallpaperInfo.path);
                                  } catch (err) {
                                    console.error('Failed to show file in folder:', err);
                                    toast.error('无法打开文件位置');
                                  }
                                } else {
                                  toast.info('当前环境不支持此功能');
                                }
                              }}
                              title={previewWallpaperInfo.path && !previewWallpaperInfo.path.startsWith('data:') ? '点击打开文件位置' : undefined}
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
                              <Maximize2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div 
                        className="flex-1 relative overflow-hidden"
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
                              className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                              style={{ backgroundColor: 'var(--bg-secondary)' }}
                            >
                              <Palette size={32} style={{ color: 'var(--text-tertiary)' }} />
                            </div>
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>未设置壁纸，使用默认背景</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

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
                    showClearButton={true}
                  />
                </section>
              </motion.div>
            )}

            {isFullscreenPreview && previewWallpaper && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
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

            {activeTab !== 'wallpaper' && (
              <div className="mx-auto max-w-2xl">
                {activeTab === 'appearance' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Palette size={16} className="mr-2 inline" />
                  主题
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  选择界面主题风格，支持十三种预设主题
                </p>
                {Object.values(themeCategories).map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1 w-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{category.name}</h3>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{category.desc}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {category.themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className="rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                          style={{
                            border: `2px solid ${theme === t.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          <div className="mb-3 flex gap-1.5">
                            {t.colors.map((c, i) => (
                              <div
                                key={i}
                                className="h-6 w-6 rounded-md border border-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {t.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {t.desc}
                          </div>
                          {theme === t.id && (
                            <div className="mt-2 text-xs font-medium" style={{ color: 'var(--primary-color)' }}>
                              ✓ 当前使用
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              {/* Window Size Selection */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Maximize2 size={16} className="mr-2 inline" />
                  窗口大小
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  快速调整应用程序窗口大小
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { width: 1000, height: 625, name: '紧凑', desc: '1000 × 625' },
                    { width: 1200, height: 750, name: '标准', desc: '1200 × 750' },
                    { width: 1400, height: 900, name: '大窗口', desc: '1400 × 900' },
                  ].map((size) => {
                    const isActive = currentWindowSize?.width === size.width && currentWindowSize?.height === size.height;
                    return (
                      <button
                        key={size.name}
                        onClick={async () => {
                          if (window.electronAPI?.window?.resize) {
                            const result = await window.electronAPI.window.resize(size.width, size.height);
                            if (result.success) {
                              setCurrentWindowSize({ width: size.width, height: size.height });
                              toast.success(`窗口已调整为 ${size.name} (${size.width} × ${size.height})`);
                            }
                          }
                        }}
                        className="rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                        style={{
                          border: `2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          backgroundColor: 'var(--bg-secondary)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="flex items-center justify-center rounded-lg"
                            style={{ 
                              width: size.width / 40, 
                              height: size.height / 40,
                              backgroundColor: isActive ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                              minWidth: '24px',
                              minHeight: '18px',
                              maxWidth: '40px',
                              maxHeight: '25px',
                            }}
                          >
                            <Maximize2 size={12} color={isActive ? 'white' : 'var(--text-tertiary)'} />
                          </div>
                        </div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {size.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {size.desc}
                        </div>
                        {isActive && (
                          <div className="mt-2 text-xs font-medium" style={{ color: 'var(--primary-color)' }}>
                            ✓ 当前使用
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                通用设置
              </h2>

              {/* App Name Display Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>项目名称显示</div>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  设置项目名称在界面上的显示方式
                </p>
                <div className="flex gap-2">
                  {[
                    { value: 'chinese', label: '中文名称', desc: '星约' },
                    { value: 'english', label: '英文名称', desc: 'Starpact' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAppNameDisplay(option.value as 'chinese' | 'english')}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: appNameDisplay === option.value ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: appNameDisplay === option.value ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${appNameDisplay === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`
                      }}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Page Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>默认功能页</div>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  设置每次启动程序时默认显示的功能页面
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'chat', label: '聊天', desc: 'AI对话' },
                    { value: 'models', label: '模型', desc: '模型管理' },
                    { value: 'gallery', label: '图片', desc: '图片管理' },
                    { value: 'video-player', label: '视频', desc: '视频播放' },
                    { value: 'prompt-templates', label: '提示词', desc: '模板管理' },
                    { value: 'compare', label: '对比', desc: '文本对比' },
                    { value: 'media-tools', label: '媒体工具', desc: '音视频处理' },
                    { value: 'ini-config', label: '配置', desc: 'INI配置' },
                    { value: 'settings', label: '设置', desc: '系统设置' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDefaultPage(option.value as typeof defaultPage)}
                      className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: defaultPage === option.value ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: defaultPage === option.value ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${defaultPage === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`
                      }}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Quote Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>每日一言</div>
                  </div>
                  <button
                    onClick={() => setDailyQuoteEnabled(!dailyQuoteEnabled)}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: dailyQuoteEnabled ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      animate={{ x: dailyQuoteEnabled ? 22 : 2 }}
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  在标题栏显示励志名言，定时切换
                </p>
                {dailyQuoteEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>切换间隔：</span>
                    <div className="flex gap-1">
                      {QUOTE_INTERVAL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setDailyQuoteInterval(option.value)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={{
                            backgroundColor: dailyQuoteInterval === option.value ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                            color: dailyQuoteInterval === option.value ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${dailyQuoteInterval === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Notification Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>聊天桌面通知</div>
                  </div>
                  <button
                    onClick={() => setChatNotificationEnabled(!chatNotificationEnabled)}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: chatNotificationEnabled ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      animate={{ x: chatNotificationEnabled ? 22 : 2 }}
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  当 AI 回复完成时发送桌面通知提醒
                </p>
              </div>

              {/* Close Confirm Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>关闭确认</div>
                  </div>
                  <button
                    onClick={() => setCloseConfirm(!closeConfirm)}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: closeConfirm ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      animate={{ x: closeConfirm ? 22 : 2 }}
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  关闭应用程序时显示确认弹窗，防止误操作
                </p>
              </div>

              {/* Gallery Default Layout Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>图片管理默认布局</div>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  设置图片管理功能页面的默认显示布局
                </p>
                <div className="flex gap-2">
                  {[
                    { value: 'grid', label: '网格布局', desc: '整齐排列' },
                    { value: 'waterfall', label: '瀑布流', desc: '自适应高度' },
                    { value: 'list', label: '列表布局', desc: '详细信息' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setGalleryDefaultLayout(option.value as 'grid' | 'waterfall' | 'list')}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor: galleryDefaultLayout === option.value ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: galleryDefaultLayout === option.value ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${galleryDefaultLayout === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`
                      }}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Send on Enter */}
              <div
                className="flex items-center justify-between rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter 发送</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>按 Enter 键直接发送消息</div>
                </div>
                <button
                  onClick={() => setSendOnEnter(!sendOnEnter)}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ backgroundColor: sendOnEnter ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                >
                  <motion.div
                    animate={{ x: sendOnEnter ? 22 : 2 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Splash Screen Settings */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>启动动画</div>
                  </div>
                  <button
                    onClick={() => setSplashScreenEnabled(!splashScreenEnabled)}
                    className="relative h-6 w-11 rounded-full transition-colors"
                    style={{ backgroundColor: splashScreenEnabled ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                  >
                    <motion.div
                      animate={{ x: splashScreenEnabled ? 22 : 2 }}
                      className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  程序启动时显示动画效果，                </p>
                {splashScreenEnabled && (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>选择动画样式：</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'full', label: '完整动画', desc: '精美启动画面' },
                        { value: 'minimal', label: '简约动画', desc: '加载指示器' },
                        { value: 'fade', label: '淡入淡出', desc: '简单过渡' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSplashScreenType(option.value as SplashScreenType)}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                          style={{
                            backgroundColor: splashScreenType === option.value ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                            color: splashScreenType === option.value ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${splashScreenType === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`
                          }}
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{option.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      选择"无"可完全关闭启动动画
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <AboutSection />
          )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <nav className="flex justify-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2.5 rounded-lg px-6 py-2 text-sm transition-colors whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}