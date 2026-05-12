<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Activity, Clock, Zap, Database, Settings2, TrendingUp, 
  MessageSquare, RefreshCw, ChevronDown, ChevronUp, X
} from 'lucide-vue-next';

interface CompletionStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTime: number;
  thinkingTime?: number;
  tokensPerSecond?: number;
}

interface Props {
  data: CompletionStats;
  isVisible: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:isVisible', value: boolean): void;
}>();

const isExpanded = ref(false);
const isRefreshing = ref(false);

const defaultMetrics = {
  requestId: '-',
  modelName: '-',
  conversationTitle: '-',
  timestamp: 0,
  modelLoadTime: 0,
  promptEvalTime: 0,
  inferenceTime: 0,
  totalTime: 0,
  totalTokens: 0,
  throughput: 0,
  firstTokenTime: 0,
  promptTokens: 0,
  completionTokens: 0,
  temperature: 0,
  topP: 0,
  contextLength: 0,
  numCtx: 4096,
  imageCount: 0,
};

const metrics = computed(() => {
  if (!props.data || props.data.totalTokens === 0) return null;
  
  return {
    ...defaultMetrics,
    ...props.data,
    totalTime: props.data.responseTime,
    throughput: props.data.tokensPerSecond || 
      (props.data.completionTokens / props.data.responseTime),
  };
});

const formatTime = (seconds: number): string => {
  if (seconds === 0) return '-';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
};

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds.toFixed(1)}秒`;
};

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

const getThroughputLabel = (throughput: number): string => {
  if (throughput >= 50) return '优秀';
  if (throughput >= 20) return '良好';
  if (throughput > 0) return '较慢';
  return '-';
};

const handleToggle = () => {
  isExpanded.value = !isExpanded.value;
};

const handleRefresh = () => {
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
  }, 300);
};
</script>

<template>
  <Transition name="panel">
    <div v-if="isVisible" class="performance-panel">
      <div class="panel-header" @click="handleToggle">
        <div class="header-left">
          <div class="icon-wrapper">
            <Activity :size="14" />
          </div>
          
          <template v-if="!isExpanded && metrics">
            <div class="mini-stats">
              <div class="mini-stat">
                <Zap :size="12" />
                <span>{{ metrics.throughput > 0 ? metrics.throughput.toFixed(1) : '0' }} t/s</span>
              </div>
              <div class="mini-stat secondary">
                <Clock :size="12" />
                <span>{{ formatTime(metrics.totalTime) }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="isExpanded">
            <span class="title">性能监控</span>
            <span v-if="metrics" class="token-count">
              {{ formatNumber(metrics.totalTokens || data.totalTokens) }} tokens
            </span>
          </template>
        </div>

        <div class="toggle-icon" :class="{ expanded: isExpanded }">
          <ChevronDown v-if="isExpanded" :size="18" />
          <ChevronUp v-else :size="18" />
        </div>
      </div>

      <Transition name="expand">
        <div v-if="isExpanded" class="panel-content">
          <template v-if="!metrics">
            <div class="empty-state">
              <div class="empty-icon">
                <Activity :size="20" />
              </div>
              <p class="empty-title">暂无性能数据</p>
              <p class="empty-desc">发送消息后将显示性能数据</p>
            </div>
          </template>

          <template v-else>
            <div class="info-bar">
              <MessageSquare :size="12" />
              <span>{{ metrics.conversationTitle }}</span>
            </div>

            <div class="model-tag">{{ metrics.modelName }}</div>

            <div class="card speed-card">
              <div class="card-header">
                <Zap :size="16" />
                <span>生成速度</span>
                <span class="badge">{{ getThroughputLabel(metrics.throughput) }}</span>
              </div>
              <div class="speed-value">
                <span class="number">{{ metrics.throughput > 0 ? metrics.throughput.toFixed(1) : '0' }}</span>
                <span class="unit">tokens/s</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${Math.min((metrics.throughput / 100) * 100, 100)}%` }"
                ></div>
              </div>
            </div>

            <div class="card time-card">
              <div class="card-header">
                <Clock :size="14" />
                <span>时间统计</span>
              </div>
              <div class="stat-list">
                <div class="stat-row">
                  <div class="stat-dot primary"></div>
                  <span>总耗时</span>
                  <span class="value">{{ formatTime(metrics.totalTime) }}</span>
                </div>
                <div class="stat-row">
                  <div class="stat-dot cyan"></div>
                  <span>回复时长</span>
                  <span class="value">{{ formatDuration(metrics.totalTime) }}</span>
                </div>
                <div class="stat-row">
                  <div class="stat-dot warning"></div>
                  <span>推理生成</span>
                  <span class="value">{{ formatTime(metrics.inferenceTime || responseTime) }}</span>
                </div>
                <div class="stat-row">
                  <div class="stat-dot purple"></div>
                  <span>首Token延迟</span>
                  <span class="value">{{ formatTime(metrics.firstTokenTime || 0) }}</span>
                </div>
              </div>
            </div>

            <div class="card token-card">
              <div class="card-header">
                <Database :size="14" />
                <span>Token 统计</span>
                <span class="limit-badge">限制 {{ numCtx >= 1024 ? `${(numCtx / 1024).toFixed(0)}K` : numCtx }}</span>
              </div>
              <div class="token-grid">
                <div class="token-item">
                  <div class="token-value primary">{{ data.totalTokens > 0 ? data.totalTokens : '-' }}</div>
                  <div class="token-label">总计</div>
                </div>
                <div class="token-item">
                  <div class="token-value info">{{ data.promptTokens > 0 ? data.promptTokens : '-' }}</div>
                  <div class="token-label">输入</div>
                </div>
                <div class="token-item">
                  <div class="token-value success">{{ data.completionTokens > 0 ? data.completionTokens : '-' }}</div>
                  <div class="token-label">输出</div>
                </div>
              </div>
              <div class="context-info">
                <span>上下文长度</span>
                <span>{{ contextLength || 0 }} 条消息</span>
              </div>
            </div>

            <div class="card param-card">
              <div class="card-header">
                <Settings2 :size="14" />
                <span>模型参数</span>
              </div>
              <div class="param-grid">
                <div class="param-item">
                  <div class="param-label">Temperature</div>
                  <div class="param-value">{{ temperature > 0 ? temperature.toFixed(2) : '-' }}</div>
                </div>
                <div class="param-item">
                  <div class="param-label">Top P</div>
                  <div class="param-value">{{ topP > 0 ? topP.toFixed(2) : '-' }}</div>
                </div>
              </div>
            </div>

            <button class="refresh-btn" @click="handleRefresh">
              <RefreshCw :size="14" :class="{ spinning: isRefreshing }" />
              <span>清空数据</span>
            </button>
          </template>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.performance-panel {
  position: absolute;
  top: 70px;
  left: 16px;
  width: 260px;
  background-color: transparent;
  border-radius: 16px;
  overflow: hidden;
  z-index: 50;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
}

