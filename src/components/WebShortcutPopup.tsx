import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  X,
  Star,
  Pencil,
  CheckSquare,
  Square,
  ExternalLink,
  Globe,
  Save,
  XCircle,
  Trash,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useWebShortcutStore, type WebShortcut } from '@/store/webShortcutStore';
import { cn } from '@/utils/cn';

interface WebShortcutPopupProps {
  onClose: () => void;
}

type RightPanelMode = 'idle' | 'add' | 'edit' | 'delete';

interface FormData {
  title: string;
  url: string;
  description: string;
  icon: string;
  isFavorite: boolean;
}

const emptyForm: FormData = {
  title: '',
  url: '',
  description: '',
  icon: '🌐',
  isFavorite: false,
};

const iconOptions = ['🌐', '⚡', '🎨', '📚', '💎', '🐙', '📦', '✏️', '🦊', '⚛️', '🔥', '🚀', '🎯', '💡', '🔧', '📱'];

export function WebShortcutPopup({ onClose }: WebShortcutPopupProps) {
  const { shortcuts, addShortcut, updateShortcut, deleteShortcut, deleteShortcuts, toggleFavorite, loadShortcuts } = useWebShortcutStore();

  // Load shortcuts when popup opens
  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [sortMode, setSortMode] = useState<'normal' | 'reverse' | 'random'>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Handle random sort
  const handleRandomSort = () => {
    setSortMode('random');
  };

  // Toggle between normal and reverse sort
  const handleToggleSortOrder = () => {
    if (sortMode === 'normal') {
      setSortMode('reverse');
    } else {
      setSortMode('normal');
    }
  };

  // Get sorted shortcuts based on current sort mode
  const getSortedShortcuts = () => {
    if (sortMode === 'random') {
      return [...shortcuts].sort(() => Math.random() - 0.5);
    } else if (sortMode === 'reverse') {
      return [...shortcuts].sort((a, b) => a.updatedAt - b.updatedAt);
    } else {
      return [...shortcuts].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  };

  // Export shortcuts as JSON
  const handleExportJSON = () => {
    const shortcutsData = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([shortcutsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-shortcuts-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Trigger file input for JSON import
  const handleImportJSON = () => {
    fileInputRef.current?.click();
  };

  // Handle JSON file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        if (Array.isArray(jsonData)) {
          // Import each shortcut
          jsonData.forEach((item: any) => {
            if (item.title && item.url) {
              addShortcut({
                title: item.title,
                url: item.url,
                description: item.description || '',
                icon: item.icon || '🌐',
                isFavorite: item.isFavorite || false,
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse JSON file:', error);
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Add mode
  const handleStartAdd = () => {
    setRightPanelMode('add');
    setEditingId(null);
    setFormData(emptyForm);
    setShowIconPicker(false);
  };

  // Edit mode
  const handleStartEdit = (shortcut: WebShortcut) => {
    setRightPanelMode('edit');
    setEditingId(shortcut.id);
    setFormData({
      title: shortcut.title,
      url: shortcut.url,
      description: shortcut.description,
      icon: shortcut.icon || '🌐',
      isFavorite: shortcut.isFavorite,
    });
    setShowIconPicker(false);
  };

  // Delete mode
  const handleStartDelete = () => {
    setRightPanelMode('delete');
    setSelectedIds([]);
    setEditingId(null);
  };

  const handleSaveAdd = () => {
    if (!formData.title.trim() || !formData.url.trim()) return;
    
    // 添加 URL 前缀验证和补全
    let url = formData.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    addShortcut({
      title: formData.title.trim(),
      url: url,
      description: formData.description.trim(),
      icon: formData.icon,
      isFavorite: formData.isFavorite,
    });
    setRightPanelMode('idle');
    setFormData(emptyForm);
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.title.trim() || !formData.url.trim()) return;
    
    // 添加 URL 前缀验证和补全
    let url = formData.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    updateShortcut(editingId, {
      title: formData.title.trim(),
      url: url,
      description: formData.description.trim(),
      icon: formData.icon,
      isFavorite: formData.isFavorite,
    });
    setRightPanelMode('idle');
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleDeleteSingle = () => {
    if (!editingId) return;
    deleteShortcut(editingId);
    setRightPanelMode('idle');
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    deleteShortcuts(selectedIds);
    setSelectedIds([]);
    setRightPanelMode('idle');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === shortcuts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shortcuts.map((s) => s.id));
    }
  };

  const handleCardClick = (shortcut: WebShortcut) => {
    if (rightPanelMode === 'delete') {
      toggleSelect(shortcut.id);
      return;
    }
    
    // 使用 Electron 的 shell 模块打开外部网页
    if (window.require) {
      try {
        const { shell } = window.require('electron');
        shell.openExternal(shortcut.url);
      } catch (error) {
        console.error('Failed to open external website:', error);
        // fallback: 使用浏览器打开
        window.open(shortcut.url, '_blank');
      }
    } else {
      // fallback: 使用浏览器打开
      window.open(shortcut.url, '_blank');
    }
  };

  const handleCancel = () => {
    setRightPanelMode('idle');
    setEditingId(null);
    setFormData(emptyForm);
    setSelectedIds([]);
    setShowIconPicker(false);
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 transition-all duration-300',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--bg-overlay, rgba(0, 0, 0, 0.6))' }}
        onClick={handleClose}
      />

      {/* Popup Container */}
      <div
        className={cn(
          'relative w-full max-w-6xl h-[85vh] flex rounded-3xl overflow-hidden transition-all duration-500',
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        )}
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-primary)'
            }
          }}
        >
          <X size={16} />
        </button>

        {/* Left Panel - Card Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Globe size={18} style={{ color: 'var(--text-primary)' }} />
                </div>
                快捷打开网页
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRandomSort}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)'
                    }
                  }}
                  title="随机排序"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h3v3"/><path d="M3 16h3v3"/><path d="M3 8h4"/><path d="M12 3v4"/><path d="M12 13v8"/><path d="M19 12h-8"/><path d="M21 8v5"/><path d="M8 16H3"/></svg>
                </button>
                <button
                  onClick={handleToggleSortOrder}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)'
                    }
                  }}
                  title={sortMode === 'normal' ? "切换到倒序" : "切换到正序"}
                >
                  {sortMode === 'normal' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 15 4-4 4 4"/><path d="m3 9 4 4 4-4"/><path d="M17 5v14"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 9-4 4-4-4"/><path d="m21 15-4-4-4 4"/><path d="M7 5v14"/></svg>
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm mt-1 ml-12" style={{ color: 'var(--text-secondary)' }}>
              共 {shortcuts.length} 个快捷方式 · {shortcuts.filter((s) => s.isFavorite).length} 个星标
            </p>
          </div>

          {shortcuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-tertiary)' }}>
              <Globe size={48} className="mb-4" />
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>暂无快捷网页</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>点击右侧"添加新网页"开始创建</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {getSortedShortcuts().map((shortcut, index) => (
                <WebShortcutCard
                  key={shortcut.id}
                  shortcut={shortcut}
                  index={index}
                  isDeleteMode={rightPanelMode === 'delete'}
                  isSelected={selectedIds.includes(shortcut.id)}
                  isEditing={editingId === shortcut.id}
                  onClick={() => handleCardClick(shortcut)}
                  onToggleFavorite={() => toggleFavorite(shortcut.id)}
                  onEdit={() => handleStartEdit(shortcut)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Toolbar */}
        <div 
          className="w-72 border-l flex flex-col overflow-y-auto custom-scrollbar"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          {/* Toolbar Header */}
          <div 
            className="p-5 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h3 
              className="font-semibold text-base"
              style={{ color: 'var(--text-primary)' }}
            >
              工具栏
            </h3>
          </div>

          {rightPanelMode === 'idle' && (
            <div className="p-5 space-y-3 flex-1">
              <button
                onClick={handleStartAdd}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 transition-all duration-200 group cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/40 transition-colors">
                  <Plus size={16} style={{ color: 'var(--text-primary)' }} />
                </div>
                <span className="font-medium text-sm">添加新网页</span>
              </button>

              <button
                onClick={handleStartDelete}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 group cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                  '&:hover': {
                    backgroundColor: 'var(--error-color-light)',
                    borderColor: 'var(--error-color)',
                    color: 'var(--error-color)'
                  }
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    '&:hover': {
                      backgroundColor: 'var(--error-color-light)'
                    }
                  }}
                >
                  <Trash2 size={16} />
                </div>
                <span className="font-medium text-sm">批量删除</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 group cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-color-light)',
                    borderColor: 'var(--primary-color)',
                    color: 'var(--primary-color)'
                  }
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    '&:hover': {
                      backgroundColor: 'var(--primary-color-light)'
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <span className="font-medium text-sm">导出 JSON</span>
              </button>

              <button
                onClick={handleImportJSON}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 group cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                  '&:hover': {
                    backgroundColor: 'var(--success-color-light)',
                    borderColor: 'var(--success-color)',
                    color: 'var(--success-color)'
                  }
                }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    '&:hover': {
                      backgroundColor: 'var(--success-color-light)'
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <span className="font-medium text-sm">导入 JSON</span>
              </button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Stats - always at bottom of toolbar */}
          {rightPanelMode === 'idle' && (
            <div 
              className="mt-auto pt-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="px-5 pb-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-tertiary)' }}>总快捷方式</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{shortcuts.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-tertiary)' }}>已星标</span>
                  <span style={{ color: 'var(--warning-color)', fontWeight: 500 }}>{shortcuts.filter((s) => s.isFavorite).length}</span>
                </div>
              </div>
            </div>
          )}

          {(rightPanelMode === 'add' || rightPanelMode === 'edit') && (
            <div className="p-5 flex-1 flex flex-col">
              <h4 className="font-medium text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                {rightPanelMode === 'add' ? (
                  <>
                    <Plus size={14} style={{ color: 'var(--primary-color)' }} />
                    添加新网页
                  </>
                ) : (
                  <>
                    <Pencil size={14} style={{ color: 'var(--primary-color)' }} />
                    编辑网页
                  </>
                )}
              </h4>

              <div className="space-y-4 flex-1">
                {/* Icon picker */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>图标</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        '&:hover': {
                          backgroundColor: 'var(--bg-hover)',
                        }
                      }}
                    >
                      <span className="text-xl">{formData.icon}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>点击选择图标</span>
                    </button>
                    {showIconPicker && (
                      <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-lg border grid grid-cols-8 gap-1 z-10"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        {iconOptions.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => {
                              setFormData({ ...formData, icon });
                              setShowIconPicker(false);
                            }}
                            className={cn(
                              'w-8 h-8 flex items-center justify-center rounded-md transition-colors text-lg cursor-pointer',
                              formData.icon === icon && 'ring-1 ring-purple-400'
                            )}
                            style={{
                              color: 'var(--text-primary)',
                              backgroundColor: formData.icon === icon ? 'var(--primary-color-light)' : 'transparent',
                              '&:hover': {
                                backgroundColor: 'var(--bg-hover)',
                              }
                            }}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入网页标题"
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      placeholderColor: 'var(--text-tertiary)',
                      '&:focus': {
                        borderColor: 'var(--primary-color)',
                        boxShadow: '0 0 0 1px var(--primary-color)'
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>URL *</label>
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      placeholderColor: 'var(--text-tertiary)',
                      '&:focus': {
                        borderColor: 'var(--primary-color)',
                        boxShadow: '0 0 0 1px var(--primary-color)'
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入网页描述"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 transition-all resize-none"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      placeholderColor: 'var(--text-tertiary)',
                      '&:focus': {
                        borderColor: 'var(--primary-color)',
                        boxShadow: '0 0 0 1px var(--primary-color)'
                      }
                    }}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer',
                      formData.isFavorite
                        ? 'bg-yellow-500/30 border border-yellow-500/50'
                        : 'bg-tertiary border border-border-color'
                    )}
                    style={{
                      backgroundColor: formData.isFavorite ? 'var(--warning-color-light)' : 'var(--bg-tertiary)',
                      borderColor: formData.isFavorite ? 'var(--warning-color)' : 'var(--border-color)',
                    }}
                  >
                    {formData.isFavorite && <Star size={12} style={{ color: 'var(--warning-color)', fill: 'var(--warning-color)' }} />}
                  </div>
                  <span className="text-sm transition-colors group-hover:text-text-primary"
                    style={{
                      color: 'var(--text-secondary)',
                      '&:hover': {
                        color: 'var(--text-primary)',
                      }
                    }}
                  >
                    标记为收藏
                  </span>
                </label>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={rightPanelMode === 'add' ? handleSaveAdd : handleSaveEdit}
                  disabled={!formData.title.trim() || !formData.url.trim()}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                    formData.title.trim() && formData.url.trim()
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/20'
                      : 'cursor-not-allowed'
                  )}
                  style={{
                    color: formData.title.trim() && formData.url.trim() ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    backgroundColor: formData.title.trim() && formData.url.trim() ? 'transparent' : 'var(--bg-tertiary)',
                  }}
                >
                  <Save size={14} />
                  保存
                </button>

                {rightPanelMode === 'edit' && (
                  <button
                    onClick={handleDeleteSingle}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--error-color-light)',
                      borderColor: 'var(--error-color)',
                      color: 'var(--error-color)',
                      '&:hover': {
                        backgroundColor: 'var(--error-color)',
                        color: 'var(--text-primary)'
                      }
                    }}
                  >
                    <Trash size={14} />
                    删除此网页
                  </button>
                )}

                <button
                  onClick={handleCancel}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)'
                    }
                  }}
                >
                  <XCircle size={14} />
                  取消
                </button>
              </div>
            </div>
          )}

          {rightPanelMode === 'delete' && (
            <div className="p-5 flex-1 flex flex-col">
              <h4 className="font-medium text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--error-color)' }}>
                <Trash2 size={14} style={{ color: 'var(--error-color)' }} />
                批量删除模式
              </h4>

              <div className="flex-1 space-y-4">
                <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--error-color-light)', borderColor: 'var(--error-color)' }}>
                  <p className="text-sm" style={{ color: 'var(--error-color)' }}>
                    已选择 <span className="font-bold">{selectedIds.length}</span> 个网页
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--error-color-light)' }}>点击卡片选择要删除的网页</p>
                </div>

                <button
                  onClick={toggleSelectAll}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)'
                    }
                  }}
                >
                  {selectedIds.length === shortcuts.length ? (
                    <>
                      <CheckSquare size={14} style={{ color: 'var(--error-color)' }} />
                      取消全选
                    </>
                  ) : (
                    <>
                      <Square size={14} style={{ color: 'var(--text-secondary)' }} />
                      全选 ({shortcuts.length})
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedIds.length === 0}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                    selectedIds.length > 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/20'
                      : 'cursor-not-allowed'
                  )}
                  style={{
                    color: selectedIds.length > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    backgroundColor: selectedIds.length > 0 ? 'transparent' : 'var(--bg-tertiary)',
                  }}
                >
                  <Trash size={14} />
                  批量删除选中网页
                </button>

                <button
                  onClick={handleCancel}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                      color: 'var(--text-primary)'
                    }
                  }}
                >
                  <LogOut size={14} />
                  退出删除模式
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ WebShortcutCard Component ============

