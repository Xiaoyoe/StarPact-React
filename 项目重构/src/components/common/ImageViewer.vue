<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
  Eye, EyeOff, LayoutGrid, Grid3X3
} from 'lucide-vue-next';

interface ImageItem {
  url: string;
  name?: string;
}

interface Props {
  images: (string | ImageItem)[];
  currentIndex: number;
  isOpen: boolean;
  showThumbnail?: boolean;
  showMask?: boolean;
  defaultZoom?: number;
  scrollMode?: 'navigate' | 'zoom';
}

const props = withDefaults(defineProps<Props>(), {
  showThumbnail: true,
  showMask: true,
  defaultZoom: 1,
  scrollMode: 'zoom',
});

const emit = defineEmits<{
  close: [];
  prev: [];
  next: [];
  jumpTo: [index: number];
}>();

const viewerIndex = ref(props.currentIndex);
const viewerZoom = ref(props.defaultZoom);
const viewerRotation = ref(0);
const viewerMaskVisible = ref(props.showMask);
const thumbnailVisible = ref(props.showThumbnail);
const scrollMode = ref<'navigate' | 'zoom'>(props.scrollMode);

const viewerDrag = ref({
  isDragging: false,
  startX: 0,
  startY: 0,
  translateX: 0,
  translateY: 0
});

const thumbnailContainerRef = ref<HTMLDivElement | null>(null);
const thumbnailScrollLeft = ref(0);
const thumbnailItemWidth = 72;
const thumbnailBuffer = 8;

let scrollRAF: number | null = null;
let lastScrollTime = 0;
const scrollThrottle = 16;

const normalizedImages = computed(() => {
  return props.images.map(img => {
    if (typeof img === 'string') {
      return { url: img, name: `图片` };
    }
    return { url: img.url, name: img.name || `图片` };
  });
});

const currentImage = computed(() => {
  return normalizedImages.value[viewerIndex.value];
});

const visibleThumbnailRange = computed(() => {
  if (!thumbnailContainerRef.value) {
    return { start: 0, end: 10 };
  }
  
  const containerWidth = thumbnailContainerRef.value.clientWidth || 500;
  const scrollLeft = thumbnailScrollLeft.value;
  
  const start = Math.max(0, Math.floor(scrollLeft / thumbnailItemWidth) - thumbnailBuffer);
  const end = Math.min(
    normalizedImages.value.length,
    Math.ceil((scrollLeft + containerWidth) / thumbnailItemWidth) + thumbnailBuffer
  );
  
  return { start, end };
});

const visibleThumbnails = computed(() => {
  const { start, end } = visibleThumbnailRange.value;
  return normalizedImages.value.slice(start, end).map((img, i) => ({
    ...img,
    originalIndex: start + i,
  }));
});

watch(() => props.currentIndex, (newIndex) => {
  viewerIndex.value = newIndex;
  resetViewer();
  nextTick(() => {
    scrollToThumbnail(newIndex);
  });
});

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    resetViewer();
  } else {
    nextTick(() => {
      scrollToThumbnail(viewerIndex.value);
    });
  }
});

const zoomLevels = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];

const resetViewer = () => {
  viewerZoom.value = props.defaultZoom;
  viewerRotation.value = 0;
  viewerMaskVisible.value = props.showMask;
  thumbnailVisible.value = props.showThumbnail;
  scrollMode.value = props.scrollMode;
  viewerDrag.value = { isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };
};

const closeViewer = () => {
  emit('close');
};

const navigateImage = (direction: number) => {
  const newIndex = viewerIndex.value + direction;
  if (newIndex >= 0 && newIndex < props.images.length) {
    if (direction === -1) {
      emit('prev');
    } else {
      emit('next');
    }
    viewerZoom.value = props.defaultZoom;
    viewerRotation.value = 0;
    viewerDrag.value = { isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };
    scrollToThumbnail(newIndex);
  }
};

