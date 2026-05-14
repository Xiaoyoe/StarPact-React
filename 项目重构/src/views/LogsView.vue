<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLogStore, type LogLevel, type LogEntry } from '@/stores/useLogStore';
import { useToast } from '@/composables/useToast';
import {
  FileText, Search, Trash2, Download, RefreshCw, Filter,
  Info, CheckCircle, AlertTriangle, AlertCircle, Bug,
  ChevronDown, ChevronUp, X, Clock, Tag, Copy
} from 'lucide-vue-next';

const logStore = useLogStore();
const toast = useToast();

const expandedLog = ref<string | null>(null);
const autoRefresh = ref(true);
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null);

const levelConfig: Record<LogLevel, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const levelOptions: { value: LogLevel | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'info', label: '信息' },
  { value: 'success', label: '成功' },
  { value: 'warning', label: '警告' },
  { value: 'error', label: '错误' },
  { value: 'debug', label: '调试' },
];

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${Math.floor(diff / 86400000)}天前`;
};

const toggleExpand = (id: string) => {
  expandedLog.value = expandedLog.value === id ? null : id;
};

const copyLog = async (log: LogEntry) => {
  const text = `[${formatTime(log.timestamp)}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? `\n${log.details}` : ''}`;
  await navigator.clipboard.writeText(text);
  toast.success('已复制到剪贴板');
};

const clearAllLogs = () => {
  if (confirm('确定要清空所有日志吗？')) {
    logStore.clearLogs();
    toast.success('日志已清空');
  }
};

const clearLevelLogs = (level: LogLevel) => {
  if (confirm(`确定要清空所有 ${level} 级别的日志吗？`)) {
    logStore.clearByLevel(level);
    toast.success(`已清空 ${level} 日志`);
  }
};

const exportLogs = () => {
  logStore.exportLogs();
  toast.success('日志已导出');
};

const addTestLogs = () => {
  logStore.info('系统', '应用启动完成', '所有模块加载成功');
  logStore.success('聊天', '消息发送成功', '响应时间: 1.2s');
  logStore.warning('存储', '存储空间不足', '剩余空间: 500MB');
  logStore.error('网络', '连接超时', '请检查网络连接');
  logStore.debug('调试', '性能指标', 'CPU: 45%, Memory: 2.1GB');
  toast.success('已添加测试日志');
};

onMounted(() => {
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(() => {
      // Auto refresh is handled by reactivity
    }, 5000);
  }
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: transparent;">
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
      <div class="flex items-center gap-3">
        <FileText :size="20" class="text-primary" />
        <h1 class="text-lg font-bold text-text-primary">系统日志</h1>
        <span class="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary">
          {{ logStore.logCounts.total }} 条
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="addTestLogs" class="btn-secondary" title="添加测试日志">
          <Bug :size="14" />
          测试
        </button>
        <button @click="exportLogs" :disabled="logStore.logs.length === 0" class="btn-secondary" title="导出日志">
          <Download :size="14" />
          导出
        </button>
        <button @click="clearAllLogs" :disabled="logStore.logs.length === 0" class="btn-danger" title="清空日志">
          <Trash2 :size="14" />
          清空
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 px-4 py-2 border-b border-border bg-background-tertiary">
      <div class="flex-1 relative">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          v-model="logStore.searchQuery"
          type="text"
          placeholder="搜索日志..."
          class="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background-primary text-text-primary outline-none focus:border-primary transition-colors text-sm"
        />
      </div>
      
      <div class="flex items-center gap-2">
        <Filter :size="14" class="text-text-tertiary" />
        <select
          v-model="logStore.filterLevel"
          class="px-3 py-2 rounded-lg border border-border bg-background-primary text-text-primary outline-none focus:border-primary transition-colors text-sm"
        >
          <option v-for="opt in levelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        
        <select
          v-model="logStore.filterCategory"
          class="px-3 py-2 rounded-lg border border-border bg-background-primary text-text-primary outline-none focus:border-primary transition-colors text-sm"
        >
          <option value="">全部分类</option>
          <option v-for="cat in logStore.categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-4 px-4 py-2 border-b border-border bg-background-secondary/50">
      <div
        v-for="level in (['info', 'success', 'warning', 'error', 'debug'] as LogLevel[])"
        :key="level"
        class="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
        @click="logStore.filterLevel = logStore.filterLevel === level ? 'all' : level"
      >
        <div
          class="w-2.5 h-2.5 rounded-full"
          :class="levelConfig[level].bg"
        ></div>
        <span class="text-xs text-text-secondary">{{ level }}</span>
        <span class="text-xs font-semibold" :class="levelConfig[level].color">
          {{ logStore.logCounts[level] }}
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="logStore.filteredLogs.length === 0" class="flex flex-col items-center justify-center h-full text-text-tertiary">
        <FileText :size="48" class="opacity-30 mb-4" />
        <p class="text-sm">暂无日志记录</p>
        <p class="text-xs mt-1">系统运行日志将显示在这里</p>
      </div>

      <div v-else class="divide-y divide-border">
        <div
          v-for="log in logStore.filteredLogs"
          :key="log.id"
          class="log-entry"
          :class="{ expanded: expandedLog === log.id }"
        >
          <div class="log-header" @click="toggleExpand(log.id)">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div
                class="log-level-icon"
                :class="levelConfig[log.level].bg"
              >
                <component :is="levelConfig[log.level].icon" :size="14" :class="levelConfig[log.level].color" />
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="log-category">{{ log.category }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
                <div class="log-meta">
                  <Clock :size="10" />
                  <span>{{ formatRelativeTime(log.timestamp) }}</span>
                  <span class="text-text-tertiary/50">|</span>
                  <span>{{ formatTime(log.timestamp) }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <button
                @click.stop="copyLog(log)"
                class="p-1.5 rounded hover:bg-background-tertiary text-text-tertiary hover:text-text-primary transition-colors"
                title="复制"
              >
                <Copy :size="12" />
              </button>
              <ChevronDown
                v-if="log.details || log.data"
                :size="14"
                class="text-text-tertiary transition-transform"
                :class="{ 'rotate-180': expandedLog === log.id }"
              />
            </div>
          </div>
          
          <Transition
            enter-active-class="animate-fade-in"
            leave-active-class="animate-fade-out"
          >
            <div v-if="expandedLog === log.id && (log.details || log.data)" class="log-details">
              <div v-if="log.details" class="log-details-text">
                {{ log.details }}
              </div>
              <div v-if="log.data" class="log-details-data">
                <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between px-4 py-2 border-t border-border bg-background-secondary text-xs text-text-tertiary">
      <div class="flex items-center gap-4">
        <span>显示 {{ logStore.filteredLogs.length }} / {{ logStore.logCounts.total }} 条日志</span>
      </div>
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            v-model="autoRefresh"
            class="rounded border-border"
          />
          <span>自动刷新</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-secondary {
  @apply px-3 py-1.5 rounded-lg bg-background-tertiary text-text-secondary text-xs font-medium flex items-center gap-1.5 hover:bg-border transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-danger {
  @apply px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
}

.log-entry {
  @apply bg-background-primary transition-colors;
}

.log-entry:hover {
  background-color: var(--bg-secondary);
  opacity: 0.7;
}

.log-entry.expanded {
  @apply bg-background-secondary;
}

.log-header {
  @apply flex items-center gap-3 px-4 py-3 cursor-pointer;
}

.log-level-icon {
  @apply flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0;
}

.log-category {
  @apply text-xs font-semibold text-primary px-2 py-0.5 rounded bg-primary-light;
}

.log-message {
  @apply text-sm text-text-primary truncate;
}

.log-meta {
  @apply flex items-center gap-1.5 text-[10px] text-text-tertiary mt-1;
}

.log-details {
  @apply px-4 pb-3 pl-14;
}

.log-details-text {
  @apply text-xs text-text-secondary bg-background-tertiary rounded-lg p-3 font-mono whitespace-pre-wrap;
}

.log-details-data {
  @apply text-xs text-text-secondary bg-background-tertiary rounded-lg p-3 font-mono overflow-x-auto;
}

.log-details-data pre {
  @apply m-0;
}
</style>
