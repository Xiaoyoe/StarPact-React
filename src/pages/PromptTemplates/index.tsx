import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Search, Copy, Edit3, Trash2, ChevronDown, ChevronUp,
  X, Check, FileText, Image, Eye, Link2, FolderOpen,
  Tag, Filter, Clock, Layers, BookOpen, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { PromptTemplateStorage, Template, TemplateResult } from '@/services/storage/PromptTemplateStorage';

// ==================== 类型定义 ====================
// 从 PromptTemplateStorage 导入类型定义

// ==================== 常量 ====================
const CATEGORIES = ['通用', 'AI绘画', '文案创作', '代码生成', '数据分析', '翻译润色', '角色扮演', '学术研究'];

// ==================== 工具函数 ====================
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getNowString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ==================== Toast 通知组件 ====================
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={cn(
      'fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-2xl transition-all duration-300',
      visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
    )} style={{ backgroundColor: 'var(--success-color)' }}>
      <Check className="h-4 w-4" />
      {message}
    </div>
  );
}

// ==================== 确认对话框组件 ====================
function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-100 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>取消</button>
          <button onClick={onConfirm} className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm" style={{ backgroundColor: 'var(--error-color)' }}>确认删除</button>
        </div>
      </div>
    </div>
  );
}

// ==================== 标签输入组件 ====================
function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags();
    }
  };

  const addTags = () => {
    const newTags = input.split(/[,，]/).map(t => t.trim()).filter(t => t && !tags.includes(t));
    if (newTags.length > 0) {
      onChange([...tags, ...newTags]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTags}
        placeholder={tags.length === 0 ? "输入标签，用逗号分隔..." : "继续添加..."}
        className="min-w-[120px] flex-1 border-none bg-transparent text-sm outline-none"
        style={{ color: 'var(--text-primary)', placeholderColor: 'var(--text-tertiary)' }}
      />
    </div>
  );
}

// ==================== 图片预览模态框 ====================
function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg hover:bg-slate-100 transition-colors">
          <X className="h-4 w-4 text-slate-600" />
        </button>
        <img src={src} alt="预览" className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl" />
      </div>
    </div>
  );
}

