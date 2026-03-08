import { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Upload, Download, Settings2, Info, Trash2, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/Toast';
import { useFFmpegStore } from '@/stores/ffmpegStore';

interface ImageFile {
  id: string;
  file: File;
  name: string;
  preview: string;
  size: number;
  width: number;
  height: number;
  inputPath: string;
}

interface OutputSettings {
  format: string;
  quality: number;
  resize: boolean;
  resizeWidth: number;
  resizeHeight: number;
  maintainAspectRatio: boolean;
}

const OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG', mime: 'image/png', description: '无损压缩，支持透明' },
  { value: 'jpeg', label: 'JPG', mime: 'image/jpeg', description: '有损压缩，文件较小' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', description: '现代格式，压缩率高' },
  { value: 'bmp', label: 'BMP', mime: 'image/bmp', description: '无压缩位图格式' },
  { value: 'gif', label: 'GIF', mime: 'image/gif', description: '支持动画，256色' },
];

export function ImageFormatConvert() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({
    format: 'png',
    quality: 92,
    resize: false,
    resizeWidth: 800,
    resizeHeight: 600,
    maintainAspectRatio: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  
  const { outputPath, isElectronEnv, startTask, updateTaskProgress, addTaskLog, completeTask } = useFFmpegStore();

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  }, [isElectronEnv]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addImages(files);
  }, [isElectronEnv]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const addImages = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let filePath = file.name;
          if (isElectronEnv && file.path) {
            filePath = file.path;
          }
          
          setImages(prev => [...prev, {
            id: generateId(),
            file,
            name: file.name.replace(/\.[^/.]+$/, ''),
            preview,
            size: file.size,
            width: img.width,
            height: img.height,
            inputPath: filePath,
          }]);
        };
        img.src = preview;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAllImages = () => {
    setImages([]);
  };

  const getOutputFilePath = (image: ImageFile) => {
    const now = new Date();
    const dateTimeSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const finalName = customFileName.trim() || `${image.name}_${dateTimeSuffix}`;
    const format = OUTPUT_FORMATS.find(f => f.value === outputSettings.format)!;
    
    if (outputPath) {
      const sep = outputPath.includes('\\') ? '\\' : '/';
      return `${outputPath}${sep}${finalName}.${format.value}`;
    }
    return `${finalName}.${format.value}`;
  };

  const convertImages = async () => {
    if (images.length === 0) {
      toast.error('请先添加图片');
      return;
    }

    setIsProcessing(true);
    const format = OUTPUT_FORMATS.find(f => f.value === outputSettings.format)!;
    
    const taskId = startTask(
      'imageFormatConvert', 
      `${images.length} 张图片`, 
      images.map(i => i.inputPath).join(', '), 
      outputPath || '浏览器下载'
    );
    setCurrentTaskId(taskId);
    
    addTaskLog(taskId, `[info] 开始转换 ${images.length} 张图片`);
    addTaskLog(taskId, `[info] 输出格式: ${format.label}`);
    addTaskLog(taskId, `[info] 质量: ${outputSettings.quality}%`);
    if (outputSettings.resize) {
      addTaskLog(taskId, `[info] 尺寸: ${outputSettings.resizeWidth}×${outputSettings.resizeHeight}`);
    }

    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const progress = ((i + 1) / images.length) * 100;
        updateTaskProgress(taskId, progress);
        addTaskLog(taskId, `[info] 处理: ${image.name}`);
        
        try {
          await convertSingleImage(image, taskId);
          successCount++;
          addTaskLog(taskId, `[done] ✅ ${image.name} 转换成功`);
        } catch (error) {
          failCount++;
          addTaskLog(taskId, `[error] ❌ ${image.name} 转换失败: ${error}`);
        }
      }
      
      updateTaskProgress(taskId, 100);
      
      if (failCount === 0) {
        addTaskLog(taskId, `[done] ✅ 全部 ${successCount} 张图片转换完成`);
        completeTask(taskId, true);
        toast.success(`成功转换 ${successCount} 张图片`);
      } else {
        addTaskLog(taskId, `[info] 完成: ${successCount} 成功, ${failCount} 失败`);
        completeTask(taskId, failCount < images.length, `${failCount} 张图片转换失败`);
        toast.warning(`${successCount} 张成功, ${failCount} 张失败`);
      }
    } catch (error) {
      console.error('转换失败:', error);
      addTaskLog(taskId, `[error] ❌ 转换失败: ${error}`);
      completeTask(taskId, false, String(error));
      toast.error('转换失败');
    } finally {
      setIsProcessing(false);
      setCurrentTaskId(null);
    }
  };

  const convertSingleImage = async (image: ImageFile, taskId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (outputSettings.resize) {
          if (outputSettings.maintainAspectRatio) {
            const ratio = img.width / img.height;
            if (ratio > outputSettings.resizeWidth / outputSettings.resizeHeight) {
              width = outputSettings.resizeWidth;
              height = width / ratio;
            } else {
              height = outputSettings.resizeHeight;
              width = height * ratio;
            }
          } else {
            width = outputSettings.resizeWidth;
            height = outputSettings.resizeHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const format = OUTPUT_FORMATS.find(f => f.value === outputSettings.format)!;
        const quality = outputSettings.quality / 100;

        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('转换失败'));
            return;
          }

          const outputFilePath = getOutputFilePath(image);

          if (isElectronEnv && outputPath && window.electronAPI?.file?.writeFile) {
            try {
              const reader = new FileReader();
              reader.onload = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                const result = await window.electronAPI.file.writeFile(outputFilePath, uint8Array);
                
                if (result.success) {
                  addTaskLog(taskId, `[info] 保存到: ${outputFilePath}`);
                  resolve();
                } else {
                  reject(new Error(result.error));
                }
              };
              reader.readAsArrayBuffer(blob);
            } catch (error) {
              reject(error);
            }
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
            resolve();
          }
        }, format.mime, quality);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = image.preview;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const selectedFormat = OUTPUT_FORMATS.find(f => f.value === outputSettings.format);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>图片格式转换</h2>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-color)' }}
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>图片导入</span>
              </div>
              {images.length > 0 && (
                <button
                  onClick={clearAllImages}
                  className="text-[10px] px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--error-color)' }}
                >
                  清空全部
                </button>
              )}
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:border-opacity-60"
              style={{ borderColor: 'var(--primary-color)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Plus className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                拖拽图片到此处或点击选择
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                支持 PNG, JPG, WebP, BMP, GIF 等格式
              </p>
            </div>
            {images.length > 0 && (
              <div className="mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                已添加 {images.length} 张图片
              </div>
            )}
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>输出格式</span>
            </div>
            <div className="space-y-2">
              {OUTPUT_FORMATS.map(format => (
                <button
                  key={format.value}
                  onClick={() => setOutputSettings(prev => ({ ...prev, format: format.value }))}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: outputSettings.format === format.value ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    border: `1px solid ${outputSettings.format === format.value ? 'var(--primary-color)' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {outputSettings.format === format.value && (
                      <Check className="w-3.5 h-3.5" style={{ color: 'var(--primary-color)' }} />
                    )}
                    <div className="text-left">
                      <div className="text-xs font-medium" style={{ color: outputSettings.format === format.value ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                        {format.label}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {format.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>质量控制</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {outputSettings.quality}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={outputSettings.quality}
              onChange={e => setOutputSettings(prev => ({ ...prev, quality: Number(e.target.value) }))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              <span>低质量/小文件</span>
              <span>高质量/大文件</span>
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>调整尺寸</span>
              <button
                onClick={() => setOutputSettings(prev => ({ ...prev, resize: !prev.resize }))}
                className={`w-10 h-5 rounded-full transition-colors ${outputSettings.resize ? 'bg-blue-500' : ''}`}
                style={{ backgroundColor: outputSettings.resize ? 'var(--primary-color)' : 'var(--bg-tertiary)' }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: outputSettings.resize ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
            {outputSettings.resize && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>宽度</label>
                  <input
                    type="number"
                    value={outputSettings.resizeWidth}
                    onChange={e => setOutputSettings(prev => ({ ...prev, resizeWidth: Number(e.target.value) }))}
                    className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>px</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>高度</label>
                  <input
                    type="number"
                    value={outputSettings.resizeHeight}
                    onChange={e => setOutputSettings(prev => ({ ...prev, resizeHeight: Number(e.target.value) }))}
                    className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>px</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outputSettings.maintainAspectRatio}
                    onChange={e => setOutputSettings(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>保持宽高比</span>
                </label>
              </div>
            )}
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
                placeholder="留空则使用原文件名"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
              />
              <span
                className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
              >
                .{selectedFormat?.value}
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
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>图片列表</span>
              {images.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  共 {images.length} 张，总大小 {formatFileSize(images.reduce((sum, img) => sum + img.size, 0))}
                </span>
              )}
            </div>

            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ImageIcon className="w-16 h-16 mb-3" style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  请先添加要转换的图片
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-auto">
                {images.map(image => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group rounded-lg overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-32 object-cover"
                    />
                    <div
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <button
                        onClick={() => removeImage(image.id)}
                        className="p-2 rounded-full bg-red-500 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {image.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{image.width}×{image.height}</span>
                        <span>{formatFileSize(image.size)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div
                className="mt-3 p-2 rounded-lg flex items-center gap-2"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--primary-color)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {outputPath 
                    ? `转换后的图片将保存到: ${outputPath}` 
                    : '转换后的图片将自动下载到浏览器默认下载位置。'}
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
                  输出设置
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  格式: {selectedFormat?.label} | 质量: {outputSettings.quality}%
                  {outputSettings.resize && ` | 尺寸: ${outputSettings.resizeWidth}×${outputSettings.resizeHeight}`}
                </span>
              </div>
              <button
                onClick={convertImages}
                disabled={images.length === 0 || isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--primary-color), #2563eb)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                }}
              >
                <Download className="w-4 h-4" />
                {isProcessing ? '转换中...' : `转换 ${images.length} 张图片`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
