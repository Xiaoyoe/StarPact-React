<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/composables/useToast';
import {
  Play, Pause, Volume2, VolumeX, X, Plus, Minus, Grid3X3,
  Maximize2, Minimize2, Settings, PictureInPicture, LayoutGrid, List,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, Minimize, SkipBack, SkipForward, Repeat, Repeat1,
  Columns, Rows
} from 'lucide-vue-next';

const toast = useToast();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'add-selected'): void;
  (e: 'add-all'): void;
  (e: 'toggle-playlist'): void;
}>();

interface VideoItem {
  id: string;
  name: string;
  path: string;
  url: string;
  duration: number;
  currentTime: number;
  volume: number;
  muted: boolean;
  isPlaying: boolean;
  aspectRatio: 'contain' | 'cover' | 'fill';
  orientation: 'landscape' | 'portrait' | 'unknown';
  videoWidth: number;
  videoHeight: number;
}

const videos = ref<VideoItem[]>([]);
const videoElements = ref<Map<string, HTMLVideoElement>>(new Map());
const globalVolume = ref(1);
const globalMuted = ref(false);
const isDraggingOver = ref(false);
const showBottomToolbar = ref(true);
const globalAspectRatio = ref<'contain' | 'cover' | 'fill'>('contain');
const showVolumeSlider = ref(false);
const globalPlaybackRate = ref(1);
const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
const loopMode = ref<'none' | 'all' | 'one'>('none');
const columnsPerRow = ref(3);
const layoutMode = ref<'normal' | 'separated'>('normal');
const draggingVideoId = ref<string | null>(null);
const confirmModalVisible = ref(false);
const toolbarContentRef = ref<HTMLElement | null>(null);

const scrollToolbar = (amount: number) => {
  if (toolbarContentRef.value) {
    toolbarContentRef.value.scrollBy({ left: amount, behavior: 'smooth' });
  }
};

let longPressInterval: number | null = null;
let isLongPress = false;

const gridConfig = computed(() => {
  const count = videos.value.length;
  const cols = columnsPerRow.value;
  if (count <= 1) return { cols: 1, rows: 1 };
  return { cols, rows: Math.ceil(count / cols) };
});

const gridStyle = computed(() => {
  return {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    gap: '8px',
    padding: '8px',
  };
});

