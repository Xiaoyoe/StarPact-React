import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Loader, X, RefreshCw, FileJson } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { IndexedDBStorageStatus } from '@/components/IndexedDBStorageStatus';

interface DataManagerProps {
  isOpen: boolean;
  onClose: () => void;
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

export function DataManager({ isOpen, onClose }: DataManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dbData, setDbData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const toast = useToast();

  const handleGetDbData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchIndexDBData();
      setDbData(data);
      const storeNames = Object.keys(data);
      if (storeNames.length > 0 && !selectedStore) {
        setSelectedStore(storeNames[0]);
      }
      toast.success('数据加载成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(errorMessage);
      toast.error('获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIndexDBData = async (): Promise<Record<string, any>> => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('starpact-db');

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const data: Record<string, any> = {};
          const objectStores: string[] = [];

          for (let i = 0; i < db.objectStoreNames.length; i++) {
            objectStores.push(db.objectStoreNames[i]);
          }

          const fetchObjectStoreData = async (storeNames: string[], index: number) => {
            if (index >= storeNames.length) {
              resolve(data);
              return;
            }

            const storeName = storeNames[index];
            
            try {
              const transaction = db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const storeData: any[] = [];

              const cursorRequest = store.openCursor();
              cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                  storeData.push({
                    id: cursor.key,
                    value: cursor.value
                  });
                  cursor.continue();
                } else {
                  data[storeName] = storeData;
                  fetchObjectStoreData(storeNames, index + 1);
                }
              };

              cursorRequest.onerror = () => {
                fetchObjectStoreData(storeNames, index + 1);
              };
            } catch (err) {
              fetchObjectStoreData(storeNames, index + 1);
            }
          };

          fetchObjectStoreData(objectStores, 0);
        };

        request.onerror = () => {
          resolve({});
        };
      } catch (err) {
        resolve({});
      }
    });
  };

  const getStoreCount = (storeName: string) => {
    if (!dbData || !dbData[storeName]) return 0;
    return Array.isArray(dbData[storeName]) ? dbData[storeName].length : 0;
  };

  const getStoreSize = (storeName: string) => {
    if (!dbData || !dbData[storeName]) return 0;
    try {
      return new Blob([JSON.stringify(dbData[storeName])]).size;
    } catch {
      return 0;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-[1200px] h-[80vh] overflow-hidden rounded-2xl flex"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-[240px] flex flex-col shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
              <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-light)' }}>
                  <Database size={16} style={{ color: 'var(--primary-color)' }} />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>数据管理</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>存储仓库</span>
                  <button
                    onClick={handleGetDbData}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
                    style={{
                      color: 'var(--primary-color)',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    {isLoading ? <Loader size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  </button>
                </div>

                {dbData ? (
                  <div className="space-y-0.5">
                    {Object.keys(dbData).map((storeName) => {
                      const count = getStoreCount(storeName);
                      const isSelected = selectedStore === storeName;
                      
                      return (
                        <button
                          key={storeName}
                          onClick={() => setSelectedStore(storeName)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left"
                          style={{
                            backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                          }}
                        >
                          <div 
                            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                          >
                            <FileJson size={11} style={{ color: isSelected ? 'white' : 'var(--text-tertiary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                              {STORE_LABELS[storeName] || storeName}
                            </p>
                          </div>
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Database size={24} className="mb-2" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>点击刷新加载</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid var(--border-color)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedStore && dbData ? (STORE_LABELS[selectedStore] || selectedStore) : '数据详情'}
                  {selectedStore && dbData && (
                    <span className="ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {getStoreCount(selectedStore)} 条
                    </span>
                  )}
                </h3>
              </div>

              {error && (
                <div className="mx-5 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5">
                {selectedStore && dbData && dbData[selectedStore] ? (
                  Array.isArray(dbData[selectedStore]) && dbData[selectedStore].length > 0 ? (
                    <pre 
                      className="p-4 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-auto"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        maxHeight: 'calc(80vh - 120px)'
                      }}
                    >
                      {JSON.stringify(dbData[selectedStore], null, 2)}
                    </pre>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <Database size={28} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>暂无数据</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>此存储仓库为空</p>
                    </div>
                  )
                ) : dbData ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <Database size={28} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>选择左侧存储仓库</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>共 {Object.keys(dbData).length} 个仓库</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <Database size={36} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>尚未加载数据</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>点击左侧刷新按钮加载</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-2.5 border-t flex items-center justify-center gap-6 text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>IndexedDB 本地存储</span>
                <span style={{ color: 'var(--text-tertiary)' }}>仅存储在本地设备</span>
              </div>
            </div>

            <div className="w-[400px] flex flex-col shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>存储状态</h3>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <IndexedDBStorageStatus onRefresh={() => toast.success('存储状态已刷新')} />
                
                {selectedStore && dbData && (
                  <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                    <h4 className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>当前仓库</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>名称</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {STORE_LABELS[selectedStore] || selectedStore}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>记录数</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {getStoreCount(selectedStore)} 条
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>大小</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatSize(getStoreSize(selectedStore))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
