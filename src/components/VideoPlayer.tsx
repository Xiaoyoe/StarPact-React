import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import type { VideoFilters, VideoInfo } from '@/types/video';
import { DEFAULT_FILTERS } from '@/types/video';

interface VideoPlayerProps {
  src: string | null;
  loop?: boolean;
  filters?: VideoFilters;
  onEnded?: () => void;
  onVideoInfo?: (info: VideoInfo) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildFilterCSS(f: VideoFilters): string {
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness / 100})`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast / 100})`);
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation / 100})`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

export function VideoPlayer({ src, loop = false, filters = DEFAULT_FILTERS, onEnded, onVideoInfo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [screenshotFlash, setScreenshotFlash] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state on source change
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setPlaybackRate(1);
    setShowSpeedMenu(false);
    setShowControls(true);
    setIsPlaying(false);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 1;
      // 当src变化时，确保视频会自动播放
      video.onloadeddata = () => {
        video.play().catch(() => {});
      };
    }
  }, [src]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [src]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    video.muted = newMuted;
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    // Flash effect
    setScreenshotFlash(true);
    setTimeout(() => setScreenshotFlash(false), 300);
    // Download
    const link = document.createElement('a');
    link.download = `screenshot_${formatTime(video.currentTime).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const changeSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [isPlaying]);

  // Progress bar interaction
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverX(e.clientX - rect.left);
  };

  // Progress dragging
  useEffect(() => {
    if (!isDraggingProgress) return;
    const handleMove = (e: MouseEvent) => {
      const bar = progressRef.current;
      const video = videoRef.current;
      if (!bar || !video) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
    };
    const handleUp = () => setIsDraggingProgress(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingProgress]);

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = volumeRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
    video.volume = ratio;
    setIsMuted(ratio === 0);
    video.muted = ratio === 0;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          resetHideTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-5);
          resetHideTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(5);
          resetHideTimer();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.min(1, prev + 0.05);
            if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = false; }
            setIsMuted(false);
            return v;
          });
          resetHideTimer();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.max(0, prev - 0.05);
            if (videoRef.current) videoRef.current.volume = v;
            return v;
          });
          resetHideTimer();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          resetHideTimer();
          break;
        case 'j':
          e.preventDefault();
          skip(-10);
          resetHideTimer();
          break;
        case 'l':
          e.preventDefault();
          skip(10);
          resetHideTimer();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            takeScreenshot();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleFullscreen, toggleMute, takeScreenshot, resetHideTimer]);

  useEffect(() => { resetHideTimer(); }, [isPlaying, resetHideTimer]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;
  const filterCSS = buildFilterCSS(filters);

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden group/player',
        isFullscreen ? 'rounded-none' : 'rounded-2xl ring-1 shadow-2xl'
      )}
      style={{
        backgroundColor: 'var(--bg-primary)',
        boxShadow: isFullscreen ? 'none' : `0 25px 50px -12px ${getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')}/70`,
        borderColor: 'var(--border-color)',
        aspectRatio: isFullscreen ? undefined : '16/9'
      }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); setHoverTime(null); }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        loop={loop}
        className={cn('w-full h-full object-contain cursor-pointer', isFullscreen && 'h-screen')}
        style={{ filter: filterCSS }}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime);
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          setDuration(v.duration);
          v.volume = volume;
          setIsLoading(false);
          onVideoInfo?.({ width: v.videoWidth, height: v.videoHeight });
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onClick={togglePlay}
        onDoubleClick={(e) => { e.preventDefault(); toggleFullscreen(); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={onEnded}
        autoPlay
        preload="auto"
      />

      {/* Screenshot flash overlay */}
      {screenshotFlash && (
        <div
          className="absolute inset-0 bg-white pointer-events-none z-30"
          style={{ animation: 'screenshot-flash 0.3s ease-out forwards' }}
        />
      )}

      {/* Loading spinner */}
      {isLoading && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)/20', borderTopColor: 'var(--primary-color)' }} />
        </div>
      )}

      {/* Big play button overlay */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer z-10" style={{ backgroundColor: 'var(--bg-primary)/30' }} onClick={togglePlay}>
          <div className="w-20 h-20 rounded-full backdrop-blur-xl flex items-center justify-center border shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95 group/play" style={{ backgroundColor: 'var(--bg-secondary)/12', borderColor: 'var(--text-secondary)/20' }}>
            <svg className="w-9 h-9 ml-1 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mini progress bar (visible when controls hidden) */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-[3px] z-10 transition-opacity duration-300',
        showControls ? 'opacity-0' : 'opacity-100'
      )}>
        <div className="h-full" style={{ backgroundColor: 'var(--primary-color)', width: `${progress}%` }} />
      </div>

      {/* Controls overlay */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 transition-all duration-300 z-20',
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      )}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t pointer-events-none" style={{ backgroundImage: `linear-gradient(to top, var(--bg-primary)/95, var(--bg-primary)/60, transparent)` }} />

        <div className="relative px-4 pb-3.5 pt-16">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/prog relative h-[5px] w-full cursor-pointer rounded-full mb-3.5 hover:h-[7px] transition-all duration-200"
            style={{ backgroundColor: 'var(--text-secondary)/12' }}
            onClick={handleProgressClick}
            onMouseDown={() => setIsDraggingProgress(true)}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffered */}
            <div className="absolute h-full rounded-full" style={{ backgroundColor: 'var(--text-secondary)/08', width: `${bufferedPercent}%` }} />
            {/* Progress */}
            <div className="relative h-full rounded-full" style={{ backgroundColor: 'var(--primary-color)', boxShadow: `0 0 8px var(--primary-color)/40`, width: `${progress}%` }}>
              {/* Thumb */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg opacity-0 group-hover/prog:opacity-100 scale-75 group-hover/prog:scale-100 transition-all duration-200 ring-2" style={{ backgroundColor: 'var(--text-primary)', boxShadow: `0 0 8px var(--primary-color)/40`, ringColor: 'var(--primary-color)/50' }} />
            </div>
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-10 -translate-x-1/2 px-2.5 py-1 rounded-lg border text-[11px] tabular-nums pointer-events-none shadow-lg backdrop-blur-sm"
                style={{ 
                  left: Math.max(20, Math.min(hoverX, (progressRef.current?.clientWidth ?? 0) - 20)),
                  backgroundColor: 'var(--bg-secondary)/90',
                  borderColor: 'var(--text-secondary)/10',
                  color: 'var(--text-primary)'
                }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isPlaying ? '暂停 (K)' : '播放 (K)'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>

              {/* Skip back */}
              <button
                onClick={() => skip(-10)}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="后退10秒 (J)"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="前进10秒 (L)"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 ml-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  title={isMuted ? '取消静音 (M)' : '静音 (M)'}
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                  )}
                </button>
                <div
                  ref={volumeRef}
                  className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300 h-[5px] rounded-full cursor-pointer"
                  style={{ backgroundColor: 'var(--text-secondary)/12' }}
                  onClick={handleVolumeClick}
                >
                  <div className="h-full rounded-full relative transition-all" style={{ backgroundColor: 'var(--text-primary)', width: `${volumePercent}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md" style={{ backgroundColor: 'var(--text-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Time */}
              <span className="text-[12px] ml-2 tabular-nums whitespace-nowrap font-mono" style={{ color: 'var(--text-secondary)/40' }}>
                <span style={{ color: 'var(--text-secondary)/70' }}>{formatTime(currentTime)}</span>
                <span className="mx-1">/</span>
                {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-0.5">
              {/* Screenshot */}
              <button
                onClick={takeScreenshot}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="截图 (Ctrl+S)"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </button>

              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className={cn(
                    'text-[12px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-mono tabular-nums'
                  )}
                  style={{
                    backgroundColor: playbackRate !== 1 ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                    color: playbackRate !== 1 ? 'var(--primary-color)' : 'var(--text-secondary)',
                    border: `1px solid ${playbackRate !== 1 ? 'var(--primary-color)/30' : 'var(--border-color)'}`
                  }}
                  title="播放速度"
                >
                  {playbackRate === 1 ? '倍速' : `${playbackRate}x`}
                </button>
                {showSpeedMenu && (
                  <div
                    className="absolute bottom-full right-0 mb-2 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden py-1.5 min-w-[120px]"
                    style={{ 
                      animation: 'fade-in 0.15s ease-out',
                      backgroundColor: 'var(--bg-secondary)',
                      border: `1px solid var(--border-color)`
                    }}
                  >
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className="flex items-center justify-between w-full px-4 py-1.5 text-[12px] transition-colors cursor-pointer"
                        style={{
                          backgroundColor: rate === playbackRate ? 'var(--primary-light)' : 'transparent',
                          color: rate === playbackRate ? 'var(--primary-color)' : 'var(--text-secondary)',
                          border: `1px solid ${rate === playbackRate ? 'var(--primary-color)/30' : 'transparent'}`
                        }}
                      >
                        <span>{rate === 1 ? '正常' : `${rate}x`}</span>
                        {rate === playbackRate && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary-color)' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PiP */}
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (document.pictureInPictureElement) document.exitPictureInPicture();
                  else v.requestPictureInPicture();
                }}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="画中画"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <rect x="11" y="9" width="9" height="6" rx="1" className="fill-current opacity-30" />
                </svg>
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--text-secondary)/10'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isFullscreen ? '退出全屏 (F)' : '全屏 (F)'}
              >
                {isFullscreen ? (
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
