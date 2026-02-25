import { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { StorageMonitor } from '@/services/storage/StorageMonitor';
import type { StorageHealthReport } from '@/services/storage/StorageMonitor';

interface IndexedDBStorageStatusProps {
  onRefresh?: () => void;
}

const STORE_LABELS: Record<string, string> = {
  'gallery': '图片相册',
  'video-playlists': '视频播放列表',
  'prompt-templates': '提示词模板',
  'config': '配置',
  'web-shortcuts': '网页快捷方式',
  'chat-model': '聊天模型',
  'logs': '日志',
  'ollama-model': 'Ollama 模型',
  'text-contrast': '文本对比',
  'images': '图片',
  'videos': '视频'
};

export function IndexedDBStorageStatus({ onRefresh }: IndexedDBStorageStatusProps) {
  const [storageReport, setStorageReport] = useState<StorageHealthReport | null>(null);

  useEffect(() => {
    const loadStorageReport = async () => {
      const report = await StorageMonitor.getHealthReport();
      setStorageReport(report);
    };
    loadStorageReport();
  }, []);

  const handleRefresh = async () => {
    const report = await StorageMonitor.getHealthReport();
    setStorageReport(report);
    onRefresh?.();
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return '#22C55E';
      case 'warning': return '#F59E0B';
      default: return '#EF4444';
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'healthy': return '正常';
      case 'warning': return '警告';
      default: return '异常';
    }
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          <Database size={14} className="mr-1 inline" /> IndexedDB存储状态
        </h3>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>

      {storageReport ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getHealthColor(storageReport.overall) }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              整体状态: {getHealthLabel(storageReport.overall)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              | 总记录: {storageReport.totalRecords} 条
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              | 总大小: {StorageMonitor.formatSize(storageReport.totalSize)}
            </span>
          </div>

          <div className="space-y-2">
            {storageReport.stores.map((store) => (
              <div
                key={store.storeName}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: getHealthColor(store.health) }}
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {store.storeName}{' - '}{STORE_LABELS[store.storeName] || ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {store.count} 条
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {StorageMonitor.formatSize(store.size)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          正在加载存储状态...
        </p>
      )}
    </div>
  );
}
