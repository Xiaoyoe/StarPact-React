<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '@/composables/useToast';
import {
  Images, FolderOpen, Upload, Grid3X3, LayoutGrid, List,
  Heart, Eye, Edit3, Trash2, MoreHorizontal, ChevronLeft,
  ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, X
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
const selectedIds = ref<Set<string>>(new Set());
const viewMode = ref<'grid' | 'waterfall' | 'list'>('grid');
const showSidebar = ref(true);
const loading = ref(false);

const viewerVisible = ref(false);
const viewerIndex = ref(0);
const viewerZoom = ref(1);
const viewerRotation = ref(0);

const currentAlbum = computed(() => {
  if (currentAlbumId.value === 'all') {
    return { id: 'all', name: '全部图片', created_at: 0, updated_at: 0 };
  }
  if (currentAlbumId.value === 'favorites') {
    return { id: 'favorites', name: '收藏', created_at: 0, updated_at: 0 };
  }
  return albums.value.find(a => a.id === currentAlbumId.value) || { id: 'all', name: '全部图片', created_at: 0, updated_at: 0 };
});

const displayImages = computed(() => {
  if (currentAlbumId.value === 'favorites') {
    return images.value.filter(img => img.favorite);
  }
  if (currentAlbumId.value === 'all') {
    return images.value;
  }
  return images.value.filter(img => img.album_id === currentAlbumId.value);
});

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

const createAlbum = async () => {
  const name = prompt('请输入相册名称');
  if (!name) return;
  
  try {
    const album: ImageAlbum = {
      id: `album_${Date.now()}`,
      name,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await invoke('save_album', { album });
    toast.success('创建相册成功');
    await loadAlbums();
  } catch (error) {
    console.error('Failed to create album:', error);
    toast.error('创建相册失败');
  }
};

const deleteAlbum = async (albumId: string) => {
  if (!confirm('确定要删除这个相册吗？相册内的所有图片也会被删除。')) return;
  
  try {
    await invoke('delete_album', { albumId });
    toast.success('删除相册成功');
    await loadAlbums();
    await loadImages();
    if (currentAlbumId.value === albumId) {
      currentAlbumId.value = 'all';
    }
  } catch (error) {
    console.error('Failed to delete album:', error);
    toast.error('删除相册失败');
  }
};

const uploadImages = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = 'image/*';
  
  input.onchange = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0) return;
    
    const targetAlbumId = currentAlbumId.value === 'all' || currentAlbumId.value === 'favorites'
      ? albums.value[0]?.id
      : currentAlbumId.value;
    
    if (!targetAlbumId) {
      toast.error('请先创建一个相册');
      return;
    }
    
    loading.value = true;
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const fileData = Array.from(new Uint8Array(arrayBuffer));
        
        await invoke('upload_image', {
          albumId: targetAlbumId,
          fileName: file.name,
          fileData,
        });
      }
      toast.success(`成功上传 ${files.length} 张图片`);
      await loadImages();
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error('上传图片失败');
    } finally {
      loading.value = false;
    }
  };
  
  input.click();
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

const viewImage = (index: number) => {
  viewerIndex.value = index;
  viewerZoom.value = 1;
  viewerRotation.value = 0;
  viewerVisible.value = true;
};

const closeViewer = () => {
  viewerVisible.value = false;
};

const navigateImage = (direction: number) => {
  const newIndex = viewerIndex.value + direction;
  if (newIndex >= 0 && newIndex < displayImages.value.length) {
    viewerIndex.value = newIndex;
    viewerZoom.value = 1;
    viewerRotation.value = 0;
  }
};

const zoomImage = (delta: number) => {
  viewerZoom.value = Math.max(0.25, Math.min(5, viewerZoom.value + delta));
};

