const { contextBridge, ipcRenderer } = require('electron');

// 暴露基本的electron API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 存储相关API
  storage: {
    getModulePath: (type) => ipcRenderer.invoke('storage:getModulePath', type),
    saveModulePath: (type, path) => ipcRenderer.invoke('storage:saveModulePath', type, path),
    checkAllPaths: () => ipcRenderer.invoke('storage:checkAllPaths'),
    migrateModuleData: (oldPath, newPath, type) => ipcRenderer.invoke('storage:migrateModuleData', oldPath, newPath, type),
    backupData: (content, fileName) => ipcRenderer.invoke('storage:backupData', content, fileName),
    backupDataToPath: (content, fileName, targetPath) => ipcRenderer.invoke('storage:backupDataToPath', content, fileName, targetPath),
    getBackupPath: () => ipcRenderer.invoke('storage:getBackupPath'),
  },
  
  // 对话框API
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  },
  
  // 文件操作API
  file: {
    selectFolder: (options) => ipcRenderer.invoke('file:selectFolder', options),
    selectFile: (options) => ipcRenderer.invoke('file:selectFile', options),
    selectFiles: (options) => ipcRenderer.invoke('file:selectFile', { ...options, multi: true }),
    readFile: (filePath, encoding) => ipcRenderer.invoke('file:readFile', filePath, encoding),
    writeFile: (filePath, content) => ipcRenderer.invoke('file:writeFile', filePath, content),
    showInFolder: (filePath) => ipcRenderer.invoke('file:showInFolder', filePath),
    deleteFile: (filePath) => ipcRenderer.invoke('file:deleteFile', filePath),
    getFileStats: (filePath) => ipcRenderer.invoke('file:getFileStats', filePath),
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
    scanFolderVideos: (ffprobePath, folderPath) => ipcRenderer.invoke('ffmpeg:scanFolderVideos', ffprobePath, folderPath),
    mergeVideos: (options) => ipcRenderer.invoke('ffmpeg:mergeVideos', options),
    classifyByFps: (ffprobePath, folderPath) => ipcRenderer.invoke('ffmpeg:classifyByFps', ffprobePath, folderPath),
    collectSubfolderVideos: (folderPath) => ipcRenderer.invoke('ffmpeg:collectSubfolderVideos', folderPath),
    
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

  // Shell 相关 API
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // 开发者工具相关 API
  devTools: {
    getStatus: () => ipcRenderer.invoke('devTools:getStatus'),
    enable: () => ipcRenderer.invoke('devTools:enable'),
    disable: () => ipcRenderer.invoke('devTools:disable'),
    toggle: () => ipcRenderer.invoke('devTools:toggle'),
  },
  
  // 监听路径未配置通知
  onPathNotConfigured: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('storage:pathNotConfigured', listener);
    return () => ipcRenderer.removeListener('storage:pathNotConfigured', listener);
  },
});
