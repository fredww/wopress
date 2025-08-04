class MarkdownPublisherApp {
    constructor() {
        this.config = {};
        this.scannedFiles = [];
        this.selectedFiles = [];
        this.isPublishing = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
        this.updateConfigStatus();
    }

    initializeElements() {
        // Button elements
        this.openConfigBtn = document.getElementById('open-config-btn');
        this.scanFilesBtn = document.getElementById('scan-files-btn');
        this.publishSelectedBtn = document.getElementById('publish-selected-btn');
        this.publishAllBtn = document.getElementById('publish-all-btn');
        this.clearLogBtn = document.getElementById('clear-log-btn');
        
        // Status elements
        this.configStatus = document.getElementById('config-status');
        
        // Other elements
        this.selectAllCheckbox = document.getElementById('select-all-checkbox');
        this.filesList = document.getElementById('files-list');
        this.fileCount = document.querySelector('.file-count');
        this.progressSection = document.querySelector('.progress-section');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressCurrent = document.getElementById('progress-current');
        this.logOutput = document.getElementById('log-output');
    }

    bindEvents() {
        // Configuration window
        this.openConfigBtn.addEventListener('click', () => this.openConfigWindow());
        
        // File operations
        this.scanFilesBtn.addEventListener('click', () => this.scanFiles());
        this.publishSelectedBtn.addEventListener('click', () => this.publishSelected());
        this.publishAllBtn.addEventListener('click', () => this.publishAll());
        
        // UI controls
        this.selectAllCheckbox.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        
        // Progress updates
        window.electronAPI.onPublishProgress((event, progress) => {
            this.updateProgress(progress);
        });
        
        // Configuration updates
        window.electronAPI.onConfigUpdate(() => {
            this.loadConfig();
            this.updateConfigStatus();
        });
    }

    async loadConfig() {
        try {
            const config = await window.electronAPI.loadConfig();
            if (config) {
                this.config = config;
                this.log('Configuration loaded successfully', 'info');
            }
        } catch (error) {
            this.log(`Error loading configuration: ${error.message}`, 'error');
        }
    }

    // 打开配置窗口
    // Open configuration window
    async openConfigWindow() {
        try {
            await window.electronAPI.openConfigWindow();
        } catch (error) {
            this.log(`Error opening configuration window: ${error.message}`, 'error');
        }
    }
    
    // 更新配置状态显示
    // Update configuration status display
    updateConfigStatus() {
        if (this.validateConfig()) {
            this.configStatus.textContent = '✅ Configuration is valid';
            this.configStatus.className = 'status-message success';
        } else {
            this.configStatus.textContent = '⚠️ Please configure WordPress connection';
            this.configStatus.className = 'status-message warning';
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.configStatus.textContent = '';
            this.configStatus.className = 'status-message';
        }, 3000);
    }



    async scanFiles() {
        if (!this.config.scanDir) {
            this.log('Please select a directory to scan', 'error');
            return;
        }

        this.scanFilesBtn.disabled = true;
        this.scanFilesBtn.textContent = '🔄 Scanning...';

        try {
            const result = await window.electronAPI.scanFiles(this.config.scanDir);
            
            if (result.success) {
                this.scannedFiles = result.files;
                this.displayFiles(result.files);
                this.log(`Found ${result.files.length} Markdown files`, 'success');
            } else {
                this.log(`Scan failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`Scan error: ${error.message}`, 'error');
        } finally {
            this.scanFilesBtn.disabled = false;
            this.scanFilesBtn.textContent = '🔍 Scan Files';
        }
    }

    displayFiles(files) {
        if (files.length === 0) {
            this.filesList.innerHTML = '<div class="no-files"><p>No Markdown files found in the selected directory.</p></div>';
            this.fileCount.textContent = '0 files found';
            this.publishSelectedBtn.disabled = true;
            this.publishAllBtn.disabled = true;
            return;
        }

        this.fileCount.textContent = `${files.length} files found`;
        this.publishAllBtn.disabled = false;

        const filesHtml = files.map((file, index) => `
            <div class="file-item">
                <input type="checkbox" class="file-checkbox" data-index="${index}" />
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">
                        <span>📁 ${file.category}</span>
                        <span>📏 ${this.formatFileSize(file.size)}</span>
                        <span>📅 ${this.formatDate(file.modified)}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-preview" data-index="${index}">👁️ Preview</button>
                </div>
            </div>
        `).join('');

        this.filesList.innerHTML = filesHtml;

        // Bind checkbox events
        const checkboxes = this.filesList.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateSelectedFiles());
        });
        
        // Bind preview button events
        const previewButtons = this.filesList.querySelectorAll('.btn-preview');
        previewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.previewFile(index);
            });
        });
    }

    updateSelectedFiles() {
        const checkboxes = this.filesList.querySelectorAll('.file-checkbox:checked');
        this.selectedFiles = Array.from(checkboxes).map(cb => 
            this.scannedFiles[parseInt(cb.dataset.index)]
        );

        this.publishSelectedBtn.disabled = this.selectedFiles.length === 0;
        
        // Update select all checkbox state
        const allCheckboxes = this.filesList.querySelectorAll('.file-checkbox');
        const checkedCount = checkboxes.length;
        const totalCount = allCheckboxes.length;
        
        this.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;
        this.selectAllCheckbox.checked = checkedCount === totalCount && totalCount > 0;
    }

    toggleSelectAll(checked) {
        const checkboxes = this.filesList.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateSelectedFiles();
    }
    
    // 预览Markdown文件
    // Preview markdown file
    async previewFile(index) {
        const file = this.scannedFiles[index];
        if (!file) {
            this.log('File not found', 'error');
            return;
        }
        
        try {
            const result = await window.electronAPI.previewFile(file.path);
            if (result.success) {
                // Create preview window content
                const previewContent = `
                    <html>
                        <head>
                            <title>Preview: ${result.title}</title>
                            <style>
                                body { 
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                    max-width: 800px; 
                                    margin: 0 auto; 
                                    padding: 20px; 
                                    line-height: 1.6;
                                }
                                h1, h2, h3, h4, h5, h6 { color: #333; margin-top: 1.5em; }
                                h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
                                code { 
                                    background: #f4f4f4; 
                                    padding: 2px 6px; 
                                    border-radius: 3px; 
                                    font-family: 'Monaco', 'Consolas', monospace;
                                }
                                pre { 
                                    background: #f8f8f8; 
                                    padding: 15px; 
                                    border-radius: 5px; 
                                    overflow-x: auto;
                                    border-left: 4px solid #007acc;
                                }
                                blockquote {
                                    border-left: 4px solid #ddd;
                                    margin: 0;
                                    padding-left: 20px;
                                    color: #666;
                                }
                                table {
                                    border-collapse: collapse;
                                    width: 100%;
                                    margin: 1em 0;
                                }
                                th, td {
                                    border: 1px solid #ddd;
                                    padding: 8px 12px;
                                    text-align: left;
                                }
                                th {
                                    background-color: #f5f5f5;
                                    font-weight: bold;
                                }
                            </style>
                        </head>
                        <body>
                            <div style="background: #f0f8ff; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
                                <strong>📄 File:</strong> ${file.name}<br>
                                <strong>📁 Category:</strong> ${file.category}<br>
                                <strong>📏 Size:</strong> ${this.formatFileSize(file.size)}
                            </div>
                            ${result.html}
                        </body>
                    </html>
                `;
                
                // Open preview in new window
                const previewWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
                if (previewWindow) {
                    previewWindow.document.write(previewContent);
                    previewWindow.document.close();
                    this.log(`Preview opened for: ${file.name}`, 'info');
                } else {
                    this.log('Failed to open preview window. Please check popup blocker settings.', 'error');
                }
            } else {
                this.log(`Preview failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`Error previewing file: ${error.message}`, 'error');
        }
    }

    async publishSelected() {
        if (this.selectedFiles.length === 0) {
            this.log('No files selected for publishing', 'warning');
            return;
        }

        await this.publishFiles(this.selectedFiles);
    }

    async publishAll() {
        if (this.scannedFiles.length === 0) {
            this.log('No files to publish', 'warning');
            return;
        }

        await this.publishFiles(this.scannedFiles);
    }

    async publishFiles(files) {
        if (!this.validateConfig()) return;

        if (this.isPublishing) {
            this.log('Publishing already in progress', 'warning');
            return;
        }

        this.isPublishing = true;
        this.setPublishingState(true);
        this.showProgress();

        try {
            const result = await window.electronAPI.publishFiles(this.config, files);
            
            if (result.success) {
                const successCount = result.results.filter(r => r.success).length;
                const skippedCount = result.results.filter(r => r.skipped).length;
                const failedCount = result.results.filter(r => !r.success && !r.skipped).length;
                
                this.log(`Publishing completed: ${successCount} published, ${skippedCount} skipped, ${failedCount} failed`, 'success');
                
                // Log individual results
                result.results.forEach(r => {
                    if (r.success && !r.skipped) {
                        this.log(`✅ ${r.file}: ${r.message}`, 'success');
                    } else if (r.skipped) {
                        this.log(`⏭️ ${r.file}: ${r.message}`, 'info');
                    } else {
                        this.log(`❌ ${r.file}: ${r.message}`, 'error');
                    }
                });
            } else {
                this.log(`Publishing failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`Publishing error: ${error.message}`, 'error');
        } finally {
            this.isPublishing = false;
            this.setPublishingState(false);
            this.hideProgress();
        }
    }

    updateProgress(progress) {
        const percentage = Math.round((progress.processed / progress.total) * 100);
        
        this.progressFill.style.width = `${percentage}%`;
        this.progressPercentage.textContent = `${percentage}%`;
        this.progressCurrent.textContent = `Processing: ${progress.current} (${progress.processed}/${progress.total})`;
        
        // Log the current file result
        if (progress.result) {
            const icon = progress.result.success ? 
                (progress.result.skipped ? '⏭️' : '✅') : '❌';
            const type = progress.result.success ? 
                (progress.result.skipped ? 'info' : 'success') : 'error';
            
            this.log(`${icon} ${progress.current}: ${progress.result.message}`, type);
        }
    }

    showProgress() {
        this.progressSection.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressPercentage.textContent = '0%';
        this.progressCurrent.textContent = 'Starting...';
    }

    hideProgress() {
        setTimeout(() => {
            this.progressSection.style.display = 'none';
        }, 2000);
    }

    setPublishingState(publishing) {
        this.publishSelectedBtn.disabled = publishing;
        this.publishAllBtn.disabled = publishing;
        this.scanFilesBtn.disabled = publishing;
        
        if (publishing) {
            this.publishSelectedBtn.classList.add('publishing');
            this.publishAllBtn.classList.add('publishing');
            this.publishSelectedBtn.textContent = '🔄 Publishing...';
            this.publishAllBtn.textContent = '🔄 Publishing...';
        } else {
            this.publishSelectedBtn.classList.remove('publishing');
            this.publishAllBtn.classList.remove('publishing');
            this.publishSelectedBtn.textContent = '🚀 Publish Selected';
            this.publishAllBtn.textContent = '📤 Publish All';
            
            // Re-enable based on selection state
            this.publishSelectedBtn.disabled = this.selectedFiles.length === 0;
            this.publishAllBtn.disabled = this.scannedFiles.length === 0;
        }
    }

    validateConfig() {
        if (!this.config.remoteUrl || !this.config.remoteUser || !this.config.remotePassword) {
            this.log('Please configure WordPress connection settings first', 'error');
            return false;
        }
        return true;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        this.logOutput.appendChild(logEntry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    clearLog() {
        this.logOutput.innerHTML = '';
        this.log('Log cleared', 'info');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownPublisherApp();
});