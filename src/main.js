const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { marked } = require('marked');
const { publishMarkdownFiles, testConnection, scanMarkdownFiles } = require('./publisher');

let mainWindow;
let configWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// 创建配置窗口
// Create configuration window
function createConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return;
  }

  configWindow = new BrowserWindow({
    width: 600,
    height: 500,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    resizable: false
  });

  configWindow.loadFile(path.join(__dirname, 'renderer/config.html'));

  configWindow.once('ready-to-show', () => {
    configWindow.show();
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    configWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

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

// IPC handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(configWindow || mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});



ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return {};
});

ipcMain.handle('save-config', async (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    // Ensure the userData directory exists
    await fs.ensureDir(app.getPath('userData'));
    await fs.writeJson(configPath, config, { spaces: 2 });
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
});

ipcMain.handle('test-connection', async (event, config) => {
  try {
    return await testConnection(config);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-files', async (event, scanDir) => {
  try {
    return await scanMarkdownFiles(scanDir);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('publish-files', async (event, config, files) => {
  try {
    return await publishMarkdownFiles(config, files, (progress) => {
      mainWindow.webContents.send('publish-progress', progress);
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 配置窗口相关的IPC处理器
// Configuration window related IPC handlers
ipcMain.handle('open-config-window', async () => {
  createConfigWindow();
});

ipcMain.handle('close-config-window', async () => {
  if (configWindow) {
    configWindow.close();
  }
});

ipcMain.handle('notify-config-update', async () => {
  if (mainWindow) {
    mainWindow.webContents.send('config-updated');
  }
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(configWindow || mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  return result;
});

// 预览文件的IPC处理器
// Preview file IPC handler
ipcMain.handle('preview-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const htmlContent = marked(content);
    return { success: true, html: htmlContent };
  } catch (error) {
    return { success: false, error: error.message };
  }
});