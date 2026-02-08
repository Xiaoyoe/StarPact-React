import { useState } from 'react';
import { Trash2, Download, Filter, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react';
import { useStore } from '@/store';
import type { LogEntry } from '@/store';
import { motion } from 'framer-motion';

const levelConfig = {
  info: { icon: Info, color: 'var(--primary-color)', bg: 'var(--primary-light)', label: 'INFO' },
  warn: { icon: AlertTriangle, color: 'var(--warning-color)', bg: 'rgba(255,125,0,0.1)', label: 'WARN' },
  error: { icon: AlertCircle, color: 'var(--error-color)', bg: 'rgba(245,63,63,0.1)', label: 'ERROR' },
  debug: { icon: Bug, color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)', label: 'DEBUG' },
};

function LogItem({ log }: { log: LogEntry }) {
  const config = levelConfig[log.level];
  const Icon = config.icon;
  const time = new Date(log.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 border-b px-6 py-3 transition-colors"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: config.bg }}
      >
        <Icon size={13} style={{ color: config.color }} />
      </div>
      <div className="min-w-0 flex-1">
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
          <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {timeStr}
          </span>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
          {log.message}
        </p>
      </div>
    </motion.div>
  );
}

export function LogsPage() {
  const { logs, clearLogs } = useStore();
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredLogs = filterLevel === 'all'
    ? logs
    : logs.filter(l => l.level === filterLevel);

  const sortedLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-6"
        style={{ height: 56, borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            系统日志
          </h1>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
          >
            {sortedLogs.length} 条记录
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--error-color)', backgroundColor: 'rgba(245,63,63,0.08)' }}
          >
            <Trash2 size={14} /> 清空
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <Download size={14} /> 导出
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b px-6 py-2" style={{ borderColor: 'var(--border-color)' }}>
        <Filter size={14} className="mr-2 self-center" style={{ color: 'var(--text-tertiary)' }} />
        {[
          { id: 'all', label: '全部' },
          { id: 'info', label: '信息' },
          { id: 'warn', label: '警告' },
          { id: 'error', label: '错误' },
          { id: 'debug', label: '调试' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterLevel(f.id)}
            className="rounded-md px-3 py-1 text-sm transition-colors"
            style={{
              backgroundColor: filterLevel === f.id ? 'var(--primary-light)' : 'transparent',
              color: filterLevel === f.id ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: filterLevel === f.id ? 600 : 400,
            }}
          >
            {f.label} ({counts[f.id as keyof typeof counts]})
          </button>
        ))}
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto">
        {sortedLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Info size={48} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>暂无日志记录</p>
            </div>
          </div>
        ) : (
          sortedLogs.map(log => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
