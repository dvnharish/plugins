import * as vscode from 'vscode';
import { CommandRegistry } from '../../core/CommandRegistry';
import { ServiceContainer } from '../../core/ServiceContainer';

// Mock the ServiceContainer
jest.mock('../../core/ServiceContainer');

describe('CommandRegistry', () => {
  let commandRegistry: CommandRegistry;
  let mockServiceContainer: jest.Mocked<ServiceContainer>;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock context
    mockContext = {
      subscriptions: [],
      secrets: {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn()
      }
    } as any;

    // Create mock service container
    mockServiceContainer = {
      getParserService: jest.fn().mockReturnValue({
        scanWorkspace: jest.fn().mockResolvedValue([])
      }),
      getCredentialService: jest.fn().mockReturnValue({
        retrieve: jest.fn().mockResolvedValue(null),
        clear: jest.fn().mockResolvedValue(undefined)
      }),
      getValidationService: jest.fn().mockReturnValue({
        validateCredentials: jest.fn().mockResolvedValue(true)
      })
    } as any;
  });

  afterEach(() => {
    if (commandRegistry) {
      commandRegistry.dispose();
    }
  });

  it('should register all commands', () => {
    commandRegistry = new CommandRegistry(mockServiceContainer);
    commandRegistry.registerCommands();

    // Verify that registerCommand was called for each command
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
  });

  it('should create and show status bar item', () => {
    const mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      dispose: jest.fn()
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

    commandRegistry = new CommandRegistry(mockServiceContainer);
    commandRegistry.registerCommands();

    expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
      vscode.StatusBarAlignment.Right,
      100
    );
    expect(mockStatusBarItem.show).toHaveBeenCalled();
    expect(mockStatusBarItem.text).toBe("$(arrow-swap) Converge→Elavon");
    expect(mockStatusBarItem.command).toBe('converge-elavon.scanProject');
  });

  it('should dispose all resources', () => {
    const mockDisposable = { dispose: jest.fn() };
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);

    commandRegistry = new CommandRegistry(mockServiceContainer);
    commandRegistry.registerCommands();
    commandRegistry.dispose();

    expect(mockDisposable.dispose).toHaveBeenCalled();
  });
});