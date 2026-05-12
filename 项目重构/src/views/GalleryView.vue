<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/composables/useToast';
import { fileService } from '@/services';
import Modal from '@/components/common/Modal.vue';
import ImageViewer from '@/components/common/ImageViewer.vue';
import {
  Images, FolderOpen, Upload, Grid3X3, LayoutGrid, List,
  Heart, Eye, Trash2, X,
  Plus, FolderUp,
  ExternalLink, Minus, CheckSquare, Square, Check, Settings, ChevronDown
} from 'lucide-vue-next';

interface ImageMetadata {
  id: string;
  name: string;
  size: number;
  image_type: string;
  file_path: string;
  width: number;
  height: number;
  added_at: number;
  tags?: string[];
  description?: string;
  thumbnail_path?: string;
  favorite?: boolean;
  album_id: string;
}

interface ImageAlbum {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  cover_image_id?: string;
  description?: string;
}

const toast = useToast();

const albums = ref<ImageAlbum[]>([]);
const currentAlbumId = ref<string>('all');
const images = ref<ImageMetadata[]>([]);
const viewMode = ref<'grid' | 'waterfall' | 'list'>('grid');
const waterfallColumns = ref(4);
const loading = ref(false);

const selectMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());

const uploadProgress = ref<{
  visible: boolean;
  total: number;
  current: number;
  fileName: string;
  cancelled: boolean;
  startTime: number;
  speed: string;
}>({
  visible: false,
  total: 0,
  current: 0,
  fileName: '',
  cancelled: false,
  startTime: 0,
  speed: '',
});

const pageSize = 100;
const currentPage = ref(1);
const isLoadingMore = ref(false);

const gridContainerRef = ref<HTMLDivElement | null>(null);

const viewerVisible = ref(false);
const viewerIndex = ref(0);

const showScrollbar = ref(false);

const drawerVisible = ref(false);

const settingsPanelVisible = ref(false);
const defaultZoom = ref(2);
const zoomOptions = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
const defaultShowThumbnail = ref(false);
const defaultScrollMode = ref<'navigate' | 'zoom'>('navigate');

const createAlbumModalVisible = ref(false);
const newAlbumName = ref('');

const jsonModalVisible = ref(false);
const jsonContent = ref<string>('');
const jsonTotalCount = ref(0);
const jsonDisplayCount = ref(100);
const jsonAllData = ref<any[]>([]);

const isDragOver = ref(false);

const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  albumId: string;
  albumName: string;
} | null>(null);

const currentAlbum = computed(() => {
  if (currentAlbumId.value === 'all') {
    return { id: 'all', name: '全部图片', created_at: 0, updated_at: 0 };
  }
  if (currentAlbumId.value === 'favorites') {
    return { id: 'favorites', name: '收藏', created_at: 0, updated_at: 0 };
  }
  return albums.value.find(a => a.id === currentAlbumId.value) || { id: 'all', name: '全部图片', created_at: 0, updated_at: 0 };
});

const filteredImages = computed(() => {
  let result = images.value;
  
  if (currentAlbumId.value === 'favorites') {
    result = images.value.filter(img => img.favorite);
  } else if (currentAlbumId.value !== 'all') {
    result = images.value.filter(img => img.album_id === currentAlbumId.value);
  }
  
  return result;
});

const displayImages = computed(() => {
  return filteredImages.value.slice(0, currentPage.value * pageSize);
});

const hasMoreImages = computed(() => {
  return displayImages.value.length < filteredImages.value.length;
});

const loadMoreImages = () => {
  if (isLoadingMore.value || !hasMoreImages.value) return;
  
  isLoadingMore.value = true;
  setTimeout(() => {
    currentPage.value++;
    isLoadingMore.value = false;
  }, 100);
};

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value;
};

const toggleSettingsPanel = () => {
  settingsPanelVisible.value = !settingsPanelVisible.value;
};

const closeSettingsPanel = () => {
  settingsPanelVisible.value = false;
};

const showJsonContent = async () => {
  try {
    const content = await invoke<string>('get_all_images_json');
    const data = JSON.parse(content);
    
    jsonAllData.value = data;
    jsonTotalCount.value = data.length;
    jsonDisplayCount.value = 100;
    
    const displayData = data.slice(0, jsonDisplayCount.value);
    jsonContent.value = JSON.stringify(displayData, null, 2);
    jsonModalVisible.value = true;
  } catch (error) {
    console.error('Failed to read JSON data:', error);
    toast.error('读取图片数据失败');
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

const getProgressColor = () => {
  const progress = (uploadProgress.value.current / uploadProgress.value.total) * 100;
  
  if (progress >= 100) {
    return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  } else if (progress >= 90) {
    return 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)';
  } else if (progress >= 70) {
    return 'linear-gradient(90deg, #eab308 0%, #22c55e 100%)';
  } else if (progress >= 50) {
    return 'linear-gradient(90deg, #f97316 0%, #eab308 100%)';
  } else if (progress >= 30) {
    return 'linear-gradient(90deg, #f87171 0%, #f97316 100%)';
  } else {
    return 'linear-gradient(90deg, #fca5a5 0%, #f87171 100%)';
  }
};

const getGlowColor = () => {
  const progress = (uploadProgress.value.current / uploadProgress.value.total) * 100;
  
  if (progress >= 100) {
    return 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.6) 50%, transparent 100%)';
  } else if (progress >= 90) {
    return 'linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.6) 50%, transparent 100%)';
  } else if (progress >= 70) {
    return 'linear-gradient(90deg, transparent 0%, rgba(234, 179, 8, 0.6) 50%, transparent 100%)';
  } else if (progress >= 50) {
    return 'linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.6) 50%, transparent 100%)';
  } else if (progress >= 30) {
    return 'linear-gradient(90deg, transparent 0%, rgba(248, 113, 113, 0.6) 50%, transparent 100%)';
  } else {
    return 'linear-gradient(90deg, transparent 0%, rgba(252, 165, 165, 0.6) 50%, transparent 100%)';
  }
};

