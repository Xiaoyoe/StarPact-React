import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Loader, X, RefreshCw, FileJson, ChevronLeft, ChevronRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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
  'web-shortcuts': '网页快捷方式',
  'config': '配置',
  'chat-model': '聊天页面',
  'logs': '日志',
  'ollama-model': 'Ollama 模型',
  'text-contrast': '文本对比',
  'images': '图片',
  'videos': '视频',
  'ffmpeg-config': 'FFmpeg 配置',
  'set-background': '自定义壁纸'
};

const PAGE_SIZE = 20;
const MAX_PREVIEW_LENGTH = 500;
const LARGE_DATA_COUNT_THRESHOLD = 100;
const LARGE_DATA_SIZE_THRESHOLD = 1 * 1024 * 1024;

interface StoreInfo {
  name: string;
  count: number;
  size: number;
}

interface StoreDataItem {
  id: IDBValidKey;
  value: any;
}

export function DataManager({ isOpen, onClose }: DataManagerProps) {
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [storeInfos, setStoreInfos] = useState<StoreInfo[]>([]);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [storeData, setStoreData] = useState<StoreDataItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    storeName: string;
    storeInfo: StoreInfo;
  } | null>(null);
  const toast = useToast();

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const loadStoreInfos = useCallback(async () => {
    setIsLoadingStores(true);
    setError(null);
    try {
      const infos = await fetchStoreInfos();
      setStoreInfos(infos);
      if (infos.length > 0 && !selectedStore) {
        const configStore = infos.find(s => s.name === 'config');
        setSelectedStore(configStore ? configStore.name : infos[0].name);
      }
      toast.success('存储列表已刷新');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取存储列表失败';
      setError(errorMessage);
      toast.error('获取存储列表失败');
    } finally {
      setIsLoadingStores(false);
    }
  }, [selectedStore, toast]);

  const loadStoreData = useCallback(async (storeName: string, page: number) => {
    setIsLoadingData(true);
    setError(null);
    try {
      const result = await fetchStoreDataPaginated(storeName, page, PAGE_SIZE);
      setStoreData(result.items);
      setTotalCount(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(errorMessage);
      toast.error('获取数据失败');
      setStoreData([]);
      setTotalCount(0);
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadStoreInfos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedStore) {
      setCurrentPage(1);
      setExpandedItems(new Set());
      loadStoreData(selectedStore, 1);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore) {
      loadStoreData(selectedStore, currentPage);
    }
  }, [currentPage]);

  const isLargeDataStore = useCallback((storeInfo: StoreInfo): boolean => {
    return storeInfo.count > LARGE_DATA_COUNT_THRESHOLD || storeInfo.size > LARGE_DATA_SIZE_THRESHOLD;
  }, []);

  const handleStoreSelect = (storeName: string) => {
    if (storeName === selectedStore) return;
    
    const storeInfo = storeInfos.find(s => s.name === storeName);
    if (storeInfo && isLargeDataStore(storeInfo)) {
      setConfirmDialog({ open: true, storeName, storeInfo });
    } else {
      setSelectedStore(storeName);
    }
  };

  const handleConfirmLoad = () => {
    if (confirmDialog) {
      setSelectedStore(confirmDialog.storeName);
      setConfirmDialog(null);
    }
  };

  const handleCancelLoad = () => {
    setConfirmDialog(null);
  };

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleRefresh = () => {
    loadStoreInfos();
    if (selectedStore) {
      loadStoreData(selectedStore, currentPage);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncateJson = useCallback((data: any, maxLength: number = MAX_PREVIEW_LENGTH): string => {
    const json = JSON.stringify(data, null, 2);
    if (json.length <= maxLength) return json;
    return json.slice(0, maxLength) + '\n... (内容过长，点击展开查看完整内容)';
  }, []);

  const selectedStoreInfo = useMemo(() => {
    return storeInfos.find(s => s.name === selectedStore);
  }, [storeInfos, selectedStore]);

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
                    onClick={handleRefresh}
                    disabled={isLoadingStores}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
                    style={{
                      color: 'var(--primary-color)',
                      opacity: isLoadingStores ? 0.6 : 1
                    }}
                  >
                    {isLoadingStores ? <Loader size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  </button>
                </div>

                {storeInfos.length > 0 ? (
                  <div className="space-y-0.5">
                    {storeInfos.map((store) => {
                      const isSelected = selectedStore === store.name;
                      
                      return (
                        <button
                          key={store.name}
                          onClick={() => handleStoreSelect(store.name)}
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
                              {STORE_LABELS[store.name] || store.name}
                            </p>
                          </div>
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                          >
                            {store.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Database size={24} className="mb-2" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {isLoadingStores ? '加载中...' : '点击刷新加载'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: '1px solid var(--border-color)' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedStore ? (STORE_LABELS[selectedStore] || selectedStore) : '数据详情'}
                  {selectedStoreInfo && (
                    <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {selectedStoreInfo.count} 条 | {formatSize(selectedStoreInfo.size)}
                    </span>
                  )}
                </h3>
                {selectedStore && selectedStoreInfo && selectedStoreInfo.count > PAGE_SIZE && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(-1)}
                      disabled={currentPage === 1 || isLoadingData}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                        opacity: currentPage === 1 || isLoadingData ? 0.5 : 1
                      }}
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === totalPages || isLoadingData}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                        opacity: currentPage === totalPages || isLoadingData ? 0.5 : 1
                      }}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="mx-5 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingData ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <Loader size={24} className="animate-spin mb-2" style={{ color: 'var(--primary-color)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>加载数据中...</p>
                  </div>
                ) : selectedStore && storeData.length > 0 ? (
                  <div className="space-y-2">
                    {storeData.map((item, index) => {
                      const itemId = String(item.id);
                      const isExpanded = expandedItems.has(itemId);
                      const displayIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                      
                      return (
                        <div
                          key={itemId}
                          className="rounded-lg overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                          <div 
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => toggleItemExpand(itemId)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                              >
                                #{displayIndex}
                              </span>
                              <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                ID: {itemId}
                              </span>
                            </div>
                            <button
                              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                            >
                              {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0">
                              <pre 
                                className="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-[300px]"
                                style={{ 
                                  backgroundColor: 'var(--bg-primary)', 
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-secondary)'
                                }}
                              >
                                {JSON.stringify(item.value, null, 2)}
                              </pre>
                            </div>
                          )}
                          {!isExpanded && (
                            <div className="px-3 pb-2 pt-0">
                              <pre 
                                className="text-xs font-mono whitespace-pre-wrap overflow-hidden"
                                style={{ 
                                  color: 'var(--text-tertiary)',
                                  maxHeight: '40px'
                                }}
                              >
                                {truncateJson(item.value)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : selectedStore ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <Database size={28} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>暂无数据</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>此存储仓库为空</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <Database size={28} style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>选择左侧存储仓库</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>共 {storeInfos.length} 个仓库</p>
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
                <IndexedDBStorageStatus onRefresh={() => {
                  toast.success('存储状态已刷新');
                  loadStoreInfos();
                }} />
                
                {selectedStore && selectedStoreInfo && (
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
                          {selectedStoreInfo.count} 条
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>大小</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatSize(selectedStoreInfo.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {confirmDialog?.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={handleCancelLoad}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>大量数据警告</h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>该存储表包含大量数据</p>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>存储表</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {STORE_LABELS[confirmDialog.storeName] || confirmDialog.storeName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>记录数量</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {confirmDialog.storeInfo.count} 条
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>数据大小</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatSize(confirmDialog.storeInfo.size)}
                    </span>
                  </div>
                </div>

                <div className="mb-5 p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <p className="text-xs" style={{ color: '#F59E0B' }}>
                    该存储表数据量较大，加载时可能会出现短暂卡顿。系统将采用分页方式加载，每页显示 {PAGE_SIZE} 条数据。
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelLoad}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)' 
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmLoad}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    确认加载
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

async function fetchStoreInfos(): Promise<StoreInfo[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('starpact-db');

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const infos: StoreInfo[] = [];
      const storeNames: string[] = [];

      for (let i = 0; i < db.objectStoreNames.length; i++) {
        storeNames.push(db.objectStoreNames[i]);
      }

      const processStore = (index: number) => {
        if (index >= storeNames.length) {
          db.close();
          resolve(infos);
          return;
        }

        const storeName = storeNames[index];
        try {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();

          countRequest.onsuccess = () => {
            const count = countRequest.result;
            
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const allData = getAllRequest.result;
              const size = new Blob([JSON.stringify(allData)]).size;
              
              infos.push({ name: storeName, count, size });
              processStore(index + 1);
            };
            getAllRequest.onerror = () => {
              infos.push({ name: storeName, count, size: 0 });
              processStore(index + 1);
            };
          };

          countRequest.onerror = () => {
            infos.push({ name: storeName, count: 0, size: 0 });
            processStore(index + 1);
          };
        } catch (err) {
          infos.push({ name: storeName, count: 0, size: 0 });
          processStore(index + 1);
        }
      };

      processStore(0);
    };

    request.onerror = () => {
      reject(new Error('无法打开数据库'));
    };
  });
}

async function fetchStoreDataPaginated(
  storeName: string, 
  page: number, 
  pageSize: number
): Promise<{ items: StoreDataItem[]; total: number }> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('starpact-db');

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        resolve({ items: [], total: 0 });
        return;
      }

      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const allItems: StoreDataItem[] = [];

        const cursorRequest = store.openCursor();
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            allItems.push({
              id: cursor.key,
              value: cursor.value
            });
            cursor.continue();
          } else {
            db.close();
            
            const total = allItems.length;
            const startIndex = (page - 1) * pageSize;
            const paginatedItems = allItems.slice(startIndex, startIndex + pageSize);
            
            resolve({ items: paginatedItems, total });
          }
        };

        cursorRequest.onerror = () => {
          db.close();
          reject(new Error('读取数据失败'));
        };
      } catch (err) {
        db.close();
        reject(err);
      }
    };

    request.onerror = () => {
      reject(new Error('无法打开数据库'));
    };
  });
}
