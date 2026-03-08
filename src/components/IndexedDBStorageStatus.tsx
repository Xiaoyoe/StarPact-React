import { useState, useEffect, useRef } from 'react';
import { Database, RefreshCw, Trash2, FolderOutput, FolderInput, Download, Upload } from 'lucide-react';
import { StorageMonitor } from '@/services/storage/StorageMonitor';
import type { StorageHealthReport } from '@/services/storage/StorageMonitor';
import { useStore } from '@/store';
import { useToast } from '@/components/Toast';

export const DATA_IMPORTED_EVENT = 'starpact:data-imported';

interface IndexedDBStorageStatusProps {
  onRefresh?: () => void;
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

export function IndexedDBStorageStatus({ onRefresh }: IndexedDBStorageStatusProps) {
  const [storageReport, setStorageReport] = useState<StorageHealthReport | null>(null);
  const [isExportingToFolder, setIsExportingToFolder] = useState(false);
  const [isExportingToCustomFolder, setIsExportingToCustomFolder] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
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
  const menuRef = useRef<HTMLDivElement>(null);
  const clearLogs = useStore((state) => state.clearLogs);
  const hydrateFromStorage = useStore((state) => state.hydrateFromStorage);
  const toast = useToast();

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

  const handleExportToFolder = async () => {
    if (!window.electronAPI?.storage?.backupData) {
      toast.error('此功能仅在桌面端可用');
      return;
    }

    setIsExportingToFolder(true);
    try {
      const dbData = await fetchAllIndexedDBData();
      const jsonString = JSON.stringify(dbData, null, 2);
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `starpact-backup-${dateStr}.json`;

      const result = await window.electronAPI.storage.backupData(jsonString, fileName);
      
      if (result.success) {
        toast.success(`备份已保存到: ${result.path}`);
      } else {
        toast.error('备份失败: ' + result.error);
      }
    } catch (err) {
      console.error('备份失败:', err);
      toast.error('备份失败');
    } finally {
      setIsExportingToFolder(false);
    }
  };

  const handleExportToCustomFolder = async () => {
    if (!window.electronAPI?.file?.selectFolder) {
      toast.error('此功能仅在桌面端可用');
      return;
    }

    setIsExportingToCustomFolder(true);
    try {
      const result = await window.electronAPI.file.selectFolder({
        title: '选择备份保存位置'
      });

      if (!result.success || !result.path) {
        setIsExportingToCustomFolder(false);
        return;
      }

      const dbData = await fetchAllIndexedDBData();
      const jsonString = JSON.stringify(dbData, null, 2);
      
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `starpact-backup-${dateStr}.json`;

      const backupResult = await window.electronAPI.storage.backupDataToPath(jsonString, fileName, result.path);
      
      if (backupResult.success) {
        toast.success(`备份已保存到: ${backupResult.path}`);
      } else {
        toast.error('备份失败: ' + backupResult.error);
      }
    } catch (err) {
      console.error('备份失败:', err);
      toast.error('备份失败');
    } finally {
      setIsExportingToCustomFolder(false);
    }
  };

  const handleImportBackup = async () => {
    if (!window.electronAPI?.file?.selectFile) {
      toast.error('此功能仅在桌面端可用');
      return;
    }

    setIsImportingBackup(true);
    try {
      const result = await window.electronAPI.file.selectFile({
        title: '选择备份文件',
        filters: [{ name: 'JSON 备份文件', extensions: ['json'] }]
      });

      if (!result.success || !result.filePath) {
        setIsImportingBackup(false);
        return;
      }

      const fileResult = await window.electronAPI.file.readFile(result.filePath, 'utf8');
      if (!fileResult.success || !fileResult.content) {
        toast.error('读取备份文件失败');
        setIsImportingBackup(false);
        return;
      }

      const data = JSON.parse(fileResult.content);
      await importToIndexedDB(data);
      
      await hydrateFromStorage();
      window.dispatchEvent(new CustomEvent(DATA_IMPORTED_EVENT));
      
      const report = await StorageMonitor.getHealthReport();
      setStorageReport(report);
      onRefresh?.();
      toast.success('备份数据导入成功');
    } catch (err) {
      console.error('导入备份失败:', err);
      toast.error('导入备份失败');
    } finally {
      setIsImportingBackup(false);
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
      
      await hydrateFromStorage();
      window.dispatchEvent(new CustomEvent(DATA_IMPORTED_EVENT));
      
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
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
                  let valueToStore = item.value;
                  
                  if (valueToStore.__isBlobBase64 && typeof valueToStore.blob === 'string') {
                    const blob = base64ToBlob(valueToStore.blob);
                    const { __isBlobBase64, ...rest } = valueToStore;
                    valueToStore = { ...rest, blob };
                  }
                  
                  if (keyPath && valueToStore[keyPath] !== undefined) {
                    putRequest = store.put(valueToStore);
                  } else if (item.id !== undefined) {
                    putRequest = store.put(valueToStore, item.id);
                  } else {
                    putRequest = store.put(valueToStore);
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

        request.onsuccess = async (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const data: Record<string, any> = {};
          const objectStores: string[] = [];

          for (let i = 0; i < db.objectStoreNames.length; i++) {
            objectStores.push(db.objectStoreNames[i]);
          }

          const fetchObjectStoreData = (storeNames: string[], index: number) => {
            if (index >= storeNames.length) {
              db.close();
              resolve(data);
              return;
            }

            const storeName = storeNames[index];
            
            try {
              const transaction = db.transaction(storeName, 'readonly');
              const store = transaction.objectStore(storeName);
              const rawStoreData: any[] = [];

              const cursorRequest = store.openCursor();
              cursorRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                  rawStoreData.push({
                    id: cursor.key,
                    value: cursor.value
                  });
                  cursor.continue();
                }
              };

              transaction.oncomplete = async () => {
                const storeData: any[] = [];
                for (const item of rawStoreData) {
                  if (item.value && item.value.blob instanceof Blob) {
                    const base64 = await blobToBase64(item.value.blob);
                    storeData.push({
                      id: item.id,
                      value: {
                        ...item.value,
                        blob: base64,
                        __isBlobBase64: true
                      }
                    });
                  } else {
                    storeData.push(item);
                  }
                }
                data[storeName] = storeData;
                fetchObjectStoreData(storeNames, index + 1);
              };

              transaction.onerror = () => {
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
        {window.electronAPI?.storage?.backupData && (
          <button
            onClick={handleExportToFolder}
            disabled={isExportingToFolder}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ backgroundColor: 'var(--primary-color)', color: 'white', opacity: isExportingToFolder ? 0.6 : 1 }}
          >
            <FolderOutput size={12} />
            {isExportingToFolder ? '备份中...' : '快速备份'}
          </button>
        )}
        {window.electronAPI?.file?.selectFolder && (
          <button
            onClick={handleExportToCustomFolder}
            disabled={isExportingToCustomFolder}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', opacity: isExportingToCustomFolder ? 0.6 : 1 }}
          >
            <FolderInput size={12} />
            {isExportingToCustomFolder ? '备份中...' : '另存为'}
          </button>
        )}
        {window.electronAPI?.file?.selectFile && (
          <button
            onClick={handleImportBackup}
            disabled={isImportingBackup}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', opacity: isImportingBackup ? 0.6 : 1 }}
          >
            <Upload size={12} />
            {isImportingBackup ? '导入中...' : '导入备份'}
          </button>
        )}
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
