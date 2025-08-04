// 配置窗口的JavaScript逻辑
// Configuration window JavaScript logic

let currentConfig = {};

// DOM elements
const remoteUrlInput = document.getElementById('remote-url');
const remoteUserInput = document.getElementById('remote-user');
const remotePasswordInput = document.getElementById('remote-password');
const scanDirInput = document.getElementById('scan-dir');
const recordFileInput = document.getElementById('record-file');
const selectDirBtn = document.getElementById('select-dir-btn');
const selectFileBtn = document.getElementById('select-file-btn');
const saveConfigBtn = document.getElementById('save-config-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');
const closeConfigBtn = document.getElementById('close-config-btn');
const configStatus = document.getElementById('config-status');

// 初始化配置窗口
// Initialize configuration window
async function initConfigWindow() {
    try {
        currentConfig = await window.electronAPI.loadConfig();
        populateForm(currentConfig);
        showStatus('Configuration loaded', 'info');
    } catch (error) {
        console.error('Error loading config:', error);
        showStatus('Error loading configuration', 'error');
    }
}

// 填充表单数据
// Populate form with configuration data
function populateForm(config) {
    remoteUrlInput.value = config.remoteUrl || '';
    remoteUserInput.value = config.remoteUser || '';
    remotePasswordInput.value = config.remotePassword || '';
    scanDirInput.value = config.scanDir || '';
    recordFileInput.value = config.recordFile || 'published_records.json';
}

// 显示状态消息
// Show status message
function showStatus(message, type = 'info') {
    configStatus.textContent = message;
    configStatus.className = `status-message ${type}`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        configStatus.textContent = '';
        configStatus.className = 'status-message';
    }, 3000);
}

// 收集表单数据
// Collect form data
function collectFormData() {
    return {
        remoteUrl: remoteUrlInput.value.trim(),
        remoteUser: remoteUserInput.value.trim(),
        remotePassword: remotePasswordInput.value.trim(),
        scanDir: scanDirInput.value.trim(),
        recordFile: recordFileInput.value.trim() || 'published_records.json'
    };
}

// Event listeners
selectDirBtn.addEventListener('click', async () => {
    try {
        const result = await window.electronAPI.selectDirectory();
        if (result && !result.canceled && result.filePaths.length > 0) {
            scanDirInput.value = result.filePaths[0];
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
        showStatus('Error selecting directory', 'error');
    }
});

selectFileBtn.addEventListener('click', async () => {
    try {
        const result = await window.electronAPI.selectFile();
        if (result && !result.canceled && result.filePaths.length > 0) {
            recordFileInput.value = result.filePaths[0];
        }
    } catch (error) {
        console.error('Error selecting file:', error);
        showStatus('Error selecting file', 'error');
    }
});

saveConfigBtn.addEventListener('click', async () => {
    try {
        const config = collectFormData();
        
        // Validate required fields
        if (!config.remoteUrl || !config.remoteUser || !config.remotePassword) {
            showStatus('Please fill in all required fields', 'error');
            return;
        }
        
        const success = await window.electronAPI.saveConfig(config);
        if (success) {
            currentConfig = config;
            showStatus('Configuration saved successfully', 'success');
            // Notify main window about config update
            window.electronAPI.notifyConfigUpdate();
        } else {
            showStatus('Failed to save configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showStatus('Error saving configuration', 'error');
    }
});

testConnectionBtn.addEventListener('click', async () => {
    try {
        const config = collectFormData();
        
        if (!config.remoteUrl || !config.remoteUser || !config.remotePassword) {
            showStatus('Please fill in connection details first', 'error');
            return;
        }
        
        showStatus('Testing connection...', 'info');
        testConnectionBtn.disabled = true;
        
        const result = await window.electronAPI.testConnection(config);
        
        if (result.success) {
            showStatus('Connection successful!', 'success');
        } else {
            showStatus(`Connection failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        showStatus('Error testing connection', 'error');
    } finally {
        testConnectionBtn.disabled = false;
    }
});

closeConfigBtn.addEventListener('click', () => {
    window.electronAPI.closeConfigWindow();
});

// Handle window close event
window.addEventListener('beforeunload', () => {
    // Optional: Save config before closing
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initConfigWindow);