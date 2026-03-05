import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <AlertTriangle size={18} style={{ color: 'var(--error-color)' }} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h3>
              </div>
              <button
                onClick={onCancel}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            </div>

            <div
              className="flex items-center justify-end gap-3 px-5 py-4 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: 'white',
                  backgroundColor: 'var(--error-color)',
                }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
