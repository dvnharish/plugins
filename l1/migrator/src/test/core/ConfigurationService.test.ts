import * as vscode from 'vscode';
import { ConfigurationService } from '../../core/ConfigurationService';

describe('ConfigurationService', () => {
  let mockConfiguration: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfiguration = {
      get: jest.fn(),
      update: jest.fn()
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfiguration);
  });

  it('should get configuration', () => {
    ConfigurationService.getConfiguration();
    
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('converge-elavon');
  });

  it('should get scan on startup setting', () => {
    mockConfiguration.get.mockReturnValue(true);
    
    const result = ConfigurationService.getScanOnStartup();
    
    expect(mockConfiguration.get).toHaveBeenCalledWith('scanOnStartup', false);
    expect(result).toBe(true);
  });

  it('should get auto validate setting', () => {
    mockConfiguration.get.mockReturnValue(false);
    
    const result = ConfigurationService.getAutoValidate();
    
    expect(mockConfiguration.get).toHaveBeenCalledWith('autoValidate', true);
    expect(result).toBe(false);
  });

  it('should get copilot timeout setting', () => {
    mockConfiguration.get.mockReturnValue(45000);
    
    const result = ConfigurationService.getCopilotTimeout();
    
    expect(mockConfiguration.get).toHaveBeenCalledWith('copilotTimeout', 30000);
    expect(result).toBe(45000);
  });

  it('should get max retries setting', () => {
    mockConfiguration.get.mockReturnValue(5);
    
    const result = ConfigurationService.getMaxRetries();
    
    expect(mockConfiguration.get).toHaveBeenCalledWith('maxRetries', 3);
    expect(result).toBe(5);
  });

  it('should update configuration', async () => {
    await ConfigurationService.updateConfiguration('scanOnStartup', true);
    
    expect(mockConfiguration.update).toHaveBeenCalledWith('scanOnStartup', true, undefined);
  });

  it('should listen for configuration changes', () => {
    const mockCallback = jest.fn();
    const mockDisposable = { dispose: jest.fn() };
    
    (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue(mockDisposable);
    
    const disposable = ConfigurationService.onConfigurationChanged(mockCallback);
    
    expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    expect(disposable).toBe(mockDisposable);
  });
});