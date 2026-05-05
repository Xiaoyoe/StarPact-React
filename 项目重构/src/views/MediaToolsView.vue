<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useFFmpegStore } from '@/stores';
import FolderProcess from '@/components/media/FolderProcess.vue';
import FormatConvert from '@/components/media/FormatConvert.vue';
import AudioProcess from '@/components/media/AudioProcess.vue';
import AdvancedTools from '@/components/media/AdvancedTools.vue';
import IcoConvert from '@/components/media/IcoConvert.vue';
import ImageFormatConvert from '@/components/media/ImageFormatConvert.vue';
import CommandBuilder from '@/components/media/CommandBuilder.vue';
import VideoEdit from '@/components/media/VideoEdit.vue';
import VideoProcess from '@/components/media/VideoProcess.vue';
import {
  FileType, Music, Settings, ListTodo, X, Trash2, Play, CheckCircle, Clock, Cog, Square, FolderOpen, ChevronDown, ChevronRight, Copy, Check, Image as ImageIcon, FileImage, FolderSync, Minimize2, Film, ChevronsUp, Terminal
} from 'lucide-vue-next';

const ffmpegStore = useFFmpegStore();

const activeTab = ref('folder');
const showTaskList = ref(false);
const showFFmpegConfig = ref(false);
const expandedTaskId = ref<string | null>(null);
const showBottomNav = ref(true);

onMounted(async () => {
  await ffmpegStore.loadConfig();
});

const tabs = [
  { key: 'format', label: '格式转换', icon: FileType },
  { key: 'audio', label: '音频处理', icon: Music },
  { key: 'advanced', label: '高级工具', icon: Settings },
  { key: 'ico', label: 'ICO转换', icon: ImageIcon },
  { key: 'imageFormat', label: '图片转换', icon: FileImage },
  { key: 'command', label: '命令构建', icon: Terminal },
];

const processTabs = [
  { key: 'videoEdit', label: '视频编辑', icon: Film },
  { key: 'video', label: '视频分析', icon: Film },
  { key: 'folder', label: '文件夹分析', icon: FolderSync },
];

const handleTabChange = (tab: string) => {
  activeTab.value = tab;
  ffmpegStore.setActiveTab(tab);
};

const handleOpenFolder = async (path: string) => {
  const { fileService } = await import('@/services');
  await fileService.showInFolder(path);
};

const handleStopTask = async (taskId: string) => {
  await ffmpegStore.stopTask(taskId);
};

const handleRemoveTask = (taskId: string) => {
  ffmpegStore.removeTask(taskId);
  if (expandedTaskId.value === taskId) {
    expandedTaskId.value = null;
  }
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    formatConvert: '格式转换',
    audioProcess: '音频处理',
    advancedTools: '高级工具',
    commandBuilder: '命令构建',
    icoConvert: 'ICO转换',
    imageFormatConvert: '图片格式转换',
    folderProcess: '文件夹分析',
    videoProcess: '视频分析',
    videoEdit: '视频编辑',
  };
  return labels[type] || type;
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

