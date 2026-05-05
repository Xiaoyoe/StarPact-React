<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Video, Info, Upload, ChevronDown, ChevronRight, Sparkles, AlertCircle, FileType, X, BarChart2, Activity, Clock, HardDrive, Maximize2 } from 'lucide-vue-next';
import { useFFmpegStore } from '@/stores';
import { ffmpegService } from '@/services';
import type { MediaInfo } from '@/types/ffmpeg';

const ffmpegStore = useFFmpegStore();

interface VideoFile {
  file: File;
  path: string;
  name: string;
  size: number;
  mediaInfo?: MediaInfo;
  thumbnail?: string;
}

const inputFiles = ref<VideoFile[]>([]);
const selectedVideoIndex = ref(0);
const dropZoneKey = ref(0);
const showFullscreen = ref(false);

const selectedVideo = computed(() => inputFiles.value.length > selectedVideoIndex.value ? inputFiles.value[selectedVideoIndex.value] : null);

const handleFilesSelected = async (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const inputFilesData: VideoFile[] = [];
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
  selectedVideoIndex.value = 0;

  await loadVideoInfo(inputFilesData, 0);
};

const loadVideoInfo = async (files: VideoFile[], index: number) => {
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

const selectVideo = async (index: number) => {
  selectedVideoIndex.value = index;
  await loadVideoInfo(inputFiles.value, index);
};

const clearAllFiles = () => {
  inputFiles.value = [];
  selectedVideoIndex.value = 0;
  dropZoneKey.value++;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatBitrate = (bps: number): string => {
  if (bps < 1000) return bps + ' bps';
  if (bps < 1000000) return (bps / 1000).toFixed(1) + ' Kbps';
  return (bps / 1000000).toFixed(2) + ' Mbps';
};

const compareData = computed(() => {
  if (inputFiles.value.length < 2) return null;
  
  const sizes = inputFiles.value.map(v => v.size);
  const durations = inputFiles.value.map(v => v.mediaInfo?.duration || 0);
  const bitrates = inputFiles.value.map(v => v.mediaInfo?.bitrate || 0);
  const fpsList = inputFiles.value.map(v => v.mediaInfo?.video?.fps || 0);
  const resolutions = inputFiles.value.map(v => (v.mediaInfo?.video?.width || 0) * (v.mediaInfo?.video?.height || 0));
  
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  const maxBitrate = Math.max(...bitrates);
  const minBitrate = Math.min(...bitrates);
  const maxFps = Math.max(...fpsList);
  const minFps = Math.min(...fpsList);
  const maxRes = Math.max(...resolutions);
  const minRes = Math.min(...resolutions);
  
  return {
    sizes,
    durations,
    bitrates,
    fpsList,
    resolutions,
    maxSize,
    minSize,
    maxDuration,
    minDuration,
    maxBitrate,
    minBitrate,
    maxFps,
    minFps,
    maxRes,
    minRes,
  };
});
</script>

<template>
  <div class="video-process">
    <div class="header">
      <div class="title-row">
        <Video :size="20" class="icon purple" />
        <h2>视频分析</h2>
        <span class="badge purple">分析</span>
        <span v-if="inputFiles.length > 0" class="badge blue">{{ inputFiles.length }} 个文件</span>
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
            <Upload :size="16" class="icon purple" />
            <span class="card-title">文件导入</span>
          </div>
          <label :key="dropZoneKey" class="drop-zone">
            <input 
              type="file" 
              accept="video/*"
              multiple
              @change="handleFilesSelected"
            />
            <div class="drop-zone-content">
              <Upload :size="32" class="upload-icon" />
              <p>拖拽视频文件</p>
              <p class="hint">支持多个文件对比分析</p>
            </div>
          </label>
        </div>

        <div v-if="inputFiles.length > 0" class="card">
          <div class="card-header">
            <Video :size="16" class="icon purple" />
            <span class="card-title">文件列表</span>
            <button class="btn-clear" @click="clearAllFiles">清空</button>
          </div>
          <div class="file-list">
            <div 
              v-for="(file, index) in inputFiles" 
              :key="index"
              :class="['file-item', { active: selectedVideoIndex === index }]"
              @click="selectVideo(index)"
            >
              <Sparkles v-if="selectedVideoIndex === index" :size="12" class="star-icon purple" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
          <div class="file-hint">点击查看详细信息</div>
        </div>
      </div>

      <div class="right-panel">
        <div v-if="!selectedVideo" class="empty-state">
          <Video :size="64" class="empty-icon" />
          <p>请先导入视频文件</p>
          <p class="hint">支持同时导入多个文件进行对比分析</p>
        </div>

        <template v-else>
          <div class="card info-card">
            <div class="card-header">
              <Info :size="16" class="icon purple" />
              <span class="card-title">基本信息</span>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <FileType :size="16" class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">文件名</div>
                    <div class="info-value">{{ selectedVideo.name }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <HardDrive :size="16" class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">文件大小</div>
                    <div class="info-value">{{ formatFileSize(selectedVideo.size) }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <Clock :size="16" class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">时长</div>
                    <div class="info-value">{{ selectedVideo.mediaInfo ? formatDuration(selectedVideo.mediaInfo.duration) : '获取中...' }}</div>
                  </div>
                </div>
                <div class="info-item">
                  <Activity :size="16" class="info-icon" />
                  <div class="info-content">
                    <div class="info-label">比特率</div>
                    <div class="info-value">{{ selectedVideo.mediaInfo ? formatBitrate(selectedVideo.mediaInfo.bitrate) : '获取中...' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedVideo.mediaInfo?.video" class="card">
            <div class="card-header">
              <Video :size="16" class="icon purple" />
              <span class="card-title">视频流信息</span>
            </div>
            <div class="card-body">
              <div class="stream-grid">
                <div class="stream-item">
                  <div class="stream-label">编码格式</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.codec }}</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">分辨率</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.width }}×{{ selectedVideo.mediaInfo.video.height }}</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">帧率</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.fps?.toFixed(2) }} fps</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">宽高比</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.aspectRatio || 'N/A' }}</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">色彩空间</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.pixFmt || 'N/A' }}</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">编码配置</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.video.profile || 'N/A' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedVideo.mediaInfo?.audio" class="card">
            <div class="card-header">
              <BarChart2 :size="16" class="icon purple" />
              <span class="card-title">音频流信息</span>
            </div>
            <div class="card-body">
              <div class="stream-grid">
                <div class="stream-item">
                  <div class="stream-label">编码格式</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.audio.codec }}</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">采样率</div>
                  <div class="stream-value">{{ (selectedVideo.mediaInfo.audio.sampleRate / 1000).toFixed(1) }} kHz</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">声道数</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.audio.channels }} 声道</div>
                </div>
                <div class="stream-item">
                  <div class="stream-label">声道布局</div>
                  <div class="stream-value">{{ selectedVideo.mediaInfo.audio.channelLayout || 'N/A' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="compareData && inputFiles.length >= 2" class="card">
            <div class="card-header">
              <BarChart2 :size="16" class="icon purple" />
              <span class="card-title">多文件对比</span>
            </div>
            <div class="card-body">
              <div class="compare-table">
                <div class="compare-header">
                  <div class="compare-cell header-cell">属性</div>
                  <div v-for="(file, index) in inputFiles" :key="index" class="compare-cell header-cell">
                    {{ file.name.substring(0, 15) }}{{ file.name.length > 15 ? '...' : '' }}
                  </div>
                </div>
                <div class="compare-row">
                  <div class="compare-cell label-cell">文件大小</div>
                  <div v-for="(size, index) in compareData.sizes" :key="index" :class="['compare-cell', { highlight: size === compareData.maxSize }]">
                    {{ formatFileSize(size) }}
                    <span v-if="size === compareData.maxSize && compareData.maxSize !== compareData.minSize" class="badge max">最大</span>
                    <span v-if="size === compareData.minSize && compareData.maxSize !== compareData.minSize" class="badge min">最小</span>
                  </div>
                </div>
                <div class="compare-row">
                  <div class="compare-cell label-cell">时长</div>
                  <div v-for="(duration, index) in compareData.durations" :key="index" :class="['compare-cell', { highlight: duration === compareData.maxDuration }]">
                    {{ formatDuration(duration) }}
                    <span v-if="duration === compareData.maxDuration && compareData.maxDuration !== compareData.minDuration" class="badge max">最长</span>
                    <span v-if="duration === compareData.minDuration && compareData.maxDuration !== compareData.minDuration" class="badge min">最短</span>
                  </div>
                </div>
                <div class="compare-row">
                  <div class="compare-cell label-cell">比特率</div>
                  <div v-for="(bitrate, index) in compareData.bitrates" :key="index" :class="['compare-cell', { highlight: bitrate === compareData.maxBitrate }]">
                    {{ formatBitrate(bitrate) }}
                    <span v-if="bitrate === compareData.maxBitrate && compareData.maxBitrate !== compareData.minBitrate" class="badge max">最高</span>
                    <span v-if="bitrate === compareData.minBitrate && compareData.maxBitrate !== compareData.minBitrate" class="badge min">最低</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-process {
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

.icon.purple {
  color: #8b5cf6;
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

.badge.purple {
  background-color: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.badge.blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: var(--primary-color);
}

.badge.max {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 8px;
  margin-left: 4px;
}

.badge.min {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-size: 8px;
  margin-left: 4px;
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

.drop-zone {
  display: block;
  padding: 24px;
  border: 2px dashed #8b5cf6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: rgba(139, 92, 246, 0.05);
}

.drop-zone:hover {
  border-color: #7c3aed;
  background-color: rgba(139, 92, 246, 0.1);
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
  background-color: rgba(139, 92, 246, 0.15);
  border: 1px solid #8b5cf6;
}

.star-icon.purple {
  color: #8b5cf6;
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

.empty-state {
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

.empty-state p {
  font-size: 12px;
  margin: 0;
}

.empty-state .hint {
  font-size: 10px;
  margin-top: 4px;
}

.card-body {
  padding: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
}

.info-icon {
  color: #8b5cf6;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.info-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.stream-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stream-item {
  padding: 12px;
  border-radius: 8px;
  background-color: var(--bg-tertiary);
}

.stream-label {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.stream-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.compare-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-header,
.compare-row {
  display: flex;
  gap: 8px;
}

.compare-cell {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: var(--bg-tertiary);
  font-size: 11px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.compare-cell.header-cell {
  background-color: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  font-weight: 500;
}

.compare-cell.label-cell {
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  font-weight: 500;
}

.compare-cell.highlight {
  background-color: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
}
</style>
