import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { configStorage } from '@/services/storage/ConfigStorage';

interface DevToolsStatus {
  enabled: boolean;
}

export function AboutSection() {
  const [appNameDisplay, setAppNameDisplay] = useState<'chinese' | 'english'>('english');
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const [showDevToolsDialog, setShowDevToolsDialog] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      await configStorage.ready();
      const savedAppNameDisplay = configStorage.get('appNameDisplay');
      if (savedAppNameDisplay) {
        setAppNameDisplay(savedAppNameDisplay);
      }
    };
    loadConfig();

    const checkInterval = setInterval(loadConfig, 1000);
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    const checkDevToolsStatus = async () => {
      if (window.electronAPI?.devTools?.getStatus) {
        const status: DevToolsStatus = await window.electronAPI.devTools.getStatus();
        setDevToolsEnabled(status.enabled);
      }
    };
    checkDevToolsStatus();
    const interval = setInterval(checkDevToolsStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const appName = appNameDisplay === 'chinese' ? '星约' : 'Starpact';

  const handleHeaderDoubleClick = async () => {
    if (devToolsEnabled) {
      setShowDevToolsDialog(true);
    } else {
      setShowDevToolsDialog(true);
    }
  };

  const handleEnableDevTools = async () => {
    if (window.electronAPI?.devTools?.enable) {
      await window.electronAPI.devTools.enable();
      setDevToolsEnabled(true);
      setShowDevToolsDialog(false);
    }
  };

  const handleDisableDevTools = async () => {
    if (window.electronAPI?.devTools?.disable) {
      await window.electronAPI.devTools.disable();
      setDevToolsEnabled(false);
      setShowDevToolsDialog(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div
        className="text-center cursor-pointer select-none"
        onDoubleClick={handleHeaderDoubleClick}
        title="双击打开开发者模式设置"
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-200"
          style={{ backgroundColor: 'var(--primary-light)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>AI</span>
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {appName}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          多功能智能桌面应用 v1.0.0
        </p>
        {devToolsEnabled && (
          <p className="mt-1 text-xs" style={{ color: 'var(--success-color)' }}>
            🔧 开发者模式已启用
          </p>
        )}
      </div>

      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>技术栈</h3>
        <div className="grid grid-cols-2 gap-2">
          {
            [
              'React 18 + TypeScript',
              'Tailwind CSS 4.x',
              'Zustand 状态管理',
              'Framer Motion 动效',
              'React Markdown',
              'Lucide Icons',
            ].map((tech) => (
              <div key={tech} className="rounded-lg p-2 text-sm" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)' }}>
                {tech}
              </div>
            ))
          }
        </div>
      </div>

      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>核心特性</h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>✦ 多主题支持（浅色/深色/科技蓝/护眼绿/午夜蓝/森林绿/珊瑚橙/薰衣草紫/薄荷青/焦糖棕/樱花粉/深海蓝/琥珀金）</li>
          <li>✦ 多模型管理与快速切换</li>
          <li>✦ 流式输出打字机效果</li>
          <li>✦ Markdown 全格式渲染 + 代码高亮</li>
          <li>✦ 通用工具类封装，一次开发全局复用</li>
          <li>✦ 跨平台桌面端适配</li>
        </ul>
      </div>

      {showDevToolsDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowDevToolsDialog(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              🔧 开发者模式设置
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {devToolsEnabled
                ? '开发者模式当前已启用。您可以选择禁用它，禁用后 F12 快捷键将无法打开开发者工具。'
                : '您确定要启用开发者模式吗？启用后可以使用 F12 快捷键打开开发者工具。'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDevToolsDialog(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                取消
              </button>
              <button
                onClick={devToolsEnabled ? handleDisableDevTools : handleEnableDevTools}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: devToolsEnabled ? 'var(--error-color)' : 'var(--primary-color)',
                  color: 'var(--text-primary)'
                }}
              >
                {devToolsEnabled ? '禁用开发者模式' : '启用开发者模式'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
