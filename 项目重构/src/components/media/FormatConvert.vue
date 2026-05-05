<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { FileType, Settings, Gauge, Film, Music2, MonitorPlay, Upload, ChevronDown, ChevronRight, Sparkles, Info, AlertCircle, Square, Play, Zap, Image as ImageIcon, Maximize2, X } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import type { MediaInfo } from '@/types/ffmpeg';

const videoFormats = ['MP4', 'AVI', 'MKV', 'MOV', 'WebM', 'FLV', 'WMV', 'MPEG', 'TS', '3GP', 'OGV'];
const audioFormats = ['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'WMA', 'OPUS', 'AC3', 'AIFF', 'M4A'];
const videoCodecs = ['H.264 (libx264)', 'H.265 (libx265)', 'VP9', 'VP8', 'AV1 (libaom)', 'ProRes', 'MPEG-4', 'copy (不转码)'];
const audioCodecs = ['AAC', 'MP3 (libmp3lame)', 'Opus', 'Vorbis', 'FLAC', 'PCM', 'AC3', 'copy (不转码)'];
const presets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];
const pixFmts = ['yuv420p', 'yuv422p', 'yuv444p', 'yuv420p10le', 'rgb24', 'auto'];
const resolutions = ['原始', '3840x2160 (4K)', '2560x1440 (2K)', '1920x1080 (1080p)', '1280x720 (720p)', '854x480 (480p)', '640x360 (360p)', '自定义'];

const ffmpegStore = useFFmpegStore();

const mode = ref('video');
const targetFormat = ref('MP4');
const vCodec = ref('H.264 (libx264)');
const aCodec = ref('AAC');
const preset = ref('medium');
const crf = ref(23);
const resolution = ref('原始');
const fps = ref(30);
const changeFps = ref(false);
const audioBitrate = ref(192);
const sampleRate = ref('44100');
const channels = ref('2');
const pixFmt = ref('yuv420p');
const hwAccel = ref(false);
const twoPass = ref(false);
const fastStart = ref(true);
const inputFiles = ref<InputFile[]>([]);
const mainFileIndex = ref(0);
const customFileName = ref('');
const showFullscreen = ref(false);
const dropZoneKey = ref(0);

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

const formats = computed(() => mode.value === 'video' ? videoFormats : audioFormats);

const mainFile = computed(() => inputFiles.value.length > mainFileIndex.value ? inputFiles.value[mainFileIndex.value] : null);
const hasThumbnail = computed(() => mainFile.value && mainFile.value.thumbnail);

