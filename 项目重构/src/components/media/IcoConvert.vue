<script setup lang="ts">
import { ref, computed } from 'vue';
import { Image as ImageIcon, Upload, Circle, Square, RectangleHorizontal, Download, RotateCcw, ZoomIn, ZoomOut, Check, Info, X } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';

const ffmpegStore = useFFmpegStore();

const image = ref<HTMLImageElement | null>(null);
const imageSrc = ref<string | null>(null);
const imageName = ref<string>('');
const inputFilePath = ref<string>('');
const cropShape = ref<'circle' | 'square' | 'custom'>('circle');
const cropArea = ref({ x: 50, y: 50, width: 200, height: 200 });
const zoom = ref(1);
const customFileName = ref('');
const showPreview = ref(false);
const isProcessing = ref(false);
const previewImages = ref<{ size: number; url: string }[]>([]);

const ICO_SIZES = [
  { size: 16, label: '16×16' },
  { size: 32, label: '32×32' },
  { size: 48, label: '48×48' },
  { size: 64, label: '64×64' },
  { size: 128, label: '128×128' },
  { size: 256, label: '256×256' },
];

const selectedSizes = ref(ICO_SIZES.map(s => ({ ...s, selected: s.size === 32 || s.size === 64 || s.size === 128 || s.size === 256 })));

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }

  const filePath = (file as any).path || file.name;

  const reader = new FileReader();
  reader.onload = (event) => {
    const src = event.target?.result as string;
    imageSrc.value = src;
    imageName.value = file.name.replace(/\.[^/.]+$/, '');
    inputFilePath.value = filePath;
    
    const img = new Image();
    img.onload = () => {
      image.value = img;
      const minDim = Math.min(img.width, img.height);
      const cropSize = Math.min(minDim * 0.8, 300);
      cropArea.value = {
        x: (img.width - cropSize) / 2,
        y: (img.height - cropSize) / 2,
        width: cropSize,
        height: cropSize,
      };
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
};

const toggleSize = (size: number) => {
  selectedSizes.value = selectedSizes.value.map(s => 
    s.size === size ? { ...s, selected: !s.selected } : s
  );
};

const selectAllSizes = () => {
  selectedSizes.value = selectedSizes.value.map(s => ({ ...s, selected: true }));
};

const deselectAllSizes = () => {
  selectedSizes.value = selectedSizes.value.map(s => ({ ...s, selected: false }));
};

const resetCrop = () => {
  if (!image.value) return;
  const minDim = Math.min(image.value.width, image.value.height);
  const cropSize = Math.min(minDim * 0.8, 300);
  cropArea.value = {
    x: (image.value.width - cropSize) / 2,
    y: (image.value.height - cropSize) / 2,
    width: cropSize,
    height: cropSize,
  };
  zoom.value = 1;
};

const generatePreview = async () => {
  if (!image.value) {
    alert('请先选择图片');
    return;
  }

  const sizes = selectedSizes.value.filter(s => s.selected).map(s => s.size);
  if (sizes.length === 0) {
    alert('请至少选择一个输出尺寸');
    return;
  }

  const previews: { size: number; url: string }[] = [];

  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    if (cropShape.value === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    
    ctx.drawImage(
      image.value,
      cropArea.value.x, cropArea.value.y, cropArea.value.width, cropArea.value.height,
      0, 0, size, size
    );
    
    const url = canvas.toDataURL('image/png');
    previews.push({ size, url });
  }

  previewImages.value = previews;
  showPreview.value = true;
};

const generateIco = async () => {
  if (!image.value) {
    alert('请先选择图片');
    return;
  }

  const sizes = selectedSizes.value.filter(s => s.selected).map(s => s.size);
  if (sizes.length === 0) {
    alert('请至少选择一个输出尺寸');
    return;
  }

  setIsProcessing(true);
  
  const now = new Date();
  const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const finalName = customFileName.value.trim() || `${imageName.value}_${dateTimeSuffix}`;
  
  try {
    const icoData = await createIcoFromImage(image.value, cropArea.value, sizes, cropShape.value);
    const blob = new Blob([icoData], { type: 'image/x-icon' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalName}.ico`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const taskId = ffmpegStore.addTask({
      fileName: `${imageName.value}.ico`,
      module: 'icoConvert',
      status: 'completed',
      progress: 100,
      inputPath: inputFilePath.value,
      outputPath: `${finalName}.ico`,
    });
    ffmpegStore.addTaskLog(taskId, '[done] ICO 文件已生成并下载');
    
    alert('ICO 文件已生成');
  } catch (error) {
    console.error('生成 ICO 失败:', error);
    alert('生成 ICO 失败');
  } finally {
    setIsProcessing(false);
  }
};

const createIcoFromImage = async (
  img: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
  sizes: number[],
  shape: 'circle' | 'square' | 'custom'
): Promise<ArrayBuffer> => {
  const images: { width: number; height: number; data: Uint8Array }[] = [];
  
  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.width, crop.height,
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
  
  return createIcoBuffer(images);
};

const createIcoBuffer = (images: { width: number; height: number; data: Uint8Array }[]): ArrayBuffer => {
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
  
  return buffer;
};

const displayWidth = computed(() => image.value ? Math.min(500, image.value.width * zoom.value) : 500);
const displayHeight = computed(() => image.value ? (displayWidth.value / image.value.width) * image.value.height : 400);
const scale = computed(() => image.value ? displayWidth.value / image.value.width : 1);
</script>

<template>
  <div class="ico-converter">
    <div class="header">
      <div class="title-row">
        <ImageIcon :size="20" class="icon success" />
        <h2>ICO 图标转换</h2>
        <span class="badge green">图片工具</span>
        <span v-if="ffmpegStore.config.binPath" class="badge gray">
          输出: {{ ffmpegStore.config.binPath }}
        </span>
      </div>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon success" />
            <span class="card-title">图片导入</span>
          </div>
          <label class="drop-zone">
            <input type="file" accept="image/*" @change="handleFileSelect" />
            <div class="drop-zone-content">
              <ImageIcon :size="40" class="upload-icon" />
              <p>拖拽图片到此处或点击选择</p>
              <p class="hint">支持 PNG, JPG, WebP 等格式</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">裁剪形状</span>
          </div>
          <div class="shape-grid">
            <button 
              v-for="s in [
                { key: 'circle', label: '圆形', icon: Circle },
                { key: 'square', label: '正方形', icon: Square },
                { key: 'custom', label: '自定义', icon: RectangleHorizontal },
              ]"
              :key="s.key"
              :class="['shape-btn', { active: cropShape === s.key }]"
              @click="cropShape = s.key as 'circle' | 'square' | 'custom'"
            >
              <component :is="s.icon" :size="16" />
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">输出尺寸</span>
            <div class="size-actions">
              <button class="size-action" @click="selectAllSizes">全选</button>
              <button class="size-action" @click="deselectAllSizes">取消</button>
            </div>
          </div>
          <div class="size-grid">
            <button 
              v-for="s in selectedSizes"
              :key="s.size"
              :class="['size-btn', { active: s.selected }]"
              @click="toggleSize(s.size)"
            >
              <Check v-if="s.selected" :size="12" />
              <span>{{ s.label }}</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">输出文件名</span>
          </div>
          <div class="filename-input">
            <input 
              type="text" 
              v-model="customFileName"
              placeholder="留空则使用默认名称"
            />
            <span class="extension">.ico</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="card">
          <div class="card-header">
            <div class="header-left">
              <span class="card-title">裁剪预览</span>
              <span v-if="image" class="image-size">
                原图: {{ image.width }}×{{ image.height }}
              </span>
            </div>
            <div class="zoom-controls">
              <button class="zoom-btn" @click="zoom = Math.max(0.5, zoom - 0.1)" title="缩小">
                <ZoomOut :size="16" />
              </button>
              <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
              <button class="zoom-btn" @click="zoom = Math.min(2, zoom + 0.1)" title="放大">
                <ZoomIn :size="16" />
              </button>
              <button class="zoom-btn" @click="resetCrop" title="重置">
                <RotateCcw :size="16" />
              </button>
            </div>
          </div>
          <div class="preview-container">
            <div v-if="!image" class="empty-preview">
              <ImageIcon :size="64" class="empty-icon" />
              <p>请先导入图片</p>
            </div>
            <div v-else class="preview-image" :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }">
              <img :src="imageSrc!" alt="预览" draggable="false" />
              <div 
                class="crop-overlay"
                :style="{
                  left: `${cropArea.x * scale}px`,
                  top: `${cropArea.y * scale}px`,
                  width: `${cropArea.width * scale}px`,
                  height: `${cropArea.height * scale}px`,
                  borderRadius: cropShape === 'circle' ? '50%' : '4px',
                }"
              >
                <span class="crop-size">{{ Math.round(cropArea.width) }}×{{ Math.round(cropArea.height) }}</span>
              </div>
            </div>
          </div>
          <div v-if="image" class="preview-hint">
            <Info :size="14" class="icon success" />
            <span>拖拽框体移动位置，拖拽四角调整大小。选择输出尺寸后点击生成按钮导出 ICO 文件。</span>
          </div>
        </div>

        <div class="card action-card">
          <div class="action-row">
            <div class="selected-info">
              <span class="selected-count">已选择 {{ selectedSizes.filter(s => s.selected).length }} 个尺寸</span>
              <span class="selected-sizes">{{ selectedSizes.filter(s => s.selected).map(s => s.label).join(', ') || '无' }}</span>
            </div>
            <div class="action-buttons">
              <button 
                class="preview-btn"
                :disabled="!image || selectedSizes.filter(s => s.selected).length === 0 || isProcessing"
                @click="generatePreview"
              >
                <Info :size="16" />
                预览
              </button>
              <button 
                class="generate-btn"
                :disabled="!image || selectedSizes.filter(s => s.selected).length === 0 || isProcessing"
                @click="generateIco"
              >
                <Download :size="16" />
                {{ isProcessing ? '生成中...' : '生成 ICO 文件' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPreview" class="preview-modal-overlay" @click="showPreview = false">
      <div class="preview-modal" @click.stop>
        <div class="modal-header">
          <h3>ICO 预览 - {{ previewImages.length }} 个尺寸</h3>
          <button class="close-btn" @click="showPreview = false">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="preview-grid">
            <div v-for="preview in previewImages" :key="preview.size" class="preview-item">
              <div class="preview-image-container" :style="{ borderRadius: cropShape === 'circle' ? '50%' : '8px' }">
                <img :src="preview.url" :alt="`${preview.size}x${preview.size}`" />
              </div>
              <span class="preview-size">{{ preview.size }}×{{ preview.size }}</span>
              <span class="preview-label">
                {{ preview.size <= 32 ? '小图标' : preview.size <= 64 ? '中等图标' : preview.size <= 128 ? '大图标' : '超大图标' }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="showPreview = false">关闭</button>
          <button class="confirm-btn" @click="showPreview = false; generateIco()">
            <Download :size="16" />
            确认导出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ico-converter {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  color: var(--primary-color);
}

.icon.success {
  color: #10b981;
}

h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 9999px;
}

.badge.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge.gray {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 8px;
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.drop-zone {
  display: block;
  padding: 24px;
  border: 2px dashed #10b981;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: rgba(16, 185, 129, 0.05);
}

.drop-zone:hover {
  border-color: #059669;
  background-color: rgba(16, 185, 129, 0.1);
}

.drop-zone input {
  display: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

.upload-icon {
  opacity: 0.5;
}

.drop-zone-content p {
  font-size: 12px;
  margin: 0;
}

.drop-zone-content .hint {
  font-size: 10px;
}

.shape-grid {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
}

.shape-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.shape-btn:hover {
  background-color: var(--hover-bg);
}

.shape-btn.active {
  background-color: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}

.size-actions {
  display: flex;
  gap: 4px;
}

.size-action {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.size-action:hover {
  color: var(--text-secondary);
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 16px;
}

.size-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-btn:hover {
  background-color: var(--hover-bg);
}

.size-btn.active {
  background-color: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
  color: #10b981;
}

.filename-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
}

.filename-input input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.filename-input input:focus {
  border-color: #10b981;
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-size {
  font-size: 10px;
  color: var(--text-tertiary);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-btn {
  padding: 6px;
  border-radius: 6px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background-color: var(--hover-bg);
}

.zoom-value {
  font-size: 12px;
  color: var(--text-tertiary);
}

.preview-container {
  min-height: 300px;
  max-height: 500px;
  overflow: auto;
  background-color: var(--bg-tertiary);
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  color: var(--text-tertiary);
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: 12px;
}

.empty-preview p {
  font-size: 12px;
  margin: 0;
}

.preview-image {
  position: relative;
  display: inline-block;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.crop-overlay {
  position: absolute;
  border: 2px solid #10b981;
  background-color: rgba(16, 185, 129, 0.1);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-size {
  font-size: 10px;
  color: white;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 6px;
  border-radius: 4px;
}

.preview-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(16, 185, 129, 0.1);
  font-size: 10px;
  color: var(--text-secondary);
}

.action-card {
  padding: 16px;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selected-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.selected-sizes {
  font-size: 12px;
  color: var(--text-tertiary);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.preview-btn,
.generate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.preview-btn:hover:not(:disabled) {
  background-color: var(--hover-bg);
}

.generate-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.generate-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.preview-btn:disabled,
.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
}

.preview-modal {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
}

.close-btn:hover {
  background-color: var(--hover-bg);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.preview-image-container {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-primary);
  margin-bottom: 8px;
}

.preview-image-container img {
  max-width: 100%;
  max-height: 100%;
}

.preview-size {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.preview-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.confirm-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: var(--bg-tertiary);
  border: none;
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background-color: var(--hover-bg);
}

.confirm-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: white;
}

.confirm-btn:hover {
  transform: scale(1.05);
}
</style>
