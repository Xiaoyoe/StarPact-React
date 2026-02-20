import { useState, useMemo, useCallback, memo } from 'react';
import { X, Trash2, Download, Search, Info, AlertCircle, AlertTriangle, Bug, ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/store';
import type { LogEntry } from '@/store';

const levelConfig = {
  info: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'INFO', borderColor: 'rgba(59, 130, 246, 0.3)' },
  warn: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', label: 'WARN', borderColor: 'rgba(245, 158, 11, 0.3)' },
  error: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'ERROR', borderColor: 'rgba(239, 68, 68, 0.3)' },
  debug: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', label: 'DEBUG', borderColor: 'rgba(139, 92, 246, 0.3)' },
};

const levelIcons = { info: Info, warn: AlertTriangle, error: AlertCircle, debug: Bug };
const PAGE_SIZE = 50;

interface LogItemProps {
  log: LogEntry;
}

const LogItem = memo(function LogItem({ log }: LogItemProps) {
  const config = levelConfig[log.level];
  const Icon = levelIcons[log.level];
  const time = new Date(log.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
  const dateStr = `${time.getMonth() + 1}/${time.getDate()}`;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ backgroundColor: 'var(--bg-primary)', borderLeft: `3px solid ${config.borderColor}` }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: config.bg }}>
        <Icon size={16} style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md px-2 py-0.5 text-xs font-mono font-semibold" style={{ backgroundColor: config.bg, color: config.color }}>
            {config.label}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
            {log.module}
          </span>
          <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            {dateStr} {timeStr}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{log.message}</p>
      </div>
    </div>
  );
});

export function LogsPanel() {
  const { logsPanelOpen, logs, setLogsPanelOpen, clearLogs } = useStore();
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (levelFilter !== 'all') result = result.filter(l => l.level === levelFilter);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => l.message.toLowerCase().includes(query) || l.module.toLowerCase().includes(query));
    }
    return [...result].sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, levelFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const counts = useMemo(() => ({
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  }), [logs]);

  const handleExport = useCallback(() => {
    const data = filteredLogs.map(log => ({ time: new Date(log.timestamp).toISOString(), level: log.level, module: log.module, message: log.message }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const handleFilterChange = useCallback((level: string) => {
    setLevelFilter(level);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  if (!logsPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setLogsPanelOpen(false)}>
      <div
        className="w-[800px] max-w-[95vw] h-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--primary-light)' }}>
              <ScrollText size={20} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>系统日志</h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>共 {logs.length} 条，显示 {filteredLogs.length} 条</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearLogs} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--error-color)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <Trash2 size={14} /> 清空
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <Download size={14} /> 导出
            </button>
            <button onClick={() => setLogsPanelOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-xs" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="搜索..." value={searchQuery} onChange={handleSearchChange} className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--text-primary)' }} />
          </div>
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: '全部', color: 'var(--primary-color)' },
              { id: 'info', label: '信息', color: '#3B82F6' },
              { id: 'warn', label: '警告', color: '#F59E0B' },
              { id: 'error', label: '错误', color: '#EF4444' },
              { id: 'debug', label: '调试', color: '#8B5CF6' },
            ].map(level => (
              <button
                key={level.id}
                onClick={() => handleFilterChange(level.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: levelFilter === level.id ? level.color : 'var(--bg-secondary)',
                  color: levelFilter === level.id ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${levelFilter === level.id ? level.color : 'var(--border-color)'}`,
                }}
              >
                {level.label} ({counts[level.id as keyof typeof counts]})
              </button>
            ))}
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {paginatedLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Info size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-4" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{searchQuery ? '未找到匹配的日志' : '暂无日志记录'}</p>
              </div>
            </div>
          ) : (
            paginatedLogs.map(log => <LogItem key={log.id} log={log} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-2 border-t flex items-center justify-center gap-2 shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs px-3" style={{ color: 'var(--text-secondary)' }}>
              第 {currentPage} / {totalPages} 页
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
