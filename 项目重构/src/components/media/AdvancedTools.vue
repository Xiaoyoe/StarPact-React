<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Clapperboard, Zap, Stamp, ImageIcon, Camera, AlertCircle, Square, Play, Info, FileType, Upload, Sparkles, X, Maximize2, Eraser } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import type { MediaInfo } from '@/types/ffmpeg';

const ffmpegStore = useFFmpegStore();

const tab = ref('compress');
const inputFiles = ref<InputFile[]>([]);
const mainFileIndex = ref(0);
const dropZoneKey = ref(0);
const showFullscreen = ref(false);
const customFileName = ref('');

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

const targetSize = ref(50);
const compressQuality = ref('balanced');
const keepAudio = ref(true);

const wmText = ref('FFmpeg Studio');
const wmPosition = ref('bottomright');
const wmOpacity = ref(80);
const wmSize = ref(24);
const wmColor = ref('#ffffff');

const gifFps = ref(15);
const gifWidth = ref(480);
const gifStart = ref('00:00:00');
const gifDuration = ref('5');
const gifLoop = ref(0);

const ssMode = ref('interval');
const ssInterval = ref(5);
const ssFormat = ref('PNG');

const rmWmX = ref(10);
const rmWmY = ref(10);
const rmWmWidth = ref(100);
const rmWmHeight = ref(50);
const rmWmMode = ref<'blur' | 'fill' | 'inpaint'>('blur');
const rmWmBlurStrength = ref(4);
const rmWmOutputFormat = ref<'video' | 'image'>('video');
const rmWmImageFormat = ref('png');

const mainFile = computed(() => inputFiles.value.length > mainFileIndex.value ? inputFiles.value[mainFileIndex.value] : null);
const hasThumbnail = computed(() => mainFile.value && mainFile.value.thumbnail);

const currentModuleTask = computed(() => {
  return ffmpegStore.tasks.find(t => t.module === 'advancedTools' && ffmpegStore.activeTaskIds.has(t.id));
});
const isCurrentModuleProcessing = computed(() => !!currentModuleTask.value);

const handleFilesSelected = async (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const inputFilesData: InputFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    inputFilesData.push({
      file,
      path: (file as any).path || file.name,
      name: file.name,
      size: file.size,
    });
  }

  inputFiles.value = inputFilesData;
  mainFileIndex.value = 0;
  customFileName.value = '';

  await loadMainFileInfo(inputFilesData, 0);
};

const loadMainFileInfo = async (files: InputFile[], index: number) => {
  if (files.length > index && files[index].path) {
    const mediaInfo = await ffmpegService.getMediaInfo(
      ffmpegStore.config.ffprobePath,
      files[index].path
    );
    if (mediaInfo) {
      inputFiles.value = inputFiles.value.map((f, i) => i === index ? { ...f, mediaInfo } : f);
    }
  }
};

const selectMainFile = async (index: number) => {
  mainFileIndex.value = index;
  customFileName.value = '';
  await loadMainFileInfo(inputFiles.value, index);
};

const clearAllFiles = () => {
  inputFiles.value = [];
  mainFileIndex.value = 0;
  customFileName.value = '';
  dropZoneKey.value++;
};

const getOutputFilePath = (extension: string, suffix?: string): string => {
  if (!mainFile.value) return '';
  
  const inputPath = mainFile.value.path;
  const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
  const lastDotIndex = mainFile.value.name.lastIndexOf('.');
  const inputName = lastDotIndex >= 0 ? mainFile.value.name.substring(0, lastDotIndex) : mainFile.value.name;
  
  const outputDir = inputDir;
  const sep = outputDir.includes('\\') ? '\\' : '/';
  
  const now = new Date();
  const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  
  const finalName = customFileName.value.trim() 
    ? customFileName.value.trim() 
    : `${inputName}${suffix ? `_${suffix}` : ''}_${dateTimeSuffix}`;
  
  return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
};

const buildCompressArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  args.push('-c:v', 'libx264');
  args.push('-preset', compressQuality.value === 'quality' ? 'slow' : compressQuality.value === 'size' ? 'veryfast' : 'medium');
  
  const duration = mainFile.value!.mediaInfo?.duration || 60;
  const targetBitrate = Math.floor((targetSize.value * 8 * 1024) / duration);
  args.push('-b:v', `${targetBitrate}k`);
  
  if (keepAudio.value) {
    args.push('-c:a', 'copy');
  } else {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }
  
  args.push('-y');
  args.push(getOutputFilePath('mp4', 'compressed'));
  
  return args;
};

const buildWatermarkArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  const positionMap: Record<string, string> = {
    'topleft': '10:10',
    'topright': 'w-tw-10:10',
    'bottomleft': '10:h-th-10',
    'bottomright': 'w-tw-10:h-th-10',
    'center': '(w-tw)/2:(h-th)/2',
  };
  
  const filter = `drawtext=text='${wmText.value}':fontsize=${wmSize.value}:fontcolor=${wmColor.value}@${wmOpacity.value / 100}:x=${positionMap[wmPosition.value].split(':')[0]}:y=${positionMap[wmPosition.value].split(':')[1]}`;
  
  args.push('-vf', filter);
  args.push('-c:a', 'copy');
  args.push('-y');
  args.push(getOutputFilePath('mp4', 'watermarked'));
  
  return args;
};

const buildGifArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  args.push('-ss', gifStart.value);
  args.push('-t', gifDuration.value);
  args.push('-vf', `fps=${gifFps.value},scale=${gifWidth.value}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`);
  args.push('-loop', String(gifLoop.value));
  args.push('-y');
  args.push(getOutputFilePath('gif'));
  
  return args;
};

const buildScreenshotArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  if (ssMode.value === 'interval') {
    args.push('-vf', `fps=1/${ssInterval.value}`);
  }
  
  args.push('-y');
  args.push(getOutputFilePath(ssFormat.value.toLowerCase(), 'frame_%04d'));
  
  return args;
};

const buildRemoveWatermarkArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  if (rmWmMode.value === 'blur') {
    args.push('-vf', `boxblur=${rmWmBlurStrength.value}:1:cr=0:ar=0:x=${rmWmX.value}:y=${rmWmY.value}:w=${rmWmWidth.value}:h=${rmWmHeight.value}`);
  }
  
  args.push('-c:a', 'copy');
  args.push('-y');
  args.push(getOutputFilePath(rmWmOutputFormat.value === 'image' ? rmWmImageFormat.value : 'mp4', 'nowatermark'));
  
  return args;
};

const handleStart = async () => {
  if (!ffmpegStore.isConfigured) {
    alert('请先在配置中设置 FFmpeg bin 目录');
    return;
  }

  if (inputFiles.value.length === 0 || !mainFile.value) {
    alert('请先选择要处理的文件');
    return;
  }

  let args: string[];
  let outputPath: string;

  switch (tab.value) {
    case 'compress':
      args = buildCompressArgs();
      outputPath = getOutputFilePath('mp4', 'compressed');
      break;
    case 'watermark':
      args = buildWatermarkArgs();
      outputPath = getOutputFilePath('mp4', 'watermarked');
      break;
    case 'gif':
      args = buildGifArgs();
      outputPath = getOutputFilePath('gif');
      break;
    case 'screenshot':
      args = buildScreenshotArgs();
      outputPath = getOutputFilePath(ssFormat.value.toLowerCase(), 'frame_%04d');
      break;
    case 'removeWatermark':
      args = buildRemoveWatermarkArgs();
      outputPath = getOutputFilePath(rmWmOutputFormat.value === 'image' ? rmWmImageFormat.value : 'mp4', 'nowatermark');
      break;
    default:
      alert('该功能暂未实现');
      return;
  }

  const taskId = ffmpegStore.addTask({
    fileName: mainFile.value!.name,
    module: 'advancedTools',
    status: 'processing',
    progress: 0,
    inputPath: mainFile.value!.path,
    outputPath,
  });

  ffmpegStore.addTaskLog(taskId, `[info] FFmpeg Studio - ${tab.value} 模块`);
  ffmpegStore.addTaskLog(taskId, `[info] FFmpeg 命令: ffmpeg ${args.join(' ')}`);

  try {
    const duration = mainFile.value!.mediaInfo?.duration;
    
    const result = await ffmpegService.executeWithProgress({
      ffmpegPath: ffmpegStore.config.ffmpegPath,
      args,
      taskId,
      duration,
    });

    ffmpegStore.updateTask(taskId, {
      status: result.success ? 'completed' : 'error',
      progress: 100,
      error: result.error,
    });

    if (result.success) {
      ffmpegStore.addTaskLog(taskId, '[done] 处理完成');
    } else {
      ffmpegStore.addTaskLog(taskId, `[error] 处理失败: ${result.error}`);
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, {
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    });
    ffmpegStore.addTaskLog(taskId, `[error] 处理失败: ${error}`);
  }
};

