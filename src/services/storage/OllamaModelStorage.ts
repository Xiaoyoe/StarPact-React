import { IndexedDBStorage } from './IndexedDBStorage';

export interface OllamaModelFile {
  id: string;
  name: string;
  path: string;
  size?: number;
  addedAt: number;
}

class OllamaModelStorage {
  private storage: IndexedDBStorage;
  private static instance: OllamaModelStorage;

  private constructor() {
    this.storage = IndexedDBStorage.getInstance();
  }

  static getInstance(): OllamaModelStorage {
    if (!OllamaModelStorage.instance) {
      OllamaModelStorage.instance = new OllamaModelStorage();
    }
    return OllamaModelStorage.instance;
  }

  async getAll(): Promise<OllamaModelFile[]> {
    return this.storage.getAll<OllamaModelFile>('ollama-model');
  }

  async add(file: OllamaModelFile): Promise<void> {
    return this.storage.put('ollama-model', file);
  }

  async remove(id: string): Promise<void> {
    return this.storage.delete('ollama-model', id);
  }

  async clear(): Promise<void> {
    return this.storage.clear('ollama-model');
  }
}

export const ollamaModelStorage = OllamaModelStorage.getInstance();
