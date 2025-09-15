import * as vscode from 'vscode';
import { ServiceContainer } from './ServiceContainer';

/**
 * Manages webview panels for the extension
 */
export class PanelManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly _serviceContainer: ServiceContainer
  ) {}

  /**
   * Initialize all panels
   */
  public initialize(): void {
    // TODO: Register webview providers for each panel
    // - Scan Panel
    // - Credentials Panel  
    // - Documentation Panel
    // - Migration Panel
    
    console.log('Panel manager initialized - panels will be implemented in subsequent tasks');
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}