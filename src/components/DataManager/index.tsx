import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Loader, X, Grid, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface DataManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 数据管理弹窗组件
 * 用于展示和管理应用的本地存储数据
 */
export function DataManager({ isOpen, onClose }: DataManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dbData, setDbData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<1 | 2 | 3>(1);
  const [showTableSort, setShowTableSort] = useState(false);
  const [directoryCollapsed, setDirectoryCollapsed] = useState(false);
  const [dataCollapsed, setDataCollapsed] = useState(false);
  const [emptyDataCollapsed, setEmptyDataCollapsed] = useState(false);
  const toast = useToast();

  // 切换布局列数
  const toggleColumns = () => {
    setColumns((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 3;
      return 1;
    });
  };

  // 获取indexDB数据的处理函数
  const handleGetDbData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 实现indexDB数据获取逻辑
      const dbData = await fetchIndexDBData();
      setDbData(dbData);
      toast.success('成功获取indexDB数据');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(errorMessage);
      toast.error('获取数据失败: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取目录结构的函数
  const getDirectoryStructure = (data: Record<string, any>): Record<string, any> => {
    const structure: Record<string, any> = {};
    
    Object.entries(data).forEach(([storeName, storeData]) => {
      if (Array.isArray(storeData)) {
        structure[storeName] = {
          type: 'store',
          count: storeData.length,
          sampleKeys: storeData.slice(0, 3).map((item: any) => item.id).filter(Boolean)
        };
      } else {
        structure[storeName] = {
          type: 'unknown',
          keys: Object.keys(storeData)
        };
      }
    });
    
    return structure;
  };

  // 获取表结构排序的函数
  const getTableStructureSort = (data: Record<string, any>): string[] => {
    // 获取所有存储对象名称并按字母顺序排序
    return Object.keys(data).sort();
  };

  // 获取indexDB数据的函数
  const fetchIndexDBData = async (): Promise<Record<string, any>> => {
    return new Promise((resolve, reject) => {
      try {
        // 应用实际使用的indexDB名称为 'starpact-db'
        const request = indexedDB.open('starpact-db');

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const data: Record<string, any> = {};
          const objectStores: string[] = [];

          // 获取所有对象存储名称
          console.log('数据库名称:', db.name);
          console.log('对象存储数量:', db.objectStoreNames.length);
          
          for (let i = 0; i < db.objectStoreNames.length; i++) {
            const storeName = db.objectStoreNames[i];
            objectStores.push(storeName);
            console.log('对象存储名称:', storeName);
          }

          // 递归获取每个对象存储的数据
          const fetchObjectStoreData = async (storeNames: string[], index: number) => {
            if (index >= storeNames.length) {
              console.log('所有数据获取完成:', data);
              resolve(data);
              return;
            }

            const storeName = storeNames[index];
            console.log('开始获取存储数据:', storeName);
            
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
                  console.log('获取到记录:', cursor.key);
                  cursor.continue();
                } else {
                  data[storeName] = storeData;
                  console.log('存储数据获取完成:', storeName, storeData.length, '条记录');
                  fetchObjectStoreData(storeNames, index + 1);
                }
              };

              cursorRequest.onerror = () => {
                console.error(`获取${storeName}数据失败`);
                // 出错时继续处理下一个存储，不中断整个过程
                fetchObjectStoreData(storeNames, index + 1);
              };
            } catch (err) {
              console.error(`处理${storeName}时出错:`, err);
              // 出错时继续处理下一个存储
              fetchObjectStoreData(storeNames, index + 1);
            }
          };

          fetchObjectStoreData(objectStores, 0);
        };

        request.onerror = () => {
          console.error('无法打开indexDB:', request.error);
          // 数据库不存在或无法打开时，返回空对象
          resolve({});
        };

        request.onupgradeneeded = (event) => {
          // 如果数据库版本升级或首次创建，这里会被触发
          const db = (event.target as IDBOpenDBRequest).result;
          console.log('数据库版本升级或首次创建');
          
          // 这里可以添加必要的存储对象创建逻辑
          // 例如：
          // if (!db.objectStoreNames.contains('config')) {
          //   db.createObjectStore('config', { keyPath: 'id' });
          // }
        };
      } catch (err) {
        console.error('获取indexDB数据时出错:', err);
        // 发生异常时，返回空对象
        resolve({});
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-h-[90vh] w-[800px] overflow-hidden rounded-2xl"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
                className="flex items-center justify-between border-b px-6"
                style={{ height: 56, borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--primary-light)' }}
                  >
                    <Database size={20} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      数据管理
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      查看和管理应用的本地存储数据
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTableSort(!showTableSort)}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{ 
                      color: showTableSort ? 'var(--primary-color)' : 'var(--text-tertiary)', 
                      backgroundColor: 'var(--bg-tertiary)'
                    }}
                    title={showTableSort ? '隐藏表结构排序' : '显示表结构排序'}
                  >
                    <Database size={16} />
                  </button>
                  <button
                    onClick={toggleColumns}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}
                    title={`切换到${columns === 3 ? 1 : columns + 1}列布局`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-56px)] overflow-y-auto">
              {/* 顶部按钮栏 */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={handleGetDbData}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? <Loader size={14} className="animate-spin" /> : <Database size={14} />}
                  {isLoading ? '获取中...' : '获取indexDB数据'}
                </button>
              </div>

              {/* 错误提示 */}
              {error && (
                <div
                  className="rounded-lg p-3 mb-6"
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#DC2626'
                  }}
                >
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* 数据展示区域 */}
              {dbData && (
                <div className="space-y-4">
                  {/* 目录结构区域 */}
                  {/* 目录结构区域 */}
                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>indexDB 目录结构</h3>
                      <button
                        onClick={() => setDirectoryCollapsed(!directoryCollapsed)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                        style={{ 
                          color: 'var(--text-tertiary)', 
                          backgroundColor: 'var(--bg-tertiary)'
                        }}
                        title={directoryCollapsed ? '展开' : '折叠'}
                      >
                        {directoryCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: directoryCollapsed ? 0 : 1, 
                        height: directoryCollapsed ? 0 : 'auto',
                        scaleY: directoryCollapsed ? 0 : 1
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div>
                        {showTableSort ? (
                          <div className="grid grid-cols-2 gap-4">
                            {/* 左侧：详细目录结构 */}
                            <div
                              className="rounded-lg p-3 text-sm overflow-auto"
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                maxHeight: '150px',
                                fontFamily: 'monospace',
                                userSelect: 'text'
                              }}
                            >
                              <pre style={{ userSelect: 'text' }}>{JSON.stringify(getDirectoryStructure(dbData), null, 2)}</pre>
                            </div>
                            
                            {/* 右侧：表结构排序 */}
                            <div
                              className="rounded-lg p-3 text-sm overflow-auto"
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                maxHeight: '150px',
                                fontFamily: 'monospace',
                                userSelect: 'text'
                              }}
                            >
                              <pre style={{ userSelect: 'text' }}>{JSON.stringify(getTableStructureSort(dbData), null, 2)}</pre>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="rounded-lg p-3 text-sm overflow-auto"
                            style={{
                              backgroundColor: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              maxHeight: '150px',
                              fontFamily: 'monospace',
                              userSelect: 'text'
                            }}
                          >
                            <pre style={{ userSelect: 'text' }}>{JSON.stringify(getDirectoryStructure(dbData), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* 有数据的存储对象区域 */}
                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>有数据的存储</h3>
                      <button
                        onClick={() => setDataCollapsed(!dataCollapsed)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                        style={{ 
                          color: 'var(--text-tertiary)', 
                          backgroundColor: 'var(--bg-tertiary)'
                        }}
                        title={dataCollapsed ? '展开' : '折叠'}
                      >
                        {dataCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: dataCollapsed ? 0 : 1, 
                        height: dataCollapsed ? 0 : 'auto',
                        scaleY: dataCollapsed ? 0 : 1
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div>
                        {Object.entries(dbData).filter(([_, storeData]) => Array.isArray(storeData) && storeData.length > 0).length === 0 ? (
                          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>没有有数据的存储</p>
                        ) : (
                          <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {Object.entries(dbData).filter(([_, storeData]) => Array.isArray(storeData) && storeData.length > 0).map(([storeName, storeData]) => (
                              <div key={storeName} className="space-y-2">
                                <h5 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  存储: {storeName}
                                </h5>
                                <div
                                  className="rounded-lg p-3 text-sm overflow-auto"
                                  style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    maxHeight: '200px',
                                    fontFamily: 'monospace',
                                    userSelect: 'text'
                                  }}
                                >
                                  <pre style={{ userSelect: 'text' }}>{JSON.stringify(storeData, null, 2)}</pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* 无数据的存储对象区域 */}
                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>无数据的存储</h3>
                      <button
                        onClick={() => setEmptyDataCollapsed(!emptyDataCollapsed)}
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                        style={{ 
                          color: 'var(--text-tertiary)', 
                          backgroundColor: 'var(--bg-tertiary)'
                        }}
                        title={emptyDataCollapsed ? '展开' : '折叠'}
                      >
                        {emptyDataCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ 
                        opacity: emptyDataCollapsed ? 0 : 1, 
                        height: emptyDataCollapsed ? 0 : 'auto',
                        scaleY: emptyDataCollapsed ? 0 : 1
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div>
                        {Object.entries(dbData).filter(([_, storeData]) => !Array.isArray(storeData) || storeData.length === 0).length === 0 ? (
                          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>没有无数据的存储</p>
                        ) : (
                          <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {Object.entries(dbData).filter(([_, storeData]) => !Array.isArray(storeData) || storeData.length === 0).map(([storeName, storeData]) => (
                              <div key={storeName} className="space-y-2">
                                <h5 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  存储: {storeName}
                                </h5>
                                <div
                                  className="rounded-lg p-3 text-sm overflow-auto"
                                  style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-tertiary)',
                                    maxHeight: '200px',
                                    fontFamily: 'monospace',
                                    userSelect: 'text'
                                  }}
                                >
                                  <pre style={{ userSelect: 'text' }}>此存储对象中没有数据</pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* 数据介绍 */}
                  <div
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                  >
                    <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>数据介绍</h3>
                    <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <p>• indexDB是浏览器提供的本地存储方案，用于存储大量结构化数据</p>
                      <p>• 应用使用indexDB存储用户配置、会话数据等信息</p>
                      <p>• 数据存储在用户本地设备上，不会上传至远程服务器</p>
                      <p>• 每个存储对象包含多条记录，每条记录由键值对组成</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 空状态提示 */}
              {!dbData && !error && (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
                >
                  <Database size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    点击上方按钮获取indexDB数据
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
