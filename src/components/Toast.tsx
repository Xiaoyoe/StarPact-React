import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useStore, generateId } from '@/store';

// Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left' | 'center';

export interface ToastOptions {
  duration?: number;
  position?: ToastPosition;
  type?: ToastType;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  duration: number;
  position: ToastPosition;
}

export interface ToastContextType {
  show: (text: string, options?: ToastOptions) => void;
  success: (text: string, options?: Omit<ToastOptions, 'type'>) => void;
  error: (text: string, options?: Omit<ToastOptions, 'type'>) => void;
  info: (text: string, options?: Omit<ToastOptions, 'type'>) => void;
  warning: (text: string, options?: Omit<ToastOptions, 'type'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// Defaults
const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = 'top-right';
const DEFAULT_TYPE: ToastType = 'info';

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Position styles
const getPositionStyles = (position: ToastPosition) => {
  switch (position) {
    case 'top-right':
      return { top: 16, right: 16 };
    case 'top-center':
      return { top: 16, left: '50%', transform: 'translateX(-50%)' };
    case 'top-left':
      return { top: 16, left: 16 };
    case 'bottom-right':
      return { bottom: 16, right: 16 };
    case 'bottom-center':
      return { bottom: 16, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-left':
      return { bottom: 16, left: 16 };
    case 'center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    default:
      return { top: 16, right: 16 };
  }
};

// Get icon component based on type
const getIconComponent = (type: ToastType) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

// Toast Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const messageRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const addLog = useStore((state) => state.addLog);

  // Remove toast by ID
  const removeToast = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
    if (messageRefs.current[id]) {
      clearTimeout(messageRefs.current[id]);
      delete messageRefs.current[id];
    }
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setMessages([]);
    Object.values(messageRefs.current).forEach(timeout => clearTimeout(timeout));
    messageRefs.current = {};
  }, []);

  // Show toast
  const showToast = useCallback((text: string, options: ToastOptions = {}) => {
    const {
      duration = DEFAULT_DURATION,
      position = DEFAULT_POSITION,
      type = DEFAULT_TYPE
    } = options;

    // Check for duplicate messages
    const isDuplicate = messages.some(msg => 
      msg.text === text && msg.type === type && msg.position === position
    );
    if (isDuplicate) return;

    const id = generateId();
    const newMessage: ToastMessage = {
      id,
      text,
      type,
      duration,
      position
    };

    setMessages(prev => [...prev, newMessage]);

    // Sync to logs
    const logLevel = type === 'success' ? 'info' : type === 'warning' ? 'warn' : type;
    addLog({
      id: generateId(),
      level: logLevel as 'info' | 'warn' | 'error' | 'debug',
      message: text,
      timestamp: Date.now(),
      module: 'Toast'
    });

    // Set timeout to remove
    const timeout = setTimeout(() => {
      removeToast(id);
    }, duration);

    messageRefs.current[id] = timeout;

    return id;
  }, [messages, removeToast, addLog]);

  // Type-specific methods
  const success = useCallback((text: string, options?: Omit<ToastOptions, 'type'>) => {
    return showToast(text, { ...options, type: 'success' });
  }, [showToast]);

  const error = useCallback((text: string, options?: Omit<ToastOptions, 'type'>) => {
    return showToast(text, { ...options, type: 'error' });
  }, [showToast]);

  const info = useCallback((text: string, options?: Omit<ToastOptions, 'type'>) => {
    return showToast(text, { ...options, type: 'info' });
  }, [showToast]);

