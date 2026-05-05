import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useDebounce<T>(value: T, delay: number): Ref<T> {
  const debouncedValue = ref(value) as Ref<T>;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  onMounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      debouncedValue.value = value;
    }, delay);
  });

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return debouncedValue;
}

export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;

  return debounced;
}