const zoomImage = (delta: number) => {
  viewerZoom.value = Math.max(0.25, Math.min(5, viewerZoom.value + delta));
  if (viewerZoom.value === 1) {
    viewerDrag.value.translateX = 0;
    viewerDrag.value.translateY = 0;
  }
};

const stepZoom = (direction: 'in' | 'out') => {
  const currentIndex = zoomLevels.findIndex(z => z === viewerZoom.value);
  let nextIndex;
  if (direction === 'in') {
    nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
  } else {
    nextIndex = Math.max(currentIndex - 1, 0);
  }
  viewerZoom.value = zoomLevels[nextIndex];
  if (viewerZoom.value === 1) {
    viewerDrag.value.translateX = 0;
    viewerDrag.value.translateY = 0;
  }
};

const handleDoubleClick = () => {
  const currentIndex = zoomLevels.findIndex(z => z === viewerZoom.value);
  const nextIndex = (currentIndex + 1) % zoomLevels.length;
  viewerZoom.value = zoomLevels[nextIndex];
  
  if (viewerZoom.value === 1) {
    viewerDrag.value.translateX = 0;
    viewerDrag.value.translateY = 0;
  }
};

const rotateImage = () => {
  viewerRotation.value = (viewerRotation.value + 90) % 360;
};

const toggleMask = () => {
  viewerMaskVisible.value = !viewerMaskVisible.value;
};

const toggleThumbnail = () => {
  thumbnailVisible.value = !thumbnailVisible.value;
};

const toggleScrollMode = () => {
  scrollMode.value = scrollMode.value === 'navigate' ? 'zoom' : 'navigate';
};

const handleMouseDown = (event: MouseEvent) => {
  if (viewerZoom.value > 1) {
    viewerDrag.value.isDragging = true;
    viewerDrag.value.startX = event.clientX - viewerDrag.value.translateX;
    viewerDrag.value.startY = event.clientY - viewerDrag.value.translateY;
    event.preventDefault();
    event.stopPropagation();
  }
};

const handleMouseMove = (event: MouseEvent) => {
  if (viewerDrag.value.isDragging && viewerZoom.value > 1) {
    viewerDrag.value.translateX = event.clientX - viewerDrag.value.startX;
    viewerDrag.value.translateY = event.clientY - viewerDrag.value.startY;
  }
};

const handleMouseUp = () => {
  viewerDrag.value.isDragging = false;
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  
  if (scrollMode.value === 'zoom') {
    const delta = event.deltaY > 0 ? -0.25 : 0.25;
    zoomImage(delta);
  } else {
    const direction = event.deltaY > 0 ? 1 : -1;
    navigateImage(direction);
  }
};

const handleThumbnailWheel = (event: WheelEvent) => {
  event.preventDefault();
  if (!thumbnailContainerRef.value) return;
  
  const scrollAmount = event.deltaY > 0 ? 100 : -100;
  thumbnailContainerRef.value.scrollBy({
    left: scrollAmount,
    behavior: 'auto'
  });
};

const handleThumbnailScroll = () => {
  const now = performance.now();
  if (now - lastScrollTime < scrollThrottle) {
    return;
  }
  lastScrollTime = now;
  
  if (scrollRAF) {
    cancelAnimationFrame(scrollRAF);
  }
  
  scrollRAF = requestAnimationFrame(() => {
    if (thumbnailContainerRef.value) {
      thumbnailScrollLeft.value = thumbnailContainerRef.value.scrollLeft;
    }
    scrollRAF = null;
  });
};

const scrollToThumbnail = (index: number) => {
  if (!thumbnailContainerRef.value) return;
  
  const scrollPosition = index * thumbnailItemWidth - thumbnailContainerRef.value.clientWidth / 2 + thumbnailItemWidth / 2;
  
  thumbnailContainerRef.value.scrollTo({
    left: scrollPosition,
    behavior: 'smooth'
  });
  
  setTimeout(() => {
    if (thumbnailContainerRef.value) {
      thumbnailScrollLeft.value = thumbnailContainerRef.value.scrollLeft;
    }
  }, 300);
};

