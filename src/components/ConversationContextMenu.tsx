import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, MessageSquare } from 'lucide-react';

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  messageCount: number;
  onDelete: () => void;
  onClose: () => void;
}

export function ConversationContextMenu({
  visible,
  x,
  y,
  title,
  messageCount,
  onDelete,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) {
      setHoveredButton(null);
    }
  }, [visible]);

  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -8,
      transition: {
        duration: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.06,
        type: 'spring',
        stiffness: 500,
        damping: 25,
      },
    }),
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed z-50 w-64 rounded-2xl overflow-hidden"
          style={{
            left: x + 12,
            top: y,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--primary-light)' }}
              >
                <MessageSquare size={16} style={{ color: 'var(--primary-color)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {messageCount} 条消息
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <motion.button
              custom={0}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full relative overflow-hidden rounded-lg group"
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                  opacity: hoveredButton === 'delete' ? 1 : 0,
                }}
              />
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  opacity: hoveredButton === 'delete' ? 1 : 0,
                }}
              />
              <div className="relative flex items-center justify-center gap-2 px-4 py-2.5">
                <Trash2
                  size={15}
                  className="transition-transform duration-200 group-hover:scale-110"
                  style={{ color: 'var(--error-color)' }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--error-color)' }}
                >
                  删除对话
                </span>
              </div>
            </motion.button>

            <motion.button
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              onClick={onClose}
              className="w-full relative overflow-hidden rounded-lg group"
              onMouseEnter={() => setHoveredButton('cancel')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <div
                className="absolute inset-0 transition-opacity duration-200"
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  opacity: hoveredButton === 'cancel' ? 1 : 0,
                }}
              />
              <div className="relative flex items-center justify-center gap-2 px-4 py-2.5">
                <X
                  size={15}
                  className="transition-transform duration-200 group-hover:scale-110"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  取消
                </span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
