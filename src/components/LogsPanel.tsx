import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Download, Filter, Info, AlertCircle, AlertTriangle, Bug } from 'lucide-react';
import { useStore } from '@/store';
import type { LogEntry } from '@/store';

const levelConfig = {
  info: { icon: Info, color: 'var(--primary-color)', bg: 'var(--primary-light)', label: 'INFO' },
  warn: { icon: AlertTriangle, color: 'var(--warning-color)', bg: 'rgba(255,125,0,0.1)', label: 'WARN' },
  error: { icon: AlertCircle, color: 'var(--error-color)', bg: 'rgba(245,63,63,0.1)', label: 'ERROR' },
  debug: { icon: Bug, color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)', label: 'DEBUG' },
};

export function LogsPanel() {
  const { logsPanelOpen, logs, setLogsPanelOpen, clearLogs } = useStore();
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const filteredLogs = levelFilter === 'all'
    ? logs
    : logs.filter(l => l.level === levelFilter);

  const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  if (!logsPanelOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={() => setLogsPanelOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 0, y: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-[700px] max-w-[95vw] h-[500px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
          onClick={e => e.stopPropagation()}
          drag
          dragMomentum={false}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                系统日志
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {sortedLogs.length} 条日志记录
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearLogs}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors rounded-lg"
                style={{ color: 'var(--error-color)', backgroundColor: 'rgba(245,63,63,0.08)' }}
              >
                <Trash2 size={13} /> 清空
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors rounded-lg"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                <Download size={13} /> 导出
              </button>
              <button
                onClick={() => setLogsPanelOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'var(--bg-secondary)' } }}
              >
                <X size={14} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
          </div>

          {/* 过滤栏 */}
          <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--border-color)' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            {[
              { id: 'all', label: '全部' },
              { id: 'info', label: '信息' },
              { id: 'warn', label: '警告' },
              { id: 'error', label: '错误' },
              { id: 'debug', label: '调试' },
            ].map(level => (
              <button
                key={level.id}
                onClick={() => setLevelFilter(level.id)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  backgroundColor: levelFilter === level.id ? 'var(--primary-light)' : 'transparent',
                  color: levelFilter === level.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                  fontWeight: levelFilter === level.id ? 600 : 400,
                }}
              >
                {level.label} ({counts[level.id as keyof typeof counts]})
              </button>
            ))}
          </div>

          {/* 日志列表 */}
          <div className="flex-1 overflow-y-auto">
            {sortedLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Info size={48} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-4 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    暂无日志记录
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {sortedLogs.map(log => {
                  const config = levelConfig[log.level];
                  const Icon = config.icon;
                  const time = new Date(log.timestamp);
                  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-5 py-2.5 hover:bg-opacity-5 transition-colors"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: config.bg }}
                      >
                        <Icon size={13} style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-xs font-mono font-medium"
                            style={{ backgroundColor: config.bg, color: config.color }}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                            [{log.module}]
                          </span>
                          <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                            {timeStr}
                          </span>
                        </div>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}