import { Timer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';

interface PerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultMetrics = {
  requestId: '-',
  modelLoadTime: 0,
  inferenceTime: 0,
  totalTokens: 0,
  throughput: 0,
  firstTokenTime: 0,
  promptTokens: 0,
  completionTokens: 0,
  memoryUsage: '-',
  gpuUsage: '-',
  temperature: 0,
  topP: 0,
};

export function PerformanceModal({ isOpen, onClose }: PerformanceModalProps) {
  const { performanceMetrics } = useStore();
  const metrics = performanceMetrics || defaultMetrics;

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
            className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
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
                  style={{ backgroundColor: 'var(--primary-light)' }}
                >
                  <Timer size={18} style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    性能指标
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {performanceMetrics ? '运行耗时与性能数据' : '暂无性能数据，请先发送消息'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>请求信息</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>请求 ID</span>
                      <span className="text-xs font-mono truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }} title={metrics.requestId}>{metrics.requestId}</span>
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>吞吐量</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>生成速度</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold" style={{ color: metrics.throughput > 0 ? 'var(--success-color)' : 'var(--text-tertiary)' }}>
                        {metrics.throughput > 0 ? metrics.throughput.toFixed(1) : '-'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>tokens/s</span>
                    </div>
                  </div>
                  <div 
                    className="mt-3 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${Math.min((metrics.throughput / 500) * 100, 100)}%`,
                        backgroundColor: 'var(--success-color)'
                      }}
                    />
                  </div>
                </div>

                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>耗时统计</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>模型加载时间</span>
                      <span className="text-sm font-semibold" style={{ color: metrics.modelLoadTime > 0 ? 'var(--primary-color)' : 'var(--text-tertiary)' }}>
                        {metrics.modelLoadTime > 0 ? `${metrics.modelLoadTime.toFixed(2)}s` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>推理耗时</span>
                      <span className="text-sm font-semibold" style={{ color: metrics.inferenceTime > 0 ? 'var(--primary-color)' : 'var(--text-tertiary)' }}>
                        {metrics.inferenceTime > 0 ? `${metrics.inferenceTime.toFixed(2)}s` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>首 Token 时间</span>
                      <span className="text-sm font-semibold" style={{ color: metrics.firstTokenTime > 0 ? 'var(--primary-color)' : 'var(--text-tertiary)' }}>
                        {metrics.firstTokenTime > 0 ? `${metrics.firstTokenTime.toFixed(2)}s` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>Token 统计</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>总 Token 数</span>
                      <span className="text-sm font-semibold" style={{ color: metrics.totalTokens > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {metrics.totalTokens > 0 ? metrics.totalTokens : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Prompt Tokens</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {metrics.promptTokens > 0 ? metrics.promptTokens : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Tokens</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {metrics.completionTokens > 0 ? metrics.completionTokens : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>资源使用</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>内存占用</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{metrics.memoryUsage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>GPU 使用率</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{metrics.gpuUsage}</span>
                    </div>
                  </div>
                </div>

                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                  <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>模型参数</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Temperature</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {metrics.temperature > 0 ? metrics.temperature : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Top P</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {metrics.topP > 0 ? metrics.topP : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
