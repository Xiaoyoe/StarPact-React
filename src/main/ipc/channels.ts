export const IPC_CHANNELS = {
  OLLAMA: {
    CHECK_STATUS: 'ollama:checkStatus',
    START: 'ollama:start',
    STOP: 'ollama:stop',
    RESTART: 'ollama:restart',
    GET_CONFIG: 'ollama:getConfig',
    UPDATE_CONFIG: 'ollama:updateConfig',
    GET_MODELS: 'ollama:getModels',
    CHAT: 'ollama:chat',
    STREAM_CHAT: 'ollama:streamChat',
    PULL_MODEL: 'ollama:pullModel',
    DELETE_MODEL: 'ollama:deleteModel',
    GET_MODEL_INFO: 'ollama:getModelInfo',
    COPY_MODEL: 'ollama:copyModel',
    GENERATE_EMBEDDING: 'ollama:generateEmbedding',
  },
  FILE: {
    SELECT_FOLDER: 'file:selectFolder',
  },
  STORAGE: {
    GET_MODULE_PATH: 'storage:getModulePath',
    SAVE_MODULE_PATH: 'storage:saveModulePath',
    CHECK_ALL_PATHS: 'storage:checkAllPaths',
    MIGRATE_MODULE_DATA: 'storage:migrateModuleData',
    PATH_NOT_CONFIGURED: 'storage:pathNotConfigured',
  },
} as const;