.panel-header:hover {
  opacity: 0.9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: var(--primary-color);
  color: white;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.token-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
}

.mini-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--success-color);
}

.mini-stat.secondary {
  color: var(--text-secondary);
}

.toggle-icon {
  transition: transform 0.3s ease;
  color: var(--text-tertiary);
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.panel-content {
  padding: 12px;
  max-height: 65vh;
  overflow-y: auto;
  scrollbar-width: none;
}

.panel-content::-webkit-scrollbar {
  display: none;
}

.empty-state {
  text-align: center;
  padding: 24px 16px;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background-color: var(--primary-light);
  color: var(--primary-color);
}

.empty-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 11px;
  color: var(--text-tertiary);
}

.info-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.info-bar span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-tag {
  display: inline-block;
  padding: 4px 8px;
  background-color: var(--primary-light);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 12px;
}

.card {
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  cursor: default;
}

.card:hover {
  transform: scale(1.01);
}

.speed-card {
  background: linear-gradient(135deg, #10b981 0%, rgba(34, 197, 94, 0.7) 100%);
  color: white;
}

.time-card,
.token-card,
.param-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
}

.time-card .card-header,
.token-card .card-header,
.param-card .card-header {
  color: var(--text-primary);
}

.badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.2);
  font-size: 10px;
}

.speed-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 10px;
}

.number {
  font-size: 28px;
  font-weight: 700;
}

.unit {
  font-size: 13px;
  opacity: 0.9;
}

.progress-bar {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.stat-row > span:nth-child(2) {
  color: var(--text-secondary);
  flex: 1;
}

.value {
  font-weight: 600;
  color: var(--text-primary);
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-dot.primary { background-color: var(--primary-color); }
.stat-dot.cyan { background-color: #06B6D4; }
.stat-dot.warning { background-color: var(--warning-color); }
.stat-dot.purple { background-color: #9333EA; }

.limit-badge {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--primary-color);
  background-color: var(--primary-light);
}

.token-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.token-item {
  text-align: center;
  padding: 8px 4px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.token-value {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 2px;
}

.token-value.primary { color: var(--primary-color); }
.token-value.info { color: #06b6d4; }
.token-value.success { color: var(--success-color); }

.token-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.context-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.context-info span:last-child {
  font-weight: 600;
  color: var(--text-primary);
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.param-item {
  padding: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.param-label {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-bottom: 2px;
}

.param-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  transform: scale(1.02);
  background-color: var(--bg-tertiary);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
