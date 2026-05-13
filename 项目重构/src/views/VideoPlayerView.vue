<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/composables/useToast';
import { videoService } from '@/services/tauri/video';
import { fileService } from '@/services';
import { open, confirm } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Camera, ChevronLeft, ChevronRight,
  PictureInPicture2, PictureInPicture, Plus, Trash2, Repeat, Repeat1,
  List, X, Maximize2, Grid3X3, Save, FileJson, FolderOpen, Info
} from 'lucide-vue-next';
import MultiVideoPlayer from '@/components/video/MultiVideoPlayer.vue';
import Modal from '@/components/common/Modal.vue';

const toast = useToast();

interface VideoItem {
  id: string;
  name: string;
  url: string;
  path?: string;
  size: number;
  duration: number;
  addedAt: number;
}

const VIDEO_PLAYER_CONFIG_KEY = 'video-player-config';

const loadPlayerConfig = () => {
  try {
    const saved = localStorage.getItem(VIDEO_PLAYER_CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load video player config:', e);
  }
  return { autoPlay: false, autoLoad: false };
};

const savePlayerConfig = () => {
  try {
    localStorage.setItem(VIDEO_PLAYER_CONFIG_KEY, JSON.stringify({
      autoPlay: autoPlay.value,
      autoLoad: autoLoad.value,
    }));
  } catch (e) {
    console.error('Failed to save video player config:', e);
  }
};

const initialConfig = loadPlayerConfig();

const playlist = ref<VideoItem[]>([]);
const currentIndex = ref(-1);
const sidebarOpen = ref(true);
const repeatMode = ref<'none' | 'one' | 'all'>('none');
const autoPlay = ref(initialConfig.autoPlay);
const autoLoad = ref(initialConfig.autoLoad);
const multiVideoMode = ref(false);
const currentPlaylistId = ref<string | null>(null);

const jsonModalVisible = ref(false);
const jsonContent = ref<string>('');
const jsonTotalCount = ref(0);
const jsonDisplayCount = ref(100);
const jsonAllData = ref<any[]>([]);
const selectedPlaylists = ref<Set<string>>(new Set());
const jsonViewMode = ref<'list' | 'json'>('list');

const confirmModalVisible = ref(false);
const confirmModalTitle = ref('确认');
const confirmModalMessage = ref('');
const confirmModalCallback = ref<(() => void) | null>(null);

const videoInfoVisible = ref(false);
const videoInfoPosition = ref({ x: 0, y: 20 });
const videoInfoDragging = ref(false);
const videoInfoDragStart = ref({ x: 0, y: 0 });

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const progressRef = ref<HTMLDivElement | null>(null);
const volumeRef = ref<HTMLDivElement | null>(null);
const multiVideoPlayerRef = ref<InstanceType<typeof MultiVideoPlayer> | null>(null);

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.75);
const isMuted = ref(false);
const isFullscreen = ref(false);
const playbackRate = ref(1);
const showControls = ref(true);
const buffered = ref(0);
const showSpeedMenu = ref(false);
const showAspectMenu = ref(false);
const aspectRatio = ref<'fit' | 'fill' | 'original' | '16:9' | '4:3'>('fit');
const hoverTime = ref<number | null>(null);
const hoverX = ref(0);
const screenshotFlash = ref(false);
const isLoading = ref(false);
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isDragging = ref(false);
const dragCount = ref(0);
const isSidebarDragOver = ref(false);
const isDraggingProgress = ref(false);

const currentVideo = computed(() => {
  return currentIndex.value >= 0 && currentIndex.value < playlist.value.length
    ? playlist.value[currentIndex.value]
    : null;
});

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

const progress = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

const bufferedProgress = computed(() => {
  if (duration.value === 0) return 0;
  return (buffered.value / duration.value) * 100;
});

const volumePercent = computed(() => {
  return isMuted.value ? 0 : volume.value * 100;
});

const resetHideTimer = () => {
  showControls.value = true;
  if (hideTimer.value) clearTimeout(hideTimer.value);
  if (isPlaying.value) {
    hideTimer.value = setTimeout(() => showControls.value = false, 3500);
  }
};

const togglePlay = () => {
  if (!videoRef.value || !currentVideo.value) return;
  
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {
      toast.error('播放失败');
    });
  } else {
    videoRef.value.pause();
  }
};

const skip = (seconds: number) => {
  if (!videoRef.value) return;
  videoRef.value.currentTime = Math.max(0, Math.min(duration.value, videoRef.value.currentTime + seconds));
};

const toggleMute = () => {
  if (!videoRef.value) return;
  isMuted.value = !isMuted.value;
  videoRef.value.muted = isMuted.value;
};

const handleVolumeChange = (event: MouseEvent) => {
  const bar = volumeRef.value;
  const video = videoRef.value;
  if (!bar || !video) return;
  
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  volume.value = ratio;
  video.volume = ratio;
  isMuted.value = ratio === 0;
  video.muted = ratio === 0;
};

const handleSeek = (event: MouseEvent) => {
  const bar = progressRef.value;
  const video = videoRef.value;
  if (!bar || !video) return;
  
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  video.currentTime = ratio * video.duration;
};

const handleProgressMouseDown = (event: MouseEvent) => {
  event.preventDefault();
  isDraggingProgress.value = true;
  handleSeek(event);
  showControls.value = true;
};

const handleProgressMouseMove = (event: MouseEvent) => {
  if (isDraggingProgress.value) {
    handleProgressHover(event);
    handleSeek(event);
  }
};

const handleProgressMouseUp = () => {
  isDraggingProgress.value = false;
};

const handleProgressHover = (event: MouseEvent) => {
  const bar = progressRef.value;
  if (!bar || !duration.value) return;
  
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  hoverTime.value = ratio * duration.value;
  hoverX.value = event.clientX - rect.left;
};

const handleVideoInfoMouseDown = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (target.closest('.info-close-btn')) return;
  
  videoInfoDragging.value = true;
  videoInfoDragStart.value = {
    x: event.clientX - videoInfoPosition.value.x,
    y: event.clientY - videoInfoPosition.value.y,
  };
};

const handleVideoInfoMouseMove = (event: MouseEvent) => {
  if (!videoInfoDragging.value) return;
  
  videoInfoPosition.value = {
    x: event.clientX - videoInfoDragStart.value.x,
    y: event.clientY - videoInfoDragStart.value.y,
  };
};

const handleVideoInfoMouseUp = () => {
  videoInfoDragging.value = false;
};

const toggleFullscreen = async () => {
  if (!containerRef.value) return;
  
  try {
    if (!document.fullscreenElement) {
      await containerRef.value.requestFullscreen();
      isFullscreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullscreen.value = false;
    }
  } catch (error) {
    console.error('Fullscreen error:', error);
  }
};

const togglePictureInPicture = async () => {
  if (!videoRef.value) return;
  
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.value.requestPictureInPicture();
    }
  } catch (error) {
    console.error('Picture-in-picture error:', error);
    toast.error('画中画模式不可用');
  }
};

const changePlaybackRate = (rate: number) => {
  playbackRate.value = rate;
  if (videoRef.value) {
    videoRef.value.playbackRate = rate;
  }
  showSpeedMenu.value = false;
};

