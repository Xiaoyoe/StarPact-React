import { useState, useEffect } from 'react';
import { useStore, initializeStoreFromStorage } from '@/store';
import { Sidebar } from '@/layouts/Sidebar';
import { ChatPage } from '@/pages/Chat';
import { ModelsPage } from '@/pages/Models';
import { SettingsPage } from '@/pages/Settings';
import { ComparePage } from '@/pages/Compare';
import { IniConfigPage } from '@/pages/IniConfig';
import { GalleryPage } from '@/pages/Gallery';
import VideoPlayerPage from '@/pages/VideoPlayer';
import PromptTemplatesPage from '@/pages/PromptTemplates';
import { MediaToolsPage } from '@/pages/MediaTools';
import { LogsPanel } from '@/components/LogsPanel';
import { OllamaModal } from '@/components/OllamaModal';
import { WebShortcutPopup } from '@/components/WebShortcutPopup';
import { DataManager } from '@/components/DataManager';
import { ToastProvider } from '@/components/Toast';
import CustomTitleBar from '@/components/CustomTitleBar';
import { SplashScreen, SplashScreenMinimal, SplashScreenFade, type SplashScreenType } from '@/components/SplashScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { configStorage } from '@/services/storage/ConfigStorage';

function PageContent() {
  const { activePage } = useStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex-1 min-h-0 overflow-hidden"
      >
        {activePage === 'chat' && <ChatPage />}
        {activePage === 'models' && <ModelsPage />}
        {activePage === 'settings' && <SettingsPage />}
        {activePage === 'compare' && <ComparePage />}
        {activePage === 'ini-config' && <IniConfigPage />}
        {activePage === 'gallery' && <GalleryPage />}
        {activePage === 'video-player' && <VideoPlayerPage />}
        {activePage === 'prompt-templates' && <PromptTemplatesPage />}
        {activePage === 'media-tools' && <MediaToolsPage />}
      </motion.div>
    </AnimatePresence>
  );
}

const INIT_STEPS = [
  { step: 'init', label: '正在初始化应用...', progress: 10 },
  { step: 'storage', label: '加载存储模块...', progress: 30 },
  { step: 'config', label: '读取配置文件...', progress: 50 },
  { step: 'paths', label: '检查存储路径...', progress: 70 },
  { step: 'models', label: '加载模型数据...', progress: 85 },
  { step: 'conversations', label: '加载对话记录...', progress: 95 },
  { step: 'done', label: '准备就绪', progress: 100 },
];

export function App() {
  const { activePage, setActivePage, webShortcutPopupOpen, setWebShortcutPopupOpen, dataManagerOpen, setDataManagerOpen } = useStore();
  const [showPathConfigModal, setShowPathConfigModal] = useState(false);
  const [pathsConfigured, setPathsConfigured] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashScreenType, setSplashScreenType] = useState<SplashScreenType>('full');
  const [splashScreenEnabled, setSplashScreenEnabled] = useState(true);
  const [initProgress, setInitProgress] = useState(0);
  const [initStep, setInitStep] = useState('正在初始化应用...');

  useEffect(() => {
    const initApp = async () => {
      try {
        setInitProgress(INIT_STEPS[0].progress);
        setInitStep(INIT_STEPS[0].label);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setInitProgress(INIT_STEPS[1].progress);
        setInitStep(INIT_STEPS[1].label);
        
        await configStorage.ready();
        
        setInitProgress(INIT_STEPS[2].progress);
        setInitStep(INIT_STEPS[2].label);
        
        const savedSplashType = configStorage.get('splashScreenType');
        const savedSplashEnabled = configStorage.get('splashScreenEnabled');
        
        if (savedSplashType) {
          setSplashScreenType(savedSplashType);
        }
        if (savedSplashEnabled !== undefined) {
          setSplashScreenEnabled(savedSplashEnabled);
        }
        
        if (!savedSplashEnabled || savedSplashType === 'none') {
          setShowSplash(false);
        }
        
        setInitProgress(INIT_STEPS[3].progress);
        setInitStep(INIT_STEPS[3].label);
        
        let configured = true;
        if (window.electronAPI?.storage?.checkAllPaths) {
          configured = await window.electronAPI.storage.checkAllPaths();
        }
        
        setInitProgress(INIT_STEPS[4].progress);
        setInitStep(INIT_STEPS[4].label);
        
        await initializeStoreFromStorage();
        
        setInitProgress(INIT_STEPS[5].progress);
        setInitStep(INIT_STEPS[5].label);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!configured) {
          setPathsConfigured(false);
          setActivePage('settings');
          setShowPathConfigModal(true);
        } else {
          setPathsConfigured(true);
          const savedDefaultPage = configStorage.get('defaultPage');
          if (savedDefaultPage) {
            setActivePage(savedDefaultPage);
          }
        }
        
        setInitProgress(INIT_STEPS[6].progress);
        setInitStep(INIT_STEPS[6].label);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setInitialized(true);
        console.log('应用初始化完成');
      } catch (error) {
        console.error('应用初始化失败:', error);
        setInitProgress(100);
        setInitStep('初始化完成');
        setInitialized(true);
      }
    };
    initApp();
  }, [setActivePage]);

  useEffect(() => {
    if (window.electronAPI?.storage?.onPathNotConfigured) {
      const unsubscribe = window.electronAPI.storage.onPathNotConfigured(() => {
        setShowPathConfigModal(true);
        setPathsConfigured(false);
        setActivePage('settings');
      });

      return () => unsubscribe();
    }
  }, [setActivePage]);

  const goToSettings = () => {
    setActivePage('settings');
    setShowPathConfigModal(false);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const renderSplashScreen = () => {
    if (!showSplash || !initialized) return null;
    
    switch (splashScreenType) {
      case 'full':
        return (
          <SplashScreen 
            onComplete={handleSplashComplete} 
            enabled={splashScreenEnabled} 
            progress={initProgress}
            currentStep={initStep}
          />
        );
      case 'minimal':
        return (
          <SplashScreenMinimal 
            onComplete={handleSplashComplete} 
            enabled={splashScreenEnabled}
            progress={initProgress}
          />
        );
      case 'fade':
        return (
          <SplashScreenFade 
            onComplete={handleSplashComplete} 
            enabled={splashScreenEnabled}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden no-select" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {showSplash && splashScreenEnabled && splashScreenType !== 'none' ? (
          renderSplashScreen()
        ) : !initialized ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{initStep}</span>
            </div>
          </div>
        ) : (
          <>
            <Sidebar />
            <main className="min-w-0 flex-1 no-select flex flex-col">
              <CustomTitleBar />
              <PageContent />
            </main>
            <LogsPanel />
            <OllamaModal />
            <AnimatePresence>
              {webShortcutPopupOpen && (
                <WebShortcutPopup onClose={() => setWebShortcutPopupOpen(false)} />
              )}
            </AnimatePresence>
            <DataManager isOpen={dataManagerOpen} onClose={() => setDataManagerOpen(false)} />
          </>
        )}
        
        <AnimatePresence>
          {showPathConfigModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="rounded-xl p-6 max-w-md w-full"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <h3 className="mb-3 text-lg font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                  存储路径未配置
                </h3>
                <p className="mb-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                  请先在设置页配置所有模块的存储路径，以确保应用正常运行
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={goToSettings}
                    className="rounded-lg px-6 py-2 text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--primary-color)',
                      color: 'white'
                    }}
                  >
                    去设置
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}
