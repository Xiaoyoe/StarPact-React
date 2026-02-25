import { useState, useEffect, useRef } from 'react';
import { Database, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { StorageMonitor } from '@/services/storage/StorageMonitor';
import type { StorageHealthReport } from '@/services/storage/StorageMonitor';
import { useStore } from '@/store';

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
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    warning?: string;
    onConfirm: () => void;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const clearLogs = useStore((state) => state.clearLogs);

  useEffect(() => {
    const loadStorageReport = async () => {
      const report = await StorageMonitor.getHealthReport();
      setStorageReport(report);
    };
    loadStorageReport();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    const report = await StorageMonitor.getHealthReport();
    setStorageReport(report);
    onRefresh?.();
  };

  const handleClear = async () => {
    setConfirmDialog({
      open: true,
      title: '清空所有数据',
      message: '确定要清空所有 IndexedDB 数据吗？此操作不可恢复！',
      warning: '注意：导出的图片和视频文件后续导入时会失效，请谨慎考虑。',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          clearLogs();
          await clearAllIndexedDB();
          const report = await StorageMonitor.getHealthReport();
          setStorageReport(report);
          onRefresh?.();
        } catch (err) {
          console.error('清空失败:', err);
        }
      }
    });
  };

  const handleStoreClick = (storeName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    setSelectedStore(storeName);
    setShowStoreMenu(true);
  };

  const handleExportStore = async () => {
    if (!selectedStore) return;
    setShowStoreMenu(false);
    
    try {
      const storeData = await fetchStoreData(selectedStore);
      const jsonString = JSON.stringify({ [selectedStore]: storeData }, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `${selectedStore}-backup-${dateStr}.json`;
      
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            downloadBlob(blob, fileName);
          }
        }
      } else {
        downloadBlob(blob, fileName);
      }
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const handleClearStore = async () => {
    if (!selectedStore) return;
    const storeName = selectedStore;
    setShowStoreMenu(false);
    
    const isMediaStore = ['images', 'videos', 'gallery'].includes(storeName);
    
    setConfirmDialog({
      open: true,
      title: '清空数据表',
      message: `确定要清空 "${STORE_LABELS[storeName] || storeName}" 的所有数据吗？此操作不可恢复！`,
      warning: isMediaStore ? '注意：导出的图片和视频文件后续导入时会失效，请谨慎考虑。' : undefined,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          if (storeName === 'logs') {
            clearLogs();
          }
          await clearStoreData(storeName);
          const report = await StorageMonitor.getHealthReport();
          setStorageReport(report);
          onRefresh?.();
        } catch (err) {
          console.error('清空失败:', err);
        }
      }
    });
  };

  const clearStoreData = async (storeName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('starpact-db');

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve();
            return;
          }
          
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            db.close();
            resolve();
          };
          
          clearRequest.onerror = (e) => {
            console.error(`清空 ${storeName} 失败:`, e);
            db.close();
            reject(new Error(`清空 ${storeName} 失败`));
          };

          transaction.onerror = (e) => {
            console.error(`事务错误 ${storeName}:`, e);
            db.close();
            reject(new Error(`事务错误 ${storeName}`));
          };

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        };

        request.onerror = () => {
          reject(new Error('无法打开数据库'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const fetchStoreData = async (storeName: string): Promise<any[]> => {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('starpact-db');

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(storeName)) {
            resolve([]);
            return;
          }
          
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
              resolve(storeData);
            }
          };

          cursorRequest.onerror = () => {
            resolve([]);
          };
        };

        request.onerror = () => {
          resolve([]);
        };
      } catch (err) {
        resolve([]);
      }
    });
  };

  const clearAllIndexedDB = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('starpact-db');

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const storeNames: string[] = [];

          for (let i = 0; i < db.objectStoreNames.length; i++) {
            storeNames.push(db.objectStoreNames[i]);
          }

          if (storeNames.length === 0) {
            db.close();
            resolve();
            return;
          }

          const clearPromises = storeNames.map((storeName) => {
            return new Promise<void>((res, rej) => {
              try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const clearRequest = store.clear();
                
                clearRequest.onsuccess = () => {
                  res();
                };
                
                clearRequest.onerror = (e) => {
                  console.error(`清空 ${storeName} 失败:`, e);
                  rej(new Error(`清空 ${storeName} 失败`));
                };

                transaction.onerror = (e) => {
                  console.error(`事务错误 ${storeName}:`, e);
                  rej(new Error(`事务错误 ${storeName}`));
                };

                transaction.oncomplete = () => {
                  res();
                };
              } catch (err) {
                console.error(`清空 ${storeName} 异常:`, err);
                rej(err);
              }
            });
          });

          Promise.allSettled(clearPromises)
            .then(() => {
              db.close();
              resolve();
            })
            .catch((err) => {
              db.close();
              reject(err);
            });
        };

        request.onerror = () => {
          reject(new Error('无法打开数据库'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleExport = async () => {
    try {
      const dbData = await fetchAllIndexedDBData();
      const jsonString = JSON.stringify(dbData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `indexeddb-backup-${dateStr}.json`;
      
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          onRefresh?.();
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            downloadBlob(blob, fileName);
          }
        }
      } else {
        downloadBlob(blob, fileName);
        onRefresh?.();
      }
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await importToIndexedDB(data);
      
      const report = await StorageMonitor.getHealthReport();
      setStorageReport(report);
      onRefresh?.();
    } catch (err) {
      console.error('导入失败:', err);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importToIndexedDB = async (data: Record<string, any>): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('starpact-db');

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const storeNames = Object.keys(data);

          const importStore = async (index: number) => {
            if (index >= storeNames.length) {
              resolve();
              return;
            }

            const storeName = storeNames[index];
            const storeData = data[storeName];

            if (!Array.isArray(storeData) || !db.objectStoreNames.contains(storeName)) {
              importStore(index + 1);
              return;
            }

            try {
              const transaction = db.transaction(storeName, 'readwrite');
              const store = transaction.objectStore(storeName);
              const keyPath = store.keyPath;

              let completed = 0;
              const total = storeData.length;

              if (total === 0) {
                importStore(index + 1);
                return;
              }

              for (const item of storeData) {
                if (item && item.value) {
                  let putRequest: IDBRequest;
                  
                  if (keyPath && item.value[keyPath] !== undefined) {
                    putRequest = store.put(item.value);
                  } else if (item.id !== undefined) {
                    putRequest = store.put(item.value, item.id);
                  } else {
                    putRequest = store.put(item.value);
                  }
                  
                  putRequest.onsuccess = () => {
                    completed++;
                    if (completed === total) {
                      importStore(index + 1);
                    }
                  };
                  putRequest.onerror = (e) => {
                    console.error(`导入 ${storeName} 记录失败:`, e);
                    completed++;
                    if (completed === total) {
                      importStore(index + 1);
                    }
                  };
                } else {
                  completed++;
                  if (completed === total) {
                    importStore(index + 1);
                  }
                }
              }
            } catch (err) {
              console.error(`导入存储 ${storeName} 失败:`, err);
              importStore(index + 1);
            }
          };

          importStore(0);
        };

        request.onerror = () => {
          reject(new Error('无法打开数据库'));
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchAllIndexedDBData = async (): Promise<Record<string, any>> => {
    return new Promise((resolve) => {
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
      
      <div className="mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          <Database size={14} className="mr-1 inline" /> IndexedDB存储状态
        </h3>
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

          <div className="space-y-2 mb-4">
            {storageReport.stores.map((store) => (
              <div
                key={store.storeName}
                onClick={(e) => handleStoreClick(store.storeName, e)}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
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
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          正在加载存储状态...
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={handleImportClick}
          disabled={isImporting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', opacity: isImporting ? 0.6 : 1 }}
        >
          <Upload size={12} />
          {isImporting ? '导入中...' : '导入'}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          <Download size={12} />
          导出
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          <RefreshCw size={12} />
          刷新
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          <Trash2 size={12} />
          清空
        </button>
      </div>

      {showStoreMenu && selectedStore && (
        <div
          ref={menuRef}
          className="fixed z-[200] rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {STORE_LABELS[selectedStore] || selectedStore}
            </span>
          </div>
          <button
            onClick={handleExportStore}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            <Download size={12} />
            导出此表
          </button>
          <button
            onClick={handleClearStore}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:opacity-80"
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={12} />
            清空此表
          </button>
        </div>
      )}

      {confirmDialog?.open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {confirmDialog.title}
            </h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {confirmDialog.message}
            </p>
            {confirmDialog.warning && (
              <p className="mt-2 text-xs px-3 py-2 rounded-lg" style={{ color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                {confirmDialog.warning}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:opacity-80 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm"
                style={{ backgroundColor: 'var(--error-color)' }}
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
