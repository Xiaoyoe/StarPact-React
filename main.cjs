const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow = null;
let currentProcess = null;
let currentTaskId = null;
let devToolsEnabled = false;

// FFmpeg Service
const ffmpegService = {
  setMainWindow: (window) => {
    mainWindow = window;
  },

  validatePath: (binPath) => {
    const normalizedPath = binPath.replace(/\\/g, '/');
    const ffmpegPath = path.join(normalizedPath, 'ffmpeg.exe');
    const ffprobePath = path.join(normalizedPath, 'ffprobe.exe');
    
    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);
    
    if (!ffmpegExists) {
      return { valid: false, ffmpegPath: '', ffprobePath: '', error: 'ffmpeg.exe not found' };
    }
    
    return { 
      valid: true, 
      ffmpegPath: ffmpegPath, 
      ffprobePath: ffprobeExists ? ffprobePath : '' 
    };
  },

  execute: (options) => {
    return new Promise((resolve) => {
      if (!options.ffmpegPath) {
        resolve({ success: false, error: 'FFmpeg path not configured' });
        return;
      }

      const args = ['-y', ...options.args];
      
      currentProcess = spawn(options.ffmpegPath, args, {
        windowsHide: true,
      });

      let stderr = '';
      let stdout = '';

      currentProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        ffmpegService.sendLog(data.toString(), options.taskId);
      });

      currentProcess.on('error', (err) => {
        currentProcess = null;
        resolve({ success: false, error: err.message });
      });

      currentProcess.on('close', (code) => {
        currentProcess = null;
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
    });
  },

  executeWithProgress: (options, duration) => {
    return new Promise((resolve) => {
      if (!options.ffmpegPath) {
        resolve({ success: false, error: 'FFmpeg path not configured' });
        return;
      }

      const args = ['-y', ...options.args];
      const taskId = options.taskId;
      currentTaskId = taskId;
      
      currentProcess = spawn(options.ffmpegPath, args, {
        windowsHide: true,
      });

      let stderr = '';

      currentProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        ffmpegService.sendLog(data.toString(), taskId);
        ffmpegService.parseProgressFromStderr(data.toString(), duration, taskId);
      });

      currentProcess.on('error', (err) => {
        currentProcess = null;
        currentTaskId = null;
        resolve({ success: false, error: err.message });
      });

      currentProcess.on('close', (code) => {
        currentProcess = null;
        currentTaskId = null;
        if (code === 0) {
          ffmpegService.sendProgress({ progress: 100 }, taskId);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
    });
  },

  stop: () => {
    if (currentProcess) {
      const pid = currentProcess.pid;
      
      currentProcess.kill('SIGKILL');
      
      if (process.platform === 'win32' && pid) {
        try {
          require('child_process').execSync(`taskkill /pid ${pid} /T /F`, { timeout: 2000 });
        } catch (e) {
          console.log('Taskkill error:', e.message);
        }
      }
      
      currentProcess = null;
      currentTaskId = null;
      return true;
    }
    return false;
  },

  getMediaInfo: (ffprobePath, filePath) => {
    return new Promise((resolve) => {
      if (!ffprobePath || !fs.existsSync(ffprobePath)) {
        resolve(null);
        return;
      }

      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const proc = spawn(ffprobePath, args, { windowsHide: true });
      let stdout = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const info = JSON.parse(stdout);
            const mediaInfo = {
              duration: parseFloat(info.format?.duration) || 0,
              format: info.format?.format_name || 'unknown',
            };

            for (const stream of info.streams || []) {
              if (stream.codec_type === 'video' && !mediaInfo.video) {
                mediaInfo.video = {
                  width: stream.width || 0,
                  height: stream.height || 0,
                  codec: stream.codec_name || 'unknown',
                  fps: ffmpegService.parseFps(stream.r_frame_rate) || 0,
                  bitrate: stream.bit_rate || 0,
                };
              } else if (stream.codec_type === 'audio' && !mediaInfo.audio) {
                mediaInfo.audio = {
                  codec: stream.codec_name || 'unknown',
                  sampleRate: stream.sample_rate || 0,
                  channels: stream.channels || 0,
                  bitrate: stream.bit_rate || 0,
                };
              }
            }

            resolve(mediaInfo);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      proc.on('error', () => {
        resolve(null);
      });
    });
  },

  parseFps: (frameRate) => {
    if (!frameRate) return 0;
    const parts = frameRate.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0]) / parseInt(parts[1]);
    }
    return parseFloat(frameRate) || 0;
  },

  parseProgressFromStderr: (data, duration, taskId) => {
    const progress = {};
    
    const frameMatch = data.match(/frame=\s*(\d+)/);
    const fpsMatch = data.match(/fps=\s*([\d.]+)/);
    const sizeMatch = data.match(/size=\s*(\d+)(kB|mB)?/);
    const timeMatch = data.match(/time=(\d+:\d+:\d+\.\d+)/);
    const bitrateMatch = data.match(/bitrate=\s*([\d.]+)(kbits\/s|Mbits\/s)/);
    const speedMatch = data.match(/speed=\s*([\d.]+)x/);

    if (frameMatch) progress.frame = parseInt(frameMatch[1]);
    if (fpsMatch) progress.fps = parseFloat(fpsMatch[1]);
    if (sizeMatch) progress.size = sizeMatch[1] + (sizeMatch[2] || 'kB');
    if (timeMatch) progress.time = timeMatch[1];
    if (bitrateMatch) progress.bitrate = bitrateMatch[1] + bitrateMatch[2];
    if (speedMatch) progress.speed = speedMatch[1] + 'x';

    if (duration && timeMatch) {
      const currentTime = ffmpegService.parseTimeToSeconds(timeMatch[1]);
      progress.progress = Math.min(100, Math.round((currentTime / duration) * 100));
    }

    if (Object.keys(progress).length > 0) {
      ffmpegService.sendProgress(progress, taskId);
    }
  },

  parseTimeToSeconds: (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseFloat(parts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  },

  sendProgress: (progress, taskId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ffmpeg:progress', { ...progress, taskId });
    }
  },

  sendLog: (log, taskId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ffmpeg:log', { log, taskId });
    }
  }
};

