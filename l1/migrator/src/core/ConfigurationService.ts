import * as vscode from 'vscode';

/**
 * Service for managing extension configuration
 */
export class ConfigurationService {
  private static readonly EXTENSION_ID = 'converge-elavon';

  /**
   * Get extension configuration
   */
  public static getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.EXTENSION_ID);
  }

  /**
   * Get scan on startup setting
   */
  public static getScanOnStartup(): boolean {
    return this.getConfiguration().get('scanOnStartup', false);
  }

  /**
   * Get auto validate setting
   */
  public static getAutoValidate(): boolean {
    return this.getConfiguration().get('autoValidate', true);
  }

  /**
   * Get Copilot timeout setting
   */
  public static getCopilotTimeout(): number {
    return this.getConfiguration().get('copilotTimeout', 30000);
  }

  /**
   * Get max retries setting
   */
  public static getMaxRetries(): number {
    return this.getConfiguration().get('maxRetries', 3);
  }

  /**
   * Update configuration value
   */
  public static async updateConfiguration(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
    const config = this.getConfiguration();
    await config.update(key, value, target);
  }

  /**
   * Listen for configuration changes
   */
  public static onConfigurationChanged(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(this.EXTENSION_ID)) {
        callback(e);
      }
    });
  }

  /**
   * Get all configuration values
   */
  public static getAllConfiguration(): Record<string, any> {
    const config = this.getConfiguration();
    return {
      // Core settings
      scanOnStartup: config.get('scanOnStartup', false),
      autoValidate: config.get('autoValidate', true),
      copilotTimeout: config.get('copilotTimeout', 30000),
      maxRetries: config.get('maxRetries', 3),
      
      // Backup settings
      backupEnabled: config.get('backupEnabled', true),
      maxBackupsPerFile: config.get('maxBackupsPerFile', 5),
      
      // Logging settings
      logLevel: config.get('logLevel', 'info'),
      enablePerformanceMonitoring: config.get('enablePerformanceMonitoring', true),
      maxLogEntries: config.get('maxLogEntries', 5000),
      maxErrorEntries: config.get('maxErrorEntries', 1000),
      autoCleanupLogs: config.get('autoCleanupLogs', true),
      cleanupInterval: config.get('cleanupInterval', 24),
      
      // Migration settings
      showMigrationPreview: config.get('showMigrationPreview', true),
      confirmBulkMigration: config.get('confirmBulkMigration', true),
      stopOnError: config.get('stopOnError', false),
      includeComments: config.get('includeComments', true),
      preserveFormatting: config.get('preserveFormatting', true),
      
      // File handling settings
      customMappingFile: config.get('customMappingFile', ''),
      ignorePatterns: config.get('ignorePatterns', ['node_modules/**', '.git/**', 'dist/**', 'build/**']),
      scanFileTypes: config.get('scanFileTypes', ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'cs', 'rb', 'go', 'cpp', 'c']),
      maxFileSize: config.get('maxFileSize', 1048576),
      
      // Quality settings
      confidenceThreshold: config.get('confidenceThreshold', 0.7),
      
      // Telemetry settings
      enableTelemetry: config.get('enableTelemetry', false),
      telemetryEndpoint: config.get('telemetryEndpoint', 'https://api.converge-elavon-migrator.com/telemetry')
    };
  }

  /**
   * Get backup configuration
   */
  public static getBackupConfiguration(): {
    enabled: boolean;
    maxBackupsPerFile: number;
  } {
    const config = this.getConfiguration();
    return {
      enabled: config.get('backupEnabled', true),
      maxBackupsPerFile: config.get('maxBackupsPerFile', 5)
    };
  }

  /**
   * Get logging configuration
   */
  public static getLoggingConfiguration(): {
    logLevel: string;
    enablePerformanceMonitoring: boolean;
    maxLogEntries: number;
    maxErrorEntries: number;
    autoCleanupLogs: boolean;
    cleanupInterval: number;
  } {
    const config = this.getConfiguration();
    return {
      logLevel: config.get('logLevel', 'info'),
      enablePerformanceMonitoring: config.get('enablePerformanceMonitoring', true),
      maxLogEntries: config.get('maxLogEntries', 5000),
      maxErrorEntries: config.get('maxErrorEntries', 1000),
      autoCleanupLogs: config.get('autoCleanupLogs', true),
      cleanupInterval: config.get('cleanupInterval', 24)
    };
  }

  /**
   * Get migration configuration
   */
  public static getMigrationConfiguration(): {
    showPreview: boolean;
    confirmBulk: boolean;
    stopOnError: boolean;
    includeComments: boolean;
    preserveFormatting: boolean;
    confidenceThreshold: number;
  } {
    const config = this.getConfiguration();
    return {
      showPreview: config.get('showMigrationPreview', true),
      confirmBulk: config.get('confirmBulkMigration', true),
      stopOnError: config.get('stopOnError', false),
      includeComments: config.get('includeComments', true),
      preserveFormatting: config.get('preserveFormatting', true),
      confidenceThreshold: config.get('confidenceThreshold', 0.7)
    };
  }

  /**
   * Get file handling configuration
   */
  public static getFileHandlingConfiguration(): {
    customMappingFile: string;
    ignorePatterns: string[];
    scanFileTypes: string[];
    maxFileSize: number;
  } {
    const config = this.getConfiguration();
    return {
      customMappingFile: config.get('customMappingFile', ''),
      ignorePatterns: config.get('ignorePatterns', ['node_modules/**', '.git/**', 'dist/**', 'build/**']),
      scanFileTypes: config.get('scanFileTypes', ['js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'cs', 'rb', 'go', 'cpp', 'c']),
      maxFileSize: config.get('maxFileSize', 1048576)
    };
  }

  /**
   * Get telemetry configuration
   */
  public static getTelemetryConfiguration(): {
    enabled: boolean;
    endpoint: string;
  } {
    const config = this.getConfiguration();
    return {
      enabled: config.get('enableTelemetry', false),
      endpoint: config.get('telemetryEndpoint', 'https://api.converge-elavon-migrator.com/telemetry')
    };
  }

  /**
   * Reset configuration to defaults
   */
  public static async resetToDefaults(): Promise<void> {
    const config = this.getConfiguration();
    const defaultSettings = this.getAllConfiguration();
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  /**
   * Export current configuration
   */
  public static exportConfiguration(): string {
    const config = this.getAllConfiguration();
    return JSON.stringify({
      extensionId: this.EXTENSION_ID,
      exportDate: new Date().toISOString(),
      configuration: config
    }, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public static async importConfiguration(configJson: string): Promise<boolean> {
    try {
      const data = JSON.parse(configJson);
      
      if (data.configuration && typeof data.configuration === 'object') {
        const config = this.getConfiguration();
        
        for (const [key, value] of Object.entries(data.configuration)) {
          await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }
}