interface WebShortcutCardProps {
  shortcut: WebShortcut;
  index: number;
  isDeleteMode: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
}

function WebShortcutCard({
  shortcut,
  index,
  isDeleteMode,
  isSelected,
  isEditing,
  onClick,
  onToggleFavorite,
  onEdit,
}: WebShortcutCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div
      className={cn(
        'relative aspect-square rounded-2xl p-4 flex flex-col cursor-pointer transition-all duration-300 group border',
        isDeleteMode && isSelected
          ? 'shadow-lg shadow-red-500/10 scale-[0.97]'
          : isEditing
          ? 'shadow-lg shadow-blue-500/10'
          : 'hover:shadow-xl hover:shadow-black/10 hover:scale-[1.03]'
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: 1,
        backgroundColor: isDeleteMode && isSelected
          ? 'var(--error-color-light)'
          : isEditing
          ? 'var(--primary-color-light)'
          : 'var(--bg-tertiary)',
        borderColor: isDeleteMode && isSelected
          ? 'var(--error-color)'
          : isEditing
          ? 'var(--primary-color)'
          : 'var(--border-color)',
        '&:hover': {
          backgroundColor: 'var(--bg-hover)',
          borderColor: 'var(--border-color-hover)',
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Top Row - Actions */}
        <div className="flex items-center justify-between mb-auto">
          {/* Edit button (top left) */}
          {!isDeleteMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer',
                isHovered || isEditing
                  ? 'transition-all'
                  : 'text-transparent'
              )}
              style={{
                backgroundColor: isHovered || isEditing ? 'var(--bg-hover)' : 'transparent',
                color: isHovered || isEditing ? 'var(--text-primary)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-primary)'
                }
              }}
            >
              <Pencil size={12} />
            </button>
          )}

          {/* Delete checkbox (top left in delete mode) */}
          {isDeleteMode && (
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200'
              )}
              style={{
                backgroundColor: isSelected ? 'var(--error-color-light)' : 'var(--bg-tertiary)',
                color: isSelected ? 'var(--error-color)' : 'var(--text-secondary)',
              }}
            >
              {isSelected ? <CheckCircle2 size={16} /> : <Square size={14} />}
            </div>
          )}

          {/* Star button (top right) */}
          {!isDeleteMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer'
              )}
              style={{
                backgroundColor: shortcut.isFavorite || isHovered ? 'var(--warning-color-light)' : 'transparent',
                color: shortcut.isFavorite ? 'var(--warning-color)' : isHovered ? 'var(--text-secondary)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'var(--warning-color-light)',
                  color: 'var(--warning-color)'
                }
              }}
            >
              <Star
                size={14}
                style={{
                  color: shortcut.isFavorite ? 'var(--warning-color)' : 'inherit',
                  fill: shortcut.isFavorite ? 'var(--warning-color)' : 'none'
                }}
              />
            </button>
          )}
        </div>

      {/* Icon */}
      <div className="flex items-center justify-center flex-1">
        <div className="text-4xl transition-transform duration-300 group-hover:scale-110">
          {shortcut.icon || '🌐'}
        </div>
      </div>

      {/* Bottom Info */}
      <div className="mt-auto space-y-1">
        <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{shortcut.title}</h3>
        <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <ExternalLink size={10} style={{ color: 'var(--text-secondary)' }} />
          {getDomain(shortcut.url)}
        </p>
        {shortcut.description && (
          <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {shortcut.description}
          </p>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none',
          isDeleteMode && isSelected
            ? 'bg-gradient-to-t from-red-500/10 to-transparent opacity-100'
            : 'bg-gradient-to-t from-purple-500/5 to-transparent',
          !isDeleteMode && isHovered ? 'opacity-100' : isDeleteMode && isSelected ? '' : 'opacity-0'
        )}
      />
    </div>
  );
}
