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
      console.log('🔧 Initializing ElavonX extension services...');
      console.log('📁 Context extension path:', this.context.extensionPath);
      
      // Initialize services with error handling
      try {
        console.log('🔧 Initializing service container...');
        this.serviceContainer.initialize();
        console.log('✅ Service container initialized');
      } catch (error) {
        console.error('❌ Service container initialization failed:', error);
        console.error('📊 Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error; // Re-throw to see the full error
      }
      
      // Register commands
      try {
        this.commandRegistry.registerCommands();
        this.disposables.push(this.commandRegistry);
        console.log('Commands registered successfully');
      } catch (error) {
        console.warn('Command registration failed:', error);
      }
      
      // Initialize panels with error handling
      try {
        this.panelManager.initialize();
        this.disposables.push(this.panelManager);
        console.log('Panels initialized successfully');
      } catch (error) {
        console.warn('Panel initialization failed:', error);
      }
      
      // Connect command registry with panel manager
      try {
        this.commandRegistry.setPanelManager(this.panelManager);
        console.log('Command registry connected to panel manager');
      } catch (error) {
        console.warn('Failed to connect command registry to panel manager:', error);
      }
      
      // Register context for conditional UI elements
      try {
        this.setContext();
        console.log('Context variables set');
      } catch (error) {
        console.warn('Failed to set context variables:', error);
      }
      
      // Set up configuration change listener
      try {
        this.setupConfigurationListener();
        console.log('Configuration listener set up');
      } catch (error) {
        console.warn('Failed to set up configuration listener:', error);
      }
      
      // Perform startup scan if enabled (non-blocking)
      try {
        await this.performStartupScan();
        console.log('Startup scan completed');
      } catch (error) {
        console.warn('Startup scan failed:', error);
      }
      
      console.log('Converge-Elavon Migrator extension initialized successfully');
    } catch (error) {
      console.error('Critical error during extension initialization:', error);
      // Don't throw the error, just log it and continue with basic functionality
      console.log('Extension will continue with limited functionality');
    }
  }

  /**
   * Set VS Code context variables for conditional UI
   */
  private setContext(): void {
    // Set all context variables to show all panels by default
    vscode.commands.executeCommand('setContext', 'elavonx.hasEndpoints', true);
    vscode.commands.executeCommand('setContext', 'elavonx.hasCredentials', true);
    vscode.commands.executeCommand('setContext', 'elavonx.hasMigrations', true);
    vscode.commands.executeCommand('setContext', 'elavonx.hasReports', true);
    
    console.log('Context variables set - all panels should be visible');
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
        await vscode.commands.executeCommand('elavonx.scanProject');
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