// 注册 FFmpeg 相关的 IPC 处理器
function registerFFmpegHandlers() {
  ffmpegService.setMainWindow(mainWindow);

  ipcMain.handle('ffmpeg:validatePath', async (event, binPath) => {
    return ffmpegService.validatePath(binPath);
  });

  ipcMain.handle('ffmpeg:execute', async (event, options) => {
    return ffmpegService.execute(options);
  });

  ipcMain.handle('ffmpeg:executeWithProgress', async (event, options) => {
    return ffmpegService.executeWithProgress(options, options.duration);
  });

  ipcMain.handle('ffmpeg:stop', async () => {
    return ffmpegService.stop();
  });

  ipcMain.handle('ffmpeg:getMediaInfo', async (event, ffprobePath, filePath) => {
    return ffmpegService.getMediaInfo(ffprobePath, filePath);
  });

  ipcMain.handle('ffmpeg:getVideoFrame', async (event, ffmpegPath, filePath, timeSeconds) => {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      
      const tempDir = os.tmpdir();
      const outputFileName = `frame_${Date.now()}.jpg`;
      const outputPath = path.join(tempDir, outputFileName);
      
      const args = [
        '-ss', String(timeSeconds),
        '-i', filePath,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ];
      
      const result = await new Promise((resolve) => {
        const proc = spawn(ffmpegPath, args);
        let stderr = '';
        
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('close', (code) => {
          if (code === 0 && fs.existsSync(outputPath)) {
            const imageData = fs.readFileSync(outputPath);
            const base64 = imageData.toString('base64');
            fs.unlinkSync(outputPath);
            resolve(`data:image/jpeg;base64,${base64}`);
          } else {
            resolve(null);
          }
        });
        
        proc.on('error', () => {
          resolve(null);
        });
      });
      
      return result;
    } catch (error) {
      console.error('获取视频帧失败:', error);
      return null;
    }
  });
}