// ==================== 结果管理模态框组件 ====================
function ResultManagerModal({ template, onClose, onUpdateResults, showToast }: {
  template: Template;
  onClose: () => void;
  onUpdateResults: (templateId: string, results: TemplateResult[]) => void;
  showToast: (msg: string) => void;
}) {
  const [results, setResults] = useState<TemplateResult[]>([...template.results]);
  const [editing, setEditing] = useState<TemplateResult | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const emptyResult = (): TemplateResult => ({
    id: uuidv4(),
    type: 'text',
    versionNote: '',
    createdAt: getNowString(),
    content: ''
  });

  const [formData, setFormData] = useState<TemplateResult>(emptyResult());

  const startAdd = () => {
    setFormData(emptyResult());
    setIsAdding(true);
    setEditing(null);
  };

  const startEdit = (result: TemplateResult) => {
    setFormData({ ...result });
    setEditing(result);
    setIsAdding(false);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditing(null);
    setFormData(emptyResult());
  };

  const saveResult = () => {
    if (!formData.content.trim()) {
      showToast('请填写结果内容');
      return;
    }
    let newResults: TemplateResult[];
    if (editing) {
      newResults = results.map(r => r.id === editing.id ? formData : r);
    } else {
      newResults = [formData, ...results];
    }
    setResults(newResults);
    onUpdateResults(template.id, newResults);
    cancelForm();
    showToast(editing ? '结果已更新' : '结果已添加');
  };

  const deleteResult = (id: string) => {
    const newResults = results.filter(r => r.id !== id);
    setResults(newResults);
    onUpdateResults(template.id, newResults);
    setConfirmDelete(null);
    showToast('结果已删除');
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [results]);

  const showForm = isAdding || editing;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-8 no-select" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl shadow-2xl mx-4 no-select" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>结果管理</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{template.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* 添加按钮 */}
          {!showForm && (
            <button onClick={startAdd} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition-all" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
              <Plus className="h-4 w-4" />
              添加新结果
            </button>
          )}

          {/* 表单 */}
          {showForm && (
            <div className="mb-4 rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--primary-color)' }}>{editing ? '编辑结果' : '添加新结果'}</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>结果类型</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as 'text' | 'image' })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="text">文本</option>
                    <option value="image">图片</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>版本备注</label>
                  <input
                    value={formData.versionNote}
                    onChange={e => setFormData({ ...formData, versionNote: e.target.value })}
                    placeholder="选填"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', placeholderColor: 'var(--text-tertiary)' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>生成日期</label>
                  <input
                    type="datetime-local"
                    value={formData.createdAt}
                    onChange={e => setFormData({ ...formData, createdAt: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {formData.type === 'image' ? '图片链接/URL' : '文本内容'}
                </label>
                {formData.type === 'text' ? (
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    placeholder="输入生成结果的文本内容..."
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', placeholderColor: 'var(--text-tertiary)' }}
                  />
                ) : (
                  <input
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="粘贴图片URL链接..."
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', placeholderColor: 'var(--text-tertiary)' }}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={cancelForm} className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-slate-100 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>取消</button>
                <button onClick={saveResult} className="rounded-lg px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>保存</button>
              </div>
            </div>
          )}

          {/* 结果列表 */}
          {sortedResults.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>暂无结果，点击上方按钮添加</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResults.map(result => (
                <div key={result.id} className="group rounded-xl border p-4 hover:shadow-md transition-all" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                        {result.type === 'text' ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                        {result.type === 'text' ? '文本' : '图片'}
                      </span>
                      {result.versionNote && (
                        <span className="rounded-lg px-2 py-0.5 text-xs border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>{result.versionNote}</span>
                      )}
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <Clock className="h-3 w-3" />
                        {formatDate(result.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {result.type === 'text' && (
                        <button onClick={() => copyText(result.content)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-violet-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="复制内容">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {result.type === 'image' && (
                        <>
                          <button onClick={() => setPreviewImage(result.content)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-violet-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="查看原图">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => copyText(result.content)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-violet-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="复制图片链接">
                            <Link2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => startEdit(result)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-blue-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="编辑">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(result.id)} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-red-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="删除">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {result.type === 'text' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{result.content}</p>
                  ) : (
                    <div className="mt-1">
                      <img
                        src={result.content}
                        alt="结果图片"
                        className="h-32 w-auto rounded-lg object-cover cursor-pointer border hover:shadow-md transition-shadow"
                        style={{ borderColor: 'var(--border-color)' }}
                        onClick={() => setPreviewImage(result.content)}
                        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRhM2I4IiBmb250LXNpemU9IjEyIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+'; }}
                      />
                      <p className="mt-1.5 text-xs truncate max-w-xs" style={{ color: 'var(--text-tertiary)' }}>{result.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
      <ConfirmDialog
        open={!!confirmDelete}
        title="删除结果"
        message="确定要删除这个结果吗？此操作不可撤销。"
        onConfirm={() => confirmDelete && deleteResult(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ==================== 模板编辑模态框 ====================
function TemplateFormModal({ template, onSave, onClose }: {
  template: Template | null;
  onSave: (template: Template) => void;
  onClose: () => void;
}) {
  const isEdit = !!template;
  const [formData, setFormData] = useState<Omit<Template, 'id' | 'results' | 'createdAt'>>({
    title: template?.title ?? '',
    category: template?.category ?? CATEGORIES[0],
    tags: template?.tags ?? [],
    versionNote: template?.versionNote ?? '',
    content: template?.content ?? ''
  });
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const validate = (): boolean => {
    const newErrors: { title?: string; content?: string } = {};
    if (!formData.title.trim()) newErrors.title = '标题为必填项';
    if (!formData.content.trim()) newErrors.content = '提示词内容为必填项';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: template?.id ?? uuidv4(),
      ...formData,
      results: template?.results ?? [],
      createdAt: template?.createdAt ?? new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-sm py-8 no-select" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl mx-4 no-select" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-t border-b px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
              {isEdit ? <Edit3 className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{isEdit ? '编辑模板' : '新增模板'}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* 标题 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              标题 <span style={{ color: 'var(--error-color)' }}>*</span>
            </label>
            <input
              ref={titleRef}
              value={formData.title}
              onChange={e => { setFormData({ ...formData, title: e.target.value }); setErrors({ ...errors, title: undefined }); }}
              placeholder="输入模板标题..."
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all copy-allowed",
                errors.title ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100" : "border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              )}
              style={{ 
                borderColor: errors.title ? 'var(--error-color)' : 'var(--border-color)', 
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                placeholderColor: 'var(--text-tertiary)',
                userSelect: 'text'
              }}
            />
            {errors.title && <p className="mt-1 text-xs" style={{ color: 'var(--error-color)' }}>{errors.title}</p>}
          </div>

          {/* 分类 + 版本备注 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>分类</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                style={{ 
                  borderColor: 'var(--border-color)', 
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>版本备注</label>
              <input
                  value={formData.versionNote}
                  onChange={e => setFormData({ ...formData, versionNote: e.target.value })}
                  placeholder="选填，如 v1.0"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all copy-allowed"
                  style={{ 
                    borderColor: 'var(--border-color)', 
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    placeholderColor: 'var(--text-tertiary)',
                    userSelect: 'text'
                  }}
                />
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>标签</label>
            <TagInput tags={formData.tags} onChange={tags => setFormData({ ...formData, tags })} />
          </div>

          {/* 内容 */}
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              提示词内容 <span style={{ color: 'var(--error-color)' }}>*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={e => { setFormData({ ...formData, content: e.target.value }); setErrors({ ...errors, content: undefined }); }}
              rows={8}
              placeholder="输入提示词内容..."
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all resize-none leading-relaxed copy-allowed",
                errors.content ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100" : "border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              )}
              style={{ 
                borderColor: errors.content ? 'var(--error-color)' : 'var(--border-color)', 
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                placeholderColor: 'var(--text-tertiary)',
                userSelect: 'text'
              }}
            />
            {errors.content && <p className="mt-1 text-xs" style={{ color: 'var(--error-color)' }}>{errors.content}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onClose} className="rounded-xl border px-5 py-2 text-sm font-medium hover:bg-slate-100 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>取消</button>
          <button onClick={handleSave} className="rounded-xl px-5 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
            {isEdit ? '更新模板' : '创建模板'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 模板卡片组件 ====================
function TemplateCard({ template, onEdit, onDelete, onManageResults, showToast }: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onManageResults: () => void;
  showToast: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentShort = template.content.length > 120;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(template.content);
      showToast('提示词已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  const categoryColorMap: Record<string, string> = {
    '通用': 'from-slate-400 to-slate-500',
    'AI绘画': 'from-pink-400 to-rose-500',
    '文案创作': 'from-amber-400 to-orange-500',
    '代码生成': 'from-emerald-400 to-teal-500',
    '数据分析': 'from-blue-400 to-indigo-500',
    '翻译润色': 'from-cyan-400 to-sky-500',
    '角色扮演': 'from-purple-400 to-violet-500',
    '学术研究': 'from-lime-500 to-green-500',
  };

  const gradClass = categoryColorMap[template.category] || 'from-slate-400 to-slate-500';

  const handleCardClick = (e: React.MouseEvent) => {
    // 阻止事件冒泡，确保点击按钮时不会触发卡片点击
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setExpanded(!expanded);
  };

  return (
    <div 
      className="group relative rounded-2xl border p-5 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer no-select"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'transparent' }}
      onClick={handleCardClick}
    >
      {/* 顶部色条 */}
      <div className={cn("absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity", gradClass)} />
      
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{template.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-lg bg-gradient-to-r px-2.5 py-0.5 text-xs font-medium text-white", gradClass)}>
              <BookOpen className="h-3 w-3" />
              {template.category}
            </span>
            {template.versionNote && (
              <span className="rounded-lg px-2 py-0.5 text-xs border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>{template.versionNote}</span>
            )}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {template.results.length} 个结果
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyContent} className="rounded-lg p-2 hover:bg-violet-50 hover:text-violet-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="一键复制">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onEdit} className="rounded-lg p-2 hover:bg-blue-50 hover:text-blue-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="编辑">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-2 hover:bg-red-50 hover:text-red-500 transition-colors" style={{ color: 'var(--text-tertiary)' }} title="删除">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 标签 */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs border" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-light)' }}>
              <Tag className="h-2.5 w-2.5" style={{ color: 'var(--text-tertiary)' }} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 内容 */}
      <div className="relative rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-light)' }}>
        <pre className={cn(
          "whitespace-pre-wrap text-sm leading-relaxed font-sans",
          !expanded && contentShort && "line-clamp-3"
        )} style={{ color: 'var(--text-secondary)' }}>
          {template.content}
        </pre>
        {contentShort && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--primary-color)' }}
          >
            {expanded ? <><ChevronUp className="h-3 w-3" />收起</> : <><ChevronDown className="h-3 w-3" />展开全部</>}
          </button>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Clock className="h-3 w-3" />
          {formatDate(template.createdAt)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onManageResults();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-all shadow-sm"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <Layers className="h-3.5 w-3.5" />
          结果管理
          {template.results.length > 0 && (
            <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]">{template.results.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}

// ==================== 主页面组件 ====================
export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [resultModalTemplate, setResultModalTemplate] = useState<Template | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 从IndexedDB加载初始模板数据
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        console.log('从IndexedDB加载提示词模板');
        const loadedTemplates = await PromptTemplateStorage.getAllTemplates();
        
        // PromptTemplateStorage.getAllTemplates() 会自动处理没有模板的情况
        // 当没有模板时，它会从假数据文件导入初始模板
        setTemplates(loadedTemplates);
        console.log('模板加载完成，共:', loadedTemplates.length, '个');
      } catch (error) {
        console.error('加载模板失败:', error);
        // 加载失败时使用空数组
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  // 所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [templates]);

  // 所有使用的分类
  const usedCategories = useMemo(() => {
    const catSet = new Set<string>();
    templates.forEach(t => catSet.add(t.category));
    return CATEGORIES.filter(c => catSet.has(c));
  }, [templates]);

  // 筛选
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (filterCategory) {
      result = result.filter(t => t.category === filterCategory);
    }
    if (filterTag) {
      result = result.filter(t => t.tags.includes(filterTag));
    }
    return result;
  }, [templates, searchQuery, filterCategory, filterTag]);

  // CRUD
  const saveTemplate = async (template: Template) => {
    try {
      const success = await PromptTemplateStorage.saveTemplate(template);
      if (success) {
        setTemplates(prev => {
          const idx = prev.findIndex(t => t.id === template.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = template;
            return copy;
          }
          return [template, ...prev];
        });
        setShowForm(false);
        setEditingTemplate(null);
        showToast(editingTemplate ? '模板已更新' : '模板已创建');
      } else {
        showToast('保存模板失败');
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      showToast('保存模板失败');
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const success = await PromptTemplateStorage.deleteTemplate(id);
      if (success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        setConfirmDelete(null);
        showToast('模板已删除');
      } else {
        showToast('删除模板失败');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      showToast('删除模板失败');
    }
  };

  const updateResults = async (templateId: string, results: TemplateResult[]) => {
    try {
      const success = await PromptTemplateStorage.updateResults(templateId, results);
      if (success) {
        setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, results } : t));
        // Also update the result modal template reference
        setResultModalTemplate(prev => prev && prev.id === templateId ? { ...prev, results } : prev);
      } else {
        showToast('更新结果失败');
      }
    } catch (error) {
      console.error('更新结果失败:', error);
      showToast('更新结果失败');
    }
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const hasFilters = searchQuery || filterCategory || filterTag;

  return (
    <div className="min-h-screen no-select" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Toast message={toastMsg} visible={toastVisible} />

      {/* 搜索与筛选栏 */}
      <div className="sticky top-0 z-20 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 搜索 */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索标题、内容、标签..."
                className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                style={{ 
                  borderColor: 'var(--border-color)', 
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  placeholderColor: 'var(--text-tertiary)'
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 清除筛选 */}
            {hasFilters && (
              <button
                onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterTag(''); }}
                className="inline-flex items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-medium hover:bg-red-100 transition-colors"
                style={{ 
                  borderColor: 'var(--error-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--error-color)'
                }}
              >
                <X className="h-3 w-3" />
                清除筛选
              </button>
            )}

            {/* 分类筛选 */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className={cn(
                  "appearance-none rounded-xl border pl-8 pr-8 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all cursor-pointer",
                  filterCategory ? "border-violet-300" : "border-slate-200"
                )}
                style={{ 
                  borderColor: filterCategory ? 'var(--primary-light)' : 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: filterCategory ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}
              >
                <option value="">全部分类</option>
                {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <SlidersHorizontal className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            </div>

            {/* 标签筛选 */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <select
                value={filterTag}
                onChange={e => setFilterTag(e.target.value)}
                className={cn(
                  "appearance-none rounded-xl border pl-8 pr-8 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all cursor-pointer",
                  filterTag ? "border-violet-300" : "border-slate-200"
                )}
                style={{ 
                  borderColor: filterTag ? 'var(--primary-light)' : 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: filterTag ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}
              >
                <option value="">全部标签</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <SlidersHorizontal className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            </div>

            {/* 新增模板按钮 */}
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-all shadow-md active:scale-95"
              style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
            >
              <Plus className="h-4 w-4" />
              新增模板
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计信息 */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {hasFilters ? (
              <>找到 <span className="font-semibold">{filteredTemplates.length}</span> 个匹配模板（共 {templates.length} 个）</>
            ) : (
              <>共 <span className="font-semibold">{templates.length}</span> 个模板</>
            )}
          </p>
        </div>

        {/* 模板列表 */}
        <div className="max-h-[calc(100vh-240px)] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                正在加载模板...
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                请稍候，正在从存储中读取数据
              </p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <FolderOpen className="h-10 w-10" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
                {hasFilters ? '没有找到匹配的模板' : '暂无模板'}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {hasFilters ? '试试调整搜索条件或清除筛选' : '点击右上角「新增模板」开始创建'}
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterTag(''); }}
                  className="mt-4 rounded-xl px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  清除筛选条件
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => setConfirmDelete(t.id)}
                  onManageResults={() => setResultModalTemplate(t)}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 模态框们 */}
      {showForm && (
        <TemplateFormModal
          template={editingTemplate}
          onSave={saveTemplate}
          onClose={() => { setShowForm(false); setEditingTemplate(null); }}
        />
      )}

      {resultModalTemplate && (
        <ResultManagerModal
          template={resultModalTemplate}
          onClose={() => setResultModalTemplate(null)}
          onUpdateResults={updateResults}
          showToast={showToast}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="删除模板"
        message="确定要删除这个模板吗？关联的所有结果也将被删除。此操作不可撤销。"
        onConfirm={() => confirmDelete && deleteTemplate(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}