const rotateImage = () => {
  viewerRotation.value = (viewerRotation.value + 90) % 360;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

onMounted(async () => {
  await loadAlbums();
  await loadImages();
});
</script>

<template>
  <div class="gallery-page">
    <div class="gallery-container">
      <aside v-if="showSidebar" class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">相册管理</h2>
          <button class="create-album-btn" @click="createAlbum">
            <FolderOpen :size="16" />
            新建相册
          </button>
        </div>
        
        <nav class="album-list">
          <button
            class="album-item"
            :class="{ active: currentAlbumId === 'all' }"
            @click="currentAlbumId = 'all'"
          >
            <Images :size="16" />
            <span>全部图片</span>
            <span class="count">{{ images.length }}</span>
          </button>
          
          <button
            class="album-item"
            :class="{ active: currentAlbumId === 'favorites' }"
            @click="currentAlbumId = 'favorites'"
          >
            <Heart :size="16" />
            <span>收藏</span>
            <span class="count">{{ images.filter(i => i.favorite).length }}</span>
          </button>
          
          <div class="album-divider">我的相册</div>
          
          <button
            v-for="album in albums"
            :key="album.id"
            class="album-item"
            :class="{ active: currentAlbumId === album.id }"
            @click="currentAlbumId = album.id"
            @contextmenu.prevent="deleteAlbum(album.id)"
          >
            <FolderOpen :size="16" />
            <span>{{ album.name }}</span>
            <span class="count">{{ images.filter(i => i.album_id === album.id).length }}</span>
          </button>
        </nav>
      </aside>

      <main class="main-content">
        <header class="toolbar">
          <div class="toolbar-left">
            <button class="toolbar-btn" @click="showSidebar = !showSidebar">
              <Images :size="18" />
            </button>
            <h1 class="toolbar-title">{{ currentAlbum.name }}</h1>
            <span class="image-count">{{ displayImages.length }} 张图片</span>
          </div>
          
          <div class="toolbar-center">
            <div class="view-mode-btns">
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="网格视图"
              >
                <Grid3X3 :size="16" />
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'waterfall' }"
                @click="viewMode = 'waterfall'"
                title="瀑布流"
              >
                <LayoutGrid :size="16" />
              </button>
              <button
                class="view-mode-btn"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
                title="列表视图"
              >
                <List :size="16" />
              </button>
            </div>
          </div>
          
          <div class="toolbar-right">
            <button class="upload-btn" @click="uploadImages">
              <Upload :size="16" />
              上传图片
            </button>
          </div>
        </header>

        <div class="content-area">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          
          <div v-else-if="displayImages.length === 0" class="empty-state">
            <Images :size="64" class="empty-icon" />
            <h3>相册为空</h3>
            <p>点击上方"上传图片"按钮添加图片</p>
          </div>
          
          <div v-else class="image-grid" :class="viewMode">
            <div
              v-for="(image, index) in displayImages"
              :key="image.id"
              class="image-card"
              @click="viewImage(index)"
            >
              <div class="image-wrapper">
                <img
                  :src="`file://${image.file_path}`"
                  :alt="image.name"
                  loading="lazy"
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
                      <span>{{ image.width }}×{{ image.height }}</span>
                      <span>{{ formatSize(image.size) }}</span>
                    </div>
                    <div class="image-actions">
                      <button class="action-btn" @click.stop="viewImage(index)" title="查看">
                        <Eye :size="14" />
                      </button>
                      <button class="action-btn" @click.stop="deleteImage(image.id)" title="删除">
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div v-if="viewerVisible" class="image-viewer" @click="closeViewer">
      <div class="viewer-header">
        <div class="viewer-info">
          <h3>{{ displayImages[viewerIndex]?.name }}</h3>
          <p>{{ viewerIndex + 1 }} / {{ displayImages.length }}</p>
        </div>
        <div class="viewer-actions">
          <button class="viewer-btn" @click.stop="zoomImage(-0.25)">
            <ZoomOut :size="18" />
          </button>
          <span class="zoom-level">{{ Math.round(viewerZoom * 100) }}%</span>
          <button class="viewer-btn" @click.stop="zoomImage(0.25)">
            <ZoomIn :size="18" />
          </button>
          <button class="viewer-btn" @click.stop="rotateImage">
            <RotateCw :size="18" />
          </button>
          <button class="viewer-btn close-btn" @click.stop="closeViewer">
            <X :size="18" />
          </button>
        </div>
      </div>
      
      <div class="viewer-content" @click.stop>
        <button
          v-if="viewerIndex > 0"
          class="nav-btn prev"
          @click.stop="navigateImage(-1)"
        >
          <ChevronLeft :size="32" />
        </button>
        
        <img
          v-if="displayImages[viewerIndex]"
          :src="`file://${displayImages[viewerIndex].file_path}`"
          :alt="displayImages[viewerIndex].name"
          :style="{
            transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`,
          }"
          @click.stop
        />
        
        <button
          v-if="viewerIndex < displayImages.length - 1"
          class="nav-btn next"
          @click.stop="navigateImage(1)"
        >
          <ChevronRight :size="32" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
}

.gallery-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.create-album-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-album-btn:hover {
  opacity: 0.9;
}

.album-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.album-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.album-item:hover {
  background-color: var(--bg-tertiary);
}

.album-item.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 600;
}

.album-item .count {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.7;
}

.album-divider {
  padding: 16px 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background-color: var(--bg-tertiary);
}

.toolbar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.image-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-mode-btns {
  display: flex;
  gap: 4px;
  padding: 4px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-btn:hover {
  color: var(--text-secondary);
}

.view-mode-btn.active {
  background-color: var(--bg-primary);
  color: var(--primary-color);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover {
  opacity: 0.9;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-tertiary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-tertiary);
}

.image-grid {
  display: grid;
  gap: 16px;
}

.image-grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.image-grid.waterfall {
  column-count: 4;
  column-gap: 16px;
}

.image-grid.list {
  grid-template-columns: 1fr;
}

.image-card {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.image-grid.waterfall .image-card {
  break-inside: avoid;
  margin-bottom: 16px;
}

.image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%;
}

.image-grid.list .image-wrapper {
  padding-top: 0;
  height: 120px;
}

.image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-grid.list .image-wrapper img {
  position: relative;
  width: auto;
  height: 100%;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-card:hover .image-overlay {
  opacity: 1;
}

.overlay-top {
  position: absolute;
  top: 8px;
  right: 8px;
}

.overlay-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.overlay-btn:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

.overlay-btn.favorite {
  color: #ef4444;
}

.overlay-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  color: white;
}

.image-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-info {
  display: flex;
  gap: 8px;
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.image-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.image-viewer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: rgba(0, 0, 0, 0.8);
}

.viewer-info h3 {
  font-size: 16px;
  font-weight: 500;
  color: white;
  margin-bottom: 4px;
}

.viewer-info p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.viewer-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.close-btn {
  background-color: rgba(239, 68, 68, 0.2);
}

.close-btn:hover {
  background-color: rgba(239, 68, 68, 0.3);
}

.zoom-level {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  min-width: 50px;
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
  transition: transform 0.2s ease;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.nav-btn.prev {
  left: 24px;
}

.nav-btn.next {
  right: 24px;
}
</style>
