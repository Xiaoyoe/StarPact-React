const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

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
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'src/main/preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#FFFFFF',
  });

  const url = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  registerStorageHandlers();
  registerFileHandlers();
  createWindow();
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
