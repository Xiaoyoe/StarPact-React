import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoFile, VideoFilters, VideoInfo, RepeatMode, DEFAULT_FILTERS } from '@/types/video';
import { cn } from '@/utils/cn';
import { useStore } from '@/store';
import { VideoPlaylistStorage, VideoPlaylist } from '@/services/storage/VideoPlaylistStorage';
import { formatFileSize, formatDuration, generateId } from '@/utils/formatters';
import { configStorage } from '@/services/storage/ConfigStorage';
import './styles/scroll-title.css';

const ACCEPTED_EXTENSIONS = /\.(mp4|webm|mkv|avi|mov|flv|wmv|m4v|ogg|ogv|3gp|ts|mpeg|mpg)$/i;

function VideoPlayerPage() {
  const { theme, storagePath } = useStore();
  const toast = useToast();
  const [playlist, setPlaylist] = useState<VideoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const playerRef = useRef<HTMLVideoElement>(null);
  const prevPlaylistLengthRef = useRef(playlist.length);

  // 监听播放列表变化，显示添加成功提示
  useEffect(() => {
    // 只有当播放列表长度增加时才显示提示
    if (playlist.length > prevPlaylistLengthRef.current) {
      toast.success('视频添加成功');
    }
    // 更新记录的长度
    prevPlaylistLengthRef.current = playlist.length;
  }, [playlist, toast]);

  const currentVideo = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  // 从配置加载自动播放设置
  useEffect(() => {
    const loadAutoPlayConfig = async () => {
      await configStorage.ready();
      const savedAutoPlay = configStorage.get('videoAutoPlay');
      if (savedAutoPlay !== undefined) {
        setAutoPlay(savedAutoPlay);
      }
    };
    loadAutoPlayConfig();
  }, []);

  // 从存储加载播放列表
  useEffect(() => {
    const loadPlaylists = async () => {
      if (storagePath) {
        try {
          const playlists = await VideoPlaylistStorage.getAllPlaylists(storagePath);
          if (playlists.length > 0) {
            const latestPlaylist = playlists[0];
            setPlaylist(latestPlaylist.videos);
            if (latestPlaylist.videos.length > 0) {
              setCurrentIndex(0);
            }
          }
        } catch (error) {
          console.error('加载播放列表失败:', error);
          toast.error('加载播放列表失败');
        }
      }
    };
    loadPlaylists();
  }, [storagePath]);

  // 保存播放列表到存储
  useEffect(() => {
    const savePlaylist = async () => {
      if (storagePath && playlist.length > 0) {
        try {
          const currentPlaylist: VideoPlaylist = {
            id: 'default-playlist',
            name: '默认播放列表',
            videos: playlist,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          await VideoPlaylistStorage.savePlaylist(storagePath, currentPlaylist);
        } catch (error) {
          console.error('保存播放列表失败:', error);
          toast.error('保存播放列表失败');
        }
      }
    };
    savePlaylist();
  }, [playlist, storagePath]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f =>
      f.type.startsWith('video/') || ACCEPTED_EXTENSIONS.test(f.name)
    );
    if (files.length === 0) return;

    const newVideos: VideoFile[] = await Promise.all(
      files.map(async (file) => {
        // 先创建包含File对象的VideoFile
        const tempVideo: VideoFile = {
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'video/*',
          url: '',
          duration: 0,
          addedAt: Date.now(),
        };
        
        // 处理视频文件，存储到IndexedDB并生成Blob URL
        const processedVideo = await VideoPlaylistStorage.processVideoFile(storagePath, tempVideo);
        
        // 提取视频时长
        if (processedVideo.url) {
          const video = document.createElement('video');
          video.src = processedVideo.url;
          
          processedVideo.duration = await new Promise<number>((resolve) => {
            video.onloadedmetadata = () => {
              resolve(video.duration);
            };
            video.onerror = () => {
              resolve(0);
            };
          });
        }

        return processedVideo;
      })
    );

    setPlaylist(prev => {
      const isFirstAdd = prev.length === 0;
      const updated = [...prev, ...newVideos];
      if (isFirstAdd) setCurrentIndex(0);
      return updated;
    });
  }, [storagePath]);

  const removeFile = useCallback(async (id: string) => {
    // 查找要删除的视频
    const videoToRemove = playlist.find(v => v.id === id);
    if (!videoToRemove) return;
    
    // 释放Blob URL
    URL.revokeObjectURL(videoToRemove.url);
    
    // 更新本地状态
    setPlaylist(prev => {
      const index = prev.findIndex(v => v.id === id);
      if (index === -1) return prev;
      const updated = prev.filter(v => v.id !== id);
      setCurrentIndex(ci => {
        if (updated.length === 0) return -1;
        if (index < ci) return ci - 1;
        if (index === ci) return Math.min(ci, updated.length - 1);
        return ci;
      });
      return updated;
    });
    
    // 同步更新到IndexedDB
    if (storagePath) {
      try {
        // 删除视频文件
        await VideoPlaylistStorage.deleteVideoFile(id);
        console.log('删除视频文件成功:', id);
        
        // 更新播放列表
        const updatedPlaylist = playlist.filter(v => v.id !== id);
        if (updatedPlaylist.length === 0) {
          await VideoPlaylistStorage.clearAllPlaylists(storagePath);
        } else {
          const currentPlaylist: VideoPlaylist = {
            id: 'default-playlist',
            name: '默认播放列表',
            videos: updatedPlaylist,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          await VideoPlaylistStorage.savePlaylist(storagePath, currentPlaylist);
        }
        console.log('更新播放列表成功');
        toast.success('视频删除成功');
      } catch (error) {
        console.error('更新IndexedDB数据失败:', error);
        toast.error('删除视频文件失败');
      }
    }
  }, [playlist, storagePath]);

  const clearPlaylist = useCallback(async () => {
    // 收集视频ID并释放Blob URL
    const videoIds = playlist.map(v => {
      URL.revokeObjectURL(v.url);
      return v.id;
    });
    
    // 清空本地状态
    setPlaylist([]);
    setCurrentIndex(-1);
    setVideoInfo(null);
    setFilters(DEFAULT_FILTERS);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // 清空IndexedDB中的数据
    if (storagePath) {
      try {
        // 批量删除视频文件
        if (videoIds.length > 0) {
          await VideoPlaylistStorage.deleteVideoFiles(videoIds);
          console.log('删除视频文件成功，数量:', videoIds.length);
        }
        
        // 清空播放列表
        await VideoPlaylistStorage.clearAllPlaylists(storagePath);
        console.log('清空播放列表成功');
        toast.success('播放列表已清空');
      } catch (error) {
        console.error('清空IndexedDB数据失败:', error);
        toast.error('清空播放列表失败');
      }
    }
  }, [playlist, storagePath]);



  // 拖拽相关的状态和函数
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // 开始拖拽
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽时的视觉效果
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'scale(1.02)';
    }
  };

  // 结束拖拽
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItemId(null);
    setHoveredItemId(null);
    // 恢复元素样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredItemId(id);
  };

  // 离开悬停
  const handleDragLeave = () => {
    setHoveredItemId(null);
  };

  // 放置
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setHoveredItemId(null);
    if (!draggedItemId || draggedItemId === targetId) return;

    let isOrderChanged = false;

    setPlaylist(prev => {
      const newPlaylist = [...prev];
      const draggedIndex = newPlaylist.findIndex(item => item.id === draggedItemId);
      const targetIndex = newPlaylist.findIndex(item => item.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 移除拖拽项
        const [draggedItem] = newPlaylist.splice(draggedIndex, 1);
        // 插入到目标位置
        newPlaylist.splice(targetIndex, 0, draggedItem);
        
        // 更新当前播放索引（如果拖拽的是当前播放的视频）
        if (currentIndex === draggedIndex) {
          setCurrentIndex(targetIndex);
        } else if (currentIndex > draggedIndex && currentIndex <= targetIndex) {
          setCurrentIndex(currentIndex - 1);
        } else if (currentIndex < draggedIndex && currentIndex >= targetIndex) {
          setCurrentIndex(currentIndex + 1);
        }

        isOrderChanged = true;
        return newPlaylist;
      }
      return prev;
    });

    if (isOrderChanged) {
      toast.success('播放列表顺序已调整');
    }
  };

  const handleVideoEnded = useCallback(() => {
    if (repeatMode === 'one') {
      return;
    }
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(ci => ci + 1);
      if (autoPlay) setIsPlaying(true);
    } else if (repeatMode === 'all' && playlist.length > 0) {
      setCurrentIndex(0);
      if (autoPlay) setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, playlist.length, repeatMode, autoPlay]);

  const playPrevious = useCallback(() => {
    setCurrentIndex(ci => {
      if (ci > 0) return ci - 1;
      if (repeatMode === 'all' && playlist.length > 0) return playlist.length - 1;
      return ci;
    });
    if (autoPlay) setIsPlaying(true);
  }, [repeatMode, playlist.length, autoPlay]);

  const playNext = useCallback(() => {
    setCurrentIndex(ci => {
      if (ci < playlist.length - 1) return ci + 1;
      if (repeatMode === 'all' && playlist.length > 0) return 0;
      return ci;
    });
    if (autoPlay) setIsPlaying(true);
  }, [repeatMode, playlist.length, autoPlay]);

  // Global drag & drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current++;
      if (e.dataTransfer?.types.includes('Files')) setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current--;
      if (dragCountRef.current === 0) setIsDragging(false);
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
    };
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [addFiles]);

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mkv,.avi,.mov,.flv,.wmv,.m4v"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl" style={{ backgroundColor: 'var(--bg-modal-overlay)' }}>
          <div
            className="flex flex-col items-center gap-8 p-12 rounded-3xl border-2 border-dashed border-[var(--primary-color)]/50 bg-[var(--primary-light)]"
          >
            <div className="w-24 h-24 rounded-full flex items-center justify-center border border-[var(--primary-color)]/50 bg-[var(--primary-light)]">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ color: 'var(--primary-color)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>释放以添加视频</p>
              <p style={{ color: 'var(--text-secondary)' }}>支持 MP4、WebM、MKV、AVI、MOV 等格式</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 relative">
          {/* Player */}
          <div className="flex-1 min-w-0 relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="w-full h-full">
              <div 
                className="w-full h-full transition-all duration-300 ease-in-out"
              >
                {currentVideo ? (
                  <div className="relative w-full h-full">
                    {/* Top toolbar overlay */}
                    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3" style={{ 
                      background: 'transparent'
                    }}>
                      {/* Left: Video info */}
                      <div className="flex items-center">
                        {currentVideo && (
                          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {videoInfo ? `${videoInfo.width}×${videoInfo.height}` : '未知分辨率'} &nbsp;•&nbsp; {formatFileSize(currentVideo.size)} &nbsp;•&nbsp; {formatDuration(currentVideo.duration)}
                          </div>
                        )}
                      </div>

                      {/* Center: Video filename */}
                      <div className="flex-1 flex justify-center mx-6">
                        {currentVideo ? (
                          <div 
                            className="max-w-[400px] overflow-hidden"
                            ref={(container) => {
                              if (container) {
                                const textEl = container.querySelector('span');
                                if (textEl) {
                                  const handleMouseEnter = () => {
                                    if (textEl.scrollWidth > container.clientWidth) {
                                      const scrollDistance = textEl.scrollWidth - container.clientWidth;
                                      const duration = Math.max(2, scrollDistance / 60);
                                      textEl.style.setProperty('--scroll-distance', `-${scrollDistance}px`);
                                      textEl.style.setProperty('--scroll-duration', `${duration}s`);
                                      textEl.classList.add('is-scrolling');
                                    }
                                  };
                                  const handleMouseLeave = () => {
                                    textEl.classList.remove('is-scrolling');
                                  };
                                  container.onmouseenter = handleMouseEnter;
                                  container.onmouseleave = handleMouseLeave;
                                }
                              }
                            }}
                          >
                            <span 
                              className="text-lg font-medium whitespace-nowrap inline-block"
                              style={{ color: 'rgba(255,255,255,0.9)' }}
                            >
                              {currentVideo.name.replace(/\.[^/.]+$/, '')}
                            </span>
                          </div>
                        ) : (
                          <h1 className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            暂无视频文件
                          </h1>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openFilePicker}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300"
                          style={{ 
                            background: 'rgba(0,0,0,0.3)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          <span>添加视频</span>
                        </button>
                        <button
                          onClick={() => {
                            const newAutoPlay = !autoPlay;
                            setAutoPlay(newAutoPlay);
                            configStorage.set('videoAutoPlay', newAutoPlay);
                            toast.success(newAutoPlay ? '自动播放已开启' : '自动播放已关闭');
                          }}
                          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                          style={{ 
                            backgroundColor: autoPlay ? 'var(--primary-color)' : 'rgba(0,0,0,0.3)', 
                            color: 'white',
                            border: autoPlay ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.2)'
                          }}
                          title={autoPlay ? '关闭自动播放' : '开启自动播放'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowShortcuts(true)}
                          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                          style={{ 
                            backgroundColor: 'rgba(0,0,0,0.3)', 
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                          title="快捷键"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const newSidebarOpen = !sidebarOpen;
                            setSidebarOpen(newSidebarOpen);
                            setShowToolbar(newSidebarOpen);
                          }}
                          className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                          style={{ 
                            backgroundColor: 'rgba(0,0,0,0.3)', 
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                          title={sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'}
                        >
                          {sidebarOpen ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </header>

                    <VideoPlayer
                      src={currentVideo.url}
                      loop={repeatMode === 'one'}
                      autoPlay={autoPlay}
                      filters={filters}
                      onEnded={handleVideoEnded}
                      onVideoInfo={setVideoInfo}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onPlayPrevious={playPrevious}
                      onPlayNext={playNext}
                      canPlayPrevious={currentIndex > 0 || repeatMode === 'all'}
                      canPlayNext={currentIndex < playlist.length - 1 || repeatMode === 'all'}
                    />

                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center" style={{ 
                    backgroundColor: 'var(--bg-primary)'
                  }}>
                    <div className="mb-6">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>暂无视频文件</h3>
                    <p className="text-center max-w-md mb-6" style={{ color: 'var(--text-tertiary)' }}>
                      拖放视频文件到窗口中，或点击下方按钮选择文件
                    </p>
                    <button
                      onClick={openFilePicker}
                      className="px-6 py-3 rounded-full font-medium transition-all duration-300 shadow-lg shadow-[var(--primary-color)]/25"
                      style={{ 
                        background: 'linear-gradient(to right, var(--primary-color), var(--primary-dark))',
                        color: 'white'
                      }}
                    >
                      添加视频文件
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div 
          style={{
            borderLeft: `1px solid var(--border-color)`,
            transition: 'all 0.4s ease-in-out',
            width: sidebarOpen ? '384px' : '0',
            overflow: 'hidden',
            opacity: sidebarOpen ? 1 : 0,
            flex: '0 0 auto'
          }}
        >
          <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Sidebar header */}
            <div className="shrink-0 border-b p-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 transition-opacity hover:opacity-70"
                  title="隐藏侧边栏"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--primary-color)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>播放列表</h3>
                </button>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-color)' }} />
                  <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {playlist.length} 个视频
                  </span>
                </div>
              </div>
            </div>

            {/* Playlist items */}
            <div className="flex-1 overflow-y-auto p-3">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>播放列表为空</h4>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>添加视频文件开始播放</p>
                  <button
                    onClick={openFilePicker}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{ 
                      background: 'linear-gradient(to right, var(--primary-color), var(--primary-dark))',
                      color: 'white'
                    }}
                  >
                    添加视频文件
                  </button>
                </div>
              ) : (
                playlist.map((video, index) => (
                  <div
                    key={video.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg mb-2 transition-all cursor-pointer group/item',
                      currentIndex === index
                        ? 'bg-[var(--primary-light)] border border-[var(--primary-color)]/30'
                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:bg-[var(--primary-light)]/50 hover:border-[var(--primary-color)]/50'
                    )}
                    onClick={() => {
                      setCurrentIndex(index);
                      if (autoPlay) {
                        setIsPlaying(true);
                      }
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, video.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, video.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, video.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded flex items-center justify-center',
                          currentIndex === index ? 'bg-[var(--primary-color)]/30 text-[var(--primary-color)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                        )}>
                          {currentIndex === index && isPlaying ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"/>
                            </svg>
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            'font-medium truncate',
                            currentIndex === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                          )}>
                            {video.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs mt-1 text-[var(--text-tertiary)]">
                            <span>{formatDuration(video.duration)}</span>
                            <span>{formatFileSize(video.size)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(video.id);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            <div className="shrink-0 border-t p-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="space-y-3">
                {/* Action buttons - two columns */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={openFilePicker}
                    className="px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--primary-color)',
                      color: 'white'
                    }}
                  >
                    添加视频
                  </button>
                  <button
                    onClick={clearPlaylist}
                    className="px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    清空列表
                  </button>
                </div>

                {/* Repeat mode */}
                <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  {(['one', 'all'] as RepeatMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRepeatMode(mode)}
                      className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
                      style={{
                        backgroundColor: repeatMode === mode ? 'var(--primary-color)' : 'transparent',
                        color: repeatMode === mode ? 'white' : 'var(--text-secondary)'
                      }}
                    >
                      {mode === 'one' ? '单视频循环' : '列表循环'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>


      {/* Shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-modal-overlay)', backdropFilter: 'blur(4px)' }}>
          <div 
            className="border rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transition-all duration-300 ease-in-out"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>快捷键</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ 
                  backgroundColor: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {
                [
                  { key: 'Space', desc: '播放/暂停' },
                  { key: '←', desc: '后退 10 秒' },
                  { key: '→', desc: '前进 10 秒' },
                  { key: '↑', desc: '音量增加' },
                  { key: '↓', desc: '音量减少' },
                  { key: 'F', desc: '全屏' },
                  { key: 'M', desc: '静音' },
                  { key: 'S', desc: '显示/隐藏侧边栏' },
                  { key: 'T', desc: '显示/隐藏工具栏' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-[var(--bg-tertiary)] border-[var(--border-color)]">
                    <span className="text-sm text-[var(--text-secondary)]">{item.desc}</span>
                    <span className="px-3 py-1 rounded-md font-mono text-sm bg-[var(--primary-light)] text-[var(--primary-color)] border border-[var(--primary-color)]/30">
                      {item.key}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerPage;