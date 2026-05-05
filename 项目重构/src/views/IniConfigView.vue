<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useToast } from '@/composables/useToast';
import {
  Upload, FileText, Download, Save, RotateCcw, Copy,
  HelpCircle, AlertCircle, CheckCircle, X, SlidersHorizontal, Eye, Play, Braces, Trash2
} from 'lucide-vue-next';

const toast = useToast();

interface IniParameter {
  key: string;
  displayKey: string;
  value: string;
  section: string;
  min: number;
  max: number;
  step: number;
  isNumeric: boolean;
}

interface IniData {
  fromConfig: string;
  originalFromConfig: string;
  systemContent: string;
  templateContent: string;
  originalTemplateContent: string;
  parameters: IniParameter[];
}

const KNOWN_PARAMS: Record<string, { min: number; max: number; step: number; desc: string }> = {
  temperature: { min: 0, max: 2, step: 0.01, desc: '控制生成文本的随机性' },
  top_p: { min: 0, max: 1, step: 0.01, desc: '核采样概率阈值' },
  top_k: { min: 0, max: 200, step: 1, desc: '每步考虑的最高概率词数' },
  max_tokens: { min: 1, max: 128000, step: 1, desc: '最大生成令牌数' },
  repeat_penalty: { min: 0, max: 5, step: 0.01, desc: '重复惩罚系数' },
  presence_penalty: { min: -2, max: 2, step: 0.01, desc: '存在惩罚' },
  frequency_penalty: { min: -2, max: 2, step: 0.01, desc: '频率惩罚' },
  seed: { min: 0, max: 999999, step: 1, desc: '随机种子' },
  num_ctx: { min: 128, max: 131072, step: 128, desc: '上下文窗口大小' },
  num_predict: { min: -1, max: 128000, step: 1, desc: '预测令牌数' },
  mirostat: { min: 0, max: 2, step: 1, desc: 'Mirostat采样模式' },
  mirostat_eta: { min: 0, max: 1, step: 0.01, desc: 'Mirostat学习率' },
  mirostat_tau: { min: 0, max: 10, step: 0.1, desc: 'Mirostat目标熵' },
  tfs_z: { min: 0, max: 2, step: 0.01, desc: 'Tail Free Sampling参数' },
  num_thread: { min: 1, max: 128, step: 1, desc: '线程数' },
};

const getTimestamp = (): string => {
  const now = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
};

const parseIniContent = (content: string): IniData => {
  const lines = content.split('\n');
  let fromConfig = '';
  let systemContent = '';
  let templateContent = '';
  const parameters: IniParameter[] = [];
  let inSystem = false;
  let inTemplate = false;
  const systemLines: string[] = [];
  const templateLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (inSystem && trimmedLine === '"""') {
      inSystem = false;
      systemContent = systemLines.join('\n');
      continue;
    }
    if (inTemplate && trimmedLine === '"""') {
      inTemplate = false;
      templateContent = templateLines.join('\n');
      continue;
    }
    if (inSystem) { systemLines.push(line); continue; }
    if (inTemplate) { templateLines.push(line); continue; }

    if (trimmedLine.toUpperCase().startsWith('FROM ')) {
      fromConfig = trimmedLine;
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('SYSTEM ')) {
      const systemPart = trimmedLine.substring(7).trim();
      if (systemPart.startsWith('"""')) {
        const afterQuotes = systemPart.substring(3);
        if (afterQuotes) systemLines.push(afterQuotes);
        inSystem = true;
      } else {
        systemContent = systemPart;
      }
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('TEMPLATE ')) {
      const templatePart = trimmedLine.substring(9).trim();
      if (templatePart.startsWith('"""')) {
        const afterQuotes = templatePart.substring(3);
        if (afterQuotes) templateLines.push(afterQuotes);
        inTemplate = true;
      } else {
        templateContent = templatePart;
      }
      continue;
    }
    if (trimmedLine.toUpperCase().startsWith('PARAMETER ') && !trimmedLine.startsWith('#') && !trimmedLine.startsWith(';')) {
      const paramContent = trimmedLine.substring(10).trim();
      const parts = paramContent.split(/\s+/);
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join(' ');
        const known = KNOWN_PARAMS[key.toLowerCase()];
        parameters.push({
          key, displayKey: key, value, section: 'PARAMETER',
          min: known?.min ?? 0,
          max: known?.max ?? (isNaN(Number(value)) ? 0 : Math.max(Number(value) * 2, 1)),
          step: known?.step ?? 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
      continue;
    }
    if (trimmedLine.includes('=') && !trimmedLine.startsWith('#') && !trimmedLine.startsWith(';')) {
      const eqIdx = trimmedLine.indexOf('=');
      const key = trimmedLine.substring(0, eqIdx).trim();
      const value = trimmedLine.substring(eqIdx + 1).trim();
      if (key) {
        const known = KNOWN_PARAMS[key.toLowerCase()];
        parameters.push({
          key, displayKey: key, value,
          section: key.includes('.') ? key.split('.')[0] : 'PARAMETER',
          min: known?.min ?? 0,
          max: known?.max ?? (isNaN(Number(value)) ? 0 : Math.max(Number(value) * 2, 1)),
          step: known?.step ?? 0.01,
          isNumeric: !isNaN(Number(value)),
        });
      }
    }
  }

  if (inSystem && systemLines.length > 0) systemContent = systemLines.join('\n');
  if (inTemplate && templateLines.length > 0) templateContent = templateLines.join('\n');

  return {
    fromConfig, originalFromConfig: fromConfig, systemContent, templateContent, originalTemplateContent: templateContent, parameters,
  };
};

const buildIniContent = (data: IniData): string => {
  const parts: string[] = [];
  if (data.fromConfig) parts.push(data.fromConfig);
  if (data.systemContent) {
    parts.push('');
    if (data.systemContent.includes('\n')) {
      parts.push('SYSTEM """');
      parts.push(data.systemContent);
      parts.push('"""');
    } else {
      parts.push('SYSTEM ' + data.systemContent);
    }
  }
  if (data.parameters.length > 0) {
    parts.push('');
    parts.push('# Model parameters');
    data.parameters.forEach(param => {
      parts.push('PARAMETER ' + param.key + ' ' + param.value);
    });
  }
  if (data.templateContent) {
    parts.push('');
    if (data.templateContent.includes('\n')) {
      parts.push('TEMPLATE """');
      parts.push(data.templateContent);
      parts.push('"""');
    } else {
      parts.push('TEMPLATE ' + data.templateContent);
    }
  }
  return parts.join('\n');
};

const getSampleIni = (): string => {
  return [
    'FROM llama3.2:latest',
    '',
    'SYSTEM """',
    'You are a helpful assistant that provides detailed and accurate information.',
    'Respond in Chinese when asked questions in Chinese.',
    'Always be polite, concise, and informative.',
    '"""',
    '',
    '# Model parameters',
    'PARAMETER temperature 0.7',
    'PARAMETER top_p 0.95',
    'PARAMETER top_k 40',
    'PARAMETER max_tokens 4096',
    'PARAMETER repeat_penalty 1.1',
    '',
    'TEMPLATE """',
    '{{ .System }}',
    '',
    'User: {{ .Prompt }}',
    '',
    'Assistant: {{ .Response }}',
    '"""',
  ].join('\n');
};

const iniData = ref<IniData | null>(null);
const originalRaw = ref('');
const enabled = ref(false);
const fontSize = ref(13);
const helpVisible = ref(false);
const leftPanelWidth = ref(55);
const rightTab = ref<'params' | 'preview'>('params');
const editorContent = ref('');
const currentFileName = ref('');
const isModified = ref(false);
const confirmModal = ref<{ visible: boolean; type: 'reset' | 'clear' | null }>({ visible: false, type: null });

const containerRef = ref<HTMLElement | null>(null);
const syncFromEditor = ref(true);
const syncFromPanel = ref(false);

const lineCount = computed(() => editorContent.value.split('\n').length);
const charCount = computed(() => editorContent.value.length);

watch(editorContent, () => {
  if (!syncFromEditor.value) {
    syncFromEditor.value = true;
    return;
  }
  if (editorContent.value && enabled.value) {
    const parsed = parseIniContent(editorContent.value);
    syncFromPanel.value = false;
    if (iniData.value) {
      iniData.value = { ...parsed, originalFromConfig: iniData.value.originalFromConfig, originalTemplateContent: iniData.value.originalTemplateContent };
    } else {
      iniData.value = parsed;
    }
    isModified.value = editorContent.value !== originalRaw.value;
  }
});

watch(iniData, () => {
  if (syncFromPanel.value && iniData.value) {
    syncFromEditor.value = false;
    const built = buildIniContent(iniData.value);
    editorContent.value = built;
    isModified.value = built !== originalRaw.value;
    syncFromPanel.value = false;
  }
}, { deep: true });

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  try {
    const saved = localStorage.getItem('ini_config_autosave');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.raw) {
        const data = parseIniContent(parsed.raw);
        iniData.value = data;
        originalRaw.value = parsed.originalRaw || parsed.raw;
        editorContent.value = parsed.raw;
        enabled.value = true;
        toast.info('已自动加载上次的内容');
      }
    }
  } catch { /* ignore */ }

  autoSaveInterval = setInterval(() => {
    if (!iniData.value) return;
    try {
      const content = buildIniContent(iniData.value);
      localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw: originalRaw.value, time: new Date().toISOString() }));
    } catch { /* ignore */ }
  }, 60000);
});

onUnmounted(() => {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
});

const handleUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.ini,.txt,.modelfile,.conf';
  
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const data = parseIniContent(content);
        syncFromPanel.value = false;
        iniData.value = data;
        originalRaw.value = content;
        editorContent.value = content;
        enabled.value = true;
        currentFileName.value = file.name;
        isModified.value = false;
        toast.success('文件上传成功：' + file.name);
      } catch (err) {
        toast.error('文件解析失败');
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
};

const handleLoadSample = () => {
  const content = getSampleIni();
  const data = parseIniContent(content);
  syncFromPanel.value = false;
  iniData.value = data;
  originalRaw.value = content;
  editorContent.value = content;
  enabled.value = true;
  currentFileName.value = 'sample.modelfile';
  isModified.value = false;
  toast.success('示例文件已加载');
};

const handleExport = () => {
  if (!iniData.value) {
    toast.error('没有可导出的内容');
    return;
  }
  
  const content = editorContent.value || buildIniContent(iniData.value);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fromName = iniData.value.fromConfig.replace(/^FROM\s+/i, '').replace(/[:/]/g, '_');
  a.download = (fromName || 'config') + '_' + getTimestamp() + '.ini';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('文件导出成功');
};

const handleReset = () => {
  if (!originalRaw.value) {
    toast.error('没有原始内容可重置');
    return;
  }
  confirmModal.value = { visible: true, type: 'reset' };
};

const confirmReset = () => {
  const data = parseIniContent(originalRaw.value);
  syncFromPanel.value = false;
  iniData.value = data;
  editorContent.value = originalRaw.value;
  isModified.value = false;
  confirmModal.value = { visible: false, type: null };
  toast.success('已重置为原始内容');
};

const handleClear = () => {
  confirmModal.value = { visible: true, type: 'clear' };
};

const confirmClear = () => {
  iniData.value = null;
  originalRaw.value = '';
  editorContent.value = '';
  enabled.value = false;
  currentFileName.value = '';
  isModified.value = false;
  confirmModal.value = { visible: false, type: null };
  localStorage.removeItem('ini_config_autosave');
  toast.success('已清空所有内容');
};

const handleCopy = () => {
  const content = editorContent.value || (iniData.value ? buildIniContent(iniData.value) : '');
  if (!content) {
    toast.error('没有内容可复制');
    return;
  }
  navigator.clipboard.writeText(content).then(
    () => toast.success('已复制到剪贴板'),
    () => toast.error('复制失败'),
  );
};

const handleSave = () => {
  if (!iniData.value) return;
  try {
    const content = editorContent.value || buildIniContent(iniData.value);
    localStorage.setItem('ini_config_autosave', JSON.stringify({ raw: content, originalRaw: originalRaw.value, time: new Date().toISOString() }));
    toast.success('手动保存成功');
  } catch {
    toast.error('保存失败');
  }
};

const handleParamChange = (key: string, value: string) => {
  if (!iniData.value) return;
  syncFromPanel.value = true;
  iniData.value.parameters = iniData.value.parameters.map(p => p.key === key ? { ...p, value } : p);
};

const handleFromChange = (value: string) => {
  if (!iniData.value) return;
  syncFromPanel.value = true;
  iniData.value.fromConfig = value;
};

const handleSystemChange = (value: string) => {
  if (!iniData.value) return;
  syncFromPanel.value = true;
  iniData.value.systemContent = value;
};

const handleTemplateChange = (value: string) => {
  if (!iniData.value) return;
  syncFromPanel.value = true;
  iniData.value.templateContent = value;
};

const handleEditorInput = (e: Event) => {
  syncFromEditor.value = true;
  editorContent.value = (e.target as HTMLTextAreaElement).value;
};

