import * as vscode from 'vscode';
import { ServiceContainer } from './ServiceContainer';
import { ScanViewProvider } from '../webview/ScanViewProvider';
import { CredentialsViewProvider } from '../webview/CredentialsViewProvider';
import { MigrationViewProvider } from '../webview/MigrationViewProvider';
import { ReportViewProvider } from '../webview/ReportViewProvider';
import { ScanPanelProvider } from '../webview/ScanPanelProvider';
import { CredentialsPanelProvider } from '../webview/CredentialsPanelProvider';
import { DocumentationPanelProvider } from '../webview/DocumentationPanelProvider';
import { MigrationPanelProvider } from '../webview/MigrationPanelProvider';
import { ReportPanelProvider } from '../webview/ReportPanelProvider';

/**
 * Manages webview panels for the extension
 */
export class PanelManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private scanViewProvider: ScanViewProvider;
  private credentialsViewProvider: CredentialsViewProvider;
  private migrationViewProvider: MigrationViewProvider;
  private reportViewProvider: ReportViewProvider;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _serviceContainer: ServiceContainer
  ) {
    // Initialize data providers (ReportViewProvider will be initialized later)
    this.scanViewProvider = new ScanViewProvider(this._serviceContainer);
    this.credentialsViewProvider = new CredentialsViewProvider(this._serviceContainer);
    this.migrationViewProvider = new MigrationViewProvider(this._serviceContainer);
    // ReportViewProvider will be initialized in initialize() method after services are ready
  }

  /**
   * Initialize all panels
   */
  public initialize(): void {
    // Initialize ReportViewProvider now that services are ready
    this.reportViewProvider = new ReportViewProvider(this._serviceContainer.getMigrationService());
    
    // Register tree data providers for Activity Bar views
    this.disposables.push(
      vscode.window.createTreeView('elavonx.scanView', {
        treeDataProvider: this.scanViewProvider,
        showCollapseAll: true
      })
    );

    this.disposables.push(
      vscode.window.createTreeView('elavonx.credentialsView', {
        treeDataProvider: this.credentialsViewProvider,
        showCollapseAll: false
      })
    );

    this.disposables.push(
      vscode.window.createTreeView('elavonx.migrationView', {
        treeDataProvider: this.migrationViewProvider,
        showCollapseAll: false
      })
    );

    this.disposables.push(
      vscode.window.createTreeView('elavonx.reportView', {
        treeDataProvider: this.reportViewProvider,
        showCollapseAll: false
      })
    );

    // Register webview providers
    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'elavonx.scanPanel',
        new ScanPanelProvider(this._context.extensionUri, this._context)
      )
    );

    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'elavonx.credentialsPanel',
        new CredentialsPanelProvider(this._context.extensionUri, this._context)
      )
    );

    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'elavonx.documentationPanel',
        new DocumentationPanelProvider(this._context.extensionUri, this._context)
      )
    );

    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'elavonx.migrationPanel',
        new MigrationPanelProvider(this._context.extensionUri, this._context)
      )
    );

    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        'elavonx.reportPanel',
        new ReportPanelProvider(this._context.extensionUri, this._context)
      )
    );

    console.log('Panel manager initialized with data providers and webview providers');
  }

  /**
   * Update scan view with endpoints
   */
  public updateScanView(endpoints: any[]): void {
    this.scanViewProvider.updateEndpoints(endpoints);
  }

  /**
   * Clear scan view
   */
  public clearScanView(): void {
    this.scanViewProvider.clearEndpoints();
  }

  /**
   * Update credentials view status
   */
  public updateCredentialsView(hasCredentials: boolean): void {
    this.credentialsViewProvider.updateCredentialsStatus(hasCredentials);
  }

  /**
   * Update migration view status
   */
  public updateMigrationView(hasMigrations: boolean, count: number = 0): void {
    this.migrationViewProvider.updateMigrationStatus(hasMigrations, count);
  }

  /**
   * Update report view
   */
  public updateReportView(): void {
    this.reportViewProvider.refresh();
  }

  /**
   * Generate report
   */
  public async generateReport(): Promise<void> {
    await this.reportViewProvider.generateReport();
  }

  /**
   * Export report
   */
  public async exportReport(format: string): Promise<void> {
    await this.reportViewProvider.exportReport(format);
  }

  /**
   * Open credentials panel
   */
  public async openCredentialsPanel(): Promise<void> {
    try {
      console.log('🔐 PanelManager: Opening credentials panel...');
      
      // Try to focus the credentials view first
      await vscode.commands.executeCommand('elavonx.credentialsView.focus');
      console.log('✅ PanelManager: Credentials view focused');
      
      // Also try to show the credentials panel
      try {
        await vscode.commands.executeCommand('elavonx.credentialsPanel.focus');
        console.log('✅ PanelManager: Credentials panel focused');
      } catch (panelError) {
        console.log('⚠️ PanelManager: Credentials panel focus failed, but view should be open');
      }
      
    } catch (error) {
      console.error('❌ PanelManager: Failed to open credentials panel:', error);
      // Fallback: show a message with instructions
      const choice = await vscode.window.showWarningMessage(
        'Could not automatically open credentials panel. Would you like to open it manually?',
        'Open Manually',
        'Cancel'
      );
      
      if (choice === 'Open Manually') {
        vscode.window.showInformationMessage('Please open the Credentials panel from the Activity Bar (ElavonX section)');
      }
    }
  }

  /**
   * Get migration service
   */
  public getMigrationService() {
    return this._serviceContainer.getMigrationService();
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}