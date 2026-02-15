const { contextBridge, ipcRenderer } = require('electron');

// 暴露基本的electron API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 存储相关API
  storage: {
    getModulePath: (type) => ipcRenderer.invoke('storage:getModulePath', type),
    saveModulePath: (type, path) => ipcRenderer.invoke('storage:saveModulePath', type, path),
    checkAllPaths: () => ipcRenderer.invoke('storage:checkAllPaths'),
    migrateModuleData: (oldPath, newPath, type) => ipcRenderer.invoke('storage:migrateModuleData', oldPath, newPath, type),
  },
  
  // 对话框API
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  },
  
  // 文件操作API
  file: {
    selectFolder: (options) => ipcRenderer.invoke('file:selectFolder', options),
  },
  
  // 监听路径未配置通知
  onPathNotConfigured: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('storage:pathNotConfigured', listener);
    return () => ipcRenderer.removeListener('storage:pathNotConfigured', listener);
  },
});
