import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for migration panel messages
 */
interface MigrationPanelMessage {
  type: 'startMigration' | 'approveMigration' | 'rejectMigration' | 'rollbackMigration' | 'pauseMigration' | 'resumeMigration' | 'getMigrationHistory' | 'previewDiff';
  data?: any;
}

/**
 * Interface for migration item
 */
interface MigrationItem {
  id: string;
  filePath: string;
  lineNumber: number;
  endpointType: string;
  originalCode: string;
  migratedCode: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  confidence: number;
  timestamp: string;
  notes?: string;
}

/**
 * Interface for migration batch
 */
interface MigrationBatch {
  id: string;
  name: string;
  items: MigrationItem[];
  status: 'pending' | 'in_progress' | 'completed' | 'paused' | 'failed';
  progress: {
    total: number;
    completed: number;
    approved: number;
    rejected: number;
  };
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
}

/**
 * Interface for migration panel state
 */
interface MigrationPanelState {
  isProcessing: boolean;
  currentBatch: MigrationBatch | null;
  migrationHistory: MigrationBatch[];
  selectedItem: MigrationItem | null;
  showDiff: boolean;
  activeTab: 'current' | 'history' | 'settings';
  settings: {
    autoApprove: boolean;
    requireConfirmation: boolean;
    createBackups: boolean;
    validateAfterMigration: boolean;
  };
}

/**
 * Webview provider for the migration panel
 */