// 注册存储相关的 IPC 处理器
function registerStorageHandlers() {
  // 处理获取模块路径的请求
  ipcMain.handle('storage:getModulePath', async (event, type) => {
    try {
      // 这里应该从配置中获取模块路径
      // 暂时返回一个默认路径
      return {
        success: true,
        path: '',
      };
    } catch (error) {
      console.error('获取模块路径失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 处理保存模块路径的请求
  ipcMain.handle('storage:saveModulePath', async (event, type, path) => {
    try {
      // 这里应该将模块路径保存到配置中
      // 暂时返回成功
      return {
        success: true,
      };
    } catch (error) {
      console.error('保存模块路径失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // 处理检查所有路径的请求
  ipcMain.handle('storage:checkAllPaths', async () => {
    try {
      // 这里应该检查所有存储路径是否配置
      // 暂时返回 true，表示所有路径都已配置
      return true;
    } catch (error) {
      console.error('检查路径失败:', error);
      return false;
    }
  });

  // 处理迁移模块数据的请求
  ipcMain.handle('storage:migrateModuleData', async (event, oldPath, newPath, type) => {
    try {
      // 这里应该实现模块数据迁移逻辑
      // 暂时返回成功
      return {
        success: true,
      };
    } catch (error) {
      console.error('迁移模块数据失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });
}

// 注册文件操作相关的 IPC 处理器
function registerFileHandlers() {
  // 处理选择文件夹的请求
  ipcMain.handle('file:selectFolder', async (event, options) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      
      const result = await dialog.showOpenDialog(window, {
        title: options?.title || '选择文件夹',
        properties: ['openDirectory'],
        defaultPath: options?.defaultPath,
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          path: result.filePaths[0],
        };
      } else {
        return {
          success: false,
          path: null,
        };
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      return {
        success: false,
        path: null,
        error: error.message,
      };
    }
  });

  // 处理选择文件的请求
  ipcMain.handle('file:selectFile', async (event, options) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      
      const properties = ['openFile'];
      if (options?.multi) {
        properties.push('multiSelections');
      }
      
      const result = await dialog.showOpenDialog(window, {
        title: options?.title || '选择文件',
        properties,
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return {
          success: true,
          filePath: result.filePaths[0],
          filePaths: result.filePaths,
        };
      } else {
        return {
          success: false,
          filePath: null,
          filePaths: null,
        };
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      return {
        success: false,
        filePath: null,
        filePaths: null,
        error: error.message,
      };
    }
  });

  // 处理读取文件内容的请求
  ipcMain.handle('file:readFile', async (event, filePath, encoding = 'utf8') => {
    try {
      const content = await fs.promises.readFile(filePath, encoding);
      return {
        success: true,
        content,
      };
    } catch (error) {
      console.error('读取文件失败:', error);
      return {
        success: false,
        content: null,
        error: error.message,
      };
    }
  });

  // 处理在文件管理器中显示文件的请求
  ipcMain.handle('file:showInFolder', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
          await shell.openPath(dir);
          return { success: true };
        }
        return { success: false, error: '文件或目录不存在' };
      }
      
      await shell.openPath(path.dirname(filePath));
      return { success: true };
    } catch (error) {
      console.error('打开文件夹失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 处理删除文件的请求
  ipcMain.handle('file:deleteFile', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: true, message: '文件不存在' };
      }
      
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('删除文件失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 注册窗口控制相关的 IPC 处理器
function registerWindowHandlers() {
  // 处理窗口拖动 - 使用简单直接的方法
  ipcMain.on('window:drag', (event, data) => {
    const window = event.sender.getOwnerBrowserWindow();
    if (!window) return;
    
    const { type, x, y, startX, startY } = data;
    
    if (type === 'start') {
      // 记录起始位置
      window._dragStartX = startX;
      window._dragStartY = startY;
      // 获取窗口的实际初始位置
      const [windowX, windowY] = window.getPosition();
      window._dragWindowStartX = windowX;
      window._dragWindowStartY = windowY;
    } else if (type === 'move') {
      // 计算新位置
      const deltaX = x - (window._dragStartX || 0);
      const deltaY = y - (window._dragStartY || 0);
      const newX = (window._dragWindowStartX || 0) + deltaX;
      const newY = (window._dragWindowStartY || 0) + deltaY;
      
      // 设置窗口位置
      window.setPosition(Math.round(newX), Math.round(newY));
    } else if (type === 'end') {
      // 清理
      delete window._dragStartX;
      delete window._dragStartY;
      delete window._dragWindowStartX;
      delete window._dragWindowStartY;
    }
  });
  
  // 处理窗口最小化
  ipcMain.on('window:minimize', (event) => {
    const window = event.sender.getOwnerBrowserWindow();
    window.minimize();
  });
  
  // 处理窗口最大化/还原
  ipcMain.on('window:maximize', (event) => {
    const window = event.sender.getOwnerBrowserWindow();
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });
  
  // 处理窗口关闭
  ipcMain.on('window:close', (event) => {
    const window = event.sender.getOwnerBrowserWindow();
    window.close();
  });

  // 处理窗口大小调整
  ipcMain.handle('window:resize', async (event, width, height) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      if (window) {
        if (window.isMaximized()) {
          window.unmaximize();
        }
        window.setSize(width, height);
        window.center();
        return { success: true, width, height };
      }
      return { success: false };
    } catch (error) {
      console.error('调整窗口大小失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取窗口大小
  ipcMain.handle('window:getSize', async (event) => {
    try {
      const window = event.sender.getOwnerBrowserWindow();
      if (window) {
        const [width, height] = window.getSize();
        return { width, height };
      }
      return null;
    } catch (error) {
      console.error('获取窗口大小失败:', error);
      return null;
    }
  });
}

// 注册 Shell 相关的 IPC 处理器
function registerShellHandlers() {
  ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('打开外部链接失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 注册开发者模式相关的 IPC 处理器
function registerDevToolsHandlers() {
  // 获取开发者模式状态
  ipcMain.handle('devTools:getStatus', async () => {
    return { enabled: devToolsEnabled };
  });

  // 启用开发者模式
  ipcMain.handle('devTools:enable', async () => {
    devToolsEnabled = true;
    return { success: true, enabled: true };
  });

  // 禁用开发者模式
  ipcMain.handle('devTools:disable', async () => {
    devToolsEnabled = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.closeDevTools();
    }
    return { success: true, enabled: false };
  });

  // 打开开发者工具（仅在启用时允许）
  ipcMain.handle('devTools:toggle', async () => {
    if (!devToolsEnabled) {
      return { success: false, error: '开发者模式未启用' };
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
      return { success: true };
    }
    return { success: false, error: '窗口不存在' };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'src/main/preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
    backgroundColor: '#FFFFFF',
  });

  const url = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(url);

  // 禁用开发者工具快捷键（默认禁用开发者模式）
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();
    const isDevToolsShortcut = 
      key === 'f12' || 
      (input.control && input.shift && key === 'i') ||
      (input.meta && input.alt && key === 'i');
    
    if (isDevToolsShortcut && !devToolsEnabled) {
      event.preventDefault();
    }
  });

  // 禁用右键菜单（可选，防止通过菜单打开开发者工具）
  mainWindow.webContents.on('context-menu', (event) => {
    if (!devToolsEnabled) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerStorageHandlers();
  registerFileHandlers();
  registerWindowHandlers();
  registerShellHandlers();
  registerDevToolsHandlers();
  createWindow();
  registerFFmpegHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
