import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import OllamaServiceManager from '../services/ollama/OllamaServiceManager';
import OllamaAPIClient from '../services/ollama/OllamaAPIClient';

let ollamaManager: OllamaServiceManager | null = null;
let ollamaClient: OllamaAPIClient | null = null;

export function registerOllamaHandlers() {
  const manager = OllamaServiceManager.getInstance();
  ollamaManager = manager;

  manager.on('status', (status) => {
    ipcMain.emit('ollama:status', status);
  });

  manager.on('log', (log) => {
    ipcMain.emit('ollama:log', log);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.CHECK_STATUS, async () => {
    return manager.checkStatus();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.START, async () => {
    return manager.start();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.STOP, async () => {
    return manager.stop();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.RESTART, async () => {
    return manager.restart();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.GET_CONFIG, async () => {
    return manager.getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.UPDATE_CONFIG, async (_, config) => {
    manager.updateConfig(config);
    return manager.getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.GET_MODELS, async () => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.getModels();
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.CHAT, async (_, options) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.chat(options);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.STREAM_CHAT, async (event, options) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.streamChat(options, (chunk) => {
      event.sender.send('ollama:chatChunk', chunk);
    });
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.PULL_MODEL, async (event, { modelName, onProgress }) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.pullModel(modelName, (progress) => {
      event.sender.send('ollama:pullProgress', progress);
    });
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.DELETE_MODEL, async (_, modelName) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.deleteModel(modelName);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.GET_MODEL_INFO, async (_, modelName) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.getModelInfo(modelName);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.COPY_MODEL, async (_, { source, destination }) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.copyModel(source, destination);
  });

  ipcMain.handle(IPC_CHANNELS.OLLAMA.GENERATE_EMBEDDING, async (_, { text, model }) => {
    const status = await manager.checkStatus();
    if (!status.isRunning) {
      throw new Error('Ollama service is not running');
    }

    const client = new OllamaAPIClient(status.port);
    return client.generateEmbedding(text, model);
  });
}
