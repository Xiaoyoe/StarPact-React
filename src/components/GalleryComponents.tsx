import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Heart, Eye, Edit3, Check, ArrowUpDown, MoreHorizontal, Trash2,
  RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplets, X, Download, Undo2, Palette,
  X as CloseIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Info, ArrowUpDown as ArrowUpDownIcon, ChevronDown,
  Images, FolderOpen, Layers, Mountain, Building, Plane, RectangleVertical, ChevronRight as ChevronRightIcon, Camera,
  Grid3X3, List, LayoutGrid, Search, SortAsc, SortDesc,
  CheckSquare, PanelLeftClose, PanelLeftOpen, Upload
} from 'lucide-react';
import { ImageItem, ImageFolder, ViewMode, SortBy, SortOrder, EditState, defaultEditState } from '@/types/gallery';
import { cn } from '@/utils/cn';

// ImageEditor Component
interface ImageEditorProps {
  image: ImageItem;
  onClose: () => void;
}

interface SliderControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderControl({ label, icon, value, min, max, defaultValue, unit = '', onChange }: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-300">
          {icon}
          {label}
        </span>
        <span className="text-slate-400 font-mono">{value}{unit}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-violet-500
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/30
            [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
        />
        {value !== defaultValue && (
          <button
            onClick={() => onChange(defaultValue)}
            className="absolute -right-1 -top-1 text-slate-500 hover:text-violet-400 transition-colors"
            title="重置"
          >
            <Undo2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

type TabId = 'adjust' | 'filter' | 'transform';

export function ImageEditor({ image, onClose }: ImageEditorProps) {
  const [editState, setEditState] = useState<EditState>({ ...defaultEditState });
  const [activeTab, setActiveTab] = useState<TabId>('adjust');
  const [showOriginal, setShowOriginal] = useState(false);

  const update = (partial: Partial<EditState>) => {
    setEditState(prev => ({ ...prev, ...partial }));
  };

  const filterStyle = useMemo(() => {
    const s = showOriginal ? defaultEditState : editState;
    return {
      filter: `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) blur(${s.blur}px) grayscale(${s.grayscale}%) sepia(${s.sepia}%) hue-rotate(${s.hueRotate}deg)`,
      transform: `rotate(${s.rotation}deg) scaleX(${s.flipH ? -1 : 1}) scaleY(${s.flipV ? -1 : 1})`,
    };
  }, [editState, showOriginal]);

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      if (ctx) {
        ctx.filter = `brightness(${editState.brightness}%) contrast(${editState.contrast}%) saturate(${editState.saturation}%) blur(${editState.blur}px) grayscale(${editState.grayscale}%) sepia(${editState.sepia}%) hue-rotate(${editState.hueRotate}deg)`;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((editState.rotation * Math.PI) / 180);
        ctx.scale(editState.flipH ? -1 : 1, editState.flipV ? -1 : 1);
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
        ctx.restore();
        const link = document.createElement('a');
        link.download = `edited_${image.name}`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      }
    };
    img.src = image.url;
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'adjust', label: '基础调整' },
    { id: 'filter', label: '滤镜效果' },
    { id: 'transform', label: '变换' },
  ];

  const presetFilters: { name: string; state: Partial<EditState> }[] = [
    { name: '原图', state: {} },
    { name: '暖色', state: { saturation: 130, brightness: 105, hueRotate: -10 } },
    { name: '冷色', state: { saturation: 90, brightness: 95, hueRotate: 20 } },
    { name: '复古', state: { sepia: 60, saturation: 80, contrast: 110 } },
    { name: '黑白', state: { grayscale: 100, contrast: 120 } },
    { name: '高对比', state: { contrast: 150, saturation: 120 } },
    { name: '柔和', state: { brightness: 110, contrast: 90, saturation: 90, blur: 0.5 } },
    { name: '鲜艳', state: { saturation: 160, brightness: 105, contrast: 110 } },
  ];

  return (
    <div className="fixed inset-0 z-[60]" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="absolute top-0 left-0 right-0 h-14 backdrop-blur border-b flex items-center justify-between px-4 z-10" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>图片编辑</h3>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{image.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: showOriginal ? 'var(--primary-color)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: showOriginal ? 'white' : 'var(--text-secondary)',
              '&:hover': {
                backgroundColor: showOriginal ? 'var(--primary-color)' : 'var(--bg-secondary)'
              }
            }}
          >
            <Eye size={14} />
            按住查看原图
          </button>
          {JSON.stringify(editState) !== JSON.stringify(defaultEditState) && (
            <button
              onClick={() => setEditState({ ...defaultEditState })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--bg-secondary)'
                }
              }}
            >
              <Undo2 size={14} />
              全部重置
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              '&:hover': {
                opacity: 0.9
              }
            }}
          >
            <Download size={14} />
            导出
          </button>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'var(--bg-tertiary)' }, color: 'var(--text-secondary)' }}>
            <CloseIcon size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 pt-14 flex">
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <div className="relative max-w-full max-h-full">
            <img
              src={image.url || null}
              alt={image.name}
              className="max-w-full max-h-[calc(100vh-8rem)] object-contain rounded-lg shadow-2xl transition-all duration-200"
              style={filterStyle}
              draggable={false}
            />
            {showOriginal && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                原图
              </div>
            )}
          </div>
        </div>

        <div className="w-72 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-3 text-xs font-medium transition-colors relative"
                style={{
                  color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-tertiary)',
                  '&:hover': {
                    color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)'
                  }
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ backgroundColor: 'var(--primary-color)' }} />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'adjust' && (
              <>
                <SliderControl
                  label="亮度" icon={<Sun size={12} />}
                  value={editState.brightness} min={0} max={200} defaultValue={100} unit="%"
                  onChange={v => update({ brightness: v })}
                />
                <SliderControl
                  label="对比度" icon={<Contrast size={12} />}
                  value={editState.contrast} min={0} max={200} defaultValue={100} unit="%"
                  onChange={v => update({ contrast: v })}
                />
                <SliderControl
                  label="饱和度" icon={<Droplets size={12} />}
                  value={editState.saturation} min={0} max={200} defaultValue={100} unit="%"
                  onChange={v => update({ saturation: v })}
                />
                <SliderControl
                  label="模糊" icon={<Eye size={12} />}
                  value={editState.blur} min={0} max={20} defaultValue={0} unit="px"
                  onChange={v => update({ blur: v })}
                />
                <SliderControl
                  label="色相旋转" icon={<Palette size={12} />}
                  value={editState.hueRotate} min={-180} max={180} defaultValue={0} unit="°"
                  onChange={v => update({ hueRotate: v })}
                />
              </>
            )}

            {activeTab === 'filter' && (
              <>
                <SliderControl
                  label="灰度" icon={<Eye size={12} />}
                  value={editState.grayscale} min={0} max={100} defaultValue={0} unit="%"
                  onChange={v => update({ grayscale: v })}
                />
                <SliderControl
                  label="怀旧" icon={<Palette size={12} />}
                  value={editState.sepia} min={0} max={100} defaultValue={0} unit="%"
                  onChange={v => update({ sepia: v })}
                />
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-3">预设滤镜</p>
                  <div className="grid grid-cols-2 gap-2">
                    {presetFilters.map(preset => {
                      const previewState = { ...defaultEditState, ...preset.state };
                      const previewFilter = `brightness(${previewState.brightness}%) contrast(${previewState.contrast}%) saturate(${previewState.saturation}%) blur(${previewState.blur}px) grayscale(${previewState.grayscale}%) sepia(${previewState.sepia}%) hue-rotate(${previewState.hueRotate}deg)`;
                      return (
                        <button
                          key={preset.name}
                          onClick={() => update({ ...defaultEditState, ...preset.state })}
                          className="group relative rounded-lg overflow-hidden border border-slate-700 hover:border-violet-500 transition-colors"
                        >
                          <img
                            src={image.url || null}
                            alt={preset.name}
                            className="w-full h-16 object-cover"
                            style={{ filter: previewFilter }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent py-1">
                            <span className="text-[10px] text-white font-medium">{preset.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'transform' && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-3">旋转</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => update({ rotation: editState.rotation - 90 })}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      <RotateCcw size={14} />
                      左旋90°
                    </button>
                    <button
                      onClick={() => update({ rotation: editState.rotation + 90 })}
                      className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      <RotateCw size={14} />
                      右旋90°
                    </button>
                  </div>
                </div>
                <SliderControl
                  label="自由旋转" icon={<RotateCw size={12} />}
                  value={editState.rotation} min={-180} max={180} defaultValue={0} unit="°"
                  onChange={v => update({ rotation: v })}
                />
                <div>
                  <p className="text-xs text-slate-400 mb-3">翻转</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => update({ flipH: !editState.flipH })}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs transition-colors",
                        editState.flipH ? "bg-violet-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      )}
                    >
                      <FlipHorizontal size={14} />
                      水平翻转
                    </button>
                    <button
                      onClick={() => update({ flipV: !editState.flipV })}
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs transition-colors",
                        editState.flipV ? "bg-violet-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      )}
                    >
                      <FlipVertical size={14} />
                      垂直翻转
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ImageGrid Component
interface ImageGridProps {
  images: ImageItem[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  onSelect: (id: string, multi: boolean) => void;
  onView: (index: number) => void;
  onEdit: (image: ImageItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (ids: string[]) => void;
}

export function ImageGrid({
  images, viewMode, selectedIds, onSelect, onView, onEdit, onToggleFavorite, onDelete
}: ImageGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  };

  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          {/* 主标题 */}
          <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>相册为空</h3>
          
          {/* 副标题 */}
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>请使用上方的导入按钮添加图片到您的相册</p>
          
          {/* 操作提示 */}
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>支持 JPG、PNG、GIF、WebP 等常见图片格式</span>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-1 p-4">
        <div className="grid grid-cols-[auto_1fr_100px_100px_120px_80px] gap-4 items-center px-4 py-2 text-xs text-slate-500 border-b border-slate-800">
          <div className="w-5" />
          <div>文件名</div>
          <div>尺寸</div>
          <div>大小</div>
          <div>日期</div>
          <div>操作</div>
        </div>
        {images.map((image, idx) => {
          const isSelected = selectedIds.has(image.id);
          return (
            <div
              key={image.id}
              className={cn(
                "grid grid-cols-[auto_1fr_100px_100px_120px_80px] gap-4 items-center px-4 py-2 rounded-lg transition-colors cursor-pointer group",
                isSelected ? "bg-violet-600/10 border border-violet-500/20" : "hover:bg-slate-800/50 border border-transparent"
              )}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  onSelect(image.id, true);
                } else {
                  onView(idx);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, image.id)}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors",
                  isSelected ? "bg-violet-600 border-violet-600" : "border-slate-600 hover:border-violet-400"
                )}
                onClick={(e) => { e.stopPropagation(); onSelect(image.id, true); }}
              >
                {isSelected && <Check size={12} className="text-white" />}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  {/* 图片加载占位符 */}
                  {!image.isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <Eye size={12} className="text-slate-600" />
                    </div>
                  )}
                  {/* 图片元素 */}
                  <img 
                    src={image.isLoaded ? image.url : null} 
                    alt={image.name} 
                    className={cn(
                      "w-full h-full object-cover",
                      !image.isLoaded && "opacity-0"
                    )}
                    data-image-id={image.id}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 truncate">{image.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {image.isLongImage && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0 rounded">长图</span>
                    )}
                    {image.favorite && <Heart size={10} className="text-red-400" fill="currentColor" />}
                  </div>
                </div>
              </div>
              <span className="text-xs text-slate-500">{image.width}×{image.height}</span>
              <span className="text-xs text-slate-500">{formatSize(image.size)}</span>
              <span className="text-xs text-slate-500">{image.dateAdded.toLocaleDateString('zh-CN')}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onView(idx); }} className="p-1 hover:bg-slate-700 rounded" title="查看">
                  <Eye size={14} className="text-slate-400" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onEdit(image); }} className="p-1 hover:bg-slate-700 rounded" title="编辑">
                  <Edit3 size={14} className="text-slate-400" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(image.id); }} className="p-1 hover:bg-slate-700 rounded" title="收藏">
                  <Heart size={14} className={image.favorite ? "text-red-400" : "text-slate-400"} fill={image.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          );
        })}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button onClick={() => { onView(images.findIndex(i => i.id === contextMenu.id)); setContextMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
                <Eye size={14} /> 查看大图
              </button>
              <button onClick={() => { const img = images.find(i => i.id === contextMenu.id); if (img) onEdit(img); setContextMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
                <Edit3 size={14} /> 编辑图片
              </button>
              <button onClick={() => { onToggleFavorite(contextMenu.id); setContextMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
                <Heart size={14} /> 切换收藏
              </button>
              <div className="my-1 border-t border-slate-700" />
              <button onClick={() => { onDelete([contextMenu.id]); setContextMenu(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} /> 删除
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const gridClass = viewMode === 'waterfall'
    ? 'columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 p-4 space-y-3'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4';

  return (
    <div className={gridClass}>
      {images.map((image, idx) => {
        const isSelected = selectedIds.has(image.id);
        const isHovered = hoveredId === image.id;

        return (
          <div
              key={image.id}
              className={cn(
                "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                viewMode === 'waterfall' ? 'break-inside-avoid' : 'aspect-square',
                isSelected && "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950",
              )}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  onSelect(image.id, true);
                } else {
                  onView(idx);
                }
              }}
              onMouseEnter={() => setHoveredId(image.id)}
              onMouseLeave={() => setHoveredId(null)}
              onContextMenu={(e) => handleContextMenu(e, image.id)}
            >
            <div className="relative w-full h-full">
              {/* 图片加载占位符 */}
              {!image.isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <Eye size={24} className="text-slate-600" />
                </div>
              )}
              
              {/* 图片元素 */}
              <img
                src={image.isLoaded ? image.url : null}
                alt={image.name}
                className={cn(
                  "w-full object-cover transition-transform duration-300",
                  viewMode === 'waterfall' ? 'h-auto' : 'h-full',
                  isHovered && "scale-105",
                  !image.isLoaded && "opacity-0"
                )}
                loading="lazy"
                data-image-id={image.id}
              />
            </div>

            <div className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-200",
              isHovered ? "opacity-100" : "opacity-0"
            )}>
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
                    isSelected
                      ? "bg-violet-600 border-violet-600 scale-100"
                      : "border-white/60 hover:border-white bg-black/30 scale-90 group-hover:scale-100"
                  )}
                  onClick={(e) => { e.stopPropagation(); onSelect(image.id, true); }}
                >
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <div className="flex items-center gap-1">
                  {image.isLongImage && (
                    <span className="bg-amber-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <ArrowUpDownIcon size={8} />
                      长图
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(image.id); }}
                    className="p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
                  >
                    <Heart size={14} className={image.favorite ? "text-red-400" : "text-white/80"} fill={image.favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <p className="text-xs text-white font-medium truncate">{image.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-white/60">{image.width}×{image.height}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(idx); }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                      title="查看"
                    >
                      <Eye size={12} className="text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(image); }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                      title="编辑"
                    >
                      <Edit3 size={12} className="text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setContextMenu({ id: image.id, x: e.clientX, y: e.clientY }); }}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <MoreHorizontal size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button onClick={() => { onView(images.findIndex(i => i.id === contextMenu.id)); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
              <Eye size={14} /> 查看大图
            </button>
            <button onClick={() => { const img = images.find(i => i.id === contextMenu.id); if (img) onEdit(img); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
              <Edit3 size={14} /> 编辑图片
            </button>
            <button onClick={() => { onToggleFavorite(contextMenu.id); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors">
              <Heart size={14} /> 切换收藏
            </button>
            <div className="my-1 border-t border-slate-700" />
            <button onClick={() => { onDelete([contextMenu.id]); setContextMenu(null); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={14} /> 删除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ImageViewer Component
interface ImageViewerProps {
  images: ImageItem[];
  currentIndex: number;
  onClose: () => void;
  onEdit: (image: ImageItem) => void;
  onToggleFavorite: (id: string) => void;
}

export function ImageViewer({ images, currentIndex, onClose, onEdit, onToggleFavorite }: ImageViewerProps) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [longImageMode, setLongImageMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showZoomPercent, setShowZoomPercent] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const zoomTimer = useRef<NodeJS.Timeout | null>(null);

  const image = images[index];
  const isLong = image.isLongImage || image.height / image.width > 2;

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setLongImageMode(false);
  }, []);

  useEffect(() => {
    resetView();
    if (isLong) {
      setLongImageMode(true);
    }
  }, [index, isLong, resetView]);

  const navigate = useCallback((dir: number) => {
    setIndex(prev => {
      const next = prev + dir;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': navigate(-1); break;
        case 'ArrowRight': navigate(1); break;
        case '+': case '=': setZoom(z => Math.min(z + 0.25, 5)); break;
        case '-': setZoom(z => Math.max(z - 0.25, 0.25)); break;
        case 'r': setRotation(r => r + 90); break;
        case '0': resetView(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onClose, resetView]);

  const handleWheel = (e: React.WheelEvent) => {
    if (longImageMode) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.25, Math.min(5, z + delta)));
    
    // 显示缩放百分比
    setShowZoomPercent(true);
    
    // 清除之前的定时器
    if (zoomTimer.current) {
      clearTimeout(zoomTimer.current);
    }
    
    // 0.5秒后自动隐藏
    zoomTimer.current = setTimeout(() => {
      setShowZoomPercent(false);
    }, 500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (longImageMode) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || longImageMode) return;
    setPosition({
      x: posStart.current.x + (e.clientX - dragStart.current.x),
      y: posStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/90 flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-white/80 to-transparent z-20 flex items-center justify-between px-4">
        <div>
          <p className="text-sm text-black font-medium">{image.name}</p>
          <p className="text-xs text-black/50">{index + 1} / {images.length}</p>
        </div>
        <div className="flex items-center gap-1">
          {isLong && (
            <button
              onClick={() => { setLongImageMode(!longImageMode); setZoom(1); setPosition({ x: 0, y: 0 }); }}
              className={cn(
                "p-2 rounded-lg transition-colors",
                longImageMode ? "bg-violet-600 text-white" : "hover:bg-black/10 text-black/80 hover:text-black"
              )}
              title="长图模式"
            >
              <ArrowUpDownIcon size={18} />
            </button>
          )}
          <button
            onClick={() => setShowThumbnails(true)}
            className="p-2 rounded-lg transition-colors hover:bg-black/10 text-black/80 hover:text-black"
            title="显示缩略图"
          >
            <Images size={18} />
          </button>
          <button
            onClick={() => onToggleFavorite(image.id)}
            className={cn("p-2 rounded-lg transition-colors", image.favorite ? "text-red-400" : "hover:bg-black/10 text-black/80 hover:text-black")}
            title="收藏"
          >
            <Heart size={18} fill={image.favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 5))} className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black" title="放大">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black" title="缩小">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => setRotation(r => r + 90)} className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black" title="旋转">
            <RotateCw size={18} />
          </button>
          <button onClick={resetView} className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black" title="适应窗口">
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn("p-2 rounded-lg transition-colors", showInfo ? "bg-black/20 text-black" : "hover:bg-black/10 text-black/80 hover:text-black")}
            title="图片信息"
          >
            <Info size={18} />
          </button>
          <button
            onClick={() => onEdit(image)}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black"
            title="编辑"
          >
            <Edit3 size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-lg transition-colors text-black/80 hover:text-black">
            <CloseIcon size={20} />
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white transition-all hover:scale-110"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white transition-all hover:scale-110"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <div className="flex-1 overflow-hidden">
        <div
        className={cn(
          "h-full flex items-center justify-center",
          longImageMode ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden",
          isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
          {longImageMode ? (
            <div className="w-full max-w-lg mx-auto py-16">
              <div className="relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-violet-600/90 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                  📏 长图模式 · 滚动查看完整内容
                </div>
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-auto rounded-lg shadow-2xl"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <img
              src={image.url || null}
              alt={image.name}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {showZoomPercent && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      )}

      {/* 独立的缩略图区域 */}
      {images.length > 1 && showThumbnails && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/90 border-t border-gray-200 z-20 flex items-center px-4 transition-transform duration-300 ease-in-out">
          <div 
            className="flex items-center justify-center gap-1.5 overflow-x-auto max-w-full py-1 flex-1"
            onWheel={(e) => {
              // 处理滚轮切换图片
              if (e.deltaY > 0) {
                navigate(1);
              } else if (e.deltaY < 0) {
                navigate(-1);
              }
            }}
          >
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIndex(i)}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  i === index ? "border-violet-500 scale-110 shadow-lg shadow-violet-500/30" : "border-transparent opacity-50 hover:opacity-80"
                )}
              >
                <img src={img.url || null} alt={img.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowThumbnails(false)}
            className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors ml-2"
            title="隐藏缩略图"
          >
            <ChevronDown size={16} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>
      )}

      {showInfo && (
        <div className="absolute top-14 right-0 w-72 bg-white/95 backdrop-blur border-l border-gray-200 h-[calc(100%-3.5rem)] z-20 p-4 overflow-y-auto">
          <h3 className="text-sm font-medium text-black mb-4">图片信息</h3>
          <div className="space-y-3">
            {
              [
                { label: '文件名', value: image.name },
                { label: '尺寸', value: `${image.width} × ${image.height}` },
                { label: '文件大小', value: formatSize(image.size) },
                { label: '类型', value: image.type },
                { label: '宽高比', value: image.aspectRatio.toFixed(2) },
                { label: '长图', value: image.isLongImage ? '是' : '否' },
                { label: '添加日期', value: image.dateAdded.toLocaleDateString('zh-CN') },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs text-gray-700">{item.value}</span>
                </div>
              ))
            }
            {image.tags.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-2">标签</span>
                <div className="flex flex-wrap gap-1.5">
                  {image.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-violet-500/20 text-violet-600 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar Component
interface SidebarProps {
  folders: ImageFolder[];
  activeFolderId: string;
  onSelectFolder: (id: string) => void;
}

const folderIcons: Record<string, React.ReactNode> = {
  all: <Images size={18} />,
  nature: <Mountain size={18} />,
  city: <Building size={18} />,
  travel: <Plane size={18} />,
  long: <RectangleVertical size={18} />,
  favorites: <Heart size={18} />,
};

export function GallerySidebar({ folders, activeFolderId, onSelectFolder }: SidebarProps) {
  return (
    <div className="w-60 bg-secondary border-l border-border" style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
      <div className="py-3 px-2 space-y-1">
        {folders.map(folder => {
          const isActive = folder.id === activeFolderId;
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)'
              }}
            >
              <span className="flex-shrink-0" style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-tertiary)' }}>
                {folderIcons[folder.id] || <FolderOpen size={18} />}
              </span>
              <span className="flex-1 text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--text-primary)' }}>
                {folder.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{
                backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--primary-color)' : 'var(--text-tertiary)'
              }}>
                {folder.images.length}
              </span>
              {isActive && (
                <ChevronRightIcon size={14} style={{ color: 'var(--primary-color)' }} className="flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Toolbar Component
interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sort: SortBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onImport: () => void;
  onImportFolder: () => void;
  folderName: string;
  onToggleSidebar: () => void;
  showSidebar: boolean;
} 

export function GalleryToolbar({
  viewMode, onViewModeChange,
  sortBy, onSortByChange,
  sortOrder, onSortOrderChange,
  searchQuery, onSearchChange,
  selectedCount, totalCount,
  onSelectAll, onDeselectAll, onDeleteSelected,
  onImport, onImportFolder, folderName,
  onToggleSidebar, showSidebar
}: ToolbarProps) {
  
  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'grid', icon: <Grid3X3 size={16} />, label: '网格' },
    { mode: 'waterfall', icon: <LayoutGrid size={16} />, label: '瀑布流' },
    { mode: 'list', icon: <List size={16} />, label: '列表' },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'name', label: '名称' },
    { value: 'date', label: '日期' },
    { value: 'size', label: '大小' },
  ];

  return (
    <div className="h-14 flex items-center justify-between px-4 flex-shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{folderName}</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
          {totalCount} 张
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={14} style={{ color: 'var(--text-tertiary)' }} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索图片..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-48 rounded-lg pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              placeholderColor: 'var(--text-tertiary)',
              '&:focus': {
                borderColor: 'var(--primary-color)',
                boxShadow: '0 0 0 1px var(--primary-color)'
              }
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)', '&:hover': { color: 'var(--text-secondary)' } }}
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>

        <div className="h-5 w-px" style={{ backgroundColor: 'var(--border-color)' }} />

        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="rounded-lg px-2 py-1.5 text-xs focus:outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              '&:focus': {
                borderColor: 'var(--primary-color)'
              }
            }}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'var(--bg-tertiary)' }, color: 'var(--text-secondary)' }}
            title={sortOrder === 'asc' ? '升序' : '降序'}
          >
            {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>
        </div>

        <div className="h-5 w-px" style={{ backgroundColor: 'var(--border-color)' }} />

        <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          {viewModes.map(vm => (
            <button
              key={vm.mode}
              onClick={() => onViewModeChange(vm.mode)}
              className="p-1.5 rounded-md transition-all"
              style={{
                backgroundColor: viewMode === vm.mode ? 'var(--primary-color)' : 'transparent',
                color: viewMode === vm.mode ? 'white' : 'var(--text-tertiary)',
                boxShadow: viewMode === vm.mode ? '0 0 10px rgba(0, 0, 0, 0.2)' : 'none'
              }}
              title={vm.label}
            >
              {vm.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--primary-color)' }}>
              已选择 {selectedCount} 张
            </span>
            <button
              onClick={onDeselectAll}
              className="px-2.5 py-1.5 text-xs rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--bg-secondary)'
                }
              }}
            >
              取消选择
            </button>
            <button
              onClick={onDeleteSelected}
              className="px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: 'rgb(239, 68, 68)',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.3)'
                }
              }}
            >
              <Trash2 size={12} />
              删除
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onSelectAll}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'var(--bg-tertiary)' }, color: 'var(--text-secondary)' }}
              title="全选"
            >
              <CheckSquare size={16} />
            </button>
            <button
              onClick={onImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                '&:hover': {
                  opacity: 0.9
                }
              }}
            >
              <Upload size={14} />
              导入
            </button>
            <button
              onClick={onImportFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--bg-secondary)'
                }
              }}
            >
              <FolderOpen size={14} />
              导入文件夹
            </button>
            <button
              onClick={onToggleSidebar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--bg-secondary)'
                }
              }}
            >
              <PanelLeftClose size={14} />
              {showSidebar ? '收起侧边栏' : '展开侧边栏'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