const openDatabaseFolder = async () => {
  try {
    const dbPath = await invoke<string>('get_database_file_path');
    await fileService.showInFolder(dbPath);
    toast.success('已打开文件夹');
  } catch (error) {
    console.error('Failed to open database folder:', error);
    toast.error('打开文件夹失败');
  }
};

const loadAlbums = async () => {
  try {
    const result = await invoke<ImageAlbum[]>('get_albums');
    albums.value = result;
  } catch (error) {
    console.error('Failed to load albums:', error);
    toast.error('加载相册失败');
  }
};

const loadImages = async () => {
  loading.value = true;
  try {
    const allImages: ImageMetadata[] = [];
    for (const album of albums.value) {
      const albumImages = await invoke<ImageMetadata[]>('get_images', { albumId: album.id });
      allImages.push(...albumImages);
    }
    images.value = allImages;
  } catch (error) {
    console.error('Failed to load images:', error);
    toast.error('加载图片失败');
  } finally {
    loading.value = false;
  }
};

const createAlbum = () => {
  newAlbumName.value = '';
  createAlbumModalVisible.value = true;
};

const confirmCreateAlbum = async () => {
  if (!newAlbumName.value.trim()) {
    toast.error('请输入相册名称');
    return;
  }
  
  try {
    const album: ImageAlbum = {
      id: `album_${Date.now()}`,
      name: newAlbumName.value.trim(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await invoke('create_album_with_folder', { album });
    toast.success('创建相册成功');
    createAlbumModalVisible.value = false;
    newAlbumName.value = '';
    await loadAlbums();
  } catch (error) {
    console.error('Failed to create album:', error);
    toast.error('创建相册失败');
  }
};

const showAlbumMenu = (event: MouseEvent, albumId: string, albumName: string) => {
  event.preventDefault();
  event.stopPropagation();
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    albumId,
    albumName,
  };
};

const deleteAlbum = async (albumId?: string) => {
  const targetAlbumId = albumId || contextMenu.value?.albumId;
  if (!targetAlbumId) return;
  
  if (!confirm('确定要删除这个相册吗？相册内的所有图片也会被删除。')) {
    contextMenu.value = null;
    return;
  }
  
  try {
    await invoke('delete_album', { albumId: targetAlbumId });
    toast.success('删除相册成功');
    await loadAlbums();
    await loadImages();
    if (currentAlbumId.value === targetAlbumId) {
      currentAlbumId.value = 'all';
    }
  } catch (error) {
    console.error('Failed to delete album:', error);
    toast.error('删除相册失败');
  } finally {
    contextMenu.value = null;
  }
};

const openAlbumFolder = async (albumName: string) => {
  try {
    const dataDir = await invoke<string>('get_gallery_data_dir');
    const albumPath = `${dataDir}/gallery/${albumName}`;
    await fileService.showInFolder(albumPath);
  } catch (error) {
    console.error('Failed to open album folder:', error);
    toast.error('打开文件夹失败');
  }
};

const uploadImages = async () => {
  const targetAlbumId = currentAlbumId.value === 'all' || currentAlbumId.value === 'favorites'
    ? albums.value[0]?.id
    : currentAlbumId.value;
  
  if (!targetAlbumId) {
    toast.error('请先创建一个相册');
    return;
  }
  
  try {
    const selected = await open({
      multiple: true,
      filters: [{
        name: '图片文件',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
      }]
    });
    
    if (!selected) return;
    
    const files = Array.isArray(selected) ? selected : [selected];
    
    loading.value = true;
    
    for (const filePath of files) {
      const fileName = filePath.split(/[/\\]/).pop() || 'image.jpg';
      
      await invoke('import_image_to_album', {
        albumId: targetAlbumId,
        sourcePath: filePath,
        fileName,
      });
    }
    
    toast.success(`成功导入 ${files.length} 张图片`);
    await loadImages();
  } catch (error) {
    console.error('Failed to upload images:', error);
    toast.error('导入图片失败');
  } finally {
    loading.value = false;
  }
};

const uploadFolder = async () => {
  const targetAlbumId = currentAlbumId.value === 'all' || currentAlbumId.value === 'favorites'
    ? albums.value[0]?.id
    : currentAlbumId.value;
  
  if (!targetAlbumId) {
    toast.error('请先创建一个相册');
    return;
  }
  
  try {
    const folderPath = await invoke<string>('select_folder', {
      title: '选择图片文件夹'
    });
    
    if (!folderPath) return;
    
    loading.value = true;
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const files = await invoke<string[]>('list_files_in_folder', { folderPath });
    
    const imageFiles = files.filter(file => {
      const ext = file.split('.').pop()?.toLowerCase() || '';
      return imageExts.includes(ext);
    });
    
    if (imageFiles.length === 0) {
      toast.info('文件夹中没有找到图片文件');
      loading.value = false;
      return;
    }
    
    uploadProgress.value = {
      visible: true,
      total: imageFiles.length,
      current: 0,
      fileName: '',
      cancelled: false,
      startTime: Date.now(),
      speed: '',
    };
    
    const batchSize = 100;
    let successCount = 0;
    let lastUpdateTime = Date.now();
    let lastUpdateCount = 0;
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      if (uploadProgress.value.cancelled) {
        break;
      }
      
      const batch = imageFiles.slice(i, i + batchSize);
      
      const batchData = batch.map(filePath => {
        const fileName = filePath.split(/[/\\]/).pop() || 'image.jpg';
        return { sourcePath: filePath, fileName };
      });
      
      try {
        const results = await invoke<number>('batch_import_images', {
          albumId: targetAlbumId,
          images: batchData,
        });
        
        successCount += results;
        
        const now = Date.now();
        if (now - lastUpdateTime > 100) {
          const timeDiff = (now - lastUpdateTime) / 1000;
          const countDiff = successCount - lastUpdateCount;
          const speed = countDiff / timeDiff;
          
          uploadProgress.value.speed = `${speed.toFixed(1)} 张/秒`;
          uploadProgress.value.current = successCount;
          uploadProgress.value.fileName = batch[batch.length - 1].split(/[/\\]/).pop() || '';
          
          lastUpdateTime = now;
          lastUpdateCount = successCount;
        }
        
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error) {
        console.error('Failed to import batch:', error);
      }
    }
    
    uploadProgress.value.visible = false;
    
    if (!uploadProgress.value.cancelled) {
      toast.success(`成功导入 ${successCount} 张图片`);
      await loadImages();
    } else {
      toast.info(`已取消上传，成功导入 ${successCount} 张图片`);
      if (successCount > 0) {
        await loadImages();
      }
    }
  } catch (error) {
    console.error('Failed to upload folder:', error);
    toast.error('导入文件夹失败');
    uploadProgress.value.visible = false;
  } finally {
    loading.value = false;
  }
};

