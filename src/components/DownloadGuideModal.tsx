import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Download, Terminal, CheckCircle, AlertCircle, ChevronRight, BookOpen, Cpu, Video, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface TutorialStep {
  title: string;
  description: string;
  command?: string;
  link?: string;
  linkText?: string;
  tips?: string[];
}

interface TutorialSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  downloadUrl: string;
  downloadText: string;
  steps: TutorialStep[];
  features: string[];
}

const tutorials: TutorialSection[] = [
  {
    id: 'ollama',
    title: 'Ollama 安装教程',
    icon: <Cpu size={24} />,
    description: 'Ollama 是一个强大的本地大模型运行工具，支持多种开源大语言模型',
    downloadUrl: 'https://ollama.com/download',
    downloadText: '访问 Ollama 官网下载',
    features: [
      '支持多种开源大模型（Llama、Mistral、Qwen等）',
      '本地运行，数据安全隐私',
      '简单易用的命令行工具',
      '支持 GPU 加速推理'
    ],
    steps: [
      {
        title: '步骤一：下载安装包',
        description: '访问 Ollama 官网，根据您的操作系统下载对应的安装包',
        link: 'https://ollama.com/download',
        linkText: '前往下载页面',
        tips: [
          'Windows 用户下载 .exe 安装包',
          'macOS 用户下载 .dmg 安装包',
          'Linux 用户可使用命令行安装'
        ]
      },
      {
        title: '步骤二：运行安装程序',
        description: '双击下载的安装包，按照提示完成安装',
        tips: [
          'Windows 用户可能需要管理员权限',
          '安装完成后会自动添加到系统环境变量'
        ]
      },
      {
        title: '步骤三：验证安装',
        description: '打开终端，运行以下命令验证安装是否成功',
        command: 'ollama --version'
      },
      {
        title: '步骤四：下载模型',
        description: '使用以下命令下载您需要的模型',
        command: 'ollama pull llama3.2',
        tips: [
          '常用模型：llama3.2、mistral、qwen2.5、deepseek-r1',
          '模型大小不同，下载时间会有差异',
          '首次运行会自动下载模型'
        ]
      },
      {
        title: '步骤五：运行模型',
        description: '下载完成后，即可与模型进行对话',
        command: 'ollama run llama3.2',
        tips: [
          '输入 /bye 退出对话',
          '输入 /help 查看更多命令'
        ]
      }
    ]
  },
  {
    id: 'ffmpeg',
    title: 'FFmpeg 安装教程',
    icon: <Video size={24} />,
    description: 'FFmpeg 是一款强大的音视频处理工具，支持格式转换、剪辑、压缩等功能',
    downloadUrl: 'https://ffmpeg.org/download.html',
    downloadText: '访问 FFmpeg 官网下载',
    features: [
      '支持几乎所有音视频格式转换',
      '强大的视频剪辑和合并功能',
      '支持视频压缩和优化',
      '丰富的滤镜和特效处理'
    ],
    steps: [
      {
        title: '步骤一：下载 FFmpeg',
        description: '访问 FFmpeg 官网或第三方构建站下载',
        link: 'https://www.gyan.dev/ffmpeg/builds/',
        linkText: 'Windows 构建版本下载',
        tips: [
          '推荐下载 "ffmpeg-release-essentials.zip"',
          '该版本包含常用功能，体积较小',
          'macOS 用户可使用 Homebrew 安装'
        ]
      },
      {
        title: '步骤二：解压文件',
        description: '将下载的压缩包解压到您希望安装的目录',
        tips: [
          '建议解压到 C:\\ffmpeg 或类似简短路径',
          '避免路径中包含中文或空格'
        ]
      },
      {
        title: '步骤三：配置环境变量',
        description: '将 FFmpeg 的 bin 目录添加到系统环境变量',
        command: 'setx PATH "%PATH%;C:\\ffmpeg\\bin"',
        tips: [
          'Windows: 右键"此电脑" → 属性 → 高级系统设置 → 环境变量',
          '在 Path 变量中添加 FFmpeg 的 bin 目录路径',
          'macOS/Linux: 编辑 ~/.bashrc 或 ~/.zshrc'
        ]
      },
      {
        title: '步骤四：验证安装',
        description: '重新打开终端，运行以下命令验证安装',
        command: 'ffmpeg -version',
        tips: [
          '如果显示版本信息，说明安装成功',
          '如果提示找不到命令，请检查环境变量配置'
        ]
      },
      {
        title: '步骤五：常用命令示例',
        description: '以下是一些常用的 FFmpeg 命令',
        tips: [
          '格式转换：ffmpeg -i input.mp4 output.avi',
          '压缩视频：ffmpeg -i input.mp4 -crf 28 output.mp4',
          '提取音频：ffmpeg -i video.mp4 -vn -acodec copy audio.aac',
          '裁剪视频：ffmpeg -i input.mp4 -ss 00:01:00 -t 10 -c copy output.mp4'
        ]
      }
    ]
  }
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all hover:bg-white/10"
      style={{ color: 'var(--text-tertiary)' }}
      title="复制命令"
    >
      {copied ? <Check size={14} style={{ color: 'var(--success-color)' }} /> : <Copy size={14} />}
    </button>
  );
}

