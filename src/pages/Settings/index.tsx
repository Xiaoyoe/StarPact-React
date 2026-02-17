import { useState, useEffect, useRef } from 'react';
import {
  Palette, Type, Monitor, Info, RefreshCw, Download, Upload, Shield
} from 'lucide-react';
import { useStore } from '@/store';
import type { ThemeType } from '@/store';
import { motion } from 'framer-motion';
import { StorageManager } from '@/services/storage/StorageManager';
import { configStorage } from '@/services/storage/ConfigStorage';
import { PromptTemplateStorage } from '@/services/storage/PromptTemplateStorage';
import { VideoPlaylistStorage } from '@/services/storage/VideoPlaylistStorage';
import { VideoPlaylistStorageSync } from '@/services/storage/VideoPlaylistStorage';
import { useToast } from '@/components/Toast';
import { AboutSection } from './about';
import { PathPage } from './path';

export function SettingsPage() {
  const {
    theme, setTheme,
    sendOnEnter, setSendOnEnter,
    storagePath, setStoragePath,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'general' | 'path' | 'about'>('appearance');
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

  // 从配置存储加载设置
  useEffect(() => {
    const savedTheme = configStorage.get('theme');
    const savedSendOnEnter = configStorage.get('sendOnEnter');
    const savedStoragePath = configStorage.get('storagePath');

    if (savedTheme) setTheme(savedTheme);
    if (savedSendOnEnter !== undefined) setSendOnEnter(savedSendOnEnter);
    if (savedStoragePath) setStoragePath(savedStoragePath);
  }, []);

  // 保存设置到配置存储
  useEffect(() => {
    configStorage.set('theme', theme);
  }, [theme]);





  useEffect(() => {
    configStorage.set('sendOnEnter', sendOnEnter);
  }, [sendOnEnter]);

  useEffect(() => {
    configStorage.set('storagePath', storagePath);
  }, [storagePath]);

  const themeCategories = {
    light: {
      name: 'Light 主题',
      desc: '明亮清爽风格',
      themes: [
        { id: 'light', name: '浅色主题', desc: '经典明亮风格', colors: ['#FFFFFF', '#165DFF', '#F2F3F5'] },
        { id: 'tech-blue', name: '科技蓝', desc: '专业科技风格', colors: ['#FFFFFF', '#0A49C1', '#F8FBFF'] },
        { id: 'eye-care', name: '护眼绿', desc: '自然舒适风格', colors: ['#FCFFFE', '#2A9D8F', '#F2FAF8'] },
      ]
    },
    night: {
      name: 'Night 主题',
      desc: '深色护眼风格',
      themes: [
        { id: 'dark', name: '深色主题', desc: '护眼暗色风格', colors: ['#17171A', '#3C7EFF', '#232324'] },
        { id: 'midnight-blue', name: '午夜蓝', desc: '深邃科技风格', colors: ['#121212', '#589EFF', '#1E1E20'] },
        { id: 'forest-green', name: '森林绿', desc: '自然清新风格', colors: ['#0F172A', '#22C55E', '#064E3B'] },
        { id: 'coral-orange', name: '珊瑚橙', desc: '温暖活力风格', colors: ['#0F172A', '#F97316', '#7C2D12'] },
        { id: 'lavender-purple', name: '薰衣草紫', desc: '优雅浪漫风格', colors: ['#0F172A', '#8B5CF6', '#312E81'] },
        { id: 'mint-cyan', name: '薄荷青', desc: '凉爽清新风格', colors: ['#0F172A', '#06B6D4', '#0E7490'] },
        { id: 'caramel-brown', name: '焦糖棕', desc: '温暖复古风格', colors: ['#0F172A', '#D97706', '#78350F'] },
        { id: 'sakura-pink', name: '樱花粉', desc: '柔和甜美风格', colors: ['#0F172A', '#EC4899', '#7E1D40'] },
        { id: 'deep-sea-blue', name: '深海蓝', desc: '深邃专业风格', colors: ['#0F172A', '#1E40AF', '#1E3A8A'] },
        { id: 'amber-gold', name: '琥珀金', desc: '奢华温暖风格', colors: ['#0F172A', '#F59E0B', '#78350F'] },
      ]
    }
  };

  const tabs = [
    { id: 'appearance' as const, label: '外观', icon: Palette },
    { id: 'general' as const, label: '通用', icon: Monitor },
    { id: 'path' as const, label: '路径', icon: RefreshCw },
    { id: 'about' as const, label: '关于', icon: Info },
  ];

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
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          {activeTab === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Theme Selection */}
              <section>
                <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <Palette size={16} className="mr-2 inline" />
                  主题
                </h2>
                <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  选择界面主题风格，支持十三种预设主题
                </p>
                {Object.values(themeCategories).map((category, categoryIndex) => (
                  <div key={categoryIndex} className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1 w-8 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{category.name}</h3>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{category.desc}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {category.themes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className="rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                          style={{
                            border: `2px solid ${theme === t.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          <div className="mb-3 flex gap-1.5">
                            {t.colors.map((c, i) => (
                              <div
                                key={i}
                                className="h-6 w-6 rounded-md border border-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {t.name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {t.desc}
                          </div>
                          {theme === t.id && (
                            <div className="mt-2 text-xs font-medium" style={{ color: 'var(--primary-color)' }}>
                              ✓ 当前使用
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>




            </motion.div>
          )}

          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                通用设置
              </h2>

              {/* Send on Enter */}
              <div
                className="flex items-center justify-between rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enter 发送</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>按 Enter 键直接发送消息</div>
                </div>
                <button
                  onClick={() => setSendOnEnter(!sendOnEnter)}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{ backgroundColor: sendOnEnter ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
                >
                  <motion.div
                    animate={{ x: sendOnEnter ? 22 : 2 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                  />
                </button>
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

              {/* Security */}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <Shield size={14} className="mr-1 inline" /> 安全
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  所有 API Key 均使用 AES-256 加密存储在本地设备，不会上传至任何远程服务器。
                  对话记录仅保存在本地 SQLite 数据库中。
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <AboutSection />
          )}
          
          {activeTab === 'path' && (
            <PathPage />
          )}
        </div>
      </div>

      {/* Bottom Tabs */}
      <div className="border-t p-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <nav className="flex justify-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2.5 rounded-lg px-6 py-2 text-sm transition-colors whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}