const rowStyle = computed(() => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${columnsPerRow.value}, 1fr)`,
    gap: '8px',
    width: '100%',
    minHeight: '300px',
    flex: '0 0 auto',
  };
});

const videoRows = computed(() => {
  const config = gridConfig.value;
  const videosPerRow = config.cols;
  const rows: VideoItem[][] = [];
  
  for (let i = 0; i < videos.value.length; i += videosPerRow) {
    rows.push(videos.value.slice(i, i + videosPerRow));
  }
  
  return rows;
});

const landscapeVideos = computed(() => {
  return videos.value.filter(v => v.orientation === 'landscape');
});

const portraitVideos = computed(() => {
  return videos.value.filter(v => v.orientation === 'portrait');
});

const unknownVideos = computed(() => {
  return videos.value.filter(v => v.orientation === 'unknown');
});

const landscapeRows = computed(() => {
  if (layoutMode.value !== 'separated') return [];
  const videosPerRow = columnsPerRow.value;
  const rows: VideoItem[][] = [];
  const vids = landscapeVideos.value;
  
  for (let i = 0; i < vids.length; i += videosPerRow) {
    rows.push(vids.slice(i, i + videosPerRow));
  }
  
  return rows;
});

const portraitRows = computed(() => {
  if (layoutMode.value !== 'separated') return [];
  const videosPerRow = columnsPerRow.value;
  const rows: VideoItem[][] = [];
  const vids = portraitVideos.value;
  
  for (let i = 0; i < vids.length; i += videosPerRow) {
    rows.push(vids.slice(i, i + videosPerRow));
  }
  
  return rows;
});

const unknownRows = computed(() => {
  if (layoutMode.value !== 'separated') return [];
  const videosPerRow = columnsPerRow.value;
  const rows: VideoItem[][] = [];
  const vids = unknownVideos.value;
  
  for (let i = 0; i < vids.length; i += videosPerRow) {
    rows.push(vids.slice(i, i + videosPerRow));
  }
  
  return rows;
});

const toggleLayoutMode = () => {
  layoutMode.value = layoutMode.value === 'normal' ? 'separated' : 'normal';
  toast.info(layoutMode.value === 'normal' ? '切换到普通布局' : '切换到横竖屏分离布局');
};

const adjustColumns = (delta: number) => {
  columnsPerRow.value = Math.max(2, Math.min(6, columnsPerRow.value + delta));
};

const addVideos = async () => {
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: 'Video',
        extensions: ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v']
      }]
    });

    if (selected && Array.isArray(selected)) {
      for (const path of selected) {
        const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        videos.value.push({
          id: videoId,
          name: path.split(/[/\\]/).pop() || '视频',
          path,
          url: convertFileSrc(path),
          duration: 0,
          currentTime: 0,
          volume: globalVolume.value,
          muted: globalMuted.value,
          isPlaying: false,
          aspectRatio: globalAspectRatio.value,
          orientation: 'unknown',
          videoWidth: 0,
          videoHeight: 0,
        });
      }
      toast.success(`已添加 ${selected.length} 个视频`);
    }
  } catch (error) {
    console.error('Failed to add videos:', error);
    toast.error('添加视频失败');
  }
};

const addVideoFromPlaylist = (videoData: { name: string; path: string; url: string }) => {
  const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  let videoUrl = videoData.url;
  
  if (videoData.url.startsWith('blob:')) {
    if (videoData.path && !videoData.path.startsWith('blob:')) {
      videoUrl = convertFileSrc(videoData.path);
    }
  } else if (videoData.path && !videoData.url.startsWith('http') && !videoData.url.startsWith('asset:')) {
    videoUrl = convertFileSrc(videoData.path);
  }
  
  videos.value.push({
    id: videoId,
    name: videoData.name,
    path: videoData.path,
    url: videoUrl,
    duration: 0,
    currentTime: 0,
    volume: globalVolume.value,
    muted: globalMuted.value,
    isPlaying: false,
    aspectRatio: globalAspectRatio.value,
    orientation: 'unknown',
    videoWidth: 0,
    videoHeight: 0,
  });
  toast.success(`已添加: ${videoData.name}`);
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
  
  const types = e.dataTransfer?.types;
  if (types && (types.includes('application/x-video-item') || Array.from(types).includes('application/x-video-item'))) {
    isDraggingOver.value = true;
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDraggingOver.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDraggingOver.value = false;
  
  const videoData = e.dataTransfer?.getData('application/x-video-item');
  if (videoData) {
    try {
      const video = JSON.parse(videoData);
      addVideoFromPlaylist(video);
    } catch (error) {
      console.error('Failed to parse video data:', error);
    }
  }
};

defineExpose({
  addVideoFromPlaylist,
  videos,
});

const removeVideo = (videoId: string) => {
  const element = videoElements.value.get(videoId);
  if (element) {
    element.pause();
  }
  videoElements.value.delete(videoId);
  videos.value = videos.value.filter(v => v.id !== videoId);
};

const clearAll = () => {
  confirmModalVisible.value = true;
};

const handleConfirmClear = () => {
  videoElements.value.forEach(element => element.pause());
  videoElements.value.clear();
  videos.value = [];
  toast.success('已清空所有视频');
  confirmModalVisible.value = false;
};

const handleCancelClear = () => {
  confirmModalVisible.value = false;
};

const togglePlay = (videoId?: string) => {
  if (videoId) {
    const video = videos.value.find(v => v.id === videoId);
    const element = videoElements.value.get(videoId);
    if (video && element) {
      if (video.isPlaying) {
        element.pause();
        video.isPlaying = false;
      } else {
        element.play();
        video.isPlaying = true;
      }
    }
  } else {
    const allPlaying = videos.value.every(v => v.isPlaying);
    videos.value.forEach(video => {
      const element = videoElements.value.get(video.id);
      if (element) {
        if (allPlaying) {
          element.pause();
          video.isPlaying = false;
        } else {
          element.play();
          video.isPlaying = true;
        }
      }
    });
  }
};

const setVolume = (videoId: string, volume: number) => {
  const element = videoElements.value.get(videoId);
  const video = videos.value.find(v => v.id === videoId);
  if (element && video) {
    element.volume = volume;
    video.volume = volume;
  }
};

const toggleMute = (videoId: string) => {
  const element = videoElements.value.get(videoId);
  const video = videos.value.find(v => v.id === videoId);
  if (element && video) {
    element.muted = !video.muted;
    video.muted = !video.muted;
  }
};

const setGlobalVolume = (volume: number) => {
  globalVolume.value = volume;
  videos.value.forEach(video => {
    const element = videoElements.value.get(video.id);
    if (element) {
      element.volume = volume;
      video.volume = volume;
    }
  });
};

const toggleGlobalMute = () => {
  globalMuted.value = !globalMuted.value;
  videos.value.forEach(video => {
    const element = videoElements.value.get(video.id);
    if (element) {
      element.muted = globalMuted.value;
      video.muted = globalMuted.value;
    }
  });
};

const handleVideoReady = (videoId: string, event: Event) => {
  const element = event.target as HTMLVideoElement;
  videoElements.value.set(videoId, element);
  
  const video = videos.value.find(v => v.id === videoId);
  if (video) {
    video.duration = element.duration;
    video.videoWidth = element.videoWidth;
    video.videoHeight = element.videoHeight;
    
    if (element.videoWidth > 0 && element.videoHeight > 0) {
      video.orientation = element.videoWidth >= element.videoHeight ? 'landscape' : 'portrait';
    } else {
      video.orientation = 'unknown';
    }
    
    element.volume = video.volume;
    element.muted = video.muted;
  }
};

const handleTimeUpdate = (videoId: string, event: Event) => {
  const element = event.target as HTMLVideoElement;
  const video = videos.value.find(v => v.id === videoId);
  if (video) {
    video.currentTime = element.currentTime;
  }
};

const handleSeek = (videoId: string, event: MouseEvent) => {
  const element = videoElements.value.get(videoId);
  const video = videos.value.find(v => v.id === videoId);
  if (element && video) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const time = ratio * video.duration;
    element.currentTime = time;
    video.currentTime = time;
  }
};

const handleProgressMouseDown = (videoId: string, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  draggingVideoId.value = videoId;
  handleSeek(videoId, event);
};

const handleProgressMouseMove = (videoId: string, event: MouseEvent) => {
  if (draggingVideoId.value === videoId) {
    handleSeek(videoId, event);
  }
};

const handleProgressMouseUp = () => {
  draggingVideoId.value = null;
};

const setAspectRatio = (videoId: string, ratio: 'contain' | 'cover' | 'fill') => {
  const video = videos.value.find(v => v.id === videoId);
  if (video) {
    video.aspectRatio = ratio;
  }
};

const setGlobalAspectRatio = (ratio: 'contain' | 'cover' | 'fill') => {
  globalAspectRatio.value = ratio;
  videos.value.forEach(video => {
    video.aspectRatio = ratio;
  });
};

const globalSeek = (delta: number) => {
  videos.value.forEach(video => {
    const element = videoElements.value.get(video.id);
    if (element && video.duration > 0) {
      const newTime = Math.max(0, Math.min(video.duration, element.currentTime + delta));
      element.currentTime = newTime;
      video.currentTime = newTime;
    }
  });
};

const startLongPressSeek = (delta: number) => {
  isLongPress = false;
  const startTime = Date.now();
  
  longPressInterval = window.setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed > 500) {
      isLongPress = true;
      globalSeek(delta * 2);
    }
  }, 100);
};

const stopLongPressSeek = () => {
  if (longPressInterval) {
    clearInterval(longPressInterval);
    longPressInterval = null;
  }
};

const cyclePlaybackRate = () => {
  const currentIndex = playbackRates.indexOf(globalPlaybackRate.value);
  const nextIndex = (currentIndex + 1) % playbackRates.length;
  globalPlaybackRate.value = playbackRates[nextIndex];
  
  videos.value.forEach(video => {
    const element = videoElements.value.get(video.id);
    if (element) {
      element.playbackRate = globalPlaybackRate.value;
    }
  });
};

const toggleLoopMode = () => {
  if (loopMode.value === 'none') {
    loopMode.value = 'all';
  } else if (loopMode.value === 'all') {
    loopMode.value = 'one';
  } else {
    loopMode.value = 'none';
  }
};

const handleVideoEnded = (videoId: string) => {
  const video = videos.value.find(v => v.id === videoId);
  const element = videoElements.value.get(videoId);
  
  if (video && element) {
    video.isPlaying = false;
    
    if (loopMode.value === 'one') {
      element.currentTime = 0;
      element.play();
      video.isPlaying = true;
    } else if (loopMode.value === 'all') {
      const currentIndex = videos.value.findIndex(v => v.id === videoId);
      if (currentIndex < videos.value.length - 1) {
        const nextVideo = videos.value[currentIndex + 1];
        const nextElement = videoElements.value.get(nextVideo.id);
        if (nextElement) {
          nextElement.play();
          nextVideo.isPlaying = true;
        }
      } else {
        const firstVideo = videos.value[0];
        const firstElement = videoElements.value.get(firstVideo.id);
        if (firstElement) {
          firstElement.currentTime = 0;
          firstElement.play();
          firstVideo.isPlaying = true;
        }
      }
    }
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getProgressColor = (video: VideoItem) => {
  if (video.duration === 0) return 'rgba(255, 255, 255, 0.5)';
  const progress = video.currentTime / video.duration;
  
  if (progress >= 1) return 'rgba(239, 68, 68, 0.5)';
  if (progress >= 0.8) return 'rgba(249, 115, 22, 0.5)';
  return 'rgba(34, 197, 94, 0.5)';
};

let lastClickTime = 0;
let lastClickVideoId: string | null = null;
let clickTimeout: number | null = null;

const handleVideoClick = (e: MouseEvent, videoId: string) => {
  const currentTime = Date.now();
  const element = videoElements.value.get(videoId);
  const video = videos.value.find(v => v.id === videoId);
  
  if (!element || !video) return;
  
  if (lastClickVideoId === videoId && currentTime - lastClickTime < 300) {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width / 2;
    
    const seekAmount = isLeftSide ? -5 : 5;
    const newTime = Math.max(0, Math.min(video.duration, element.currentTime + seekAmount));
    element.currentTime = newTime;
    video.currentTime = newTime;
    
    lastClickTime = 0;
    lastClickVideoId = null;
  } else {
    lastClickTime = currentTime;
    lastClickVideoId = videoId;
    
    clickTimeout = window.setTimeout(() => {
      togglePlay(videoId);
      lastClickTime = 0;
      lastClickVideoId = null;
    }, 300);
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === ' ') {
    e.preventDefault();
    togglePlay();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mouseup', handleProgressMouseUp);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('mouseup', handleProgressMouseUp);
  videoElements.value.forEach(element => element.pause());
});
</script>

<template>
  <div 
    class="multi-video-container"
    :class="{ 'drag-over': isDraggingOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="video-grid" :style="gridStyle">
      <template v-if="layoutMode === 'normal'">
        <div 
          v-for="(row, rowIndex) in videoRows" 
          :key="rowIndex"
          class="video-row"
          :style="rowStyle"
        >
          <div
            v-for="(video, index) in row"
            :key="video.id"
            class="video-cell"
          >
            <div class="progress-indicator" :style="{ backgroundColor: getProgressColor(video) }"></div>
            
            <video
              :src="video.url"
              class="video-element"
              :style="{ objectFit: video.aspectRatio }"
              @loadedmetadata="handleVideoReady(video.id, $event)"
              @timeupdate="handleTimeUpdate(video.id, $event)"
              @ended="handleVideoEnded(video.id)"
              @click="handleVideoClick($event, video.id)"
              preload="metadata"
            ></video>

            <div class="video-controls">
              <div class="video-header">
                <span class="video-index">#{{ videos.indexOf(video) + 1 }}</span>
                <div class="video-title">{{ video.name }}</div>
                <button class="action-btn remove" @click.stop="removeVideo(video.id)">
                  <X :size="14" />
                </button>
              </div>
              
              <div class="video-actions">
                <button class="action-btn" @click.stop="togglePlay(video.id)">
                  <Pause v-if="video.isPlaying" :size="14" />
                  <Play v-else :size="14" />
                </button>
                
                <div class="volume-control">
                  <button 
                    class="action-btn" 
                    @click.stop="showVolumeSlider = !showVolumeSlider"
                    @dblclick.stop="toggleMute(video.id)"
                  >
                    <VolumeX v-if="video.muted" :size="14" />
                    <Volume2 v-else :size="14" />
                  </button>
                  <input
                    v-if="showVolumeSlider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    :value="video.volume"
                    @input.stop="setVolume(video.id, ($event.target as HTMLInputElement).valueAsNumber)"
                    class="volume-mini-slider"
                  />
                </div>

                <div class="time-display">
                  {{ formatTime(video.currentTime) }} / {{ formatTime(video.duration) }}
                </div>

                <button 
                  class="action-btn aspect-btn" 
                  @click.stop="setAspectRatio(video.id, video.aspectRatio === 'contain' ? 'cover' : video.aspectRatio === 'cover' ? 'fill' : 'contain')"
                  :title="video.aspectRatio === 'contain' ? '适应' : video.aspectRatio === 'cover' ? '填充' : '拉伸'"
                >
                  <Maximize v-if="video.aspectRatio === 'contain'" :size="12" />
                  <Minimize v-else-if="video.aspectRatio === 'cover'" :size="12" />
                  <Maximize2 v-else :size="12" />
                </button>
              </div>

              <div 
                class="progress-bar" 
                :class="{ dragging: draggingVideoId === video.id }"
                @mousedown="handleProgressMouseDown(video.id, $event)"
                @mousemove="handleProgressMouseMove(video.id, $event)"
              >
                <div class="progress-fill" :style="{ width: `${(video.currentTime / video.duration) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="landscapeVideos.length > 0" class="orientation-section">
          <div class="section-header">
            <span class="section-label">横屏视频 ({{ landscapeVideos.length }})</span>
          </div>
          <div 
            v-for="(row, rowIndex) in landscapeRows" 
            :key="'landscape-' + rowIndex"
            class="video-row"
            :style="rowStyle"
          >
            <div
              v-for="(video, index) in row"
              :key="video.id"
              class="video-cell landscape"
            >
              <div class="progress-indicator" :style="{ backgroundColor: getProgressColor(video) }"></div>
              
              <video
                :src="video.url"
                class="video-element"
                :style="{ objectFit: video.aspectRatio }"
                @loadedmetadata="handleVideoReady(video.id, $event)"
                @timeupdate="handleTimeUpdate(video.id, $event)"
                @ended="handleVideoEnded(video.id)"
                @click="handleVideoClick($event, video.id)"
                preload="metadata"
              ></video>

              <div class="video-controls">
                <div class="video-header">
                  <span class="video-index">#{{ videos.indexOf(video) + 1 }}</span>
                  <div class="video-title">{{ video.name }}</div>
                  <button class="action-btn remove" @click.stop="removeVideo(video.id)">
                    <X :size="14" />
                  </button>
                </div>
                
                <div class="video-actions">
                  <button class="action-btn" @click.stop="togglePlay(video.id)">
                    <Pause v-if="video.isPlaying" :size="14" />
                    <Play v-else :size="14" />
                  </button>
                  
                  <div class="volume-control">
                    <button 
                      class="action-btn" 
                      @click.stop="showVolumeSlider = !showVolumeSlider"
                      @dblclick.stop="toggleMute(video.id)"
                    >
                      <VolumeX v-if="video.muted" :size="14" />
                      <Volume2 v-else :size="14" />
                    </button>
                    <input
                      v-if="showVolumeSlider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      :value="video.volume"
                      @input.stop="setVolume(video.id, ($event.target as HTMLInputElement).valueAsNumber)"
                      class="volume-mini-slider"
                    />
                  </div>

                  <div class="time-display">
                    {{ formatTime(video.currentTime) }} / {{ formatTime(video.duration) }}
                  </div>

                  <button 
                    class="action-btn aspect-btn" 
                    @click.stop="setAspectRatio(video.id, video.aspectRatio === 'contain' ? 'cover' : video.aspectRatio === 'cover' ? 'fill' : 'contain')"
                    :title="video.aspectRatio === 'contain' ? '适应' : video.aspectRatio === 'cover' ? '填充' : '拉伸'"
                  >
                    <Maximize v-if="video.aspectRatio === 'contain'" :size="12" />
                    <Minimize v-else-if="video.aspectRatio === 'cover'" :size="12" />
                    <Maximize2 v-else :size="12" />
                  </button>
                </div>

                <div 
                  class="progress-bar" 
                  :class="{ dragging: draggingVideoId === video.id }"
                  @mousedown="handleProgressMouseDown(video.id, $event)"
                  @mousemove="handleProgressMouseMove(video.id, $event)"
                >
                  <div class="progress-fill" :style="{ width: `${(video.currentTime / video.duration) * 100}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="portraitVideos.length > 0" class="orientation-section">
          <div class="section-header">
            <span class="section-label">竖屏视频 ({{ portraitVideos.length }})</span>
          </div>
          <div 
            v-for="(row, rowIndex) in portraitRows" 
            :key="'portrait-' + rowIndex"
            class="video-row portrait-row"
            :style="{ ...rowStyle, gridTemplateColumns: `repeat(${Math.min(columnsPerRow, portraitVideos.length)}, 1fr)` }"
          >
            <div
              v-for="(video, index) in row"
              :key="video.id"
              class="video-cell portrait"
            >
              <div class="progress-indicator" :style="{ backgroundColor: getProgressColor(video) }"></div>
              
              <video
                :src="video.url"
                class="video-element"
                :style="{ objectFit: video.aspectRatio }"
                @loadedmetadata="handleVideoReady(video.id, $event)"
                @timeupdate="handleTimeUpdate(video.id, $event)"
                @ended="handleVideoEnded(video.id)"
                @click="handleVideoClick($event, video.id)"
                preload="metadata"
              ></video>

              <div class="video-controls">
                <div class="video-header">
                  <span class="video-index">#{{ videos.indexOf(video) + 1 }}</span>
                  <div class="video-title">{{ video.name }}</div>
                  <button class="action-btn remove" @click.stop="removeVideo(video.id)">
                    <X :size="14" />
                  </button>
                </div>
                
                <div class="video-actions">
                  <button class="action-btn" @click.stop="togglePlay(video.id)">
                    <Pause v-if="video.isPlaying" :size="14" />
                    <Play v-else :size="14" />
                  </button>
                  
                  <div class="volume-control">
                    <button 
                      class="action-btn" 
                      @click.stop="showVolumeSlider = !showVolumeSlider"
                      @dblclick.stop="toggleMute(video.id)"
                    >
                      <VolumeX v-if="video.muted" :size="14" />
                      <Volume2 v-else :size="14" />
                    </button>
                    <input
                      v-if="showVolumeSlider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      :value="video.volume"
                      @input.stop="setVolume(video.id, ($event.target as HTMLInputElement).valueAsNumber)"
                      class="volume-mini-slider"
                    />
                  </div>

                  <div class="time-display">
                    {{ formatTime(video.currentTime) }} / {{ formatTime(video.duration) }}
                  </div>

                  <button 
                    class="action-btn aspect-btn" 
                    @click.stop="setAspectRatio(video.id, video.aspectRatio === 'contain' ? 'cover' : video.aspectRatio === 'cover' ? 'fill' : 'contain')"
                    :title="video.aspectRatio === 'contain' ? '适应' : video.aspectRatio === 'cover' ? '填充' : '拉伸'"
                  >
                    <Maximize v-if="video.aspectRatio === 'contain'" :size="12" />
                    <Minimize v-else-if="video.aspectRatio === 'cover'" :size="12" />
                    <Maximize2 v-else :size="12" />
                  </button>
                </div>

                <div 
                  class="progress-bar" 
                  :class="{ dragging: draggingVideoId === video.id }"
                  @mousedown="handleProgressMouseDown(video.id, $event)"
                  @mousemove="handleProgressMouseMove(video.id, $event)"
                >
                  <div class="progress-fill" :style="{ width: `${(video.currentTime / video.duration) * 100}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="unknownVideos.length > 0" class="orientation-section">
          <div class="section-header">
            <span class="section-label">未知方向 ({{ unknownVideos.length }})</span>
          </div>
          <div 
            v-for="(row, rowIndex) in unknownRows" 
            :key="'unknown-' + rowIndex"
            class="video-row"
            :style="rowStyle"
          >
            <div
              v-for="(video, index) in row"
              :key="video.id"
              class="video-cell"
            >
              <div class="progress-indicator" :style="{ backgroundColor: getProgressColor(video) }"></div>
              
              <video
                :src="video.url"
                class="video-element"
                :style="{ objectFit: video.aspectRatio }"
                @loadedmetadata="handleVideoReady(video.id, $event)"
                @timeupdate="handleTimeUpdate(video.id, $event)"
                @ended="handleVideoEnded(video.id)"
                @click="handleVideoClick($event, video.id)"
                preload="metadata"
              ></video>

              <div class="video-controls">
                <div class="video-header">
                  <span class="video-index">#{{ videos.indexOf(video) + 1 }}</span>
                  <div class="video-title">{{ video.name }}</div>
                  <button class="action-btn remove" @click.stop="removeVideo(video.id)">
                    <X :size="14" />
                  </button>
                </div>
                
                <div class="video-actions">
                  <button class="action-btn" @click.stop="togglePlay(video.id)">
                    <Pause v-if="video.isPlaying" :size="14" />
                    <Play v-else :size="14" />
                  </button>
                  
                  <div class="volume-control">
                    <button 
                      class="action-btn" 
                      @click.stop="showVolumeSlider = !showVolumeSlider"
                      @dblclick.stop="toggleMute(video.id)"
                    >
                      <VolumeX v-if="video.muted" :size="14" />
                      <Volume2 v-else :size="14" />
                    </button>
                    <input
                      v-if="showVolumeSlider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      :value="video.volume"
                      @input.stop="setVolume(video.id, ($event.target as HTMLInputElement).valueAsNumber)"
                      class="volume-mini-slider"
                    />
                  </div>

                  <div class="time-display">
                    {{ formatTime(video.currentTime) }} / {{ formatTime(video.duration) }}
                  </div>

                  <button 
                    class="action-btn aspect-btn" 
                    @click.stop="setAspectRatio(video.id, video.aspectRatio === 'contain' ? 'cover' : video.aspectRatio === 'cover' ? 'fill' : 'contain')"
                    :title="video.aspectRatio === 'contain' ? '适应' : video.aspectRatio === 'cover' ? '填充' : '拉伸'"
                  >
                    <Maximize v-if="video.aspectRatio === 'contain'" :size="12" />
                    <Minimize v-else-if="video.aspectRatio === 'cover'" :size="12" />
                    <Maximize2 v-else :size="12" />
                  </button>
                </div>

                <div 
                  class="progress-bar" 
                  :class="{ dragging: draggingVideoId === video.id }"
                  @mousedown="handleProgressMouseDown(video.id, $event)"
                  @mousemove="handleProgressMouseMove(video.id, $event)"
                >
                  <div class="progress-fill" :style="{ width: `${(video.currentTime / video.duration) * 100}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="videos.length === 0" class="empty-state">
        <div class="empty-icon">
          <Grid3X3 :size="48" />
        </div>
        <h4>多视频播放</h4>
        <p class="main-hint">从右侧播放列表拖拽视频到这里</p>
        <p class="sub-hint">或点击底部工具栏的"添加选中"按钮</p>
      </div>
    </div>

    <div v-if="isDraggingOver" class="drop-overlay">
      <div class="drop-content">
        <Plus :size="48" />
        <p>释放以添加视频</p>
      </div>
    </div>

    <div class="floating-toolbar bottom-toolbar" :class="{ hidden: !showBottomToolbar }">
      <button class="toolbar-scroll-btn left" @click="scrollToolbar(-150)" title="向左滚动">
        <ChevronLeft :size="16" />
      </button>
      <div class="toolbar-content" ref="toolbarContentRef">
        <div class="toolbar-section section-left">
          <button 
            class="toolbar-btn icon-only" 
            @click="setGlobalAspectRatio(globalAspectRatio === 'contain' ? 'cover' : globalAspectRatio === 'cover' ? 'fill' : 'contain')"
            :title="globalAspectRatio === 'contain' ? '适应窗口' : globalAspectRatio === 'cover' ? '填充窗口' : '拉伸填充'"
          >
            <Maximize v-if="globalAspectRatio === 'contain'" :size="14" />
            <Minimize v-else-if="globalAspectRatio === 'cover'" :size="14" />
            <Maximize2 v-else :size="14" />
          </button>
          <button 
            class="toolbar-btn icon-only" 
            :class="{ active: layoutMode === 'separated' }"
            @click="toggleLayoutMode"
            :title="layoutMode === 'normal' ? '横竖屏分离布局' : '普通布局'"
          >
            <Grid3X3 v-if="layoutMode === 'normal'" :size="14" />
            <Columns v-else :size="14" />
          </button>
          <button 
            class="toolbar-btn icon-only" 
            @click="adjustColumns(-1)" 
            :disabled="columnsPerRow <= 2"
            title="减少每行视频数量"
          >
            <Minus :size="14" />
          </button>
          <div class="columns-display">{{ columnsPerRow }}</div>
          <button 
            class="toolbar-btn icon-only" 
            @click="adjustColumns(1)" 
            :disabled="columnsPerRow >= 6"
            title="增加每行视频数量"
          >
            <Plus :size="14" />
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-section section-center">
          <button 
            class="toolbar-btn icon-only" 
            @click="toggleLoopMode()" 
            :class="{ active: loopMode !== 'none' }"
            :title="loopMode === 'none' ? '不循环' : loopMode === 'all' ? '列表循环' : '单曲循环'"
          >
            <Repeat1 v-if="loopMode === 'one'" :size="14" />
            <Repeat v-else :size="14" />
          </button>
          <button 
            class="toolbar-btn icon-only" 
            @click="!isLongPress && globalSeek(-5)" 
            @mousedown="startLongPressSeek(-5)"
            @mouseup="stopLongPressSeek"
            @mouseleave="stopLongPressSeek"
            @touchstart="startLongPressSeek(-5)"
            @touchend="stopLongPressSeek"
            :disabled="videos.length === 0" 
            title="后退5秒（长按快退）"
          >
            <SkipBack :size="14" />
          </button>
          <button class="toolbar-btn icon-only" @click="togglePlay()" :disabled="videos.length === 0" title="播放/暂停">
            <Pause v-if="videos.some(v => v.isPlaying)" :size="14" />
            <Play v-else :size="14" />
          </button>
          <button 
            class="toolbar-btn icon-only" 
            @click="!isLongPress && globalSeek(5)" 
            @mousedown="startLongPressSeek(5)"
            @mouseup="stopLongPressSeek"
            @mouseleave="stopLongPressSeek"
            @touchstart="startLongPressSeek(5)"
            @touchend="stopLongPressSeek"
            :disabled="videos.length === 0" 
            title="快进5秒（长按快进）"
          >
            <SkipForward :size="14" />
          </button>
          <button 
            class="toolbar-btn with-text" 
            @click="cyclePlaybackRate()" 
            :disabled="videos.length === 0" 
            :title="`播放速度: ${globalPlaybackRate}x`"
          >
            <span>{{ globalPlaybackRate }}x</span>
          </button>
          <div class="volume-control-wrapper">
            <button 
              class="toolbar-btn icon-only" 
              @click="showVolumeSlider = !showVolumeSlider"
              @dblclick="toggleGlobalMute()"
              :disabled="videos.length === 0"
              :title="globalMuted ? '取消静音' : '静音'"
            >
              <VolumeX v-if="globalMuted" :size="14" />
              <Volume2 v-else :size="14" />
            </button>
            <input
              v-if="showVolumeSlider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="globalVolume"
              @input="setGlobalVolume(($event.target as HTMLInputElement).valueAsNumber)"
              class="toolbar-volume"
              :disabled="videos.length === 0"
            />
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-section section-right">
          <button class="toolbar-btn with-text" @click="emit('toggle-playlist')" title="显示播放列表">
            <List :size="14" />
            <span>播放列表</span>
          </button>
          <button class="toolbar-btn danger icon-only" @click="clearAll()" v-if="videos.length > 0" title="清空所有视频">
            <X :size="14" />
          </button>
          <button class="toolbar-btn with-text" @click="emit('add-all')" title="添加全部视频">
            <LayoutGrid :size="14" />
            <span>添加全部</span>
          </button>
          <button class="toolbar-btn exit-btn" @click="emit('close')" title="退出多视频播放模式">
            <Minimize2 :size="14" />
          </button>
          <div class="video-count-badge" v-if="videos.length > 0">
            {{ videos.length }} 个视频
          </div>
        </div>
      </div>
      <button class="toolbar-scroll-btn right" @click="scrollToolbar(150)" title="向右滚动">
        <ChevronRight :size="16" />
      </button>
      <button class="toolbar-hide-btn" @click="showBottomToolbar = false" title="隐藏工具栏">
        <ChevronDown :size="14" />
      </button>
    </div>

    <button 
      v-if="!showBottomToolbar" 
      class="toolbar-show-btn bottom"
      @click="showBottomToolbar = true"
    >
      <ChevronUp :size="14" />
    </button>

    <Teleport to="body">
      <Transition name="confirm-pop">
        <div v-if="confirmModalVisible" class="confirm-modal">
          <div class="confirm-header">
            <div class="confirm-icon">
              <X :size="20" />
            </div>
            <span class="confirm-title">清空所有视频</span>
          </div>
          <p class="confirm-message">确定要清空所有视频吗？当前有 {{ videos.length }} 个视频。</p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="handleCancelClear">取消</button>
            <button class="confirm-btn danger" @click="handleConfirmClear">确定清空</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.multi-video-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  position: relative;
  transition: all 0.3s ease;
}

