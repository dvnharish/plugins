import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspaceScannerService, ScanResult as WorkspaceScanResult } from '../services/WorkspaceScannerService';
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';
import { PatternMatchingService } from '../services/PatternMatchingService';

/**
 * Interface for scan panel messages
 */
interface ScanPanelMessage {
  type: 'startScan' | 'stopScan' | 'openFile' | 'refreshScan' | 'filterResults';
  data?: any;
}

/**
 * Interface for endpoint result (for UI display)
 */
interface EndpointResult {
  filePath: string;
  lineNumber: number;
  endpointType: string;
  confidence: number;
  language: string;
  matchedPattern: string;
  context: string;
}

/**
 * Interface for scan panel state
 */
interface ScanPanelState {
  isScanning: boolean;
  scanResults: EndpointResult[];
  totalFiles: number;
  scannedFiles: number;
  progress: number;
  filters: {
    language?: string;
    endpoint?: string;
    confidence?: number;
  };
}

/**
 * Webview provider for the scan panel
 */
export class ScanPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'convergeElavonMigrator.scanPanel';

  private _view?: vscode.WebviewView;
  private _scannerService: WorkspaceScannerService;
  private _patternService: PatternMatchingService;
  private _currentScanResults: EndpointResult[] = [];
  private _isScanning = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    scannerService?: WorkspaceScannerService
  ) {
    // Use provided scanner service or create a new one with ParserService
    this._scannerService = scannerService || new WorkspaceScannerService(new (require('../services/ParserService').ParserService)());
    this._patternService = new PatternMatchingService();
  }

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
      (message: ScanPanelMessage) => {
        switch (message.type) {
          case 'startScan':
            this._startScan();
            break;
          case 'stopScan':
            this._stopScan();
            break;
          case 'openFile':
            this._openFile(message.data);
            break;
          case 'refreshScan':
            this._refreshScan();
            break;
          case 'filterResults':
            this._filterResults(message.data);
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );

    // Send initial state
    this._updateWebviewState();
  }

  /**
   * Start workspace scan
   */
  private async _startScan(): Promise<void> {
    if (this._isScanning) {
      return;
    }

    this._isScanning = true;
    this._currentScanResults = [];
    
    this._updateWebviewState();

    try {
      // Get workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;

      // Start scanning with progress updates
      const scanResult = await this._scannerService.scanWorkspace({
        progressCallback: (progress) => {
          this._sendProgressUpdate({
            scannedFiles: progress.filesProcessed,
            totalFiles: progress.totalFiles
          });
        }
      });

      // Convert ConvergeEndpoints to EndpointResults for UI
      const endpointResults: EndpointResult[] = [];
      for (const endpoint of scanResult.endpoints) {
        // Extract language from file extension
        const fileExt = endpoint.filePath.split('.').pop()?.toLowerCase() || '';
        const language = this._getLanguageFromExtension(fileExt);
        
        endpointResults.push({
          filePath: endpoint.filePath,
          lineNumber: endpoint.lineNumber,
          endpointType: endpoint.endpointType.toString(),
          confidence: 0.8, // Default confidence for now
          language: language,
          matchedPattern: endpoint.sslFields.join(', ') || 'Unknown',
          context: endpoint.code.substring(0, 100) + (endpoint.code.length > 100 ? '...' : '')
        });
      }

      this._currentScanResults = endpointResults;
      this._isScanning = false;
      this._updateWebviewState();

      vscode.window.showInformationMessage(
        `Scan completed! Found ${endpointResults.length} Converge endpoints.`
      );

    } catch (error) {
      this._isScanning = false;
      this._updateWebviewState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Scan failed: ${errorMessage}`);
    }
  }

  /**
   * Stop current scan
   */
  private _stopScan(): void {
    this._isScanning = false;
    this._updateWebviewState();
    vscode.window.showInformationMessage('Scan stopped');
  }

  /**
   * Refresh scan results
   */
  private async _refreshScan(): Promise<void> {
    await this._startScan();
  }

  /**
   * Open file at specific location
   */
  private async _openFile(data: { filePath: string; lineNumber: number }): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(data.filePath);
      const editor = await vscode.window.showTextDocument(document);
      
      // Navigate to specific line
      const position = new vscode.Position(Math.max(0, data.lineNumber - 1), 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
      
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${data.filePath}`);
    }
  }

  /**
   * Filter scan results
   */
  private _filterResults(filters: any): void {
    this._sendMessage({
      type: 'updateFilters',
      data: filters
    });
  }

  /**
   * Send progress update to webview
   */
  private _sendProgressUpdate(progress: { scannedFiles: number; totalFiles: number }): void {
    this._sendMessage({
      type: 'progressUpdate',
      data: {
        scannedFiles: progress.scannedFiles,
        totalFiles: progress.totalFiles,
        progress: progress.totalFiles > 0 ? (progress.scannedFiles / progress.totalFiles) * 100 : 0
      }
    });
  }

  /**
   * Update webview with current results
   */
  private _updateWebviewResults(): void {
    this._sendMessage({
      type: 'updateResults',
      data: this._currentScanResults
    });
  }

  /**
   * Update webview state
   */
  private _updateWebviewState(): void {
    const state: ScanPanelState = {
      isScanning: this._isScanning,
      scanResults: this._currentScanResults,
      totalFiles: 0,
      scannedFiles: 0,
      progress: 0,
      filters: {}
    };

    this._sendMessage({
      type: 'updateState',
      data: state
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
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scanPanel.js'));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'scanPanel.css'));

    // Use a nonce to only allow a specific script to be run.
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
        <title>Converge Endpoint Scanner</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  /**
   * Get scan results for external access
   */
  public getScanResults(): EndpointResult[] {
    return this._currentScanResults;
  }

  /**
   * Check if currently scanning
   */
  public isScanning(): boolean {
    return this._isScanning;
  }

  /**
   * Trigger scan programmatically
   */
  public async triggerScan(): Promise<void> {
    await this._startScan();
  }

  /**
   * Get language from file extension
   */
  private _getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'php': 'PHP',
      'py': 'Python',
      'java': 'Java',
      'cs': 'C#',
      'rb': 'Ruby',
      'go': 'Go',
      'cpp': 'C++',
      'c': 'C',
      'html': 'HTML',
      'htm': 'HTML'
    };
    
    return languageMap[extension] || 'Unknown';
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