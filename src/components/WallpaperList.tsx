import { useState, useEffect, memo } from 'react';
import { LayoutGrid, Palette, Image as ImageIcon, Trash2, Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { BackgroundStorage, type CustomBackground } from '@/services/storage/BackgroundStorage';
import { configStorage } from '@/services/storage/ConfigStorage';
import { LocalImage } from '@/components/LocalImage';
import { useToast } from '@/components/Toast';

interface PresetWallpaper {
  id: string;
  name: string;
  file: string;
  path?: string;
}

interface WallpaperListProps {
  selectedBackgroundId: string | null;
  setSelectedBackgroundId: (id: string | null) => void;
  previewWallpaper: string;
  setPreviewWallpaper: (path: string) => void;
  previewWallpaperInfo: { name: string; size?: number; path?: string } | null;
  setPreviewWallpaperInfo: (info: { name: string; size?: number; path?: string } | null) => void;
  customBackgrounds: CustomBackground[];
  setCustomBackgrounds: (backgrounds: CustomBackground[]) => void;
  showDoubleClickToggle?: boolean;
  showClearButton?: boolean;
  showHeader?: boolean;
  compact?: boolean;
}

export const WallpaperList = memo(function WallpaperList({
  selectedBackgroundId,
  setSelectedBackgroundId,
  previewWallpaper,
  setPreviewWallpaper,
  previewWallpaperInfo,
  setPreviewWallpaperInfo,
  customBackgrounds,
  setCustomBackgrounds,
  showDoubleClickToggle = true,
  showClearButton = true,
  showHeader = true,
  compact = false,
}: WallpaperListProps) {
  const { chatWallpaper, setChatWallpaper } = useStore();
  const [doubleClickToChange, setDoubleClickToChange] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [resourcePath, setResourcePath] = useState<string>('');
  const toast = useToast();

  const presetWallpapers: PresetWallpaper[] = [
    { id: 'ling', name: '玲', file: 'ling.jpg' },
    { id: 'xue', name: '雪', file: 'xue.png' },
    { id: 'girl', name: '宅家少女', file: '宅家少女.png' }
  ];

  useEffect(() => {
    const loadResourcePath = async () => {
      if (window.electronAPI?.storage?.getResourcePath) {
        const path = await window.electronAPI.storage.getResourcePath();
        setResourcePath(path);
      }
    };
    loadResourcePath();
  }, []);

  const getPresetWallpaperPath = (wallpaper: PresetWallpaper): string => {
    if (resourcePath) {
      return `file://${resourcePath}/${wallpaper.file}`;
    }
    return `/src/images/background/${wallpaper.file}`;
  };

  useEffect(() => {
    const loadConfirmSetting = async () => {
      await configStorage.ready();
      const saved = configStorage.get('wallpaperDoubleClickChange');
      if (saved !== undefined) {
        setDoubleClickToChange(saved);
      }
      setConfigLoaded(true);
    };
    loadConfirmSetting();
  }, []);

  useEffect(() => {
    if (configLoaded) {
      configStorage.set('wallpaperDoubleClickChange', doubleClickToChange);
    }
  }, [doubleClickToChange, configLoaded]);

  useEffect(() => {
    if (customBackgrounds.length > 0) return;
    const loadCustomBackgrounds = async () => {
      try {
        const backgrounds = await BackgroundStorage.getInstance().getAllBackgrounds();
        if (backgrounds.length > 0) {
          setCustomBackgrounds(backgrounds);
        }
      } catch (error) {
        console.error('Failed to load custom backgrounds:', error);
      }
    };
    loadCustomBackgrounds();
  }, [customBackgrounds.length, setCustomBackgrounds]);

  const handleWallpaperSelect = async (bg: CustomBackground) => {
    setSelectedBackgroundId(bg.id);
    setPreviewWallpaperInfo({ name: bg.name, size: bg.size, path: bg.path });
    if (bg.path.startsWith('data:') || bg.path.startsWith('http') || bg.path.startsWith('/src/')) {
      if (!doubleClickToChange) {
        setChatWallpaper(bg.path);
      }
      setPreviewWallpaper(bg.path);
    } else if (window.electronAPI?.file?.readFile) {
      try {
        const result = await window.electronAPI.file.readFile(bg.path, 'base64');
        if (result.success && result.content) {
          const ext = bg.path.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' :
                          ext === 'gif' ? 'image/gif' :
                          ext === 'webp' ? 'image/webp' :
                          ext === 'bmp' ? 'image/bmp' : 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${result.content}`;
          if (!doubleClickToChange) {
            setChatWallpaper(dataUrl);
          }
          setPreviewWallpaper(dataUrl);
        }
      } catch (err) {
        console.error('Failed to load wallpaper:', err);
        toast.error('加载壁纸失败');
      }
    } else {
      toast.error('不支持此路径');
    }
  };

  const handleWallpaperDoubleClick = async (bg: CustomBackground) => {
    setSelectedBackgroundId(bg.id);
    setPreviewWallpaperInfo({ name: bg.name, size: bg.size, path: bg.path });
    if (bg.path.startsWith('data:') || bg.path.startsWith('http') || bg.path.startsWith('/src/')) {
      setChatWallpaper(bg.path);
      setPreviewWallpaper(bg.path);
      toast.success('壁纸已更改');
    } else if (window.electronAPI?.file?.readFile) {
      try {
        const result = await window.electronAPI.file.readFile(bg.path, 'base64');
        if (result.success && result.content) {
          const ext = bg.path.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = ext === 'png' ? 'image/png' :
                          ext === 'gif' ? 'image/gif' :
                          ext === 'webp' ? 'image/webp' :
                          ext === 'bmp' ? 'image/bmp' : 'image/jpeg';
          const dataUrl = `data:${mimeType};base64,${result.content}`;
          setChatWallpaper(dataUrl);
          setPreviewWallpaper(dataUrl);
          toast.success('壁纸已更改');
        }
      } catch (err) {
        console.error('Failed to load wallpaper:', err);
        toast.error('加载壁纸失败');
      }
    }
  };

  const handlePresetSelect = (wallpaper: PresetWallpaper) => {
    const wallpaperPath = getPresetWallpaperPath(wallpaper);
    setSelectedBackgroundId(null);
    setPreviewWallpaperInfo({ name: wallpaper.name, path: wallpaperPath });
    if (!doubleClickToChange) {
      setChatWallpaper(wallpaperPath);
    }
    setPreviewWallpaper(wallpaperPath);
  };

  const handlePresetDoubleClick = (wallpaper: PresetWallpaper) => {
    const wallpaperPath = getPresetWallpaperPath(wallpaper);
    setSelectedBackgroundId(null);
    setPreviewWallpaperInfo({ name: wallpaper.name, path: wallpaperPath });
    setChatWallpaper(wallpaperPath);
    setPreviewWallpaper(wallpaperPath);
    toast.success('壁纸已更改');
  };

  const handleAddWallpaper = async () => {
    if (window.electronAPI?.file?.selectFile) {
      const result = await window.electronAPI.file.selectFile({
        title: '选择壁纸图片',
        filters: [
          { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
        ],
        multi: true
      });
      if (result && result.filePaths && result.filePaths.length > 0) {
        for (const filePath of result.filePaths) {
          const fileName = filePath.split(/[/\\]/).pop() || filePath;
          const background: CustomBackground = {
            id: BackgroundStorage.getInstance().generateId(),
            name: fileName.replace(/\.[^/.]+$/, ''),
            path: filePath,
            addedAt: Date.now()
          };
          await BackgroundStorage.getInstance().saveBackground(background);
        }
        const backgrounds = await BackgroundStorage.getInstance().getAllBackgrounds();
        setCustomBackgrounds(backgrounds);
        toast.success(`已添加 ${result.filePaths.length} 张壁纸`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          for (const file of files) {
            const background: CustomBackground = {
              id: BackgroundStorage.getInstance().generateId(),
              name: file.name.replace(/\.[^/.]+$/, ''),
              path: file.name,
              size: file.size,
              addedAt: Date.now()
            };
            await BackgroundStorage.getInstance().saveBackground(background);
          }
          const backgrounds = await BackgroundStorage.getInstance().getAllBackgrounds();
          setCustomBackgrounds(backgrounds);
          toast.success(`已添加 ${files.length} 张壁纸（Web模式仅保存文件名）`);
        }
      };
      input.click();
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有壁纸吗？')) {
      await BackgroundStorage.getInstance().clearAllBackgrounds();
      setCustomBackgrounds([]);
      if (chatWallpaper && selectedBackgroundId) {
        setChatWallpaper('');
        setSelectedBackgroundId(null);
      }
      toast.success('已清空所有壁纸');
    }
  };

  const handleDeleteBackground = async (bg: CustomBackground) => {
    await BackgroundStorage.getInstance().deleteBackground(bg.id);
    const backgrounds = await BackgroundStorage.getInstance().getAllBackgrounds();
    setCustomBackgrounds(backgrounds);
    if (selectedBackgroundId === bg.id) {
      setChatWallpaper('');
      setSelectedBackgroundId(null);
    }
    toast.success('壁纸已删除');
  };

  const handleClearWallpaper = () => {
    setChatWallpaper('');
    setSelectedBackgroundId(null);
    setPreviewWallpaper('');
    setPreviewWallpaperInfo(null);
  };

  return (
    <div 
      className={compact ? "w-full" : "w-72 flex-shrink-0 rounded-xl overflow-hidden flex flex-col"}
      style={compact ? {} : { 
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)'
      }}
    >
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} style={{ color: 'var(--primary-color)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>壁纸列表</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddWallpaper}
              className="p-1.5 rounded-md transition-all hover:scale-105"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white'
              }}
              title="添加壁纸"
            >
              <Upload size={12} />
            </button>
            {customBackgrounds.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-md transition-all hover:scale-105"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--error-color)'
                }}
                title="清空所有壁纸"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {showDoubleClickToggle && (
        <div className="border-b flex-shrink-0 px-4 py-2 flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>双击切换</span>
          <button
            onClick={() => setDoubleClickToChange(!doubleClickToChange)}
            className="relative h-4 w-7 rounded-full transition-colors"
            style={{ backgroundColor: doubleClickToChange ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
          >
            <motion.div
              animate={{ x: doubleClickToChange ? 14 : 2 }}
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>
      )}

      {showClearButton && chatWallpaper && (
        <div className="border-b flex-shrink-0 px-4 py-2" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={handleClearWallpaper}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 w-full justify-center"
            style={{ 
              color: 'var(--error-color)', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <Trash2 size={12} /> 清除当前壁纸
          </button>
        </div>
      )}

      <div className="border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <Palette size={14} style={{ color: 'var(--primary-color)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>预设壁纸</span>
        </div>
        <div className={compact ? "grid grid-cols-2 gap-2 p-2" : "grid grid-cols-3 gap-2 p-2"}>
          {presetWallpapers.map((wallpaper) => {
            const wallpaperPath = getPresetWallpaperPath(wallpaper);
            return (
            <button
              key={wallpaper.id}
              onClick={() => handlePresetSelect(wallpaper)}
              onDoubleClick={() => handlePresetDoubleClick(wallpaper)}
              className="rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
              style={{
                border: `2px solid ${chatWallpaper === wallpaperPath ? 'var(--primary-color)' : 'var(--border-color)'}`,
              }}
            >
              <div className="aspect-square relative" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <img
                  src={wallpaperPath}
                  alt={wallpaper.name}
                  className="w-full h-full object-cover"
                />
                {chatWallpaper === wallpaperPath && (
                  <div className="absolute inset-0 flex items-center justify-center" 
                    style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <div className="text-white text-[10px] px-1.5 py-0.5 rounded-full" 
                      style={{ backgroundColor: 'var(--primary-color)' }}>
                      使用中
                    </div>
                  </div>
                )}
              </div>
            </button>
          )})}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <ImageIcon size={14} style={{ color: 'var(--primary-color)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>我的壁纸</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full ml-auto" style={{ 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--primary-color)' 
          }}>{customBackgrounds.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {customBackgrounds.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {customBackgrounds.map((bg, index) => {
                const isCurrentlyUsing = chatWallpaper && (
                  bg.path === chatWallpaper || 
                  (bg.path.startsWith('data:') === false && bg.path.startsWith('http') === false && bg.path.startsWith('/src/') === false && 
                   previewWallpaper === chatWallpaper && selectedBackgroundId === bg.id)
                );
                const isPreviewing = doubleClickToChange && selectedBackgroundId === bg.id && previewWallpaper !== chatWallpaper;
                
                return (
                <div
                  key={bg.id}
                  className="w-full px-3 py-2 text-left transition-all hover:brightness-95 flex items-center gap-2 cursor-pointer group"
                  style={{ 
                    backgroundColor: selectedBackgroundId === bg.id ? 'var(--primary-light)' : 'transparent',
                    borderLeft: `3px solid ${selectedBackgroundId === bg.id ? 'var(--primary-color)' : 'transparent'}`
                  }}
                  onClick={() => handleWallpaperSelect(bg)}
                  onDoubleClick={() => handleWallpaperDoubleClick(bg)}
                >
                  <span 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                    style={{ 
                      backgroundColor: selectedBackgroundId === bg.id ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                      color: selectedBackgroundId === bg.id ? 'white' : 'var(--text-tertiary)'
                    }}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ 
                      color: selectedBackgroundId === bg.id ? 'var(--primary-color)' : 'var(--text-primary)' 
                    }}>
                      {bg.name}
                    </p>
                  </div>
                  {isPreviewing && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                      color: 'var(--primary-color)'
                    }}>
                      预览中
                    </span>
                  )}
                  {isCurrentlyUsing && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ 
                      backgroundColor: 'var(--primary-color)', 
                      color: 'white' 
                    }}>
                      使用中
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBackground(bg);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    style={{ 
                      color: 'var(--error-color)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              );})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-4">
              <ImageIcon size={24} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>暂无自定义壁纸</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