function TutorialCard({ section, isExpanded, onToggle }: { 
  section: TutorialSection; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const toast = useToast();

  const handleOpenLink = (url: string) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
    toast.info('正在打开外部链接...');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ 
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)'
      }}
    >
      <div 
        className="p-5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--primary-light)' }}
          >
            <span style={{ color: 'var(--primary-color)' }}>{section.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {section.title}
              </h3>
              <ChevronRight 
                size={18} 
                style={{ 
                  color: 'var(--text-tertiary)',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {section.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {section.features.slice(0, 2).map((feature, idx) => (
                <span 
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-md"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  {feature}
                </span>
              ))}
              {section.features.length > 2 && (
                <span 
                  className="text-[11px] px-2 py-0.5 rounded-md"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  +{section.features.length - 2}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenLink(section.downloadUrl);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 shrink-0"
            style={{ 
              backgroundColor: 'var(--primary-color)',
              color: 'white'
            }}
          >
            <ExternalLink size={14} />
            官网
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-5 pb-5">
              <div 
                className="h-px mb-4"
                style={{ backgroundColor: 'var(--border-color)' }}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BookOpen size={14} style={{ color: 'var(--primary-color)' }} />
                    安装步骤
                  </h4>
                  <div className="space-y-3">
                    {section.steps.map((step, idx) => (
                      <div 
                        key={idx}
                        className="relative pl-7"
                      >
                        <div 
                          className="absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ 
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary-color)'
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <h5 className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                            {step.title}
                          </h5>
                          <p className="text-[11px] mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {step.description}
                          </p>
                          {step.command && (
                            <div 
                              className="relative rounded-lg p-2 mb-1.5 font-mono text-[11px]"
                              style={{ 
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-light)'
                              }}
                            >
                              <Terminal size={12} className="inline mr-1.5" style={{ color: 'var(--success-color)' }} />
                              {step.command}
                              <CopyButton text={step.command} />
                            </div>
                          )}
                          {step.link && (
                            <button
                              onClick={() => handleOpenLink(step.link!)}
                              className="flex items-center gap-1 text-[11px] font-medium transition-colors"
                              style={{ color: 'var(--primary-color)' }}
                            >
                              <ExternalLink size={10} />
                              {step.linkText}
                            </button>
                          )}
                          {step.tips && step.tips.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {step.tips.map((tip, tipIdx) => (
                                <div 
                                  key={tipIdx}
                                  className="flex items-start gap-1.5 text-[11px]"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  <AlertCircle size={10} className="shrink-0 mt-0.5" style={{ color: 'var(--warning-color)' }} />
                                  <span>{tip}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle size={14} style={{ color: 'var(--success-color)' }} />
                    主要特性
                  </h4>
                  <div className="space-y-1.5">
                    {section.features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        <CheckCircle size={14} style={{ color: 'var(--success-color)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div 
                    className="mt-4 p-3 rounded-xl"
                    style={{ 
                      backgroundColor: 'var(--primary-light)',
                      border: '1px solid var(--primary-color)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Download size={14} style={{ color: 'var(--primary-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary-color)' }}>
                        快速下载
                      </span>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                      点击下方按钮访问官方网站获取最新版本
                    </p>
                    <button
                      onClick={() => handleOpenLink(section.downloadUrl)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                      style={{ 
                        backgroundColor: 'var(--primary-color)',
                        color: 'white'
                      }}
                    >
                      <ExternalLink size={14} />
                      {section.downloadText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface DownloadGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadGuideModal({ isOpen, onClose }: DownloadGuideModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toast = useToast();

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenLink = (url: string) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
    toast.info('正在打开外部链接...');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'var(--primary-light)' }}
              >
                <Download size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  下载安装指南
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  帮助您快速安装和配置 Ollama 与 FFmpeg
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {tutorials.map((section) => (
                <TutorialCard
                  key={section.id}
                  section={section}
                  isExpanded={expandedId === section.id}
                  onToggle={() => handleToggle(section.id)}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-5 rounded-2xl text-center"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <AlertCircle size={20} className="mx-auto mb-2" style={{ color: 'var(--warning-color)' }} />
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                需要帮助？
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                如果您在安装过程中遇到问题，可以查阅官方文档或搜索相关教程
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => handleOpenLink('https://ollama.com/docs')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <BookOpen size={14} />
                  Ollama 文档
                </button>
                <button
                  onClick={() => handleOpenLink('https://ffmpeg.org/documentation.html')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <BookOpen size={14} />
                  FFmpeg 文档
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
