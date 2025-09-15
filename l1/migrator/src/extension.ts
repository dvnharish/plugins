import * as vscode from 'vscode';
import { ExtensionManager } from './core/ExtensionManager';

let extensionManager: ExtensionManager;

/**
 * This method is called when the extension is activated
 * The extension is activated the very first time the command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Converge-Elavon Migrator extension is now active!');
  
  try {
    extensionManager = new ExtensionManager(context);
    await extensionManager.initialize();
  } catch (error) {
    console.error('Failed to activate Converge-Elavon Migrator extension:', error);
    vscode.window.showErrorMessage('Failed to activate Converge-Elavon Migrator extension');
  }
}

/**
 * This method is called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Converge-Elavon Migrator extension is being deactivated');
  
  if (extensionManager) {
    extensionManager.dispose();
  }
}