const cancelUpload = () => {
  uploadProgress.value.cancelled = true;
};

const toggleFavorite = async (imageId: string) => {
  try {
    const image = images.value.find(img => img.id === imageId);
    if (!image) return;
    
    const newFavorite = !image.favorite;
    await invoke('update_image_favorite', { imageId, favorite: newFavorite });
    
    image.favorite = newFavorite;
    toast.success(newFavorite ? '已添加到收藏' : '已取消收藏');
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    toast.error('操作失败');
  }
};

const deleteImage = async (imageId: string) => {
  if (!confirm('确定要删除这张图片吗？')) return;
  
  try {
    await invoke('delete_image', { imageId });
    toast.success('删除成功');
    await loadImages();
  } catch (error) {
    console.error('Failed to delete image:', error);
    toast.error('删除失败');
  }
};

const openImageFolder = async (imagePath: string) => {
  try {
    await fileService.showInFolder(imagePath);
  } catch (error) {
    console.error('Failed to open image folder:', error);
    toast.error('打开文件夹失败');
  }
};

const viewImage = (index: number) => {
  viewerIndex.value = index;
  viewerVisible.value = true;
};

const closeViewer = () => {
  viewerVisible.value = false;
};

const handlePrevImage = () => {
  viewerIndex.value = Math.max(0, viewerIndex.value - 1);
};

const handleNextImage = () => {
  viewerIndex.value = Math.min(filteredImages.value.length - 1, viewerIndex.value + 1);
};

const handleJumpToImage = (index: number) => {
  viewerIndex.value = index;
};

const adjustWaterfallColumns = (delta: number) => {
  const newColumns = waterfallColumns.value + delta;
  if (newColumns >= 1 && newColumns <= 6) {
    waterfallColumns.value = newColumns;
  }
};

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    selectedIds.value.clear();
  }
};

const toggleImageSelection = (imageId: string) => {
  if (selectedIds.value.has(imageId)) {
    selectedIds.value.delete(imageId);
  } else {
    selectedIds.value.add(imageId);
  }
};

const selectAll = () => {
  displayImages.value.forEach(img => {
    selectedIds.value.add(img.id);
  });
};

const deselectAll = () => {
  selectedIds.value.clear();
};

const deleteSelected = async () => {
  if (selectedIds.value.size === 0) {
    toast.info('请先选择要删除的图片');
    return;
  }
  
  if (!confirm(`确定要删除选中的 ${selectedIds.value.size} 张图片吗？`)) return;
  
  try {
    loading.value = true;
    const ids = Array.from(selectedIds.value);
    
    for (const imageId of ids) {
      await invoke('delete_image', { imageId });
    }
    
    toast.success(`成功删除 ${ids.length} 张图片`);
    selectedIds.value.clear();
    selectMode.value = false;
    await loadImages();
  } catch (error) {
    console.error('Failed to delete images:', error);
    toast.error('删除图片失败');
  } finally {
    loading.value = false;
  }
};

const handleDragOver = (_e: DragEvent) => {
  isDragOver.value = true;
};

const handleDragLeave = (_e: DragEvent) => {
  isDragOver.value = false;
};

