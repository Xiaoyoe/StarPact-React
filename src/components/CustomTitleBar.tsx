import React, { useState, useCallback, useEffect, useRef } from 'react';

interface ElectronAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    unmaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface CustomTitleBarProps {
  title: string;
  isElectronEnv?: boolean;
  showWindowControls?: boolean;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  title,
  isElectronEnv = typeof window !== 'undefined' && !!window.electronAPI,
  showWindowControls = typeof window !== 'undefined' && !!window.electronAPI,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const titleBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isElectronEnv && window.electronAPI?.window?.isMaximized) {
      const syncMaxState = async () => {
        try {
          const state = await window.electronAPI.window.isMaximized();
          setIsMaximized(state);
        } catch (error) {
          console.error('Failed to get window state:', error);
        }
      };
      syncMaxState();
    }
  }, [isElectronEnv]);

  const handleMinimize = useCallback(() => {
    if (!isElectronEnv || !window.electronAPI?.window?.minimize) return;
    try {
      window.electronAPI.window.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  }, [isElectronEnv]);

  const handleMaximize = useCallback(() => {
    if (!isElectronEnv || !window.electronAPI?.window) return;
    try {
      if (isMaximized) {
        window.electronAPI.window.unmaximize?.();
      } else {
        window.electronAPI.window.maximize?.();
      }
      setIsMaximized(prev => !prev);
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  }, [isElectronEnv, isMaximized]);

  const handleClose = useCallback(() => {
    if (!isElectronEnv || !window.electronAPI?.window?.close) return;
    try {
      window.electronAPI.window.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  }, [isElectronEnv]);

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
      aria-label={`${title} 标题栏`}
    >
      <div 
        className="flex items-center flex-1 overflow-hidden" 
        aria-live="polite" 
        style={{ maxWidth: 'calc(100% - 120px)' }}
      >
        <h1 className="font-medium truncate text-sm" aria-level="1">{title}</h1>
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
    </div>
  );
};

export default CustomTitleBar;
