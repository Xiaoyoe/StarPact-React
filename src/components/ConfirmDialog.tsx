import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [cancelHovered, setCancelHovered] = useState(false);
  const [confirmHovered, setConfirmHovered] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.15,
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <AlertTriangle size={18} style={{ color: 'var(--error-color)' }} />
                </motion.div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={onCancel}
                onMouseEnter={() => setCloseHovered(true)}
                onMouseLeave={() => setCloseHovered(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150"
                style={{
                  color: closeHovered ? 'var(--error-color)' : 'var(--text-tertiary)',
                  backgroundColor: closeHovered ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                  transform: closeHovered ? 'scale(1.1) rotate(90deg)' : 'scale(1) rotate(0deg)',
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5"
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-end gap-3 px-5 py-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <motion.button
                onClick={onCancel}
                onMouseEnter={() => setCancelHovered(true)}
                onMouseLeave={() => setCancelHovered(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: cancelHovered ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  transform: cancelHovered ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                onClick={onConfirm}
                onMouseEnter={() => setConfirmHovered(true)}
                onMouseLeave={() => setConfirmHovered(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                style={{
                  color: 'white',
                  backgroundColor: confirmHovered ? '#dc2626' : 'var(--error-color)',
                  transform: confirmHovered ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: confirmHovered ? '0 4px 12px rgba(239, 68, 68, 0.4)' : 'none',
                }}
              >
                {confirmText}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
