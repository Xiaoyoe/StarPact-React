import { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
  Palette, Type, Monitor, Info, RefreshCw, Download, Upload, Shield, MessageSquareQuote, LogOut, Bell, ScrollText, Trash2, AlertCircle, AlertTriangle, Bug, Search, ChevronLeft, ChevronRight, LayoutGrid, Maximize2, Terminal, FolderOpen, CheckCircle
} from 'lucide-react';
import { useStore } from '@/store';
import type { ThemeType, LogEntry } from '@/store';
import { motion } from 'framer-motion';


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
import { configStorage, type AppConfig } from '@/services/storage/ConfigStorage';
import { ffmpegConfigStorage, type FFmpegConfig } from '@/services/storage/FFmpegConfigStorage';
import { PromptTemplateStorage } from '@/services/storage/PromptTemplateStorage';
import { VideoPlaylistStorage } from '@/services/storage/VideoPlaylistStorage';
import { VideoPlaylistStorageSync } from '@/services/storage/VideoPlaylistStorage';
import { useToast } from '@/components/Toast';
import { AboutSection } from './about';
import { PathPage } from './path';

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

  const [activeTab, setActiveTab] = useState<'appearance' | 'wallpaper' | 'general' | 'path' | 'logs' | 'about'>('appearance');
  const [dailyQuoteEnabled, setDailyQuoteEnabled] = useState(false);
  const [dailyQuoteInterval, setDailyQuoteInterval] = useState<10 | 3600 | 86400>(10);
  const [chatNotificationEnabled, setChatNotificationEnabled] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(true);
  const [galleryDefaultLayout, setGalleryDefaultLayout] = useState<'grid' | 'waterfall' | 'list'>('grid');
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');
  const [defaultPage, setDefaultPage] = useState<'chat' | 'models' | 'settings' | 'compare' | 'ini-config' | 'gallery' | 'video-player' | 'prompt-templates' | 'media-tools'>('chat');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [ffmpegConfig, setFFmpegConfig] = useState<FFmpegConfig>({
    binPath: '',
    ffmpegPath: '',
    ffprobePath: '',
    ffplayPath: '',
    lastChecked: 0,
    isValid: false,
  });
  const [isEditingBinPath, setIsEditingBinPath] = useState(false);
  const [tempBinPath, setTempBinPath] = useState('');
  const [logFilterLevel, setLogFilterLevel] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [currentWindowSize, setCurrentWindowSize] = useState<{ width: number; height: number } | null>(null);
  const LOG_PAGE_SIZE = 30;
  const toast = useToast();
  


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
      const savedTheme = configStorage.get('theme');
      const savedSendOnEnter = configStorage.get('sendOnEnter');
      const savedStoragePath = configStorage.get('storagePath');
      const savedDailyQuote = configStorage.get('dailyQuote');
      const savedChatNotification = configStorage.get('chatNotification');
      const savedCloseConfirm = configStorage.get('closeConfirm');
      const savedGalleryDefaultLayout = configStorage.get('galleryDefaultLayout');
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      const savedDefaultPage = configStorage.get('defaultPage');

      if (savedTheme) setTheme(savedTheme);
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
      setConfigLoaded(true);
    };
    loadSettings();
  }, []);

  // 保存设置到配置存储
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
    { id: 'path' as const, label: '路径', icon: RefreshCw },
    { id: 'logs' as const, label: '日志', icon: ScrollText },
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
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'logs' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col"
            style={{ margin: '-2rem', padding: '2rem' }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between mb-4 pb-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'var(--primary-light)' }}
                >
                  <ScrollText size={20} style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    系统日志
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    共 {logs.length} 条记录，当前显示 {filteredLogs.length} 条
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearLogs}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all hover:scale-105"
                  style={{ 
                    color: 'var(--error-color)', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <Trash2 size={14} /> 清空
                </button>
                <button
                  onClick={handleExportLogs}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all hover:scale-105"
                  style={{ 
                    color: 'var(--text-secondary)', 
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Download size={14} /> 导出
                </button>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3 mb-4">
              {/* Search */}
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

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
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
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
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
              className="flex-1 overflow-y-auto rounded-xl p-2 space-y-2"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {paginatedLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div 
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <Info size={32} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {logSearchQuery ? '未找到匹配的日志' : '暂无日志记录'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {logSearchQuery ? '尝试修改搜索关键词' : '系统操作将自动记录日志'}
                    </p>
                  </div>
                </div>
              ) : (
                paginatedLogs.map((log) => (
                  <SettingsLogItem key={log.id} log={log} />
                ))
              )}
            </div>

            {/* Pagination */}
            {logTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => setLogCurrentPage(p => Math.max(1, p - 1))}
                  disabled={logCurrentPage === 1}
                  className="p-1 rounded disabled:opacity-30"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs px-3" style={{ color: 'var(--text-secondary)' }}>
                  第 {logCurrentPage} / {logTotalPages} 页
                </span>
                <button
                  onClick={() => setLogCurrentPage(p => Math.min(logTotalPages, p + 1))}
                  disabled={logCurrentPage === logTotalPages}
                  className="p-1 rounded disabled:opacity-30"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="mx-auto max-w-2xl">
            {activeTab === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Theme Selection */}
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

          {activeTab === 'wallpaper' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Wallpaper Selection */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Palette size={16} className="mr-2 inline" />
                  聊天壁纸
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  选择聊天界面的背景壁纸，支持预设壁纸和自定义上传
                </p>

                {/* Preset Wallpapers */}
                <div className="mb-8">
                  <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>预设壁纸</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { id: 'ling', name: '玲', path: '/src/images/background/ling.jpg' },
                      { id: 'xue', name: '雪', path: '/src/images/background/xue.png' },
                      { id: 'pool', name: '泳池', path: '/src/images/background/五女泳池.jpg' },
                      { id: 'girl', name: '宅家少女', path: '/src/images/background/宅家少女.png' }
                    ].map((wallpaper) => (
                      <button
                        key={wallpaper.id}
                        onClick={() => setChatWallpaper(wallpaper.path)}
                        className="rounded-xl overflow-hidden transition-all active:scale-[0.98]"
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
                                ✓ 当前使用
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
                </div>

                {/* Custom Wallpaper Upload */}
                <div>
                  <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>自定义壁纸</h3>
                  <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: 'var(--border-color)' }}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="wallpaper-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const imageUrl = event.target?.result as string;
                            setChatWallpaper(imageUrl);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label htmlFor="wallpaper-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <Upload size={24} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          点击上传自定义壁纸
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          支持 JPG、PNG 格式
                        </p>
                      </div>
                    </label>
                  </div>
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

              {/* FFmpeg Configuration */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>FFmpeg bin 目录配置</div>
                </div>
                <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  选择 FFmpeg bin 目录，系统会自动识别三个 exe 文件
                </p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ffmpegConfig.binPath}
                      readOnly
                      placeholder="请选择 FFmpeg bin 目录"
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (typeof window !== 'undefined' && window.electronAPI?.file?.selectFolder) {
                          const result = await window.electronAPI.file.selectFolder({
                            title: '选择 FFmpeg bin 目录',
                          });
                          if (result && result.success && result.path) {
                            const newConfig = await ffmpegConfigStorage.setBinPath(result.path);
                            setFFmpegConfig(newConfig);
                            toast.success('已选择 FFmpeg bin 目录');
                          }
                        } else {
                          setIsEditingBinPath(true);
                          setTempBinPath(ffmpegConfig.binPath || '');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      选择
                    </button>
                  </div>
                  {ffmpegConfig.binPath && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--success-color)' }}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>已识别三个 exe 文件</span>
                    </div>
                  )}
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






            </motion.div>
          )}

          {activeTab === 'about' && (
            <AboutSection />
          )}
          
          {activeTab === 'path' && (
            <PathPage />
          )}
          </div>
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