<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import {
  ArrowRightLeft, Copy, Download, Upload, Trash2, Check,
  ChevronDown, ChevronUp, FileText, Eye, X, Save
} from 'lucide-vue-next';

const toast = useToast();

interface SavedFile {
  id: string;
  name: string;
  side: 'left' | 'right';
  content: string;
  createdAt: string;
}

interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'header' | 'hunk';
  content: string;
  simplified?: string;
}

interface CompareStats {
  addedLines: number;
  deletedLines: number;
  sameLines: number;
  addedChars: number;
  deletedChars: number;
}

const leftText = ref('');
const rightText = ref('');
const leftWidth = ref(50);
const fontSize = ref(14);
const viewMode = ref<'editor' | 'diff'>('editor');
const diffLines = ref<DiffLine[]>([]);
const diffReady = ref(false);
const stats = ref<CompareStats | null>(null);
const autoSaveEnabled = ref(true);
const savedFiles = ref<SavedFile[]>([]);
const modalVisible = ref(false);
const modalSide = ref<'left' | 'right'>('left');
const modalName = ref('');
const containerRef = ref<HTMLElement | null>(null);

const splitterDragging = ref(false);
const splitterLastX = ref(0);
const toolbarCollapsed = ref(false);

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getTimestamp = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const loadSavedContent = () => {
  try {
    const saved = localStorage.getItem('compare_autosave');
    if (saved) {
      const data = JSON.parse(saved);
      leftText.value = data.left || '';
      rightText.value = data.right || '';
      if (data.left || data.right) {
        toast.info('已自动加载上次保存的内容');
      }
    }
    const files = localStorage.getItem('compare_saved_files');
    if (files) {
      savedFiles.value = JSON.parse(files);
    }
  } catch {}
};

const saveContent = () => {
  try {
    localStorage.setItem('compare_autosave', JSON.stringify({
      left: leftText.value,
      right: rightText.value,
      time: new Date().toISOString()
    }));
  } catch {}
};

const saveFilesList = () => {
  localStorage.setItem('compare_saved_files', JSON.stringify(savedFiles.value));
};

const computeDiff = () => {
  const leftLines = leftText.value.split('\n');
  const rightLines = rightText.value.split('\n');
  const result: DiffLine[] = [];
  const newStats: CompareStats = { addedLines: 0, deletedLines: 0, sameLines: 0, addedChars: 0, deletedChars: 0 };

  const maxLen = Math.max(leftLines.length, rightLines.length);
  let i = 0;
  while (i < maxLen) {
    const leftLine = leftLines[i] ?? '';
    const rightLine = rightLines[i] ?? '';

    if (leftLine === rightLine) {
      result.push({ type: 'context', content: `  ${leftLine}` });
      newStats.sameLines++;
    } else {
      if (leftLine && i < leftLines.length) {
        result.push({ type: 'removed', content: `- ${leftLine}` });
        newStats.deletedLines++;
        newStats.deletedChars += leftLine.length;
      }
      if (rightLine && i < rightLines.length) {
        result.push({ type: 'added', content: `+ ${rightLine}` });
        newStats.addedLines++;
        newStats.addedChars += rightLine.length;
      }
    }
    i++;
  }

  diffLines.value = result;
  stats.value = newStats;
  diffReady.value = true;
};

const handleCompare = () => {
  if (!leftText.value.trim() && !rightText.value.trim()) {
    toast.error('请输入文本后再进行对比');
    return;
  }
  computeDiff();
  viewMode.value = 'diff';
  toast.success('对比完成');
};

const handleToggleView = () => {
  if (!diffReady.value) return;
  viewMode.value = viewMode.value === 'editor' ? 'diff' : 'editor';
};

const handleClear = () => {
  leftText.value = '';
  rightText.value = '';
  diffLines.value = [];
  diffReady.value = false;
  stats.value = null;
  viewMode.value = 'editor';
  toast.info('已清空所有内容');
};

const handleSaveSide = (side: 'left' | 'right') => {
  const content = side === 'left' ? leftText.value : rightText.value;
  if (!content.trim()) {
    toast.error(`${side === 'left' ? '左侧' : '右侧'}内容为空，无法保存`);
    return;
  }
  const name = `${side}_${getTimestamp()}`;
  savedFiles.value.unshift({
    id: generateId(),
    name,
    side,
    content,
    createdAt: new Date().toISOString()
  });
  saveFilesList();
  toast.success(`保存成功：${name}`);
};

