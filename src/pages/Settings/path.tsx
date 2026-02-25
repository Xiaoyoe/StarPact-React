import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { PromptTemplateStorage } from '@/services/storage/PromptTemplateStorage';
import { VideoPlaylistStorage } from '@/services/storage/VideoPlaylistStorage';
import { VideoPlaylistStorageSync } from '@/services/storage/VideoPlaylistStorage';
import { StorageMonitor } from '@/services/storage/StorageMonitor';
import type { StorageHealthReport } from '@/services/storage/StorageMonitor';
import { Download, Upload, RefreshCw, Database } from 'lucide-react';

export function PathPage() {
  const toast = useToast();
  const [storageReport, setStorageReport] = useState<StorageHealthReport | null>(null);

  // 加载存储状态
  useEffect(() => {
    const loadStorageReport = async () => {
      const report = await StorageMonitor.getHealthReport();
      setStorageReport(report);
    };
    loadStorageReport();
  }, []);



  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        路径设置
      </h2>

      {/* Data Management */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          数据管理
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Download size={14} /> 导出配置
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <Upload size={14} /> 导入配置
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw size={14} /> 恢复默认
          </button>
        </div>
        
        <h4 className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          提示词模板管理
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                const success = await PromptTemplateStorage.exportTemplates();
                if (success) {
                  toast.success('提示词模板导出成功');
                } else {
                  toast.error('提示词模板导出失败');
                }
              } catch (error) {
                console.error('导出模板失败:', error);
                toast.error('导出模板失败: ' + (error as Error).message);
              }
            }}
          >
            <Download size={14} /> 导出模板
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={() => {
              // 创建文件输入元素
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              
              // 监听文件选择
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                  const file = target.files[0];
                  try {
                    const importedCount = await PromptTemplateStorage.importTemplatesFromFile(file);
                    if (importedCount > 0) {
                      toast.success(`成功导入 ${importedCount} 个提示词模板`);
                    } else {
                      toast.error('导入提示词模板失败');
                    }
                  } catch (error) {
                    console.error('导入模板失败:', error);
                    toast.error('导入模板失败: ' + (error as Error).message);
                  }
                }
              };
              
              // 触发文件选择
              input.click();
            }}
          >
            <Upload size={14} /> 导入模板
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron) {
                  toast.info('此功能已移至新位置');
                } else {
                  toast.info('浏览器环境下无法导出到本地文件夹');
                }
              } catch (error) {
                console.error('导出到本地文件夹失败:', error);
                toast.error('导出到本地文件夹失败: ' + (error as Error).message);
              }
            }}
          >
            <Download size={14} /> 导出到本地文件夹
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron) {
                  // 使用 Electron 的 dialog 模块选择文件
                  const { dialog } = require('electron').remote || require('electron');
                  
                  const result = await dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{
                      name: 'JSON Files',
                      extensions: ['json']
                    }]
                  });
                  
                  if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const importedCount = await PromptTemplateStorageSync.importFromLocalFile(filePath);
                    if (importedCount > 0) {
                      toast.success(`成功从本地文件导入 ${importedCount} 个提示词模板`);
                    } else {
                      toast.error('从本地文件导入提示词模板失败');
                    }
                  }
                } else {
                  toast.info('浏览器环境下无法从本地文件导入');
                }
              } catch (error) {
                console.error('从本地文件导入失败:', error);
                toast.error('从本地文件导入失败: ' + (error as Error).message);
              }
            }}
          >
            <Upload size={14} /> 从本地文件导入
          </button>
        </div>
        
        <h4 className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          视频播放列表管理
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                const playlists = await VideoPlaylistStorage.getAllPlaylists('');
                if (playlists.length === 0) {
                  toast.info('没有视频播放列表可导出');
                  return;
                }
                
                const jsonString = JSON.stringify(playlists, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                
                // 触发文件下载
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `video-playlists-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toast.success('视频播放列表导出成功');
              } catch (error) {
                console.error('导出播放列表失败:', error);
                toast.error('导出播放列表失败: ' + (error as Error).message);
              }
            }}
          >
            <Download size={14} /> 导出播放列表
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={() => {
              // 创建文件输入元素
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              
              // 监听文件选择
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                  const file = target.files[0];
                  try {
                    const text = await file.text();
                    const playlists = JSON.parse(text);
                    
                    let importedCount = 0;
                    for (const playlist of playlists) {
                      // 生成新的ID，避免冲突
                      const newPlaylist = {
                        ...playlist,
                        id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        updatedAt: Date.now()
                      };
                      
                      const success = await VideoPlaylistStorage.savePlaylist('', newPlaylist);
                      if (success) {
                        importedCount++;
                      }
                    }
                    
                    if (importedCount > 0) {
                      toast.success(`成功导入 ${importedCount} 个视频播放列表`);
                    } else {
                      toast.error('导入视频播放列表失败');
                    }
                  } catch (error) {
                    console.error('导入播放列表失败:', error);
                    toast.error('导入播放列表失败: ' + (error as Error).message);
                  }
                }
              };
              
              // 触发文件选择
              input.click();
            }}
          >
            <Upload size={14} /> 导入播放列表
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron) {
                  toast.info('此功能已移至新位置');
                } else {
                  toast.info('浏览器环境下无法导出到本地文件夹');
                }
              } catch (error) {
                console.error('导出到本地文件夹失败:', error);
                toast.error('导出到本地文件夹失败: ' + (error as Error).message);
              }
            }}
          >
            <Download size={14} /> 导出到本地文件夹
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron) {
                  // 使用 Electron 的 dialog 模块选择文件
                  const { dialog } = require('electron').remote || require('electron');
                  
                  const result = await dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{
                      name: 'JSON Files',
                      extensions: ['json']
                    }]
                  });
                  
                  if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const importedCount = await VideoPlaylistStorageSync.importFromLocalFile(filePath);
                    if (importedCount > 0) {
                      toast.success(`成功从本地文件导入 ${importedCount} 个视频播放列表`);
                    } else {
                      toast.error('从本地文件导入视频播放列表失败');
                    }
                  }
                } else {
                  toast.info('浏览器环境下无法从本地文件导入');
                }
              } catch (error) {
                console.error('从本地文件导入失败:', error);
                toast.error('从本地文件导入失败: ' + (error as Error).message);
              }
            }}
          >
            <Upload size={14} /> 从本地文件导入
          </button>
        </div>
      </div>

      {/* Storage Status */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <Database size={14} className="mr-1 inline" /> IndexedDB存储状态
          </h3>
          <button
            onClick={async () => {
              const report = await StorageMonitor.getHealthReport();
              setStorageReport(report);
              toast.success('存储状态已刷新');
            }}
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
                style={{
                  backgroundColor: storageReport.overall === 'healthy' ? '#22C55E' :
                    storageReport.overall === 'warning' ? '#F59E0B' : '#EF4444'
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                整体状态: {storageReport.overall === 'healthy' ? '正常' :
                  storageReport.overall === 'warning' ? '警告' : '异常'}
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
                      style={{
                        backgroundColor: store.health === 'healthy' ? '#22C55E' :
                          store.health === 'warning' ? '#F59E0B' : '#EF4444'
                      }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {store.storeName}{' - '}{store.storeName === 'gallery' ? '图片相册' :
                        store.storeName === 'video-playlists' ? '视频播放列表' :
                        store.storeName === 'prompt-templates' ? '提示词模板' :
                        store.storeName === 'config' ? '配置' :
                        store.storeName === 'web-shortcuts' ? '网页快捷方式' :
                        store.storeName === 'chat-model' ? '聊天模型' :
                        store.storeName === 'logs' ? '日志' :
                        store.storeName === 'ollama-model' ? 'Ollama 模型' :
                        store.storeName === 'text-contrast' ? '文本对比' :
                        store.storeName === 'images' ? '图片' :
                        store.storeName === 'videos' ? '视频' : ''}
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

    </motion.div>
  );
}
