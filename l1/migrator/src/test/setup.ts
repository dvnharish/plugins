// Jest setup file for VS Code extension testing

// Mock VS Code API
const mockVscode = {
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showSaveDialog: jest.fn(),
    withProgress: jest.fn(),
    createStatusBarItem: jest.fn().mockReturnValue({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      dispose: jest.fn()
    }),
    activeTextEditor: null
  },
  commands: {
    registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    executeCommand: jest.fn()
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    workspaceFolders: [],
    onDidChangeConfiguration: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    fs: {
      writeFile: jest.fn()
    }
  },
  env: {
    openExternal: jest.fn(),
    clipboard: {
      writeText: jest.fn()
    }
  },
  Uri: {
    parse: jest.fn()
  },
  ExtensionContext: jest.fn(),
  Disposable: jest.fn(),
  ProgressLocation: {
    Notification: 15
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  }
};

// Mock the vscode module
jest.mock('vscode', () => mockVscode, { virtual: true });

// Global test utilities
(global as any).mockVscode = mockVscode;