const changeAspectRatio = (ratio: 'fit' | 'fill' | 'original' | '16:9' | '4:3') => {
  aspectRatio.value = ratio;
  showAspectMenu.value = false;
  
  const ratioNames = {
    'fit': '适应窗口',
    'fill': '填充窗口',
    'original': '原始大小',
    '16:9': '16:9',
    '4:3': '4:3'
  };
  
  toast.success(`视频比例: ${ratioNames[ratio]}`);
};

const takeScreenshot = () => {
  if (!videoRef.value) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = videoRef.value.videoWidth;
  canvas.height = videoRef.value.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.drawImage(videoRef.value, 0, 0);
  
  screenshotFlash.value = true;
  setTimeout(() => screenshotFlash.value = false, 300);
  
  canvas.toBlob((blob) => {
    if (!blob) return;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot_${formatTime(currentTime.value).replace(/:/g, '-')}.png`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('截图已保存');
  }, 'image/png');
};

const addVideoFiles = async () => {
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video',
        extensions: ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v']
      }]
    });

    if (!selected) return;

    const files = Array.isArray(selected) ? selected : [selected];

    for (const filePath of files) {
      const videoItem: VideoItem = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: filePath.split(/[/\\]/).pop() || '视频',
        url: convertFileSrc(filePath),
        path: filePath,
        size: 0,
        duration: 0,
        addedAt: Date.now(),
      };

      playlist.value.push(videoItem);

      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = videoItem.url;
      tempVideo.onloadedmetadata = () => {
        videoItem.duration = tempVideo.duration;
      };
    }

    if (currentIndex.value === -1 && playlist.value.length > 0) {
      currentIndex.value = 0;
    }

    toast.success(`已添加 ${files.length} 个视频`);
  } catch (error) {
    console.error('Failed to add videos:', error);
    toast.error('添加视频失败');
  }
};

const removeVideo = (index: number) => {
  if (index === currentIndex.value) {
    if (playlist.value.length === 1) {
      currentIndex.value = -1;
    } else if (index === playlist.value.length - 1) {
      currentIndex.value = index - 1;
    }
  } else if (index < currentIndex.value) {
    currentIndex.value--;
  }
  
  playlist.value.splice(index, 1);
  
  toast.success('已删除视频');
};

const playVideo = (index: number) => {
  currentIndex.value = index;
  if (autoPlay.value && videoRef.value) {
    videoRef.value.play().catch(() => {
      toast.error('播放失败');
    });
  }
};

const playPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  } else if (repeatMode.value === 'all' && playlist.value.length > 0) {
    currentIndex.value = playlist.value.length - 1;
  }
  if (autoPlay.value) isPlaying.value = true;
};

const playNext = () => {
  if (currentIndex.value < playlist.value.length - 1) {
    currentIndex.value++;
  } else if (repeatMode.value === 'all' && playlist.value.length > 0) {
    currentIndex.value = 0;
  }
  if (autoPlay.value) isPlaying.value = true;
};

const clearPlaylist = async () => {
  confirmModalTitle.value = '清空播放列表';
  confirmModalMessage.value = `确定要清空播放列表吗？当前有 ${playlist.value.length} 个视频。`;
  confirmModalCallback.value = () => {
    playlist.value = [];
    currentIndex.value = -1;
    toast.success('播放列表已清空');
  };
  confirmModalVisible.value = true;
};

const handleConfirmOk = () => {
  if (confirmModalCallback.value) {
    confirmModalCallback.value();
  }
  confirmModalVisible.value = false;
  confirmModalCallback.value = null;
};

const handleConfirmCancel = () => {
  confirmModalVisible.value = false;
  confirmModalCallback.value = null;
};

const savePlaylist = async () => {
  if (playlist.value.length === 0) {
    toast.warning('播放列表为空');
    return;
  }

  try {
    const name = `播放列表 ${new Date().toLocaleString('zh-CN')}`;
    const newPlaylist = await videoService.createVideoPlaylist(name);
    currentPlaylistId.value = newPlaylist.id;

    for (const video of playlist.value) {
      await videoService.addVideoToPlaylist(newPlaylist.id, {
        id: video.id,
        name: video.name,
        path: video.path || video.url,
        size: video.size,
        duration: video.duration,
        added_at: video.addedAt,
      });
    }

    toast.success('播放列表已保存');
  } catch (error) {
    toast.error('保存播放列表失败');
    console.error(error);
  }
};

const loadPlaylist = async () => {
  try {
    const playlists = await videoService.getVideoPlaylists();
    if (playlists.length === 0) {
      toast.info('暂无保存的播放列表');
      return;
    }

    const lastPlaylist = playlists[playlists.length - 1];
    currentPlaylistId.value = lastPlaylist.id;

    playlist.value = lastPlaylist.videos.map(v => ({
      id: v.id,
      name: v.name,
      url: v.path.startsWith('blob:') ? v.path : convertFileSrc(v.path),
      path: v.path,
      size: v.size,
      duration: v.duration,
      addedAt: v.added_at,
    }));

    if (playlist.value.length > 0) {
      currentIndex.value = 0;
    }

    toast.success('播放列表已加载');
  } catch (error) {
    toast.error('加载播放列表失败');
    console.error(error);
  }
};

const toggleMultiVideoMode = () => {
  multiVideoMode.value = !multiVideoMode.value;
  toast.info(multiVideoMode.value ? '已切换到多视频播放模式' : '已切换到单视频播放模式');
};

const handleVideoDragStart = (e: DragEvent, video: VideoItem) => {
  if (!multiVideoMode.value) {
    e.preventDefault();
    return;
  }
  
  const videoData = {
    name: video.name,
    path: video.path || video.url,
    url: video.url,
  };
  
  e.dataTransfer?.setData('application/x-video-item', JSON.stringify(videoData));
  e.dataTransfer!.effectAllowed = 'copy';
};

const handleMultiVideoClose = () => {
  multiVideoMode.value = false;
};

const handleAddSelectedVideos = () => {
  if (!multiVideoPlayerRef.value || !currentVideo.value) {
    toast.warning('请先在播放列表中选择一个视频');
    return;
  }

  multiVideoPlayerRef.value.addVideoFromPlaylist({
    name: currentVideo.value.name,
    path: currentVideo.value.path || currentVideo.value.url,
    url: currentVideo.value.url,
  });
};

const handleAddAllVideos = () => {
  if (!multiVideoPlayerRef.value) {
    toast.warning('多视频播放器未初始化');
    return;
  }

  if (playlist.value.length === 0) {
    toast.warning('播放列表为空');
    return;
  }

  let addedCount = 0;
  playlist.value.forEach(video => {
    const exists = multiVideoPlayerRef.value?.videos.some(v => v.path === video.path || v.path === video.url);
    if (!exists) {
      multiVideoPlayerRef.value?.addVideoFromPlaylist({
        name: video.name,
        path: video.path || video.url,
        url: video.url,
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    toast.success(`已添加 ${addedCount} 个视频`);
  } else {
    toast.info('所有视频已在播放列表中');
  }
};

const isVideoInMultiPlayer = (video: VideoItem) => {
  if (!multiVideoPlayerRef.value || !multiVideoMode.value) return false;
  return multiVideoPlayerRef.value.videos.some(v => v.path === video.path || v.path === video.url);
};

const addVideoToMultiPlayer = (video: VideoItem) => {
  if (!multiVideoPlayerRef.value) {
    toast.warning('请先进入多视频播放模式');
    return;
  }
  
  multiVideoPlayerRef.value.addVideoFromPlaylist({
    name: video.name,
    path: video.path || video.url,
    url: video.url,
  });
};

const toggleRepeatMode = () => {
  const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
  const currentModeIndex = modes.indexOf(repeatMode.value);
  repeatMode.value = modes[(currentModeIndex + 1) % modes.length];
  
  const modeNames = { none: '关闭循环', one: '单曲循环', all: '列表循环' };
  toast.success(`循环模式: ${modeNames[repeatMode.value]}`);
};

const showJsonContent = async () => {
  try {
    const content = await invoke<string>('get_all_playlists_json');
    const data = JSON.parse(content);
    
    jsonAllData.value = data;
    jsonTotalCount.value = data.length;
    jsonDisplayCount.value = 100;
    
    const displayData = data.slice(0, jsonDisplayCount.value);
    jsonContent.value = JSON.stringify(displayData, null, 2);
    jsonModalVisible.value = true;
  } catch (error) {
    console.error('Failed to read JSON data:', error);
    toast.error('读取播放列表数据失败');
  }
};

const loadMoreJson = () => {
  jsonDisplayCount.value += 100;
  const displayData = jsonAllData.value.slice(0, jsonDisplayCount.value);
  jsonContent.value = JSON.stringify(displayData, null, 2);
};

const copyJsonContent = async () => {
  try {
    await navigator.clipboard.writeText(jsonContent.value);
    toast.success('已复制到剪贴板');
  } catch (error) {
    console.error('Failed to copy:', error);
    toast.error('复制失败');
  }
};

const openJsonFolder = async () => {
  try {
    const dataPath = await invoke<string>('get_data_dir');
    await fileService.showInFolder(dataPath);
    toast.success('已打开文件夹');
  } catch (error) {
    console.error('Failed to open folder:', error);
    toast.error('打开文件夹失败');
  }
};

const togglePlaylistSelection = (id: string) => {
  if (selectedPlaylists.value.has(id)) {
    selectedPlaylists.value.delete(id);
  } else {
    selectedPlaylists.value.add(id);
  }
  selectedPlaylists.value = new Set(selectedPlaylists.value);
};

const toggleSelectAll = () => {
  if (selectedPlaylists.value.size === jsonAllData.value.length) {
    selectedPlaylists.value = new Set();
  } else {
    selectedPlaylists.value = new Set(jsonAllData.value.map(p => p.id || p.name));
  }
};

const deleteSelectedPlaylists = async () => {
  if (selectedPlaylists.value.size === 0) {
    toast.warning('请先选择要删除的播放列表');
    return;
  }

  confirmModalTitle.value = '确认删除';
  confirmModalMessage.value = `确定要删除 ${selectedPlaylists.value.size} 个播放列表吗？此操作不可恢复。`;
  confirmModalCallback.value = async () => {
    try {
      const ids = Array.from(selectedPlaylists.value);
      for (const id of ids) {
        await invoke('delete_video_playlist', { playlistId: id });
      }
      
      await showJsonContent();
      selectedPlaylists.value = new Set();
      toast.success(`已删除 ${ids.length} 个播放列表`);
    } catch (error) {
      console.error('Failed to delete playlists:', error);
      toast.error('删除失败');
    }
  };
  confirmModalVisible.value = true;
};

const deletePlaylist = async (id: string, name: string) => {
  confirmModalTitle.value = '确认删除';
  confirmModalMessage.value = `确定要删除播放列表「${name}」吗？此操作不可恢复。`;
  confirmModalCallback.value = async () => {
    try {
      await invoke('delete_video_playlist', { playlistId: id });
      await showJsonContent();
      toast.success(`已删除播放列表「${name}」`);
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('删除失败');
    }
  };
  confirmModalVisible.value = true;
};

const onVideoPlay = () => {
  isPlaying.value = true;
  resetHideTimer();
};

const onVideoPause = () => {
  isPlaying.value = false;
  showControls.value = true;
  if (hideTimer.value) clearTimeout(hideTimer.value);
};

const onTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
    if (videoRef.value.buffered.length > 0) {
      buffered.value = videoRef.value.buffered.end(videoRef.value.buffered.length - 1);
    }
  }
};

const onLoadedMetadata = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
    videoRef.value.volume = volume.value;
    isLoading.value = false;
  }
};

const onVideoEnded = () => {
  if (repeatMode.value === 'one') {
    if (videoRef.value) videoRef.value.currentTime = 0;
    return;
  }
  
  if (currentIndex.value < playlist.value.length - 1) {
    playNext();
  } else if (repeatMode.value === 'all' && playlist.value.length > 0) {
    currentIndex.value = 0;
    if (autoPlay.value) isPlaying.value = true;
  } else {
    isPlaying.value = false;
  }
};

const onWaiting = () => {
  isLoading.value = true;
};

const onCanPlay = () => {
  isLoading.value = false;
};

const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3];

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
      volume.value = Math.min(1, volume.value + 0.05);
      if (videoRef.value) {
        videoRef.value.volume = volume.value;
        videoRef.value.muted = false;
      }
      isMuted.value = false;
      resetHideTimer();
      break;
    case 'ArrowDown':
      e.preventDefault();
      volume.value = Math.max(0, volume.value - 0.05);
      if (videoRef.value) videoRef.value.volume = volume.value;
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
    case 'n':
      e.preventDefault();
      playNext();
      break;
    case 'p':
      e.preventDefault();
      playPrevious();
      break;
    case 's':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        takeScreenshot();
      }
      break;
  }
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  dragCount.value++;
  if (e.dataTransfer?.types.includes('Files')) isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragCount.value = Math.max(0, dragCount.value - 1);
  if (dragCount.value === 0) isDragging.value = false;
};

const handleDragOver = (e: DragEvent) => e.preventDefault();

const handleDrop = async (e: DragEvent) => {
  e.preventDefault();
  dragCount.value = 0;
  isDragging.value = false;
  
  if (e.dataTransfer?.files) {
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/') || 
      ['.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v'].some(ext => file.name.endsWith(ext))
    );
    
    if (files.length > 0) {
      for (const file of files) {
        const filePath = (file as any).path || file.name;
        const videoItem: VideoItem = {
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: filePath && !filePath.startsWith('blob:') ? convertFileSrc(filePath) : URL.createObjectURL(file),
          path: filePath,
          size: file.size,
          duration: 0,
          addedAt: Date.now(),
        };
        
        playlist.value.push(videoItem);
        
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = videoItem.url;
        tempVideo.onloadedmetadata = () => {
          videoItem.duration = tempVideo.duration;
        };
      }
      
      if (currentIndex.value === -1 && playlist.value.length > 0) {
        currentIndex.value = 0;
      }
      
      toast.success(`已添加 ${files.length} 个视频`);
    }
  }
};

const handleSidebarDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer?.types.includes('Files')) {
    isSidebarDragOver.value = true;
  }
};

const handleSidebarDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isSidebarDragOver.value = false;
  }
};

const handleSidebarDrop = async (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isSidebarDragOver.value = false;
  
  if (e.dataTransfer?.files) {
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/') || 
      ['.mkv', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.mp4', '.webm', '.ogg'].some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    if (files.length > 0) {
      for (const file of files) {
        const filePath = (file as any).path || file.name;
        const videoItem: VideoItem = {
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: filePath && !filePath.startsWith('blob:') ? convertFileSrc(filePath) : URL.createObjectURL(file),
          path: filePath,
          size: file.size,
          duration: 0,
          addedAt: Date.now(),
        };
        
        playlist.value.push(videoItem);
        
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = videoItem.url;
        tempVideo.onloadedmetadata = () => {
          videoItem.duration = tempVideo.duration;
        };
      }
      
      if (currentIndex.value === -1 && playlist.value.length > 0) {
        currentIndex.value = 0;
      }
      
      toast.success(`已添加 ${files.length} 个视频到播放列表`);
    }
  }
};

onMounted(async () => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  window.addEventListener('keydown', handleKeyDown);
  
  window.addEventListener('dragenter', handleDragEnter);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('drop', handleDrop);
  
  window.addEventListener('mousemove', handleProgressMouseMove);
  window.addEventListener('mouseup', handleProgressMouseUp);
  
  window.addEventListener('mousemove', handleVideoInfoMouseMove);
  window.addEventListener('mouseup', handleVideoInfoMouseUp);
  
  if (autoLoad.value) {
    await loadPlaylist();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  
  window.removeEventListener('dragenter', handleDragEnter);
  window.removeEventListener('dragleave', handleDragLeave);
  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('drop', handleDrop);
  
  window.removeEventListener('mousemove', handleProgressMouseMove);
  window.removeEventListener('mouseup', handleProgressMouseUp);
  
  window.removeEventListener('mousemove', handleVideoInfoMouseMove);
  window.removeEventListener('mouseup', handleVideoInfoMouseUp);
  
  if (hideTimer.value) clearTimeout(hideTimer.value);
  
  playlist.value.forEach(video => {
    if (video.url.startsWith('blob:')) {
      URL.revokeObjectURL(video.url);
    }
  });
});

watch(isPlaying, () => {
  resetHideTimer();
});

watch([autoPlay, autoLoad], () => {
  savePlayerConfig();
});

watch(currentIndex, async () => {
  currentTime.value = 0;
  duration.value = 0;
  buffered.value = 0;
  playbackRate.value = 1;
  showSpeedMenu.value = false;
  showControls.value = true;
  isLoading.value = true;
  
  if (!autoPlay.value) {
    isPlaying.value = false;
  }
  
  if (videoRef.value) {
    videoRef.value.playbackRate = 1;
    videoRef.value.currentTime = 0;
    
    if (!autoPlay.value) {
      videoRef.value.pause();
    } else {
      await nextTick();
      videoRef.value.play().catch(() => {
        isPlaying.value = false;
      });
      isPlaying.value = true;
    }
  }
});
</script>

<template>
  <div class="video-player-page">
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-content">
        <div class="drag-icon">
          <Plus :size="48" />
        </div>
        <p class="drag-title">释放以添加视频</p>
        <p class="drag-subtitle">支持 MP4、WebM、MKV、AVI、MOV 等格式</p>
      </div>
    </div>

    <div class="main-container">
      <div
        ref="containerRef"
        class="video-container"
        :class="{ 'sidebar-open': sidebarOpen, 'empty': !currentVideo, 'drag-over': isDragging }"
        @mousemove="resetHideTimer"
        @mouseleave="() => { if (isPlaying) showControls = false; hoverTime = null; }"
        @click="() => { showSpeedMenu = false; showAspectMenu = false; }"
      >
        <MultiVideoPlayer 
          v-if="multiVideoMode" 
          ref="multiVideoPlayerRef"
          class="multi-video-overlay" 
          @close="handleMultiVideoClose"
          @add-selected="handleAddSelectedVideos"
          @add-all="handleAddAllVideos"
          @toggle-playlist="sidebarOpen = !sidebarOpen"
        />
        
        <div v-if="!currentVideo && !multiVideoMode" class="empty-state">
          <div class="empty-icon">
            <Play :size="64" />
          </div>
          <h2>视频播放器</h2>
          <p>拖放视频文件到窗口中，或点击下方按钮选择文件</p>
          <button class="open-btn" @click="addVideoFiles">
            <Play :size="20" />
            播放视频
          </button>
        </div>
        
        <button 
          v-if="!currentVideo && !multiVideoMode && !sidebarOpen"
          class="show-sidebar-btn"
          @click="sidebarOpen = true"
          title="显示播放列表"
        >
          <List :size="20" />
        </button>

        <template v-else-if="currentVideo && !multiVideoMode">
          <div class="video-wrapper">
            <video
              ref="videoRef"
              class="video-element"
              :class="`aspect-${aspectRatio}`"
              :src="currentVideo.url"
              :loop="repeatMode === 'one'"
              @play="onVideoPlay"
              @pause="onVideoPause"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @ended="onVideoEnded"
              @waiting="onWaiting"
              @canplay="onCanPlay"
              @click="togglePlay"
              @dblclick.prevent="toggleFullscreen"
              preload="auto"
            ></video>
          </div>

          <div v-if="screenshotFlash && !multiVideoMode" class="screenshot-flash"></div>

          <div v-if="isLoading && isPlaying && !multiVideoMode" class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>

          <div v-if="!isPlaying && !isLoading && !multiVideoMode" class="click-overlay" @click="togglePlay"></div>

          <button 
            v-if="!sidebarOpen && !multiVideoMode"
            class="toggle-sidebar-btn left"
            @click="videoInfoVisible = !videoInfoVisible"
            title="视频信息"
          >
            <Info :size="18" />
          </button>

          <button 
            v-if="!sidebarOpen && !multiVideoMode"
            class="toggle-sidebar-btn right"
            @click="sidebarOpen = true"
            title="显示播放列表"
          >
            <List :size="20" />
          </button>

          <div v-if="!multiVideoMode" class="mini-progress" :class="{ visible: !showControls }">
            <div class="mini-progress-bar" :style="{ width: `${progress}%` }"></div>
          </div>

          <div v-if="!multiVideoMode" class="controls-overlay" :class="{ visible: showControls }">
            <div class="controls-gradient"></div>

            <div class="controls-content">
              <div
                ref="progressRef"
                class="progress-bar-container"
                :class="{ dragging: isDraggingProgress }"
                @mousedown="handleProgressMouseDown"
                @mousemove="handleProgressHover"
                @mouseleave="hoverTime = null"
              >
                <div class="progress-line"></div>
                <div class="progress-buffered" :style="{ width: `${bufferedProgress}%` }"></div>
                <div class="progress-played" :style="{ width: `${progress}%` }">
                  <div class="progress-thumb"></div>
                </div>
                
                <div
                  v-if="hoverTime !== null"
                  class="time-tooltip"
                  :style="{ left: `${Math.max(24, Math.min(hoverX, (progressRef?.clientWidth ?? 0) - 24))}px` }"
                >
                  {{ formatTime(hoverTime) }}
                </div>
              </div>

              <div class="controls-row">
                <div class="controls-left">
                  <div class="volume-control">
                    <button class="control-btn" @click="toggleMute">
                      <VolumeX v-if="isMuted || volume === 0" :size="18" />
                      <Volume2 v-else :size="18" />
                    </button>
                    <div
                      ref="volumeRef"
                      class="volume-slider"
                      @click="handleVolumeChange"
                    >
                      <div class="volume-fill" :style="{ width: `${volumePercent}%` }">
                        <div class="volume-thumb"></div>
                      </div>
                    </div>
                  </div>

                  <div class="time-display">
                    <span class="time-current">{{ formatTime(currentTime) }}</span>
                    <span class="time-separator">/</span>
                    <span class="time-duration">{{ formatTime(duration) }}</span>
                  </div>
                </div>

                <div class="controls-center">
                  <button class="control-btn" @click="playPrevious" :disabled="currentIndex === 0 && repeatMode !== 'all'">
                    <SkipBack :size="18" />
                  </button>
                  
                  <button class="play-btn" @click="togglePlay">
                    <Pause v-if="isPlaying" :size="20" />
                    <Play v-else :size="20" />
                  </button>
                  
                  <button class="control-btn" @click="playNext" :disabled="currentIndex === playlist.length - 1 && repeatMode !== 'all'">
                    <SkipForward :size="18" />
                  </button>
                </div>

                <div class="controls-right">
                  <button class="control-btn" @click="takeScreenshot" title="截图">
                    <Camera :size="18" />
                  </button>

                  <button class="control-btn" @click="togglePictureInPicture" title="画中画">
                    <PictureInPicture2 :size="18" />
                  </button>

                  <div class="aspect-control">
                    <button
                      class="aspect-btn"
                      :class="{ active: aspectRatio !== 'fit' }"
                      @click.stop="showAspectMenu = !showAspectMenu"
                      title="视频比例"
                    >
                      <Maximize2 :size="16" />
                    </button>
                    
                    <div v-if="showAspectMenu" class="aspect-menu">
                      <button
                        class="aspect-option"
                        :class="{ active: aspectRatio === 'fit' }"
                        @click="changeAspectRatio('fit')"
                      >
                        <span>适应窗口</span>
                        <span v-if="aspectRatio === 'fit'" class="check-icon">✓</span>
                      </button>
                      <button
                        class="aspect-option"
                        :class="{ active: aspectRatio === 'fill' }"
                        @click="changeAspectRatio('fill')"
                      >
                        <span>填充窗口</span>
                        <span v-if="aspectRatio === 'fill'" class="check-icon">✓</span>
                      </button>
                      <button
                        class="aspect-option"
                        :class="{ active: aspectRatio === 'original' }"
                        @click="changeAspectRatio('original')"
                      >
                        <span>原始大小</span>
                        <span v-if="aspectRatio === 'original'" class="check-icon">✓</span>
                      </button>
                      <button
                        class="aspect-option"
                        :class="{ active: aspectRatio === '16:9' }"
                        @click="changeAspectRatio('16:9')"
                      >
                        <span>16:9</span>
                        <span v-if="aspectRatio === '16:9'" class="check-icon">✓</span>
                      </button>
                      <button
                        class="aspect-option"
                        :class="{ active: aspectRatio === '4:3' }"
                        @click="changeAspectRatio('4:3')"
                      >
                        <span>4:3</span>
                        <span v-if="aspectRatio === '4:3'" class="check-icon">✓</span>
                      </button>
                    </div>
                  </div>

                  <div class="speed-control">
                    <button
                      class="speed-btn"
                      :class="{ active: playbackRate !== 1 }"
                      @click.stop="showSpeedMenu = !showSpeedMenu"
                    >
                      {{ playbackRate === 1 ? '倍速' : `${playbackRate}x` }}
                    </button>
                    
                    <div v-if="showSpeedMenu" class="speed-menu">
                      <button
                        v-for="rate in playbackRates"
                        :key="rate"
                        class="speed-option"
                        :class="{ active: rate === playbackRate }"
                        @click="changePlaybackRate(rate)"
                      >
                        <span>{{ rate === 1 ? '正常' : `${rate}x` }}</span>
                        <span v-if="rate === playbackRate" class="check-icon">✓</span>
                      </button>
                    </div>
                  </div>

                  <button class="control-btn" @click="toggleFullscreen">
                    <Minimize v-if="isFullscreen" :size="18" />
                    <Maximize v-else :size="18" />
                  </button>

                  <button class="control-btn" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'">
                    <List :size="18" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <div class="header-left">
            <button class="close-sidebar-btn" @click="sidebarOpen = false">
              <List :size="20" />
            </button>
            <h3 class="sidebar-title">播放列表</h3>
          </div>
          <div class="video-count">
            <span class="count-dot"></span>
            <span>{{ playlist.length }} 个视频</span>
          </div>
        </div>

        <div 
          class="sidebar-content"
          :class="{ 'drag-over': isSidebarDragOver }"
          @dragover="handleSidebarDragOver"
          @dragleave="handleSidebarDragLeave"
          @drop="handleSidebarDrop"
        >
          <div v-if="playlist.length === 0" class="empty-playlist">
            <h4>播放列表为空</h4>
            <p>拖放视频文件到此处，或点击下方按钮选择文件</p>
            <button class="add-video-btn" @click="addVideoFiles">
              <Plus :size="16" />
              添加视频文件
            </button>
          </div>

          <div v-else class="playlist-items">
            <div
              v-for="(video, index) in playlist"
              :key="video.id"
              class="playlist-item"
              :class="{ 
                active: currentIndex === index, 
                draggable: multiVideoMode,
                'in-multi-player': multiVideoMode && isVideoInMultiPlayer(video)
              }"
              :draggable="multiVideoMode"
              @click="playVideo(index)"
              @dragstart="handleVideoDragStart($event, video)"
            >
              <div class="item-left">
                <div class="item-index">
                  <span v-if="currentIndex !== index">{{ index + 1 }}</span>
                  <Play v-else :size="14" />
                </div>
                <div class="item-info">
                  <h4 class="item-name">
                    {{ video.name }}
                    <span v-if="multiVideoMode && isVideoInMultiPlayer(video)" class="multi-badge">多</span>
                  </h4>
                  <div class="item-meta">
                    <span>{{ formatTime(video.duration) }}</span>
                  </div>
                </div>
              </div>
              <div class="item-actions">
                <button 
                  v-if="multiVideoMode && !isVideoInMultiPlayer(video)" 
                  class="add-to-multi-btn" 
                  @click.stop="addVideoToMultiPlayer(video)" 
                  title="添加到多视频播放"
                >
                  <Plus :size="14" />
                </button>
                <button class="remove-btn" @click.stop="removeVideo(index)" title="删除">
                  <X :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="footer-row">
            <div class="footer-group">
              <span class="footer-group-label">播放</span>
              <div class="footer-btns">
                <button
                  class="fbtn icon-only"
                  :class="{ active: repeatMode !== 'none' }"
                  @click="toggleRepeatMode"
                  :title="repeatMode === 'none' ? '不循环' : repeatMode === 'one' ? '单曲循环' : '列表循环'"
                >
                  <Repeat1 v-if="repeatMode === 'one'" :size="14" />
                  <Repeat v-else :size="14" />
                </button>
                <button class="fbtn icon-only" :class="{ active: autoPlay }" @click="autoPlay = !autoPlay" title="自动播放">
                  <Play :size="14" />
                </button>
                <button class="fbtn icon-only" :class="{ active: autoLoad }" @click="autoLoad = !autoLoad" :title="autoLoad ? '进入页面自动加载播放列表 (已开启)' : '进入页面自动加载播放列表 (已关闭)'">
                  <List :size="14" />
                </button>
              </div>
            </div>
            <div class="footer-group">
              <span class="footer-group-label">列表</span>
              <div class="footer-btns">
                <button class="fbtn icon-only primary" @click="addVideoFiles" title="添加视频">
                  <Plus :size="14" />
                </button>
                <button class="fbtn icon-only" @click="savePlaylist" title="保存列表">
                  <Save :size="14" />
                </button>
                <button class="fbtn icon-only" @click="loadPlaylist" title="加载列表">
                  <List :size="14" />
                </button>
                <button class="fbtn icon-only" @click="showJsonContent" title="查看JSON">
                  <FileJson :size="14" />
                </button>
                <button class="fbtn icon-only danger" @click="clearPlaylist" title="清空列表">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          <button
            class="fbtn full-width"
            :class="{ active: multiVideoMode }"
            @click="toggleMultiVideoMode"
          >
            <Grid3X3 :size="14" />
            {{ multiVideoMode ? '退出多视频模式' : '多视频播放模式' }}
          </button>
        </div>
      </aside>
    </div>

    <Modal
      v-model:visible="jsonModalVisible"
      :title="`播放列表管理 (${jsonTotalCount} 条)`"
      width="950px"
    >
      <div class="json-modal-wrapper">
        <div class="json-left-panel">
          <div class="panel-header">
            <div class="panel-title">
              <List :size="16" />
              <span>播放列表</span>
            </div>
            <div class="panel-actions">
              <label class="select-all-checkbox">
                <input
                  type="checkbox"
                  :checked="jsonAllData.length > 0 && selectedPlaylists.size === jsonAllData.length"
                  @change="toggleSelectAll"
                />
                <span>全选</span>
              </label>
            </div>
          </div>
          <div class="json-playlist-list">
            <div
              v-for="(item, index) in jsonAllData"
              :key="item.id || index"
              class="json-playlist-item"
              :class="{ selected: selectedPlaylists.has(item.id || item.name) }"
              @click="togglePlaylistSelection(item.id || item.name)"
            >
              <input
                type="checkbox"
                :checked="selectedPlaylists.has(item.id || item.name)"
                class="json-item-checkbox"
                @click.stop
              />
              <div class="json-item-icon">
                <List :size="14" />
              </div>
              <div class="json-item-info">
                <div class="json-item-name">{{ item.name || '未命名' }}</div>
                <div class="json-item-meta">
                  <span class="meta-videos">{{ item.videos?.length || 0 }} 个视频</span>
                  <span v-if="item.createdAt" class="meta-date">{{ new Date(item.createdAt).toLocaleDateString() }}</span>
                </div>
              </div>
              <button
                class="json-item-delete-btn"
                @click.stop="deletePlaylist(item.id || item.name, item.name || '未命名')"
                title="删除"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <div v-if="jsonAllData.length === 0" class="json-empty-list">
              <FileJson :size="32" />
              <p>暂无保存的播放列表</p>
            </div>
          </div>
        </div>
        <div class="json-right-panel">
          <div class="panel-header">
            <div class="view-mode-toggle">
              <button
                class="mode-btn"
                :class="{ active: jsonViewMode === 'list' }"
                @click="jsonViewMode = 'list'"
              >
                <List :size="14" />
                详情
              </button>
              <button
                class="mode-btn"
                :class="{ active: jsonViewMode === 'json' }"
                @click="jsonViewMode = 'json'"
              >
                <FileJson :size="14" />
                JSON
              </button>
            </div>
          </div>
          <div v-if="jsonViewMode === 'list'" class="json-detail-panel">
            <div v-if="selectedPlaylists.size === 1" class="detail-content">
              <div class="detail-header">
                <div class="detail-title">
                  {{ (() => {
                    const id = Array.from(selectedPlaylists)[0];
                    const item = jsonAllData.find(p => (p.id || p.name) === id);
                    return item?.name || '未命名';
                  })()}}
                </div>
                <div class="detail-stats">
                  {{ (() => {
                    const id = Array.from(selectedPlaylists)[0];
                    const item = jsonAllData.find(p => (p.id || p.name) === id);
                    return item?.videos?.length || 0;
                  })() }} 个视频
                </div>
              </div>
              <div class="detail-list">
                <div
                  v-for="(video, idx) in (() => {
                    const id = Array.from(selectedPlaylists)[0];
                    const item = jsonAllData.find(p => (p.id || p.name) === id);
                    return item?.videos || [];
                  })()"
                  :key="idx"
                  class="detail-video-item"
                >
                  <div class="video-item-index">{{ idx + 1 }}</div>
                  <div class="video-item-info">
                    <div class="video-item-name">{{ video.name }}</div>
                    <div class="video-item-meta">
                      <span v-if="video.duration">{{ formatTime(video.duration) }}</span>
                      <span v-if="video.size">{{ formatFileSize(video.size) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="detail-placeholder">
              <FileJson :size="48" />
              <p>选择一个播放列表查看详情</p>
              <span class="placeholder-hint">点击左侧列表项查看视频详情</span>
            </div>
          </div>
          <div v-else class="json-content-wrapper">
            <div class="json-content-header">
              <span class="json-count">显示 {{ Math.min(jsonDisplayCount, jsonTotalCount) }} / {{ jsonTotalCount }} 条</span>
            </div>
            <pre class="json-content">{{ jsonContent }}</pre>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="json-footer">
          <div class="footer-left">
            <button 
              v-if="selectedPlaylists.size > 0"
              class="json-btn danger"
              @click="deleteSelectedPlaylists"
            >
              <Trash2 :size="14" />
              删除选中 ({{ selectedPlaylists.size }})
            </button>
            <button 
              v-if="jsonViewMode === 'json' && jsonDisplayCount < jsonTotalCount"
              class="json-btn secondary"
              @click="loadMoreJson"
            >
              加载更多 (还剩 {{ jsonTotalCount - jsonDisplayCount }} 条)
            </button>
          </div>
          <div class="footer-right">
            <button class="json-btn secondary" @click="openJsonFolder">
              <FolderOpen :size="14" />
              打开文件夹
            </button>
            <button class="json-btn secondary" @click="jsonModalVisible = false">
              关闭
            </button>
            <button v-if="jsonViewMode === 'json'" class="json-btn primary" @click="copyJsonContent">
              复制内容
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <Teleport to="body">
      <Transition name="confirm-pop">
        <div v-if="confirmModalVisible" class="confirm-modal">
          <div class="confirm-header">
            <div class="confirm-icon">
              <Trash2 :size="20" />
            </div>
            <span class="confirm-title">{{ confirmModalTitle }}</span>
          </div>
          <p class="confirm-message">{{ confirmModalMessage }}</p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="handleConfirmCancel">取消</button>
            <button class="confirm-btn danger" @click="handleConfirmOk">确定清空</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition name="video-info-slide">
      <div 
        v-if="videoInfoVisible && currentVideo" 
        class="video-info-panel"
        :class="{ dragging: videoInfoDragging }"
        :style="{
          left: videoInfoPosition.x === 0 ? '50%' : `${videoInfoPosition.x}px`,
          top: `${videoInfoPosition.y}px`,
          transform: videoInfoPosition.x === 0 ? 'translateX(-50%)' : 'none'
        }"
        @mousedown="handleVideoInfoMouseDown"
      >
        <div class="info-panel-header">
          <Info :size="14" />
          <span>视频信息</span>
          <button class="info-close-btn" @click="videoInfoVisible = false">
            <X :size="12" />
          </button>
        </div>
        <div class="info-panel-body">
          <div class="info-item">
            <span class="info-label">文件名</span>
            <span class="info-value name">{{ currentVideo.name }}</span>
          </div>
          <div class="info-row">
            <div class="info-item half">
              <span class="info-label">时长</span>
              <span class="info-value">{{ formatTime(currentVideo.duration) }}</span>
            </div>
            <div class="info-item half">
              <span class="info-label">大小</span>
              <span class="info-value">{{ formatFileSize(currentVideo.size) }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-item half">
              <span class="info-label">进度</span>
              <span class="info-value">{{ progress.toFixed(1) }}%</span>
            </div>
            <div class="info-item half">
              <span class="info-label">状态</span>
              <span class="info-value">
                <span class="status-dot" :class="{ playing: isPlaying }"></span>
                {{ isPlaying ? '播放中' : '已暂停' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.video-player-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
}

.video-player-page * {
  user-select: none;
  -webkit-user-select: none;
}

.video-player-page input,
.video-player-page textarea,
.video-player-page .json-content {
  user-select: text;
  -webkit-user-select: text;
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  animation: dragFadeIn 0.2s ease;
}

@keyframes dragFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 64px;
  border-radius: 24px;
  border: 2px dashed var(--primary-color);
  background-color: var(--primary-light);
  animation: dragPulse 2s ease-in-out infinite;
}

@keyframes dragPulse {
  0%, 100% {
    border-color: var(--primary-color);
    box-shadow: 0 0 20px rgba(var(--primary-color), 0.3);
  }
  50% {
    border-color: rgba(var(--primary-color), 0.6);
    box-shadow: 0 0 40px rgba(var(--primary-color), 0.5);
  }
}

.drag-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-light);
  border: 2px solid var(--primary-color);
  color: var(--primary-color);
  animation: dragIconBounce 1s ease-in-out infinite;
}

@keyframes dragIconBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.drag-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.drag-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.video-container {
  flex: 1;
  position: relative;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.4s ease;
}

.video-container.drag-over {
  background-color: rgba(var(--primary-color), 0.1);
}

.video-container.drag-over::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px dashed var(--primary-color);
  border-radius: 16px;
  pointer-events: none;
  animation: dragBorderPulse 1s ease-in-out infinite;
}

@keyframes dragBorderPulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.video-container.empty {
  background-color: transparent;
}

.video-container.sidebar-open {
  margin-right: 0;
}

.multi-video-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
}

.empty-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 24px;
}

.open-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.open-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.show-sidebar-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}

.show-sidebar-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}

.video-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.video-element {
  cursor: pointer;
  pointer-events: auto;
  max-width: 100%;
  max-height: 100%;
  transition: all 0.3s ease;
}

.video-element.aspect-fit {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.video-element.aspect-fill {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-element.aspect-original {
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
}

.video-element.aspect-16\:9 {
  aspect-ratio: 16 / 9;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}

.video-element.aspect-4\:3 {
  aspect-ratio: 4 / 3;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
}

.screenshot-flash {
  position: absolute;
  inset: 0;
  background-color: white;
  pointer-events: none;
  z-index: 30;
  animation: flash 0.3s ease-out forwards;
}

@keyframes flash {
  from { opacity: 1; }
  to { opacity: 0; }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 20;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.click-overlay {
  position: absolute;
  inset: 0;
  cursor: pointer;
  z-index: 10;
}

.toggle-sidebar-btn {
  position: absolute;
  top: 16px;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}

.toggle-sidebar-btn.left {
  left: 16px;
}

.toggle-sidebar-btn.right {
  right: 16px;
}

.video-container:hover .toggle-sidebar-btn {
  opacity: 1;
  transform: scale(1);
}

.toggle-sidebar-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mini-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.mini-progress.visible {
  opacity: 1;
}

.mini-progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.1s ease;
}

.controls-overlay {
  position: absolute;
  inset-x: 0;
  bottom: 0;
  z-index: 20;
  opacity: 0;
  transform: translateY(12px);
  pointer-events: none;
  transition: all 0.3s ease;
}

.controls-overlay.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.controls-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4));
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.controls-content {
  position: relative;
  padding: 16px 16px 14px;
}

.progress-bar-container {
  position: relative;
  height: 6px;
  width: 100%;
  cursor: pointer;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.3);
  margin-bottom: 14px;
  transition: height 0.3s ease;
}

.progress-bar-container:hover {
  height: 8px;
}

.progress-bar-container.dragging {
  height: 10px;
  cursor: grabbing;
}

.progress-bar-container.dragging .progress-thumb {
  opacity: 1;
  transform: translateY(-50%) scale(1.2);
}

.progress-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  bottom: 2px;
  background-color: rgba(255, 255, 255, 0.7);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.progress-bar-container:hover .progress-line {
  opacity: 0.9;
}

.progress-buffered {
  position: absolute;
  height: 100%;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.4);
}

.progress-played {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background-color: var(--primary-color);
  box-shadow: 0 0 10px var(--primary-color);
  transition: width 0.1s ease;
}

.progress-thumb {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 0 10px var(--primary-color);
  opacity: 0;
  transform: translateY(-50%) scale(0.75);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.5);
}

.progress-bar-container:hover .progress-thumb {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.time-tooltip {
  position: absolute;
  top: -48px;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 11px;
  font-family: monospace;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.controls-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-slider {
  width: 0;
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: width 0.3s ease;
}

.volume-control:hover .volume-slider {
  width: 80px;
}

.volume-fill {
  height: 100%;
  border-radius: 999px;
  background-color: white;
  position: relative;
  transition: width 0.1s ease;
}

.volume-thumb {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.time-display {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 12px;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.6);
}

.time-current {
  color: rgba(255, 255, 255, 0.9);
}

.time-separator {
  margin: 0 4px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--primary-color);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.play-btn:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.aspect-control {
  position: relative;
}

.aspect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aspect-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.aspect-btn.active {
  color: var(--primary-color);
}

.aspect-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  min-width: 140px;
  background-color: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}

.aspect-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 16px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.aspect-option:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.aspect-option.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.speed-control {
  position: relative;
}

.speed-btn {
  padding: 6px 10px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-family: monospace;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-btn.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  border-color: rgba(var(--primary-color), 0.3);
}

.speed-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  min-width: 120px;
  background-color: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}

.speed-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 16px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-option:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.speed-option.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.check-icon {
  color: var(--primary-color);
  font-weight: bold;
}

.sidebar {
  width: 0;
  background-color: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transition: all 0.4s ease;
}

.sidebar.open {
  width: 384px;
  opacity: 1;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-sidebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-sidebar-btn:hover {
  background-color: var(--bg-tertiary);
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.video-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--bg-tertiary);
  font-size: 12px;
  color: var(--text-secondary);
}

.count-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--primary-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.sidebar-content.drag-over {
  background-color: rgba(var(--primary-color), 0.1);
}

.sidebar-content.drag-over::before {
  content: '释放以添加视频';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  background-color: var(--primary-color);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10;
  pointer-events: none;
}

.empty-playlist {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 32px;
}

.empty-playlist h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-playlist p {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.add-video-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-video-btn:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.playlist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-user-drag: none;
}

.playlist-item.draggable {
  cursor: grab;
}

.playlist-item.draggable:active {
  cursor: grabbing;
}

.playlist-item.dragging {
  opacity: 0.6;
  transform: scale(0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.playlist-item:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.playlist-item.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.playlist-item.in-multi-player {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-index {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.playlist-item.active .item-index {
  background-color: rgba(var(--primary-color), 0.3);
  color: var(--primary-color);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.multi-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--primary-color);
  color: white;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.playlist-item:hover .item-actions {
  opacity: 1;
}

.add-to-multi-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-to-multi-btn:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg-tertiary);
}

.footer-row {
  display: flex;
  gap: 12px;
}

.footer-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-group-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 2px;
}

.footer-btns {
  display: flex;
  gap: 4px;
}

.fbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 12px;
  font-weight: 500;
}

.fbtn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background-color: var(--bg-primary);
}

.fbtn.icon-only {
  width: 34px;
  height: 34px;
}

.fbtn.icon-only.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.fbtn.icon-only.primary:hover {
  opacity: 0.9;
}

.fbtn.icon-only.danger {
  border-color: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}

.fbtn.icon-only.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.fbtn.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.fbtn.full-width {
  width: 100%;
  height: 36px;
  padding: 0 14px;
}

.fbtn.full-width.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.json-modal-wrapper {
  display: flex;
  gap: 0;
  background-color: var(--bg-tertiary);
  border-radius: 12px;
  overflow: hidden;
  max-height: 70vh;
  min-height: 500px;
  border: 1px solid var(--border-color);
}

.json-left-panel {
  width: 340px;
  background-color: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
}

.json-right-panel {
  flex: 1;
  background-color: var(--bg-tertiary);
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.panel-header {
  padding: 14px 16px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-title svg {
  color: var(--primary-color);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-all-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.select-all-checkbox:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.select-all-checkbox input {
  cursor: pointer;
  accent-color: var(--primary-color);
}

.json-playlist-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.json-playlist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 6px;
  background-color: var(--bg-tertiary);
  border: 1px solid transparent;
}

.json-playlist-item:hover {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  transform: translateX(2px);
}

.json-playlist-item.selected {
  background-color: rgba(var(--primary-color-rgb, 102, 126, 234), 0.12);
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.json-item-checkbox {
  cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--primary-color);
  width: 16px;
  height: 16px;
}

.json-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.json-playlist-item.selected .json-item-icon {
  background-color: var(--primary-color);
  color: white;
}

.json-item-info {
  flex: 1;
  min-width: 0;
}

.json-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.json-item-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.meta-videos {
  color: var(--primary-color);
  font-weight: 500;
}

.meta-date {
  opacity: 0.8;
}

.json-item-delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}

.json-playlist-item:hover .json-item-delete-btn {
  opacity: 1;
}

.json-item-delete-btn:hover {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.json-empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: var(--text-tertiary);
  gap: 12px;
}

.json-empty-list p {
  margin: 0;
  font-size: 13px;
}

.view-mode-toggle {
  display: flex;
  gap: 2px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  padding: 3px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.mode-btn.active {
  background-color: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.json-detail-panel {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: var(--bg-secondary);
}

.detail-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border-color);
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-stats {
  font-size: 12px;
  color: var(--primary-color);
  background-color: rgba(var(--primary-color-rgb, 102, 126, 234), 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.detail-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-video-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.detail-video-item:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-primary);
}

.video-item-index {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.video-item-info {
  flex: 1;
  min-width: 0;
}

.video-item-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.video-item-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.detail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  gap: 16px;
  padding: 32px;
}

.detail-placeholder p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.placeholder-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.json-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.json-content-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  flex-shrink: 0;
}

.json-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.json-content {
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-tertiary);
}

.json-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding-top: 8px;
}

.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.json-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  white-space: nowrap;
}

.json-btn.secondary {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.json-btn.secondary:hover {
  background-color: var(--bg-secondary);
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
}

.json-btn.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.json-btn.primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 102, 126, 234), 0.3);
}

.json-btn.danger {
  background-color: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.json-btn.danger:hover {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  transform: translateY(-1px);
}

.json-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.confirm-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3000;
  background-color: var(--bg-primary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  padding: 20px 24px;
  min-width: 320px;
  max-width: 400px;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.confirm-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(239, 68, 68, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-message {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.confirm-btn.cancel {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.confirm-btn.cancel:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.confirm-btn.danger {
  background-color: #ef4444;
  color: white;
}

.confirm-btn.danger:hover {
  background-color: #dc2626;
}

.confirm-pop-enter-active {
  animation: confirmPopIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-pop-leave-active {
  animation: confirmPopOut 0.2s ease-in;
}

@keyframes confirmPopIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes confirmPopOut {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.92);
  }
}

.video-info-panel {
  position: fixed;
  z-index: 2500;
  background-color: var(--bg-primary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  min-width: 300px;
  max-width: 400px;
  overflow: hidden;
  cursor: move;
  user-select: none;
}

.video-info-panel.dragging {
  cursor: grabbing;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.info-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-close-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.info-close-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.info-panel-body {
  padding: 10px 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.info-item.half {
  flex: 1;
  padding: 4px 8px;
}

.info-row {
  display: flex;
  gap: 0;
  margin-top: 4px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
  overflow: hidden;
}

.info-label {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  width: 40px;
}

.info-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-value.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--primary-color);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  flex-shrink: 0;
}

.status-dot.playing {
  background-color: #22c55e;
  animation: statusPulse 1.5s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.video-info-slide-enter-active {
  animation: infoFadeIn 0.25s ease-out;
}

.video-info-slide-leave-active {
  animation: infoFadeOut 0.2s ease-in;
}

@keyframes infoFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes infoFadeOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
