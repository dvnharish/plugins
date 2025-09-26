import * as vscode from 'vscode';
import { ExtensionManager } from './core/ExtensionManager';

let extensionManager: ExtensionManager;

/**
 * This method is called when the extension is activated
 * The extension is activated the very first time the command is executed
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('🚀 Converge-Elavon Migrator extension is now active!');
  console.log('📁 Extension path:', context.extensionPath);
  console.log('🔧 Extension ID:', context.extension.id);
  
  try {
    // Register a simple test command first to verify activation
    const testDisposable = vscode.commands.registerCommand('elavonx.test', () => {
      console.log('🧪 Test command executed');
      vscode.window.showInformationMessage('ElavonX extension is working!');
    });
    context.subscriptions.push(testDisposable);
    
    // Note: Scan project command will be registered by ExtensionManager
    
    // Register panel test commands
    const panelTestCommands = [
      'elavonx.testScanPanel',
      'elavonx.testCredentialsPanel', 
      'elavonx.testDocumentationPanel',
      'elavonx.testMigrationPanel',
      'elavonx.testReportPanel',
      'elavonx.testAllPanels'
    ];
    
    panelTestCommands.forEach(command => {
      const disposable = vscode.commands.registerCommand(command, async () => {
        console.log(`🧪 ${command} executed`);
        vscode.window.showInformationMessage(`${command} executed! Check console for details.`);
      });
      context.subscriptions.push(disposable);
    });
    
    console.log('✅ Commands registered directly');
    
    // Initialize the full extension with proper error handling
    console.log('🔧 Initializing ExtensionManager...');
    extensionManager = new ExtensionManager(context);
    await extensionManager.initialize();
    
    console.log('✅ ElavonX extension activated successfully with full functionality');
    console.log('📋 Available commands: elavonx.scanProject, elavonx.test, etc.');
  } catch (error) {
    console.error('❌ Failed to activate Converge-Elavon Migrator extension:', error);
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    vscode.window.showErrorMessage(`Failed to activate Converge-Elavon Migrator extension: ${error}`);
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