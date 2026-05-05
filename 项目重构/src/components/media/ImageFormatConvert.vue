<script setup lang="ts">
import { ref, computed } from 'vue';
import { Image as ImageIcon, Upload, Download, Settings2, Info, Trash2, Plus, Check } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';

const ffmpegStore = useFFmpegStore();

interface ImageFile {
  id: string;
  file: File;
  name: string;
  preview: string;
  size: number;
  width: number;
  height: number;
  inputPath: string;
}

const images = ref<ImageFile[]>([]);
const customFileName = ref('');
const isProcessing = ref(false);

const outputSettings = ref({
  format: 'png',
  quality: 92,
  resize: false,
  resizeWidth: 800,
  resizeHeight: 600,
  maintainAspectRatio: true,
});

const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', description: '无损压缩，支持透明' },
  { value: 'jpeg', label: 'JPG', mime: 'image/jpeg', description: '有损压缩，文件较小' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', description: '现代格式，压缩率高' },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp', description: '无压缩位图格式' },
  { value: 'gif', label: 'GIF', mime: 'image/gif', description: '支持动画，256色' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  addImages(files);
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
  addImages(files);
};

const addImages = (files: File[]) => {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const filePath = (file as any).path || file.name;
        
        images.value.push({
          id: generateId(),
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
          preview,
          size: file.size,
          width: img.width,
          height: img.height,
          inputPath: filePath,
        });
      };
      img.src = preview;
    };
    reader.readAsDataURL(file);
  });
};

const removeImage = (id: string) => {
  images.value = images.value.filter(img => img.id !== id);
};

const clearAllImages = () => {
  images.value = [];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const convertImages = async () => {
  if (images.value.length === 0) {
    alert('请先添加图片');
    return;
  }

  isProcessing.value = true;
  const format = OUTPUT_FORMATS.find(f => f.value === outputSettings.value.format)!;
  
  const taskId = ffmpegStore.addTask({
    fileName: `${images.value.length} 张图片`,
    module: 'imageFormatConvert',
    status: 'processing',
    progress: 0,
    inputPath: images.value.map(i => i.inputPath).join(', '),
    outputPath: '浏览器下载',
  });
  
  ffmpegStore.addTaskLog(taskId, `[info] 开始转换 ${images.value.length} 张图片`);
  ffmpegStore.addTaskLog(taskId, `[info] 输出格式: ${format.label}`);
  ffmpegStore.addTaskLog(taskId, `[info] 质量: ${outputSettings.value.quality}%`);

  try {
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < images.value.length; i++) {
      const image = images.value[i];
      const progress = ((i + 1) / images.value.length) * 100;
      ffmpegStore.updateTask(taskId, { progress });
      ffmpegStore.addTaskLog(taskId, `[info] 处理: ${image.name}`);
      
      try {
        await convertSingleImage(image);
        successCount++;
        ffmpegStore.addTaskLog(taskId, `[done] ✅ ${image.name} 转换成功`);
      } catch (error) {
        failCount++;
        ffmpegStore.addTaskLog(taskId, `[error] ❌ ${image.name} 转换失败: ${error}`);
      }
    }
    
    ffmpegStore.updateTask(taskId, { progress: 100 });
    
    if (failCount === 0) {
      ffmpegStore.addTaskLog(taskId, `[done] ✅ 全部 ${successCount} 张图片转换完成`);
      ffmpegStore.updateTask(taskId, { status: 'completed' });
      alert(`成功转换 ${successCount} 张图片`);
    } else {
      ffmpegStore.addTaskLog(taskId, `[info] 完成: ${successCount} 成功, ${failCount} 失败`);
      ffmpegStore.updateTask(taskId, { status: failCount < images.value.length ? 'completed' : 'error', error: `${failCount} 张图片转换失败` });
      alert(`${successCount} 张成功, ${failCount} 张失败`);
    }
  } catch (error) {
    console.error('转换失败:', error);
    ffmpegStore.addTaskLog(taskId, `[error] ❌ 转换失败: ${error}`);
    ffmpegStore.updateTask(taskId, { status: 'error', error: String(error) });
    alert('转换失败');
  } finally {
    isProcessing.value = false;
  }
};