export class MigrationPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'convergeElavonMigrator.migrationPanel';

  private _view?: vscode.WebviewView;
  private _currentState: MigrationPanelState = {
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

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: MigrationPanelMessage) => {
        switch (message.type) {
          case 'startMigration':
            this._startMigration(message.data);
            break;
          case 'approveMigration':
            this._approveMigration(message.data);
            break;
          case 'rejectMigration':
            this._rejectMigration(message.data);
            break;
          case 'rollbackMigration':
            this._rollbackMigration(message.data);
            break;
          case 'pauseMigration':
            this._pauseMigration();
            break;
          case 'resumeMigration':
            this._resumeMigration();
            break;
          case 'getMigrationHistory':
            this._getMigrationHistory();
            break;
          case 'previewDiff':
            this._previewDiff(message.data);
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );

    // Load initial data
    this._loadInitialData();
  }

  /**
   * Start migration process
   */
  private async _startMigration(data: {
    items: Array<{
      filePath: string;
      lineNumber: number;
      endpointType: string;
      originalCode: string;
    }>;
    batchName?: string;
  }): Promise<void> {
    try {
      this._currentState.isProcessing = true;
      this._updateWebviewState();

      // Create migration batch
      const batch: MigrationBatch = {
        id: this._generateId(),
        name: data.batchName || `Migration ${new Date().toLocaleString()}`,
        items: data.items.map(item => ({
          id: this._generateId(),
          filePath: item.filePath,
          lineNumber: item.lineNumber,
          endpointType: item.endpointType,
          originalCode: item.originalCode,
          migratedCode: '', // Will be generated
          status: 'pending',
          confidence: 0.8, // Default confidence
          timestamp: new Date().toISOString()
        })),
        status: 'pending',
        progress: {
          total: data.items.length,
          completed: 0,
          approved: 0,
          rejected: 0
        },
        startTime: new Date().toISOString()
      };

      this._currentState.currentBatch = batch;
      this._updateWebviewState();

      // Start processing items
      await this._processMigrationBatch(batch);

    } catch (error) {
      this._currentState.isProcessing = false;
      this._updateWebviewState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Migration failed: ${errorMessage}`);
    }
  }

  /**
   * Process migration batch
   */
  private async _processMigrationBatch(batch: MigrationBatch): Promise<void> {
    batch.status = 'in_progress';
    this._updateWebviewState();

    for (const item of batch.items) {
      if ((batch.status as string) === 'paused') {
        break;
      }

      try {
        // Generate migrated code (mock implementation)
        item.migratedCode = await this._generateMigratedCode(item);
        item.status = 'pending';
        
        this._sendMessage({
          type: 'migrationItemReady',
          data: {
            batchId: batch.id,
            item: item
          }
        });

        // If auto-approve is enabled, approve automatically
        if (this._currentState.settings.autoApprove && item.confidence >= 0.8) {
          await this._approveMigrationItem(item);
        } else {
          // Wait for user approval
          await this._waitForApproval(item);
        }

      } catch (error) {
        item.status = 'failed';
        item.notes = error instanceof Error ? error.message : 'Unknown error';
        
        this._sendMessage({
          type: 'migrationItemFailed',
          data: {
            batchId: batch.id,
            item: item,
            error: item.notes
          }
        });
      }

      this._updateBatchProgress(batch);
    }

    // Complete batch if not paused
    if ((batch.status as string) !== 'paused') {
      batch.status = 'completed';
      batch.endTime = new Date().toISOString();
      this._currentState.migrationHistory.push(batch);
      this._currentState.currentBatch = null;
      this._currentState.isProcessing = false;
    }

    this._updateWebviewState();
  }

  /**
   * Generate migrated code (mock implementation)
   */
  private async _generateMigratedCode(item: MigrationItem): Promise<string> {
    // Mock code generation - in real implementation, this would use Copilot or mapping service
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    // Simple transformation example
    let migratedCode = item.originalCode;
    
    // Replace common Converge patterns with Elavon equivalents
    migratedCode = migratedCode.replace(/ssl_merchant_id/g, 'merchant_id');
    migratedCode = migratedCode.replace(/ssl_amount/g, 'amount');
    migratedCode = migratedCode.replace(/ssl_card_number/g, 'card_number');
    migratedCode = migratedCode.replace(/ssl_exp_date/g, 'expiry_date');
    migratedCode = migratedCode.replace(/\/hosted-payments/g, '/v1/payments');
    
    return migratedCode;
  }

  /**
   * Wait for user approval
   */
  private async _waitForApproval(item: MigrationItem): Promise<void> {
    return new Promise((resolve) => {
      const checkApproval = () => {
        if (item.status === 'approved' || item.status === 'rejected') {
          resolve();
        } else {
          setTimeout(checkApproval, 100);
        }
      };
      checkApproval();
    });
  }

  /**
   * Approve migration item
   */
  private async _approveMigration(data: { itemId: string }): Promise<void> {
    const item = this._findMigrationItem(data.itemId);
    if (item) {
      await this._approveMigrationItem(item);
    }
  }

  /**
   * Approve migration item implementation
   */
  private async _approveMigrationItem(item: MigrationItem): Promise<void> {
    try {
      // Create backup if enabled
      if (this._currentState.settings.createBackups) {
        await this._createBackup(item.filePath);
      }

      // Apply migration
      await this._applyMigration(item);
      
      item.status = 'completed';
      
      if (this._currentState.currentBatch) {
        this._currentState.currentBatch.progress.approved++;
        this._updateBatchProgress(this._currentState.currentBatch);
      }

      this._sendMessage({
        type: 'migrationApproved',
        data: { itemId: item.id }
      });

      vscode.window.showInformationMessage(`Migration applied: ${path.basename(item.filePath)}:${item.lineNumber}`);

    } catch (error) {
      item.status = 'failed';
      item.notes = error instanceof Error ? error.message : 'Unknown error';
      
      vscode.window.showErrorMessage(`Failed to apply migration: ${item.notes}`);
    }
  }

  /**
   * Reject migration item
   */
  private async _rejectMigration(data: { itemId: string; reason?: string }): Promise<void> {
    const item = this._findMigrationItem(data.itemId);
    if (item) {
      item.status = 'rejected';
      item.notes = data.reason || 'Rejected by user';
      
      if (this._currentState.currentBatch) {
        this._currentState.currentBatch.progress.rejected++;
        this._updateBatchProgress(this._currentState.currentBatch);
      }

      this._sendMessage({
        type: 'migrationRejected',
        data: { itemId: item.id, reason: item.notes }
      });

      vscode.window.showInformationMessage(`Migration rejected: ${path.basename(item.filePath)}:${item.lineNumber}`);
    }
  }

  /**
   * Rollback migration
   */
  private async _rollbackMigration(data: { itemId: string }): Promise<void> {
    const item = this._findMigrationItem(data.itemId);
    if (item && item.status === 'completed') {
      try {
        await this._restoreBackup(item.filePath);
        item.status = 'pending';
        item.notes = 'Rolled back by user';

        this._sendMessage({
          type: 'migrationRolledBack',
          data: { itemId: item.id }
        });

        vscode.window.showInformationMessage(`Migration rolled back: ${path.basename(item.filePath)}:${item.lineNumber}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Rollback failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Pause migration
   */
  private _pauseMigration(): void {
    if (this._currentState.currentBatch) {
      this._currentState.currentBatch.status = 'paused';
      this._updateWebviewState();
      vscode.window.showInformationMessage('Migration paused');
    }
  }

  /**
   * Resume migration
   */
  private async _resumeMigration(): Promise<void> {
    if (this._currentState.currentBatch && this._currentState.currentBatch.status === 'paused') {
      await this._processMigrationBatch(this._currentState.currentBatch);
    }
  }

  /**
   * Get migration history
   */
  private _getMigrationHistory(): void {
    this._sendMessage({
      type: 'migrationHistory',
      data: this._currentState.migrationHistory
    });
  }

  /**
   * Preview diff for migration item
   */
  private _previewDiff(data: { itemId: string }): void {
    const item = this._findMigrationItem(data.itemId);
    if (item) {
      this._currentState.selectedItem = item;
      this._currentState.showDiff = true;
      this._updateWebviewState();

      this._sendMessage({
        type: 'diffPreview',
        data: {
          itemId: item.id,
          filePath: item.filePath,
          lineNumber: item.lineNumber,
          originalCode: item.originalCode,
          migratedCode: item.migratedCode,
          diff: this._generateDiff(item.originalCode, item.migratedCode)
        }
      });
    }
  }

  /**
   * Generate diff between original and migrated code
   */
  private _generateDiff(original: string, migrated: string): Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber?: number;
  }> {
    const originalLines = original.split('\n');
    const migratedLines = migrated.split('\n');
    const diff: Array<{ type: 'added' | 'removed' | 'unchanged'; content: string; lineNumber?: number }> = [];

    // Simple diff implementation
    const maxLines = Math.max(originalLines.length, migratedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const migratedLine = migratedLines[i];

      if (originalLine === migratedLine) {
        diff.push({
          type: 'unchanged',
          content: originalLine || '',
          lineNumber: i + 1
        });
      } else {
        if (originalLine !== undefined) {
          diff.push({
            type: 'removed',
            content: originalLine,
            lineNumber: i + 1
          });
        }
        if (migratedLine !== undefined) {
          diff.push({
            type: 'added',
            content: migratedLine,
            lineNumber: i + 1
          });
        }
      }
    }

    return diff;
  }

  /**
   * Create backup of file
   */
  private async _createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    const originalContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    await vscode.workspace.fs.writeFile(vscode.Uri.file(backupPath), originalContent);
  }

  /**
   * Restore backup of file
   */
  private async _restoreBackup(filePath: string): Promise<void> {
    // Find the most recent backup
    const backupPattern = `${filePath}.backup.*`;
    // In a real implementation, you would search for backup files
    // For now, we'll just show a message
    throw new Error('Backup restoration not implemented in this demo');
  }

  /**
   * Apply migration to file
   */
  private async _applyMigration(item: MigrationItem): Promise<void> {
    const document = await vscode.workspace.openTextDocument(item.filePath);
    const edit = new vscode.WorkspaceEdit();
    
    // Calculate the range to replace
    const startLine = Math.max(0, item.lineNumber - 1);
    const originalLines = item.originalCode.split('\n');
    const endLine = startLine + originalLines.length;
    
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, 0)
    );
    
    edit.replace(document.uri, range, item.migratedCode + '\n');
    await vscode.workspace.applyEdit(edit);
  }

  /**
   * Find migration item by ID
   */
  private _findMigrationItem(itemId: string): MigrationItem | undefined {
    if (this._currentState.currentBatch) {
      return this._currentState.currentBatch.items.find(item => item.id === itemId);
    }
    
    for (const batch of this._currentState.migrationHistory) {
      const item = batch.items.find(item => item.id === itemId);
      if (item) return item;
    }
    
    return undefined;
  }

  /**
   * Update batch progress
   */
  private _updateBatchProgress(batch: MigrationBatch): void {
    batch.progress.completed = batch.items.filter(item => 
      item.status === 'completed' || item.status === 'rejected' || item.status === 'failed'
    ).length;
    
    this._updateWebviewState();
  }

  /**
   * Generate unique ID
   */
  private _generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Load initial data
   */
  private async _loadInitialData(): Promise<void> {
    // Load migration history from storage
    const storedHistory = this._context.globalState.get<MigrationBatch[]>('migrationHistory', []);
    this._currentState.migrationHistory = storedHistory;
    this._updateWebviewState();
  }

  /**
   * Update webview state
   */
  private _updateWebviewState(): void {
    this._sendMessage({
      type: 'updateState',
      data: this._currentState
    });

    // Save state to storage
    this._context.globalState.update('migrationHistory', this._currentState.migrationHistory);
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
   * Get HTML content for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'migrationPanel.js'));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'migrationPanel.css'));

    // Monaco Editor resources
    const monacoLoaderUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'loader.js'));
    const monacoBaseUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; worker-src blob:; font-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>Migration Manager</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}">
          // Monaco Editor configuration
          window.MonacoEnvironment = {
            getWorkerUrl: function (moduleId, label) {
              if (label === 'json') {
                return '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'language', 'json', 'json.worker.js'))}';
              }
              if (label === 'css' || label === 'scss' || label === 'less') {
                return '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'language', 'css', 'css.worker.js'))}';
              }
              if (label === 'html' || label === 'handlebars' || label === 'razor') {
                return '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'language', 'html', 'html.worker.js'))}';
              }
              if (label === 'typescript' || label === 'javascript') {
                return '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'language', 'typescript', 'ts.worker.js'))}';
              }
              return '${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'editor', 'editor.worker.js'))}';
            }
          };
        </script>
        <script nonce="${nonce}" src="${monacoLoaderUri}"></script>
        <script nonce="${nonce}">
          require.config({ paths: { 'vs': '${monacoBaseUri}' }});
          require(['vs/editor/editor.main'], function() {
            // Monaco is loaded, now load our script
            const script = document.createElement('script');
            script.nonce = '${nonce}';
            script.src = '${scriptUri}';
            document.head.appendChild(script);
          });
        </script>
      </body>
      </html>`;
  }

  /**
   * Get current migration state
   */
  public getMigrationState(): MigrationPanelState {
    return { ...this._currentState };
  }

  /**
   * Start migration programmatically
   */
  public async startMigration(items: Array<{
    filePath: string;
    lineNumber: number;
    endpointType: string;
    originalCode: string;
  }>, batchName?: string): Promise<void> {
    await this._startMigration({ items, ...(batchName && { batchName }) });
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): MigrationBatch[] {
    return this._currentState.migrationHistory;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}