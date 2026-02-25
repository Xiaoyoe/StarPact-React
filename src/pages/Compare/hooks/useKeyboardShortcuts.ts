import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutsConfig {
  onCompare: () => void;
  onSave: () => void;
  onClear: () => void;
  onCloseModal: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig): void {
  const { onCompare, onSave, onClear, onCloseModal, enabled = true } = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd && e.key === 'Enter') {
      e.preventDefault();
      onCompare();
      return;
    }

    if (isCtrlOrCmd && e.key === 's') {
      e.preventDefault();
      onSave();
      return;
    }

    if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      onClear();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onCloseModal();
      return;
    }
  }, [enabled, onCompare, onSave, onClear, onCloseModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