const handleDrop = async (e: DragEvent) => {
  isDragOver.value = false;
  
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const imageFiles = Array.from(files).filter(file => 
    file.type.startsWith('image/')
  );
  
  if (imageFiles.length === 0) {
    toast.info('请拖放图片文件');
    return;
  }
  
  const targetAlbumId = currentAlbumId.value === 'all' || currentAlbumId.value === 'favorites'
    ? albums.value[0]?.id
    : currentAlbumId.value;
  
  if (!targetAlbumId) {
    toast.error('请先创建一个相册');
    return;
  }
  
  try {
    loading.value = true;
    
    if (imageFiles.length > 50) {
      uploadProgress.value = {
        visible: true,
        total: imageFiles.length,
        current: 0,
        fileName: '',
        cancelled: false,
        startTime: Date.now(),
        speed: '',
      };
      
      const batchSize = 100;
      let successCount = 0;
      let lastUpdateTime = Date.now();
      let lastUpdateCount = 0;
      
      for (let i = 0; i < imageFiles.length; i += batchSize) {
        if (uploadProgress.value.cancelled) {
          break;
        }
        
        const batch = imageFiles.slice(i, i + batchSize);
        
        const batchData = batch.map(file => {
          const filePath = (file as any).path;
          return { sourcePath: filePath, fileName: file.name };
        }).filter(item => item.sourcePath);
        
        if (batchData.length === 0) continue;
        
        try {
          const results = await invoke<number>('batch_import_images', {
            albumId: targetAlbumId,
            images: batchData,
          });
          
          successCount += results;
          
          const now = Date.now();
          if (now - lastUpdateTime > 100) {
            const timeDiff = (now - lastUpdateTime) / 1000;
            const countDiff = successCount - lastUpdateCount;
            const speed = countDiff / timeDiff;
            
            uploadProgress.value.speed = `${speed.toFixed(1)} 张/秒`;
            uploadProgress.value.current = successCount;
            uploadProgress.value.fileName = batch[batch.length - 1].name;
            
            lastUpdateTime = now;
            lastUpdateCount = successCount;
          }
          
          await new Promise(resolve => setTimeout(resolve, 0));
        } catch (error) {
          console.error('Failed to import batch:', error);
        }
      }
      
      uploadProgress.value.visible = false;
      
      if (!uploadProgress.value.cancelled) {
        toast.success(`成功导入 ${successCount} 张图片`);
        await loadImages();
      } else {
        toast.info(`已取消上传，成功导入 ${successCount} 张图片`);
        if (successCount > 0) {
          await loadImages();
        }
      }
    } else {
      let successCount = 0;
      
      for (const file of imageFiles) {
        try {
          const filePath = (file as any).path;
          if (!filePath) {
            console.warn(`File ${file.name} has no path, skipping`);
            continue;
          }
          
          await invoke<ImageMetadata>('import_image_to_album', {
            albumId: targetAlbumId,
            sourcePath: filePath,
            fileName: file.name
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
        }
      }
      
      if (successCount > 0) {
        toast.success(`成功导入 ${successCount} 张图片`);
        await loadImages();
      }
    }
  } catch (error) {
    console.error('Failed to import images:', error);
    toast.error('导入图片失败');
  } finally {
    loading.value = false;
  }
};

const getImageSrc = (image: ImageMetadata) => {
  return convertFileSrc(image.file_path);
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

onMounted(async () => {
  await loadAlbums();
  await loadImages();
  
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (settingsPanelVisible.value && !target.closest('.settings-wrapper')) {
    settingsPanelVisible.value = false;
  }
};
</script>

<template>
  <div 
    class="gallery-page"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    :class="{ 'drag-over': isDragOver }"
  >
    <!-- 拖放提示 -->
    <Transition name="fade">
      <div v-if="isDragOver" class="drag-overlay">
        <div class="drag-content">
          <Upload :size="48" class="drag-icon" />
          <p class="drag-text">释放图片以导入</p>
        </div>
      </div>
    </Transition>
    
    <div class="gallery-container">
      <main class="main-content">
        <header class="toolbar">
          <div class="toolbar-left">
            <h1 class="toolbar-title">{{ currentAlbum.name }}</h1>
            <span class="image-count">
              共 {{ filteredImages.length }} 张 | 已显示 {{ displayImages.length }} 张
            </span>
          </div>
          
          <div class="toolbar-center">
            <!-- 视图模式切换 -->
            <div class="view-mode-btns">
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="网格视图"
              >
                <Grid3X3 :size="18" />
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'waterfall' }"
                @click="viewMode = 'waterfall'"
                title="瀑布流"
              >
                <LayoutGrid :size="18" />
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
                title="列表视图"
              >
                <List :size="18" />
              </button>
            </div>
          </div>
          
          <div class="toolbar-right">
            <div class="settings-wrapper">
              <button 
                class="toolbar-btn settings-btn"
                :class="{ active: settingsPanelVisible }"
                @click="toggleSettingsPanel"
                title="设置"
              >
                <Settings :size="16" />
                <ChevronDown :size="12" class="chevron" :class="{ rotated: settingsPanelVisible }" />
              </button>
              
              <Transition name="dropdown">
                <div v-if="settingsPanelVisible" class="settings-panel" @click.stop>
                  <div class="settings-header">
                    <Settings :size="14" />
                    <span>图片管理设置</span>
                  </div>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <span class="settings-label">显示滚动条</span>
                      <span class="settings-desc">在图片列表区域显示滚动条</span>
                    </div>
                    <button
                      class="toggle-switch"
                      :class="{ active: showScrollbar }"
                      @click="showScrollbar = !showScrollbar"
                    >
                      <span class="toggle-slider"></span>
                    </button>
                  </div>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <span class="settings-label">默认缩放倍数</span>
                      <span class="settings-desc">打开图片查看器时的初始缩放比例</span>
                    </div>
                    <div class="zoom-options">
                      <button
                        v-for="zoom in zoomOptions"
                        :key="zoom"
                        class="zoom-option"
                        :class="{ active: defaultZoom === zoom }"
                        @click="defaultZoom = zoom"
                      >
                        {{ zoom * 100 }}%
                      </button>
                    </div>
                  </div>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <span class="settings-label">显示缩略图</span>
                      <span class="settings-desc">打开图片查看器时默认显示底部缩略图</span>
                    </div>
                    <button
                      class="toggle-switch"
                      :class="{ active: defaultShowThumbnail }"
                      @click="defaultShowThumbnail = !defaultShowThumbnail"
                    >
                      <span class="toggle-slider"></span>
                    </button>
                  </div>
                  
                  <div class="settings-item">
                    <div class="settings-item-info">
                      <span class="settings-label">滚轮模式</span>
                      <span class="settings-desc">滚轮默认用于切换图片或缩放图片</span>
                    </div>
                    <div class="mode-options">
                      <button
                        class="mode-option"
                        :class="{ active: defaultScrollMode === 'navigate' }"
                        @click="defaultScrollMode = 'navigate'"
                      >
                        切换图片
                      </button>
                      <button
                        class="mode-option"
                        :class="{ active: defaultScrollMode === 'zoom' }"
                        @click="defaultScrollMode = 'zoom'"
                      >
                        缩放图片
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
            
            <button 
              class="toolbar-btn"
              :class="{ active: selectMode }"
              @click="toggleSelectMode"
              :title="selectMode ? '退出选择模式' : '进入选择模式'"
            >
              <CheckSquare :size="16" />
              {{ selectMode ? '取消' : '批量选择' }}
            </button>
            
            <!-- 瀑布流列数选择器 -->
            <Transition name="fade">
              <div v-if="viewMode === 'waterfall'" class="column-selector">
                <button class="column-btn" @click="adjustWaterfallColumns(-1)" :disabled="waterfallColumns <= 1">
                  <Minus :size="14" />
                </button>
                <span class="column-count">{{ waterfallColumns }}列</span>
                <button class="column-btn" @click="adjustWaterfallColumns(1)" :disabled="waterfallColumns >= 6">
                  <Plus :size="14" />
                </button>
              </div>
            </Transition>
            
            <button class="toolbar-btn" @click="uploadFolder">
              <FolderUp :size="16" />
              上传文件夹
            </button>
            <button class="toolbar-btn" @click="uploadImages">
              <Upload :size="16" />
              上传图片
            </button>
            <button 
              class="toolbar-btn"
              @click="toggleDrawer"
              :title="drawerVisible ? '关闭相册管理' : '打开相册管理'"
            >
              <FolderOpen :size="16" />
              相册管理
            </button>
          </div>
        </header>

        <Transition name="slide-down">
          <div v-if="selectMode" class="batch-toolbar">
            <div class="batch-info">
              <CheckSquare :size="16" />
              <span>已选择 {{ selectedIds.size }} 张图片</span>
            </div>
            <div class="batch-actions">
              <button class="batch-btn" @click="selectAll" :disabled="selectedIds.size === displayImages.length">
                <Check :size="14" />
                全选
              </button>
              <button class="batch-btn" @click="deselectAll" :disabled="selectedIds.size === 0">
                <Square :size="14" />
                取消选择
              </button>
              <button class="batch-btn danger" @click="deleteSelected" :disabled="selectedIds.size === 0">
                <Trash2 :size="14" />
                删除选中
              </button>
            </div>
          </div>
        </Transition>

        <div class="content-area" ref="gridContainerRef" :class="{ 'hide-scrollbar': !showScrollbar }">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          
          <div v-else-if="filteredImages.length === 0" class="empty-state">
            <Images :size="64" class="empty-icon" />
            <h3>相册为空</h3>
            <p>点击上方"上传图片"按钮添加图片</p>
          </div>
          
          <div v-else class="image-grid-container">
            <div 
              :class="['image-grid', viewMode]" 
              :style="viewMode === 'waterfall' ? { columnCount: waterfallColumns } : {}"
            >
              <div
                v-for="(image, index) in displayImages"
                :key="image.id"
                :class="['image-card', { selected: selectedIds.has(image.id) }]"
                @click="selectMode ? toggleImageSelection(image.id) : viewImage(index)"
              >
                <div v-if="selectMode" class="selection-overlay">
                  <div class="selection-checkbox" :class="{ checked: selectedIds.has(image.id) }">
                    <Check v-if="selectedIds.has(image.id)" :size="16" />
                  </div>
                </div>
                
                <!-- 列表视图 -->
                <template v-if="viewMode === 'list'">
                  <div class="image-wrapper">
                    <img
                      :src="getImageSrc(image)"
                      :alt="image.name"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div class="list-info">
                    <div class="list-info-header">
                      <p class="image-name">{{ image.name }}</p>
                      <button
                        class="favorite-btn"
                        :class="{ active: image.favorite }"
                        @click.stop="toggleFavorite(image.id)"
                      >
                        <Heart :size="16" />
                      </button>
                    </div>
                    <div class="list-info-details">
                      <div class="detail-item">
                        <span class="detail-label">大小:</span>
                        <span class="detail-value">{{ formatSize(image.size) }}</span>
                      </div>
                    </div>
                    <div class="list-actions">
                      <button class="action-btn" @click.stop="viewImage(index)" title="查看">
                        <Eye :size="14" />
                        <span>查看</span>
                      </button>
                      <button class="action-btn" @click.stop="openImageFolder(image.file_path)" title="打开文件夹">
                        <ExternalLink :size="14" />
                        <span>打开位置</span>
                      </button>
                      <button class="action-btn danger" @click.stop="deleteImage(image.id)" title="删除">
                        <Trash2 :size="14" />
                        <span>删除</span>
                      </button>
                    </div>
                  </div>
                </template>
                
                <!-- 其他视图 -->
                <template v-else>
                  <div class="image-wrapper">
                    <img
                      :src="getImageSrc(image)"
                      :alt="image.name"
                      loading="lazy"
                      decoding="async"
                    />
                    <div class="image-overlay">
                      <div class="overlay-top">
                        <button
                          class="overlay-btn"
                          :class="{ favorite: image.favorite }"
                          @click.stop="toggleFavorite(image.id)"
                        >
                          <Heart :size="16" />
                        </button>
                      </div>
                      <div class="overlay-bottom">
                        <p class="image-name">{{ image.name }}</p>
                        <div class="image-info">
                          <span>{{ formatSize(image.size) }}</span>
                        </div>
                        <div class="image-actions">
                          <button class="action-btn" @click.stop="viewImage(index)" title="查看">
                            <Eye :size="14" />
                          </button>
                          <button class="action-btn" @click.stop="openImageFolder(image.file_path)" title="打开文件夹">
                            <ExternalLink :size="14" />
                          </button>
                          <button class="action-btn" @click.stop="deleteImage(image.id)" title="删除">
                            <Trash2 :size="14" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            
            <!-- 加载更多按钮 -->
            <div v-if="hasMoreImages" class="load-more-container">
              <button 
                class="load-more-btn" 
                @click="loadMoreImages"
                :disabled="isLoadingMore"
              >
                <span v-if="isLoadingMore" class="loading-spinner-small"></span>
                <span>{{ isLoadingMore ? '加载中...' : '加载更多' }}</span>
              </button>
              <p class="load-more-info">
                已显示 {{ displayImages.length }} / {{ filteredImages.length }} 张
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 底部抽屉式相册管理 -->
    <Transition name="drawer">
      <div v-if="drawerVisible" class="album-drawer" @click="toggleDrawer">
        <div class="drawer-content" @click.stop>
          <div class="drawer-header">
            <div class="drawer-title">
              <FolderOpen :size="18" />
              <h2>相册管理</h2>
            </div>
            <div class="drawer-header-actions">
              <button class="json-btn" @click="showJsonContent" title="查看JSON数据">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
              </button>
              <button class="close-drawer-btn" @click="toggleDrawer">
                <X :size="16" />
              </button>
            </div>
          </div>
          
          <div class="drawer-body">
            <div class="albums-grid">
              <!-- 默认相册 -->
              <div class="album-card" :class="{ active: currentAlbumId === 'all' }" @click="currentAlbumId = 'all'">
                <div class="album-card-icon">
                  <Images :size="20" />
                </div>
                <div class="album-card-info">
                  <h3>全部图片</h3>
                  <span class="album-count">{{ images.length }} 张</span>
                </div>
              </div>
              
              <div class="album-card" :class="{ active: currentAlbumId === 'favorites' }" @click="currentAlbumId = 'favorites'">
                <div class="album-card-icon favorite">
                  <Heart :size="20" />
                </div>
                <div class="album-card-info">
                  <h3>我的收藏</h3>
                  <span class="album-count">{{ images.filter(i => i.favorite).length }} 张</span>
                </div>
              </div>
              
              <!-- 自定义相册 -->
              <div
                v-for="album in albums"
                :key="album.id"
                class="album-card"
                :class="{ active: currentAlbumId === album.id }"
                @click="currentAlbumId = album.id"
              >
                <div class="album-card-icon custom">
                  <FolderOpen :size="20" />
                </div>
                <div class="album-card-info">
                  <h3>{{ album.name }}</h3>
                  <span class="album-count">{{ images.filter(i => i.album_id === album.id).length }} 张</span>
                </div>
                <button class="album-card-action" @click.stop="showAlbumMenu($event, album.id, album.name)" title="更多操作">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </button>
              </div>
              
              <!-- 添加新相册 -->
              <div class="album-card add-album" @click="createAlbum">
                <div class="album-card-icon add">
                  <Plus :size="20" />
                </div>
                <div class="album-card-info">
                  <h3>新建相册</h3>
                  <span class="album-count">点击创建</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 新建相册弹窗 -->
    <Modal
      v-model:visible="createAlbumModalVisible"
      title="新建相册"
      width="400px"
    >
      <div class="create-album-form">
        <label class="form-label">相册名称</label>
        <input
          v-model="newAlbumName"
          type="text"
          class="form-input"
          placeholder="请输入相册名称"
          @keyup.enter="confirmCreateAlbum"
        />
      </div>
      
      <template #footer>
        <button class="btn btn-secondary" @click="createAlbumModalVisible = false">
          取消
        </button>
        <button class="btn btn-primary" @click="confirmCreateAlbum">
          创建
        </button>
      </template>
    </Modal>

    <!-- JSON内容弹窗 -->
    <Modal
      v-model:visible="jsonModalVisible"
      :title="`图片数据 (显示 ${Math.min(jsonDisplayCount, jsonTotalCount)} / ${jsonTotalCount} 条)`"
      width="800px"
    >
      <div class="json-content-wrapper">
        <pre class="json-content">{{ jsonContent }}</pre>
      </div>
      
      <template #footer>
        <button 
          v-if="jsonDisplayCount < jsonTotalCount"
          class="btn btn-secondary" 
          @click="loadMoreJson"
        >
          加载更多 (还剩 {{ jsonTotalCount - jsonDisplayCount }} 条)
        </button>
        <button class="btn btn-secondary" @click="openDatabaseFolder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          打开文件夹
        </button>
        <button class="btn btn-secondary" @click="jsonModalVisible = false">
          关闭
        </button>
        <button class="btn btn-primary" @click="copyJsonContent">
          复制内容
        </button>
      </template>
    </Modal>

    <!-- 上传进度弹窗 -->
    <Modal
      v-model:visible="uploadProgress.visible"
      title="正在导入图片"
      width="500px"
      :showClose="false"
      :closeOnOverlay="false"
    >
      <div class="upload-progress-content">
        <div class="progress-info">
          <div class="progress-numbers">
            <span class="current">{{ uploadProgress.current }}</span>
            <span class="separator">/</span>
            <span class="total">{{ uploadProgress.total }}</span>
          </div>
          <div class="progress-stats">
            <div class="progress-percentage">
              {{ Math.round((uploadProgress.current / uploadProgress.total) * 100) }}%
            </div>
            <div v-if="uploadProgress.speed" class="progress-speed">
              {{ uploadProgress.speed }}
            </div>
          </div>
        </div>
        
        <div class="progress-bar-container">
          <div 
            class="progress-bar-fill" 
            :style="{ 
              width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
              background: getProgressColor()
            }"
          ></div>
          <div 
            class="progress-bar-glow" 
            :style="{ 
              width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
              background: getGlowColor()
            }"
          ></div>
        </div>
        
        <div class="current-file">
          <span class="label">当前文件：</span>
          <span class="filename">{{ uploadProgress.fileName }}</span>
        </div>
      </div>
      
      <template #footer>
        <button class="btn btn-danger" @click="cancelUpload" :disabled="uploadProgress.cancelled">
          {{ uploadProgress.cancelled ? '正在取消...' : '取消上传' }}
        </button>
      </template>
    </Modal>

    <!-- 相册右键菜单 -->
    <Transition name="fade">
      <div 
        v-if="contextMenu?.visible" 
        class="context-menu-overlay" 
        @click="contextMenu = null"
      >
        <div 
          class="context-menu" 
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @click.stop
        >
          <div class="context-menu-item" @click="openAlbumFolder(contextMenu.albumName)">
            <ExternalLink :size="14" />
            <span>打开文件夹</span>
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item danger" @click="deleteAlbum()">
            <Trash2 :size="14" />
            <span>删除相册</span>
          </div>
        </div>
      </div>
    </Transition>

    <ImageViewer
      :images="filteredImages.map(img => ({ url: getImageSrc(img), name: img.name }))"
      :current-index="viewerIndex"
      :is-open="viewerVisible"
      :default-zoom="defaultZoom"
      :show-thumbnail="defaultShowThumbnail"
      :scroll-mode="defaultScrollMode"
      @close="closeViewer"
      @prev="handlePrevImage"
      @next="handleNextImage"
      @jump-to="handleJumpToImage"
    />
  </div>
</template>

<style scoped>
.gallery-page {
  height: 100vh;
  background-color: transparent;
  overflow: hidden;
}

.gallery-container {
  height: 100%;
  display: flex;
  position: relative;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.image-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.view-mode-btns {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background-color: var(--bg-tertiary);
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background-color: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.view-mode-btn:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.view-mode-btn.active {
  background-color: var(--primary-color);
  color: white;
}

.toolbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.toolbar-btn.active {
  background-color: rgba(6, 182, 212, 0.15);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.column-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 10px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  height: 36px;
}

.column-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.column-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: white;
}

.column-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.column-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 36px;
  text-align: center;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(59, 130, 246, 0.08));
  border-bottom: 1px solid rgba(6, 182, 212, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 600;
}

.batch-info svg {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.batch-btn:hover:not(:disabled) {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.batch-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.batch-btn.danger:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.image-grid-container {
  position: relative;
  width: 100%;
  min-height: 100%;
}

.load-more-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  margin-top: 16px;
  gap: 12px;
}

.load-more-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  border-radius: 10px;
  border: 2px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.load-more-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.3);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.load-more-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.image-count-footer {
  display: flex;
  justify-content: center;
  padding: 16px;
  margin-top: 8px;
}

.image-count-footer p {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
  padding: 6px 12px;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.5);
  border-radius: 6px;
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.2);
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  scrollbar-gutter: stable;
}

