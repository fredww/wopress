const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testConnection: (config) => ipcRenderer.invoke('test-connection', config),
  scanFiles: (scanDir) => ipcRenderer.invoke('scan-files', scanDir),
  previewFile: (filePath) => ipcRenderer.invoke('preview-file', filePath),
  publishFiles: (config, files) => ipcRenderer.invoke('publish-files', config, files),
  onPublishProgress: (callback) => ipcRenderer.on('publish-progress', callback),
  
  // 配置窗口相关API
  // Configuration window related APIs
  openConfigWindow: () => ipcRenderer.invoke('open-config-window'),
  closeConfigWindow: () => ipcRenderer.invoke('close-config-window'),
  notifyConfigUpdate: () => ipcRenderer.invoke('notify-config-update'),
  onConfigUpdate: (callback) => ipcRenderer.on('config-updated', callback)
});