const currentModuleTask = computed(() => {
  return ffmpegStore.tasks.find(t => t.module === 'formatConvert' && ffmpegStore.activeTaskIds.has(t.id));
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

const removeFile = (index: number) => {
  inputFiles.value = inputFiles.value.filter((_, i) => i !== index);
  if (mainFileIndex.value >= inputFiles.value.length) {
    mainFileIndex.value = Math.max(0, inputFiles.value.length - 1);
  }
};

const clearAllFiles = () => {
  inputFiles.value = [];
  mainFileIndex.value = 0;
  customFileName.value = '';
  dropZoneKey.value++;
};

const getOutputFilePath = (inputFile: InputFile, customName?: string): string => {
  const inputPath = inputFile.path;
  const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
  const lastDotIndex = inputFile.name.lastIndexOf('.');
  const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
  
  const outputDir = inputDir;
  const extension = targetFormat.value.toLowerCase();
  const sep = outputDir.includes('\\') ? '\\' : '/';
  
  const finalName = customName && customName.trim() ? customName.trim() : `${inputName}_converted`;
  
  return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
};

const buildConvertArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
  const vCodecMap: Record<string, string> = {
    'H.264 (libx264)': 'libx264',
    'H.265 (libx265)': 'libx265',
    'VP9': 'libvpx-vp9',
    'VP8': 'libvpx',
    'AV1 (libaom)': 'libaom-av1',
    'ProRes': 'prores_ks',
    'MPEG-4': 'mpeg4',
    'copy (不转码)': 'copy',
  };
  
  const aCodecMap: Record<string, string> = {
    'AAC': 'aac',
    'MP3 (libmp3lame)': 'libmp3lame',
    'Opus': 'libopus',
    'Vorbis': 'libvorbis',
    'FLAC': 'flac',
    'PCM': 'pcm_s16le',
    'AC3': 'ac3',
    'copy (不转码)': 'copy',
  };
  
  const videoCodec = vCodecMap[vCodec.value] || 'libx264';
  const audioCodec = aCodecMap[aCodec.value] || 'aac';
  
  if (videoCodec !== 'copy') {
    args.push('-c:v', videoCodec);
    args.push('-preset', preset.value);
    args.push('-crf', String(crf.value));
    
    if (pixFmt.value !== 'auto') {
      args.push('-pix_fmt', pixFmt.value);
    }
    
    if (resolution.value !== '原始') {
      const resMap: Record<string, string> = {
        '3840x2160 (4K)': '3840:2160',
        '2560x1440 (2K)': '2560:1440',
        '1920x1080 (1080p)': '1920:1080',
        '1280x720 (720p)': '1280:720',
        '854x480 (480p)': '854:480',
        '640x360 (360p)': '640:360',
      };
      if (resMap[resolution.value]) {
        args.push('-vf', `scale=${resMap[resolution.value]}`);
      }
    }
    
    if (changeFps.value) {
      args.push('-r', String(fps.value));
    }
  } else {
    args.push('-c:v', 'copy');
  }
  
  if (audioCodec !== 'copy') {
    args.push('-c:a', audioCodec);
    args.push('-b:a', `${audioBitrate.value}k`);
    args.push('-ar', sampleRate.value);
    args.push('-ac', channels.value);
  } else {
    args.push('-c:a', 'copy');
  }
  
  if (fastStart.value && targetFormat.value.toLowerCase() === 'mp4') {
    args.push('-movflags', '+faststart');
  }
  
  args.push('-y');
  args.push(getOutputFilePath(mainFile.value!, customFileName.value));
  
  return args;
};

const handleStart = async () => {
  if (!ffmpegStore.isConfigured) {
    alert('请先在配置中设置 FFmpeg bin 目录');
    return;
  }

  if (inputFiles.value.length === 0 || !mainFile.value) {
    alert('请先选择要转换的文件');
    return;
  }

  const outputFilePath = getOutputFilePath(mainFile.value!, customFileName.value);
  const taskId = ffmpegStore.addTask({
    fileName: mainFile.value!.name,
    module: 'formatConvert',
    status: 'processing',
    progress: 0,
    inputPath: mainFile.value!.path,
    outputPath: outputFilePath,
  });

  ffmpegStore.addTaskLog(taskId, '[info] FFmpeg Studio v1.0 - 格式转换模块');
  ffmpegStore.addTaskLog(taskId, `[info] 目标格式: ${targetFormat.value}`);
  ffmpegStore.addTaskLog(taskId, `[info] 视频编码: ${vCodec.value} | 音频编码: ${aCodec.value}`);
  ffmpegStore.addTaskLog(taskId, `[info] 预设: ${preset.value} | CRF: ${crf.value}`);

  try {
    const args = buildConvertArgs();
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
      ffmpegStore.addTaskLog(taskId, '[done] 转换完成');
    } else {
      ffmpegStore.addTaskLog(taskId, `[error] 转换失败: ${result.error}`);
    }
  } catch (error) {
    ffmpegStore.updateTask(taskId, {
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    });
    ffmpegStore.addTaskLog(taskId, `[error] 转换失败: ${error}`);
  }
};

const handleStop = async () => {
  if (currentModuleTask.value) {
    await ffmpegService.stop();
    ffmpegStore.stopTask(currentModuleTask.value.id);
  }
};
</script>

