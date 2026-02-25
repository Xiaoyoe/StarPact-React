import { TextContrastStorage as TextContrastStorageInstance, type SavedFile, type AutoSaveData } from '@/services/storage/TextContrastStorage';

export const TextContrastStorage = TextContrastStorageInstance;
export const isValidSaveName = TextContrastStorageInstance.isValidSaveName.bind(TextContrastStorageInstance);
export type { SavedFile, AutoSaveData };
