import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StorageManager } from '@/services/storage/StorageManager';
import { configStorage } from '@/services/storage/ConfigStorage';
import { useStore } from '@/store';
import { useToast } from '@/components/Toast';
import { PromptTemplateStorage } from '@/services/storage/PromptTemplateStorage';
import { VideoPlaylistStorage } from '@/services/storage/VideoPlaylistStorage';
import { VideoPlaylistStorageSync } from '@/services/storage/VideoPlaylistStorage';
import { Download, Upload, RefreshCw } from 'lucide-react';

export function PathPage() {
  const { storagePath, setStoragePath } = useStore();
  const [templateStoragePath, setTemplateStoragePath] = useState('');
  const [videoPlaylistStoragePath, setVideoPlaylistStoragePath] = useState('');
  const toast = useToast();

  // 从配置加载提示词模板存储路径
  useEffect(() => {
    const savedTemplatePath = configStorage.get('templateStoragePath');
    if (savedTemplatePath) {
      setTemplateStoragePath(savedTemplatePath);
    }
  }, []);

  // 保存提示词模板存储路径到配置
  useEffect(() => {
    configStorage.set('templateStoragePath', templateStoragePath);
  }, [templateStoragePath]);

  // 从配置加载视频播放列表存储路径
  useEffect(() => {
    const savedVideoPath = configStorage.get('videoPlaylistStoragePath');
    if (savedVideoPath) {
      setVideoPlaylistStoragePath(savedVideoPath);
    }
  }, []);

  // 保存视频播放列表存储路径到配置
  useEffect(() => {
    configStorage.set('videoPlaylistStoragePath', videoPlaylistStoragePath);
  }, [videoPlaylistStoragePath]);

  // 保存存储路径到配置
  useEffect(() => {
    configStorage.set('storagePath', storagePath);
  }, [storagePath]);

  // 创建存储目录的处理函数
  const handleCreateStorageDir = async () => {
    try {
      // 检查是否为 Electron 环境
      const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
      
      if (isElectron && storagePath) {
        // 使用 StorageManager 创建完整的目录结构
        const success = StorageManager.createDirectoryStructure(storagePath);
        
        if (success) {
          // 构建完整的存储路径，包含 starpact-local
          const fullStoragePath = StorageManager.getFullStoragePath(storagePath);
          toast.success('成功创建存储目录结构:\n' + fullStoragePath + '\n\n包含子目录:\n- video-playlists\n- gallery\n- config');
        } else {
          toast.error('创建存储目录结构失败，请检查权限和路径是否正确');
        }
      } else if (!isElectron) {
        // 浏览器环境：显示提示信息
        toast.info('浏览器环境下无法创建存储目录');
      } else {
        // 没有设置存储路径
        toast.info('请先设置存储路径');
      }
    } catch (error) {
      console.error('创建存储目录失败:', error);
      toast.error('创建存储目录失败: ' + (error as Error).message);
    }
  };

  // 打开存储路径的处理函数
  const handleOpenStoragePath = async () => {
    try {
      // 检查是否为 Electron 环境
      const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
      
      if (isElectron && storagePath) {
        // 计算完整路径
        let targetPath;
        try {
          // 直接使用storagePath，不添加starpact-local
          targetPath = storagePath;
          // 在Windows系统中，确保使用正确的反斜杠分隔符
          if (process.platform === 'win32') {
            const path = require('path');
            targetPath = path.normalize(targetPath);
          }
        } catch (e) {
          console.error('计算完整路径失败:', e);
          targetPath = storagePath;
        }
        
        // 根据操作系统使用不同的命令
        if (process.platform === 'win32') {
          const { spawn } = require('child_process');
          spawn('explorer', [targetPath], { detached: true, stdio: 'ignore' });
          toast.success('正在打开存储路径:\n' + targetPath);
        } else if (process.platform === 'darwin') {
          const { exec } = require('child_process');
          exec(`open "${targetPath}"`);
          toast.success('正在打开存储路径:\n' + targetPath);
        } else {
          const { exec } = require('child_process');
          exec(`xdg-open "${targetPath}"`);
          toast.success('正在打开存储路径:\n' + targetPath);
        }
      } else if (!isElectron) {
        // 浏览器环境：显示提示信息
        toast.info('浏览器环境下无法打开文件路径');
      } else {
        // 没有设置存储路径
        toast.info('请先设置存储路径');
      }
    } catch (error) {
      console.error('打开路径失败:', error);
      toast.error('打开路径失败: ' + (error as Error).message + '\n请检查控制台获取详细信息');
    }
  };

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
                
                if (isElectron && templateStoragePath) {
                  const success = await PromptTemplateStorageSync.exportToLocalFolder(templateStoragePath);
                  if (success) {
                    toast.success('提示词模板导出到本地文件夹成功');
                  } else {
                    toast.error('提示词模板导出到本地文件夹失败');
                  }
                } else if (!isElectron) {
                  toast.info('浏览器环境下无法导出到本地文件夹');
                } else {
                  toast.info('请先设置提示词模板存储路径');
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
                
                if (isElectron && videoPlaylistStoragePath) {
                  const success = await VideoPlaylistStorageSync.exportToLocalFolder(videoPlaylistStoragePath);
                  if (success) {
                    toast.success('视频播放列表导出到本地文件夹成功');
                  } else {
                    toast.error('视频播放列表导出到本地文件夹失败');
                  }
                } else if (!isElectron) {
                  toast.info('浏览器环境下无法导出到本地文件夹');
                } else {
                  toast.info('请先设置视频播放列表存储路径');
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

      {/* Storage Path */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          路径自定义存储
        </h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          自定义数据存储路径，用于保存对话记录、模型配置等数据
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={storagePath}
            onChange={(e) => {
              const newPath = e.target.value;
              setStoragePath(newPath);
            }}
            placeholder="请输入存储路径"
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否支持现代 File System Access API
                if ('showDirectoryPicker' in window) {
                  // 使用现代 File System Access API
                  const handle = await window.showDirectoryPicker();
                  
                  // 尝试获取完整路径
                  let folderPath = '';
                  
                  // 检查是否为 Electron 环境
                  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                  
                  if (isElectron) {
                    // Electron 环境：通过文件句柄获取路径
                    // 注意：这需要在 Electron 的 webPreferences 中设置 sandbox: false
                    // 或者使用自定义的 IPC 方法来获取路径
                    try {
                      // 尝试直接访问路径（如果可用）
                      if ('path' in handle) {
                        folderPath = (handle as any).path;
                      } else {
                        // 回退到传统方法
                        throw new Error('Handle does not have path property');
                      }
                    } catch {
                      // 如果无法直接获取路径，使用传统方法
                      const folderInput = document.createElement('input');
                      folderInput.type = 'file';
                      folderInput.webkitdirectory = true;
                      folderInput.multiple = false;
                      
                      folderInput.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                          const file = target.files[0];
                          if (file.path) {
                            folderPath = file.path;
                            const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                            if (lastSeparator > -1) {
                              folderPath = folderPath.substring(0, lastSeparator);
                            }
                            setStoragePath(folderPath);
                            toast.success('已选择存储路径:\n' + folderPath);
                          }
                        }
                      };
                      
                      folderInput.click();
                      return;
                    }
                  } else {
                    // 浏览器环境：使用传统方法
                    const folderInput = document.createElement('input');
                    folderInput.type = 'file';
                    folderInput.webkitdirectory = true;
                    folderInput.multiple = false;
                    
                    folderInput.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files.length > 0) {
                        const file = target.files[0];
                        let path = '';
                        
                        if (file.path) {
                          path = file.path;
                          const lastSeparator = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            path = path.substring(0, lastSeparator);
                          }
                        } else if (target.value) {
                          path = target.value;
                        }
                        
                        if (path) {
                          setStoragePath(path);
                          toast.success('已选择存储路径:\n' + path);
                        } else {
                          toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                        }
                      }
                    };
                    
                    folderInput.click();
                    return;
                  }
                  
                  if (folderPath) {
                    setStoragePath(folderPath);
                    toast.success('已选择存储路径:\n' + folderPath);
                  }
                } else {
                  // 传统方法：使用 input[type="file"] 元素
                  const folderInput = document.createElement('input');
                  folderInput.type = 'file';
                  folderInput.webkitdirectory = true;
                  folderInput.multiple = false;
                  
                  // 关键：设置为只选择文件夹
                  folderInput.setAttribute('webkitdirectory', 'true');
                  folderInput.setAttribute('directory', 'true');
                  
                  // 监听选择事件
                  folderInput.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                      // 获取第一个文件的路径
                      const file = target.files[0];
                      let folderPath = '';
                      
                      // 在不同环境中获取路径
                      if (file.path) {
                        // Electron 环境
                        folderPath = file.path;
                        // 确保我们获取的是文件夹路径，不是文件路径
                        if (folderPath.includes('\\') || folderPath.includes('/')) {
                          // 移除文件名，只保留文件夹路径
                          const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            folderPath = folderPath.substring(0, lastSeparator);
                          }
                        }
                      } else if (target.value) {
                        // 浏览器环境
                        folderPath = target.value;
                      }
                      
                      if (folderPath) {
                        setStoragePath(folderPath);
                        toast.success('已选择存储路径:\n' + folderPath);
                      } else {
                        toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                      }
                    }
                  };
                  
                  // 触发文件夹选择对话框
                  folderInput.click();
                }
              } catch (error) {
                console.error('选择文件夹失败:', error);
                // 忽略用户取消选择的情况
                if ((error as Error).name !== 'AbortError') {
                  toast.error('选择文件夹失败: ' + (error as Error).message);
                }
              }
            }}
          >
            选择路径
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && storagePath) {
                  // 检查starpact-local文件夹是否存在
                  const fullStoragePath = StorageManager.getFullStoragePath(storagePath);
                  let fs;
                  
                  try {
                    fs = require('fs');
                  } catch (e) {
                    console.error('无法加载 fs 模块:', e);
                    toast.error('无法访问文件系统，请检查权限');
                    return;
                  }
                  
                  if (fs && fs.existsSync) {
                    if (fs.existsSync(fullStoragePath)) {
                      // 检查子目录
                      const subDirectories = [
                        StorageManager.getVideoPlaylistsPath(storagePath),
                        StorageManager.getGalleryPath(storagePath),
                        StorageManager.getConfigPath(storagePath)
                      ];
                      
                      let allSubDirsExist = true;
                      subDirectories.forEach(subDir => {
                        if (!fs.existsSync(subDir)) {
                          allSubDirsExist = false;
                        }
                      });
                      
                      if (allSubDirsExist) {
                        toast.success('存储路径已存在，且包含所有必要的子目录:\n' + fullStoragePath);
                      } else {
                        toast.info('存储路径已存在，但可能缺少部分子目录:\n' + fullStoragePath);
                      }
                    } else {
                      toast.info('存储路径不存在:\n' + fullStoragePath);
                    }
                  } else {
                    toast.error('无法访问文件系统功能');
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法检测存储路径');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('检测路径失败:', error);
                toast.error('检测路径失败: ' + (error as Error).message);
              }
            }}
          >
            检测路径
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={handleCreateStorageDir}
          >
            创建存储目录
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={handleOpenStoragePath}
          >
            打开路径
          </button>
        </div>
      </div>

      {/* Prompt Template Storage */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          提示词模板存储
        </h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          自定义提示词模板存储路径，用于导出和导入模板
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={templateStoragePath}
            onChange={(e) => {
              const newPath = e.target.value;
              setTemplateStoragePath(newPath);
            }}
            placeholder="请输入存储路径"
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否支持现代 File System Access API
                if ('showDirectoryPicker' in window) {
                  // 使用现代 File System Access API
                  const handle = await window.showDirectoryPicker();
                  
                  // 尝试获取完整路径
                  let folderPath = '';
                  
                  // 检查是否为 Electron 环境
                  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                  
                  if (isElectron) {
                    // Electron 环境：通过文件句柄获取路径
                    try {
                      // 尝试直接访问路径（如果可用）
                      if ('path' in handle) {
                        folderPath = (handle as any).path;
                      } else {
                        // 回退到传统方法
                        throw new Error('Handle does not have path property');
                      }
                    } catch {
                      // 如果无法直接获取路径，使用传统方法
                      const folderInput = document.createElement('input');
                      folderInput.type = 'file';
                      folderInput.webkitdirectory = true;
                      folderInput.multiple = false;
                      
                      folderInput.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                          const file = target.files[0];
                          if (file.path) {
                            folderPath = file.path;
                            const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                            if (lastSeparator > -1) {
                              folderPath = folderPath.substring(0, lastSeparator);
                            }
                            setTemplateStoragePath(folderPath);
                            toast.success('已选择存储路径:\n' + folderPath);
                          }
                        }
                      };
                      
                      folderInput.click();
                      return;
                    }
                  } else {
                    // 浏览器环境：使用传统方法
                    const folderInput = document.createElement('input');
                    folderInput.type = 'file';
                    folderInput.webkitdirectory = true;
                    folderInput.multiple = false;
                    
                    folderInput.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files.length > 0) {
                        const file = target.files[0];
                        let path = '';
                        
                        if (file.path) {
                          path = file.path;
                          const lastSeparator = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            path = path.substring(0, lastSeparator);
                          }
                        } else if (target.value) {
                          path = target.value;
                        }
                        
                        if (path) {
                          setTemplateStoragePath(path);
                          toast.success('已选择存储路径:\n' + path);
                        } else {
                          toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                        }
                      }
                    };
                    
                    folderInput.click();
                    return;
                  }
                  
                  if (folderPath) {
                    setTemplateStoragePath(folderPath);
                    toast.success('已选择存储路径:\n' + folderPath);
                  }
                } else {
                  // 传统方法：使用 input[type="file"] 元素
                  const folderInput = document.createElement('input');
                  folderInput.type = 'file';
                  folderInput.webkitdirectory = true;
                  folderInput.multiple = false;
                  
                  // 关键：设置为只选择文件夹
                  folderInput.setAttribute('webkitdirectory', 'true');
                  folderInput.setAttribute('directory', 'true');
                  
                  // 监听选择事件
                  folderInput.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                      // 获取第一个文件的路径
                      const file = target.files[0];
                      let folderPath = '';
                      
                      // 在不同环境中获取路径
                      if (file.path) {
                        // Electron 环境
                        folderPath = file.path;
                        // 确保我们获取的是文件夹路径，不是文件路径
                        if (folderPath.includes('\\') || folderPath.includes('/')) {
                          // 移除文件名，只保留文件夹路径
                          const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            folderPath = folderPath.substring(0, lastSeparator);
                          }
                        }
                      } else if (target.value) {
                        // 浏览器环境
                        folderPath = target.value;
                      }
                      
                      if (folderPath) {
                        setTemplateStoragePath(folderPath);
                        toast.success('已选择存储路径:\n' + folderPath);
                      } else {
                        toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                      }
                    }
                  };
                  
                  // 触发文件夹选择对话框
                  folderInput.click();
                }
              } catch (error) {
                console.error('选择文件夹失败:', error);
                // 忽略用户取消选择的情况
                if ((error as Error).name !== 'AbortError') {
                  toast.error('选择文件夹失败: ' + (error as Error).message);
                }
              }
            }}
          >
            选择路径
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && templateStoragePath) {
                  // 检查starpact-local文件夹是否存在
                  const fullStoragePath = StorageManager.getPromptTemplatesPath(templateStoragePath);
                  let fs;
                  
                  try {
                    fs = require('fs');
                  } catch (e) {
                    console.error('无法加载 fs 模块:', e);
                    toast.error('无法访问文件系统，请检查权限');
                    return;
                  }
                  
                  if (fs && fs.existsSync) {
                    if (fs.existsSync(fullStoragePath)) {
                      toast.success('存储路径已存在:\n' + fullStoragePath);
                    } else {
                      toast.info('存储路径不存在:\n' + fullStoragePath);
                    }
                  } else {
                    toast.error('无法访问文件系统功能');
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法检测存储路径');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('检测路径失败:', error);
                toast.error('检测路径失败: ' + (error as Error).message);
              }
            }}
          >
            检测路径
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && templateStoragePath) {
                  // 使用 StorageManager 创建提示词模板存储目录
                  const fullStoragePath = StorageManager.getPromptTemplatesPath(templateStoragePath);
                  let fs;
                  
                  try {
                    fs = require('fs');
                    const path = require('path');
                  } catch (e) {
                    console.error('无法加载 fs 模块:', e);
                    toast.error('无法访问文件系统，请检查权限');
                    return;
                  }
                  
                  if (fs && fs.existsSync && fs.mkdirSync) {
                    // 递归创建目录
                    if (!fs.existsSync(fullStoragePath)) {
                      fs.mkdirSync(fullStoragePath, { recursive: true });
                      toast.success('成功创建提示词模板存储目录:\n' + fullStoragePath);
                    } else {
                      toast.info('提示词模板存储目录已存在:\n' + fullStoragePath);
                    }
                  } else {
                    toast.error('无法访问文件系统功能');
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法创建存储目录');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('创建存储目录失败:', error);
                toast.error('创建存储目录失败: ' + (error as Error).message);
              }
            }}
          >
            创建目录
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && templateStoragePath) {
                  // 计算完整路径
                  let targetPath = StorageManager.getPromptTemplatesPath(templateStoragePath);
                  
                  // 在Windows系统中，确保使用正确的反斜杠分隔符
                  if (process.platform === 'win32') {
                    const path = require('path');
                    targetPath = path.normalize(targetPath);
                  }
                  
                  // 根据操作系统使用不同的命令
                  if (process.platform === 'win32') {
                    const { spawn } = require('child_process');
                    spawn('explorer', [targetPath], { detached: true, stdio: 'ignore' });
                    toast.success('正在打开存储路径:\n' + targetPath);
                  } else if (process.platform === 'darwin') {
                    const { exec } = require('child_process');
                    exec(`open "${targetPath}"`);
                    toast.success('正在打开存储路径:\n' + targetPath);
                  } else {
                    const { exec } = require('child_process');
                    exec(`xdg-open "${targetPath}"`);
                    toast.success('正在打开存储路径:\n' + targetPath);
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法打开文件路径');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('打开路径失败:', error);
                toast.error('打开路径失败: ' + (error as Error).message + '\n请检查控制台获取详细信息');
              }
            }}
          >
            打开路径
          </button>
        </div>
      </div>

      {/* Video Playlist Storage */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          视频播放列表存储
        </h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          自定义视频播放列表存储路径，用于导出和导入播放列表
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={videoPlaylistStoragePath}
            onChange={(e) => {
              const newPath = e.target.value;
              setVideoPlaylistStoragePath(newPath);
            }}
            placeholder="请输入存储路径"
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          />
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否支持现代 File System Access API
                if ('showDirectoryPicker' in window) {
                  // 使用现代 File System Access API
                  const handle = await window.showDirectoryPicker();
                  
                  // 尝试获取完整路径
                  let folderPath = '';
                  
                  // 检查是否为 Electron 环境
                  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                  
                  if (isElectron) {
                    // Electron 环境：通过文件句柄获取路径
                    try {
                      // 尝试直接访问路径（如果可用）
                      if ('path' in handle) {
                        folderPath = (handle as any).path;
                      } else {
                        // 回退到传统方法
                        throw new Error('Handle does not have path property');
                      }
                    } catch {
                      // 如果无法直接获取路径，使用传统方法
                      const folderInput = document.createElement('input');
                      folderInput.type = 'file';
                      folderInput.webkitdirectory = true;
                      folderInput.multiple = false;
                      
                      folderInput.onchange = (e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.files && target.files.length > 0) {
                          const file = target.files[0];
                          if (file.path) {
                            folderPath = file.path;
                            const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                            if (lastSeparator > -1) {
                              folderPath = folderPath.substring(0, lastSeparator);
                            }
                            setVideoPlaylistStoragePath(folderPath);
                            toast.success('已选择存储路径:\n' + folderPath);
                          }
                        }
                      };
                      
                      folderInput.click();
                      return;
                    }
                  } else {
                    // 浏览器环境：使用传统方法
                    const folderInput = document.createElement('input');
                    folderInput.type = 'file';
                    folderInput.webkitdirectory = true;
                    folderInput.multiple = false;
                    
                    folderInput.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files.length > 0) {
                        const file = target.files[0];
                        let path = '';
                        
                        if (file.path) {
                          path = file.path;
                          const lastSeparator = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            path = path.substring(0, lastSeparator);
                          }
                        } else if (target.value) {
                          path = target.value;
                        }
                        
                        if (path) {
                          setVideoPlaylistStoragePath(path);
                          toast.success('已选择存储路径:\n' + path);
                        } else {
                          toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                        }
                      }
                    };
                    
                    folderInput.click();
                    return;
                  }
                  
                  if (folderPath) {
                    setVideoPlaylistStoragePath(folderPath);
                    toast.success('已选择存储路径:\n' + folderPath);
                  }
                } else {
                  // 传统方法：使用 input[type="file"] 元素
                  const folderInput = document.createElement('input');
                  folderInput.type = 'file';
                  folderInput.webkitdirectory = true;
                  folderInput.multiple = false;
                  
                  // 关键：设置为只选择文件夹
                  folderInput.setAttribute('webkitdirectory', 'true');
                  folderInput.setAttribute('directory', 'true');
                  
                  // 监听选择事件
                  folderInput.onchange = (e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.files && target.files.length > 0) {
                      // 获取第一个文件的路径
                      const file = target.files[0];
                      let folderPath = '';
                      
                      // 在不同环境中获取路径
                      if (file.path) {
                        // Electron 环境
                        folderPath = file.path;
                        // 确保我们获取的是文件夹路径，不是文件路径
                        if (folderPath.includes('\\') || folderPath.includes('/')) {
                          // 移除文件名，只保留文件夹路径
                          const lastSeparator = Math.max(folderPath.lastIndexOf('\\'), folderPath.lastIndexOf('/'));
                          if (lastSeparator > -1) {
                            folderPath = folderPath.substring(0, lastSeparator);
                          }
                        }
                      } else if (target.value) {
                        // 浏览器环境
                        folderPath = target.value;
                      }
                      
                      if (folderPath) {
                        setVideoPlaylistStoragePath(folderPath);
                        toast.success('已选择存储路径:\n' + folderPath);
                      } else {
                        toast.info('已选择文件夹，但无法获取完整路径\n请手动输入完整存储路径');
                      }
                    }
                  };
                  
                  // 触发文件夹选择对话框
                  folderInput.click();
                }
              } catch (error) {
                console.error('选择文件夹失败:', error);
                // 忽略用户取消选择的情况
                if ((error as Error).name !== 'AbortError') {
                  toast.error('选择文件夹失败: ' + (error as Error).message);
                }
              }
            }}
          >
            选择路径
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && videoPlaylistStoragePath) {
                  // 检查starpact-local文件夹是否存在
                  const fullStoragePath = StorageManager.getVideoPlaylistsPath(videoPlaylistStoragePath);
                  let fs;
                  
                  try {
                    fs = require('fs');
                  } catch (e) {
                    console.error('无法加载 fs 模块:', e);
                    toast.error('无法访问文件系统，请检查权限');
                    return;
                  }
                  
                  if (fs && fs.existsSync) {
                    if (fs.existsSync(fullStoragePath)) {
                      toast.success('存储路径已存在:\n' + fullStoragePath);
                    } else {
                      toast.info('存储路径不存在:\n' + fullStoragePath);
                    }
                  } else {
                    toast.error('无法访问文件系统功能');
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法检测存储路径');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('检测路径失败:', error);
                toast.error('检测路径失败: ' + (error as Error).message);
              }
            }}
          >
            检测路径
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && videoPlaylistStoragePath) {
                  // 使用 StorageManager 创建视频播放列表存储目录
                  const fullStoragePath = StorageManager.getVideoPlaylistsPath(videoPlaylistStoragePath);
                  let fs;
                  
                  try {
                    fs = require('fs');
                    const path = require('path');
                  } catch (e) {
                    console.error('无法加载 fs 模块:', e);
                    toast.error('无法访问文件系统，请检查权限');
                    return;
                  }
                  
                  if (fs && fs.existsSync && fs.mkdirSync) {
                    // 递归创建目录
                    if (!fs.existsSync(fullStoragePath)) {
                      fs.mkdirSync(fullStoragePath, { recursive: true });
                      toast.success('成功创建视频播放列表存储目录:\n' + fullStoragePath);
                    } else {
                      toast.info('视频播放列表存储目录已存在:\n' + fullStoragePath);
                    }
                  } else {
                    toast.error('无法访问文件系统功能');
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法创建存储目录');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('创建存储目录失败:', error);
                toast.error('创建存储目录失败: ' + (error as Error).message);
              }
            }}
          >
            创建目录
          </button>
          <button
            className="rounded-lg px-4 py-2 text-sm transition-colors whitespace-nowrap"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            onClick={async () => {
              try {
                // 检查是否为 Electron 环境
                const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;
                
                if (isElectron && videoPlaylistStoragePath) {
                  // 计算完整路径
                  let targetPath = StorageManager.getVideoPlaylistsPath(videoPlaylistStoragePath);
                  
                  // 在Windows系统中，确保使用正确的反斜杠分隔符
                  if (process.platform === 'win32') {
                    const path = require('path');
                    targetPath = path.normalize(targetPath);
                  }
                  
                  // 根据操作系统使用不同的命令
                  if (process.platform === 'win32') {
                    const { spawn } = require('child_process');
                    spawn('explorer', [targetPath], { detached: true, stdio: 'ignore' });
                    toast.success('正在打开存储路径:\n' + targetPath);
                  } else if (process.platform === 'darwin') {
                    const { exec } = require('child_process');
                    exec(`open "${targetPath}"`);
                    toast.success('正在打开存储路径:\n' + targetPath);
                  } else {
                    const { exec } = require('child_process');
                    exec(`xdg-open "${targetPath}"`);
                    toast.success('正在打开存储路径:\n' + targetPath);
                  }
                } else if (!isElectron) {
                  // 浏览器环境：显示提示信息
                  toast.info('浏览器环境下无法打开文件路径');
                } else {
                  // 没有设置存储路径
                  toast.info('请先设置存储路径');
                }
              } catch (error) {
                console.error('打开路径失败:', error);
                toast.error('打开路径失败: ' + (error as Error).message + '\n请检查控制台获取详细信息');
              }
            }}
          >
            打开路径
          </button>
        </div>
      </div>
    </motion.div>
  );
}
