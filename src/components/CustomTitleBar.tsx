import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dailyQuotes from '@/styles/themes/quotes/daily_quotes.json';
import { configStorage } from '@/services/storage/ConfigStorage';

interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    getMaximized: () => Promise<boolean>;
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

const DEFAULT_TITLE = 'AI Model WebUI';

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
        <h1 className="font-medium truncate text-sm transition-opacity duration-500" aria-level="1">
          {dailyQuoteEnabled ? currentQuote : DEFAULT_TITLE}
        </h1>
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
    </div>
  );
};

export default CustomTitleBar;