<template>
  <div class="media-tools-page">
    <div class="content-area">
      <div v-show="activeTab === 'folder'" class="tab-content">
        <FolderProcess />
      </div>
      
      <div v-show="activeTab === 'format'" class="tab-content">
        <FormatConvert />
      </div>
      
      <div v-show="activeTab === 'audio'" class="tab-content">
        <AudioProcess />
      </div>
      
      <div v-show="activeTab === 'advanced'" class="tab-content">
        <AdvancedTools />
      </div>
      
      <div v-show="activeTab === 'ico'" class="tab-content">
        <IcoConvert />
      </div>
      
      <div v-show="activeTab === 'imageFormat'" class="tab-content">
        <ImageFormatConvert />
      </div>
      
      <div v-show="activeTab === 'command'" class="tab-content">
        <CommandBuilder />
      </div>
      
      <div v-show="activeTab === 'videoEdit'" class="tab-content">
        <VideoEdit />
      </div>
      
      <div v-show="activeTab === 'video'" class="tab-content">
        <VideoProcess />
      </div>
    </div>

    <Transition name="slide-up">
      <div v-if="showBottomNav" class="bottom-nav">
        <div class="nav-content">
          <div class="nav-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="nav-tab"
              :class="{ active: activeTab === tab.key }"
              @click="handleTabChange(tab.key)"
            >
              <component :is="tab.icon" :size="14" />
              <span>{{ tab.label }}</span>
            </button>
          </div>
          
          <div class="nav-divider" />
          
          <div class="nav-tabs">
            <button
              v-for="tab in processTabs"
              :key="tab.key"
              class="nav-tab process"
              :class="{ active: activeTab === tab.key }"
              @click="handleTabChange(tab.key)"
            >
              <component :is="tab.icon" :size="14" />
              <span>{{ tab.label }}</span>
            </button>
          </div>
          
          <div class="nav-divider" />
          
          <div class="nav-actions">
            <button class="nav-btn" @click="showFFmpegConfig = true">
              <Cog :size="14" />
              <span>配置</span>
            </button>
            
            <button 
              class="nav-btn" 
              :class="{ active: showTaskList }"
              @click="showTaskList = !showTaskList"
            >
              <ListTodo :size="14" />
              <span>任务</span>
              <span v-if="ffmpegStore.activeTaskIds.size > 0" class="task-badge">
                {{ ffmpegStore.activeTaskIds.size }}
              </span>
            </button>
            
            <div class="nav-divider" />
            
            <button class="nav-btn" @click="showBottomNav = false">
              <Minimize2 :size="14" />
              <span>收起</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="!showBottomNav" class="collapsed-nav">
        <button class="expand-btn" @click="showBottomNav = true">
          <ChevronsUp :size="14" />
          <span>展开</span>
        </button>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showTaskList" class="task-list-overlay" @click="showTaskList = false" />
    </Transition>

    <Transition name="slide-down">
      <div v-if="showTaskList" class="task-list-modal" @click.stop>
        <div class="modal-header">
          <h3>任务列表 ({{ ffmpegStore.tasks.length }})</h3>
          <div class="modal-actions">
            <button 
              v-if="ffmpegStore.completedTasks.length > 0"
              class="btn-clear-tasks"
              @click="ffmpegStore.clearCompletedTasks"
            >
              <Trash2 :size="12" />清理已完成
            </button>
            <button class="btn-close" @click="showTaskList = false">
              <X :size="16" />
            </button>
          </div>
        </div>
        
        <div class="modal-body">
          <div v-if="ffmpegStore.tasks.length === 0" class="empty-tasks">
            <ListTodo :size="40" class="empty-icon" />
            <p>暂无任务</p>
          </div>
          
          <template v-else>
            <div v-if="ffmpegStore.activeTasks.length > 0" class="task-section">
              <div class="section-title">进行中 ({{ ffmpegStore.activeTasks.length }})</div>
              <div v-for="task in ffmpegStore.activeTasks" :key="task.id" class="task-item">
                <div class="task-header">
                  <Play :size="14" class="status-icon processing" />
                  <span class="task-name">{{ task.fileName }}</span>
                </div>
                <div class="task-info">
                  <span class="task-type">{{ getTypeLabel(task.module) }}</span>
                  <span class="task-progress">{{ Math.floor(task.progress) }}%</span>
                </div>
                <div class="task-actions">
                  <button class="btn-stop" @click="handleStopTask(task.id)">
                    <Square :size="12" />停止
                  </button>
                  <button class="btn-open" @click="handleOpenFolder(task.outputPath)">
                    <FolderOpen :size="12" />打开
                  </button>
                </div>
              </div>
            </div>
            
            <div v-if="ffmpegStore.completedTasks.length > 0" class="task-section">
              <div class="section-title">已完成 ({{ ffmpegStore.completedTasks.length }})</div>
              <div v-for="task in ffmpegStore.completedTasks" :key="task.id" class="task-item">
                <div class="task-header">
                  <CheckCircle :size="14" class="status-icon completed" />
                  <span class="task-name">{{ task.fileName }}</span>
                </div>
                <div class="task-info">
                  <span class="task-type">{{ getTypeLabel(task.module) }}</span>
                  <span class="task-time">{{ formatTime(task.startTime) }}</span>
                </div>
                <div class="task-actions">
                  <button class="btn-remove" @click="handleRemoveTask(task.id)">
                    <Trash2 :size="12" />移除
                  </button>
                  <button class="btn-open" @click="handleOpenFolder(task.outputPath)">
                    <FolderOpen :size="12" />打开
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showFFmpegConfig" class="config-overlay" @click="showFFmpegConfig = false" />
    </Transition>

    <Transition name="slide-down">
      <div v-if="showFFmpegConfig" class="config-modal" @click.stop>
        <div class="modal-header">
          <h3>FFmpeg 配置</h3>
          <button class="btn-close" @click="showFFmpegConfig = false">
            <X :size="16" />
          </button>
        </div>
        <div class="modal-body">
          <div class="config-form">
            <div class="form-group">
              <label>FFmpeg bin 目录</label>
              <div class="input-row">
                <input 
                  type="text" 
                  v-model="ffmpegStore.config.binPath" 
                  placeholder="选择 FFmpeg bin 目录"
                  readonly
                />
                <button class="btn-browse" @click="selectFFmpegPath">浏览</button>
              </div>
            </div>
            <div class="config-status" :class="{ configured: ffmpegStore.isConfigured }">
              {{ ffmpegStore.isConfigured ? '✓ 已配置' : '✗ 未配置' }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { invoke } from '@tauri-apps/api/core';

async function selectFFmpegPath() {
  const { fileService } = await import('@/services');
  const path = await fileService.selectFolder({ title: '选择 FFmpeg bin 目录' });
  if (path) {
    const ffmpegStore = useFFmpegStore();
    const result = await invoke<{ valid: boolean; ffmpegPath: string; ffprobePath: string; error?: string }>(
      'ffmpeg_validate_path', 
      { binPath: path }
    );
    
    if (result.valid) {
      ffmpegStore.setConfig({
        binPath: path,
        ffmpegPath: result.ffmpegPath,
        ffprobePath: result.ffprobePath,
        configured: true,
      });
      ffmpegStore.saveConfig();
    } else {
      alert(result.error || '无效的 FFmpeg 目录');
    }
  }
}
</script>

<style scoped>
.media-tools-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  height: 100%;
}

