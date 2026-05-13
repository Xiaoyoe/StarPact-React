import { ref, readonly } from 'vue';

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

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = 'top-right';
const DEFAULT_TYPE: ToastType = 'info';

const messages = ref<ToastMessage[]>([]);
const messageTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const generateId = (): string => {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const removeToast = (id: string) => {
  const timeout = messageTimeouts.get(id);
  if (timeout) {
    clearTimeout(timeout);
    messageTimeouts.delete(id);
  }
  messages.value = messages.value.filter(msg => msg.id !== id);
};

const clearToasts = () => {
  messageTimeouts.forEach(timeout => clearTimeout(timeout));
  messageTimeouts.clear();
  messages.value = [];
};

const showToast = (text: string, options: ToastOptions = {}): string => {
  const {
    duration = DEFAULT_DURATION,
    position = DEFAULT_POSITION,
    type = DEFAULT_TYPE
  } = options;

  const isDuplicate = messages.value.some(msg =>
    msg.text === text && msg.type === type && msg.position === position
  );
  if (isDuplicate) return '';

  const id = generateId();
  const newMessage: ToastMessage = {
    id,
    text,
    type,
    duration,
    position
  };

  messages.value = [...messages.value, newMessage];

  const timeout = setTimeout(() => {
    removeToast(id);
  }, duration);

  messageTimeouts.set(id, timeout);

  return id;
};

export function useToast() {
  return {
    messages: readonly(messages),
    show: (text: string, options?: ToastOptions) => showToast(text, options),
    success: (text: string, options?: Omit<ToastOptions, 'type'>) => showToast(text, { ...options, type: 'success' }),
    error: (text: string, options?: Omit<ToastOptions, 'type'>) => showToast(text, { ...options, type: 'error' }),
    info: (text: string, options?: Omit<ToastOptions, 'type'>) => showToast(text, { ...options, type: 'info' }),
    warning: (text: string, options?: Omit<ToastOptions, 'type'>) => showToast(text, { ...options, type: 'warning' }),
    remove: removeToast,
    clear: clearToasts,
  };
}
