import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { useToast } from '@/components/Toast';
import { configStorage } from '@/services/storage/ConfigStorage';
import { Activity, Brain, MessageCircle, Image as ImageIcon, AlertTriangle, Settings2, X } from 'lucide-react';

interface ChatControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function ChatControlPanel({ isOpen, onClose, onToggle }: ChatControlPanelProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
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
      checked: deleteConfirmEnabled,
      onChange: () => {
        const newValue = !deleteConfirmEnabled;
        setDeleteConfirmEnabled(newValue);
        configStorage.set('deleteConfirmEnabled', newValue);
        toast.info(newValue ? '已开启删除确认' : '已关闭删除确认', { duration: 2000 });
      },
    },
    {
      id: 'verbose',
      icon: Activity,
      label: '详细模式',
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
      label: '多轮对话',
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
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: isOpen ? 'var(--primary-color)' : 'var(--bg-secondary)',
          color: isOpen ? 'white' : 'var(--text-tertiary)',
          border: '1px solid var(--border-color)',
        }}
        title={isOpen ? '隐藏聊天控制' : '显示聊天控制'}
      >
        <Settings2 size={18} style={{ color: 'inherit' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute bottom-full right-0 mb-3 z-50"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                width: '220px',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>聊天控制</span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md transition-all duration-150 hover:scale-110 hover:bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-2 space-y-1">
                {controls.map((control) => (
                  <motion.div
                    key={control.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 cursor-pointer"
                    style={{
                      backgroundColor: control.checked ? 'var(--primary-light)' : 'var(--bg-secondary)',
                    }}
                    onClick={control.onChange}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: control.checked ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        }}
                      >
                        <control.icon
                          size={14}
                          style={{ color: control.checked ? 'white' : 'var(--text-tertiary)' }}
                        />
                      </div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: control.checked ? 'var(--primary-color)' : 'var(--text-primary)' }}
                      >
                        {control.label}
                      </span>
                    </div>
                    <div
                      className="relative w-9 h-5 rounded-full shrink-0 transition-all duration-200"
                      style={{
                        backgroundColor: control.checked ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: 'white',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                        }}
                        animate={{
                          x: control.checked ? 16 : 2,
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