.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-tertiary);
}

.placeholder-icon {
  opacity: 0.5;
}

.placeholder h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.placeholder p {
  font-size: 14px;
  margin: 0;
}

.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 8px 16px;
}

.nav-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-tab:hover {
  background-color: var(--hover-bg);
}

.nav-tab.active {
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  color: white;
}

.nav-tab.process.active {
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
}

.nav-divider {
  width: 1px;
  height: 20px;
  background-color: var(--border-color);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background-color: var(--hover-bg);
}

.nav-btn.active {
  color: var(--primary-color);
}

.task-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #ef4444, #ec4899);
  color: white;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapsed-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  padding: 8px;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--border-color);
  border-bottom: none;
  background-color: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background-color: var(--hover-bg);
}

.task-list-overlay,
.config-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background-color: transparent;
}

.task-list-modal,
.config-modal {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  max-height: 60vh;
  z-index: 20;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
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
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-clear-tasks {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
}

.btn-clear-tasks:hover {
  background-color: var(--hover-bg);
}

.btn-close {
  padding: 4px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
}

.btn-close:hover {
  background-color: var(--hover-bg);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-tasks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-tertiary);
}

.empty-icon {
  opacity: 0.5;
  margin-bottom: 8px;
}

.task-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 10px;
  font-weight: 500;
  color: var(--primary-color);
  margin-bottom: 12px;
}

.task-item {
  padding: 12px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  margin-bottom: 8px;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-icon.processing {
  color: var(--primary-color);
}

.status-icon.completed {
  color: #10b981;
}

.task-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.task-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.task-progress,
.task-time {
  font-size: 10px;
  color: var(--text-tertiary);
}

.task-actions {
  display: flex;
  gap: 8px;
}

.btn-stop,
.btn-remove,
.btn-open {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-stop {
  background: transparent;
  color: #ef4444;
}

.btn-stop:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.btn-remove {
  background: transparent;
  color: var(--text-tertiary);
}

.btn-remove:hover {
  background-color: var(--hover-bg);
}

.btn-open {
  background: transparent;
  color: var(--primary-color);
}

.btn-open:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
}

.btn-browse {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
}

.btn-browse:hover {
  background-color: var(--hover-bg);
}

.config-status {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.config-status.configured {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
