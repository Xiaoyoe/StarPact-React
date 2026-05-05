import { ref } from 'vue';

interface ToastOptions {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

const toasts = ref<ToastOptions[]>([]);

export function useToast() {
  const show = (options: ToastOptions) => {
    toasts.value.push(options);
    
    setTimeout(() => {
      const index = toasts.value.indexOf(options);
      if (index !== -1) {
        toasts.value.splice(index, 1);
      }
    }, options.duration || 3000);
  };

  return {
    info: (message: string) => show({ message, type: 'info' }),
    success: (message: string) => show({ message, type: 'success' }),
    warning: (message: string) => show({ message, type: 'warning' }),
    error: (message: string) => show({ message, type: 'error' }),
  };
}
