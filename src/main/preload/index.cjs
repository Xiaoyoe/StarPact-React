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
    selectFile: (options) => ipcRenderer.invoke('file:selectFile', options),
    readFile: (filePath, encoding) => ipcRenderer.invoke('file:readFile', filePath, encoding),
    showInFolder: (filePath) => ipcRenderer.invoke('file:showInFolder', filePath),
    deleteFile: (filePath) => ipcRenderer.invoke('file:deleteFile', filePath),
  },
  
  // 窗口控制API
  window: {
    drag: (delta) => ipcRenderer.send('window:drag', delta),
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    resize: (width, height) => ipcRenderer.invoke('window:resize', width, height),
    getSize: () => ipcRenderer.invoke('window:getSize'),
  },

  // FFmpeg 相关 API
  ffmpeg: {
    validatePath: (binPath) => ipcRenderer.invoke('ffmpeg:validatePath', binPath),
    execute: (options) => ipcRenderer.invoke('ffmpeg:execute', options),
    executeWithProgress: (options) => ipcRenderer.invoke('ffmpeg:executeWithProgress', options),
    stop: () => ipcRenderer.invoke('ffmpeg:stop'),
    getMediaInfo: (ffprobePath, filePath) => ipcRenderer.invoke('ffmpeg:getMediaInfo', ffprobePath, filePath),
    getVideoFrame: (ffmpegPath, filePath, timeSeconds) => ipcRenderer.invoke('ffmpeg:getVideoFrame', ffmpegPath, filePath, timeSeconds),
    
    onProgress: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('ffmpeg:progress', listener);
      return () => ipcRenderer.removeListener('ffmpeg:progress', listener);
    },
    
    onLog: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('ffmpeg:log', listener);
      return () => ipcRenderer.removeListener('ffmpeg:log', listener);
    },
  },
  
  // 监听路径未配置通知
  onPathNotConfigured: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('storage:pathNotConfigured', listener);
    return () => ipcRenderer.removeListener('storage:pathNotConfigured', listener);
  },
});
