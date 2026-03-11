import { useRef, useCallback, useEffect, useState } from 'react';

interface StreamingContentOptions {
  throttleMs?: number;
  onUpdate?: (content: string, thinking?: string) => void;
}

export function useStreamingContent(options: StreamingContentOptions = {}) {
  const { throttleMs = 50, onUpdate } = options;
  
  const contentRef = useRef('');
  const thinkingRef = useRef('');
  const pendingUpdateRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  
  const [displayContent, setDisplayContent] = useState('');
  const [displayThinking, setDisplayThinking] = useState('');
  
  const flushUpdate = useCallback(() => {
    if (pendingUpdateRef.current) {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      if (timeSinceLastUpdate >= throttleMs) {
        setDisplayContent(contentRef.current);
        setDisplayThinking(thinkingRef.current);
        onUpdate?.(contentRef.current, thinkingRef.current);
        lastUpdateTimeRef.current = now;
        pendingUpdateRef.current = false;
      } else {
        animationFrameRef.current = requestAnimationFrame(flushUpdate);
      }
    }
  }, [throttleMs, onUpdate]);
  
  const appendContent = useCallback((token: string) => {
    contentRef.current += token;
    pendingUpdateRef.current = true;
    
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(flushUpdate);
    }
  }, [flushUpdate]);
  
  const appendThinking = useCallback((content: string) => {
    thinkingRef.current += content;
    pendingUpdateRef.current = true;
    
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(flushUpdate);
    }
  }, [flushUpdate]);
  
  const setContent = useCallback((content: string) => {
    contentRef.current = content;
    setDisplayContent(content);
    pendingUpdateRef.current = false;
  }, []);
  
  const setThinking = useCallback((thinking: string) => {
    thinkingRef.current = thinking;
    setDisplayThinking(thinking);
    pendingUpdateRef.current = false;
  }, []);
  
  const reset = useCallback(() => {
    contentRef.current = '';
    thinkingRef.current = '';
    setDisplayContent('');
    setDisplayThinking('');
    pendingUpdateRef.current = false;
    lastUpdateTimeRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return {
    displayContent,
    displayThinking,
    appendContent,
    appendThinking,
    setContent,
    setThinking,
    reset,
    rawContent: contentRef,
    rawThinking: thinkingRef,
  };
}

export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      pendingArgsRef.current = args;
      
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          if (pendingArgsRef.current) {
            lastCallRef.current = Date.now();
            callback(...pendingArgsRef.current);
            pendingArgsRef.current = null;
          }
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    }
  }, [callback, delay]) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledCallback;
}

export function useBatchedUpdates() {
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
  const flushScheduledRef = useRef(false);
  const [, forceUpdate] = useState({});
  
  const scheduleFlush = useCallback(() => {
    if (!flushScheduledRef.current) {
      flushScheduledRef.current = true;
      requestAnimationFrame(() => {
        pendingUpdatesRef.current.clear();
        flushScheduledRef.current = false;
        forceUpdate({});
      });
    }
  }, []);
  
  const batchUpdate = useCallback((key: string, value: any) => {
    pendingUpdatesRef.current.set(key, value);
    scheduleFlush();
  }, [scheduleFlush]);
  
  return { batchUpdate };
}