const selectThumbnail = (index: number, event: Event) => {
  event.stopPropagation();
  event.preventDefault();
  viewerIndex.value = index;
  emit('jumpTo', index);
  viewerZoom.value = props.defaultZoom;
  viewerRotation.value = 0;
  viewerDrag.value = { isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 };
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.isOpen) return;

  switch (e.key) {
    case 'Escape':
      closeViewer();
      break;
    case 'ArrowLeft':
      navigateImage(-1);
      break;
    case 'ArrowRight':
      navigateImage(1);
      break;
    case '+':
    case '=':
      stepZoom('in');
      break;
    case '-':
      stepZoom('out');
      break;
    case 'r':
    case 'R':
      rotateImage();
      break;
    case 'm':
    case 'M':
      toggleMask();
      break;
    case 't':
    case 'T':
      toggleThumbnail();
      break;
    case 'q':
    case 'Q':
      scrollMode.value = 'navigate';
      break;
    case 'e':
    case 'E':
      scrollMode.value = 'zoom';
      break;
    case '0':
      resetViewer();
      break;
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  
  nextTick(() => {
    if (thumbnailContainerRef.value) {
      thumbnailScrollLeft.value = thumbnailContainerRef.value.scrollLeft;
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  if (scrollRAF) {
    cancelAnimationFrame(scrollRAF);
  }
});
</script>

<template>
  <Transition name="viewer">
    <div v-if="isOpen" class="image-viewer" :class="{ 'no-mask': !viewerMaskVisible }" @click="closeViewer">
      <div class="viewer-header">
        <div class="viewer-info">
          <h3>{{ currentImage?.name }}</h3>
          <p>{{ viewerIndex + 1 }} / {{ images.length }}</p>
        </div>
        <div class="viewer-actions">
          <button 
            class="viewer-btn scroll-mode-btn" 
            :class="{ active: scrollMode === 'zoom' }"
            @click.stop="toggleScrollMode" 
            :title="scrollMode === 'navigate' ? '切换为缩放模式 (Q/E)' : '切换为导航模式 (Q/E)'"
          >
            <ZoomIn v-if="scrollMode === 'zoom'" :size="18" />
            <ChevronRight v-else :size="18" />
          </button>
          <button class="viewer-btn" @click.stop="toggleMask" :title="viewerMaskVisible ? '隐藏遮罩' : '显示遮罩'">
            <EyeOff v-if="viewerMaskVisible" :size="18" />
            <Eye v-else :size="18" />
          </button>
          <button class="viewer-btn" @click.stop="toggleThumbnail" :title="thumbnailVisible ? '隐藏缩略图' : '显示缩略图'">
            <LayoutGrid v-if="thumbnailVisible" :size="18" />
            <Grid3X3 v-else :size="18" />
          </button>
          <button class="viewer-btn" @click.stop="stepZoom('out')" title="缩小 (-)">
            <ZoomOut :size="18" />
          </button>
          <span class="zoom-level">{{ Math.round(viewerZoom * 100) }}%</span>
          <button class="viewer-btn" @click.stop="stepZoom('in')" title="放大 (+)">
            <ZoomIn :size="18" />
          </button>
          <button class="viewer-btn" @click.stop="rotateImage" title="旋转 (R)">
            <RotateCw :size="18" />
          </button>
          <button class="viewer-btn close-btn" @click.stop="closeViewer" title="关闭 (ESC)">
            <X :size="18" />
          </button>
        </div>
      </div>
      
      <div 
        class="viewer-content"
        @click.stop
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
        @dblclick="handleDoubleClick"
      >
        <button
          v-if="images.length > 1 && viewerIndex > 0"
          class="nav-btn prev"
          @click.stop="navigateImage(-1)"
        >
          <ChevronLeft :size="32" />
        </button>
        
        <img
          v-if="currentImage"
          :src="currentImage.url"
          :alt="currentImage.name"
          :style="{
            transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg) translate(${viewerDrag.translateX / viewerZoom}px, ${viewerDrag.translateY / viewerZoom}px)`,
            cursor: viewerZoom > 1 ? (viewerDrag.isDragging ? 'grabbing' : 'grab') : 'default',
          }"
          @click.stop
          @dblclick="handleDoubleClick"
          draggable="false"
          loading="lazy"
        />
        
        <button
          v-if="images.length > 1 && viewerIndex < images.length - 1"
          class="nav-btn next"
          @click.stop="navigateImage(1)"
        >
          <ChevronRight :size="32" />
        </button>
      </div>

      <Transition name="thumbnail">
        <div v-if="thumbnailVisible && images.length > 1" class="thumbnail-wrapper">
          <div 
            class="thumbnail-container" 
            @wheel="handleThumbnailWheel" 
            @scroll="handleThumbnailScroll"
            ref="thumbnailContainerRef" 
            @click.stop
          >
            <div 
              class="thumbnail-list" 
              :style="{ 
                width: `${normalizedImages.length * thumbnailItemWidth}px`,
                paddingLeft: `${visibleThumbnailRange.start * thumbnailItemWidth}px`
              }"
            >
              <div
                v-for="image in visibleThumbnails"
                :key="image.originalIndex"
                :class="['thumbnail-item', { active: image.originalIndex === viewerIndex }]"
                @click="selectThumbnail(image.originalIndex, $event)"
              >
                <img :src="image.url" :alt="image.name" loading="lazy" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.image-viewer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.95);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s;
}

.image-viewer.no-mask {
  background-color: transparent;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
  position: relative;
  z-index: 10;
}

.image-viewer.no-mask .viewer-header {
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.viewer-info h3 {
  font-size: 14px;
  font-weight: 500;
  color: white;
  margin: 0 0 2px 0;
}

.viewer-info p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.viewer-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.viewer-btn.scroll-mode-btn.active {
  background-color: rgba(var(--primary-color-rgb, 6, 182, 212), 0.8);
}

.viewer-btn.close-btn:hover {
  background-color: rgba(239, 68, 68, 0.8);
}

.zoom-level {
  font-size: 12px;
  color: white;
  min-width: 45px;
  text-align: center;
}

.viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.viewer-content img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  user-select: none;
  will-change: transform;
  transform-origin: center center;
  backface-visibility: hidden;
  perspective: 1000px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.1);
}

.nav-btn.prev {
  left: 24px;
}

.nav-btn.next {
  right: 24px;
}

.thumbnail-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 24px 16px;
}

.thumbnail-container {
  max-width: 500px;
  height: 80px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 8px;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
  contain: layout style;
  content-visibility: auto;
  overscroll-behavior: contain;
  scroll-behavior: auto;
}

.thumbnail-container::-webkit-scrollbar {
  display: none;
}

.thumbnail-list {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  will-change: transform;
  contain: layout style paint;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: opacity 0.15s ease-out, border-color 0.15s ease-out;
  opacity: 0.6;
  will-change: opacity, border-color;
  contain: strict;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.thumbnail-item:hover {
  opacity: 0.9;
}

.thumbnail-item.active {
  border-color: var(--primary-color);
  opacity: 1;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.5);
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
  contain: strict;
  transform: translateZ(0);
  backface-visibility: hidden;
  image-rendering: -webkit-optimize-contrast;
}

.viewer-enter-active,
.viewer-leave-active {
  transition: all 0.3s ease;
}

.viewer-enter-from,
.viewer-leave-to {
  opacity: 0;
}

.viewer-enter-from img,
.viewer-leave-to img {
  transform: scale(0.9);
}

.thumbnail-enter-active,
.thumbnail-leave-active {
  transition: all 0.3s ease;
}

.thumbnail-enter-from,
.thumbnail-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
