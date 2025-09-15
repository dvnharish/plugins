import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';

describe('Extension Test Suite', () => {
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should activate successfully', async () => {
    const mockContext = {
      subscriptions: [],
      secrets: {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn()
      },
      extensionPath: '/test/extension/path'
    } as any;

    // Should not throw an error
    await expect(activate(mockContext)).resolves.not.toThrow();
  });

  it('should deactivate successfully', () => {
    // Should not throw an error
    expect(() => deactivate()).not.toThrow();
  });

  it('should register commands on activation', async () => {
    const mockContext = {
      subscriptions: [],
      secrets: {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn()
      },
      extensionPath: '/test/extension/path'
    } as any;

    await activate(mockContext);

    // Verify that commands were registered
    expect(vscode.commands.registerCommand).toHaveBeenCalled();
  });
});