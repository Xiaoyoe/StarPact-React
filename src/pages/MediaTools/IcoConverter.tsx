import { useState, useRef, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Upload, Circle, Square, RectangleHorizontal, Download, RotateCcw, ZoomIn, ZoomOut, Check, Info, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { useFFmpegStore } from '@/stores/ffmpegStore';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SizeOption {
  size: number;
  label: string;
  selected: boolean;
}

const ICO_SIZES = [
  { size: 16, label: '16×16' },
  { size: 32, label: '32×32' },
  { size: 48, label: '48×48' },
  { size: 64, label: '64×64' },
  { size: 128, label: '128×128' },
  { size: 256, label: '256×256' },
];

export function IcoConverter() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [inputFilePath, setInputFilePath] = useState<string>('');
  const [cropShape, setCropShape] = useState<'circle' | 'square' | 'custom'>('circle');
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [selectedSizes, setSelectedSizes] = useState<SizeOption[]>(
    ICO_SIZES.map(s => ({ ...s, selected: s.size === 32 || s.size === 64 || s.size === 128 || s.size === 256 }))
  );
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [previewImages, setPreviewImages] = useState<{ size: number; url: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  
  const { outputPath, isElectronEnv, startTask, updateTaskProgress, addTaskLog, completeTask } = useFFmpegStore();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    let filePath = file.name;
    if (isElectronEnv && file.path) {
      filePath = file.path;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      setImageName(file.name.replace(/\.[^/.]+$/, ''));
      setInputFilePath(filePath);
      
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const minDim = Math.min(img.width, img.height);
        const cropSize = Math.min(minDim * 0.8, 300);
        setCropArea({
          x: (img.width - cropSize) / 2,
          y: (img.height - cropSize) / 2,
          width: cropSize,
          height: cropSize,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [toast, isElectronEnv]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    let filePath = file.name;
    if (isElectronEnv && file.path) {
      filePath = file.path;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      setImageName(file.name.replace(/\.[^/.]+$/, ''));
      setInputFilePath(filePath);
      
      const img = new Image();
      img.onload = () => {
        setImage(img);
        const minDim = Math.min(img.width, img.height);
        const cropSize = Math.min(minDim * 0.8, 300);
        setCropArea({
          x: (img.width - cropSize) / 2,
          y: (img.height - cropSize) / 2,
          width: cropSize,
          height: cropSize,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [toast, isElectronEnv]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const toggleSize = (size: number) => {
    setSelectedSizes(prev => 
      prev.map(s => s.size === size ? { ...s, selected: !s.selected } : s)
    );
  };

  const selectAllSizes = () => {
    setSelectedSizes(prev => prev.map(s => ({ ...s, selected: true })));
  };

  const deselectAllSizes = () => {
    setSelectedSizes(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!image) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (isDragging) {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(image.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(image.height - prev.height, prev.y + deltaY)),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizing && resizeHandle) {
      setCropArea(prev => {
        let newWidth = prev.width;
        let newHeight = prev.height;
        let newX = prev.x;
        let newY = prev.y;
        
        if (cropShape === 'circle' || cropShape === 'square') {
          const delta = Math.max(deltaX, deltaY);
          newWidth = Math.max(50, prev.width + delta);
          newHeight = newWidth;
          
          if (resizeHandle.includes('w')) {
            newX = prev.x - (newWidth - prev.width);
          }
          if (resizeHandle.includes('n')) {
            newY = prev.y - (newHeight - prev.height);
          }
        } else {
          if (resizeHandle.includes('e')) newWidth = Math.max(50, prev.width + deltaX);
          if (resizeHandle.includes('w')) {
            newWidth = Math.max(50, prev.width - deltaX);
            newX = prev.x + (prev.width - newWidth);
          }
          if (resizeHandle.includes('s')) newHeight = Math.max(50, prev.height + deltaY);
          if (resizeHandle.includes('n')) {
            newHeight = Math.max(50, prev.height - deltaY);
            newY = prev.y + (prev.height - newHeight);
          }
        }
        
        return {
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: Math.min(image.width - newX, newWidth),
          height: Math.min(image.height - newY, newHeight),
        };
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, image, cropShape]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const resetCrop = () => {
    if (!image) return;
    const minDim = Math.min(image.width, image.height);
    const cropSize = Math.min(minDim * 0.8, 300);
    setCropArea({
      x: (image.width - cropSize) / 2,
      y: (image.height - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    });
    setZoom(1);
  };

  const generatePreview = async () => {
    if (!image) {
      toast.error('请先选择图片');
      return;
    }

    const sizes = selectedSizes.filter(s => s.selected).map(s => s.size);
    if (sizes.length === 0) {
      toast.error('请至少选择一个输出尺寸');
      return;
    }

    const previews: { size: number; url: string }[] = [];

    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      if (cropShape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }
      
      ctx.drawImage(
        image,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, size, size
      );
      
      const url = canvas.toDataURL('image/png');
      previews.push({ size, url });
    }

    setPreviewImages(previews);
    setShowPreview(true);
  };

  const getOutputFilePath = () => {
    const now = new Date();
    const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const finalName = customFileName.trim() ? customFileName.trim() : `${imageName}_${dateTimeSuffix}`;
    
    if (outputPath) {
      const sep = outputPath.includes('\\') ? '\\' : '/';
      return `${outputPath}${sep}${finalName}.ico`;
    }
    return `${finalName}.ico`;
  };

  const generateIco = async () => {
    if (!image || !canvasRef.current) {
      toast.error('请先选择图片');
      return;
    }

    const sizes = selectedSizes.filter(s => s.selected).map(s => s.size);
    if (sizes.length === 0) {
      toast.error('请至少选择一个输出尺寸');
      return;
    }

    setIsProcessing(true);
    const outputFilePath = getOutputFilePath();
    
    const taskId = startTask('icoConvert', `${imageName}.ico`, inputFilePath, outputFilePath);
    setCurrentTaskId(taskId);
    
    addTaskLog(taskId, `[info] 开始生成 ICO 文件`);
    addTaskLog(taskId, `[info] 输出尺寸: ${sizes.join(', ')}`);
    addTaskLog(taskId, `[info] 裁剪形状: ${cropShape === 'circle' ? '圆形' : cropShape === 'square' ? '正方形' : '自定义'}`);

    try {
      updateTaskProgress(taskId, 10);
      
      const icoData = await createIcoFromImage(image, cropArea, sizes, cropShape, (progress) => {
        updateTaskProgress(taskId, 10 + progress * 0.8);
      });
      
      updateTaskProgress(taskId, 90);
      
      const blob = new Blob([icoData], { type: 'image/x-icon' });
      
      if (isElectronEnv && outputPath && window.electronAPI?.file?.writeFile) {
        const reader = new FileReader();
        reader.onload = async () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const result = await window.electronAPI.file.writeFile(outputFilePath, uint8Array);
          
          if (result.success) {
            updateTaskProgress(taskId, 100);
            addTaskLog(taskId, `[done] ✅ ICO 文件已保存到: ${outputFilePath}`);
            completeTask(taskId, true);
            toast.success('ICO 文件已生成');
          } else {
            addTaskLog(taskId, `[error] ❌ 保存失败: ${result.error}`);
            completeTask(taskId, false, result.error);
            toast.error('保存失败');
          }
          setIsProcessing(false);
          setCurrentTaskId(null);
        };
        reader.readAsArrayBuffer(blob);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = outputFilePath.includes('/') || outputFilePath.includes('\\') 
          ? outputFilePath.split(/[/\\]/).pop()! 
          : outputFilePath;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        updateTaskProgress(taskId, 100);
        addTaskLog(taskId, `[done] ✅ ICO 文件已下载`);
        completeTask(taskId, true);
        toast.success('ICO 文件已生成并下载');
        setIsProcessing(false);
        setCurrentTaskId(null);
      }
    } catch (error) {
      console.error('生成 ICO 失败:', error);
      addTaskLog(taskId, `[error] ❌ 生成失败: ${error}`);
      completeTask(taskId, false, String(error));
      toast.error('生成 ICO 失败');
      setIsProcessing(false);
      setCurrentTaskId(null);
    }
  };

  const createIcoFromImage = async (
    img: HTMLImageElement,
    crop: CropArea,
    sizes: number[],
    shape: 'circle' | 'square' | 'custom',
    onProgress: (progress: number) => void
  ): Promise<ArrayBuffer> => {
    const images: { width: number; height: number; data: Uint8Array }[] = [];
    
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }
      
      ctx.drawImage(
        img,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, size, size
      );
      
      const pngData = await new Promise<Uint8Array>((resolve) => {
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.readAsArrayBuffer(blob!);
        }, 'image/png');
      });
      
      images.push({ width: size, height: size, data: pngData });
      onProgress((i + 1) / sizes.length);
    }
    
    return createIcoBuffer(images);
  };

  const createIcoBuffer = (images: { width: number; height: number; data: Uint8Array }[]): ArrayBuffer => {
    const headerSize = 6;
    const dirEntrySize = 16;
    const totalSize = images.reduce((sum, img) => sum + img.data.length, 0);
    const bufferSize = headerSize + (dirEntrySize * images.length) + totalSize;
    
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, images.length, true);
    
    let dataOffset = headerSize + (dirEntrySize * images.length);
    
    images.forEach((img, index) => {
      const entryOffset = headerSize + (index * dirEntrySize);
      view.setUint8(entryOffset, img.width >= 256 ? 0 : img.width);
      view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);
      view.setUint8(entryOffset + 2, 0);
      view.setUint8(entryOffset + 3, 0);
      view.setUint16(entryOffset + 4, 1, true);
      view.setUint16(entryOffset + 6, 32, true);
      view.setUint32(entryOffset + 8, img.data.length, true);
      view.setUint32(entryOffset + 12, dataOffset, true);
      
      const dataView = new Uint8Array(buffer, dataOffset, img.data.length);
      dataView.set(img.data);
      
      dataOffset += img.data.length;
    });
    
    return buffer;
  };

  const displayWidth = image ? Math.min(500, image.width * zoom) : 500;
  const displayHeight = image ? (displayWidth / image.width) * image.height : 400;
  const scale = image ? displayWidth / image.width : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5" style={{ color: 'var(--success-color)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ICO 图标转换</h2>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--success-color)' }}
        >
          图片工具
        </span>
        {outputPath && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
            输出: {outputPath}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>图片导入</span>
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:border-opacity-60"
              style={{ borderColor: 'var(--success-color)', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('ico-file-input')?.click()}
            >
              <input
                id="ico-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <ImageIcon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                拖拽图片到此处或点击选择
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                支持 PNG, JPG, WebP 等格式
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>裁剪形状</span>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'circle', label: '圆形', icon: <Circle className="w-4 h-4" /> },
                { key: 'square', label: '正方形', icon: <Square className="w-4 h-4" /> },
                { key: 'custom', label: '自定义', icon: <RectangleHorizontal className="w-4 h-4" /> },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    setCropShape(s.key as 'circle' | 'square' | 'custom');
                    if (s.key !== 'custom' && image) {
                      const size = Math.max(cropArea.width, cropArea.height);
                      setCropArea(prev => ({ ...prev, width: size, height: size }));
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: cropShape === s.key ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${cropShape === s.key ? 'var(--success-color)' : 'transparent'}`,
                  }}
                >
                  <span style={{ color: cropShape === s.key ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                    {s.icon}
                  </span>
                  <span className="text-xs" style={{ color: cropShape === s.key ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输出尺寸</span>
              <div className="flex gap-1">
                <button
                  onClick={selectAllSizes}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  全选
                </button>
                <button
                  onClick={deselectAllSizes}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  取消
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {selectedSizes.map(s => (
                <button
                  key={s.size}
                  onClick={() => toggleSize(s.size)}
                  className="flex items-center justify-center gap-1 p-2 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: s.selected ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${s.selected ? 'var(--success-color)' : 'transparent'}`,
                    color: s.selected ? 'var(--success-color)' : 'var(--text-secondary)',
                  }}
                >
                  {s.selected && <Check className="w-3 h-3" />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输出文件名</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="留空则使用默认名称"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
              />
              <span
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
              >
                .ico
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>裁剪预览</span>
                {image && (
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    原图: {image.width}×{image.height}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="缩小"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="放大"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={resetCrop}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  title="重置"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative overflow-auto rounded-lg"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                minHeight: '300px',
                maxHeight: '500px',
              }}
            >
              {!image ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ImageIcon className="w-16 h-16 mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    请先导入图片
                  </p>
                </div>
              ) : (
                <div className="relative inline-block" style={{ width: displayWidth, height: displayHeight }}>
                  <img
                    src={imageSrc!}
                    alt="预览"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  <motion.div
                    className="absolute cursor-move"
                    style={{
                      left: cropArea.x * scale,
                      top: cropArea.y * scale,
                      width: cropArea.width * scale,
                      height: cropArea.height * scale,
                      border: '2px solid var(--success-color)',
                      borderRadius: cropShape === 'circle' ? '50%' : '4px',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                    onMouseDown={(e) => handleMouseDown(e)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
                        {Math.round(cropArea.width)}×{Math.round(cropArea.height)}
                      </span>
                    </div>
                    {['nw', 'ne', 'sw', 'se'].map(handle => (
                      <div
                        key={handle}
                        className={`absolute w-3 h-3 bg-white rounded-full shadow-md`}
                        style={{
                          border: '2px solid var(--success-color)',
                          cursor: `${handle}-resize`,
                          top: handle.includes('n') ? -6 : 'auto',
                          bottom: handle.includes('s') ? -6 : 'auto',
                          left: handle.includes('w') ? -6 : 'auto',
                          right: handle.includes('e') ? -6 : 'auto',
                        }}
                        onMouseDown={(e) => handleMouseDown(e, handle)}
                      />
                    ))}
                  </motion.div>
                </div>
              )}
            </div>

            {image && (
              <div
                className="mt-3 p-2 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--success-color)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  拖拽框体移动位置，拖拽四角调整大小。选择输出尺寸后点击生成按钮导出 ICO 文件。
                </span>
              </div>
            )}
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  已选择 {selectedSizes.filter(s => s.selected).length} 个尺寸
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {selectedSizes.filter(s => s.selected).map(s => s.label).join(', ') || '无'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generatePreview}
                  disabled={!image || selectedSizes.filter(s => s.selected).length === 0 || isProcessing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <button
                  onClick={generateIco}
                  disabled={!image || selectedSizes.filter(s => s.selected).length === 0 || isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--success-color), #16a34a)',
                    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  {isProcessing ? '生成中...' : '生成 ICO 文件'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                ICO 预览 - {previewImages.length} 个尺寸
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {previewImages.map(preview => (
                <div
                  key={preview.size}
                  className="flex flex-col items-center p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div 
                    className="flex items-center justify-center mb-2"
                    style={{ 
                      width: Math.max(64, preview.size), 
                      height: Math.max(64, preview.size),
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: cropShape === 'circle' ? '50%' : '8px',
                    }}
                  >
                    <img 
                      src={preview.url} 
                      alt={`${preview.size}x${preview.size}`}
                      className="max-w-full max-h-full"
                      style={{ 
                        width: preview.size, 
                        height: preview.size,
                        borderRadius: cropShape === 'circle' ? '50%' : '0',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {preview.size}×{preview.size}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {preview.size <= 32 ? '小图标' : preview.size <= 64 ? '中等图标' : preview.size <= 128 ? '大图标' : '超大图标'}
                  </span>
                </div>
              ))}
            </div>
            <div 
              className="mt-4 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--success-color)' }} />
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <p className="mb-1">导出的 ICO 文件将包含以上 {previewImages.length} 个尺寸的图片。</p>
                  <p>Windows 系统会根据使用场景自动选择合适的尺寸显示。</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  generateIco();
                }}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--success-color), #16a34a)',
                }}
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
