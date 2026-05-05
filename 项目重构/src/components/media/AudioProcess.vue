<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Music, Volume2, AudioLines, FileAudio, Disc3, Upload, ChevronDown, ChevronRight, Sparkles, Info, Play, AlertCircle, Square, FileType, X, Maximize2 } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import type { MediaInfo } from '@/types/ffmpeg';

const ffmpegStore = useFFmpegStore();

const tab = ref('extract');
const audioFormat = ref('MP3');
const bitrate = ref(192);
const sampleRate = ref('44100');
const volume = ref(100);
const normalize = ref(false);
const fadeIn = ref(0);
const fadeOut = ref(0);
const noiseReduction = ref(false);
const bassBoost = ref(0);
const trebleBoost = ref(0);
const startTime = ref('00:00:00');
const endTime = ref('');
const inputFiles = ref<InputFile[]>([]);
const mainFileIndex = ref(0);
const customFileName = ref('');
const dropZoneKey = ref(0);
const showFullscreen = ref(false);

interface InputFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

const mainFile = computed(() => inputFiles.value.length > mainFileIndex.value ? inputFiles.value[mainFileIndex.value] : null);
const hasThumbnail = computed(() => mainFile.value && mainFile.value.thumbnail);

const currentModuleTask = computed(() => {
  return ffmpegStore.tasks.find(t => t.module === 'audioProcess' && ffmpegStore.activeTaskIds.has(t.id));
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

const getOutputFilePath = (inputFile: InputFile, customName?: string): string => {
  const inputPath = inputFile.path;
  const lastSepIndex = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
  const inputDir = lastSepIndex >= 0 ? inputPath.substring(0, lastSepIndex) : '';
  const lastDotIndex = inputFile.name.lastIndexOf('.');
  const inputName = lastDotIndex >= 0 ? inputFile.name.substring(0, lastDotIndex) : inputFile.name;
  
  const outputDir = inputDir;
  const extension = audioFormat.value.toLowerCase();
  const sep = outputDir.includes('\\') ? '\\' : '/';
  
  const finalName = customName && customName.trim() ? customName.trim() : `${inputName}_audio`;
  
  return outputDir ? `${outputDir}${sep}${finalName}.${extension}` : `${finalName}.${extension}`;
};

const buildAudioArgs = (): string[] => {
  const args: string[] = ['-i', mainFile.value!.path];
  
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
    args.push('-b:a', `${bitrate.value}k`);
  }
  
  args.push('-ar', sampleRate.value);
  
  const filterParts: string[] = [];
  
  if (volume.value !== 100) {
    filterParts.push(`volume=${volume.value / 100}`);
  }
  
  if (normalize.value) {
    filterParts.push('loudnorm');
  }
  
  if (fadeIn.value > 0) {
    filterParts.push(`afade=t=in:st=0:d=${fadeIn.value}`);
  }
  
  if (fadeOut.value > 0 && mainFile.value?.mediaInfo?.duration) {
    const startFade = mainFile.value.mediaInfo.duration - fadeOut.value;
    filterParts.push(`afade=t=out:st=${startFade}:d=${fadeOut.value}`);
  }
  
  if (bassBoost.value > 0) {
    filterParts.push(`bass=g=${bassBoost.value}`);
  }
  
  if (trebleBoost.value > 0) {
    filterParts.push(`treble=g=${trebleBoost.value}`);
  }
  
  if (noiseReduction.value) {
    filterParts.push('afftdn=nf=-25');
  }
  
  if (filterParts.length > 0) {
    args.push('-af', filterParts.join(','));
  }
  
  if (startTime.value) {
    args.push('-ss', startTime.value);
  }
  
  if (endTime.value) {
    args.push('-to', endTime.value);
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
    alert('请先选择要处理的文件');
    return;
  }

  const outputFilePath = getOutputFilePath(mainFile.value!, customFileName.value);
  const taskId = ffmpegStore.addTask({
    fileName: mainFile.value!.name,
    module: 'audioProcess',
    status: 'processing',
    progress: 0,
    inputPath: mainFile.value!.path,
    outputPath: outputFilePath,
  });

  ffmpegStore.addTaskLog(taskId, '[info] FFmpeg Studio - 音频处理模块');
  ffmpegStore.addTaskLog(taskId, `[info] 模式: ${tab.value === 'extract' ? '提取音频' : tab.value === 'adjust' ? '音频调节' : tab.value === 'mix' ? '音频混合' : '音效处理'}`);

  try {
    const args = buildAudioArgs();
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

const tabs = [
  { key: 'extract', label: '提取音频', icon: FileAudio },
  { key: 'adjust', label: '音量调节', icon: Volume2 },
  { key: 'mix', label: '音频混合', icon: Disc3 },
  { key: 'effects', label: '音效处理', icon: AudioLines },
];
</script>

<template>
  <div class="audio-process">
    <div class="header">
      <div class="title-row">
        <Music :size="20" class="icon success" />
        <h2>音频处理</h2>
        <span class="badge green">专业</span>
        <span v-if="isCurrentModuleProcessing" class="badge green">
          <span class="pulse-dot" />处理中
        </span>
      </div>
      <div class="mode-tabs">
        <button 
          v-for="t in tabs"
          :key="t.key"
          :class="['mode-tab', { active: tab === t.key }]"
          @click="tab = t.key"
        >
          <component :is="t.icon" :size="14" />
          <span>{{ t.label }}</span>
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
            <FileType :size="16" class="icon success" />
            <span class="card-title">文件列表</span>
            <span class="file-count green">{{ inputFiles.length }}</span>
            <button class="btn-clear" @click="clearAllFiles">清空</button>
          </div>
          <div class="file-list">
            <div 
              v-for="(file, index) in inputFiles" 
              :key="index"
              :class="['file-item', { active: mainFileIndex === index }]"
              @click="selectMainFile(index)"
            >
              <Sparkles v-if="mainFileIndex === index" :size="12" class="star-icon success" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ (file.size / 1024 / 1024).toFixed(1) }}MB</span>
            </div>
          </div>
          <div class="file-hint">点击文件可设为主文件</div>
        </div>

        <div class="card">
          <div class="card-header">
            <Upload :size="16" class="icon success" />
            <span class="card-title">文件导入</span>
          </div>
          <label :key="dropZoneKey" class="drop-zone">
            <input 
              type="file" 
              accept="video/*,audio/*"
              multiple
              @change="handleFilesSelected"
            />
            <div class="drop-zone-content">
              <Upload :size="32" class="upload-icon" />
              <p>拖拽视频/音频文件</p>
              <p class="hint">或点击选择文件</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <FileAudio :size="16" class="icon success" />
            <span class="card-title">输出文件名</span>
          </div>
          <div class="filename-input">
            <input 
              type="text" 
              v-model="customFileName"
              placeholder="留空则使用默认名称"
            />
            <span class="extension">.{{ audioFormat.toLowerCase() }}</span>
          </div>
        </div>

        <div v-if="tab === 'mix'" class="card">
          <div class="card-header">
            <Disc3 :size="16" class="icon success" />
            <span class="card-title">混合文件</span>
          </div>
          <label class="drop-zone small">
            <input type="file" accept="audio/*" multiple />
            <div class="drop-zone-content">
              <p>拖拽要混合的音频</p>
            </div>
          </label>
        </div>

        <div class="card">
          <div class="card-header">
            <Sparkles :size="16" class="icon warning" />
            <span class="card-title">快速预设</span>
          </div>
          <div class="preset-grid">
            <button 
              v-for="p in [
                { name: '高质量', desc: '320kbps MP3', bitrate: 320, format: 'MP3' },
                { name: '标准', desc: '192kbps MP3', bitrate: 192, format: 'MP3' },
                { name: '无损', desc: 'FLAC 格式', bitrate: 0, format: 'FLAC' },
                { name: '兼容', desc: 'AAC 格式', bitrate: 192, format: 'AAC' },
              ]"
              :key="p.name"
              :class="['preset-btn', { active: audioFormat === p.format && (p.bitrate === 0 || bitrate === p.bitrate) }]"
              @click="bitrate = p.bitrate || 192; audioFormat = p.format"
            >
              <div class="preset-name">{{ p.name }}</div>
              <div class="preset-desc">{{ p.desc }}</div>
            </button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="mainFile" class="main-file-card">
          <div class="main-file-info">
            <div class="info-header">
              <Sparkles :size="16" class="icon success" />
              <span>主文件</span>
            </div>
            <div class="info-content">
              <span class="file-name">{{ mainFile.name }}</span>
              <div class="file-details">
                <span>{{ (mainFile.size / 1024 / 1024).toFixed(1) }} MB</span>
                <template v-if="mainFile.mediaInfo?.audio">
                  <span>{{ mainFile.mediaInfo.audio.codec }}</span>
                  <span>{{ mainFile.mediaInfo.audio.sampleRate ? `${(mainFile.mediaInfo.audio.sampleRate / 1000).toFixed(1)}kHz` : '' }}</span>
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

        <div v-if="tab === 'extract'" class="card">
          <div class="card-header">
            <FileAudio :size="16" class="icon success" />
            <span class="card-title">提取设置</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>输出格式</label>
                <select v-model="audioFormat">
                  <option v-for="f in ['MP3', 'AAC', 'WAV', 'FLAC', 'OGG', 'OPUS', 'M4A', 'WMA']" :key="f">{{ f }}</option>
                </select>
              </div>
              <div class="form-group slider">
                <label>比特率: {{ bitrate }} kbps</label>
                <input type="range" v-model="bitrate" min="64" max="512" />
              </div>
              <div class="form-group">
                <label>采样率</label>
                <select v-model="sampleRate">
                  <option v-for="s in ['8000', '16000', '22050', '44100', '48000', '96000']" :key="s">{{ s }} Hz</option>
                </select>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label>开始时间</label>
                <input type="text" v-model="startTime" class="mono" />
              </div>
              <div class="form-group">
                <label>结束时间 (留空=全部)</label>
                <input type="text" v-model="endTime" placeholder="可选" class="mono" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="tab === 'adjust'" class="card">
          <div class="card-header">
            <Volume2 :size="16" class="icon success" />
            <span class="card-title">音量调节</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group slider">
                <label>音量: {{ volume }}%</label>
                <input type="range" v-model="volume" min="0" max="500" />
              </div>
              <div class="form-group checkbox">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="normalize" />
                  音量标准化 (loudnorm)
                </label>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-group slider">
                <label>淡入时长: {{ fadeIn }}s</label>
                <input type="range" v-model="fadeIn" max="30" />
              </div>
              <div class="form-group slider">
                <label>淡出时长: {{ fadeOut }}s</label>
                <input type="range" v-model="fadeOut" max="30" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="tab === 'mix'" class="card">
          <div class="card-header">
            <Disc3 :size="16" class="icon success" />
            <span class="card-title">混合参数</span>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>混合模式</label>
                <select>
                  <option>叠加混合 (amix)</option>
                  <option>拼接合并 (concat)</option>
                  <option>交叉淡化 (acrossfade)</option>
                </select>
              </div>
              <div class="form-group slider">
                <label>主音轨音量: 100%</label>
                <input type="range" :value="100" min="0" max="200" />
              </div>
              <div class="form-group slider">
                <label>副音轨音量: 50%</label>
                <input type="range" :value="50" min="0" max="200" />
              </div>
            </div>
            <div class="form-group">
              <label>交叉淡化时长</label>
              <input type="text" value="2" />
            </div>
          </div>
        </div>

        <div v-if="tab === 'effects'" class="card-group">
          <div class="card">
            <div class="card-header">
              <AudioLines :size="16" class="icon success" />
              <span class="card-title">音效处理</span>
            </div>
            <div class="card-body">
              <div class="form-grid">
                <div class="form-group slider">
                  <label>低音增强: {{ bassBoost }}dB</label>
                  <input type="range" v-model="bassBoost" max="20" />
                </div>
                <div class="form-group slider">
                  <label>高音增强: {{ trebleBoost }}dB</label>
                  <input type="range" v-model="trebleBoost" max="20" />
                </div>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" v-model="noiseReduction" />
                降噪 (afftdn)
              </label>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <Music :size="16" class="icon success" />
              <span class="card-title">均衡器 & 效果</span>
            </div>
            <div class="card-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>均衡器预设</label>
                  <select>
                    <option>无</option>
                    <option>流行</option>
                    <option>摇滚</option>
                    <option>古典</option>
                    <option>爵士</option>
                    <option>电子</option>
                    <option>人声增强</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>回声效果</label>
                  <select>
                    <option>无</option>
                    <option>小房间</option>
                    <option>大厅</option>
                    <option>教堂</option>
                    <option>洞穴</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-process {
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

.icon.success {
  color: #10b981;
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
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
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

.card-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.file-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.file-count.green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
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
  background-color: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
}

.star-icon.success {
  color: #10b981;
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

.drop-zone.small {
  padding: 16px;
}

.drop-zone:hover {
  border-color: #10b981;
  background-color: rgba(16, 185, 129, 0.05);
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
  border-color: #10b981;
}

.extension {
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px 16px;
}

.preset-btn {
  padding: 8px;
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
  background-color: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
}

.preset-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.preset-btn.active .preset-name {
  color: #10b981;
}

.preset-desc {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.main-file-card {
  background-color: var(--bg-secondary);
  border: 1px solid #10b981;
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
  color: #10b981;
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
  background-color: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
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
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
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
  background: linear-gradient(90deg, #10b981, #059669);
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

.form-grid:last-child {
  margin-bottom: 0;
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

.form-group input.mono {
  font-family: monospace;
}

.form-group select:focus,
.form-group input[type="text"]:focus {
  border-color: #10b981;
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
</style>
