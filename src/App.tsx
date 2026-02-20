import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { Sidebar } from '@/layouts/Sidebar';
import { ChatPage } from '@/pages/Chat';
import { ModelsPage } from '@/pages/Models';
import { SettingsPage } from '@/pages/Settings';
import { LogsPage } from '@/pages/Logs';
import { ComparePage } from '@/pages/Compare';
import { IniConfigPage } from '@/pages/IniConfig';
import { GalleryPage } from '@/pages/Gallery';
import VideoPlayerPage from '@/pages/VideoPlayer';
import PromptTemplatesPage from '@/pages/PromptTemplates';
import { LogsPanel } from '@/components/LogsPanel';
import { OllamaModal } from '@/components/OllamaModal';
import { WebShortcutPopup } from '@/components/WebShortcutPopup';
import { DataManager } from '@/components/DataManager';
import { ToastProvider } from '@/components/Toast';
import CustomTitleBar from '@/components/CustomTitleBar';
import { motion, AnimatePresence } from 'framer-motion';

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
        {activePage === 'logs' && <LogsPage />}
        {activePage === 'compare' && <ComparePage />}
        {activePage === 'ini-config' && <IniConfigPage />}
        {activePage === 'gallery' && <GalleryPage />}
        {activePage === 'video-player' && <VideoPlayerPage />}
        {activePage === 'prompt-templates' && <PromptTemplatesPage />}
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  const { activePage, setActivePage, webShortcutPopupOpen, setWebShortcutPopupOpen, dataManagerOpen, setDataManagerOpen } = useStore();
  const [showPathConfigModal, setShowPathConfigModal] = useState(false);
  const [pathsConfigured, setPathsConfigured] = useState(false);

  // 初始化时检查路径配置
  useEffect(() => {
    checkPathsConfigured();
  }, []);

  // 监听路径未配置通知 - 实现启动检查
  useEffect(() => {
    if (window.electronAPI?.storage?.onPathNotConfigured) {
      const unsubscribe = window.electronAPI.storage.onPathNotConfigured(() => {
        setShowPathConfigModal(true);
        setPathsConfigured(false);
      });

      return () => unsubscribe();
    }
  }, []);

  // 检查所有路径是否配置完成
  const checkPathsConfigured = async () => {
    try {
      if (window.electronAPI?.storage?.checkAllPaths) {
        const configured = await window.electronAPI.storage.checkAllPaths();
        setPathsConfigured(configured);
      } else {
        // 非Electron环境，默认设为已配置
        setPathsConfigured(true);
      }
    } catch (error) {
      console.error('Failed to check paths:', error);
      setPathsConfigured(false);
    }
  };

  // 路由守卫 - 未配置完路径时，禁止跳转到功能页
  useEffect(() => {
    if (!pathsConfigured && activePage !== 'settings') {
      // 强制跳转到设置页
      setActivePage('settings');
    }
  }, [activePage, pathsConfigured, setActivePage]);

  // 去设置页
  const goToSettings = () => {
    setActivePage('settings');
    setShowPathConfigModal(false);
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden no-select" style={{ backgroundColor: 'var(--bg-primary)' }}>
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
        
        {/* 路径未配置提示弹窗 */}
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