<template>
  <div class="format-convert">
    <div class="header">
      <div class="title-row">
        <FileType :size="20" class="icon" />
        <h2>格式转换</h2>
        <span class="badge blue">全格式</span>
        <span v-if="isCurrentModuleProcessing" class="badge green">
          <span class="pulse-dot" />处理中
        </span>
      </div>
      <div class="mode-tabs">
        <button 
          :class="['mode-tab', { active: mode === 'video' }]"
          @click="mode = 'video'"
        >
          <Film :size="14" />
          <span>视频转换</span>
        </button>
        <button 
          :class="['mode-tab', { active: mode === 'audio' }]"
          @click="mode = 'audio'"
        >
          <Music2 :size="14" />
          <span>音频转换</span>
        </button>
      </div>
    </div>

    <div v-if="!ffmpegStore.isConfigured" class="warning-banner">
      <AlertCircle :size="16" />
      <span>请先在配置中设置 FFmpeg bin 目录</span>
    </div>

    <div class="content-grid">
      <div class="left-panel">
        <div v-if="inputFiles.length > 0" class="card">
          <div class="card-header">
            <FileType :size="16" class="icon" />
            <span class="card-title">文件列表</span>
            <span class="file-count">{{ inputFiles.length }}</span>
            <button class="btn-clear" @click="clearAllFiles">清空</button>
          </div>
          <div class="file-list">
            <div 
              v-for="(file, index) in inputFiles" 
              :key="index"
              :class="['file-item', { active: mainFileIndex === index }]"
              @click="selectMainFile(index)"
            >
              <Sparkles v-if="mainFileIndex === index" :size="12" class="star-icon" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
            </div>
          </div>
          <div class="file-hint">点击文件可设为主文件</div>
        </div>

        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon" />
            <span class="card-title">文件导入</span>
          </div>
          <label :key="dropZoneKey" class="drop-zone">
            <input 
              type="file" 
              :accept="mode === 'video' ? 'video/*' : 'audio/*'"
              multiple
              @change="handleFilesSelected"
            />
            <div class="drop-zone-content">
              <Upload :size="32" class="upload-icon" />
              <p>{{ mode === 'video' ? '拖拽视频文件' : '拖拽音频文件' }}</p>
              <p class="hint">或点击选择文件</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <FileType :size="16" class="icon" />
            <span class="card-title">输出文件名</span>
          </div>
          <div class="filename-input">
            <input 
              type="text" 
              v-model="customFileName"
              placeholder="留空则使用默认名称"
            />
            <span class="extension">.{{ targetFormat.toLowerCase() }}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <FileType :size="16" class="icon" />
            <span class="card-title">输出格式</span>
          </div>
          <div class="format-grid">
            <button 
              v-for="format in formats" 
              :key="format"
              :class="['format-btn', { active: targetFormat === format }]"
              @click="targetFormat = format"
            >
              {{ format }}
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="mainFile" class="main-file-card">
          <div class="main-file-info">
            <div class="info-header">
              <Sparkles :size="16" class="icon" />
              <span>主文件</span>
            </div>
            <div class="info-content">
              <span class="file-name">{{ mainFile.name }}</span>
              <div class="file-details">
                <span>{{ (mainFile.size / 1024 / 1024).toFixed(1) }} MB</span>
                <template v-if="mainFile.mediaInfo?.video">
                  <span>{{ mainFile.mediaInfo.video.codec }}</span>
                  <span>{{ mainFile.mediaInfo.video.fps?.toFixed(1) }} fps</span>
                  <span>{{ mainFile.mediaInfo.duration?.toFixed(1) }}s</span>
                </template>
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
              <span>{{ isCurrentModuleProcessing ? '停止转换' : '开始转换' }}</span>
            </button>
            <div v-if="isCurrentModuleProcessing && currentModuleTask" class="progress-info">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${currentModuleTask.progress}%` }" />
              </div>
              <span class="progress-text">{{ Math.floor(currentModuleTask.progress) }}%</span>
            </div>
            <div v-else class="hint-text">
              <Info :size="14" />
              <span>选择文件后点击开始转换</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <Zap :size="16" class="icon warning" />
            <span class="card-title">快速预设</span>
          </div>
          <div class="preset-grid">
            <button 
              v-for="p in [
                { name: '高质量', desc: '大文件，最佳画质', crf: 18, preset: 'slow' },
                { name: '均衡', desc: '画质体积平衡', crf: 23, preset: 'medium' },
                { name: '压缩', desc: '小文件，较快速度', crf: 28, preset: 'fast' },
                { name: '极速', desc: '最快速度，较大文件', crf: 23, preset: 'ultrafast' },
              ]"
              :key="p.name"
              :class="['preset-btn', { active: crf === p.crf && preset === p.preset }]"
              @click="crf = p.crf; preset = p.preset"
            >
              <div class="preset-name">{{ p.name }}</div>
              <div class="preset-desc">{{ p.desc }}</div>
            </button>
          </div>
        </div>

        <div class="card collapsible">
          <div class="card-header clickable">
            <Settings :size="16" class="icon" />
            <span class="card-title">编码设置</span>
            <ChevronDown :size="16" class="chevron" />
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>视频编码器</label>
                <select v-model="vCodec">
                  <option v-for="c in videoCodecs" :key="c">{{ c }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>音频编码器</label>
                <select v-model="aCodec">
                  <option v-for="c in audioCodecs" :key="c">{{ c }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>编码预设</label>
                <select v-model="preset">
                  <option v-for="p in presets" :key="p">{{ p }}</option>
                </select>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group slider">
                <label>CRF (质量): {{ crf }}</label>
                <input type="range" v-model="crf" min="0" max="51" />
              </div>
              <div class="form-group">
                <label>像素格式</label>
                <select v-model="pixFmt">
                  <option v-for="p in pixFmts" :key="p">{{ p }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div v-if="mode === 'video'" class="card collapsible">
          <div class="card-header clickable">
            <MonitorPlay :size="16" class="icon" />
            <span class="card-title">视频参数</span>
            <ChevronDown :size="16" class="chevron" />
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>分辨率</label>
                <select v-model="resolution">
                  <option v-for="r in resolutions" :key="r">{{ r }}</option>
                </select>
              </div>
              <div class="form-group checkbox">
                <label>
                  <input type="checkbox" v-model="changeFps" />
                  修改帧率
                </label>
                <div v-if="changeFps" class="fps-slider">
                  <label>帧率: {{ fps }} fps</label>
                  <input type="range" v-model="fps" min="1" max="120" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card collapsible">
          <div class="card-header clickable">
            <Music2 :size="16" class="icon" />
            <span class="card-title">音频参数</span>
            <ChevronDown :size="16" class="chevron" />
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group slider">
                <label>比特率: {{ audioBitrate }} kbps</label>
                <input type="range" v-model="audioBitrate" min="64" max="512" />
              </div>
              <div class="form-group">
                <label>采样率</label>
                <select v-model="sampleRate">
                  <option v-for="s in ['8000', '16000', '22050', '44100', '48000', '96000']" :key="s">{{ s }} Hz</option>
                </select>
              </div>
              <div class="form-group">
                <label>声道</label>
                <select v-model="channels">
                  <option value="1">单声道</option>
                  <option value="2">立体声</option>
                  <option value="6">5.1 环绕声</option>
                  <option value="8">7.1 环绕声</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card collapsible">
          <div class="card-header clickable">
            <Gauge :size="16" class="icon" />
            <span class="card-title">高级选项</span>
            <ChevronDown :size="16" class="chevron" />
          </div>
          <div class="card-body">
            <div class="form-grid checkboxes">
              <label class="checkbox-label">
                <input type="checkbox" v-model="hwAccel" />
                硬件加速 (NVENC/QSV/AMF)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="twoPass" />
                二次编码 (Two-Pass)
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="fastStart" />
                快速启动 (moov前移)
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.format-convert {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.badge.blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
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

.mode-tabs {
  display: flex;
  gap: 4px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab:hover {
  background-color: var(--hover-bg);
}

.mode-tab.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
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

.card-header.clickable {
  cursor: pointer;
}

.card-header.clickable:hover {
  background-color: var(--hover-bg);
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.file-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  background-color: var(--primary-light);
  color: var(--primary-color);
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
  background-color: var(--primary-light);
  border: 1px solid var(--primary-color);
}

.star-icon {
  color: var(--primary-color);
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
  border-color: var(--primary-color);
  background-color: var(--primary-light);
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
  border-color: var(--primary-color);
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  padding: 12px 16px;
}

.format-btn {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.format-btn:hover {
  transform: scale(1.05);
}

.format-btn.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.main-file-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--primary-color);
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

.info-header .icon {
  color: var(--primary-color);
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
  background-color: rgba(6, 182, 212, 0.1);
  border-color: #06b6d4;
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
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
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
  background: linear-gradient(90deg, #06b6d4, #0891b2);
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

.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 16px;
}

.preset-btn {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.preset-btn:hover {
  transform: scale(1.05);
}

.preset-btn.active {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}

.preset-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.preset-btn.active .preset-name {
  color: var(--primary-color);
}

.preset-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 2px;
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

.form-grid:last-child {
  margin-bottom: 0;
}

.form-grid.checkboxes {
  grid-template-columns: repeat(3, 1fr);
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
.form-group input[type="text"] {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.form-group select:focus,
.form-group input[type="text"]:focus {
  border-color: var(--primary-color);
}

.form-group.slider input[type="range"] {
  width: 100%;
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

.chevron {
  margin-left: auto;
  color: var(--text-tertiary);
}
</style>