const splitterDragging = ref(false);
const splitterLastX = ref(0);

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
  leftPanelWidth.value = Math.max(30, Math.min(75, leftPanelWidth.value + pctChange));
  splitterLastX.value = e.clientX;
};

const handleSplitterMouseUp = () => {
  splitterDragging.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

onMounted(() => {
  document.addEventListener('mousemove', handleSplitterMouseMove);
  document.addEventListener('mouseup', handleSplitterMouseUp);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleSplitterMouseMove);
  document.removeEventListener('mouseup', handleSplitterMouseUp);
});

const panelStates = ref<Record<string, boolean>>({
  from: true,
  system: true,
  parameters: true,
  template: true,
  structure: true,
  statistics: true,
});

const togglePanel = (key: string) => {
  panelStates.value[key] = !panelStates.value[key];
};

const getSliderPercent = (param: IniParameter): number => {
  const numVal = parseFloat(param.value);
  if (isNaN(numVal)) return 0;
  return Math.min(100, Math.max(0, ((numVal - param.min) / (param.max - param.min)) * 100));
};
</script>

<template>
  <div class="h-full flex flex-col bg-background-primary overflow-hidden text-text-primary">
    <!-- Help Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="helpVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click="helpVisible = false"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-2xl p-7 max-w-[540px] w-[90%] max-h-[80vh] overflow-y-auto shadow-xl border border-border"
            @click.stop
          >
            <div class="flex justify-between items-center mb-5">
              <h2 class="text-lg font-bold text-text-primary">使用帮助</h2>
              <button
                @click="helpVisible = false"
                class="w-[30px] h-[30px] rounded-full bg-background-tertiary border-none cursor-pointer text-text-tertiary flex items-center justify-center hover:bg-border transition-colors"
              >
                <X :size="16" />
              </button>
            </div>
            <div class="text-[13px] leading-[1.9] text-text-secondary">
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-text-primary mb-1">📂 文件管理</h3>
                <ul class="pl-[18px] list-disc space-y-0.5">
                  <li><b>上传文件</b> — 支持 .ini / .txt / .modelfile 格式</li>
                  <li><b>加载示例</b> — 快速加载示例配置文件</li>
                  <li><b>导出文件</b> — 保存编辑后的 INI 文件</li>
                  <li><b>重置修改</b> — 恢复为上次上传的原始内容</li>
                </ul>
              </div>
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-text-primary mb-1">✏️ 编辑器</h3>
                <ul class="pl-[18px] list-disc space-y-0.5">
                  <li>左侧代码编辑器支持语法高亮和行号</li>
                  <li>支持 Tab 缩进、Shift+Tab 反缩进</li>
                  <li>支持 Ctrl+D 复制当前行</li>
                  <li>支持 Enter 自动缩进</li>
                </ul>
              </div>
              <div class="mb-4">
                <h3 class="text-sm font-semibold text-text-primary mb-1">🎛️ 参数面板</h3>
                <ul class="pl-[18px] list-disc space-y-0.5">
                  <li>右侧面板展示解析后的参数</li>
                  <li>通过滑块或输入框调整数值参数</li>
                  <li>参数修改会实时同步到编辑器</li>
                </ul>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-text-primary mb-1">🎨 快捷键</h3>
                <ul class="pl-[18px] list-disc space-y-0.5">
                  <li><kbd class="px-1.5 py-0.5 bg-background-tertiary rounded text-xs">Tab</kbd> — 插入缩进</li>
                  <li><kbd class="px-1.5 py-0.5 bg-background-tertiary rounded text-xs">Shift+Tab</kbd> — 减少缩进</li>
                  <li><kbd class="px-1.5 py-0.5 bg-background-tertiary rounded text-xs">Ctrl/Cmd+D</kbd> — 复制当前行</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="animate-fade-in"
        leave-active-class="animate-fade-out"
      >
        <div
          v-if="confirmModal.visible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click="confirmModal.visible = false"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-[400px] w-[90%] shadow-xl border border-border"
            @click.stop
          >
            <div class="flex items-start gap-3 mb-5">
              <div 
                class="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                :class="confirmModal.type === 'reset' ? 'bg-yellow-100' : 'bg-red-100'"
              >
                <AlertCircle :size="20" :class="confirmModal.type === 'reset' ? 'text-yellow-600' : 'text-red-600'" />
              </div>
              <div class="flex-1">
                <h2 class="text-base font-semibold text-text-primary mb-2">{{ confirmModal.type === 'reset' ? '重置确认' : '清空确认' }}</h2>
                <p class="text-[13px] text-text-secondary leading-relaxed">
                  {{ confirmModal.type === 'reset' ? '确定要重置所有修改吗？此操作将恢复为上次上传的原始内容。' : '确定要清空所有内容吗？此操作不可撤销。' }}
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-2">
              <button
                @click="confirmModal.visible = false"
                class="px-4 py-2 rounded-md border border-border bg-background-secondary text-text-secondary text-[13px] font-medium cursor-pointer transition-all hover:bg-background-tertiary"
              >
                取消
              </button>
              <button
                @click="confirmModal.type === 'reset' ? confirmReset() : confirmClear()"
                class="px-4 py-2 rounded-md border-none text-white text-[13px] font-medium cursor-pointer transition-all"
                :class="confirmModal.type === 'reset' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'"
              >
                {{ confirmModal.type === 'reset' ? '重置' : '清空' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Main Content -->
    <div ref="containerRef" class="flex-1 flex overflow-hidden">
      <!-- Left: Code Editor -->
      <div
        class="flex flex-col overflow-hidden"
        :style="{ width: leftPanelWidth + '%', minWidth: '30%', maxWidth: '75%' }"
      >
        <!-- Editor Header -->
        <div class="px-3.5 py-1.5 bg-background-secondary border-b border-border flex items-center justify-between flex-shrink-0">
          <span class="text-xs font-medium text-text-secondary">
            {{ currentFileName || 'untitled.modelfile' }}
          </span>
          <div class="flex items-center gap-2 text-[11px] text-text-tertiary">
            <template v-if="enabled">
              <span>{{ lineCount }} 行</span>
              <span>·</span>
              <span>{{ charCount }} 字符</span>
              <span>·</span>
              <span>{{ iniData?.parameters.length || 0 }} 参数</span>
            </template>
          </div>
        </div>

        <!-- Editor Body -->
        <div class="flex-1 overflow-hidden p-0">
          <div v-if="!enabled" class="h-full flex flex-col items-center justify-center gap-4 bg-background-primary text-text-tertiary">
            <div class="w-[72px] h-[72px] rounded-5 bg-primary-light flex items-center justify-center">
              <FileText :size="32" class="text-primary opacity-60" />
            </div>
            <div class="text-center">
              <div class="text-base font-semibold text-text-primary mb-1.5">开始编辑</div>
              <div class="text-[13px] max-w-[300px]">上传 INI / Modelfile 文件，或加载示例开始编辑</div>
            </div>
            <div class="flex gap-2 mt-1">
              <button @click="handleUpload" class="btn-primary">
                <Upload :size="14" />
                上传文件
              </button>
              <button @click="handleLoadSample" class="btn-ghost">
                <Play :size="14" />
                加载示例
              </button>
            </div>
          </div>
          
          <textarea
            v-else
            :value="editorContent"
            @input="handleEditorInput"
            class="w-full h-full p-4 bg-background-primary text-text-primary font-mono text-sm resize-none outline-none border-none"
            :style="{ fontSize: fontSize + 'px' }"
            placeholder="在此输入或粘贴 INI / Modelfile 内容..."
            spellcheck="false"
          ></textarea>
        </div>
      </div>

      <!-- Splitter -->
      <div
        class="w-[6px] min-w-[6px] cursor-col-resize flex items-center justify-center flex-shrink-0 transition-colors"
        :class="splitterDragging ? 'bg-primary-light' : 'hover:bg-primary-light bg-border'"
        @mousedown="handleSplitterMouseDown"
      >
        <div 
          class="w-[2px] h-8 rounded-sm transition-all"
          :class="splitterDragging ? 'bg-white opacity-90' : 'bg-text-tertiary opacity-30 hover:opacity-90 hover:bg-white'"
        />
      </div>

      <!-- Right: Parameter Panel -->
      <div class="flex-1 flex flex-col overflow-hidden bg-background-secondary">
        <!-- Tabs -->
        <div class="flex items-center border-b border-border bg-background-secondary flex-shrink-0">
          <button
            @click="rightTab = 'params'"
            class="px-3.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
            :class="rightTab === 'params' ? 'text-primary border-b-2 border-primary bg-primary-light' : 'text-text-tertiary hover:text-text-secondary border-b-2 border-transparent'"
          >
            <SlidersHorizontal :size="13" />
            参数面板
          </button>
          <button
            @click="rightTab = 'preview'"
            class="px-3.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
            :class="rightTab === 'preview' ? 'text-primary border-b-2 border-primary bg-primary-light' : 'text-text-tertiary hover:text-text-secondary border-b-2 border-transparent'"
          >
            <Eye :size="13" />
            结构预览
          </button>
        </div>

        <!-- Tab Content -->
        <div class="flex-1 overflow-y-auto p-3.5">
          <div v-if="!enabled" class="h-full flex flex-col items-center justify-center text-text-tertiary gap-2">
            <SlidersHorizontal :size="28" class="opacity-30" />
            <span class="text-[13px]">加载文件后显示参数</span>
          </div>
          
          <template v-else-if="rightTab === 'params'">
            <!-- FROM -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('from')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">🏷️</span>
                  <span class="text-xs font-semibold text-text-primary">FROM 模型配置</span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.from ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.from" class="panel-content">
                  <input
                    type="text"
                    :value="iniData?.fromConfig ?? ''"
                    @input="handleFromChange(($event.target as HTMLInputElement).value)"
                    placeholder="FROM llama3.2:latest"
                    class="panel-input font-semibold"
                    :style="{ fontSize: fontSize + 'px' }"
                  />
                </div>
              </Transition>
            </div>

            <!-- SYSTEM -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('system')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">🤖</span>
                  <span class="text-xs font-semibold text-text-primary">角色设定 (SYSTEM)</span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.system ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.system" class="panel-content">
                  <textarea
                    :value="iniData?.systemContent ?? ''"
                    @input="handleSystemChange(($event.target as HTMLTextAreaElement).value)"
                    placeholder="系统角色提示词..."
                    rows="5"
                    class="panel-textarea min-h-[80px]"
                    :style="{ fontSize: (fontSize - 1) + 'px' }"
                  ></textarea>
                </div>
              </Transition>
            </div>

            <!-- Parameters -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('parameters')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">🎛️</span>
                  <span class="text-xs font-semibold text-text-primary">模型参数</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-light text-primary font-semibold">
                    {{ iniData?.parameters.length || 0 }}
                  </span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.parameters ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.parameters" class="panel-content">
                  <template v-if="iniData && iniData.parameters.length > 0">
                    <div
                      v-for="param in iniData.parameters"
                      :key="param.key"
                      class="param-control"
                    >
                      <div class="flex items-center justify-between mb-2.5">
                        <div>
                          <span class="text-sm font-semibold text-text-primary font-mono">{{ param.displayKey }}</span>
                          <span v-if="KNOWN_PARAMS[param.key.toLowerCase()]" class="text-[11px] text-text-tertiary ml-2">
                            {{ KNOWN_PARAMS[param.key.toLowerCase()].desc }}
                          </span>
                        </div>
                      </div>
                      
                      <div v-if="param.isNumeric" class="flex items-center gap-3.5">
                        <div class="flex-1 relative">
                          <div class="w-full h-1 bg-border rounded"></div>
                          <div 
                            class="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-primary-hover rounded transition-all"
                            :style="{ width: getSliderPercent(param) + '%' }"
                          />
                          <div 
                            class="absolute top-[-5px] w-3.5 h-3.5 bg-primary rounded-full shadow-md transition-all"
                            :style="{ left: getSliderPercent(param) + '%', transform: 'translateX(-50%)' }"
                          />
                          <input
                            type="range"
                            :min="param.min"
                            :max="param.max"
                            :step="param.step"
                            :value="parseFloat(param.value) || param.min"
                            @input="handleParamChange(param.key, ($event.target as HTMLInputElement).value)"
                            class="absolute top-[-10px] left-0 w-full h-6 opacity-0 cursor-pointer"
                          />
                          <div class="flex justify-between text-[10px] text-text-tertiary mt-1.5 font-mono">
                            <span>{{ param.min }}</span>
                            <span>{{ param.max }}</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          :value="param.value"
                          @input="handleParamChange(param.key, ($event.target as HTMLInputElement).value)"
                          class="w-20 px-2.5 py-1.5 border border-border rounded-md text-center font-mono text-sm font-semibold bg-background-primary text-text-primary focus:border-primary outline-none transition-colors"
                        />
                      </div>
                      
                      <input
                        v-else
                        type="text"
                        :value="param.value"
                        @input="handleParamChange(param.key, ($event.target as HTMLInputElement).value)"
                        class="w-full px-3 py-2 border border-border rounded-md font-mono text-sm bg-background-primary text-text-primary focus:border-primary outline-none transition-colors"
                      />
                    </div>
                  </template>
                  <div v-else class="text-center text-text-tertiary text-xs py-4">
                    没有可调整的参数
                  </div>
                </div>
              </Transition>
            </div>

            <!-- TEMPLATE -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('template')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">📝</span>
                  <span class="text-xs font-semibold text-text-primary">模板 (TEMPLATE)</span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.template ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.template" class="panel-content">
                  <textarea
                    :value="iniData?.templateContent ?? ''"
                    @input="handleTemplateChange(($event.target as HTMLTextAreaElement).value)"
                    placeholder="模板内容..."
                    rows="4"
                    class="panel-textarea min-h-[60px]"
                    :style="{ fontSize: (fontSize - 1) + 'px' }"
                  ></textarea>
                </div>
              </Transition>
            </div>
          </template>
          
          <template v-else>
            <!-- Structure Preview -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('structure')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">📋</span>
                  <span class="text-xs font-semibold text-text-primary">文件结构</span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.structure ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.structure" class="panel-content">
                  <div v-if="iniData" class="text-xs font-mono leading-[1.8]">
                    <div class="flex gap-2 py-1 border-b border-border">
                      <span class="text-primary font-semibold min-w-[100px]">FROM</span>
                      <span class="text-text-secondary">{{ iniData.fromConfig.replace(/^FROM\s+/i, '') }}</span>
                    </div>
                    <div class="flex gap-2 py-1 border-b border-border">
                      <span class="text-green-600 font-semibold min-w-[100px]">SYSTEM</span>
                      <span class="text-text-secondary">{{ iniData.systemContent ? (iniData.systemContent.length > 60 ? iniData.systemContent.substring(0, 60) + '...' : iniData.systemContent) : '(空)' }}</span>
                    </div>
                    <div
                      v-for="p in iniData.parameters"
                      :key="p.key"
                      class="flex gap-2 py-1 border-b border-border"
                    >
                      <span class="text-blue-600 font-semibold min-w-[100px]">PARAM {{ p.key }}</span>
                      <span class="text-text-secondary">{{ p.value }}</span>
                    </div>
                    <div class="flex gap-2 py-1">
                      <span class="text-purple-600 font-semibold min-w-[100px]">TEMPLATE</span>
                      <span class="text-text-secondary">{{ iniData.templateContent ? (iniData.templateContent.length > 60 ? iniData.templateContent.substring(0, 60) + '...' : iniData.templateContent) : '(空)' }}</span>
                    </div>
                  </div>
                  <div v-else class="text-center text-text-tertiary text-xs py-4">无数据</div>
                </div>
              </Transition>
            </div>

            <!-- Statistics -->
            <div class="panel-section">
              <div 
                class="panel-header"
                @click="togglePanel('statistics')"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[13px]">📊</span>
                  <span class="text-xs font-semibold text-text-primary">统计信息</span>
                </div>
                <span 
                  class="text-[9px] text-text-tertiary inline-block transition-transform"
                  :class="panelStates.statistics ? 'rotate-180' : 'rotate-0'"
                >▼</span>
              </div>
              <Transition
                enter-active-class="animate-fade-in"
                leave-active-class="animate-fade-out"
              >
                <div v-if="panelStates.statistics" class="panel-content">
                  <div class="grid grid-cols-2 gap-2">
                    <div class="stat-card">
                      <div class="text-lg font-bold text-text-primary font-mono">{{ lineCount }}</div>
                      <div class="text-[10px] text-text-tertiary mt-0.5">行数</div>
                    </div>
                    <div class="stat-card">
                      <div class="text-lg font-bold text-text-primary font-mono">{{ charCount }}</div>
                      <div class="text-[10px] text-text-tertiary mt-0.5">字符数</div>
                    </div>
                    <div class="stat-card">
                      <div class="text-lg font-bold text-text-primary font-mono">{{ iniData?.parameters.length || 0 }}</div>
                      <div class="text-[10px] text-text-tertiary mt-0.5">参数数</div>
                    </div>
                    <div class="stat-card">
                      <div class="text-lg font-bold text-text-primary font-mono">{{ Math.ceil(charCount / 1024) }}</div>
                      <div class="text-[10px] text-text-tertiary mt-0.5">KB</div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Bottom Toolbar -->
    <div class="bg-background-secondary border-t border-border px-4 py-2 flex items-center justify-between flex-shrink-0 gap-2">
      <!-- Left: Logo & Status -->
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
          <Braces :size="16" class="text-white" />
        </div>
        <div>
          <div class="text-sm font-bold text-text-primary leading-tight">INI Config Editor</div>
          <div class="text-[11px] text-text-tertiary flex items-center gap-1.5">
            <template v-if="enabled">
              <span>{{ lineCount }} 行</span>
              <span>·</span>
              <span>{{ charCount }} 字符</span>
              <span v-if="isModified" class="text-yellow-600 font-semibold">● 已修改</span>
            </template>
            <span v-else>未加载文件</span>
          </div>
        </div>
      </div>

      <!-- Center: Action Buttons -->
      <div class="flex items-center gap-1">
        <button @click="handleUpload" class="btn-primary" title="上传文件">
          <Upload :size="13" />
          上传
        </button>
        <button @click="handleLoadSample" class="btn-ghost" title="加载示例">
          <Play :size="13" />
          示例
        </button>
        <div class="w-px h-5 bg-border mx-1"></div>
        <button @click="handleSave" :disabled="!enabled" class="btn-secondary" title="保存">
          <Save :size="13" />
          保存
        </button>
        <button @click="handleExport" :disabled="!enabled" class="btn-success" title="导出">
          <Download :size="13" />
          导出
        </button>
        <button @click="handleCopy" :disabled="!enabled" class="btn-secondary" title="复制">
          <Copy :size="13" />
        </button>
        <button @click="handleReset" :disabled="!enabled" class="btn-warning" title="重置">
          <RotateCcw :size="13" />
        </button>
        <button @click="handleClear" :disabled="!enabled" class="btn-danger" title="清空">
          <Trash2 :size="13" />
        </button>
      </div>

      <!-- Right: Settings -->
      <div class="flex items-center gap-1.5">
        <div class="flex items-center gap-0.5 bg-background-secondary rounded-md p-0.5 px-1">
          <button
            v-for="size in [12, 13, 14, 16]"
            :key="size"
            @click="fontSize = size"
            class="px-1.5 py-0.5 rounded border-none text-[10px] cursor-pointer transition-colors"
            :class="fontSize === size ? 'bg-primary-light text-primary font-semibold' : 'bg-transparent text-text-tertiary hover:text-text-secondary'"
          >
            {{ size }}
          </button>
        </div>
        <button
          @click="helpVisible = true"
          title="帮助"
          class="w-[30px] h-[30px] rounded-lg border border-border bg-background-secondary hover:bg-background-tertiary flex items-center justify-center text-text-secondary transition-colors"
        >
          <HelpCircle :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  @apply px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply px-3 py-1.5 rounded-md bg-background-tertiary text-text-secondary text-xs font-medium flex items-center gap-1.5 hover:bg-border transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-success {
  @apply px-3 py-1.5 rounded-md bg-green-500 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-warning {
  @apply px-3 py-1.5 rounded-md bg-yellow-500 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-danger {
  @apply px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-ghost {
  @apply px-3 py-1.5 rounded-md bg-transparent text-text-secondary text-xs font-medium flex items-center gap-1.5 hover:bg-background-tertiary transition-all;
}

.panel-section {
  @apply bg-background-primary rounded-lg border border-border mb-2.5 overflow-hidden;
}

.panel-header {
  @apply px-3 py-2 flex items-center justify-between cursor-pointer select-none bg-background-secondary;
}

.panel-content {
  @apply p-3 border-t border-border;
}

.panel-input {
  @apply w-full px-3 py-2 border border-border rounded-md font-mono text-text-primary bg-background-primary outline-none transition-colors;
}

.panel-input:focus {
  @apply border-primary;
}

.panel-textarea {
  @apply w-full px-3 py-2 border border-border rounded-md font-mono leading-relaxed text-text-primary bg-background-primary outline-none resize-y transition-colors;
}

.panel-textarea:focus {
  @apply border-primary;
}

.param-control {
  @apply p-3 bg-background-secondary rounded-lg border border-border mb-2;
}

.param-control:last-child {
  @apply mb-0;
}

.stat-card {
  @apply p-2.5 px-3 bg-background-secondary rounded-lg border border-border text-center;
}

.rounded-5 {
  border-radius: 20px;
}
</style>