.content-area::-webkit-scrollbar {
  width: 8px;
}

.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.content-area::-webkit-scrollbar-thumb {
  background-color: rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  border-radius: 4px;
  transition: background-color 0.2s;
}

.content-area::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--border-color-rgb, 200, 200, 200), 0.5);
}

.content-area.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.content-area.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}

.image-grid {
  display: grid;
  gap: 16px;
}

.image-grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.image-grid.waterfall {
  column-gap: 16px;
  display: block;
}

.image-grid.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s;
  will-change: transform;
  contain: layout style;
}

.image-grid.waterfall .image-card {
  break-inside: avoid;
  margin-bottom: 16px;
  page-break-inside: avoid;
}

.image-grid.list .image-card {
  display: flex;
  flex-direction: row;
  height: 120px;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.image-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.3);
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  transition: background-color 0.2s;
}

.image-card.selected .selection-overlay {
  background-color: rgba(6, 182, 212, 0.15);
}

.selection-checkbox {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background-color: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.selection-checkbox:hover {
  transform: scale(1.1);
  background-color: rgba(255, 255, 255, 0.35);
}

.selection-checkbox.checked {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
}

.image-wrapper {
  position: relative;
  width: 100%;
}

.image-grid.grid .image-wrapper {
  padding-top: 100%;
}

.image-grid.waterfall .image-wrapper {
  padding-top: 0;
}

.image-grid.list .image-wrapper {
  width: 160px;
  height: 100%;
  flex-shrink: 0;
  padding-top: 0;
}

.image-wrapper img {
  display: block;
  width: 100%;
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.image-grid.grid .image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  object-fit: cover;
}

.image-grid.waterfall .image-wrapper img {
  position: relative;
  height: auto;
}

.image-grid.list .image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
}

