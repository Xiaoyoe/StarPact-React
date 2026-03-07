import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dailyQuotes from '@/styles/themes/quotes/daily_quotes.json';
import { configStorage } from '@/services/storage/ConfigStorage';

interface ElectronAPI {
  ollama: {
    checkStatus: () => Promise<any>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    restart: () => Promise<void>;
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<any>;
    getModels: () => Promise<any[]>;
    chat: (options: any) => Promise<any>;
    streamChat: (options: any) => Promise<any>;
    pullModel: (modelName: string) => Promise<void>;
    deleteModel: (modelName: string) => Promise<void>;
    getModelInfo: (modelName: string) => Promise<any>;
    copyModel: (source: string, destination: string) => Promise<void>;
    generateEmbedding: (text: string, model?: string) => Promise<number[]>;
    ps: () => Promise<any>;
    createModel: (name: string, modelfile: string) => Promise<any>;
    onStatus: (callback: (status: any) => void) => () => void;
    onLog: (callback: (log: any) => void) => () => void;
    onChatChunk: (callback: (chunk: string) => void) => () => void;
    onPullProgress: (callback: (progress: any) => void) => () => void;
  };
  file: {
    selectFolder: (options?: {
      title?: string;
      defaultPath?: string;
    }) => Promise<{
      success: boolean;
      path: string | null;
      error?: string;
    }>;
    selectFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
      multi?: boolean;
    }) => Promise<{
      success: boolean;
      filePath: string | null;
      filePaths?: string[] | null;
      error?: string;
    }>;
    readFile: (filePath: string, encoding?: string) => Promise<{
      success: boolean;
      content: string | null;
      error?: string;
    }>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    getMaximized: () => Promise<boolean>;
    resize: (width: number, height: number) => Promise<{ success: boolean; width?: number; height?: number }>;
    getSize: () => Promise<{ width: number; height: number } | null>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface CustomTitleBarProps {
  isElectronEnv?: boolean;
  showWindowControls?: boolean;
}