const handleCustomSave = (side: 'left' | 'right') => {
  modalSide.value = side;
  modalName.value = '';
  modalVisible.value = true;
};

const handleModalSave = () => {
  const content = modalSide.value === 'left' ? leftText.value : rightText.value;
  if (!content.trim()) {
    toast.error('内容为空，无法保存');
    return;
  }
  if (!modalName.value.trim()) {
    toast.error('请输入文件名');
    return;
  }
  savedFiles.value.unshift({
    id: generateId(),
    name: modalName.value.trim(),
    side: modalSide.value,
    content,
    createdAt: new Date().toISOString()
  });
  saveFilesList();
  modalVisible.value = false;
  toast.success(`保存成功：${modalName.value}`);
};

const handleLoadFile = (file: SavedFile) => {
  rightText.value = file.content;
  toast.success(`已加载：${file.name}`);
};

const handleDeleteFile = (id: string) => {
  savedFiles.value = savedFiles.value.filter(f => f.id !== id);
  saveFilesList();
  toast.success('删除成功');
};

const handleExportResult = () => {
  if (diffLines.value.length === 0) {
    toast.error('没有对比结果可导出');
    return;
  }
  let md = '# 文本对比结果\n\n';
  md += `> 导出时间：${new Date().toLocaleString()}\n\n`;
  md += '```diff\n';
  for (const line of diffLines.value) {
    md += line.content + '\n';
  }
  md += '```\n';

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diff_result_${getTimestamp()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('导出成功');
};

const handleFontIncrease = () => {
  if (fontSize.value < 24) fontSize.value += 2;
};

const handleFontDecrease = () => {
  if (fontSize.value > 10) fontSize.value -= 2;
};

const handleFontReset = () => {
  fontSize.value = 14;
};

const handleSplitterMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  splitterDragging.value = true;
  splitterLastX.value = e.clientX;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const handleSplitterMouseMove = (e: MouseEvent) => {
  if (!splitterDragging.value || !containerRef.value) return;
  const dx = e.clientX - splitterLastX.value;
  const pctChange = (dx / containerRef.value.offsetWidth) * 100;
  leftWidth.value = Math.max(20, Math.min(80, leftWidth.value + pctChange));
  splitterLastX.value = e.clientX;
};

const handleSplitterMouseUp = () => {
  splitterDragging.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  } catch {
    toast.error('复制失败');
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') {
      e.preventDefault();
      saveContent();
      toast.success('手动保存成功');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleCompare();
    }
  }
};

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadSavedContent();
  document.addEventListener('mousemove', handleSplitterMouseMove);
  document.addEventListener('mouseup', handleSplitterMouseUp);
  document.addEventListener('keydown', handleKeydown);
  
  autoSaveInterval = setInterval(() => {
    if (autoSaveEnabled.value) {
      saveContent();
    }
  }, 60000);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleSplitterMouseMove);
  document.removeEventListener('mouseup', handleSplitterMouseUp);
  document.removeEventListener('keydown', handleKeydown);
  if (autoSaveInterval) clearInterval(autoSaveInterval);
});

watch([leftText, rightText], () => {
  diffReady.value = false;
});
</script>