.image-grid.list .image-overlay {
  position: absolute;
  left: 160px;
  right: 0;
  top: 0;
  bottom: 0;
  width: auto;
  background: linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 30%);
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.overlay-top {
  display: flex;
  justify-content: flex-end;
}

.overlay-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.overlay-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.overlay-btn.favorite {
  color: #ef4444;
}

.overlay-bottom {
  color: white;
}

.image-name {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-info {
  display: flex;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.list-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
}

.list-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.list-info-header .image-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.favorite-btn:hover {
  background-color: var(--bg-primary);
  color: var(--primary-color);
}

.favorite-btn.active {
  color: #ef4444;
}

.list-info-details {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.detail-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.list-actions {
  display: flex;
  gap: 8px;
}

.list-actions .action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: auto;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.list-actions .action-btn:hover {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: none;
}

.list-actions .action-btn.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
}

.album-drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
}

.drawer-content {
  width: 66.67%;
  max-height: 45vh;
  background: linear-gradient(180deg, 
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.75) 0%,
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.65) 100%
  );
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: 16px 16px 0 0;
  border-top: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: auto;
  margin: 0 auto;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 10px;
  border-bottom: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.2);
  background: linear-gradient(180deg, 
    rgba(var(--bg-secondary-rgb, 248, 250, 252), 0.5) 0%,
    transparent 100%
  );
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.drawer-title svg {
  color: var(--primary-color);
}

