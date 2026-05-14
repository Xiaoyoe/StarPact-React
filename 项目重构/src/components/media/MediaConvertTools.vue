<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { 
  FileType, Music, Settings, Image as ImageIcon, FileImage, 
  Play, Info, Pause,
  Upload, Zap, Circle, Square as SquareIcon,
  Download, Film, Volume2, VolumeX, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2
} from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import { useToast } from '@/composables/useToast';
import type { MediaInfo } from '@/types/ffmpeg';

const ffmpegStore = useFFmpegStore();
const toast = useToast();

const activeModule = ref<'format' | 'audio' | 'advanced' | 'ico' | 'image'>('format');

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
  url?: string;
}

const formatInputFiles = ref<InputFile[]>([]);
const formatTargetFormat = ref('MP4');
const formatMode = ref('video');
const formatVCodec = ref('H.264 (libx264)');
const formatACodec = ref('AAC');
const formatPreset = ref(5);
const formatCrf = ref(23);

const audioInputFiles = ref<InputFile[]>([]);
const audioFormat = ref('MP3');
const audioBitrate = ref(192);
const audioSampleRate = ref('44100');
const audioVolume = ref(100);
const audioNormalize = ref(false);
const audioBassBoost = ref(0);
const audioTrebleBoost = ref(0);
const audioNoiseReduction = ref(false);
const audioTab = ref('extract');

const advancedInputFiles = ref<InputFile[]>([]);
const advancedTab = ref('compress');
const advancedTargetSize = ref(50);
const advancedKeepAudio = ref(true);
const advancedWmText = ref('FFmpeg Studio');
const advancedWmPosition = ref('bottomright');
const advancedWmOpacity = ref(80);
const advancedGifFps = ref(15);
const advancedGifWidth = ref(480);
const advancedSsInterval = ref(5);
const advancedSsFormat = ref('PNG');

const icoImageSrc = ref<string | null>(null);
const icoImageName = ref('');
const icoCropShape = ref<'circle' | 'square'>('circle');
const icoCropArea = ref({ x: 50, y: 50, width: 200, height: 200 });
const icoImage = ref<HTMLImageElement | null>(null);
const icoCanvasRef = ref<HTMLCanvasElement | null>(null);
const icoImageWrapperRef = ref<HTMLDivElement | null>(null);
const icoCanvasWidth = ref(400);
const icoCanvasHeight = ref(300);
const icoDisplayScale = ref(1);
const icoDisplayOffset = ref({ x: 0, y: 0 });
const icoIsDragging = ref(false);
const icoDragType = ref<'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null>(null);
const icoDragStart = ref({ x: 0, y: 0 });
const icoCropStart = ref({ x: 0, y: 0, width: 0, height: 0 });
const icoPreviewUrls = ref<{ size: number; url: string }[]>([]);

const ICO_SIZES = [
  { size: 16, label: '16×16' },
  { size: 32, label: '32×32' },
  { size: 48, label: '48×48' },
  { size: 64, label: '64×64' },
  { size: 128, label: '128×128' },
  { size: 256, label: '256×256' },
];
const icoSelectedSizes = ref(ICO_SIZES.map(s => ({ ...s, selected: s.size === 32 || s.size === 64 || s.size === 128 || s.size === 256 })));

const imageFiles = ref<{ id: string; file: File; name: string; preview: string; size: number; width: number; height: number; inputPath: string }[]>([]);
const imageOutputFormat = ref('png');
const imageQuality = ref(92);
const imageResize = ref(false);
const imageResizeWidth = ref(800);
const imageResizeHeight = ref(600);

const selectedImageIndex = ref(0);
const imageScale = ref(1);
const imageOffset = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

const videoRef = ref<HTMLVideoElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const videoContainerRef = ref<HTMLDivElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const isFullscreen = ref(false);

const videoFormats = ['MP4', 'AVI', 'MKV', 'MOV', 'WebM', 'FLV', 'WMV', 'MPEG', 'TS'];
const audioFormats = ['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'WMA', 'OPUS', 'M4A'];
const videoCodecs = ['H.264 (libx264)', 'H.265 (libx265)', 'VP9', 'AV1 (libaom)', 'ProRes', 'copy (不转码)'];
const audioCodecs = ['AAC', 'MP3 (libmp3lame)', 'Opus', 'Vorbis', 'FLAC', 'copy (不转码)'];
const presets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];

const OUTPUT_IMAGE_FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png' },
  { value: 'jpeg', label: 'JPG', mime: 'image/jpeg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp' },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp' },
  { value: 'gif', label: 'GIF', mime: 'image/gif' },
];

const currentMainFile = computed(() => {
  switch (activeModule.value) {
    case 'format': return formatInputFiles.value[0] || null;
    case 'audio': return audioInputFiles.value[0] || null;
    case 'advanced': return advancedInputFiles.value[0] || null;
    default: return null;
  }
});

const isVideoFile = computed(() => {
  const file = currentMainFile.value;
  if (!file) return false;
  return !!(file.mediaInfo?.video) || file.file.type.startsWith('video/');
});

const isAudioFile = computed(() => {
  const file = currentMainFile.value;
  if (!file) return false;
  if (file.mediaInfo?.video) return false;
  return !!(file.mediaInfo?.audio) || file.file.type.startsWith('audio/');
});

const currentModuleTask = computed(() => {
  return ffmpegStore.tasks.find(t => 
    ['formatConvert', 'audioProcess', 'advancedTools', 'icoConvert', 'imageFormatConvert'].includes(t.module) && 
    ffmpegStore.activeTaskIds.has(t.id)
  );
});
const isCurrentModuleProcessing = computed(() => !!currentModuleTask.value);

const selectedImage = computed(() => {
  if (activeModule.value === 'image' && imageFiles.value.length > 0) {
    return imageFiles.value[selectedImageIndex.value] || null;
  }
  return null;
});

const handleFormatFilesSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const url = URL.createObjectURL(file);
  formatInputFiles.value = [{
    file,
    path: (file as any).path || file.name,
    name: file.name,
    size: file.size,
    url,
  }];
  if ((file as any).path) {
    const mediaInfo = await ffmpegService.getMediaInfo(ffmpegStore.config.ffprobePath, (file as any).path);
    if (mediaInfo) {
      formatInputFiles.value[0].mediaInfo = mediaInfo;
    }
  }
};

const handleAudioFilesSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const url = URL.createObjectURL(file);
  audioInputFiles.value = [{
    file,
    path: (file as any).path || file.name,
    name: file.name,
    size: file.size,
    url,
  }];
  if ((file as any).path) {
    const mediaInfo = await ffmpegService.getMediaInfo(ffmpegStore.config.ffprobePath, (file as any).path);
    if (mediaInfo) {
      audioInputFiles.value[0].mediaInfo = mediaInfo;
    }
  }
};

const handleAdvancedFilesSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const url = URL.createObjectURL(file);
  advancedInputFiles.value = [{
    file,
    path: (file as any).path || file.name,
    name: file.name,
    size: file.size,
    url,
  }];
  if ((file as any).path) {
    const mediaInfo = await ffmpegService.getMediaInfo(ffmpegStore.config.ffprobePath, (file as any).path);
    if (mediaInfo) {
      advancedInputFiles.value[0].mediaInfo = mediaInfo;
    }
  }
};

const handleIcoFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    const src = event.target?.result as string;
    icoImageSrc.value = src;
    icoImageName.value = file.name.replace(/\.[^/.]+$/, '');
    const img = new Image();
    img.onload = () => {
      icoImage.value = img;
      const minDim = Math.min(img.width, img.height);
      const cropSize = Math.min(minDim * 0.8, 300);
      icoCropArea.value = {
        x: (img.width - cropSize) / 2,
        y: (img.height - cropSize) / 2,
        width: cropSize,
        height: cropSize,
      };
      setTimeout(() => {
        initIcoCanvas();
        updateIcoPreviews();
      }, 50);
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
};

const initIcoCanvas = () => {
  if (!icoCanvasRef.value || !icoImageWrapperRef.value || !icoImage.value) return;
  
  const wrapper = icoImageWrapperRef.value;
  const wrapperWidth = wrapper.clientWidth;
  const wrapperHeight = wrapper.clientHeight;
  
  const imgRatio = icoImage.value.width / icoImage.value.height;
  const wrapperRatio = wrapperWidth / wrapperHeight;
  
  let displayWidth, displayHeight;
  if (imgRatio > wrapperRatio) {
    displayWidth = wrapperWidth;
    displayHeight = wrapperWidth / imgRatio;
  } else {
    displayHeight = wrapperHeight;
    displayWidth = wrapperHeight * imgRatio;
  }
  
  icoCanvasWidth.value = wrapperWidth;
  icoCanvasHeight.value = wrapperHeight;
  icoDisplayScale.value = displayWidth / icoImage.value.width;
  icoDisplayOffset.value = {
    x: (wrapperWidth - displayWidth) / 2,
    y: (wrapperHeight - displayHeight) / 2,
  };
  
  const canvas = icoCanvasRef.value;
  canvas.width = wrapperWidth;
  canvas.height = wrapperHeight;
  
  drawIcoCanvas();
};