<template>
  <div class="h-full flex flex-col bg-background-primary overflow-hidden">
    <!-- Save Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="modalVisible"
          class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style="background-color: rgba(0, 0, 0, 0.4)"
          @click="modalVisible = false"
        >
          <div
            class="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-background-secondary border border-border"
            @click.stop
          >
            <h3 class="text-lg font-semibold text-text-primary mb-4">保存文件</h3>
            <input
              v-model="modalName"
              type="text"
              placeholder="输入文件名..."
              class="w-full px-4 py-2.5 border border-border rounded-lg bg-background-primary text-text-primary outline-none focus:border-primary transition-colors"
              @keydown.enter="handleModalSave"
            />
            <div class="mt-4 flex justify-end gap-2">
              <button @click="modalVisible = false" class="px-4 py-2 rounded-lg border border-border text-text-secondary hover:bg-background-tertiary transition-colors">取消</button>
              <button @click="handleModalSave" class="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-colors">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Saved Files Bar -->
    <div v-if="savedFiles.length > 0" class="flex items-center gap-2 px-3 py-2 bg-background-tertiary border-b border-border overflow-x-auto">
      <span class="text-xs text-text-tertiary whitespace-nowrap">已保存:</span>
      <div
        v-for="file in savedFiles"
        :key="file.id"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background-secondary cursor-pointer hover:bg-background-tertiary transition-colors group"
        @click="handleLoadFile(file)"
      >
        <FileText :size="12" class="text-text-tertiary" />
        <span class="text-xs text-text-primary max-w-[120px] truncate">{{ file.name }}</span>
        <button
          @click.stop="handleDeleteFile(file.id)"
          class="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div v-if="diffReady && viewMode === 'diff' && stats" class="flex items-center gap-4 px-4 py-2 bg-background-tertiary border-b border-border text-xs">
      <div class="flex items-center gap-1">
        <span class="text-text-tertiary">新增:</span>
        <span class="font-semibold text-green-500">{{ stats.addedLines }} 行</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-text-tertiary">删除:</span>
        <span class="font-semibold text-red-500">{{ stats.deletedLines }} 行</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-text-tertiary">相同:</span>
        <span class="font-semibold text-text-secondary">{{ stats.sameLines }} 行</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-text-tertiary">新增字符:</span>
        <span class="font-semibold text-green-500">{{ stats.addedChars }}</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-text-tertiary">删除字符:</span>
        <span class="font-semibold text-red-500">{{ stats.deletedChars }}</span>
      </div>
    </div>

    <!-- Main Content -->
    <div ref="containerRef" class="flex-1 flex overflow-hidden relative">
      <!-- Editor Mode -->
      <template v-if="viewMode === 'editor'">
        <div
          class="flex flex-col overflow-hidden"
          :style="{ width: leftWidth + '%', minWidth: '20%', maxWidth: '80%' }"
        >
          <div class="px-4 py-2 bg-background-secondary border-b border-border flex items-center justify-between">
            <span class="text-sm font-medium text-text-secondary">原始文本 (左侧)</span>
            <div class="flex items-center gap-1">
              <button @click="copyText(leftText)" class="p-1.5 rounded hover:bg-background-tertiary text-text-tertiary" title="复制">
                <Copy :size="14" />
              </button>
              <button @click="handleSaveSide('left')" class="p-1.5 rounded hover:bg-background-tertiary text-text-tertiary" title="保存">
                <Save :size="14" />
              </button>
            </div>
          </div>
          <textarea
            v-model="leftText"
            class="flex-1 p-4 bg-background-primary text-text-primary font-mono text-sm resize-none outline-none border-none"
            :style="{ fontSize: fontSize + 'px' }"
            placeholder="在此输入原始文本..."
          ></textarea>
        </div>

        <!-- Splitter -->
        <div
          class="w-[6px] min-w-[6px] cursor-col-resize flex items-center justify-center flex-shrink-0 transition-colors"
          :class="splitterDragging ? 'bg-primary-light' : 'hover:bg-primary-light bg-border'"
          @mousedown="handleSplitterMouseDown"
        >
          <div class="w-[2px] h-8 rounded-sm bg-text-tertiary opacity-30 hover:opacity-90 hover:bg-white transition-all" />
        </div>

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-4 py-2 bg-background-secondary border-b border-border flex items-center justify-between">
            <span class="text-sm font-medium text-text-secondary">修改后文本 (右侧)</span>
            <div class="flex items-center gap-1">
              <button @click="copyText(rightText)" class="p-1.5 rounded hover:bg-background-tertiary text-text-tertiary" title="复制">
                <Copy :size="14" />
              </button>
              <button @click="handleSaveSide('right')" class="p-1.5 rounded hover:bg-background-tertiary text-text-tertiary" title="保存">
                <Save :size="14" />
              </button>
            </div>
          </div>
          <textarea
            v-model="rightText"
            class="flex-1 p-4 bg-background-primary text-text-primary font-mono text-sm resize-none outline-none border-none"
            :style="{ fontSize: fontSize + 'px' }"
            placeholder="在此输入修改后文本..."
          ></textarea>
        </div>
      </template>

      <!-- Diff Mode -->
      <template v-else>
        <div class="flex-1 overflow-y-auto p-4 bg-background-primary font-mono" :style="{ fontSize: fontSize + 'px' }">
          <div v-if="diffLines.length === 0" class="flex items-center justify-center h-full text-text-tertiary">
            没有对比结果
          </div>
          <div v-else class="space-y-0.5">
            <div
              v-for="(line, idx) in diffLines"
              :key="idx"
              class="px-2 py-0.5 rounded whitespace-pre-wrap"
              :class="{
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': line.type === 'added',
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': line.type === 'removed',
                'text-text-secondary': line.type === 'context'
              }"
            >
              {{ line.content }}
            </div>
          </div>
        </div>
      </template>

      <!-- Floating Toolbar -->
      <div 
        class="absolute right-3 top-1/2 -translate-y-1/2 z-100 bg-background-secondary border border-border rounded-lg shadow-lg overflow-hidden transition-all duration-300"
        :class="toolbarCollapsed ? 'w-10' : 'min-w-[160px]'"
      >
        <!-- Collapse/Expand Toggle Button -->
        <button 
          @click="toolbarCollapsed = !toolbarCollapsed"
          class="w-full px-3 py-2 bg-background-tertiary border-b border-border flex items-center justify-center hover:bg-background-primary transition-colors"
        >
          <ChevronDown :size="14" class="text-text-secondary transition-transform" :class="{ 'rotate-[-90deg]': toolbarCollapsed }" />
        </button>
        
        <div v-if="!toolbarCollapsed" class="p-2 space-y-1">
          <button @click="handleCompare" class="w-full px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:opacity-90 transition-colors">
            一键对比
          </button>
          <button
            @click="handleToggleView"
            :disabled="!diffReady"
            class="w-full px-3 py-1.5 rounded bg-background-tertiary text-text-secondary text-xs font-medium hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ viewMode === 'editor' ? '查看结果' : '查看原文' }}
          </button>
          <div class="border-t border-border my-1"></div>
          <button @click="handleSaveSide('left')" class="w-full px-3 py-1.5 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors">
            保存左侧
          </button>
          <button @click="handleSaveSide('right')" class="w-full px-3 py-1.5 rounded bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors">
            保存右侧
          </button>
          <button @click="handleCustomSave('left')" class="w-full px-3 py-1.5 rounded bg-background-tertiary text-text-secondary text-xs font-medium hover:bg-border transition-colors">
            自定义左
          </button>
          <button @click="handleCustomSave('right')" class="w-full px-3 py-1.5 rounded bg-background-tertiary text-text-secondary text-xs font-medium hover:bg-border transition-colors">
            自定义右
          </button>
          <div class="border-t border-border my-1"></div>
          <button
            @click="handleExportResult"
            :disabled="!diffReady"
            class="w-full px-3 py-1.5 rounded bg-yellow-500 text-white text-xs font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导出结果
          </button>
          <div class="border-t border-border my-1"></div>
          <button @click="handleClear" class="w-full px-3 py-1.5 rounded bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors">
            清空内容
          </button>
          <div class="border-t border-border my-1"></div>
          <div class="flex items-center justify-center gap-2 py-1">
            <button @click="handleFontDecrease" class="px-2 py-1 rounded bg-background-tertiary text-text-secondary text-xs hover:bg-border transition-colors">A-</button>
            <span class="text-xs text-text-primary font-mono">{{ fontSize }}px</span>
            <button @click="handleFontIncrease" class="px-2 py-1 rounded bg-background-tertiary text-text-secondary text-xs hover:bg-border transition-colors">A+</button>
          </div>
          <button @click="handleFontReset" class="w-full px-3 py-1.5 rounded bg-background-tertiary text-text-secondary text-xs font-medium hover:bg-border transition-colors">
            重置字体
          </button>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="flex items-center justify-between px-4 py-1.5 bg-background-secondary border-t border-border text-xs text-text-tertiary">
      <div class="flex items-center gap-4">
        <span>左侧: {{ leftText.split('\n').length }} 行, {{ leftText.length }} 字符</span>
        <span>右侧: {{ rightText.split('\n').length }} 行, {{ rightText.length }} 字符</span>
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          v-model="autoSaveEnabled"
          class="rounded border-border"
        />
        <span class="text-text-secondary">自动保存</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.z-100 {
  z-index: 100;
}
</style>
