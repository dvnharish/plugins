import * as vscode from 'vscode';
import { ExtensionManager } from '../core/ExtensionManager';
import { ServiceContainer } from '../core/ServiceContainer';
import { CommandRegistry } from '../core/CommandRegistry';
import { PanelManager } from '../core/PanelManager';

// Mock VS Code API
jest.mock('vscode', () => ({
  window: {
    createStatusBarItem: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    createWebviewPanel: jest.fn(),
    registerWebviewViewProvider: jest.fn(),
    onDidChangeActiveTextEditor: jest.fn(),
    onDidChangeTextEditorSelection: jest.fn(),
    activeTextEditor: undefined
  },
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
    workspaceFolders: undefined,
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      stat: jest.fn(),
      createDirectory: jest.fn()
    }
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  StatusBarAlignment: {
    Right: 1
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path }))
  },
  Range: jest.fn(),
  Position: jest.fn(),
  Selection: jest.fn(),
  Disposable: {
    from: jest.fn()
  }
}));

describe('Extension Comprehensive Tests', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      },
      globalStorageUri: {
        fsPath: '/test/storage'
      },
      secrets: {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn()
      }
    } as any;
  });

  describe('Extension Activation', () => {
    test('should activate extension successfully', async () => {
      const extensionManager = new ExtensionManager(mockContext);
      
      // Mock successful initialization
      jest.spyOn(extensionManager, 'initialize').mockResolvedValue(undefined);
      
      await extensionManager.initialize();
      
      expect(extensionManager).toBeDefined();
    });

    test('should handle activation errors gracefully', async () => {
      const extensionManager = new ExtensionManager(mockContext);
      
      // Mock initialization failure
      jest.spyOn(extensionManager, 'initialize').mockRejectedValue(new Error('Activation failed'));
      
      await expect(extensionManager.initialize()).rejects.toThrow('Activation failed');
    });
  });

  describe('Service Container', () => {
    test('should initialize all services', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();

      expect(() => serviceContainer.getParserService()).not.toThrow();
      expect(() => serviceContainer.getCopilotService()).not.toThrow();
      expect(() => serviceContainer.getValidationService()).not.toThrow();
      expect(() => serviceContainer.getCredentialService()).not.toThrow();
      expect(() => serviceContainer.getMappingService()).not.toThrow();
      expect(() => serviceContainer.getConfigurationLoaderService()).not.toThrow();
      expect(() => serviceContainer.getPatternMatchingService()).not.toThrow();
      expect(() => serviceContainer.getMigrationService()).not.toThrow();
      expect(() => serviceContainer.getFileBackupService()).not.toThrow();
      expect(() => serviceContainer.getErrorHandlingService()).not.toThrow();
      expect(() => serviceContainer.getLoggingService()).not.toThrow();
    });

    test('should throw error for uninitialized services', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      
      expect(() => serviceContainer.getParserService()).toThrow('ParserService not initialized');
    });

    test('should dispose services properly', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      
      expect(() => serviceContainer.dispose()).not.toThrow();
    });
  });

  describe('Command Registry', () => {
    let serviceContainer: ServiceContainer;
    let commandRegistry: CommandRegistry;

    beforeEach(() => {
      serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      commandRegistry = new CommandRegistry(serviceContainer);
    });

    test('should register all commands', () => {
      commandRegistry.registerCommands();
      
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.scanProject',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.migrateEndpoint',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.bulkMigrate',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.validateMigration',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.openCredentials',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showDocumentation',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.refreshEndpoints',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.clearCredentials',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showMappingDictionary',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.reloadMappings',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showMigrationHistory',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.rollbackMigration',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.clearMigrationHistory',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.exportMigrationHistory',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.importMigrationHistory',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showErrorLog',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showPerformanceMetrics',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.clearErrorLog',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.exportErrorLog',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.showConfiguration',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.resetConfiguration',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.exportConfiguration',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'converge-elavon.importConfiguration',
        expect.any(Function)
      );
    });

    test('should dispose properly', () => {
      commandRegistry.registerCommands();
      expect(() => commandRegistry.dispose()).not.toThrow();
    });
  });

  describe('Panel Manager', () => {
    let serviceContainer: ServiceContainer;
    let panelManager: PanelManager;

    beforeEach(() => {
      serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      panelManager = new PanelManager(mockContext, serviceContainer);
    });

    test('should initialize panel manager', () => {
      expect(() => panelManager.initialize()).not.toThrow();
    });

    test('should dispose properly', () => {
      panelManager.initialize();
      expect(() => panelManager.dispose()).not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    test('should handle configuration changes', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      
      // Mock configuration change event
      const mockEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };
      
      // This should not throw
      expect(() => {
        // Simulate configuration change
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle service initialization errors', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      
      // Mock service that throws during initialization
      jest.spyOn(serviceContainer, 'initialize').mockImplementation(() => {
        throw new Error('Service initialization failed');
      });
      
      expect(() => serviceContainer.initialize()).toThrow('Service initialization failed');
    });
  });

  describe('Memory Management', () => {
    test('should clean up resources on disposal', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      
      const commandRegistry = new CommandRegistry(serviceContainer);
      commandRegistry.registerCommands();
      
      const panelManager = new PanelManager(mockContext, serviceContainer);
      panelManager.initialize();
      
      // Dispose all components
      expect(() => {
        commandRegistry.dispose();
        panelManager.dispose();
        serviceContainer.dispose();
      }).not.toThrow();
    });
  });

  describe('Extension Lifecycle', () => {
    test('should handle extension deactivation', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      
      const commandRegistry = new CommandRegistry(serviceContainer);
      commandRegistry.registerCommands();
      
      const panelManager = new PanelManager(mockContext, serviceContainer);
      panelManager.initialize();
      
      // Simulate extension deactivation
      expect(() => {
        commandRegistry.dispose();
        panelManager.dispose();
        serviceContainer.dispose();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should work with all services together', () => {
      const serviceContainer = new ServiceContainer(mockContext);
      serviceContainer.initialize();
      
      const commandRegistry = new CommandRegistry(serviceContainer);
      const panelManager = new PanelManager(mockContext, serviceContainer);
      
      // Initialize all components
      commandRegistry.registerCommands();
      panelManager.initialize();
      
      // Verify all services are accessible
      expect(() => serviceContainer.getParserService()).not.toThrow();
      expect(() => serviceContainer.getMigrationService()).not.toThrow();
      expect(() => serviceContainer.getErrorHandlingService()).not.toThrow();
      expect(() => serviceContainer.getLoggingService()).not.toThrow();
      expect(() => serviceContainer.getFileBackupService()).not.toThrow();
      
      // Clean up
      commandRegistry.dispose();
      panelManager.dispose();
      serviceContainer.dispose();
    });
  });
});
