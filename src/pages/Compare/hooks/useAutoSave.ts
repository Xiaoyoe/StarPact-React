import { useState, useEffect, useCallback, useRef } from 'react';
import { TextContrastStorage } from '../utils/storage';

export interface UseAutoSaveReturn {
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  loadSavedContent: () => Promise<{ left: string; right: string } | null>;
  saveContent: (left: string, right: string) => Promise<void>;
}

export function useAutoSave(
  leftText: string,
  rightText: string,
  onSave?: () => void
): UseAutoSaveReturn {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const isInitialized = useRef(false);

  const loadSavedContent = useCallback(async (): Promise<{ left: string; right: string } | null> => {
    const data = await TextContrastStorage.loadAutoSave();
    if (data) {
      return { left: data.left, right: data.right };
    }
    return null;
  }, []);

  const saveContent = useCallback(async (left: string, right: string) => {
    await TextContrastStorage.saveAutoSave(left, right);
    onSave?.();
  }, [onSave]);

  useEffect(() => {
    if (!autoSaveEnabled) return;

    const interval = setInterval(async () => {
      await TextContrastStorage.saveAutoSave(leftText, rightText);
      onSave?.();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoSaveEnabled, leftText, rightText, onSave]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
  }, []);

  return {
    autoSaveEnabled,
    setAutoSaveEnabled,
    loadSavedContent,
    saveContent,
  };
}
