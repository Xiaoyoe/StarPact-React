import { useState, useCallback, useEffect } from 'react';
import {
  TextContrastStorage,
  type SavedFile,
} from '../utils/storage';
import {
  extractFromContent,
  getTimestamp,
} from '@/utils/diffEngine';

export interface UseSavedFilesReturn {
  savedFiles: SavedFile[];
  saveFile: (side: 'left' | 'right', content: string, customName?: string) => Promise<string>;
  loadFile: (file: SavedFile) => string;
  deleteFile: (id: string) => Promise<void>;
}

export function useSavedFiles(): UseSavedFilesReturn {
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);

  useEffect(() => {
    const loadFiles = async () => {
      const files = await TextContrastStorage.loadSavesIndex();
      setSavedFiles(files);
    };
    loadFiles();
  }, []);

  const saveFile = useCallback(async (side: 'left' | 'right', content: string, customName?: string): Promise<string> => {
    const fromContent = extractFromContent(content);
    const defaultName = fromContent || (side === 'left' ? '左侧内容' : '右侧内容');
    const name = customName || `${defaultName}_${getTimestamp()}`;

    const file: SavedFile = {
      id: `compare_${getTimestamp()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      content,
      side,
      timestamp: new Date().toISOString(),
    };

    const newSaves = [...savedFiles, file];
    setSavedFiles(newSaves);
    await TextContrastStorage.persistSavesIndex(newSaves);

    return name;
  }, [savedFiles]);

  const loadFile = useCallback((file: SavedFile): string => {
    return file.content;
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    const newSaves = savedFiles.filter(f => f.id !== id);
    setSavedFiles(newSaves);
    await TextContrastStorage.persistSavesIndex(newSaves);
  }, [savedFiles]);

  return {
    savedFiles,
    saveFile,
    loadFile,
    deleteFile,
  };
}
