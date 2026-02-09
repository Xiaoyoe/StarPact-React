import { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoFile, VideoFilters, VideoInfo, RepeatMode, DEFAULT_FILTERS } from '@/types/video';
import { cn } from '@/utils/cn';

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
  const [playlist, setPlaylist] = useState<VideoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const currentVideo = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

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
    <div className="h-screen bg-[#07070f] text-white flex flex-col overflow-hidden">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07070f]/90 backdrop-blur-xl">
          <div
            className="flex flex-col items-center gap-6 p-20 rounded-3xl border-2 border-dashed border-violet-500/40 bg-violet-500/[0.04]"
          >
            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-indigo-500/10 flex items-center justify-center border border-violet-500/20">
              <svg className="w-14 h-14 text-violet-400/70" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white mb-2">释放以添加视频</p>
              <p className="text-sm text-slate-500">支持 MP4、WebM、MKV、AVI、MOV 等格式</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 h-14 border-b border-white/[0.06] bg-[#07070f]/80 backdrop-blur-2xl flex items-center justify-between px-4 lg:px-5 z-30">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/25">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">CinePlay</h1>
            <p className="text-[10px] text-slate-600 leading-tight">本地视频播放器</p>
          </div>
        </div>

        {/* Center: Current video info */}
        {currentVideo && (
          <div className="hidden md:flex items-center gap-2.5 flex-1 max-w-xl mx-6 min-w-0">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
              {currentVideo.name.split('.').pop()?.toUpperCase()}
            </span>
            <p className="text-sm text-slate-400 truncate">{currentVideo.name.replace(/\.[^/.]+$/, '')}</p>
            <span className="text-[11px] text-slate-600 tabular-nums font-mono shrink-0">
              {formatDuration(currentVideo.duration)}
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={openFilePicker}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-medium shadow-lg shadow-violet-600/25 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>选择视频文件</span>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
            title="快捷键"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
          {playlist.length > 0 && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
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
              <div className="flex-1 min-h-0 flex items-center justify-center p-3 lg:p-5 bg-[#07070f]">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full max-w-full" style={{ maxHeight: '100%' }}>
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
              <div className="shrink-0 border-t border-white/[0.06] bg-[#0c0c18]/80 backdrop-blur-xl px-4 lg:px-5 py-2.5">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Left: file info */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <svg className="w-4 h-4 text-violet-500/60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                      <span className="text-slate-400 font-medium truncate max-w-[200px]">{currentVideo.name}</span>
                      <span className="hidden sm:inline text-slate-700">·</span>
                      <span className="hidden sm:inline">{formatFileSize(currentVideo.size)}</span>
                      {videoInfo && (
                        <>
                          <span className="hidden md:inline text-slate-700">·</span>
                          <span className="hidden md:inline">{videoInfo.width}×{videoInfo.height}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: nav controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    {repeatMode !== 'off' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 mr-1">
                        {repeatMode === 'one' ? '单曲循环' : '列表循环'}
                      </span>
                    )}
                    <button
                      onClick={playPrevious}
                      disabled={currentIndex <= 0 && repeatMode !== 'all'}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="上一个"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-[11px] text-slate-600 tabular-nums px-1.5 font-mono">
                      {currentIndex + 1} / {playlist.length}
                    </span>
                    <button
                      onClick={playNext}
                      disabled={currentIndex >= playlist.length - 1 && repeatMode !== 'all'}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#07070f]">
              <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/5 flex items-center justify-center border border-violet-500/10 mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-600/20 to-indigo-600/15 flex items-center justify-center border border-violet-500/20">
                  <svg className="w-16 h-16 text-violet-400/60" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">CinePlay</h2>
              <p className="text-slate-400 text-center mb-8 max-w-md">
                将视频文件拖放到窗口中，或点击下方按钮选择文件。<br />
                所有内容仅在本地浏览器处理，安全私密。
              </p>
              <button
                onClick={openFilePicker}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-violet-600/25 transition-all duration-300"
              >
                选择视频文件
              </button>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {['MP4', 'WebM', 'MKV', 'AVI', 'MOV', 'FLV', 'WMV', 'M4V', 'OGG'].map((ext) => (
                  <span key={ext} className="px-2 py-1 rounded-full text-xs text-slate-500 bg-white/[0.03] border border-white/[0.05]">
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
              'shrink-0 border-l border-white/[0.06] transition-all duration-300 ease-in-out',
              sidebarOpen
                ? 'w-full lg:w-80 xl:w-[360px] max-h-[45vh] lg:max-h-none'
                : 'w-0 max-h-0 lg:max-h-none overflow-hidden border-l-0'
            )}
          >
            <div className="h-full flex flex-col bg-[#07070f]">
              {/* Sidebar header */}
              <div className="shrink-0 border-b border-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">播放列表 ({playlist.length})</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={shufflePlaylist}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                      title="随机播放"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 21l-7.5-1.5L4.5 21V3m15 0h-3M4.5 3v18" />
                      </svg>
                    </button>
                    <button
                      onClick={clearPlaylist}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
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
                      'flex items-center justify-between p-3 rounded-xl mb-1.5 transition-all',
                      currentIndex === index
                        ? 'bg-violet-500/10 border border-violet-500/30'
                        : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05]'
                    )}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{video.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{formatDuration(video.duration)}</span>
                        <span>{formatFileSize(video.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(video.id);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] hover:bg-red-500/20 transition-colors ml-2"
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
              <div className="shrink-0 border-t border-white/[0.06] p-4">
                <div className="space-y-3">
                  {/* Repeat mode */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-400 mb-2">重复模式</h4>
                    <div className="flex items-center gap-1">
                      {(['off', 'all', 'one'] as RepeatMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setRepeatMode(mode)}
                          className={cn(
                            'flex-1 px-3 py-1.5 rounded-lg text-xs transition-colors',
                            repeatMode === mode
                              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                              : 'bg-white/[0.03] text-slate-400 border border-white/[0.05] hover:bg-white/[0.05]'
                          )}
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
    </div>
  );
}

export default VideoPlayerPage;