  const warning = useCallback((text: string, options?: Omit<ToastOptions, 'type'>) => {
    return showToast(text, { ...options, type: 'warning' });
  }, [showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(messageRefs.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const contextValue: ToastContextType = {
    show: showToast,
    success,
    error,
    info,
    warning,
    remove: removeToast,
    clear: clearToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer messages={messages} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container
function ToastContainer({ messages, onRemove }: { messages: ToastMessage[]; onRemove: (id: string) => void }) {
  // Group messages by position
  const messagesByPosition = messages.reduce((acc, message) => {
    if (!acc[message.position]) {
      acc[message.position] = [];
    }
    acc[message.position].push(message);
    return acc;
  }, {} as Record<ToastPosition, ToastMessage[]>);

  return (
    <>
      {Object.entries(messagesByPosition).map(([position, positionMessages]) => (
        <div
          key={position}
          style={{
            position: 'fixed',
            ...getPositionStyles(position as ToastPosition),
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none'
          }}
        >
          <AnimatePresence>
            {positionMessages.map((message) => {
              const IconComp = getIconComponent(message.type);
              const getStyleKeys = () => {
                switch (message.type) {
                  case 'success':
                    return { bg: '--toast-success-bg', text: '--toast-success-text', border: '--toast-success-border' };
                  case 'error':
                    return { bg: '--toast-error-bg', text: '--toast-error-text', border: '--toast-error-border' };
                  case 'warning':
                    return { bg: '--toast-warning-bg', text: '--toast-warning-text', border: '--toast-warning-border' };
                  default:
                    return { bg: '--toast-info-bg', text: '--toast-info-text', border: '--toast-info-border' };
                }
              };
              const styleKeys = getStyleKeys();

              // Animation variants based on position
              const getVariants = () => {
                switch (message.position) {
                  case 'top-right':
                  case 'bottom-right':
                    return {
                      initial: { opacity: 0, x: 60, scale: 0.95 },
                      animate: { opacity: 1, x: 0, scale: 1 },
                      exit: { opacity: 0, x: 60, scale: 0.95 }
                    };
                  case 'top-left':
                  case 'bottom-left':
                    return {
                      initial: { opacity: 0, x: -60, scale: 0.95 },
                      animate: { opacity: 1, x: 0, scale: 1 },
                      exit: { opacity: 0, x: -60, scale: 0.95 }
                    };
                  case 'top-center':
                    return {
                      initial: { opacity: 0, y: -60, scale: 0.95 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: -60, scale: 0.95 }
                    };
                  case 'bottom-center':
                    return {
                      initial: { opacity: 0, y: 60, scale: 0.95 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: 60, scale: 0.95 }
                    };
                  case 'center':
                    return {
                      initial: { opacity: 0, scale: 0.8 },
                      animate: { opacity: 1, scale: 1 },
                      exit: { opacity: 0, scale: 0.8 }
                    };
                  default:
                    return {
                      initial: { opacity: 0, x: 60, scale: 0.95 },
                      animate: { opacity: 1, x: 0, scale: 1 },
                      exit: { opacity: 0, x: 60, scale: 0.95 }
                    };
                }
              };

              return (
                <motion.div
                  key={message.id}
                  variants={getVariants()}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  onClick={() => onRemove(message.id)}
                  style={{
                    pointerEvents: 'auto',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-lg)',
                    background: `var(${styleKeys.bg})`,
                    color: `var(${styleKeys.text})`,
                    borderLeft: `3px solid var(${styleKeys.border})`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backdropFilter: 'blur(8px)',
                    maxWidth: 340,
                    wordBreak: 'break-word'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <IconComp size={15} />
                  <span>{message.text}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ))}
    </>
  );
}

// Custom hook
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Utility function to create toast instance (for non-hook usage)
export function createToast() {
  let toastContext: ToastContextType | undefined;

  const initialize = (context: ToastContextType) => {
    toastContext = context;
  };

  const show = (text: string, options?: ToastOptions) => {
    if (!toastContext) throw new Error('Toast not initialized');
    return toastContext.show(text, options);
  };

  const success = (text: string, options?: Omit<ToastOptions, 'type'>) => {
    if (!toastContext) throw new Error('Toast not initialized');
    return toastContext.success(text, options);
  };

  const error = (text: string, options?: Omit<ToastOptions, 'type'>) => {
    if (!toastContext) throw new Error('Toast not initialized');
    return toastContext.error(text, options);
  };

  const info = (text: string, options?: Omit<ToastOptions, 'type'>) => {
    if (!toastContext) throw new Error('Toast not initialized');
    return toastContext.info(text, options);
  };

  const warning = (text: string, options?: Omit<ToastOptions, 'type'>) => {
    if (!toastContext) throw new Error('Toast not initialized');
    return toastContext.warning(text, options);
  };

  return {
    initialize,
    show,
    success,
    error,
    info,
    warning
  };
}

export default ToastProvider;