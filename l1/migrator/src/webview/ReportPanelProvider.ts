import * as vscode from 'vscode';
import * as path from 'path';
import { MigrationService } from '../services/MigrationService';
import { ReportService } from '../services/ReportService';

/**
 * Interface for report panel messages
 */
interface ReportPanelMessage {
  type: 'generateReport' | 'exportReport' | 'refreshReport' | 'filterReport' | 'viewReport';
  data?: any;
}

/**
 * Interface for report panel state
 */
interface ReportPanelState {
  isLoading: boolean;
  reportData: any;
  exportFormats: string[];
  selectedFormat: string;
  filters: {
    dateRange?: string;
    status?: string;
    endpoint?: string;
  };
}

/**
 * Webview provider for the report panel
 */
export class ReportPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'elavonx.reportPanel';

  private _view?: vscode.WebviewView;
  private _migrationService: MigrationService;
  private _reportService: ReportService;
  private _currentState: ReportPanelState = {
    isLoading: false,
    reportData: null,
    exportFormats: ['markdown', 'sarif', 'json', 'csv'],
    selectedFormat: 'markdown',
    filters: {}
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    migrationService?: MigrationService
  ) {
    this._migrationService = migrationService || new MigrationService(
      _context,
      new (require('../services/CopilotService').CopilotService)(_context),
      new (require('../services/OpenApiService').OpenApiService)(),
      new (require('../services/ValidationService').ValidationService)(_context),
      new (require('../services/FileBackupService').FileBackupService)(_context)
    );
    this._reportService = new ReportService();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: ReportPanelMessage) => {
        switch (message.type) {
          case 'generateReport':
            this._generateReport();
            break;
          case 'exportReport':
            this._exportReport(message.data);
            break;
          case 'refreshReport':
            this._refreshReport();
            break;
          case 'filterReport':
            this._filterReport(message.data);
            break;
          case 'viewReport':
            this._viewReport(message.data);
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
   * Generate migration report
   */
  private async _generateReport(): Promise<void> {
    try {
      this._currentState.isLoading = true;
      this._updateWebviewState();

      // Get migration history
      const migrationHistory = this._migrationService.getMigrationHistory();
      const migrationStats = this._migrationService.getMigrationStatistics();

      // Generate report data
      const reportData = await this._reportService.generateReport({
        migrationHistory,
        migrationStats,
        includeDetails: true,
        includeErrors: true,
        includePerformance: true
      });

      this._currentState.reportData = reportData;
      this._currentState.isLoading = false;
      this._updateWebviewState();

      this._sendMessage({
        type: 'reportGenerated',
        data: {
          report: reportData,
          summary: {
            totalMigrations: reportData.totalMigrations,
            successfulMigrations: reportData.successfulMigrations,
            failedMigrations: reportData.failedMigrations,
            successRate: reportData.successRate
          }
        }
      });

    } catch (error) {
      this._currentState.isLoading = false;
      this._updateWebviewState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Report generation failed: ${errorMessage}`);
      
      this._sendMessage({
        type: 'reportError',
        data: { error: errorMessage }
      });
    }
  }

  /**
   * Export report in specified format
   */
  private async _exportReport(data: { format: string; filename?: string }): Promise<void> {
    try {
      if (!this._currentState.reportData) {
        vscode.window.showWarningMessage('No report data available. Please generate a report first.');
        return;
      }

      // Generate export content
      const exportContent = await this._reportService.exportReport(
        this._currentState.reportData,
        data.format
      );

      // Show save dialog
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(data.filename || `migration-report.${data.format}`),
        filters: {
          [data.format.toUpperCase()]: [data.format]
        }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(exportContent, 'utf8'));
        vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Refresh report data
   */
  private async _refreshReport(): Promise<void> {
    await this._generateReport();
  }

  /**
   * Filter report data
   */
  private _filterReport(filters: any): void {
    this._currentState.filters = { ...this._currentState.filters, ...filters };
    this._updateWebviewState();
    
    this._sendMessage({
      type: 'reportFiltered',
      data: { filters: this._currentState.filters }
    });
  }

  /**
   * View specific report details
   */
  private _viewReport(data: { reportId: string }): void {
    if (!this._currentState.reportData) {
      return;
    }

    // Find specific report details
    const reportDetails = this._currentState.reportData.details?.find(
      (detail: any) => detail.id === data.reportId
    );

    if (reportDetails) {
      this._sendMessage({
        type: 'reportDetails',
        data: { details: reportDetails }
      });
    }
  }

  /**
   * Load initial data
   */
  private async _loadInitialData(): Promise<void> {
    try {
      // Check if there's existing migration data
      const migrationHistory = this._migrationService.getMigrationHistory();
      if (migrationHistory.length > 0) {
        await this._generateReport();
      }
    } catch (error) {
      console.error('Failed to load initial report data:', error);
    }
  }

  /**
   * Update webview state
   */
  private _updateWebviewState(): void {
    this._sendMessage({
      type: 'updateState',
      data: this._currentState
    });
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
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reportPanel.js'));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reportPanel.css'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>Migration Report</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  /**
   * Get current report state
   */
  public getReportState(): ReportPanelState {
    return { ...this._currentState };
  }

  /**
   * Generate report programmatically
   */
  public async generateReport(): Promise<any> {
    await this._generateReport();
    return this._currentState.reportData;
  }

  /**
   * Export report programmatically
   */
  public async exportReport(format: string): Promise<string> {
    if (!this._currentState.reportData) {
      throw new Error('No report data available');
    }

    return await this._reportService.exportReport(this._currentState.reportData, format);
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
