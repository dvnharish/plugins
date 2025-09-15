import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry';
import { PanelManager } from './PanelManager';
import { ServiceContainer } from './ServiceContainer';
import { ConfigurationService } from './ConfigurationService';

/**
 * Main extension manager that coordinates all components
 */
export class ExtensionManager implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private commandRegistry: CommandRegistry;
  private panelManager: PanelManager;
  private serviceContainer: ServiceContainer;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.serviceContainer = new ServiceContainer(context);
    this.commandRegistry = new CommandRegistry(this.serviceContainer);
    this.panelManager = new PanelManager(context, this.serviceContainer);
  }

  /**
   * Initialize the extension components
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize services
      this.serviceContainer.initialize();
      
      // Register commands
      this.commandRegistry.registerCommands();
      this.disposables.push(this.commandRegistry);
      
      // Initialize panels
      this.panelManager.initialize();
      this.disposables.push(this.panelManager);
      
      // Register context for conditional UI elements
      this.setContext();
      
      // Set up configuration change listener
      this.setupConfigurationListener();
      
      // Perform startup scan if enabled
      await this.performStartupScan();
      
      console.log('Converge-Elavon Migrator extension initialized successfully');
    } catch (error) {
      console.error('Failed to initialize extension:', error);
      throw error;
    }
  }

  /**
   * Set VS Code context variables for conditional UI
   */
  private setContext(): void {
    vscode.commands.executeCommand('setContext', 'converge-elavon.hasEndpoints', false);
  }

  /**
   * Set up configuration change listener
   */
  private setupConfigurationListener(): void {
    const configListener = ConfigurationService.onConfigurationChanged((e) => {
      console.log('Configuration changed:', e);
      // Handle configuration changes if needed
    });
    this.disposables.push(configListener);
  }

  /**
   * Perform startup scan if enabled
   */
  private async performStartupScan(): Promise<void> {
    if (ConfigurationService.getScanOnStartup() && vscode.workspace.workspaceFolders) {
      console.log('Performing startup scan...');
      try {
        await vscode.commands.executeCommand('converge-elavon.scanProject');
      } catch (error) {
        console.error('Error during startup scan:', error);
      }
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('Error disposing resource:', error);
      }
    });
    
    this.serviceContainer.dispose();
  }
}