.multi-video-container.drag-over {
  background-color: rgba(var(--primary-color), 0.1);
}

.video-grid {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.video-grid::-webkit-scrollbar {
  width: 8px;
}

.video-grid::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.video-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.video-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.video-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  min-height: 300px;
  flex: 0 0 auto;
}

.video-cell {
  position: relative;
  background-color: #000;
  overflow: hidden;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-height: 300px;
}

.progress-indicator {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  z-index: 10;
  transition: background-color 0.3s ease;
}

.video-element {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.7), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.video-cell:hover .video-controls {
  opacity: 1;
}

.video-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.video-index {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
  background-color: rgba(var(--primary-color), 0.2);
  padding: 2px 6px;
  border-radius: 4px;
}

.video-title {
  flex: 1;
  font-size: 11px;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.action-btn.remove:hover {
  background-color: rgba(239, 68, 68, 0.8);
}

.action-btn.aspect-btn {
  width: 20px;
  height: 20px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.volume-mini-slider {
  width: 60px;
  height: 3px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
}

.volume-mini-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
  transition: height 0.2s ease;
}

.progress-bar:hover {
  height: 6px;
}

.progress-bar.dragging {
  height: 8px;
  cursor: grabbing;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.1s ease;
}

.time-display {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: auto;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  text-align: center;
  padding: 32px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background-color: rgba(var(--primary-color), 0.1);
  border: 2px dashed var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-bottom: 24px;
}

.empty-state h4 {
  font-size: 20px;
  margin: 0 0 12px;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-state .main-hint {
  font-size: 15px;
  margin: 0 0 8px;
  color: var(--text-secondary);
}

.empty-state .sub-hint {
  font-size: 13px;
  margin: 0;
  opacity: 0.7;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(var(--primary-color), 0.15);
  border: 2px dashed var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  pointer-events: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--primary-color);
}

.drop-content p {
  font-size: 18px;
  font-weight: 500;
}

.floating-toolbar {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.multi-video-container:hover .floating-toolbar {
  opacity: 1;
  pointer-events: auto;
}

.floating-toolbar.hidden {
  opacity: 0 !important;
  pointer-events: none !important;
}

.bottom-toolbar {
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-scroll-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toolbar-scroll-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}

.toolbar-hide-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toolbar-hide-btn:hover {
  background-color: rgba(239, 68, 68, 0.6);
  border-color: rgba(239, 68, 68, 0.5);
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 10px 0;
  background-color: transparent;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  min-width: 1200px;
  max-width: calc(98vw - 80px);
  overflow-x: auto;
  overflow-y: hidden;
}

.toolbar-content::-webkit-scrollbar {
  height: 4px;
}

.toolbar-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.toolbar-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.toolbar-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
}

.toolbar-section.section-left {
  background-color: #2a2a2a;
}

.toolbar-section.section-center {
  background-color: #2a2a2a;
}

.toolbar-section.section-right {
  background-color: #2a2a2a;
}

.toolbar-divider {
  width: 1px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.2);
  margin: 0 8px;
}

