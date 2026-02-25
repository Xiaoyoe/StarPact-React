import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { PromptTemplateStorage } from '@/services/storage/PromptTemplateStorage';
import { VideoPlaylistStorage } from '@/services/storage/VideoPlaylistStorage';
import { VideoPlaylistStorageSync } from '@/services/storage/VideoPlaylistStorage';
import { IndexedDBStorageStatus } from '@/components/IndexedDBStorageStatus';
import { Download, Upload, RefreshCw } from 'lucide-react';

export function PathPage() {
  const toast = useToast();



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

      <IndexedDBStorageStatus onRefresh={() => toast.success('存储状态已刷新')} />

    </motion.div>
  );
}
