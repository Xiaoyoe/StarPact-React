import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, MessageSquare } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      setIsDeleteHovered(false);
      setShowConfirm(false);
    }
  }, [visible]);

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowConfirm(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.92,
      y: -6,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 28,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.92,
      y: -6,
      transition: {
        duration: 0.1,
      },
    },
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={menuRef}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed z-50"
            style={{
              left: x + 24,
              top: y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 8px 32px -8px rgba(0, 0, 0, 0.18)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark, var(--primary-color)) 100%)',
                }}
              >
                <MessageSquare size={14} style={{ color: 'white' }} />
              </div>

              <div className="flex-1 min-w-0 max-w-[140px]">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </div>
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {messageCount} 条消息
                </div>
              </div>

              <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

              <motion.button
                onClick={handleDeleteClick}
                onMouseEnter={() => setIsDeleteHovered(true)}
                onMouseLeave={() => setIsDeleteHovered(false)}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                animate={{
                  backgroundColor: isDeleteHovered ? '#ef4444' : 'transparent',
                  scale: isDeleteHovered ? 1.05 : 1,
                }}
                transition={{ duration: 0.15 }}
                style={{
                  color: isDeleteHovered ? 'white' : 'var(--error-color)',
                }}
              >
                <Trash2 size={15} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showConfirm}
        title="删除对话"
        message={`确定要删除「${title}」吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
