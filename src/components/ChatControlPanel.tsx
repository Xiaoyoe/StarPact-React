import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useToast } from '@/components/Toast';
import { configStorage } from '@/services/storage/ConfigStorage';
import { Database, Activity, Brain, MessageCircle, Image as ImageIcon, ChevronDown, Settings2, AlertTriangle } from 'lucide-react';

interface ChatControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function ChatControlPanel({ isOpen, onClose, onToggle }: ChatControlPanelProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    showTokenEstimate, setShowTokenEstimate,
    ollamaVerboseMode, setOllamaVerboseMode,
    ollamaThinkMode, setOllamaThinkMode,
    ollamaChatMode, setOllamaChatMode,
    includeImagesInContext, setIncludeImagesInContext,
    deleteConfirmEnabled, setDeleteConfirmEnabled,
  } = useStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const controls = [
    {
      id: 'deleteConfirm',
      icon: AlertTriangle,
      label: '删除确认',
      description: '删除消息前确认',
      checked: deleteConfirmEnabled,
      onChange: () => {
        const newValue = !deleteConfirmEnabled;
        setDeleteConfirmEnabled(newValue);
        configStorage.set('deleteConfirmEnabled', newValue);
        toast.info(newValue ? '已开启删除确认' : '已关闭删除确认', { duration: 2000 });
      },
    },
    {
      id: 'token',
      icon: Database,
      label: 'Token 估算',
      description: '显示对话 token 数',
      checked: showTokenEstimate,
      onChange: () => {
        const newValue = !showTokenEstimate;
        setShowTokenEstimate(newValue);
        configStorage.set('showTokenEstimate', newValue);
        toast.info(newValue ? '已开启 Token 估算显示' : '已关闭 Token 估算显示', { duration: 2000 });
      },
    },
    {
      id: 'verbose',
      icon: Activity,
      label: '详细模式',
      description: '显示性能指标',
      checked: ollamaVerboseMode,
      onChange: () => {
        const newValue = !ollamaVerboseMode;
        setOllamaVerboseMode(newValue);
        configStorage.set('ollamaVerboseMode', newValue);
        toast.info(newValue ? '已开启详细模式' : '已关闭详细模式', { duration: 2000 });
      },
    },
    {
      id: 'think',
      icon: Brain,
      label: '思考模式',
      description: '启用模型思考能力',
      checked: ollamaThinkMode,
      onChange: () => {
        const newValue = !ollamaThinkMode;
        setOllamaThinkMode(newValue);
        configStorage.set('ollamaThinkMode', newValue);
        toast.info(newValue ? '已开启思考模式' : '已关闭思考模式', { duration: 2000 });
      },
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: '对话模式',
      description: ollamaChatMode === 'multi' ? '多轮对话(有记忆)' : '单轮对话(无记忆)',
      checked: ollamaChatMode === 'multi',
      onChange: () => {
        const newMode = ollamaChatMode === 'multi' ? 'single' : 'multi';
        setOllamaChatMode(newMode);
        configStorage.set('ollamaChatMode', newMode);
        toast.info(newMode === 'multi' ? '已切换到多轮对话模式' : '已切换到单轮对话模式', { duration: 2000 });
      },
    },
    {
      id: 'images',
      icon: ImageIcon,
      label: '携带图片',
      description: '多轮对话包含图片',
      checked: includeImagesInContext,
      onChange: () => {
        const newValue = !includeImagesInContext;
        setIncludeImagesInContext(newValue);
        configStorage.set('includeImagesInContext', newValue);
        toast.info(newValue ? '多轮对话将携带图片数据' : '多轮对话将不携带图片数据', { duration: 2000 });
      },
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={onToggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-110"
        style={{
          backgroundColor: isOpen ? 'var(--primary-color)' : 'var(--bg-secondary)',
          color: isOpen ? 'white' : 'var(--text-tertiary)',
          border: '1px solid var(--border-color)',
        }}
        title={isOpen ? '隐藏聊天控制' : '显示聊天控制'}
      >
        <Settings2 size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-full right-0 mb-5 z-50"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                width: '260px',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>聊天控制</span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg transition-colors hover:bg-opacity-80"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {controls.map((control) => (
                  <div
                    key={control.id}
                    className="flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer"
                    style={{
                      backgroundColor: control.checked ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${control.checked ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    }}
                    onClick={control.onChange}
                  >
                    <div className="flex items-center gap-3">
                      <control.icon
                        size={18}
                        style={{ color: control.checked ? 'var(--primary-color)' : 'var(--text-tertiary)' }}
                      />
                      <div>
                        <div
                          className="text-sm font-medium"
                          style={{ color: control.checked ? 'var(--primary-color)' : 'var(--text-primary)' }}
                        >
                          {control.label}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {control.description}
                        </div>
                      </div>
                    </div>
                    <div
                      className="relative w-11 h-6 rounded-full shrink-0"
                      style={{
                        backgroundColor: control.checked 
                          ? 'var(--primary-color)' 
                          : 'var(--bg-tertiary)',
                        boxShadow: control.checked 
                          ? '0 0 8px rgba(59, 130, 246, 0.35)' 
                          : 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                        transition: 'background-color 0.2s, box-shadow 0.2s',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: 'white',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
                          transform: control.checked ? 'translateX(20px)' : 'translateX(0)',
                          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          willChange: 'transform',
                        }}
                      >
                        {control.checked && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            style={{ 
                              animation: 'checkIn 0.15s ease-out forwards',
                            }}
                          >
                            <path
                              d="M1.5 5L4 7.5L8.5 2.5"
                              stroke="var(--primary-color)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