const handleStop = async () => {
  if (currentModuleTask.value) {
    await ffmpegService.stop();
    ffmpegStore.stopTask(currentModuleTask.value.id);
  }
};

const tools = [
  { key: 'compress', label: '压缩', icon: Zap },
  { key: 'watermark', label: '加水印', icon: Stamp },
  { key: 'removeWatermark', label: '去水印', icon: Eraser },
  { key: 'gif', label: 'GIF', icon: ImageIcon },
  { key: 'screenshot', label: '截图', icon: Camera },
];
</script>

<template>
  <div class="advanced-tools">
    <div class="header">
      <div class="title-row">
        <Clapperboard :size="20" class="icon warning" />
        <h2>高级工具</h2>
        <span class="badge warning">实用</span>
        <span v-if="isCurrentModuleProcessing" class="badge green">
          <span class="pulse-dot" />处理中
        </span>
      </div>
    </div>

    <div v-if="!ffmpegStore.isConfigured" class="warning-banner">
      <AlertCircle :size="16" />
      <span>请先在配置中设置 FFmpeg bin 目录</span>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div class="card">
          <div class="card-header">
            <Clapperboard :size="16" class="icon warning" />
            <span class="card-title">功能选择</span>
          </div>
          <div class="tools-grid">
            <button 
              v-for="tool in tools"
              :key="tool.key"
              :class="['tool-btn', { active: tab === tool.key }]"
              @click="tab = tool.key"
            >
              <component :is="tool.icon" :size="16" />
              <span>{{ tool.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="inputFiles.length > 0" class="card">
          <div class="card-header">
            <FileType :size="16" class="icon warning" />
            <span class="card-title">文件列表</span>
            <span class="file-count warning">{{ inputFiles.length }}</span>
            <button class="btn-clear" @click="clearAllFiles">清空</button>
          </div>
          <div class="file-list">
            <div 
              v-for="(file, index) in inputFiles" 
              :key="index"
              :class="['file-item', { active: mainFileIndex === index }]"
              @click="selectMainFile(index)"
            >
              <Sparkles v-if="mainFileIndex === index" :size="12" class="star-icon warning" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
            </div>
          </div>
          <div class="file-hint">点击文件可设为主文件</div>
        </div>

        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon warning" />
            <span class="card-title">文件导入</span>
          </div>
          <label :key="dropZoneKey" class="drop-zone">
            <input 
              type="file" 
              accept="video/*,audio/*,image/*"
              multiple
              @change="handleFilesSelected"
            />
            <div class="drop-zone-content">
              <Upload :size="32" class="upload-icon" />
              <p>拖拽媒体文件</p>
              <p class="hint">或点击选择文件</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <Zap :size="16" class="icon warning" />
            <span class="card-title">输出文件名</span>
          </div>
          <div class="filename-input">
            <input 
              type="text" 
              v-model="customFileName"
              placeholder="留空则使用默认名称"
            />
            <span class="extension">.{{ tab === 'gif' ? 'gif' : tab === 'screenshot' ? ssFormat.toLowerCase() : tab === 'removeWatermark' ? (rmWmOutputFormat === 'image' ? rmWmImageFormat : 'mp4') : 'mp4' }}</span>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="mainFile" class="main-file-card">
          <div class="main-file-info">
            <div class="info-header">
              <Sparkles :size="16" class="icon warning" />
              <span>主文件</span>
            </div>
            <div class="info-content">
              <span class="file-name">{{ mainFile.name }}</span>
              <div class="file-details">
                <span>{{ (mainFile.size / 1024 / 1024).toFixed(1) }} MB</span>
                <template v-if="mainFile.mediaInfo?.video">
                  <span>{{ mainFile.mediaInfo.video.codec }}</span>
                  <span>{{ mainFile.mediaInfo.video.fps?.toFixed(1) }} fps</span>
                </template>
                <span v-if="mainFile.mediaInfo">{{ mainFile.mediaInfo.duration?.toFixed(1) }}s</span>
              </div>
            </div>
          </div>
        </div>

        <div :class="['action-card', { processing: isCurrentModuleProcessing }]">
          <div class="action-row">
            <button 
              :disabled="!ffmpegStore.isConfigured"
              :class="['action-btn', { stop: isCurrentModuleProcessing }]"
              @click="isCurrentModuleProcessing ? handleStop() : handleStart()"
            >
              <Square v-if="isCurrentModuleProcessing" :size="16" />
              <Play v-else :size="16" />
              <span>{{ isCurrentModuleProcessing ? '停止处理' : '开始处理' }}</span>
            </button>
            <div v-if="isCurrentModuleProcessing && currentModuleTask" class="progress-info">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${currentModuleTask.progress}%` }" />
              </div>
              <span class="progress-text">{{ Math.floor(currentModuleTask.progress) }}%</span>
            </div>
            <div v-else class="hint-text">
              <Info :size="14" />
              <span>选择文件后点击开始处理</span>
            </div>
          </div>
        </div>

        <div v-if="tab === 'compress'" class="card">
          <div class="card-header">
            <Zap :size="16" class="icon warning" />
            <span class="card-title">视频压缩</span>
          </div>
          <div class="card-body">
            <div class="form-group slider">
              <label>目标大小: {{ targetSize }} MB</label>
              <input type="range" v-model="targetSize" min="1" max="500" />
            </div>
            <div class="quality-options">
              <label class="quality-label">压缩策略</label>
              <div class="quality-grid">
                <button 
                  v-for="q in [
                    { key: 'quality', label: '画质优先', desc: '保持高画质' },
                    { key: 'balanced', label: '均衡模式', desc: '画质与体积平衡' },
                    { key: 'size', label: '体积优先', desc: '最大压缩率' },
                  ]"
                  :key="q.key"
                  :class="['quality-btn', { active: compressQuality === q.key }]"
                  @click="compressQuality = q.key"
                >
                  <div class="quality-name">{{ q.label }}</div>
                  <div class="quality-desc">{{ q.desc }}</div>
                </button>
              </div>
            </div>
            <label class="checkbox-label">
              <input type="checkbox" v-model="keepAudio" />
              保留原始音频（不重新编码）
            </label>
          </div>
        </div>

        <div v-if="tab === 'watermark'" class="card">
          <div class="card-header">
            <Stamp :size="16" class="icon warning" />
            <span class="card-title">添加水印</span>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>水印文字</label>
              <input type="text" v-model="wmText" />
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>位置</label>
                <select v-model="wmPosition">
                  <option value="topleft">左上</option>
                  <option value="topright">右上</option>
                  <option value="bottomleft">左下</option>
                  <option value="bottomright">右下</option>
                  <option value="center">居中</option>
                </select>
              </div>
              <div class="form-group slider">
                <label>字体大小: {{ wmSize }}px</label>
                <input type="range" v-model="wmSize" min="12" max="72" />
              </div>
              <div class="form-group">
                <label>颜色</label>
                <input type="color" v-model="wmColor" class="color-input" />
              </div>
            </div>
            <div class="form-group slider">
              <label>透明度: {{ wmOpacity }}%</label>
              <input type="range" v-model="wmOpacity" min="0" max="100" />
            </div>
          </div>
        </div>

        <div v-if="tab === 'gif'" class="card">
          <div class="card-header">
            <ImageIcon :size="16" class="icon warning" />
            <span class="card-title">GIF生成</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>开始时间</label>
                <input type="text" v-model="gifStart" class="mono" />
              </div>
              <div class="form-group">
                <label>持续时长 (秒)</label>
                <input type="text" v-model="gifDuration" />
              </div>
            </div>
            <div class="form-group slider">
              <label>帧率: {{ gifFps }} fps</label>
              <input type="range" v-model="gifFps" min="5" max="30" />
            </div>
            <div class="form-group slider">
              <label>宽度: {{ gifWidth }} px</label>
              <input type="range" v-model="gifWidth" min="120" max="1920" />
            </div>
            <div class="form-group">
              <label>循环次数 (0=无限)</label>
              <input type="number" v-model="gifLoop" />
            </div>
          </div>
        </div>

        <div v-if="tab === 'screenshot'" class="card">
          <div class="card-header">
            <Camera :size="16" class="icon warning" />
            <span class="card-title">视频截图</span>
          </div>
          <div class="card-body">
            <div class="mode-grid">
              <button 
                v-for="m in [
                  { key: 'interval', label: '按间隔截图' },
                  { key: 'count', label: '按数量截图' },
                  { key: 'single', label: '单帧截图' },
                ]"
                :key="m.key"
                :class="['mode-btn', { active: ssMode === m.key }]"
                @click="ssMode = m.key"
              >
                {{ m.label }}
              </button>
            </div>
            <div v-if="ssMode === 'interval'" class="form-group slider">
              <label>间隔: {{ ssInterval }}s</label>
              <input type="range" v-model="ssInterval" min="1" max="60" />
            </div>
            <div v-if="ssMode === 'count'" class="form-group">
              <label>截图数量</label>
              <input type="number" :value="10" />
            </div>
            <div v-if="ssMode === 'single'" class="form-group">
              <label>时间点</label>
              <input type="text" value="00:01:00" class="mono" />
            </div>
            <div class="form-group">
              <label>输出格式</label>
              <div class="format-grid">
                <button 
                  v-for="f in ['PNG', 'JPG', 'BMP', 'WebP']"
                  :key="f"
                  :class="['format-btn', { active: ssFormat === f }]"
                  @click="ssFormat = f"
                >
                  {{ f }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="tab === 'removeWatermark'" class="card">
          <div class="card-header">
            <Eraser :size="16" class="icon warning" />
            <span class="card-title">去除水印</span>
          </div>
          <div class="card-body">
            <div class="info-banner">
              <Info :size="16" class="icon warning" />
              <div class="info-content">
                <p>在下方预览图中拖拽矩形框来选择水印区域，也可以手动输入坐标。</p>
                <p>拖拽框体移动位置，拖拽四角调整大小。</p>
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>起始 X 坐标</label>
                <input type="number" v-model="rmWmX" min="0" />
              </div>
              <div class="form-group">
                <label>起始 Y 坐标</label>
                <input type="number" v-model="rmWmY" min="0" />
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>区域宽度</label>
                <input type="number" v-model="rmWmWidth" min="1" />
              </div>
              <div class="form-group">
                <label>区域高度</label>
                <input type="number" v-model="rmWmHeight" min="1" />
              </div>
            </div>

            <div class="form-group">
              <label class="quality-label">去除模式</label>
              <div class="quality-grid">
                <button 
                  v-for="m in [
                    { key: 'blur', label: '模糊遮盖', desc: '使用模糊效果遮盖水印区域' },
                    { key: 'fill', label: '填充遮盖', desc: '使用周围像素填充水印区域' },
                    { key: 'inpaint', label: '智能修复', desc: '自动插值修复水印区域' },
                  ]"
                  :key="m.key"
                  :class="['quality-btn', { active: rmWmMode === m.key }]"
                  @click="rmWmMode = m.key as 'blur' | 'fill' | 'inpaint'"
                >
                  <div class="quality-name">{{ m.label }}</div>
                  <div class="quality-desc">{{ m.desc }}</div>
                </button>
              </div>
            </div>

            <div v-if="rmWmMode === 'blur'" class="form-group slider">
              <label>模糊强度: {{ rmWmBlurStrength }}</label>
              <input type="range" v-model="rmWmBlurStrength" min="1" max="20" />
            </div>

            <div class="form-group">
              <label class="quality-label">导出格式</label>
              <div class="export-grid">
                <button 
                  :class="['export-btn', { active: rmWmOutputFormat === 'video' }]"
                  @click="rmWmOutputFormat = 'video'"
                >
                  视频格式 (.mp4)
                </button>
                <button 
                  :class="['export-btn', { active: rmWmOutputFormat === 'image' }]"
                  @click="rmWmOutputFormat = 'image'"
                >
                  图片格式
                </button>
              </div>
            </div>

            <div v-if="rmWmOutputFormat === 'image'" class="form-group">
              <label>图片格式</label>
              <div class="format-grid">
                <button 
                  v-for="f in ['png', 'jpg', 'bmp', 'webp']"
                  :key="f"
                  :class="['format-btn', { active: rmWmImageFormat === f }]"
                  @click="rmWmImageFormat = f"
                >
                  .{{ f }}
                </button>
              </div>
            </div>

            <div v-if="mainFile?.mediaInfo?.video" class="video-size-info">
              <div class="info-label">视频尺寸参考</div>
              <div class="info-values">
                <span>宽度: <strong>{{ mainFile.mediaInfo.video.width }}</strong> px</span>
                <span>高度: <strong>{{ mainFile.mediaInfo.video.height }}</strong> px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advanced-tools {
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

.icon.warning {
  color: var(--warning-color);
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

.badge.warning {
  background-color: rgba(245, 158, 11, 0.15);
  color: var(--warning-color);
}

.badge.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
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
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-size: 12px;
  flex-shrink: 0;
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
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 16px;
}

.tool-btn {
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

.tool-btn:hover {
  background-color: var(--hover-bg);
}

.tool-btn.active {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.file-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.file-count.warning {
  background-color: rgba(245, 158, 11, 0.15);
  color: var(--warning-color);
}

.btn-clear {
  margin-left: auto;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  transform: scale(1.05);
}

.file-list {
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.file-item:hover {
  background-color: var(--hover-bg);
}

.file-item.active {
  background-color: rgba(245, 158, 11, 0.15);
  border: 1px solid var(--warning-color);
}

.star-icon.warning {
  color: var(--warning-color);
}

.file-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.file-hint {
  padding: 8px 16px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.drop-zone {
  display: block;
  padding: 24px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover {
  border-color: var(--warning-color);
  background-color: rgba(245, 158, 11, 0.05);
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
  border-color: var(--warning-color);
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.main-file-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--warning-color);
  border-radius: 12px;
  overflow: hidden;
}

.main-file-info {
  padding: 16px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-header span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.info-content .file-name {
  font-size: 12px;
  color: var(--text-primary);
  display: block;
  margin-bottom: 8px;
}

.file-details {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.action-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s;
}

.action-card.processing {
  background-color: rgba(245, 158, 11, 0.1);
  border-color: var(--warning-color);
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--warning-color), #d97706);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
}

.action-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.stop {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.progress-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--warning-color), #d97706);
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-tertiary);
  min-width: 40px;
}

.hint-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.card-body {
  padding: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-group select,
.form-group input[type="text"],
.form-group input[type="number"] {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.form-group input.mono {
  font-family: monospace;
}

.form-group select:focus,
.form-group input:focus {
  border-color: var(--warning-color);
}

.form-group.slider input[type="range"] {
  width: 100%;
}

.color-input {
  width: 100%;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
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

.quality-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.quality-grid {
  display: flex;
  gap: 8px;
}

.quality-btn {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.quality-btn:hover {
  transform: scale(1.02);
}

.quality-btn.active {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: var(--warning-color);
}

.quality-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.quality-btn.active .quality-name {
  color: var(--warning-color);
}

.quality-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.mode-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  background-color: var(--hover-bg);
}

.mode-btn.active {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.format-grid {
  display: flex;
  gap: 4px;
}

.format-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-btn:hover {
  transform: scale(1.05);
}

.format-btn.active {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.info-banner {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  margin-bottom: 16px;
}

.info-banner .info-content {
  font-size: 12px;
  color: var(--text-secondary);
}

.info-banner .info-content p {
  margin: 0 0 4px 0;
}

.info-banner .info-content p:last-child {
  margin-bottom: 0;
}

.export-grid {
  display: flex;
  gap: 8px;
}

.export-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.export-btn:hover {
  background-color: var(--hover-bg);
}

.export-btn.active {
  background-color: rgba(245, 158, 11, 0.15);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.video-size-info {
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  margin-top: 8px;
}

.video-size-info .info-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.video-size-info .info-values {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-primary);
}

.video-size-info .info-values strong {
  color: var(--warning-color);
}
</style>
