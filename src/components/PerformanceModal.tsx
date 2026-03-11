import { X, RefreshCw, Activity, Clock, Zap, Database, Settings2, TrendingUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useState } from 'react';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  currentRoundTokens: {
    prompt: 0,
    completion: 0,
    total: 0,
  },
  previousRoundTokens: null,
  totalConversationTokens: {
    prompt: 0,
    completion: 0,
    total: 0,
  },
};

function formatTime(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds.toFixed(1)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds.toFixed(1)}秒`;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function PerformanceModal({ isOpen, onClose }: PerformanceModalProps) {
  const { performanceMetrics, setPerformanceMetrics, activeOllamaModel } = useStore();
  const metrics = performanceMetrics || defaultMetrics;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPerformanceMetrics(null);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const getThroughputLabel = (throughput: number) => {
    if (throughput >= 50) return '优秀';
    if (throughput >= 20) return '良好';
    if (throughput > 0) return '较慢';
    return '-';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <Activity size={18} style={{ color: 'white' }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    性能监控
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {performanceMetrics ? `${metrics.totalConversationTokens.total > 0 ? formatNumber(metrics.totalConversationTokens.total) : '0'} tokens` : '运行耗时与性能数据'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110"
                style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              {!performanceMetrics ? (
                <div className="text-center py-8">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--primary-light)' }}
                  >
                    <Activity size={20} style={{ color: 'var(--primary-color)' }} />
                  </div>
                  {activeOllamaModel ? (
                    <>
                      <div
                        className="px-2 py-1 rounded text-xs font-medium inline-block mb-2"
                        style={{ 
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary-color)'
                        }}
                      >
                        {activeOllamaModel}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        发送消息后将显示性能数据
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        暂无性能数据
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        请先选择模型
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <MessageSquare size={12} style={{ color: 'var(--primary-color)' }} />
                    <span style={{ color: 'var(--text-primary)' }} className="truncate">
                      {metrics.conversationTitle}
                    </span>
                  </div>

                  <div
                    className="px-2 py-1 rounded text-xs font-medium inline-block"
                    style={{ 
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-color)'
                    }}
                  >
                    {metrics.modelName}
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--success-color) 0%, rgba(34, 197, 94, 0.7) 100%)',
                      color: 'white'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap size={16} />
                        <span className="text-xs font-medium opacity-90">生成速度</span>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        {getThroughputLabel(metrics.throughput)}
                      </span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold">
                        {metrics.throughput > 0 ? metrics.throughput.toFixed(1) : '0'}
                      </span>
                      <span className="text-sm opacity-80 mb-1">tokens/s</span>
                    </div>
                    <div
                      className="mt-3 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((metrics.throughput / 100) * 100, 100)}%`,
                          backgroundColor: 'rgba(255,255,255,0.8)'
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>时间统计</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--primary-color)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>总耗时</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(metrics.totalTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#06B6D4' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>回复时长</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatDuration(metrics.totalTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--warning-color)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>模型加载</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(metrics.modelLoadTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#9333EA' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Prompt处理</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(metrics.promptEvalTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--success-color)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>推理生成</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(metrics.inferenceTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--error-color)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>首Token延迟</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {formatTime(metrics.firstTokenTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Database size={14} style={{ color: 'var(--primary-color)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Token 统计</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--primary-color)', backgroundColor: 'var(--primary-light)' }}>
                        限制 {metrics.numCtx >= 1024 ? `${(metrics.numCtx / 1024).toFixed(0)}K` : metrics.numCtx}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-lg font-bold" style={{ color: 'var(--primary-color)' }}>
                          {metrics.totalTokens > 0 ? metrics.totalTokens : '-'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>总计</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-lg font-bold" style={{ color: 'var(--info-color)' }}>
                          {metrics.promptTokens > 0 ? metrics.promptTokens : '-'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>输入</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-lg font-bold" style={{ color: 'var(--success-color)' }}>
                          {metrics.completionTokens > 0 ? metrics.completionTokens : '-'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>输出</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>上下文长度</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {metrics.contextLength} 条消息
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-secondary)' }}>上下文图片</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {metrics.imageCount > 0 ? `${metrics.imageCount} 张` : '-'}
                      </span>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>总对话记录</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>输入Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--info-color)' }}>
                          {metrics.totalConversationTokens.prompt > 0 ? formatNumber(metrics.totalConversationTokens.prompt) : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>输出Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--success-color)' }}>
                          {metrics.totalConversationTokens.completion > 0 ? formatNumber(metrics.totalConversationTokens.completion) : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>总计Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
                          {metrics.totalConversationTokens.total > 0 ? formatNumber(metrics.totalConversationTokens.total) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>当前轮次</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>输入Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--info-color)' }}>
                          {metrics.currentRoundTokens.prompt > 0 ? formatNumber(metrics.currentRoundTokens.prompt) : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>输出Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--success-color)' }}>
                          {metrics.currentRoundTokens.completion > 0 ? formatNumber(metrics.currentRoundTokens.completion) : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>总计Token</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--primary-color)' }}>
                          {metrics.currentRoundTokens.total > 0 ? formatNumber(metrics.currentRoundTokens.total) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={14} style={{ color: 'var(--text-tertiary)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>上一轮对话</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>输入Token</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {metrics.previousRoundTokens ? formatNumber(metrics.previousRoundTokens.prompt) : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>输出Token</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {metrics.previousRoundTokens ? formatNumber(metrics.previousRoundTokens.completion) : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>总计Token</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {metrics.previousRoundTokens ? formatNumber(metrics.previousRoundTokens.total) : '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>模型参数</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Temperature</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {metrics.temperature > 0 ? metrics.temperature.toFixed(2) : '-'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Top P</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {metrics.topP > 0 ? metrics.topP.toFixed(2) : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-2.5 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-tertiary)' }}>请求 ID</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {metrics.requestId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: 'var(--text-tertiary)' }}>时间戳</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatTimestamp(metrics.timestamp)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRefresh}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                    title="清空数据"
                  >
                    <RefreshCw
                      size={14}
                      className={isRefreshing ? 'animate-spin' : ''}
                    />
                    <span>清空数据</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