.close-drawer-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.8);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-drawer-btn:hover {
  background: #ef4444;
  color: white;
  transform: rotate(90deg);
}

.drawer-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.json-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.8);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.json-btn:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.05);
}

.drawer-body {
  padding: 12px 20px 20px;
  overflow-y: auto;
  max-height: calc(45vh - 50px);
}

.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.album-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  border-radius: 10px;
  background: rgba(var(--bg-secondary-rgb, 248, 250, 252), 0.6);
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.album-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 6, 182, 212), 0) 0%,
    rgba(var(--primary-color-rgb, 6, 182, 212), 0) 100%
  );
  transition: all 0.2s ease;
  z-index: 0;
}

.album-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  border-color: rgba(var(--primary-color-rgb, 6, 182, 212), 0.3);
}

.album-card:hover::before {
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.05) 0%,
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.02) 100%
  );
}

.album-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.15);
}

.album-card.active::before {
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.08) 0%,
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.03) 100%
  );
}

.album-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.12) 0%,
    rgba(var(--primary-color-rgb, 6, 182, 212), 0.04) 100%
  );
  color: var(--primary-color);
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;
}

.album-card:hover .album-card-icon {
  transform: scale(1.05);
}

.album-card.active .album-card-icon {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 100%);
  color: white;
}