const DEFAULT_TITLE_CN = '星约';
const DEFAULT_TITLE_EN = 'Starpact';

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  isElectronEnv = typeof window !== 'undefined' && !!window.electronAPI,
  showWindowControls = typeof window !== 'undefined' && !!window.electronAPI,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * dailyQuotes.length));
  const [dailyQuoteEnabled, setDailyQuoteEnabled] = useState(false);
  const [dailyQuoteInterval, setDailyQuoteInterval] = useState<10 | 3600 | 86400>(10);
  const [closeConfirm, setCloseConfirm] = useState(true);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');
  const titleBarRef = useRef<HTMLDivElement>(null);

  const currentQuote = useMemo(() => dailyQuotes[quoteIndex], [quoteIndex]);

  useEffect(() => {
    const loadConfig = async () => {
      await configStorage.ready();
      const savedDailyQuote = configStorage.get('dailyQuote');
      if (savedDailyQuote) {
        setDailyQuoteEnabled(savedDailyQuote.enabled ?? true);
        setDailyQuoteInterval(savedDailyQuote.interval ?? 10);
      }
      const savedCloseConfirm = configStorage.get('closeConfirm');
      if (savedCloseConfirm !== undefined) {
        setCloseConfirm(savedCloseConfirm);
      }
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      if (savedAppNameDisplay) {
        setAppNameDisplay(savedAppNameDisplay);
      }
    };
    loadConfig();

    const handleStorageChange = () => {
      loadConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    
    const checkInterval = setInterval(loadConfig, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);

  useEffect(() => {
    if (!dailyQuoteEnabled) return;
    
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % dailyQuotes.length);
    }, dailyQuoteInterval * 1000);
    
    return () => clearInterval(interval);
  }, [dailyQuoteEnabled, dailyQuoteInterval]);

  useEffect(() => {
    if (isElectronEnv && window.electronAPI?.window?.getMaximized) {
      const syncMaxState = async () => {
        try {
          const state = await window.electronAPI.window.getMaximized();
          setIsMaximized(state);
        } catch (error) {
          console.error('Failed to get window state:', error);
        }
      };
      syncMaxState();
    }
  }, [isElectronEnv]);

  const handleRefresh = useCallback(() => {
    setShowRefreshDialog(true);
  }, []);

  const confirmRefresh = useCallback(() => {
    setShowRefreshDialog(false);
    window.location.reload();
  }, []);

  const cancelRefresh = useCallback(() => {
    setShowRefreshDialog(false);
  }, []);

  const handleMinimize = useCallback(async () => {
    if (!isElectronEnv || !window.electronAPI?.window?.minimize) return;
    try {
      await window.electronAPI.window.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, [isElectronEnv]);

  const handleMaximize = useCallback(async () => {
    if (!isElectronEnv || !window.electronAPI?.window?.maximize) return;
    try {
      await window.electronAPI.window.maximize();
      const newState = await window.electronAPI.window.getMaximized();
      setIsMaximized(newState);
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  }, [isElectronEnv]);

  const handleClose = useCallback(async () => {
    if (!isElectronEnv || !window.electronAPI?.window?.close) return;
    
    if (closeConfirm) {
      setShowCloseDialog(true);
    } else {
      try {
        await window.electronAPI.window.close();
      } catch (error) {
        console.error('Failed to close window:', error);
      }
    }
  }, [isElectronEnv, closeConfirm]);

  const confirmClose = useCallback(async () => {
    setShowCloseDialog(false);
    try {
      await window.electronAPI.window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, []);

  const cancelClose = useCallback(() => {
    setShowCloseDialog(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div 
      ref={titleBarRef}
      className="custom-title-bar flex items-center justify-between px-3"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-color)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        width: '100%',
        boxSizing: 'border-box',
        height: '48px',
        flexShrink: 0,
        WebkitAppRegion: isElectronEnv ? 'drag' : 'no-drag',
        appRegion: isElectronEnv ? 'drag' : 'no-drag',
      }}
      role="banner"
      aria-roledescription="标题栏"
      aria-label="每日一言"
    >
      <div 
        className="flex items-center flex-1 overflow-hidden" 
        aria-live="polite" 
        style={{ maxWidth: 'calc(100% - 120px)' }}
      >
        <AnimatePresence mode="wait">
          <motion.h1
            key={dailyQuoteEnabled ? quoteIndex : 'title'}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="truncate transition-all duration-300"
            style={{
              fontSize: dailyQuoteEnabled ? '13px' : '14px',
              fontWeight: dailyQuoteEnabled ? 400 : 500,
              fontStyle: dailyQuoteEnabled ? 'italic' : 'normal',
              color: dailyQuoteEnabled ? 'var(--text-secondary)' : 'var(--text-primary)',
              letterSpacing: dailyQuoteEnabled ? '0.02em' : 'normal',
            }}
            aria-level={1}
          >
            {dailyQuoteEnabled ? currentQuote : (appNameDisplay === 'chinese' ? DEFAULT_TITLE_CN : DEFAULT_TITLE_EN)}
          </motion.h1>
        </AnimatePresence>
      </div>
      
      {showWindowControls && (
        <div 
          className="flex items-center gap-0.5" 
          role="group" 
          aria-label="窗口控制按钮"
          style={{
            WebkitAppRegion: 'no-drag',
            appRegion: 'no-drag',
          }}
        >
          <button 
            onClick={handleRefresh}
            className="title-bar-btn w-11 h-9 flex items-center justify-center transition-all duration-150 ease-in-out relative focus:outline-none"
            onKeyDown={(e) => handleKeyDown(e, handleRefresh)}
            aria-label="刷新页面"
            tabIndex={0}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 16h5v5"/>
            </svg>
            <span className="sr-only">刷新</span>
          </button>
          
          <button 
            onClick={handleMinimize}
            className="title-bar-btn w-11 h-9 flex items-center justify-center transition-all duration-150 ease-in-out relative focus:outline-none"
            onKeyDown={(e) => handleKeyDown(e, handleMinimize)}
            aria-label="最小化窗口"
            tabIndex={0}
          >
            <span 
              className="w-4 h-0.5 transition-all duration-150 ease-in-out"
              style={{ backgroundColor: 'var(--text-secondary)' }}
            ></span>
            <span className="sr-only">最小化</span>
          </button>
          
          <button 
            onClick={handleMaximize}
            className="title-bar-btn w-11 h-9 flex items-center justify-center transition-all duration-150 ease-in-out relative focus:outline-none"
            onKeyDown={(e) => handleKeyDown(e, handleMaximize)}
            aria-label={isMaximized ? "还原窗口" : "最大化窗口"}
            tabIndex={0}
          >
            {isMaximized ? (
              <div className="relative w-[14px] h-[14px] transition-all duration-150 ease-in-out">
                <div 
                  className="absolute -top-0.5 -right-0.5 w-[10px] h-[10px] border transition-all duration-150 ease-in-out"
                  style={{ 
                    borderColor: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                ></div>
                <div 
                  className="w-[14px] h-[14px] border transition-all duration-150 ease-in-out"
                  style={{ borderColor: 'var(--text-secondary)' }}
                ></div>
              </div>
            ) : (
              <div 
                className="w-[14px] h-[14px] border transition-all duration-150 ease-in-out"
                style={{ borderColor: 'var(--text-secondary)' }}
              ></div>
            )}
            <span className="sr-only">{isMaximized ? '还原' : '最大化'}</span>
          </button>
          
          <button 
            onClick={handleClose}
            className="title-bar-btn title-bar-close w-11 h-9 flex items-center justify-center transition-all duration-150 ease-in-out relative focus:outline-none"
            onKeyDown={(e) => handleKeyDown(e, handleClose)}
            aria-label="关闭窗口"
            tabIndex={0}
          >
            <span 
              className="w-4 h-0.5 transform rotate-45 absolute transition-all duration-150 ease-in-out"
              style={{ backgroundColor: 'var(--text-secondary)' }}
            ></span>
            <span 
              className="w-4 h-0.5 transform -rotate-45 absolute transition-all duration-150 ease-in-out"
              style={{ backgroundColor: 'var(--text-secondary)' }}
            ></span>
            <span className="sr-only">关闭</span>
          </button>
        </div>
      )}

      {showCloseDialog && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)' }}
          onClick={cancelClose}
        >
          <div 
            className="rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              确认关闭
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              确定要关闭应用程序吗？
            </p>
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={confirmClose}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white'
                }}
              >
                确认关闭
              </motion.button>
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={cancelClose}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                取消
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {showRefreshDialog && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)' }}
          onClick={cancelRefresh}
        >
          <div 
            className="rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              确认刷新
            </h3>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              确定要刷新页面吗？
            </p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
              刷新将重新加载应用程序，当前未保存的数据可能会丢失。
            </p>
            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={confirmRefresh}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white'
                }}
              >
                确认刷新
              </motion.button>
              <motion.button
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={cancelRefresh}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                取消
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTitleBar;
