// Migration Panel JavaScript for VS Code webview
(function() {
  'use strict';

  // VS Code API
  const vscode = acquireVsCodeApi();
  
  let currentState = {
    isProcessing: false,
    currentBatch: null,
    migrationHistory: [],
    selectedItem: null,
    showDiff: false,
    activeTab: 'current',
    settings: {
      autoApprove: false,
      requireConfirmation: true,
      createBackups: true,
      validateAfterMigration: true
    }
  };

  // DOM elements
  let rootElement;
  let tabButtons;
  let contentArea;
  let progressBar;
  
  // Initialize the application
  function init() {
    rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found');
      return;
    }

    // Listen for messages from extension
    window.addEventListener('message', handleMessage);
    
    // Render initial UI
    render();
  }

  function handleMessage(event) {
    const message = event.data;
    
    switch (message.type) {
      case 'updateState':
        currentState = { ...currentState, ...message.data };
        updateStateDisplay();
        break;
      case 'migrationItemReady':
        handleMigrationItemReady(message.data);
        break;
      case 'migrationItemFailed':
        handleMigrationItemFailed(message.data);
        break;
      case 'migrationApproved':
        handleMigrationApproved(message.data);
        break;
      case 'migrationRejected':
        handleMigrationRejected(message.data);
        break;
      case 'migrationRolledBack':
        handleMigrationRolledBack(message.data);
        break;
      case 'migrationHistory':
        handleMigrationHistory(message.data);
        break;
      case 'diffPreview':
        handleDiffPreview(message.data);
        break;
    }
  }

  function handleMigrationItemReady(data) {
    showNotification(`Migration ready for review: ${getFileName(data.item.filePath)}`, 'info');
    updateCurrentBatchDisplay();
  }

  function handleMigrationItemFailed(data) {
    showNotification(`Migration failed: ${data.error}`, 'error');
    updateCurrentBatchDisplay();
  }

  function handleMigrationApproved(data) {
    showNotification('Migration approved and applied', 'success');
    updateCurrentBatchDisplay();
  }

  function handleMigrationRejected(data) {
    showNotification(`Migration rejected: ${data.reason}`, 'warning');
    updateCurrentBatchDisplay();
  }

  function handleMigrationRolledBack(data) {
    showNotification('Migration rolled back successfully', 'info');
    updateCurrentBatchDisplay();
  }

  function handleMigrationHistory(data) {
    currentState.migrationHistory = data;
    if (currentState.activeTab === 'history') {
      renderHistoryTab();
    }
  }

  function handleDiffPreview(data) {
    showDiffModal(data);
  }

  function updateStateDisplay() {
    updateCurrentBatchDisplay();
    updateProgressBar();
  }

  function updateCurrentBatchDisplay() {
    if (currentState.activeTab === 'current') {
      renderCurrentTab();
    }
  }

  function updateProgressBar() {
    if (progressBar && currentState.currentBatch) {
      const batch = currentState.currentBatch;
      const progress = batch.progress.total > 0 ? (batch.progress.completed / batch.progress.total) * 100 : 0;
      progressBar.style.width = `${progress}%`;
    }
  }

  function handleTabChange(tabName) {
    currentState.activeTab = tabName;
    
    // Update tab buttons
    if (tabButtons) {
      tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
      });
    }
    
    // Render appropriate content
    switch (tabName) {
      case 'current':
        renderCurrentTab();
        break;
      case 'history':
        renderHistoryTab();
        vscode.postMessage({ type: 'getMigrationHistory' });
        break;
      case 'settings':
        renderSettingsTab();
        break;
    }
  }

  function handleApproveMigration(itemId) {
    if (currentState.settings.requireConfirmation) {
      if (confirm('Are you sure you want to approve this migration? This will modify your code.')) {
        vscode.postMessage({ type: 'approveMigration', data: { itemId } });
      }
    } else {
      vscode.postMessage({ type: 'approveMigration', data: { itemId } });
    }
  }

  function handleRejectMigration(itemId) {
    const reason = prompt('Reason for rejection (optional):');
    vscode.postMessage({ type: 'rejectMigration', data: { itemId, reason } });
  }

  function handleRollbackMigration(itemId) {
    if (confirm('Are you sure you want to rollback this migration? This will restore the original code.')) {
      vscode.postMessage({ type: 'rollbackMigration', data: { itemId } });
    }
  }

  function handlePreviewDiff(itemId) {
    vscode.postMessage({ type: 'previewDiff', data: { itemId } });
  }

  function handlePauseMigration() {
    vscode.postMessage({ type: 'pauseMigration' });
  }

  function handleResumeMigration() {
    vscode.postMessage({ type: 'resumeMigration' });
  }

  function handleSettingChange(setting, value) {
    currentState.settings[setting] = value;
    // In a real implementation, you would save settings to the extension
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="codicon codicon-${getNotificationIcon(type)}"></span>
      ${message}
    `;
    
    rootElement.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  function showDiffModal(data) {
    const modal = document.createElement('div');
    modal.className = 'diff-modal';
    
    modal.innerHTML = `
      <div class="diff-modal-content">
        <div class="diff-modal-header">
          <h3>Code Diff: ${getFileName(data.filePath)}:${data.lineNumber}</h3>
          <div class="diff-controls">
            <select id="diffViewMode" onchange="changeDiffViewMode(this.value)">
              <option value="sideBySide">Side by Side</option>
              <option value="inline">Inline</option>
            </select>
            <button class="close-button" onclick="this.closest('.diff-modal').remove()">
              <span class="codicon codicon-close"></span>
            </button>
          </div>
        </div>
        <div class="diff-modal-body">
          <div class="diff-toolbar">
            <div class="diff-info">
              <span class="confidence-score">Confidence: ${Math.round((data.confidence || 0.8) * 100)}%</span>
              <span class="endpoint-type">${data.endpointType || 'Unknown'}</span>
            </div>
            <div class="diff-actions">
              <button onclick="copyOriginalCode('${data.itemId}')" class="action-btn secondary">
                <span class="codicon codicon-copy"></span>
                Copy Original
              </button>
              <button onclick="copyMigratedCode('${data.itemId}')" class="action-btn secondary">
                <span class="codicon codicon-copy"></span>
                Copy Migrated
              </button>
            </div>
          </div>
          <div id="monaco-diff-container" class="monaco-diff-container"></div>
          <div class="migration-summary">
            <h4>Migration Summary</h4>
            <div class="summary-stats">
              <div class="stat">
                <span class="stat-label">Lines Added:</span>
                <span class="stat-value added">${data.diff.filter(l => l.type === 'added').length}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Lines Removed:</span>
                <span class="stat-value removed">${data.diff.filter(l => l.type === 'removed').length}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Lines Unchanged:</span>
                <span class="stat-value unchanged">${data.diff.filter(l => l.type === 'unchanged').length}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="diff-modal-footer">
          <div class="approval-workflow">
            <div class="approval-options">
              <label class="approval-option">
                <input type="checkbox" id="createBackup" checked>
                <span>Create backup before applying</span>
              </label>
              <label class="approval-option">
                <input type="checkbox" id="validateAfter" checked>
                <span>Validate after migration</span>
              </label>
            </div>
            <div class="approval-actions">
              <button onclick="handleRejectMigration('${data.itemId}'); this.closest('.diff-modal').remove();" class="reject-button">
                <span class="codicon codicon-close"></span>
                Reject
              </button>
              <button onclick="handleApproveMigration('${data.itemId}'); this.closest('.diff-modal').remove();" class="approve-button">
                <span class="codicon codicon-check"></span>
                Approve & Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    rootElement.appendChild(modal);
    
    // Initialize Monaco diff editor
    initializeMonacoDiffEditor(data);
  }

  function initializeMonacoDiffEditor(data) {
    if (typeof monaco === 'undefined') {
      console.error('Monaco Editor not loaded');
      return;
    }

    const container = document.getElementById('monaco-diff-container');
    if (!container) {
      console.error('Monaco container not found');
      return;
    }

    // Determine language from file extension
    const language = getLanguageFromFilePath(data.filePath);
    
    // Create diff editor
    const diffEditor = monaco.editor.createDiffEditor(container, {
      theme: 'vs-dark', // Use VS Code dark theme
      readOnly: true,
      renderSideBySide: true,
      enableSplitViewResizing: true,
      renderOverviewRuler: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      wordWrap: 'on',
      fontSize: 12,
      lineNumbers: 'on',
      folding: true,
      renderWhitespace: 'boundary',
      diffCodeLens: true,
      ignoreTrimWhitespace: false
    });

    // Set models
    const originalModel = monaco.editor.createModel(data.originalCode, language);
    const modifiedModel = monaco.editor.createModel(data.migratedCode, language);
    
    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });

    // Store reference for cleanup
    modal._diffEditor = diffEditor;
    modal._originalModel = originalModel;
    modal._modifiedModel = modifiedModel;

    // Handle view mode changes
    window.changeDiffViewMode = function(mode) {
      diffEditor.updateOptions({
        renderSideBySide: mode === 'sideBySide'
      });
    };

    // Handle copy actions
    window.copyOriginalCode = function(itemId) {
      navigator.clipboard.writeText(data.originalCode).then(() => {
        showNotification('Original code copied to clipboard', 'info');
      });
    };

    window.copyMigratedCode = function(itemId) {
      navigator.clipboard.writeText(data.migratedCode).then(() => {
        showNotification('Migrated code copied to clipboard', 'info');
      });
    };

    // Cleanup when modal is closed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === modal) {
            if (modal._diffEditor) {
              modal._diffEditor.dispose();
            }
            if (modal._originalModel) {
              modal._originalModel.dispose();
            }
            if (modal._modifiedModel) {
              modal._modifiedModel.dispose();
            }
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(rootElement, { childList: true });
  }

  function getLanguageFromFilePath(filePath) {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'php':
        return 'php';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cs':
        return 'csharp';
      case 'rb':
        return 'ruby';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'plaintext';
    }
  }

  function getFileName(filePath) {
    return filePath.split(/[\\/]/).pop() || filePath;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending': return 'clock';
      case 'approved': return 'check';
      case 'rejected': return 'close';
      case 'completed': return 'check-all';
      case 'failed': return 'error';
      default: return 'question';
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending': return 'var(--vscode-charts-yellow)';
      case 'approved': return 'var(--vscode-charts-green)';
      case 'rejected': return 'var(--vscode-charts-red)';
      case 'completed': return 'var(--vscode-charts-blue)';
      case 'failed': return 'var(--vscode-errorForeground)';
      default: return 'var(--vscode-descriptionForeground)';
    }
  }

  function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'onClick') {
        element.addEventListener('click', value);
      } else if (key === 'onChange') {
        element.addEventListener('change', value);
      } else if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  }

  function renderHeader() {
    return createElement('div', { className: 'migration-header' },
      createElement('h2', {}, 'Migration Manager'),
      createElement('p', { className: 'header-description' }, 
        'Review and approve code migrations from Converge to Elavon'
      )
    );
  }

  function renderTabs() {
    const tabContainer = createElement('div', { className: 'tab-container' });
    
    const tabs = [
      { id: 'current', label: 'Current Migration', icon: 'play' },
      { id: 'history', label: 'History', icon: 'history' },
      { id: 'settings', label: 'Settings', icon: 'settings-gear' }
    ];

    tabButtons = tabs.map(tab => {
      const button = createElement('button', {
        className: `tab-button ${currentState.activeTab === tab.id ? 'active' : ''}`,
        'data-tab': tab.id,
        onClick: () => handleTabChange(tab.id)
      });
      button.innerHTML = `<span class="codicon codicon-${tab.icon}"></span>${tab.label}`;
      return button;
    });

    tabButtons.forEach(button => tabContainer.appendChild(button));
    return tabContainer;
  }

  function renderCurrentTab() {
    const currentContainer = createElement('div', { className: 'current-migration' });

    if (!currentState.currentBatch) {
      currentContainer.innerHTML = `
        <div class="no-migration">
          <div class="no-migration-icon">
            <span class="codicon codicon-play"></span>
          </div>
          <h3>No Active Migration</h3>
          <p>Start a migration from the scan results or use the command palette.</p>
        </div>
      `;
    } else {
      const batch = currentState.currentBatch;
      
      currentContainer.innerHTML = `
        <div class="batch-header">
          <h3>${batch.name}</h3>
          <div class="batch-controls">
            ${batch.status === 'in_progress' ? `
              <button onclick="handlePauseMigration()" class="control-button">
                <span class="codicon codicon-debug-pause"></span>
                Pause
              </button>
            ` : batch.status === 'paused' ? `
              <button onclick="handleResumeMigration()" class="control-button">
                <span class="codicon codicon-play"></span>
                Resume
              </button>
            ` : ''}
          </div>
        </div>
        
        <div class="batch-progress">
          <div class="progress-header">
            <div class="progress-title">
              <h4>Migration Progress</h4>
              <span class="batch-status ${batch.status}">${batch.status.toUpperCase()}</span>
            </div>
            <div class="progress-stats">
              <div class="progress-stat">
                <span class="stat-number">${batch.progress.completed}</span>
                <span class="stat-label">/ ${batch.progress.total} Total</span>
              </div>
            </div>
          </div>
          
          <div class="progress-details">
            <div class="progress-breakdown">
              <div class="breakdown-item approved">
                <span class="codicon codicon-check"></span>
                <span class="breakdown-count">${batch.progress.approved}</span>
                <span class="breakdown-label">Approved</span>
              </div>
              <div class="breakdown-item rejected">
                <span class="codicon codicon-close"></span>
                <span class="breakdown-count">${batch.progress.rejected}</span>
                <span class="breakdown-label">Rejected</span>
              </div>
              <div class="breakdown-item pending">
                <span class="codicon codicon-clock"></span>
                <span class="breakdown-count">${batch.progress.total - batch.progress.completed}</span>
                <span class="breakdown-label">Pending</span>
              </div>
            </div>
            
            <div class="progress-bar-container">
              <div class="progress-bar-track">
                <div class="progress-bar approved" style="width: ${batch.progress.total > 0 ? (batch.progress.approved / batch.progress.total) * 100 : 0}%"></div>
                <div class="progress-bar rejected" style="width: ${batch.progress.total > 0 ? (batch.progress.rejected / batch.progress.total) * 100 : 0}%; left: ${batch.progress.total > 0 ? (batch.progress.approved / batch.progress.total) * 100 : 0}%"></div>
              </div>
              <div class="progress-percentage">${batch.progress.total > 0 ? Math.round((batch.progress.completed / batch.progress.total) * 100) : 0}% Complete</div>
            </div>
          </div>
          
          ${batch.startTime ? `
            <div class="progress-timing">
              <div class="timing-item">
                <span class="codicon codicon-clock"></span>
                <span>Started: ${new Date(batch.startTime).toLocaleString()}</span>
              </div>
              ${batch.endTime ? `
                <div class="timing-item">
                  <span class="codicon codicon-check-all"></span>
                  <span>Completed: ${new Date(batch.endTime).toLocaleString()}</span>
                </div>
                <div class="timing-item">
                  <span class="codicon codicon-watch"></span>
                  <span>Duration: ${Math.round((new Date(batch.endTime).getTime() - new Date(batch.startTime).getTime()) / 1000)}s</span>
                </div>
              ` : batch.status === 'in_progress' ? `
                <div class="timing-item">
                  <span class="codicon codicon-loading codicon-modifier-spin"></span>
                  <span>Running for: ${Math.round((Date.now() - new Date(batch.startTime).getTime()) / 1000)}s</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="migration-items">
          ${batch.items.map(item => `
            <div class="migration-item ${item.status}">
              <div class="item-header">
                <div class="item-info">
                  <span class="file-name">${getFileName(item.filePath)}</span>
                  <span class="line-number">:${item.lineNumber}</span>
                  <span class="endpoint-type">${item.endpointType}</span>
                </div>
                <div class="item-status">
                  <span class="status-icon codicon codicon-${getStatusIcon(item.status)}" style="color: ${getStatusColor(item.status)}"></span>
                  <span class="status-text">${item.status.toUpperCase()}</span>
                </div>
              </div>
              
              <div class="item-actions">
                <button onclick="handlePreviewDiff('${item.id}')" class="action-button secondary">
                  <span class="codicon codicon-diff"></span>
                  Preview Diff
                </button>
                
                ${item.status === 'pending' ? `
                  <button onclick="handleApproveMigration('${item.id}')" class="action-button approve">
                    <span class="codicon codicon-check"></span>
                    Approve
                  </button>
                  <button onclick="handleRejectMigration('${item.id}')" class="action-button reject">
                    <span class="codicon codicon-close"></span>
                    Reject
                  </button>
                ` : item.status === 'completed' ? `
                  <button onclick="handleRollbackMigration('${item.id}')" class="action-button rollback">
                    <span class="codicon codicon-discard"></span>
                    Rollback
                  </button>
                ` : ''}
              </div>
              
              ${item.notes ? `
                <div class="item-notes">
                  <span class="codicon codicon-note"></span>
                  ${item.notes}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    contentArea.innerHTML = '';
    contentArea.appendChild(currentContainer);
  }

  function renderHistoryTab() {
    const historyContainer = createElement('div', { className: 'migration-history' });

    if (currentState.migrationHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="no-history">
          <div class="no-history-icon">
            <span class="codicon codicon-history"></span>
          </div>
          <h3>No Migration History</h3>
          <p>Completed migrations will appear here.</p>
        </div>
      `;
    } else {
      historyContainer.innerHTML = `
        <div class="history-controls">
          <div class="history-filters">
            <select id="historyFilter" onchange="filterHistory(this.value)">
              <option value="all">All Batches</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
            </select>
            <button onclick="exportHistory()" class="export-btn">
              <span class="codicon codicon-export"></span>
              Export History
            </button>
          </div>
          <div class="history-actions">
            <button onclick="clearHistory()" class="clear-btn">
              <span class="codicon codicon-trash"></span>
              Clear History
            </button>
          </div>
        </div>
        
        <div class="history-list">
          ${currentState.migrationHistory.map(batch => `
            <div class="history-item" data-status="${batch.status}">
              <div class="history-header">
                <div class="history-title">
                  <h4>${batch.name}</h4>
                  <span class="history-status ${batch.status}">${batch.status.toUpperCase()}</span>
                </div>
                <div class="history-actions-item">
                  <button onclick="viewBatchDetails('${batch.id}')" class="view-btn">
                    <span class="codicon codicon-eye"></span>
                    View Details
                  </button>
                  ${batch.status === 'completed' && batch.progress.approved > 0 ? `
                    <button onclick="rollbackBatch('${batch.id}')" class="rollback-btn">
                      <span class="codicon codicon-discard"></span>
                      Rollback Batch
                    </button>
                  ` : ''}
                </div>
              </div>
              
              <div class="history-summary">
                <div class="summary-stats">
                  <div class="summary-stat">
                    <span class="stat-icon codicon codicon-list-ordered"></span>
                    <span class="stat-text">${batch.progress.total} items</span>
                  </div>
                  <div class="summary-stat success">
                    <span class="stat-icon codicon codicon-check"></span>
                    <span class="stat-text">${batch.progress.approved} approved</span>
                  </div>
                  <div class="summary-stat error">
                    <span class="stat-icon codicon codicon-close"></span>
                    <span class="stat-text">${batch.progress.rejected} rejected</span>
                  </div>
                  <div class="summary-stat">
                    <span class="stat-icon codicon codicon-clock"></span>
                    <span class="stat-text">${new Date(batch.startTime).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div class="history-progress-bar">
                  <div class="history-progress-track">
                    <div class="history-progress-fill approved" style="width: ${batch.progress.total > 0 ? (batch.progress.approved / batch.progress.total) * 100 : 0}%"></div>
                    <div class="history-progress-fill rejected" style="width: ${batch.progress.total > 0 ? (batch.progress.rejected / batch.progress.total) * 100 : 0}%; left: ${batch.progress.total > 0 ? (batch.progress.approved / batch.progress.total) * 100 : 0}%"></div>
                  </div>
                </div>
              </div>
              
              <div class="history-timing">
                <div class="timing-detail">
                  <span class="codicon codicon-play"></span>
                  <span>Started: ${new Date(batch.startTime).toLocaleString()}</span>
                </div>
                ${batch.endTime ? `
                  <div class="timing-detail">
                    <span class="codicon codicon-stop"></span>
                    <span>Ended: ${new Date(batch.endTime).toLocaleString()}</span>
                  </div>
                  <div class="timing-detail">
                    <span class="codicon codicon-watch"></span>
                    <span>Duration: ${formatDuration(new Date(batch.endTime).getTime() - new Date(batch.startTime).getTime())}</span>
                  </div>
                ` : ''}
              </div>
              
              <div class="history-items-preview">
                <div class="items-preview-header">
                  <span>Migration Items (${batch.items.length})</span>
                  <button onclick="toggleItemsPreview('${batch.id}')" class="toggle-btn">
                    <span class="codicon codicon-chevron-down"></span>
                  </button>
                </div>
                <div class="items-preview-list" id="items-${batch.id}" style="display: none;">
                  ${batch.items.slice(0, 5).map(item => `
                    <div class="preview-item ${item.status}">
                      <div class="preview-item-info">
                        <span class="preview-file">${getFileName(item.filePath)}</span>
                        <span class="preview-line">:${item.lineNumber}</span>
                        <span class="preview-type">${item.endpointType}</span>
                      </div>
                      <div class="preview-item-status">
                        <span class="codicon codicon-${getStatusIcon(item.status)}"></span>
                        <span class="preview-status-text">${item.status}</span>
                      </div>
                      ${item.status === 'completed' ? `
                        <button onclick="rollbackItem('${item.id}')" class="preview-rollback-btn">
                          <span class="codicon codicon-discard"></span>
                        </button>
                      ` : ''}
                    </div>
                  `).join('')}
                  ${batch.items.length > 5 ? `
                    <div class="preview-more">
                      <span>... and ${batch.items.length - 5} more items</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    contentArea.innerHTML = '';
    contentArea.appendChild(historyContainer);
  }

  function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function filterHistory(status) {
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      if (status === 'all' || item.dataset.status === status) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  function exportHistory() {
    const historyData = {
      exportDate: new Date().toISOString(),
      totalBatches: currentState.migrationHistory.length,
      history: currentState.migrationHistory
    };
    
    const blob = new Blob([JSON.stringify(historyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Migration history exported successfully', 'success');
  }

  function clearHistory() {
    if (confirm('Are you sure you want to clear all migration history? This action cannot be undone.')) {
      vscode.postMessage({ type: 'clearHistory' });
      showNotification('Migration history cleared', 'info');
    }
  }

  function viewBatchDetails(batchId) {
    const batch = currentState.migrationHistory.find(b => b.id === batchId);
    if (batch) {
      showBatchDetailsModal(batch);
    }
  }

  function rollbackBatch(batchId) {
    if (confirm('Are you sure you want to rollback all approved migrations in this batch? This will restore the original code for all applied changes.')) {
      vscode.postMessage({ type: 'rollbackBatch', data: { batchId } });
      showNotification('Batch rollback initiated', 'info');
    }
  }

  function rollbackItem(itemId) {
    if (confirm('Are you sure you want to rollback this migration? This will restore the original code.')) {
      vscode.postMessage({ type: 'rollbackMigration', data: { itemId } });
      showNotification('Item rollback initiated', 'info');
    }
  }

  function toggleItemsPreview(batchId) {
    const previewList = document.getElementById(`items-${batchId}`);
    const toggleBtn = previewList.previousElementSibling.querySelector('.toggle-btn .codicon');
    
    if (previewList.style.display === 'none') {
      previewList.style.display = 'block';
      toggleBtn.className = 'codicon codicon-chevron-up';
    } else {
      previewList.style.display = 'none';
      toggleBtn.className = 'codicon codicon-chevron-down';
    }
  }

  function showBatchDetailsModal(batch) {
    const modal = document.createElement('div');
    modal.className = 'batch-details-modal';
    
    modal.innerHTML = `
      <div class="batch-details-content">
        <div class="batch-details-header">
          <h3>Batch Details: ${batch.name}</h3>
          <button class="close-button" onclick="this.closest('.batch-details-modal').remove()">
            <span class="codicon codicon-close"></span>
          </button>
        </div>
        <div class="batch-details-body">
          <div class="batch-overview">
            <div class="overview-stats">
              <div class="overview-stat">
                <span class="stat-label">Total Items:</span>
                <span class="stat-value">${batch.progress.total}</span>
              </div>
              <div class="overview-stat">
                <span class="stat-label">Approved:</span>
                <span class="stat-value success">${batch.progress.approved}</span>
              </div>
              <div class="overview-stat">
                <span class="stat-label">Rejected:</span>
                <span class="stat-value error">${batch.progress.rejected}</span>
              </div>
              <div class="overview-stat">
                <span class="stat-label">Status:</span>
                <span class="stat-value ${batch.status}">${batch.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          <div class="batch-items-list">
            <h4>Migration Items</h4>
            <div class="items-table">
              ${batch.items.map(item => `
                <div class="item-row ${item.status}">
                  <div class="item-file">
                    <span class="file-name">${getFileName(item.filePath)}</span>
                    <span class="line-number">:${item.lineNumber}</span>
                  </div>
                  <div class="item-type">${item.endpointType}</div>
                  <div class="item-status-badge ${item.status}">
                    <span class="codicon codicon-${getStatusIcon(item.status)}"></span>
                    <span>${item.status}</span>
                  </div>
                  <div class="item-actions">
                    <button onclick="previewItemDiff('${item.id}')" class="preview-btn">
                      <span class="codicon codicon-diff"></span>
                    </button>
                    ${item.status === 'completed' ? `
                      <button onclick="rollbackItem('${item.id}')" class="rollback-btn">
                        <span class="codicon codicon-discard"></span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    rootElement.appendChild(modal);
  }

  function previewItemDiff(itemId) {
    vscode.postMessage({ type: 'previewDiff', data: { itemId } });
  }

  // Global functions for onclick handlers
  window.filterHistory = filterHistory;
  window.exportHistory = exportHistory;
  window.clearHistory = clearHistory;
  window.viewBatchDetails = viewBatchDetails;
  window.rollbackBatch = rollbackBatch;
  window.rollbackItem = rollbackItem;
  window.toggleItemsPreview = toggleItemsPreview;
  window.previewItemDiff = previewItemDiff;

  function renderSettingsTab() {
    const settingsContainer = createElement('div', { className: 'migration-settings' });

    settingsContainer.innerHTML = `
      <div class="settings-section">
        <h3>Migration Behavior</h3>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" ${currentState.settings.autoApprove ? 'checked' : ''} 
                   onchange="handleSettingChange('autoApprove', this.checked)">
            <span class="setting-text">Auto-approve high-confidence migrations</span>
          </label>
          <p class="setting-description">Automatically approve migrations with confidence >= 80%</p>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" ${currentState.settings.requireConfirmation ? 'checked' : ''} 
                   onchange="handleSettingChange('requireConfirmation', this.checked)">
            <span class="setting-text">Require confirmation for approvals</span>
          </label>
          <p class="setting-description">Show confirmation dialog before applying migrations</p>
        </div>
      </div>
      
      <div class="settings-section">
        <h3>Safety Features</h3>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" ${currentState.settings.createBackups ? 'checked' : ''} 
                   onchange="handleSettingChange('createBackups', this.checked)">
            <span class="setting-text">Create backups before migration</span>
          </label>
          <p class="setting-description">Automatically create backup files before applying changes</p>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" ${currentState.settings.validateAfterMigration ? 'checked' : ''} 
                   onchange="handleSettingChange('validateAfterMigration', this.checked)">
            <span class="setting-text">Validate after migration</span>
          </label>
          <p class="setting-description">Run validation checks after applying migrations</p>
        </div>
      </div>
    `;

    contentArea.innerHTML = '';
    contentArea.appendChild(settingsContainer);
  }

  // Global functions for onclick handlers
  window.handleApproveMigration = handleApproveMigration;
  window.handleRejectMigration = handleRejectMigration;
  window.handleRollbackMigration = handleRollbackMigration;
  window.handlePreviewDiff = handlePreviewDiff;
  window.handlePauseMigration = handlePauseMigration;
  window.handleResumeMigration = handleResumeMigration;
  window.handleSettingChange = handleSettingChange;

  function render() {
    if (!rootElement) return;

    rootElement.innerHTML = '';

    const container = createElement('div', { className: 'migration-panel' });

    container.appendChild(renderHeader());
    container.appendChild(renderTabs());
    
    contentArea = createElement('div', { className: 'content-area' });
    container.appendChild(contentArea);

    rootElement.appendChild(container);

    // Render initial tab
    handleTabChange(currentState.activeTab);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();