const convertSingleImage = async (image: ImageFile): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (outputSettings.value.resize) {
        if (outputSettings.value.maintainAspectRatio) {
          const ratio = img.width / img.height;
          if (ratio > outputSettings.value.resizeWidth / outputSettings.value.resizeHeight) {
            width = outputSettings.value.resizeWidth;
            height = width / ratio;
          } else {
            height = outputSettings.value.resizeHeight;
            width = height * ratio;
          }
        } else {
          width = outputSettings.value.resizeWidth;
          height = outputSettings.value.resizeHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const format = OUTPUT_FORMATS.find(f => f.value === outputSettings.value.format)!;
      const quality = outputSettings.value.quality / 100;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('转换失败'));
          return;
        }

        const now = new Date();
        const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const finalName = customFileName.value.trim() || `${image.name}_${dateTimeSuffix}`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${finalName}.${format.value}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        resolve();
      }, format.mime, quality);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = image.preview;
  });
};

const selectedFormat = computed(() => OUTPUT_FORMATS.find(f => f.value === outputSettings.format));
</script>

<template>
  <div class="image-format-convert">
    <div class="header">
      <div class="title-row">
        <ImageIcon :size="20" class="icon primary" />
        <h2>图片格式转换</h2>
        <span class="badge primary">图片工具</span>
        <span v-if="ffmpegStore.config.binPath" class="badge gray">
          输出: {{ ffmpegStore.config.binPath }}
        </span>
      </div>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon primary" />
            <span class="card-title">图片导入</span>
            <button v-if="images.length > 0" class="btn-clear" @click="clearAllImages">清空全部</button>
          </div>
          <label class="drop-zone" @dragover.prevent @drop="handleDrop">
            <input type="file" accept="image/*" multiple @change="handleFileSelect" />
            <div class="drop-zone-content">
              <Plus :size="40" class="upload-icon" />
              <p>拖拽图片到此处或点击选择</p>
              <p class="hint">支持 PNG, JPG, WebP, BMP, GIF 等格式</p>
            </div>
          </label>
          <div v-if="images.length > 0" class="image-count">
            已添加 {{ images.length }} 张图片
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <Settings2 :size="16" class="icon primary" />
            <span class="card-title">输出格式</span>
          </div>
          <div class="format-list">
            <button 
              v-for="format in OUTPUT_FORMATS"
              :key="format.value"
              :class="['format-option', { active: outputSettings.format === format.value }]"
              @click="outputSettings.format = format.value"
            >
              <div class="format-info">
                <Check v-if="outputSettings.format === format.value" :size="14" class="check-icon" />
                <div class="format-text">
                  <div class="format-label">{{ format.label }}</div>
                  <div class="format-desc">{{ format.description }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">质量控制</span>
            <span class="quality-value">{{ outputSettings.quality }}%</span>
          </div>
          <div class="quality-control">
            <input 
              type="range" 
              v-model="outputSettings.quality"
              min="1"
              max="100"
            />
            <div class="quality-labels">
              <span>低质量/小文件</span>
              <span>高质量/大文件</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">调整尺寸</span>
            <button 
              :class="['toggle-btn', { active: outputSettings.resize }]"
              @click="outputSettings.resize = !outputSettings.resize"
            >
              <div class="toggle-dot" :class="{ active: outputSettings.resize }" />
            </button>
          </div>
          <div v-if="outputSettings.resize" class="resize-options">
            <div class="resize-input">
              <label>宽度</label>
              <input type="number" v-model="outputSettings.resizeWidth" />
              <span>px</span>
            </div>
            <div class="resize-input">
              <label>高度</label>
              <input type="number" v-model="outputSettings.resizeHeight" />
              <span>px</span>
            </div>
            <label class="checkbox-label">
              <input type="checkbox" v-model="outputSettings.maintainAspectRatio" />
              保持宽高比
            </label>
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
              placeholder="留空则使用原文件名"
            />
            <span class="extension">.{{ selectedFormat?.value }}</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="card">
          <div class="card-header">
            <span class="card-title">图片列表</span>
            <span v-if="images.length > 0" class="total-size">
              共 {{ images.length }} 张，总大小 {{ formatFileSize(images.reduce((sum, img) => sum + img.size, 0)) }}
            </span>
          </div>

          <div v-if="images.length === 0" class="empty-list">
            <ImageIcon :size="64" class="empty-icon" />
            <p>请先添加要转换的图片</p>
          </div>

          <div v-else class="image-grid">
            <div v-for="image in images" :key="image.id" class="image-item">
              <img :src="image.preview" :alt="image.name" />
              <div class="image-overlay" @click="removeImage(image.id)">
                <Trash2 :size="16" class="remove-icon" />
              </div>
              <div class="image-info">
                <div class="image-name">{{ image.name }}</div>
                <div class="image-details">
                  <span>{{ image.width }}×{{ image.height }}</span>
                  <span>{{ formatFileSize(image.size) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="images.length > 0" class="output-hint">
            <Info :size="14" class="icon primary" />
            <span>转换后的图片将自动下载到浏览器默认下载位置。</span>
          </div>
        </div>

        <div class="card action-card">
          <div class="action-row">
            <div class="output-settings">
              <span class="settings-label">输出设置</span>
              <span class="settings-value">
                格式: {{ selectedFormat?.label }} | 质量: {{ outputSettings.quality }}%
                <template v-if="outputSettings.resize">
                  | 尺寸: {{ outputSettings.resizeWidth }}×{{ outputSettings.resizeHeight }}
                </template>
              </span>
            </div>
            <button 
              class="convert-btn"
              :disabled="images.length === 0 || isProcessing"
              @click="convertImages"
            >
              <Download :size="16" />
              {{ isProcessing ? '转换中...' : `转换 ${images.length} 张图片` }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-format-convert {
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

.icon.primary {
  color: var(--primary-color);
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

.badge.primary {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
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

.btn-clear {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
}

.btn-clear:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.drop-zone {
  display: block;
  padding: 24px;
  border: 2px dashed var(--primary-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: rgba(59, 130, 246, 0.05);
}

.drop-zone:hover {
  border-color: #2563eb;
  background-color: rgba(59, 130, 246, 0.1);
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

.image-count {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.format-list {
  padding: 8px;
}

.format-option {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.format-option:hover {
  background-color: var(--hover-bg);
}

.format-option.active {
  background-color: rgba(59, 130, 246, 0.15);
  border-color: var(--primary-color);
}

.format-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-icon {
  color: var(--primary-color);
}

.format-text {
  text-align: left;
}

.format-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.format-option.active .format-label {
  color: var(--primary-color);
}

.format-desc {
  font-size: 10px;
  color: var(--text-tertiary);
}

.quality-value {
  font-size: 12px;
  color: var(--text-tertiary);
}

.quality-control {
  padding: 12px 16px;
}

.quality-control input {
  width: 100%;
}

.quality-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.toggle-btn {
  width: 40px;
  height: 20px;
  border-radius: 9999px;
  border: none;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.toggle-btn.active {
  background-color: var(--primary-color);
}

.toggle-dot {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.toggle-dot.active {
  transform: translateX(20px);
}

.resize-options {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resize-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resize-input label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
}

.resize-input input {
  flex: 1;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.resize-input span {
  font-size: 12px;
  color: var(--text-tertiary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
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
  border-color: var(--primary-color);
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.total-size {
  font-size: 12px;
  color: var(--text-tertiary);
}

.empty-list {
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

.empty-list p {
  font-size: 12px;
  margin: 0;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px 16px;
  max-height: 400px;
  overflow-y: auto;
}

.image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

.image-item img {
  width: 100%;
  height: 128px;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.remove-icon {
  color: white;
  padding: 8px;
  background-color: #ef4444;
  border-radius: 50%;
}

.image-info {
  padding: 8px;
}

.image-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-details {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-tertiary);
}

.output-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(59, 130, 246, 0.1);
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

.output-settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-value {
  font-size: 12px;
  color: var(--text-tertiary);
}

.convert-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), #2563eb);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}

.convert-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.convert-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
