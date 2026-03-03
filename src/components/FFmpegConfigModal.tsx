import { useState, useEffect } from 'react';
import { X, FolderOpen, CheckCircle, AlertCircle, Loader2, Terminal, FolderSync, Info, FolderOutput } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ffmpegConfigStorage, type FFmpegConfig } from '@/services/storage/FFmpegConfigStorage';
import { useToast } from '@/components/Toast';

interface FFmpegConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FFmpegConfigModal({ isOpen, onClose }: FFmpegConfigModalProps) {
  const [config, setConfig] = useState<FFmpegConfig>({
    binPath: '',
    ffmpegPath: '',
    ffprobePath: '',
    ffplayPath: '',
    outputPath: '',
    lastChecked: 0,
    isValid: false,
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<'success' | 'error' | null>(null);
  const [isEditingBinPath, setIsEditingBinPath] = useState(false);
  const [isEditingOutputPath, setIsEditingOutputPath] = useState(false);
  const [tempBinPath, setTempBinPath] = useState('');
  const [tempOutputPath, setTempOutputPath] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    await ffmpegConfigStorage.ready();
    const savedConfig = ffmpegConfigStorage.getConfig();
    setConfig(savedConfig);
    setDetectResult(savedConfig.isValid ? 'success' : null);
  };

  const handleDetect = async () => {
    if (!config.binPath) {
      toast.error('请先选择 FFmpeg bin 目录');
      return;
    }

    setIsDetecting(true);
    setDetectResult(null);

    try {
      const isValid = validateFFmpeg(config.binPath);
      
      if (isValid) {
        setDetectResult('success');
        setConfig(prev => ({ ...prev, isValid: true, lastChecked: Date.now() }));
        await ffmpegConfigStorage.updateConfig({ isValid: true, lastChecked: Date.now() });
        toast.success('FFmpeg 配置有效！');
      } else {
        setDetectResult('error');
        setConfig(prev => ({ ...prev, isValid: false }));
        await ffmpegConfigStorage.setValid(false);
        toast.error('FFmpeg 路径无效，请检查');
      }
    } catch (error) {
      setDetectResult('error');
      toast.error('检测失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsDetecting(false);
    }
  };

  const validateFFmpeg = (binPath: string): boolean => {
    const path = binPath.replace(/\\/g, '/');
    return path.includes('bin') && 
           (path.includes('ffmpeg') || path.toLowerCase().includes('ffmpeg'));
  };

  const handleSelectBinFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.file?.selectFolder) {
      const result = await window.electronAPI.file.selectFolder({
        title: '选择 FFmpeg bin 目录',
      });

      if (result && result.success && result.path) {
        const newConfig = await ffmpegConfigStorage.setBinPath(result.path);
        setConfig(newConfig);
        setDetectResult(null);
        toast.success('已选择 FFmpeg bin 目录');
      }
    } else {
      setIsEditingBinPath(true);
      setTempBinPath(config.binPath);
    }
  };

  const handleSaveBinPath = async () => {
    if (tempBinPath.trim()) {
      const newConfig = await ffmpegConfigStorage.setBinPath(tempBinPath.trim());
      setConfig(newConfig);
      setDetectResult(null);
      toast.success('已保存 FFmpeg bin 目录');
    }
    setIsEditingBinPath(false);
  };

  const handleSelectOutputFolder = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.file?.selectFolder) {
      const result = await window.electronAPI.file.selectFolder({
        title: '选择输出目录',
        defaultPath: config.outputPath || undefined,
      });

      if (result && result.success && result.path) {
        await ffmpegConfigStorage.setOutputPath(result.path);
        setConfig(prev => ({ ...prev, outputPath: result.path! }));
        toast.success('已设置输出目录');
      }
    } else {
      setIsEditingOutputPath(true);
      setTempOutputPath(config.outputPath);
    }
  };

  const handleSaveOutputPath = async () => {
    if (tempOutputPath.trim()) {
      await ffmpegConfigStorage.setOutputPath(tempOutputPath.trim());
      setConfig(prev => ({ ...prev, outputPath: tempOutputPath.trim() }));
      toast.success('已保存输出目录');
    }
    setIsEditingOutputPath(false);
  };

  const handleReset = async () => {
    await ffmpegConfigStorage.reset();
    setConfig(ffmpegConfigStorage.getConfig());
    setDetectResult(null);
    toast.success('已重置配置');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-[560px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ 
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center justify-center w-9 h-9 rounded-xl"
                  style={{ backgroundColor: 'var(--primary-light)' }}
                >
                  <Terminal className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    FFmpeg 配置
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    选择 bin 目录，自动识别三个 exe 文件
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:opacity-70"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FolderSync className="w-4 h-4" style={{ color: 'var(--primary-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    FFmpeg bin 目录
                  </span>
                </div>
                
                {isEditingBinPath ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tempBinPath}
                      onChange={(e) => setTempBinPath(e.target.value)}
                      placeholder="请输入 FFmpeg bin 目录的完整路径"
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--primary-color)',
                        color: 'var(--text-primary)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveBinPath}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setIsEditingBinPath(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.binPath}
                      readOnly
                      placeholder="请选择 FFmpeg bin 目录"
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      onClick={handleSelectBinFolder}
                    />
                    <button
                      onClick={handleSelectBinFolder}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {window.electronAPI?.file?.selectFolder ? '选择目录' : '编辑'}
                    </button>
                  </div>
                )}
              </div>

              {config.binPath && (
                <div 
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4" style={{ color: 'var(--success-color)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      自动识别的文件
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full ${config.ffmpegPath ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        ffmpeg.exe
                      </span>
                    </div>
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full ${config.ffprobePath ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        ffprobe.exe
                      </span>
                    </div>
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-primary)' }}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full ${config.ffplayPath ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                        ffplay.exe
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div 
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FolderOutput className="w-4 h-4" style={{ color: 'var(--warning-color)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    输出目录
                  </span>
                </div>
                
                {isEditingOutputPath ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tempOutputPath}
                      onChange={(e) => setTempOutputPath(e.target.value)}
                      placeholder="请输入输出目录的完整路径"
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--warning-color)',
                        color: 'var(--text-primary)',
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveOutputPath}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                        style={{ backgroundColor: 'var(--warning-color)' }}
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setIsEditingOutputPath(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={config.outputPath}
                      readOnly
                      placeholder="请选择输出目录（默认为源文件所在目录）"
                      className="flex-1 rounded-lg px-3 py-2 text-xs outline-none cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      onClick={handleSelectOutputFolder}
                    />
                    <button
                      onClick={handleSelectOutputFolder}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {window.electronAPI?.file?.selectFolder ? '选择目录' : '编辑'}
                    </button>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                  转换后的文件将保存到此目录，如未设置则保存到源文件所在目录
                </p>
              </div>

              {detectResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                    detectResult === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                  style={{ 
                    border: `1px solid ${detectResult === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
                  }}
                >
                  {detectResult === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">FFmpeg 配置有效，可以正常使用媒体工具</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">FFmpeg 路径无效，请检查目录是否正确</span>
                    </>
                  )}
                </motion.div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleDetect}
                  disabled={isDetecting || !config.binPath}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)' }}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      检测中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      检测配置
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  重置
                </button>
              </div>

              <div 
                className="rounded-lg p-3"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  💡 提示：选择 FFmpeg 的 bin 目录，系统会自动识别 ffmpeg.exe、ffprobe.exe、ffplay.exe 三个文件。
                  <br />
                  <a 
                    href="https://ffmpeg.org/download.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--primary-color)' }}
                  >
                    点击前往 FFmpeg 官网下载
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
