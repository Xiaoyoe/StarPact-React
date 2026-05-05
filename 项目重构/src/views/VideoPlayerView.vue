<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Camera, ChevronLeft, ChevronRight,
  PictureInPicture2, PictureInPicture, Plus, Trash2, Repeat, Repeat1,
  List, X
} from 'lucide-vue-next';

const toast = useToast();

interface VideoItem {
  id: string;
  name: string;
  url: string;
  size: number;
  duration: number;
  addedAt: number;
}

const playlist = ref<VideoItem[]>([]);
const currentIndex = ref(-1);
const sidebarOpen = ref(true);
const repeatMode = ref<'none' | 'one' | 'all'>('none');
const autoPlay = ref(true);

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const progressRef = ref<HTMLDivElement | null>(null);
const volumeRef = ref<HTMLDivElement | null>(null);

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
const hoverTime = ref<number | null>(null);
const hoverX = ref(0);
const screenshotFlash = ref(false);
const isLoading = ref(false);
const hideTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isDragging = ref(false);
const dragCount = ref(0);

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

const handleProgressHover = (event: MouseEvent) => {
  const bar = progressRef.value;
  if (!bar || !duration.value) return;
  
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  hoverTime.value = ratio * duration.value;
  hoverX.value = event.clientX - rect.left;
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
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'video/*,.mkv,.avi,.mov,.flv,.wmv,.m4v';
  input.multiple = true;
  
  input.onchange = (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;
    
    for (const file of files) {
      const videoItem: VideoItem = {
        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        url: URL.createObjectURL(file),
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
  };
  
  input.click();
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
  
  const video = playlist.value[index];
  URL.revokeObjectURL(video.url);
  playlist.value.splice(index, 1);
  
  toast.success('已删除视频');
};

const playVideo = (index: number) => {
  currentIndex.value = index;
  if (autoPlay.value) {
    isPlaying.value = true;
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

const clearPlaylist = () => {
  if (!confirm('确定要清空播放列表吗？')) return;
  
  playlist.value.forEach(video => URL.revokeObjectURL(video.url));
  playlist.value = [];
  currentIndex.value = -1;
  toast.success('播放列表已清空');
};

const toggleRepeatMode = () => {
  const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
  const currentModeIndex = modes.indexOf(repeatMode.value);
  repeatMode.value = modes[(currentModeIndex + 1) % modes.length];
  
  const modeNames = { none: '关闭循环', one: '单曲循环', all: '列表循环' };
  toast.success(`循环模式: ${modeNames[repeatMode.value]}`);
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
  dragCount.value--;
  if (dragCount.value === 0) isDragging.value = false;
};

const handleDragOver = (e: DragEvent) => e.preventDefault();

const handleDrop = (e: DragEvent) => {
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
        const videoItem: VideoItem = {
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: URL.createObjectURL(file),
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

onMounted(() => {
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
  window.addEventListener('keydown', handleKeyDown);
  
  window.addEventListener('dragenter', handleDragEnter);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('drop', handleDrop);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  
  window.removeEventListener('dragenter', handleDragEnter);
  window.removeEventListener('dragleave', handleDragLeave);
  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('drop', handleDrop);
  
  if (hideTimer.value) clearTimeout(hideTimer.value);
  
  playlist.value.forEach(video => URL.revokeObjectURL(video.url));
});

watch(isPlaying, () => {
  resetHideTimer();
});

watch(currentIndex, () => {
  currentTime.value = 0;
  duration.value = 0;
  buffered.value = 0;
  playbackRate.value = 1;
  showSpeedMenu.value = false;
  showControls.value = true;
  isLoading.value = true;
  
  if (videoRef.value) {
    videoRef.value.playbackRate = 1;
    videoRef.value.currentTime = 0;
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
        :class="{ 'sidebar-open': sidebarOpen }"
        @mousemove="resetHideTimer"
        @mouseleave="() => { if (isPlaying) showControls = false; hoverTime = null; }"
      >
        <div v-if="!currentVideo" class="empty-state">
          <div class="empty-icon">
            <Play :size="64" />
          </div>
          <h2>视频播放器</h2>
          <p>拖放视频文件到窗口中，或点击下方按钮选择文件</p>
          <button class="open-btn" @click="addVideoFiles">
            <Plus :size="20" />
            添加视频文件
          </button>
        </div>

        <template v-else>
          <div class="video-wrapper">
            <video
              ref="videoRef"
              class="video-element"
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

          <div v-if="screenshotFlash" class="screenshot-flash"></div>

          <div v-if="isLoading && isPlaying" class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>

          <div v-if="!isPlaying && !isLoading" class="click-overlay" @click="togglePlay"></div>

          <div class="mini-progress" :class="{ visible: !showControls }">
            <div class="mini-progress-bar" :style="{ width: `${progress}%` }"></div>
          </div>

          <div class="controls-overlay" :class="{ visible: showControls }">
            <div class="controls-gradient"></div>

            <div class="controls-content">
              <div
                ref="progressRef"
                class="progress-bar-container"
                @click="handleSeek"
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

                  <div class="speed-control">
                    <button
                      class="speed-btn"
                      :class="{ active: playbackRate !== 1 }"
                      @click="showSpeedMenu = !showSpeedMenu"
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

        <div class="sidebar-content">
          <div v-if="playlist.length === 0" class="empty-playlist">
            <Play :size="48" class="empty-icon" />
            <h4>播放列表为空</h4>
            <p>添加视频文件开始播放</p>
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
              :class="{ active: currentIndex === index }"
              @click="playVideo(index)"
            >
              <div class="item-left">
                <div class="item-index">
                  <span v-if="currentIndex !== index">{{ index + 1 }}</span>
                  <Play v-else :size="14" />
                </div>
                <div class="item-info">
                  <h4 class="item-name">{{ video.name }}</h4>
                  <div class="item-meta">
                    <span>{{ formatTime(video.duration) }}</span>
                    <span>{{ formatFileSize(video.size) }}</span>
                  </div>
                </div>
              </div>
              <button class="remove-btn" @click.stop="removeVideo(index)" title="删除">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="footer-actions">
            <button class="footer-btn primary" @click="addVideoFiles">
              <Plus :size="16" />
              添加视频
            </button>
            <button class="footer-btn" @click="clearPlaylist">
              <Trash2 :size="16" />
              清空列表
            </button>
          </div>

          <div class="repeat-control">
            <button
              class="repeat-btn"
              :class="{ active: repeatMode !== 'none' }"
              @click="toggleRepeatMode"
            >
              <Repeat1 v-if="repeatMode === 'one'" :size="16" />
              <Repeat v-else :size="16" />
              <span>{{ repeatMode === 'none' ? '不循环' : repeatMode === 'one' ? '单曲循环' : '列表循环' }}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.video-player-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  position: relative;
}

.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(12px);
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px;
  border-radius: 24px;
  border: 2px dashed var(--primary-color);
  background-color: var(--primary-light);
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

.video-container.sidebar-open {
  margin-right: 0;
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

.empty-playlist .empty-icon {
  color: var(--text-tertiary);
  margin-bottom: 16px;
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
}

.playlist-item:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.playlist-item.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
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
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
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
  opacity: 0;
  transition: all 0.2s ease;
}

.playlist-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-btn:hover {
  background-color: var(--bg-primary);
}

.footer-btn.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.footer-btn.primary:hover {
  opacity: 0.9;
}

.repeat-control {
  display: flex;
  justify-content: center;
}

.repeat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.repeat-btn:hover {
  background-color: var(--bg-primary);
}

.repeat-btn.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  border-color: var(--primary-color);
}
</style>