.album-card-icon.favorite {
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.12) 0%,
    rgba(239, 68, 68, 0.04) 100%
  );
  color: #ef4444;
}

.album-card.active .album-card-icon.favorite {
  background: linear-gradient(135deg, #ef4444 0%, #ef4444 100%);
  color: white;
}

.album-card-icon.custom {
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.12) 0%,
    rgba(99, 102, 241, 0.04) 100%
  );
  color: #6366f1;
}

.album-card.active .album-card-icon.custom {
  background: linear-gradient(135deg, #6366f1 0%, #6366f1 100%);
  color: white;
}

.album-card-icon.add {
  background: linear-gradient(135deg, 
    rgba(34, 197, 94, 0.12) 0%,
    rgba(34, 197, 94, 0.04) 100%
  );
  color: #22c55e;
}

.album-card.add-album:hover .album-card-icon.add {
  background: linear-gradient(135deg, #22c55e 0%, #22c55e 100%);
  color: white;
}

.album-card-info {
  text-align: center;
  position: relative;
  z-index: 1;
}

.album-card-info h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2px 0;
  transition: all 0.2s ease;
}

.album-card.active .album-card-info h3 {
  color: var(--primary-color);
}

.album-count {
  font-size: 10px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.album-card-action {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: none;
  background: rgba(var(--bg-primary-rgb, 255, 255, 255), 0.9);
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0;
  z-index: 2;
}

.album-card:hover .album-card-action {
  opacity: 1;
}

.album-card-action:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-content,
.drawer-leave-to .drawer-content {
  transform: translateY(100%);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.gallery-page.drag-over {
  position: relative;
}

.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(6, 182, 212, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 64px;
  border-radius: 16px;
  background-color: rgba(var(--bg-primary-rgb), 0.95);
  border: 2px dashed var(--primary-color);
  box-shadow: 0 8px 32px rgba(6, 182, 212, 0.3);
}

.drag-icon {
  color: var(--primary-color);
  animation: bounce 1s ease infinite;
}

.drag-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.create-album-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 6, 182, 212), 0.1);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color) 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 6, 182, 212), 0.3);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.json-content-wrapper {
  max-height: 60vh;
  overflow-y: auto;
  border-radius: 8px;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.5);
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
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
  overflow-wrap: break-word;
}

.upload-progress-content {
  padding: 8px 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.progress-numbers .current {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.progress-numbers .separator {
  font-size: 18px;
  color: var(--text-tertiary);
  margin: 0 2px;
}

.progress-numbers .total {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-secondary);
}

.progress-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.progress-percentage {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
}

.progress-speed {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: rgba(var(--primary-color-rgb, 6, 182, 212), 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.progress-bar-container {
  width: 100%;
  height: 14px;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.8);
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 16px;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 7px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
  box-shadow: 
    0 0 15px rgba(255, 255, 255, 0.4),
    0 0 30px rgba(var(--primary-color-rgb, 6, 182, 212), 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.3);
}

.progress-bar-glow {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 7px;
  z-index: 3;
  animation: shimmer 2s infinite;
  filter: blur(2px);
  opacity: 0.8;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.current-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(var(--bg-tertiary-rgb, 241, 245, 249), 0.5);
  border-radius: 8px;
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
}

.current-file .label {
  font-size: 13px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.current-file .filename {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #ef4444 100%);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #dc2626 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3000;
}

.context-menu {
  position: fixed;
  background: linear-gradient(180deg, 
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.98) 0%,
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 6px;
  min-width: 160px;
  z-index: 3001;
  animation: scaleIn 0.15s ease;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-primary);
  font-size: 13px;
}

.context-menu-item:hover {
  background: rgba(var(--primary-color-rgb, 6, 182, 212), 0.1);
  color: var(--primary-color);
}

.context-menu-item.danger {
  color: #ef4444;
}

.context-menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.context-menu-divider {
  height: 1px;
  background: rgba(var(--border-color-rgb, 200, 200, 200), 0.3);
  margin: 6px 0;
}

.settings-wrapper {
  position: relative;
}

.settings-btn {
  padding-right: 10px;
}

.settings-btn .chevron {
  transition: transform 0.2s ease;
}

.settings-btn .chevron.rotated {
  transform: rotate(180deg);
}

.settings-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 280px;
  background: linear-gradient(180deg, 
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.98) 0%,
    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.95) 100%
  );
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.settings-header svg {
  color: var(--primary-color);
}

.settings-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item-info {
  margin-bottom: 10px;
}

.settings-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.settings-desc {
  display: block;
  font-size: 11px;
  color: var(--text-tertiary);
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background-color 0.2s;
  padding: 0;
}

.toggle-switch.active {
  background: var(--primary-color);
}

.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(20px);
}

.zoom-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.zoom-option {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-option:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.zoom-option.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.mode-options {
  display: flex;
  gap: 6px;
}

.mode-option {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-option:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mode-option.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
