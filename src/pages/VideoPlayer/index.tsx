import { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoFile, VideoFilters, VideoInfo, RepeatMode, DEFAULT_FILTERS } from '@/types/video';
import { cn } from '@/utils/cn';
import { useStore } from '@/store';
import { VideoPlaylistStorage, VideoPlaylist } from '@/services/storage/VideoPlaylistStorage';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    // 不要在这里释放URL，因为我们需要在VideoFile对象中保存它
    video.onloadedmetadata = () => { resolve(video.duration); };
    video.onerror = () => { resolve(0); };
    video.src = url;
  });
}

const ACCEPTED_EXTENSIONS = /\.(mp4|webm|mkv|avi|mov|flv|wmv|m4v|ogg|ogv|3gp|ts|mpeg|mpg)$/i;

function VideoPlayerPage() {
  const { theme, storagePath } = useStore();
  const [playlist, setPlaylist] = useState<VideoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [playerSize, setPlayerSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const currentVideo = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  // 从存储加载播放列表
  useEffect(() => {
    if (storagePath) {
      const playlists = VideoPlaylistStorage.getAllPlaylists(storagePath);
      if (playlists.length > 0) {
        const latestPlaylist = playlists[0];
        setPlaylist(latestPlaylist.videos);
        setCurrentIndex(0);
      }
    }
  }, [storagePath]);

  // 保存播放列表到存储
  useEffect(() => {
    if (storagePath && playlist.length > 0) {
      const currentPlaylist: VideoPlaylist = {
        id: 'default-playlist',
        name: '默认播放列表',
        videos: playlist,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      VideoPlaylistStorage.savePlaylist(storagePath, currentPlaylist);
    }
  }, [playlist, storagePath]);

  const addFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f =>
      f.type.startsWith('video/') || ACCEPTED_EXTENSIONS.test(f.name)
    );
    if (files.length === 0) return;

    const newVideos: VideoFile[] = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const duration = await getVideoDuration(file);
        return {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'video/*',
          url,
          duration,
          addedAt: Date.now(),
        };
      })
    );

    setPlaylist(prev => {
      const isFirstAdd = prev.length === 0;
      const updated = [...prev, ...newVideos];
      if (isFirstAdd) setCurrentIndex(0);
      return updated;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setPlaylist(prev => {
      const index = prev.findIndex(v => v.id === id);
      if (index === -1) return prev;
      URL.revokeObjectURL(prev[index].url);
      const updated = prev.filter(v => v.id !== id);
      setCurrentIndex(ci => {
        if (updated.length === 0) return -1;
        if (index < ci) return ci - 1;
        if (index === ci) return Math.min(ci, updated.length - 1);
        return ci;
      });
      return updated;
    });
  }, []);

  const clearPlaylist = useCallback(() => {
    playlist.forEach(v => URL.revokeObjectURL(v.url));
    setPlaylist([]);
    setCurrentIndex(-1);
    setVideoInfo(null);
    setFilters(DEFAULT_FILTERS);
  }, [playlist]);

  const shufflePlaylist = useCallback(() => {
    setPlaylist(prev => {
      const currentId = currentIndex >= 0 ? prev[currentIndex]?.id : null;
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (currentId) {
        const newIdx = shuffled.findIndex(v => v.id === currentId);
        setCurrentIndex(newIdx);
      }
      return shuffled;
    });
  }, [currentIndex]);

  const handleVideoEnded = useCallback(() => {
    if (repeatMode === 'one') {
      return;
    }
    if (currentIndex < playlist.length - 1) {
      setCurrentIndex(ci => ci + 1);
    } else if (repeatMode === 'all' && playlist.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, playlist.length, repeatMode]);

  const playPrevious = useCallback(() => {
    setCurrentIndex(ci => {
      if (ci > 0) return ci - 1;
      if (repeatMode === 'all' && playlist.length > 0) return playlist.length - 1;
      return ci;
    });
  }, [repeatMode, playlist.length]);

  const playNext = useCallback(() => {
    setCurrentIndex(ci => {
      if (ci < playlist.length - 1) return ci + 1;
      if (repeatMode === 'all' && playlist.length > 0) return 0;
      return ci;
    });
  }, [repeatMode, playlist.length]);

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
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl" style={{ backgroundColor: 'var(--bg-primary)/90' }}>
          <div
            className="flex flex-col items-center gap-6 p-20 rounded-3xl border-2 border-dashed"
            style={{ borderColor: 'var(--primary-color)/40', backgroundColor: 'var(--primary-color)/[0.04]' }}
          >
            <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center border" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary-color)/20' }}>
              <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24" style={{ color: 'var(--primary-color)/70' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>释放以添加视频</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>支持 MP4、WebM、MKV、AVI、MOV 等格式</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 h-14 border-b backdrop-blur-2xl flex items-center justify-between px-4 lg:px-5 z-30" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)/80' }}>
        {/* Left: Current video info */}
        {currentVideo ? (
          <div className="flex items-center gap-2.5 flex-1 max-w-xl min-w-0">
            <span className="px-2 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)/30' }}>
              {currentVideo.name.split('.').pop()?.toUpperCase()}
            </span>
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{currentVideo.name.replace(/\.[^/.]+$/, '')}</p>
            <span className="text-[11px] tabular-nums font-mono shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              {formatDuration(currentVideo.duration)}
            </span>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Size control */}
          <button
            onClick={() => setShowSizeModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            title="播放器大小"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>{playerSize === 'small' ? '小' : playerSize === 'medium' ? '中' : '大'}</span>
          </button>
          
          <button
            onClick={openFilePicker}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300"
            style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-primary)', boxShadow: '0 4px 12px var(--primary-color)/25' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>选择视频文件</span>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            title="快捷键"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
          {playlist.length > 0 && (
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                setShowToolbar(!sidebarOpen);
              }}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {currentVideo ? (
            <>
              {/* Player */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-3 lg:p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div 
                    className="w-full transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: '100%',
                      maxWidth: playerSize === 'small' ? '60%' : playerSize === 'medium' ? '80%' : '100%',
                      height: playerSize === 'small' ? '60%' : playerSize === 'medium' ? '80%' : '100%'
                    }}
                  >
                    <VideoPlayer
                      key={currentVideo.id}
                      src={currentVideo.url}
                      loop={repeatMode === 'one'}
                      filters={filters}
                      onEnded={handleVideoEnded}
                      onVideoInfo={setVideoInfo}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom info bar */}
              <div 
                className={`shrink-0 border-t backdrop-blur-xl px-4 lg:px-5 py-2.5 transition-all duration-300 ease-in-out transform`}
                style={{
                  borderColor: 'var(--border-color)', 
                  backgroundColor: 'var(--bg-secondary)/80',
                  opacity: showToolbar ? 1 : 0,
                  transform: showToolbar ? 'translateY(0)' : 'translateY(100%)',
                  pointerEvents: showToolbar ? 'auto' : 'none'
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Left: file info */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--primary-color)/60' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="font-medium truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{currentVideo.name}</span>
                      <span className="hidden sm:inline" style={{ color: 'var(--text-tertiary)' }}>·</span>
                      <span className="hidden sm:inline">{formatFileSize(currentVideo.size)}</span>
                      {videoInfo && (
                        <>
                          <span className="hidden md:inline" style={{ color: 'var(--text-tertiary)' }}>·</span>
                          <span className="hidden md:inline">{videoInfo.width}×{videoInfo.height}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: nav controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    {repeatMode !== 'off' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium border mr-1" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)/30' }}>
                        {repeatMode === 'one' ? '单曲循环' : '列表循环'}
                      </span>
                    )}
                    <button
                      onClick={playPrevious}
                      disabled={currentIndex <= 0 && repeatMode !== 'all'}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      title="上一个"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-[11px] tabular-nums px-1.5 font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {currentIndex + 1} / {playlist.length}
                    </span>
                    <button
                      onClick={playNext}
                      disabled={currentIndex >= playlist.length - 1 && repeatMode !== 'all'}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      title="下一个"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div className="w-64 h-64 rounded-3xl flex items-center justify-center border mb-8" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary-color)/10' }}>
                <div className="w-32 h-32 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary-color)/20' }}>
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" style={{ color: 'var(--primary-color)/60' }}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>CinePlay</h2>
              <p className="text-center mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                将视频文件拖放到窗口中，或点击下方按钮选择文件。<br />
                所有内容仅在本地浏览器处理，安全私密。
              </p>
              <button
                onClick={openFilePicker}
                className="px-8 py-3 rounded-full font-medium shadow-lg transition-all duration-300"
                style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-primary)', boxShadow: '0 4px 12px var(--primary-color)/25' }}
              >
                选择视频文件
              </button>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['MP4', 'WebM', 'MKV', 'AVI', 'MOV', 'FLV', 'WMV', 'M4V', 'OGG'].map((ext) => (
                  <span key={ext} className="px-2 py-1 rounded-full text-xs border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', borderColor: 'var(--border-color)' }}>
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {playlist.length > 0 && (
          <aside
            className={cn(
              'shrink-0 border-l transition-all duration-300 ease-in-out',
              sidebarOpen
                ? 'w-full lg:w-80 xl:w-[360px] max-h-[45vh] lg:max-h-none'
                : 'w-0 max-h-0 lg:max-h-none overflow-hidden border-l-0'
            )}
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
              {/* Sidebar header */}
              <div className="shrink-0 border-b p-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>播放列表 ({playlist.length})</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={shufflePlaylist}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      title="随机播放"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 21l-7.5-1.5L4.5 21V3m15 0h-3M4.5 3v18" />
                      </svg>
                    </button>
                    <button
                      onClick={clearPlaylist}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      title="清空列表"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Playlist items */}
              <div className="flex-1 overflow-y-auto p-2">
                {playlist.map((video, index) => (
                  <div
                    key={video.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl mb-1.5 transition-all border',
                      currentIndex === index
                        ? ''
                        : 'hover:bg-[var(--bg-secondary)]'
                    )}
                    style={{
                      backgroundColor: currentIndex === index ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      borderColor: currentIndex === index ? 'var(--primary-color)/30' : 'var(--border-color)'
                    }}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{video.name}</h4>
                      <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{formatDuration(video.duration)}</span>
                        <span>{formatFileSize(video.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(video.id);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full transition-colors ml-2"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Sidebar footer */}
              <div className="shrink-0 border-t p-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="space-y-3">
                  {/* Repeat mode */}
                  <div>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>重复模式</h4>
                    <div className="flex items-center gap-1">
                      {(['off', 'all', 'one'] as RepeatMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setRepeatMode(mode)}
                          className={cn(
                            'flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors border',
                            repeatMode === mode
                              ? ''
                              : 'hover:bg-[var(--bg-secondary)]'
                          )}
                          style={{
                            backgroundColor: repeatMode === mode ? 'var(--primary-light)' : 'var(--bg-secondary)',
                            color: repeatMode === mode ? 'var(--primary-color)' : 'var(--text-secondary)',
                            borderColor: repeatMode === mode ? 'var(--primary-color)/30' : 'var(--border-color)'
                          }}
                        >
                          {mode === 'off' ? '关闭' : mode === 'all' ? '列表' : '单曲'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Size selection modal */}
      {showSizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80" onClick={() => setShowSizeModal(false)}>
          <div 
            className="bg-[var(--bg-secondary)] rounded-xl border shadow-2xl p-6 max-w-md w-full mx-4 transition-all duration-300 ease-in-out"
            style={{ borderColor: 'var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>选择播放器大小</h3>
              <button
                onClick={() => setShowSizeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {
                [
                  { id: 'small', name: '小', desc: '适合小屏幕或多任务' },
                  { id: 'medium', name: '中', desc: '默认大小，平衡显示效果' },
                  { id: 'large', name: '大', desc: '全屏显示，最佳观看体验' }
                ].map((size) => (
                  <button
                    key={size.id}
                    onClick={() => {
                      setPlayerSize(size.id as 'small' | 'medium' | 'large');
                      setShowSizeModal(false);
                    }}
                    className="w-full p-4 rounded-lg border transition-all duration-300 ease-in-out flex items-center justify-between"
                    style={{
                      backgroundColor: size.id === playerSize ? 'var(--primary-light)' : 'var(--bg-primary)',
                      borderColor: size.id === playerSize ? 'var(--primary-color)' : 'var(--border-color)',
                      transform: size.id === playerSize ? 'scale(1.02)' : 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                      if (size.id !== playerSize) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (size.id !== playerSize) {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: size.id === playerSize ? 'var(--primary-color)' : 'var(--text-primary)' }}>{size.name}</div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{size.desc}</div>
                    </div>
                    {size.id === playerSize && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary-color)' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80" onClick={() => setShowShortcuts(false)}>
          <div 
            className="bg-[var(--bg-secondary)] rounded-xl border shadow-2xl p-6 max-w-md w-full mx-4 transition-all duration-300 ease-in-out"
            style={{ borderColor: 'var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>快捷键</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
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
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</span>
                    <span className="px-3 py-1 rounded-md font-mono text-sm" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)/30' }}>{item.key}</span>
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