.volume-control-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn.with-text {
  width: auto;
  padding: 0 10px;
  gap: 6px;
  font-size: 12px;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.toolbar-btn.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.toolbar-btn.primary:hover {
  opacity: 0.9;
}

.toolbar-btn.danger {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.toolbar-btn.danger:hover {
  background-color: rgba(239, 68, 68, 0.3);
}

.toolbar-btn.exit-btn {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.toolbar-btn.exit-btn:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.toolbar-volume {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
}

.toolbar-volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.toolbar-volume:disabled {
  opacity: 0.4;
}

.video-count-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  height: 32px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.columns-display {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  font-size: 13px;
  font-weight: 600;
}

.toolbar-show-btn {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 28px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  opacity: 0;
  z-index: 99;
}

.multi-video-container:hover .toolbar-show-btn {
  opacity: 1;
}

.toolbar-show-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.toolbar-show-btn.bottom {
  bottom: 20px;
}

@media (max-width: 768px) {
  .floating-toolbar {
    left: 16px;
    right: 16px;
    transform: none;
  }
  
  .toolbar-content {
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px 16px;
    gap: 6px;
    max-width: none;
  }
  
  .toolbar-volume {
    width: 60px;
  }
  
  .layout-selector {
    order: -1;
    width: 100%;
    justify-content: center;
  }
}

.orientation-section {
  margin-bottom: 16px;
}

.section-header {
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  gap: 6px;
}

.video-cell.landscape {
  min-height: 280px;
}

.video-cell.portrait {
  min-height: 400px;
}

.portrait-row {
  justify-content: center;
}

.confirm-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3000;
  background-color: rgba(25, 25, 25, 0.98);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.confirm-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.confirm-message {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
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
  background-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.confirm-btn.cancel:hover {
  background-color: rgba(255, 255, 255, 0.12);
  color: white;
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
</style>
