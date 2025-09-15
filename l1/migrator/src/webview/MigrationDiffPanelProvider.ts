import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for migration diff item
 */
export interface MigrationDiffItem {
  id: string;
  filePath: string;
  lineNumber: number;
  endpointType: string;
  originalCode: string;
  migratedCode: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
  confidence: number;
  changes: {
    fieldChanges: Array<{
      from: string;
      to: string;
      line: number;
      type: 'field_mapping' | 'endpoint_change' | 'syntax_fix';
    }>;
    endpointChanges: Array<{
      from: string;
      to: string;
      line: number;
    }>;
    addedLines: string[];
    removedLines: string[];
  };
  validation: {
    syntaxValid: boolean;
    securityIssues: string[];
    warnings: string[];
  };
  timestamp: string;
  notes?: string;
}

/**
 * Interface for migration history entry
 */
export interface MigrationHistoryEntry {
  id: string;
  action: 'approve' | 'reject' | 'apply' | 'rollback' | 'add' | 'remove' | 'clear';
  timestamp: string;
  itemId: string;
  details: string;
  user?: string;
}

/**
 * Interface for migration panel state
 */
interface MigrationDiffPanelState {
  currentItem: MigrationDiffItem | null;
  items: MigrationDiffItem[];
  history: MigrationHistoryEntry[];
  isProcessing: boolean;
  showDiff: boolean;
  diffMode: 'side-by-side' | 'inline';
  filterStatus: 'all' | 'pending' | 'approved' | 'rejected';
}

/**
 * Provider for migration diff panel with approval workflow
 */
