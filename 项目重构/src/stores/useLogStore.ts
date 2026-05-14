import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  details?: string;
  data?: Record<string, unknown>;
}

const MAX_LOGS = 1000;

export const useLogStore = defineStore('log', () => {
  const logs = ref<LogEntry[]>([]);
  const filterLevel = ref<LogLevel | 'all'>('all');
  const filterCategory = ref<string>('');
  const searchQuery = ref('');

  const categories = computed(() => {
    const cats = new Set(logs.value.map(l => l.category));
    return Array.from(cats).sort();
  });

  const filteredLogs = computed(() => {
    let result = logs.value;
    
    if (filterLevel.value !== 'all') {
      result = result.filter(l => l.level === filterLevel.value);
    }
    
    if (filterCategory.value) {
      result = result.filter(l => l.category === filterCategory.value);
    }
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(l => 
        l.message.toLowerCase().includes(query) ||
        l.category.toLowerCase().includes(query) ||
        (l.details && l.details.toLowerCase().includes(query))
      );
    }
    
    return result;
  });

  const logCounts = computed(() => ({
    total: logs.value.length,
    info: logs.value.filter(l => l.level === 'info').length,
    success: logs.value.filter(l => l.level === 'success').length,
    warning: logs.value.filter(l => l.level === 'warning').length,
    error: logs.value.filter(l => l.level === 'error').length,
    debug: logs.value.filter(l => l.level === 'debug').length,
  }));

  const generateId = () => `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addLog = (
    level: LogLevel,
    category: string,
    message: string,
    details?: string,
    data?: Record<string, unknown>
  ) => {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      data,
    };
    
    logs.value.unshift(entry);
    
    if (logs.value.length > MAX_LOGS) {
      logs.value = logs.value.slice(0, MAX_LOGS);
    }
    
    saveToStorage();
  };

  const info = (category: string, message: string, details?: string, data?: Record<string, unknown>) => {
    addLog('info', category, message, details, data);
  };

  const success = (category: string, message: string, details?: string, data?: Record<string, unknown>) => {
    addLog('success', category, message, details, data);
  };

  const warning = (category: string, message: string, details?: string, data?: Record<string, unknown>) => {
    addLog('warning', category, message, details, data);
  };

  const error = (category: string, message: string, details?: string, data?: Record<string, unknown>) => {
    addLog('error', category, message, details, data);
  };

  const debug = (category: string, message: string, details?: string, data?: Record<string, unknown>) => {
    addLog('debug', category, message, details, data);
  };

  const clearLogs = () => {
    logs.value = [];
    saveToStorage();
  };

  const clearByLevel = (level: LogLevel) => {
    logs.value = logs.value.filter(l => l.level !== level);
    saveToStorage();
  };

  const clearByCategory = (category: string) => {
    logs.value = logs.value.filter(l => l.category !== category);
    saveToStorage();
  };

  const exportLogs = () => {
    const exportData = logs.value.map(l => ({
      time: new Date(l.timestamp).toISOString(),
      level: l.level,
      category: l.category,
      message: l.message,
      details: l.details || '',
    }));
    
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveToStorage = () => {
    try {
      const data = logs.value.slice(0, 500);
      localStorage.setItem('system_logs', JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('system_logs');
      if (saved) {
        logs.value = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  };

  loadFromStorage();

  return {
    logs,
    filterLevel,
    filterCategory,
    searchQuery,
    categories,
    filteredLogs,
    logCounts,
    addLog,
    info,
    success,
    warning,
    error,
    debug,
    clearLogs,
    clearByLevel,
    clearByCategory,
    exportLogs,
  };
});