const drawIcoCanvas = () => {
  const canvas = icoCanvasRef.value;
  if (!canvas || !icoImage.value) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  const displayWidth = icoImage.value.width * icoDisplayScale.value;
  const displayHeight = icoImage.value.height * icoDisplayScale.value;
  
  ctx.drawImage(
    icoImage.value,
    icoDisplayOffset.value.x,
    icoDisplayOffset.value.y,
    displayWidth,
    displayHeight
  );
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  const cropX = icoDisplayOffset.value.x + icoCropArea.value.x * icoDisplayScale.value;
  const cropY = icoDisplayOffset.value.y + icoCropArea.value.y * icoDisplayScale.value;
  const cropW = icoCropArea.value.width * icoDisplayScale.value;
  const cropH = icoCropArea.value.height * icoDisplayScale.value;
  
  ctx.save();
  ctx.beginPath();
  if (icoCropShape.value === 'circle') {
    ctx.arc(cropX + cropW / 2, cropY + cropH / 2, Math.min(cropW, cropH) / 2, 0, Math.PI * 2);
  } else {
    ctx.rect(cropX, cropY, cropW, cropH);
  }
  ctx.clip();
  ctx.drawImage(
    icoImage.value,
    icoDisplayOffset.value.x,
    icoDisplayOffset.value.y,
    displayWidth,
    displayHeight
  );
  ctx.restore();
  
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  if (icoCropShape.value === 'circle') {
    ctx.arc(cropX + cropW / 2, cropY + cropH / 2, Math.min(cropW, cropH) / 2, 0, Math.PI * 2);
  } else {
    ctx.rect(cropX, cropY, cropW, cropH);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  
  const handleSize = 10;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  
  const handles = [
    { x: cropX, y: cropY },
    { x: cropX + cropW, y: cropY },
    { x: cropX, y: cropY + cropH },
    { x: cropX + cropW, y: cropY + cropH },
  ];
  
  handles.forEach(h => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${Math.round(icoCropArea.value.width)} × ${Math.round(icoCropArea.value.height)}`,
    cropX + cropW / 2,
    cropY + cropH + 20
  );
};

const getCanvasCropArea = (clientX: number, clientY: number) => {
  if (!icoCanvasRef.value) return null;
  const rect = icoCanvasRef.value.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

const getHitTarget = (canvasX: number, canvasY: number): 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null => {
  const cropX = icoDisplayOffset.value.x + icoCropArea.value.x * icoDisplayScale.value;
  const cropY = icoDisplayOffset.value.y + icoCropArea.value.y * icoDisplayScale.value;
  const cropW = icoCropArea.value.width * icoDisplayScale.value;
  const cropH = icoCropArea.value.height * icoDisplayScale.value;
  
  const handleRadius = 15;
  
  const handles = {
    'resize-nw': { x: cropX, y: cropY },
    'resize-ne': { x: cropX + cropW, y: cropY },
    'resize-sw': { x: cropX, y: cropY + cropH },
    'resize-se': { x: cropX + cropW, y: cropY + cropH },
  };
  
  for (const [type, pos] of Object.entries(handles)) {
    const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
    if (dist <= handleRadius) {
      return type as 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';
    }
  }
  
  if (canvasX >= cropX && canvasX <= cropX + cropW && canvasY >= cropY && canvasY <= cropY + cropH) {
    return 'move';
  }
  
  return null;
};

const handleIcoCanvasMouseDown = (e: MouseEvent) => {
  const pos = getCanvasCropArea(e.clientX, e.clientY);
  if (!pos) return;
  
  const hitType = getHitTarget(pos.x, pos.y);
  if (!hitType) return;
  
  icoIsDragging.value = true;
  icoDragType.value = hitType;
  icoDragStart.value = { x: e.clientX, y: e.clientY };
  icoCropStart.value = { ...icoCropArea.value };
};

const handleIcoCanvasMouseMove = (e: MouseEvent) => {
  if (!icoIsDragging.value || !icoImage.value) return;
  
  const dx = (e.clientX - icoDragStart.value.x) / icoDisplayScale.value;
  const dy = (e.clientY - icoDragStart.value.y) / icoDisplayScale.value;
  
  if (icoDragType.value === 'move') {
    const newX = Math.max(0, Math.min(icoImage.value.width - icoCropStart.value.width, icoCropStart.value.x + dx));
    const newY = Math.max(0, Math.min(icoImage.value.height - icoCropStart.value.height, icoCropStart.value.y + dy));
    icoCropArea.value = { ...icoCropArea.value, x: newX, y: newY };
  } else if (icoDragType.value?.startsWith('resize-')) {
    let newWidth = icoCropStart.value.width;
    let newHeight = icoCropStart.value.height;
    let newX = icoCropStart.value.x;
    let newY = icoCropStart.value.y;
    
    if (icoDragType.value === 'resize-se') {
      newWidth = Math.max(50, icoCropStart.value.width + dx);
      newHeight = newWidth;
    } else if (icoDragType.value === 'resize-sw') {
      newWidth = Math.max(50, icoCropStart.value.width - dx);
      newHeight = newWidth;
      newX = icoCropStart.value.x + icoCropStart.value.width - newWidth;
    } else if (icoDragType.value === 'resize-ne') {
      newWidth = Math.max(50, icoCropStart.value.width + dx);
      newHeight = newWidth;
      newY = icoCropStart.value.y + icoCropStart.value.height - newHeight;
    } else if (icoDragType.value === 'resize-nw') {
      newWidth = Math.max(50, icoCropStart.value.width - dx);
      newHeight = newWidth;
      newX = icoCropStart.value.x + icoCropStart.value.width - newWidth;
      newY = icoCropStart.value.y + icoCropStart.value.height - newHeight;
    }
    
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);
    newWidth = Math.min(newWidth, icoImage.value.width - newX);
    newHeight = Math.min(newHeight, icoImage.value.height - newY);
    
    icoCropArea.value = { x: newX, y: newY, width: newWidth, height: newHeight };
  }
  
  drawIcoCanvas();
};

const handleIcoCanvasMouseUp = () => {
  icoIsDragging.value = false;
  icoDragType.value = null;
  updateIcoPreviews();
};

const updateIcoPreviews = () => {
  icoPreviewUrls.value.forEach(p => URL.revokeObjectURL(p.url));
  icoPreviewUrls.value = [];
  
  if (!icoImage.value) return;
  
  const selectedSizes = icoSelectedSizes.value.filter(s => s.selected).map(s => s.size);
  selectedSizes.forEach(size => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    if (icoCropShape.value === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    
    ctx.drawImage(
      icoImage.value!,
      icoCropArea.value.x, icoCropArea.value.y, icoCropArea.value.width, icoCropArea.value.height,
      0, 0, size, size
    );
    
    canvas.toBlob((blob) => {
      if (blob) {
        icoPreviewUrls.value.push({ size, url: URL.createObjectURL(blob) });
      }
    }, 'image/png');
  });
};

const handleImageFilesSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imageFiles.value.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
          preview,
          size: file.size,
          width: img.width,
          height: img.height,
          inputPath: (file as any).path || file.name,
        });
      };
      img.src = preview;
    };
    reader.readAsDataURL(file);
  });
};

const selectImage = (index: number) => {
  selectedImageIndex.value = index;
  imageScale.value = 1;
  imageOffset.value = { x: 0, y: 0 };
};

const zoomIn = () => {
  imageScale.value = Math.min(imageScale.value * 1.25, 5);
};

const zoomOut = () => {
  imageScale.value = Math.max(imageScale.value / 1.25, 0.1);
};

const resetZoom = () => {
  imageScale.value = 1;
  imageOffset.value = { x: 0, y: 0 };
};

const handleMouseDown = (e: MouseEvent) => {
  if (imageScale.value > 1) {
    isDragging.value = true;
    dragStart.value = { x: e.clientX - imageOffset.value.x, y: e.clientY - imageOffset.value.y };
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value && imageScale.value > 1) {
    imageOffset.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
    };
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(5, imageScale.value * delta));
  imageScale.value = newScale;
  if (newScale <= 1) {
    imageOffset.value = { x: 0, y: 0 };
  }
};

const handleDoubleClick = () => {
  if (imageScale.value > 1) {
    imageScale.value = 1;
    imageOffset.value = { x: 0, y: 0 };
  } else {
    imageScale.value = 2;
  }
};

const togglePlay = () => {
  if (isVideoFile.value && videoRef.value) {
    if (isPlaying.value) {
      videoRef.value.pause();
    } else {
      videoRef.value.play();
    }
    isPlaying.value = !isPlaying.value;
  } else if (isAudioFile.value && audioRef.value) {
    if (isPlaying.value) {
      audioRef.value.pause();
    } else {
      audioRef.value.play();
    }
    isPlaying.value = !isPlaying.value;
  }
};

const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
  } else if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
  }
};

const handleLoadedMetadata = () => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
  } else if (audioRef.value) {
    duration.value = audioRef.value.duration;
  }
};

const handleSeek = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const time = parseFloat(target.value);
  if (videoRef.value) {
    videoRef.value.currentTime = time;
  } else if (audioRef.value) {
    audioRef.value.currentTime = time;
  }
  currentTime.value = time;
};

const handleMediaEnded = () => {
  isPlaying.value = false;
};

const handleVolumeChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  volume.value = parseFloat(target.value);
  isMuted.value = volume.value === 0;
  if (videoRef.value) videoRef.value.volume = volume.value;
  if (audioRef.value) audioRef.value.volume = volume.value;
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (videoRef.value) videoRef.value.muted = isMuted.value;
  if (audioRef.value) audioRef.value.muted = isMuted.value;
};

const toggleFullscreen = async () => {
  if (!videoContainerRef.value) return;
  
  if (!isFullscreen.value) {
    if (videoContainerRef.value.requestFullscreen) {
      await videoContainerRef.value.requestFullscreen();
    }
    isFullscreen.value = true;
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
    isFullscreen.value = false;
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const toggleIcoSize = (size: number) => {
  icoSelectedSizes.value = icoSelectedSizes.value.map(s => 
    s.size === size ? { ...s, selected: !s.selected } : s
  );
  updateIcoPreviews();
};

const getOutputFilePath = (inputFile: InputFile, extension: string, suffix?: string): string => {
  const inputPath = inputFile.path;
  const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
  const lastDotIndex = inputFile.name.lastIndexOf('.');
  const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
  const sep = inputDir.includes('\\') ? '\\' : '/';
  const now = new Date();
  const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const finalName = `${inputName}${suffix ? `_${suffix}` : ''}_${dateTimeSuffix}`;
  return inputDir ? `${inputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
};

const buildFormatArgs = (): string[] => {
  const args: string[] = ['-i', formatInputFiles.value[0]!.path];
  const vCodecMap: Record<string, string> = {
    'H.264 (libx264)': 'libx264',
    'H.265 (libx265)': 'libx265',
    'VP9': 'libvpx-vp9',
    'AV1 (libaom)': 'libaom-av1',
    'ProRes': 'prores_ks',
    'copy (不转码)': 'copy',
  };
  const aCodecMap: Record<string, string> = {
    'AAC': 'aac',
    'MP3 (libmp3lame)': 'libmp3lame',
    'Opus': 'libopus',
    'Vorbis': 'libvorbis',
    'FLAC': 'flac',
    'copy (不转码)': 'copy',
  };
  const videoCodec = vCodecMap[formatVCodec.value] || 'libx264';
  const audioCodec = aCodecMap[formatACodec.value] || 'aac';
  if (videoCodec !== 'copy') {
    args.push('-c:v', videoCodec);
    args.push('-preset', presets[formatPreset.value]);
    args.push('-crf', String(formatCrf.value));
  } else {
    args.push('-c:v', 'copy');
  }
  if (audioCodec !== 'copy') {
    args.push('-c:a', audioCodec);
    args.push('-b:a', `${audioBitrate.value}k`);
  } else {
    args.push('-c:a', 'copy');
  }
  args.push('-y');
  args.push(getOutputFilePath(formatInputFiles.value[0]!, formatTargetFormat.value.toLowerCase(), 'converted'));
  return args;
};

const buildAudioArgs = (): string[] => {
  const args: string[] = ['-i', audioInputFiles.value[0]!.path];
  args.push('-vn');
  const codecMap: Record<string, string> = {
    'MP3': 'libmp3lame',
    'AAC': 'aac',
    'WAV': 'pcm_s16le',
    'FLAC': 'flac',
    'OGG': 'libvorbis',
    'OPUS': 'libopus',
    'M4A': 'aac',
    'WMA': 'wmav2',
  };
  args.push('-c:a', codecMap[audioFormat.value] || 'aac');
  if (audioFormat.value !== 'FLAC' && audioFormat.value !== 'WAV') {
    args.push('-b:a', `${audioBitrate.value}k`);
  }
  args.push('-ar', audioSampleRate.value);
  const filterParts: string[] = [];
  if (audioVolume.value !== 100) {
    filterParts.push(`volume=${audioVolume.value / 100}`);
  }
  if (audioNormalize.value) {
    filterParts.push('loudnorm');
  }
  if (audioBassBoost.value > 0) {
    filterParts.push(`bass=g=${audioBassBoost.value}`);
  }
  if (audioTrebleBoost.value > 0) {
    filterParts.push(`treble=g=${audioTrebleBoost.value}`);
  }
  if (audioNoiseReduction.value) {
    filterParts.push('afftdn=nf=-25');
  }
  if (filterParts.length > 0) {
    args.push('-af', filterParts.join(','));
  }
  args.push('-y');
  args.push(getOutputFilePath(audioInputFiles.value[0]!, audioFormat.value.toLowerCase(), 'audio'));
  return args;
};

const buildAdvancedArgs = (): string[] => {
  const args: string[] = ['-i', advancedInputFiles.value[0]!.path];
  switch (advancedTab.value) {
    case 'compress':
      args.push('-c:v', 'libx264');
      args.push('-preset', 'medium');
      const dur = advancedInputFiles.value[0]!.mediaInfo?.duration || 60;
      const targetBitrate = Math.floor((advancedTargetSize.value * 8 * 1024) / dur);
      args.push('-b:v', `${targetBitrate}k`);
      if (advancedKeepAudio.value) {
        args.push('-c:a', 'copy');
      } else {
        args.push('-c:a', 'aac', '-b:a', '128k');
      }
      args.push('-y');
      args.push(getOutputFilePath(advancedInputFiles.value[0]!, 'mp4', 'compressed'));
      break;
    case 'watermark':
      const positionMap: Record<string, string> = {
        'topleft': '10:10',
        'topright': 'w-tw-10:10',
        'bottomleft': '10:h-th-10',
        'bottomright': 'w-tw-10:h-th-10',
        'center': '(w-tw)/2:(h-th)/2',
      };
      const filter = `drawtext=text='${advancedWmText.value}':fontsize=24:fontcolor=white@${advancedWmOpacity.value / 100}:x=${positionMap[advancedWmPosition.value].split(':')[0]}:y=${positionMap[advancedWmPosition.value].split(':')[1]}`;
      args.push('-vf', filter);
      args.push('-c:a', 'copy');
      args.push('-y');
      args.push(getOutputFilePath(advancedInputFiles.value[0]!, 'mp4', 'watermarked'));
      break;
    case 'gif':
      args.push('-vf', `fps=${advancedGifFps.value},scale=${advancedGifWidth.value}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
      args.push('-loop', '0');
      args.push('-y');
      args.push(getOutputFilePath(advancedInputFiles.value[0]!, 'gif'));
      break;
    case 'screenshot':
      args.push('-vf', `fps=1/${advancedSsInterval.value}`);
      args.push('-y');
      args.push(getOutputFilePath(advancedInputFiles.value[0]!, advancedSsFormat.value.toLowerCase(), 'frame_%04d'));
      break;
  }
  return args;
};

const handleFormatStart = async () => {
  if (!ffmpegStore.isConfigured) {
    toast.error('请先在配置中设置 FFmpeg bin 目录');
    return;
  }
  if (formatInputFiles.value.length === 0) {
    toast.warning('请先选择要转换的文件');
    return;
  }
  const outputPath = getOutputFilePath(formatInputFiles.value[0]!, formatTargetFormat.value.toLowerCase(), 'converted');
  const taskId = ffmpegStore.addTask({
    fileName: formatInputFiles.value[0]!.name,
    module: 'formatConvert',
    status: 'processing',
    progress: 0,
    inputPath: formatInputFiles.value[0]!.path,
    outputPath,
  });
  try {
    const args = buildFormatArgs();
    const dur = formatInputFiles.value[0]!.mediaInfo?.duration;
    const result = await ffmpegService.executeWithProgress({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args,
      taskId,
      duration: dur,
    });
    ffmpegStore.updateTask(taskId, {
      status: result.success ? 'completed' : 'error',
      progress: 100,
      error: result.error,
    });
    if (result.success) {
      toast.success('转换完成');
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, { status: 'error', error: String(error) });
  }
};

const handleAudioStart = async () => {
  if (!ffmpegStore.isConfigured) {
    toast.error('请先在配置中设置 FFmpeg bin 目录');
    return;
  }
  if (audioInputFiles.value.length === 0) {
    toast.warning('请先选择要处理的文件');
    return;
  }
  const outputPath = getOutputFilePath(audioInputFiles.value[0]!, audioFormat.value.toLowerCase(), 'audio');
  const taskId = ffmpegStore.addTask({
    fileName: audioInputFiles.value[0]!.name,
    module: 'audioProcess',
    status: 'processing',
    progress: 0,
    inputPath: audioInputFiles.value[0]!.path,
    outputPath,
  });
  try {
    const args = buildAudioArgs();
    const dur = audioInputFiles.value[0]!.mediaInfo?.duration;
    const result = await ffmpegService.executeWithProgress({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args,
      taskId,
      duration: dur,
    });
    ffmpegStore.updateTask(taskId, {
      status: result.success ? 'completed' : 'error',
      progress: 100,
      error: result.error,
    });
    if (result.success) {
      toast.success('处理完成');
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, { status: 'error', error: String(error) });
  }
};

const handleAdvancedStart = async () => {
  if (!ffmpegStore.isConfigured) {
    toast.error('请先在配置中设置 FFmpeg bin 目录');
    return;
  }
  if (advancedInputFiles.value.length === 0) {
    toast.warning('请先选择要处理的文件');
    return;
  }
  let outputPath = '';
  switch (advancedTab.value) {
    case 'compress':
      outputPath = getOutputFilePath(advancedInputFiles.value[0]!, 'mp4', 'compressed');
      break;
    case 'watermark':
      outputPath = getOutputFilePath(advancedInputFiles.value[0]!, 'mp4', 'watermarked');
      break;
    case 'gif':
      outputPath = getOutputFilePath(advancedInputFiles.value[0]!, 'gif');
      break;
    case 'screenshot':
      outputPath = getOutputFilePath(advancedInputFiles.value[0]!, advancedSsFormat.value.toLowerCase(), 'frame_%04d');
      break;
  }
  const taskId = ffmpegStore.addTask({
    fileName: advancedInputFiles.value[0]!.name,
    module: 'advancedTools',
    status: 'processing',
    progress: 0,
    inputPath: advancedInputFiles.value[0]!.path,
    outputPath,
  });
  try {
    const args = buildAdvancedArgs();
    const dur = advancedInputFiles.value[0]!.mediaInfo?.duration;
    const result = await ffmpegService.executeWithProgress({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args,
      taskId,
      duration: dur,
    });
    ffmpegStore.updateTask(taskId, {
      status: result.success ? 'completed' : 'error',
      progress: 100,
      error: result.error,
    });
    if (result.success) {
      toast.success('处理完成');
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, { status: 'error', error: String(error) });
  }
};

const generateIco = async () => {
  if (!icoImage.value) {
    toast.warning('请先选择图片');
    return;
  }
  const sizes = icoSelectedSizes.value.filter(s => s.selected).map(s => s.size);
  if (sizes.length === 0) {
    toast.warning('请至少选择一个输出尺寸');
    return;
  }
  try {
    const images: { width: number; height: number; data: Uint8Array }[] = [];
    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (icoCropShape.value === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(
        icoImage.value,
        icoCropArea.value.x, icoCropArea.value.y, icoCropArea.value.width, icoCropArea.value.height,
        0, 0, size, size
      );
      const pngData = await new Promise<Uint8Array>((resolve) => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob!);
        }, 'image/png');
      });
      images.push({ width: size, height: size, data: pngData });
    }
    const headerSize = 6;
    const dirEntrySize = 16;
    const totalSize = images.reduce((sum, img) => sum + img.data.length, 0);
    const bufferSize = headerSize + (dirEntrySize * images.length) + totalSize;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, images.length, true);
    let dataOffset = headerSize + (dirEntrySize * images.length);
    images.forEach((img, index) => {
      const entryOffset = headerSize + (index * dirEntrySize);
      view.setUint8(entryOffset, img.width >= 256 ? 0 : img.width);
      view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);
      view.setUint8(entryOffset + 2, 0);
      view.setUint8(entryOffset + 3, 0);
      view.setUint16(entryOffset + 4, 1, true);
      view.setUint16(entryOffset + 6, 32, true);
      view.setUint32(entryOffset + 8, img.data.length, true);
      view.setUint32(entryOffset + 12, dataOffset, true);
      const dataView = new Uint8Array(buffer, dataOffset, img.data.length);
      dataView.set(img.data);
      dataOffset += img.data.length;
    });
    const blob = new Blob([buffer], { type: 'image/x-icon' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    link.download = `${icoImageName.value}_${dateTimeSuffix}.ico`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('ICO 文件已生成');
  } catch (error) {
    console.error('生成 ICO 失败:', error);
    toast.error('生成 ICO 失败');
  }
};

const convertImages = async () => {
  if (imageFiles.value.length === 0) {
    toast.warning('请先添加图片');
    return;
  }
  const format = OUTPUT_IMAGE_FORMATS.find(f => f.value === imageOutputFormat.value)!;
  const taskId = ffmpegStore.addTask({
    fileName: `${imageFiles.value.length} 张图片`,
    module: 'imageFormatConvert',
    status: 'processing',
    progress: 0,
    inputPath: imageFiles.value.map(i => i.inputPath).join(', '),
    outputPath: '浏览器下载',
  });
  try {
    let successCount = 0;
    for (let i = 0; i < imageFiles.value.length; i++) {
      const image = imageFiles.value[i];
      const progress = ((i + 1) / imageFiles.value.length) * 100;
      ffmpegStore.updateTask(taskId, { progress });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (imageResize.value) {
            width = imageResizeWidth.value;
            height = imageResizeHeight.value;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('转换失败'));
              return;
            }
            const now = new Date();
            const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${image.name}_${dateTimeSuffix}.${format.value}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            successCount++;
            resolve();
          }, format.mime, imageQuality.value / 100);
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = image.preview;
      });
    }
    ffmpegStore.updateTask(taskId, { status: 'completed', progress: 100 });
    toast.success(`成功转换 ${successCount} 张图片`);
  } catch (error) {
    ffmpegStore.updateTask(taskId, { status: 'error', error: String(error) });
    toast.error('转换失败');
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

watch(activeModule, () => {
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
  isFullscreen.value = false;
});

watch(icoCropShape, () => {
  drawIcoCanvas();
  updateIcoPreviews();
});

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  if (formatInputFiles.value[0]?.url) URL.revokeObjectURL(formatInputFiles.value[0].url);
  if (audioInputFiles.value[0]?.url) URL.revokeObjectURL(audioInputFiles.value[0].url);
  if (advancedInputFiles.value[0]?.url) URL.revokeObjectURL(advancedInputFiles.value[0].url);
  icoPreviewUrls.value.forEach(p => URL.revokeObjectURL(p.url));
});
</script>

<template>
  <div class="media-convert-tools">
    <div class="header">
      <div class="title-row">
        <Settings :size="20" class="icon" />
        <h2>媒体转换工具</h2>
        <span class="badge">整合工具集</span>
      </div>
      <div v-if="isCurrentModuleProcessing" class="processing-indicator">
        <span class="pulse-dot" />
        <span>处理中...</span>
      </div>
    </div>

    <div v-if="!ffmpegStore.isConfigured" class="warning-banner">
      <Info :size="16" />
      <span>请先在配置中设置 FFmpeg bin 目录</span>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="panel-section">
          <div class="section-header" :class="{ active: activeModule === 'format' }" @click="activeModule = 'format'">
            <FileType :size="18" class="icon blue" />
            <span class="section-title">格式转换</span>
          </div>
          <div v-if="activeModule === 'format'" class="section-body">
            <div class="form-group">
              <label>选择文件</label>
              <label class="file-input">
                <input type="file" :accept="formatMode === 'video' ? 'video/*' : 'audio/*'" @change="handleFormatFilesSelected" />
                <Upload :size="16" />
                <span>点击选择</span>
              </label>
            </div>
            <div v-if="formatInputFiles.length > 0" class="file-info-card">
              <div class="file-name">{{ formatInputFiles[0].name }}</div>
              <div class="file-meta">
                <span>{{ formatFileSize(formatInputFiles[0].size) }}</span>
                <span v-if="formatInputFiles[0].mediaInfo?.duration">{{ formatDuration(formatInputFiles[0].mediaInfo.duration) }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>类型</label>
              <div class="btn-group">
                <button :class="['btn', { active: formatMode === 'video' }]" @click="formatMode = 'video'">
                  <Film :size="14" /> 视频
                </button>
                <button :class="['btn', { active: formatMode === 'audio' }]" @click="formatMode = 'audio'">
                  <Volume2 :size="14" /> 音频
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>输出格式</label>
              <select v-model="formatTargetFormat">
                <option v-for="f in (formatMode === 'video' ? videoFormats : audioFormats)" :key="f">{{ f }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>视频编码</label>
              <select v-model="formatVCodec">
                <option v-for="c in videoCodecs" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>音频编码</label>
              <select v-model="formatACodec">
                <option v-for="c in audioCodecs" :key="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>编码预设: {{ presets[formatPreset] }}</label>
              <input type="range" v-model="formatPreset" :min="0" :max="presets.length - 1" step="1" />
            </div>
            <div class="form-group">
              <label>质量 CRF: {{ formatCrf }}</label>
              <input type="range" v-model="formatCrf" min="0" max="51" />
            </div>
            <button class="action-btn blue" :disabled="!ffmpegStore.isConfigured || formatInputFiles.length === 0" @click="handleFormatStart">
              <Play :size="16" />
              开始转换
            </button>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-header" :class="{ active: activeModule === 'audio' }" @click="activeModule = 'audio'">
            <Music :size="18" class="icon green" />
            <span class="section-title">音频处理</span>
          </div>
          <div v-if="activeModule === 'audio'" class="section-body">
            <div class="form-group">
              <label>选择文件</label>
              <label class="file-input">
                <input type="file" accept="video/*,audio/*" @change="handleAudioFilesSelected" />
                <Upload :size="16" />
                <span>点击选择</span>
              </label>
            </div>
            <div v-if="audioInputFiles.length > 0" class="file-info-card">
              <div class="file-name">{{ audioInputFiles[0].name }}</div>
              <div class="file-meta">
                <span>{{ formatFileSize(audioInputFiles[0].size) }}</span>
                <span v-if="audioInputFiles[0].mediaInfo?.duration">{{ formatDuration(audioInputFiles[0].mediaInfo.duration) }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>功能模式</label>
              <div class="btn-group">
                <button :class="['btn', { active: audioTab === 'extract' }]" @click="audioTab = 'extract'">提取</button>
                <button :class="['btn', { active: audioTab === 'adjust' }]" @click="audioTab = 'adjust'">调节</button>
                <button :class="['btn', { active: audioTab === 'effects' }]" @click="audioTab = 'effects'">音效</button>
              </div>
            </div>
            <div class="form-group">
              <label>输出格式</label>
              <select v-model="audioFormat">
                <option v-for="f in ['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'OPUS']" :key="f">{{ f }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>比特率: {{ audioBitrate }} kbps</label>
              <input type="range" v-model="audioBitrate" min="64" max="512" />
            </div>
            <div v-if="audioTab === 'adjust'" class="form-group">
              <label>音量: {{ audioVolume }}%</label>
              <input type="range" v-model="audioVolume" min="0" max="500" />
            </div>
            <div v-if="audioTab === 'adjust'" class="form-group checkbox">
              <label><input type="checkbox" v-model="audioNormalize" /> 音量标准化</label>
            </div>
            <div v-if="audioTab === 'effects'" class="form-group">
              <label>低音增强: {{ audioBassBoost }}dB</label>
              <input type="range" v-model="audioBassBoost" max="20" />
            </div>
            <div v-if="audioTab === 'effects'" class="form-group">
              <label>高音增强: {{ audioTrebleBoost }}dB</label>
              <input type="range" v-model="audioTrebleBoost" max="20" />
            </div>
            <div v-if="audioTab === 'effects'" class="form-group checkbox">
              <label><input type="checkbox" v-model="audioNoiseReduction" /> 降噪处理</label>
            </div>
            <button class="action-btn green" :disabled="!ffmpegStore.isConfigured || audioInputFiles.length === 0" @click="handleAudioStart">
              <Play :size="16" />
              开始处理
            </button>
          </div>
        </div>
      </div>

      <div class="center-panel">
        <div class="preview-area">
          <div class="preview-header">
            <span class="preview-title">
              <ImageIcon v-if="activeModule === 'ico' || activeModule === 'image'" :size="16" />
              <Film v-else-if="isVideoFile" :size="16" />
              <Volume2 v-else :size="16" />
              {{ activeModule === 'ico' ? '图片预览' : activeModule === 'image' ? '图片列表' : isVideoFile ? '视频预览' : isAudioFile ? '音频预览' : '媒体预览' }}
            </span>
          </div>
          
          <div class="preview-content">
            <template v-if="activeModule === 'ico'">
              <div class="ico-editor-container">
                <div class="ico-source-area">
                  <div class="area-label">原图 - 拖动裁剪框调整</div>
                  <div class="ico-image-wrapper" v-if="icoImageSrc" ref="icoImageWrapperRef">
                    <canvas 
                      ref="icoCanvasRef"
                      class="ico-canvas"
                      @mousedown="handleIcoCanvasMouseDown"
                      @mousemove="handleIcoCanvasMouseMove"
                      @mouseup="handleIcoCanvasMouseUp"
                      @mouseleave="handleIcoCanvasMouseUp"
                    ></canvas>
                  </div>
                  <div v-else class="ico-placeholder">
                    <ImageIcon :size="48" />
                    <span>选择图片后显示</span>
                  </div>
                </div>
              </div>
            </template>
            
            <template v-else-if="activeModule === 'image'">
              <div class="image-viewer-container">
                <div class="main-image-area" @wheel="handleWheel">
                  <img 
                    v-if="selectedImage" 
                    :src="selectedImage.preview" 
                    class="main-image"
                    :style="{
                      transform: `scale(${imageScale}) translate(${imageOffset.x / imageScale}px, ${imageOffset.y / imageScale}px)`,
                      cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                    }"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseUp"
                    @dblclick="handleDoubleClick"
                  />
                  <div v-else class="preview-placeholder">
                    <ImageIcon :size="48" />
                    <span>添加图片后显示</span>
                  </div>
                </div>
                <div v-if="imageFiles.length > 0" class="image-toolbar">
                  <button class="tool-btn" @click="zoomOut" title="缩小">
                    <ZoomOut :size="16" />
                  </button>
                  <span class="zoom-level">{{ Math.round(imageScale * 100) }}%</span>
                  <button class="tool-btn" @click="zoomIn" title="放大">
                    <ZoomIn :size="16" />
                  </button>
                  <button class="tool-btn" @click="resetZoom" title="重置">
                    <RotateCcw :size="16" />
                  </button>
                </div>
                <div v-if="imageFiles.length > 1" class="thumbnail-list">
                  <div 
                    v-for="(img, index) in imageFiles" 
                    :key="img.id" 
                    :class="['thumbnail-item', { active: index === selectedImageIndex }]"
                    @click="selectImage(index)"
                  >
                    <img :src="img.preview" />
                    <span class="thumbnail-name">{{ img.name }}</span>
                  </div>
                </div>
              </div>
            </template>
            
            <template v-else-if="isVideoFile && currentMainFile?.url">
              <div ref="videoContainerRef" class="video-player-container" :class="{ fullscreen: isFullscreen }">
                <video 
                  ref="videoRef"
                  :src="currentMainFile.url"
                  class="video-player"
                  @timeupdate="handleTimeUpdate"
                  @loadedmetadata="handleLoadedMetadata"
                  @ended="handleMediaEnded"
                  @click="togglePlay"
                />
                <div class="video-controls">
                  <button class="control-btn play-btn" @click="togglePlay">
                    <Pause v-if="isPlaying" :size="20" />
                    <Play v-else :size="20" />
                  </button>
                  <span class="time-display">{{ formatDuration(currentTime) }}</span>
                  <input 
                    type="range" 
                    class="progress-bar"
                    :value="currentTime"
                    :max="duration"
                    step="0.1"
                    @input="handleSeek"
                  />
                  <span class="time-display">{{ formatDuration(duration) }}</span>
                  <div class="volume-control">
                    <button class="control-btn small" @click="toggleMute">
                      <VolumeX v-if="isMuted || volume === 0" :size="16" />
                      <Volume2 v-else :size="16" />
                    </button>
                    <input 
                      type="range" 
                      class="volume-slider"
                      :value="isMuted ? 0 : volume"
                      min="0"
                      max="1"
                      step="0.1"
                      @input="handleVolumeChange"
                    />
                  </div>
                  <button class="control-btn small" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
                    <Minimize2 v-if="isFullscreen" :size="16" />
                    <Maximize2 v-else :size="16" />
                  </button>
                </div>
              </div>
            </template>
            
            <template v-else-if="isAudioFile && currentMainFile?.url">
              <div class="audio-player-container">
                <div class="audio-cover">
                  <div class="audio-icon" :class="{ playing: isPlaying }">
                    <Music :size="48" />
                  </div>
                  <div class="audio-waves" :class="{ playing: isPlaying }">
                    <span v-for="i in 12" :key="i" class="wave-bar" :style="{ animationDelay: `${i * 0.08}s` }" />
                  </div>
                </div>
                <div class="audio-info">
                  <div class="audio-name">{{ currentMainFile?.name }}</div>
                  <div class="audio-meta">
                    <span>{{ formatFileSize(currentMainFile?.size || 0) }}</span>
                    <span v-if="currentMainFile?.mediaInfo?.duration">{{ formatDuration(currentMainFile.mediaInfo.duration) }}</span>
                  </div>
                </div>
                <audio 
                  ref="audioRef"
                  :src="currentMainFile.url"
                  @timeupdate="handleTimeUpdate"
                  @loadedmetadata="handleLoadedMetadata"
                  @ended="handleMediaEnded"
                />
                <div class="audio-progress-section">
                  <span class="time-label">{{ formatDuration(currentTime) }}</span>
                  <input 
                    type="range" 
                    class="progress-bar audio-progress-bar"
                    :value="currentTime"
                    :max="duration"
                    step="0.1"
                    @input="handleSeek"
                  />
                  <span class="time-label">{{ formatDuration(duration) }}</span>
                </div>
                <div class="audio-controls">
                  <button class="control-btn small" @click="toggleMute">
                    <VolumeX v-if="isMuted || volume === 0" :size="18" />
                    <Volume2 v-else :size="18" />
                  </button>
                  <input 
                    type="range" 
                    class="volume-slider audio-volume"
                    :value="isMuted ? 0 : volume"
                    min="0"
                    max="1"
                    step="0.1"
                    @input="handleVolumeChange"
                  />
                  <button class="control-btn large play-btn" @click="togglePlay">
                    <Pause v-if="isPlaying" :size="28" />
                    <Play v-else :size="28" />
                  </button>
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="preview-placeholder">
                <Film v-if="activeModule === 'format' && formatMode === 'video'" :size="48" />
                <Volume2 v-else-if="activeModule === 'format' && formatMode === 'audio'" :size="48" />
                <Film v-else :size="48" />
                <span>选择文件后预览</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-section">
          <div class="section-header" :class="{ active: activeModule === 'advanced' }" @click="activeModule = 'advanced'">
            <Zap :size="18" class="icon orange" />
            <span class="section-title">高级工具</span>
          </div>
          <div v-if="activeModule === 'advanced'" class="section-body">
            <div class="form-group">
              <label>选择文件</label>
              <label class="file-input">
                <input type="file" accept="video/*,audio/*,image/*" @change="handleAdvancedFilesSelected" />
                <Upload :size="16" />
                <span>点击选择</span>
              </label>
            </div>
            <div v-if="advancedInputFiles.length > 0" class="file-info-card">
              <div class="file-name">{{ advancedInputFiles[0].name }}</div>
              <div class="file-meta">
                <span>{{ formatFileSize(advancedInputFiles[0].size) }}</span>
              </div>
            </div>
            <div class="form-group">
              <label>功能</label>
              <div class="btn-group">
                <button :class="['btn', { active: advancedTab === 'compress' }]" @click="advancedTab = 'compress'">压缩</button>
                <button :class="['btn', { active: advancedTab === 'watermark' }]" @click="advancedTab = 'watermark'">水印</button>
                <button :class="['btn', { active: advancedTab === 'gif' }]" @click="advancedTab = 'gif'">GIF</button>
                <button :class="['btn', { active: advancedTab === 'screenshot' }]" @click="advancedTab = 'screenshot'">截图</button>
              </div>
            </div>
            <div v-if="advancedTab === 'compress'" class="form-group">
              <label>目标大小: {{ advancedTargetSize }} MB</label>
              <input type="range" v-model="advancedTargetSize" min="1" max="500" />
            </div>
            <div v-if="advancedTab === 'compress'" class="form-group checkbox">
              <label><input type="checkbox" v-model="advancedKeepAudio" /> 保留音频</label>
            </div>
            <div v-if="advancedTab === 'watermark'" class="form-group">
              <label>水印文字</label>
              <input type="text" v-model="advancedWmText" />
            </div>
            <div v-if="advancedTab === 'watermark'" class="form-group">
              <label>位置</label>
              <select v-model="advancedWmPosition">
                <option value="topleft">左上</option>
                <option value="topright">右上</option>
                <option value="bottomleft">左下</option>
                <option value="bottomright">右下</option>
                <option value="center">居中</option>
              </select>
            </div>
            <div v-if="advancedTab === 'watermark'" class="form-group">
              <label>透明度: {{ advancedWmOpacity }}%</label>
              <input type="range" v-model="advancedWmOpacity" min="0" max="100" />
            </div>
            <div v-if="advancedTab === 'gif'" class="form-group">
              <label>帧率: {{ advancedGifFps }} fps</label>
              <input type="range" v-model="advancedGifFps" min="5" max="30" />
            </div>
            <div v-if="advancedTab === 'gif'" class="form-group">
              <label>宽度: {{ advancedGifWidth }} px</label>
              <input type="range" v-model="advancedGifWidth" min="120" max="1920" />
            </div>
            <div v-if="advancedTab === 'screenshot'" class="form-group">
              <label>间隔: {{ advancedSsInterval }}s</label>
              <input type="range" v-model="advancedSsInterval" min="1" max="60" />
            </div>
            <div v-if="advancedTab === 'screenshot'" class="form-group">
              <label>格式</label>
              <select v-model="advancedSsFormat">
                <option>PNG</option>
                <option>JPG</option>
                <option>WebP</option>
              </select>
            </div>
            <button class="action-btn orange" :disabled="!ffmpegStore.isConfigured || advancedInputFiles.length === 0" @click="handleAdvancedStart">
              <Play :size="16" />
              开始处理
            </button>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-header" :class="{ active: activeModule === 'ico' }" @click="activeModule = 'ico'">
            <ImageIcon :size="18" class="icon purple" />
            <span class="section-title">ICO转换</span>
          </div>
          <div v-if="activeModule === 'ico'" class="section-body">
            <div class="form-group">
              <label>选择图片</label>
              <label class="file-input">
                <input type="file" accept="image/*" @change="handleIcoFileSelect" />
                <Upload :size="16" />
                <span>点击选择</span>
              </label>
            </div>
            <div class="form-group">
              <label>裁剪形状</label>
              <div class="btn-group">
                <button :class="['btn', { active: icoCropShape === 'circle' }]" @click="icoCropShape = 'circle'">
                  <Circle :size="14" /> 圆形
                </button>
                <button :class="['btn', { active: icoCropShape === 'square' }]" @click="icoCropShape = 'square'">
                  <SquareIcon :size="14" /> 方形
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>输出尺寸</label>
              <div class="size-grid">
                <button 
                  v-for="s in icoSelectedSizes" 
                  :key="s.size" 
                  :class="['size-btn', { active: s.selected }]"
                  @click="toggleIcoSize(s.size)"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>
            <div v-if="icoPreviewUrls.length > 0" class="ico-preview-section">
              <label class="preview-label">预览效果</label>
              <div class="ico-preview-grid-vertical">
                <div 
                  v-for="preview in icoPreviewUrls" 
                  :key="preview.size" 
                  class="ico-preview-item-vertical"
                >
                  <img :src="preview.url" :class="['preview-img-vertical', { circle: icoCropShape === 'circle' }]" />
                  <span class="preview-size-label">{{ preview.size }}×{{ preview.size }}</span>
                </div>
              </div>
            </div>
            <button class="action-btn purple" :disabled="!icoImageSrc || icoSelectedSizes.filter(s => s.selected).length === 0" @click="generateIco">
              <Download :size="16" />
              生成ICO
            </button>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-header" :class="{ active: activeModule === 'image' }" @click="activeModule = 'image'">
            <FileImage :size="18" class="icon cyan" />
            <span class="section-title">图片转换</span>
          </div>
          <div v-if="activeModule === 'image'" class="section-body">
            <div class="form-group">
              <label>选择图片</label>
              <label class="file-input">
                <input type="file" accept="image/*" multiple @change="handleImageFilesSelect" />
                <Upload :size="16" />
                <span>点击选择</span>
              </label>
            </div>
            <div v-if="imageFiles.length > 0" class="file-info-card">
              <div class="file-name">已添加 {{ imageFiles.length }} 张图片</div>
            </div>
            <div class="form-group">
              <label>输出格式</label>
              <select v-model="imageOutputFormat">
                <option v-for="f in OUTPUT_IMAGE_FORMATS" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>质量: {{ imageQuality }}%</label>
              <input type="range" v-model="imageQuality" min="1" max="100" />
            </div>
            <div class="form-group checkbox">
              <label><input type="checkbox" v-model="imageResize" /> 调整尺寸</label>
            </div>
            <div v-if="imageResize" class="form-group inline">
              <input type="number" v-model="imageResizeWidth" placeholder="宽" />
              <span>×</span>
              <input type="number" v-model="imageResizeHeight" placeholder="高" />
            </div>
            <button class="action-btn cyan" :disabled="imageFiles.length === 0" @click="convertImages">
              <Download :size="16" />
              转换图片
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-convert-tools {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon {
  color: var(--primary-color);
}

.icon.blue { color: #3b82f6; }
.icon.green { color: #10b981; }
.icon.orange { color: #f59e0b; }
.icon.purple { color: #8b5cf6; }
.icon.cyan { color: #06b6d4; }

h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 9999px;
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.processing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #10b981;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 13px;
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  scroll-behavior: smooth;
}

.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  width: 6px;
}

.left-panel::-webkit-scrollbar-track,
.right-panel::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.left-panel::-webkit-scrollbar-thumb,
.right-panel::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.left-panel::-webkit-scrollbar-thumb:hover,
.right-panel::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.panel-section {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--border-color);
  user-select: none;
}

.section-header:hover {
  background-color: var(--hover-bg);
}

.section-header.active {
  background-color: var(--primary-light);
}

.section-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group select:focus {
  border-color: var(--primary-color);
}

.form-group input[type="range"] {
  width: 100%;
  height: 6px;
  cursor: pointer;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}

.form-group.checkbox input {
  width: 16px;
  height: 16px;
}

.form-group.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.form-group.inline input {
  width: 70px;
  padding: 6px 10px;
}

.form-group.inline span {
  font-size: 14px;
  color: var(--text-tertiary);
}

.file-input {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: var(--text-secondary);
}

.file-input:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.file-input input {
  display: none;
}

.file-info-card {
  padding: 10px 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.file-info-card .file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-info-card .file-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.btn-group {
  display: flex;
  gap: 6px;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background-color: var(--hover-bg);
}

.btn.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.action-btn.green { background: linear-gradient(135deg, #10b981, #059669); }
.action-btn.orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
.action-btn.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.action-btn.cyan { background: linear-gradient(135deg, #06b6d4, #0891b2); }

.action-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.size-btn {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-btn:hover {
  background-color: var(--hover-bg);
}

.size-btn.active {
  background-color: rgba(139, 92, 246, 0.15);
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.center-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.preview-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
}

.preview-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.preview-placeholder svg {
  opacity: 0.3;
}

.preview-placeholder span {
  font-size: 14px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.ico-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.ico-source-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.area-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 0;
}

.ico-image-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  overflow: hidden;
  min-height: 150px;
}

.ico-canvas {
  width: 100%;
  height: 100%;
  cursor: default;
}

.ico-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.ico-placeholder svg {
  opacity: 0.3;
}

.ico-preview-section {
  margin-top: 8px;
  padding: 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.preview-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.ico-preview-grid-vertical {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.ico-preview-item-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preview-img-vertical {
  background-color: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
}

.preview-img-vertical.circle {
  border-radius: 50%;
}

.preview-size-label {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.image-viewer-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.main-image-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.main-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.1s ease-out;
  user-select: none;
}

.image-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.zoom-level {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 50px;
  text-align: center;
}

.thumbnail-list {
  display: flex;
  gap: 8px;
  padding: 10px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
  overflow-x: auto;
}

.thumbnail-list::-webkit-scrollbar {
  height: 4px;
}

.thumbnail-list::-webkit-scrollbar-track {
  background: transparent;
}

.thumbnail-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
  background-color: var(--bg-secondary);
}

.thumbnail-item:hover {
  border-color: var(--primary-color);
  background-color: var(--primary-light);
}

.thumbnail-item.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-light);
  background-color: var(--primary-light);
}

.thumbnail-item img {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
}

.thumbnail-name {
  font-size: 10px;
  color: var(--text-tertiary);
  max-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.video-player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-player-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: #000;
  padding: 0;
}

.video-player-container.fullscreen .video-player {
  border-radius: 0;
}

.video-player-container.fullscreen .video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.8);
}

.video-player {
  flex: 1;
  width: 100%;
  border-radius: 8px;
  background-color: #000;
  cursor: pointer;
}

.video-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), #2563eb);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.control-btn:hover {
  transform: scale(1.05);
}

.control-btn.small {
  width: 32px;
  height: 32px;
}

.control-btn.large {
  width: 56px;
  height: 56px;
}

.time-display {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 45px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.audio-player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}

.audio-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.audio-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
  transition: all 0.3s;
}

.audio-icon.playing {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 8px 48px rgba(139, 92, 246, 0.5);
    transform: scale(1.05);
  }
}

.audio-waves {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 40px;
}

.audio-waves.playing .wave-bar {
  animation: wave 0.6s ease-in-out infinite alternate;
}

.wave-bar {
  width: 4px;
  height: 16px;
  background: linear-gradient(to top, var(--primary-color), #8b5cf6);
  border-radius: 2px;
}

@keyframes wave {
  0% { height: 8px; }
  100% { height: 36px; }
}

.audio-info {
  text-align: center;
}

.audio-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.audio-progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.time-label {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
  min-width: 40px;
}

.audio-progress-bar {
  flex: 1;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 400px;
  justify-content: center;
}

.audio-volume {
  width: 100px;
}
</style>