export class MigrationDiffPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'converge-elavon.migrationDiff';

  private _view?: vscode.WebviewView;
  private _currentState: MigrationDiffPanelState = {
    currentItem: null,
    items: [],
    history: [],
    isProcessing: false,
    showDiff: true,
    diffMode: 'side-by-side',
    filterStatus: 'all'
  };

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'media')
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'approveMigration':
            this._approveMigration(message.itemId);
            break;
          case 'rejectMigration':
            this._rejectMigration(message.itemId, message.reason);
            break;
          case 'applyMigration':
            this._applyMigration(message.itemId);
            break;
          case 'rollbackMigration':
            this._rollbackMigration(message.itemId);
            break;
          case 'selectItem':
            this._selectItem(message.itemId);
            break;
          case 'setDiffMode':
            this._setDiffMode(message.mode);
            break;
          case 'setFilter':
            this._setFilter(message.status);
            break;
          case 'clearHistory':
            this._clearHistory();
            break;
          case 'exportReport':
            this._exportReport();
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );

    // Initialize with current state
    this._updateWebviewState();
  }

  /**
   * Add migration item for review
   */
  public addMigrationItem(item: Omit<MigrationDiffItem, 'id' | 'status' | 'timestamp'>): void {
    const migrationItem: MigrationDiffItem = {
      ...item,
      id: this._generateId(),
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    this._currentState.items.push(migrationItem);
    
    // Auto-select if it's the first item
    if (!this._currentState.currentItem) {
      this._currentState.currentItem = migrationItem;
    }

    this._updateWebviewState();
    this._addHistoryEntry('add', migrationItem.id, `Added migration item for ${migrationItem.filePath}:${migrationItem.lineNumber}`);
  }

  /**
   * Remove migration item
   */
  public removeMigrationItem(itemId: string): void {
    const index = this._currentState.items.findIndex(item => item.id === itemId);
    if (index >= 0) {
      const item = this._currentState.items[index];
      this._currentState.items.splice(index, 1);
      
      // Update current item if it was removed
      if (this._currentState.currentItem?.id === itemId) {
        this._currentState.currentItem = this._currentState.items[0] || null;
      }

      this._updateWebviewState();
      this._addHistoryEntry('remove', itemId, `Removed migration item for ${item.filePath}:${item.lineNumber}`);
    }
  }

  /**
   * Get migration items by status
   */
  public getMigrationItems(status?: MigrationDiffItem['status']): MigrationDiffItem[] {
    if (status) {
      return this._currentState.items.filter(item => item.status === status);
    }
    return [...this._currentState.items];
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): MigrationHistoryEntry[] {
    return [...this._currentState.history];
  }

  /**
   * Clear all migration items
   */
  public clearAllItems(): void {
    this._currentState.items = [];
    this._currentState.currentItem = null;
    this._updateWebviewState();
    this._addHistoryEntry('clear', 'all', 'Cleared all migration items');
  }

  /**
   * Approve migration
   */
  private _approveMigration(itemId: string): void {
    const item = this._currentState.items.find(i => i.id === itemId);
    if (item) {
      item.status = 'approved';
      this._updateWebviewState();
      this._addHistoryEntry('approve', itemId, `Approved migration for ${item.filePath}:${item.lineNumber}`);
      
      // Show success message
      vscode.window.showInformationMessage(`Migration approved for ${path.basename(item.filePath)}:${item.lineNumber}`);
    }
  }

  /**
   * Reject migration
   */
  private _rejectMigration(itemId: string, reason?: string): void {
    const item = this._currentState.items.find(i => i.id === itemId);
    if (item) {
      item.status = 'rejected';
      if (reason) {
        item.notes = reason;
      }
      this._updateWebviewState();
      this._addHistoryEntry('reject', itemId, `Rejected migration for ${item.filePath}:${item.lineNumber}${reason ? ` - ${reason}` : ''}`);
      
      // Show warning message
      vscode.window.showWarningMessage(`Migration rejected for ${path.basename(item.filePath)}:${item.lineNumber}`);
    }
  }

  /**
   * Apply migration to file
   */
  private async _applyMigration(itemId: string): Promise<void> {
    const item = this._currentState.items.find(i => i.id === itemId);
    if (!item || item.status !== 'approved') {
      vscode.window.showErrorMessage('Migration must be approved before applying');
      return;
    }

    try {
      this._currentState.isProcessing = true;
      this._updateWebviewState();

      // Read the current file
      const document = await vscode.workspace.openTextDocument(item.filePath);
      const currentText = document.getText();
      
      // Create backup
      await this._createBackup(item.filePath, currentText);
      
      // Apply the migration
      const lines = currentText.split('\n');
      lines[item.lineNumber - 1] = item.migratedCode;
      const newText = lines.join('\n');
      
      // Write the updated content
      const edit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
      
      const success = await vscode.workspace.applyEdit(edit);
      
      if (success) {
        item.status = 'applied';
        this._addHistoryEntry('apply', itemId, `Applied migration to ${item.filePath}:${item.lineNumber}`);
        vscode.window.showInformationMessage(`Migration applied to ${path.basename(item.filePath)}:${item.lineNumber}`);
      } else {
        throw new Error('Failed to apply workspace edit');
      }
    } catch (error) {
      item.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._addHistoryEntry('apply', itemId, `Failed to apply migration: ${errorMessage}`);
      vscode.window.showErrorMessage(`Failed to apply migration: ${errorMessage}`);
    } finally {
      this._currentState.isProcessing = false;
      this._updateWebviewState();
    }
  }

  /**
   * Rollback migration
   */
  private async _rollbackMigration(itemId: string): Promise<void> {
    const item = this._currentState.items.find(i => i.id === itemId);
    if (!item || item.status !== 'applied') {
      vscode.window.showErrorMessage('Can only rollback applied migrations');
      return;
    }

    try {
      this._currentState.isProcessing = true;
      this._updateWebviewState();

      // Restore from backup
      const backupPath = this._getBackupPath(item.filePath, item.id);
      const backupUri = vscode.Uri.file(backupPath);
      
      try {
        const backupContent = await vscode.workspace.fs.readFile(backupUri);
        const document = await vscode.workspace.openTextDocument(item.filePath);
        
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), backupContent.toString());
        
        const success = await vscode.workspace.applyEdit(edit);
        
        if (success) {
          item.status = 'pending';
          this._addHistoryEntry('rollback', itemId, `Rolled back migration for ${item.filePath}:${item.lineNumber}`);
          vscode.window.showInformationMessage(`Migration rolled back for ${path.basename(item.filePath)}:${item.lineNumber}`);
        } else {
          throw new Error('Failed to apply rollback edit');
        }
      } catch (backupError) {
        throw new Error(`Backup file not found or corrupted: ${backupError instanceof Error ? backupError.message : 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._addHistoryEntry('rollback', itemId, `Failed to rollback migration: ${errorMessage}`);
      vscode.window.showErrorMessage(`Failed to rollback migration: ${errorMessage}`);
    } finally {
      this._currentState.isProcessing = false;
      this._updateWebviewState();
    }
  }

  /**
   * Select migration item
   */
  private _selectItem(itemId: string): void {
    const item = this._currentState.items.find(i => i.id === itemId);
    if (item) {
      this._currentState.currentItem = item;
      this._updateWebviewState();
    }
  }

  /**
   * Set diff mode
   */
  private _setDiffMode(mode: 'side-by-side' | 'inline'): void {
    this._currentState.diffMode = mode;
    this._updateWebviewState();
  }

  /**
   * Set filter status
   */
  private _setFilter(status: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this._currentState.filterStatus = status;
    this._updateWebviewState();
  }

  /**
   * Clear migration history
   */
  private _clearHistory(): void {
    this._currentState.history = [];
    this._updateWebviewState();
    vscode.window.showInformationMessage('Migration history cleared');
  }

  /**
   * Export migration report
   */
  private async _exportReport(): Promise<void> {
    try {
      const report = this._generateReport();
      const reportPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'migration-report.json');
      
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(reportPath),
        Buffer.from(JSON.stringify(report, null, 2))
      );
      
      vscode.window.showInformationMessage(`Migration report exported to ${reportPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate migration report
   */
  private _generateReport(): any {
    const summary = {
      totalItems: this._currentState.items.length,
      pending: this._currentState.items.filter(i => i.status === 'pending').length,
      approved: this._currentState.items.filter(i => i.status === 'approved').length,
      rejected: this._currentState.items.filter(i => i.status === 'rejected').length,
      applied: this._currentState.items.filter(i => i.status === 'applied').length,
      failed: this._currentState.items.filter(i => i.status === 'failed').length
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      items: this._currentState.items,
      history: this._currentState.history
    };
  }

  /**
   * Create backup of file before applying migration
   */
  private async _createBackup(filePath: string, content: string): Promise<void> {
    const backupPath = this._getBackupPath(filePath, this._generateId());
    const backupUri = vscode.Uri.file(backupPath);
    
    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(backupDir));
    
    // Write backup file
    await vscode.workspace.fs.writeFile(backupUri, Buffer.from(content));
  }

  /**
   * Get backup file path
   */
  private _getBackupPath(filePath: string, itemId: string): string {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const backupDir = path.join(workspaceRoot, '.kiro', 'backups');
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(backupDir, `${fileName}.${itemId}.${timestamp}.backup`);
  }

  /**
   * Add history entry
   */
  private _addHistoryEntry(action: MigrationHistoryEntry['action'], itemId: string, details: string): void {
    const entry: MigrationHistoryEntry = {
      id: this._generateId(),
      action,
      timestamp: new Date().toISOString(),
      itemId,
      details
    };

    this._currentState.history.unshift(entry); // Add to beginning
    
    // Keep only last 100 entries
    if (this._currentState.history.length > 100) {
      this._currentState.history = this._currentState.history.slice(0, 100);
    }
  }

  /**
   * Update webview state
   */
  private _updateWebviewState(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'stateUpdate',
        state: this._currentState
      });
    }
  }

  /**
   * Send message to webview
   */
  private _sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Generate unique ID
   */
  private _generateId(): string {
    return `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get HTML for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'migrationDiffPanel.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'migrationDiffPanel.css'));

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>Migration Diff & Approval</title>
    </head>
    <body>
        <div id="app">
            <div class="header">
                <h2>Migration Diff & Approval</h2>
                <div class="controls">
                    <select id="filterSelect">
                        <option value="all">All Items</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select id="diffModeSelect">
                        <option value="side-by-side">Side by Side</option>
                        <option value="inline">Inline</option>
                    </select>
                    <button id="exportBtn" class="secondary">Export Report</button>
                </div>
            </div>

            <div class="content">
                <div class="sidebar">
                    <div class="item-list">
                        <div id="itemList"></div>
                    </div>
                    <div class="history-section">
                        <h3>History</h3>
                        <div id="historyList"></div>
                        <button id="clearHistoryBtn" class="secondary small">Clear History</button>
                    </div>
                </div>

                <div class="main-panel">
                    <div id="noSelection" class="no-selection">
                        <p>Select a migration item to view diff and approval options</p>
                    </div>
                    
                    <div id="migrationDetails" class="migration-details" style="display: none;">
                        <div class="item-header">
                            <div class="item-info">
                                <h3 id="itemTitle"></h3>
                                <div class="item-meta">
                                    <span id="itemStatus" class="status"></span>
                                    <span id="itemConfidence" class="confidence"></span>
                                    <span id="itemTimestamp" class="timestamp"></span>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button id="approveBtn" class="primary">Approve</button>
                                <button id="rejectBtn" class="danger">Reject</button>
                                <button id="applyBtn" class="success" style="display: none;">Apply</button>
                                <button id="rollbackBtn" class="warning" style="display: none;">Rollback</button>
                            </div>
                        </div>

                        <div class="validation-info">
                            <div id="validationStatus"></div>
                            <div id="securityIssues"></div>
                            <div id="warnings"></div>
                        </div>

                        <div class="diff-container">
                            <div id="diffViewer"></div>
                        </div>

                        <div class="changes-summary">
                            <h4>Changes Summary</h4>
                            <div id="changesList"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}