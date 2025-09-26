import * as vscode from 'vscode';
import * as path from 'path';
import { ServiceContainer } from './ServiceContainer';
// Removed unused import
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';
import { ScanResult } from '../services/WorkspaceScannerService';
import { SimpleScannerService } from '../services/SimpleScannerService';

/**
 * Manages registration and handling of VS Code commands
 */
export class CommandRegistry implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private panelManager?: any; // Will be set by ExtensionManager
  private isScanning = false; // Track scan state

  constructor(private readonly _serviceContainer: ServiceContainer) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    this.statusBarItem.text = "$(arrow-swap) Converge→Elavon";
    this.statusBarItem.tooltip = "Converge to Elavon Migrator";
    this.statusBarItem.command = 'elavonx.scanProject';
    this.disposables.push(this.statusBarItem);
  }

  /**
   * Set the panel manager reference
   */
  public setPanelManager(panelManager: any): void {
    this.panelManager = panelManager;
  }

  /**
   * Register all extension commands
   */
  public registerCommands(): void {
    // Show status bar item
    this.statusBarItem.show();
    
    // Register all commands
    // Scan project command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.scanProject', async () => {
        try {
          await this.handleScanProject();
        } catch (error) {
          console.error('Error scanning project:', error);
          vscode.window.showErrorMessage('Failed to scan project for Converge endpoints');
        }
      })
    );

    // Migrate endpoint command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.migrateEndpoint', async () => {
        try {
          await this.handleMigrateEndpoint();
        } catch (error) {
          console.error('Error migrating endpoint:', error);
          vscode.window.showErrorMessage('Failed to migrate endpoint');
        }
      })
    );

    // Bulk migrate command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.bulkMigrate', async () => {
        try {
          await this.handleBulkMigrate();
        } catch (error) {
          console.error('Error performing bulk migration:', error);
          vscode.window.showErrorMessage('Failed to perform bulk migration');
        }
      })
    );

    // Validate migration command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.validateMigration', async () => {
        try {
          await this.handleValidateMigration();
        } catch (error) {
          console.error('Error validating migration:', error);
          vscode.window.showErrorMessage('Failed to validate migration');
        }
      })
    );

    // Open credentials command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.openCredentials', async () => {
        try {
          await this.handleOpenCredentials();
        } catch (error) {
          console.error('Error opening credentials:', error);
          vscode.window.showErrorMessage('Failed to open credentials panel');
        }
      })
    );

    // Show documentation command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showDocumentation', async () => {
        try {
          await this.handleShowDocumentation();
        } catch (error) {
          console.error('Error showing documentation:', error);
          vscode.window.showErrorMessage('Failed to show documentation');
        }
      })
    );

    // Refresh endpoints command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.refreshEndpoints', async () => {
        try {
          await this.handleRefreshEndpoints();
        } catch (error) {
          console.error('Error refreshing endpoints:', error);
          vscode.window.showErrorMessage('Failed to refresh endpoints');
        }
      })
    );

    // Clear credentials command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.clearCredentials', async () => {
        try {
          await this.handleClearCredentials();
        } catch (error) {
          console.error('Error clearing credentials:', error);
          vscode.window.showErrorMessage('Failed to clear credentials');
        }
      })
    );

    // Show mapping dictionary command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showMappingDictionary', async () => {
        try {
          await this.handleShowMappingDictionary();
        } catch (error) {
          console.error('Error showing mapping dictionary:', error);
          vscode.window.showErrorMessage('Failed to show mapping dictionary');
        }
      })
    );

    // Reload mappings command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.reloadMappings', async () => {
        try {
          await this.handleReloadMappings();
        } catch (error) {
          console.error('Error reloading mappings:', error);
          vscode.window.showErrorMessage('Failed to reload mappings');
        }
      })
    );

    // Migration history commands
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showMigrationHistory', async () => {
        try {
          await this.handleShowMigrationHistory();
        } catch (error) {
          console.error('Error showing migration history:', error);
          vscode.window.showErrorMessage('Failed to show migration history');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.rollbackMigration', async () => {
        try {
          await this.handleRollbackMigration();
        } catch (error) {
          console.error('Error rolling back migration:', error);
          vscode.window.showErrorMessage('Failed to rollback migration');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.clearMigrationHistory', async () => {
        try {
          await this.handleClearMigrationHistory();
        } catch (error) {
          console.error('Error clearing migration history:', error);
          vscode.window.showErrorMessage('Failed to clear migration history');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.exportMigrationHistory', async () => {
        try {
          await this.handleExportMigrationHistory();
        } catch (error) {
          console.error('Error exporting migration history:', error);
          vscode.window.showErrorMessage('Failed to export migration history');
        }
      })
    );

    // Generate report command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.generateReport', async () => {
        try {
          await this.handleGenerateReport();
        } catch (error) {
          console.error('Error generating report:', error);
          vscode.window.showErrorMessage('Failed to generate migration report');
        }
      })
    );

    // Export report command
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.exportReport', async () => {
        try {
          await this.handleExportReport();
        } catch (error) {
          console.error('Error exporting report:', error);
          vscode.window.showErrorMessage('Failed to export report');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.importMigrationHistory', async () => {
        try {
          await this.handleImportMigrationHistory();
        } catch (error) {
          console.error('Error importing migration history:', error);
          vscode.window.showErrorMessage('Failed to import migration history');
        }
      })
    );

    // Error handling and logging commands
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showErrorLog', async () => {
        try {
          await this.handleShowErrorLog();
        } catch (error) {
          console.error('Error showing error log:', error);
          vscode.window.showErrorMessage('Failed to show error log');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showPerformanceMetrics', async () => {
        try {
          await this.handleShowPerformanceMetrics();
        } catch (error) {
          console.error('Error showing performance metrics:', error);
          vscode.window.showErrorMessage('Failed to show performance metrics');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.clearErrorLog', async () => {
        try {
          await this.handleClearErrorLog();
        } catch (error) {
          console.error('Error clearing error log:', error);
          vscode.window.showErrorMessage('Failed to clear error log');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.exportErrorLog', async () => {
        try {
          await this.handleExportErrorLog();
        } catch (error) {
          console.error('Error exporting error log:', error);
          vscode.window.showErrorMessage('Failed to export error log');
        }
      })
    );

    // Configuration management commands
    this.disposables.push(
      vscode.commands.registerCommand('elavonx.showConfiguration', async () => {
        try {
          await this.handleShowConfiguration();
        } catch (error) {
          console.error('Error showing configuration:', error);
          vscode.window.showErrorMessage('Failed to show configuration');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.resetConfiguration', async () => {
        try {
          await this.handleResetConfiguration();
        } catch (error) {
          console.error('Error resetting configuration:', error);
          vscode.window.showErrorMessage('Failed to reset configuration');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.exportConfiguration', async () => {
        try {
          await this.handleExportConfiguration();
        } catch (error) {
          console.error('Error exporting configuration:', error);
          vscode.window.showErrorMessage('Failed to export configuration');
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('elavonx.importConfiguration', async () => {
        try {
          await this.handleImportConfiguration();
        } catch (error) {
          console.error('Error importing configuration:', error);
          vscode.window.showErrorMessage('Failed to import configuration');
        }
      })
    );
  }

  private async handleScanProject(): Promise<void> {
    console.log('🔍 Scan project command triggered');
    
    // Check if already scanning
    if (this.isScanning) {
      console.log('⚠️ Scan already in progress, ignoring duplicate request');
      vscode.window.showWarningMessage('Scan is already in progress. Please wait for it to complete.');
      return;
    }
    
    // Check if workspace is open
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('Please open a workspace or folder to scan for Converge endpoints');
      return;
    }

    this.isScanning = true;
    const parserService = this._serviceContainer.getParserService();
    
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning project for Converge endpoints...',
      cancellable: true
    }, async (progress, token) => {
      try {
        console.log('🚀 Starting scan process...');
        
        // Skip recommendations for now to avoid getting stuck
        // const recommendations = await parserService.getScanRecommendations();
        
        // Clear any existing cache to ensure fresh scan
        parserService.clearScanCache();
        console.log('🧹 Cleared scan cache');

        // Try simple scanner first to avoid getting stuck
        console.log('📊 Starting simple workspace scan...');
        const simpleScanner = new SimpleScannerService();
        const result = await simpleScanner.scanWorkspace();
        
        console.log(`✅ Scan completed: ${result.endpoints.length} endpoints found`);
        
        if (token.isCancellationRequested) {
          console.log('❌ Scan cancelled by user');
          return;
        }

        // Update status bar with results
        if (result.endpoints.length > 0) {
          await vscode.commands.executeCommand('setContext', 'elavonx.hasEndpoints', true);
          this.statusBarItem.text = `$(arrow-swap) ${result.endpoints.length} Converge endpoints`;
          this.statusBarItem.tooltip = `Found ${result.endpoints.length} Converge endpoint(s) - Click to rescan`;
          
          // Update panel views
          if (this.panelManager) {
            this.panelManager.updateScanView(result.endpoints);
          }
          
          // Show detailed results with scan statistics
          const scanStats = `Scanned ${result.scannedFiles} files in ${Math.round(result.scanDuration / 1000)}s (${result.cacheHits} cache hits)`;
          const choice = await vscode.window.showInformationMessage(
            `Found ${result.endpoints.length} Converge endpoint(s). ${scanStats}`,
            'View Details',
            'Start Migration',
            'Show Errors'
          );

          if (choice === 'View Details') {
            await this.showScanResults(result);
          } else if (choice === 'Start Migration') {
            await this.handleBulkMigrate();
          } else if (choice === 'Show Errors' && result.errors.length > 0) {
            await this.showScanErrors(result.errors);
          }
        } else {
          await vscode.commands.executeCommand('setContext', 'elavonx.hasEndpoints', false);
          this.statusBarItem.text = "$(arrow-swap) No Converge endpoints";
          this.statusBarItem.tooltip = "No Converge endpoints found - Click to rescan";
          
          // Update panel views
          if (this.panelManager) {
            this.panelManager.clearScanView();
          }
          
          const scanStats = `Scanned ${result.scannedFiles} files in ${Math.round(result.scanDuration / 1000)}s`;
          if (result.errors.length > 0) {
            vscode.window.showWarningMessage(`No Converge endpoints found. ${scanStats} (${result.errors.length} errors)`);
          } else {
            vscode.window.showInformationMessage(`No Converge endpoints found. ${scanStats}`);
          }
        }

      } catch (error) {
        console.error('Error during project scan:', error);
        vscode.window.showErrorMessage(`Failed to scan project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        // Always reset scanning state
        this.isScanning = false;
        console.log('🏁 Scan process completed, state reset');
      }
    });
  }

  private async handleMigrateEndpoint(): Promise<void> {
    // Check if credentials are configured
    const credentialService = this._serviceContainer.getCredentialService();
    const credentials = await credentialService.retrieveCredentials();
    
    if (!credentials) {
      const choice = await vscode.window.showWarningMessage(
        'Elavon credentials not configured. Configure now?',
        'Configure Credentials',
        'Cancel'
      );
      
      if (choice === 'Configure Credentials') {
        await this.handleOpenCredentials();
        return;
      } else {
        return;
      }
    }

    // Get current selection or show endpoint picker
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Please open a file and select code to migrate');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showWarningMessage('Please select code containing a Converge endpoint to migrate');
      return;
    }

    // Get the selected code
    const selectedCode = editor.document.getText(selection);
    const filePath = editor.document.uri.fsPath;
    const lineNumber = selection.start.line + 1;

    // Parse the selected code to find Converge endpoints
    const parserService = this._serviceContainer.getParserService();
    const endpoints = await parserService.parseFile(filePath);
    
    // Find the endpoint that matches the selected code
    const matchingEndpoint = endpoints.find(endpoint => 
      endpoint.lineNumber === lineNumber && 
      selectedCode.includes(endpoint.code.substring(0, 50)) // Partial match
    );

    if (!matchingEndpoint) {
      vscode.window.showWarningMessage('No Converge endpoint found in the selected code');
      return;
    }

    // Confirm migration
    const confirmation = await vscode.window.showWarningMessage(
      `Migrate ${matchingEndpoint.endpointType} endpoint to Elavon?`,
      { modal: true },
      'Start Migration',
      'Preview Changes',
      'Cancel'
    );

    if (confirmation === 'Cancel') {
      return;
    }

    if (confirmation === 'Preview Changes') {
      await this.previewMigration(matchingEndpoint);
      return;
    }

    // Start migration
    await this.performMigration(matchingEndpoint);
  }

  /**
   * Preview migration changes before applying
   */
  private async previewMigration(endpoint: ConvergeEndpoint): Promise<void> {
    try {
      const migrationService = this._serviceContainer.getMigrationService();
      
      // Generate migrated code without applying
      const mapping = await this._serviceContainer.getMappingService().getMappingForEndpoint(endpoint.endpointType);
      if (!mapping) {
        vscode.window.showErrorMessage(`No mapping found for endpoint type: ${endpoint.endpointType}`);
        return;
      }

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating migration preview...',
        cancellable: false
      }, async () => {
        // Generate the migrated code
        const migratedCode = await this.generateMigratedCode(endpoint, mapping);
        
        // Show diff in a new document
        const diffContent = this.createDiffContent(endpoint.code, migratedCode);
        const doc = await vscode.workspace.openTextDocument({
          content: diffContent,
          language: 'diff'
        });
        
        await vscode.window.showTextDocument(doc);
        
        // Ask if user wants to apply
        const applyChoice = await vscode.window.showInformationMessage(
          'Review the changes above. Apply this migration?',
          'Apply Migration',
          'Cancel'
        );
        
        if (applyChoice === 'Apply Migration') {
          await this.performMigration(endpoint);
        }
      });

    } catch (error) {
      console.error('Preview migration failed:', error);
      vscode.window.showErrorMessage(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform the actual migration
   */
  private async performMigration(endpoint: ConvergeEndpoint): Promise<void> {
    try {
      const migrationService = this._serviceContainer.getMigrationService();
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Migrating Converge endpoint to Elavon...',
        cancellable: true
      }, async (progress, token) => {
        const result = await migrationService.migrateEndpoint(endpoint, {
          validateAfterMigration: true,
          createBackup: true,
          progressCallback: (migrationProgress) => {
            progress.report({
              increment: migrationProgress.progress,
              message: migrationProgress.message
            });
          }
        });

        if (token.isCancellationRequested) {
          return;
        }

        if (result.success) {
          vscode.window.showInformationMessage(
            `Migration completed successfully! Confidence: ${Math.round(result.metadata.confidence * 100)}%`
          );
        } else {
          vscode.window.showErrorMessage(`Migration failed: ${result.error}`);
        }
      });

    } catch (error) {
      console.error('Migration failed:', error);
      vscode.window.showErrorMessage(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate migrated code (helper method)
   */
  private async generateMigratedCode(endpoint: ConvergeEndpoint, mapping: any): Promise<string> {
    const copilotService = this._serviceContainer.getCopilotService();
    
    // Prepare mapping rules for Copilot
    const mappingRules = Object.entries(mapping.fieldMappings)
      .map(([converge, elavon]) => `${converge} → ${elavon}`)
      .join('\n');

    // Create Copilot request
    const request = {
      prompt: endpoint.code,
      language: this.getLanguageFromFilePath(endpoint.filePath),
      context: {
        filePath: endpoint.filePath,
        lineNumber: endpoint.lineNumber,
        endpointType: endpoint.endpointType,
        mappingRules: [mappingRules]
      }
    };

    const response = await copilotService.generateCode(request);
    
    if (!response.success || !response.code) {
      throw new Error(`Code generation failed: ${response.error || 'No code generated'}`);
    }

    return response.code;
  }

  /**
   * Create diff content for preview
   */
  private createDiffContent(originalCode: string, migratedCode: string): string {
    const originalLines = originalCode.split('\n');
    const migratedLines = migratedCode.split('\n');
    
    let diff = '--- Original Converge Code\n+++ Migrated Elavon Code\n\n';
    
    const maxLines = Math.max(originalLines.length, migratedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const migratedLine = migratedLines[i] || '';
      
      if (i >= originalLines.length) {
        diff += `+${migratedLine}\n`;
      } else if (i >= migratedLines.length) {
        diff += `-${originalLine}\n`;
      } else if (originalLine !== migratedLine) {
        diff += `-${originalLine}\n`;
        diff += `+${migratedLine}\n`;
      } else {
        diff += ` ${originalLine}\n`;
      }
    }
    
    return diff;
  }

  /**
   * Get language from file path
   */
  private getLanguageFromFilePath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'php': 'php',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'rb': 'ruby',
      'go': 'go',
      'cpp': 'cpp',
      'c': 'c'
    };
    return languageMap[extension] || 'javascript';
  }

  private async handleBulkMigrate(): Promise<void> {
    // Check if endpoints were found
    const hasEndpoints = vscode.workspace.getConfiguration().get('elavonx.hasEndpoints', false);
    if (!hasEndpoints) {
      const choice = await vscode.window.showWarningMessage(
        'No Converge endpoints found. Scan project first?',
        'Scan Project',
        'Cancel'
      );
      
      if (choice === 'Scan Project') {
        await this.handleScanProject();
        return;
      } else {
        return;
      }
    }

    // Check credentials
    const credentialService = this._serviceContainer.getCredentialService();
    const credentials = await credentialService.retrieveCredentials();
    
    if (!credentials) {
      const choice = await vscode.window.showWarningMessage(
        'Elavon credentials not configured. Configure now?',
        'Configure Credentials',
        'Cancel'
      );
      
      if (choice === 'Configure Credentials') {
        await this.handleOpenCredentials();
        return;
      } else {
        return;
      }
    }

    // Get all endpoints from the last scan
    const parserService = this._serviceContainer.getParserService();
    const scanResult = await parserService.scanWorkspace();
    
    if (scanResult.endpoints.length === 0) {
      vscode.window.showWarningMessage('No Converge endpoints found to migrate');
      return;
    }

    // Show endpoint selection dialog
    const selectedEndpoints = await this.showEndpointSelectionDialog(scanResult.endpoints);
    if (selectedEndpoints.length === 0) {
      return;
    }

    // Show migration options
    const migrationOptions = await this.showMigrationOptionsDialog();
    if (!migrationOptions) {
      return;
    }

    // Confirm bulk migration
    const confirmation = await vscode.window.showWarningMessage(
      `This will migrate ${selectedEndpoints.length} Converge endpoints to Elavon. Continue?`,
      { modal: true },
      'Start Migration',
      'Preview Changes',
      'Cancel'
    );

    if (confirmation === 'Cancel') {
      return;
    }

    if (confirmation === 'Preview Changes') {
      await this.previewBulkMigration(selectedEndpoints);
      return;
    }

    // Start bulk migration
    await this.performBulkMigration(selectedEndpoints, migrationOptions);
  }

  /**
   * Show endpoint selection dialog
   */
  private async showEndpointSelectionDialog(endpoints: any[]): Promise<any[]> {
    const items = endpoints.map(endpoint => ({
      label: `${endpoint.endpointType} (Line ${endpoint.lineNumber})`,
      description: endpoint.filePath.split('/').pop(),
      detail: `${endpoint.sslFields.length} SSL fields`,
      endpoint,
      picked: true // All selected by default
    }));

    const selectedItems = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: 'Select endpoints to migrate (all selected by default)',
      ignoreFocusOut: true
    });

    return selectedItems ? selectedItems.map(item => item.endpoint) : [];
  }

  /**
   * Show migration options dialog
   */
  private async showMigrationOptionsDialog(): Promise<{
    validateAfterMigration: boolean;
    createBackup: boolean;
    stopOnError: boolean;
  } | null> {
    const validateOption = await vscode.window.showQuickPick([
      { label: 'Yes', description: 'Validate migrated code against Elavon sandbox', picked: true },
      { label: 'No', description: 'Skip validation (faster but less reliable)' }
    ], {
      placeHolder: 'Validate migrations after completion?'
    });

    if (!validateOption) return null;

    const backupOption = await vscode.window.showQuickPick([
      { label: 'Yes', description: 'Create backup files before migration', picked: true },
      { label: 'No', description: 'Skip backup (not recommended)' }
    ], {
      placeHolder: 'Create backup files?'
    });

    if (!backupOption) return null;

    const errorOption = await vscode.window.showQuickPick([
      { label: 'Continue', description: 'Continue migration even if some endpoints fail', picked: true },
      { label: 'Stop', description: 'Stop migration if any endpoint fails' }
    ], {
      placeHolder: 'What to do if migration fails?'
    });

    if (!errorOption) return null;

    return {
      validateAfterMigration: validateOption.label === 'Yes',
      createBackup: backupOption.label === 'Yes',
      stopOnError: errorOption.label === 'Stop'
    };
  }

  /**
   * Preview bulk migration changes
   */
  private async previewBulkMigration(endpoints: any[]): Promise<void> {
    try {
      const migrationService = this._serviceContainer.getMigrationService();
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating bulk migration preview...',
        cancellable: false
      }, async () => {
        // Generate preview for first few endpoints
        const previewCount = Math.min(3, endpoints.length);
        const previewEndpoints = endpoints.slice(0, previewCount);
        
        const previewResults = [];
        
        for (const endpoint of previewEndpoints) {
          const mapping = await this._serviceContainer.getMappingService().getMappingForEndpoint(endpoint.endpointType);
          if (mapping) {
            const migratedCode = await this.generateMigratedCode(endpoint, mapping);
            previewResults.push({
              endpoint,
              migratedCode,
              diff: this.createDiffContent(endpoint.code, migratedCode)
            });
          }
        }

        // Show preview in a new document
        const previewContent = previewResults.map((result, index) => 
          `=== Endpoint ${index + 1}: ${result.endpoint.endpointType} ===\n` +
          `File: ${result.endpoint.filePath}:${result.endpoint.lineNumber}\n\n` +
          result.diff + '\n\n'
        ).join('');

        const doc = await vscode.workspace.openTextDocument({
          content: `Bulk Migration Preview\n\n${previewContent}`,
          language: 'diff'
        });
        
        await vscode.window.showTextDocument(doc);
        
        // Ask if user wants to proceed
        const proceedChoice = await vscode.window.showInformationMessage(
          `Preview shows changes for ${previewCount} of ${endpoints.length} endpoints. Proceed with full migration?`,
          'Proceed with Migration',
          'Cancel'
        );
        
        if (proceedChoice === 'Proceed with Migration') {
          const migrationOptions = await this.showMigrationOptionsDialog();
          if (migrationOptions) {
            await this.performBulkMigration(endpoints, migrationOptions);
          }
        }
      });

    } catch (error) {
      console.error('Preview bulk migration failed:', error);
      vscode.window.showErrorMessage(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform bulk migration
   */
  private async performBulkMigration(
    endpoints: any[],
    options: {
      validateAfterMigration: boolean;
      createBackup: boolean;
      stopOnError: boolean;
    }
  ): Promise<void> {
    try {
      const migrationService = this._serviceContainer.getMigrationService();
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Migrating Converge endpoints to Elavon...',
        cancellable: true
      }, async (progress, token) => {
        const result = await migrationService.migrateEndpointsBulk(endpoints, {
          ...options,
          progressCallback: (bulkProgress: import('../services/MigrationService').BulkMigrationProgress) => {
            progress.report({
              increment: bulkProgress.progress,
              message: `${bulkProgress.message} (${bulkProgress.currentEndpoint}/${bulkProgress.totalEndpoints})`
            });
          },
          cancellationToken: token
        });

        if (token.isCancellationRequested) {
          return;
        }

        // Show results
        const successRate = Math.round((result.successfulMigrations / result.totalEndpoints) * 100);
        const avgConfidence = Math.round(result.summary.averageConfidence * 100);
        
        const resultMessage = `Bulk migration completed!\n` +
          `✅ Successful: ${result.successfulMigrations}/${result.totalEndpoints} (${successRate}%)\n` +
          `❌ Failed: ${result.failedMigrations}\n` +
          `⏱️ Time: ${Math.round(result.summary.totalTime / 1000)}s\n` +
          `🎯 Avg Confidence: ${avgConfidence}%\n` +
          `📁 Files Modified: ${result.summary.filesModified.length}`;

        if (result.failedMigrations > 0) {
          const showDetails = await vscode.window.showWarningMessage(
            resultMessage,
            'Show Failed Migrations',
            'Export Results',
            'Close'
          );

          if (showDetails === 'Show Failed Migrations') {
            await this.showFailedMigrations(result.errors);
          } else if (showDetails === 'Export Results') {
            await this.exportMigrationResults(result);
          }
        } else {
          const showDetails = await vscode.window.showInformationMessage(
            resultMessage,
            'Export Results',
            'View Statistics',
            'Close'
          );

          if (showDetails === 'Export Results') {
            await this.exportMigrationResults(result);
          } else if (showDetails === 'View Statistics') {
            await this.showMigrationStatistics();
          }
        }
      });

    } catch (error) {
      console.error('Bulk migration failed:', error);
      vscode.window.showErrorMessage(`Bulk migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show failed migrations details
   */
  private async showFailedMigrations(errors: Array<{ endpoint: any; error: string }>): Promise<void> {
    const errorItems = errors.map((error, index) => ({
      label: `${error.endpoint.endpointType} (Line ${error.endpoint.lineNumber})`,
      description: error.endpoint.filePath.split('/').pop(),
      detail: error.error,
      error
    }));

    const selectedError = await vscode.window.showQuickPick(errorItems, {
      placeHolder: 'Select a failed migration to view details'
    });

    if (selectedError) {
      vscode.window.showErrorMessage(
        `Migration failed for ${selectedError.error.endpoint.endpointType}:\n${selectedError.error.error}`
      );
    }
  }

  /**
   * Export migration results
   */
  private async exportMigrationResults(result: any): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    const exportData = migrationService.exportMigrationHistory();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('migration-results.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
      vscode.window.showInformationMessage(`Migration results exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Show migration statistics
   */
  private async showMigrationStatistics(): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    const stats = migrationService.getMigrationStatistics();

    const statsText = `
Migration Statistics

Total Migrations: ${stats.totalMigrations}
Successful: ${stats.successfulMigrations}
Failed: ${stats.failedMigrations}
Average Confidence: ${Math.round(stats.averageConfidence * 100)}%

Most Migrated Endpoints:
${stats.mostMigratedEndpoints.map((ep: any) => `  • ${ep.endpointType}: ${ep.count}`).join('\n')}

Recent Migrations:
${stats.recentMigrations.slice(0, 5).map((m: any) => 
  `  • ${m.endpointType} - ${m.success ? '✅' : '❌'} (${m.timestamp.toLocaleDateString()})`
).join('\n')}
    `.trim();

    vscode.window.showInformationMessage(statsText, { modal: true });
  }

  /**
   * Show migration history
   */
  private async handleShowMigrationHistory(): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    const history = migrationService.getMigrationHistory();

    if (history.length === 0) {
      vscode.window.showInformationMessage('No migration history found');
      return;
    }

    // Show history in a quick pick
    const historyItems = history.map((entry, index) => ({
      label: `${entry.success ? '✅' : '❌'} ${entry.endpointType}`,
      description: `${entry.filePath.split('/').pop()}:${entry.lineNumber}`,
      detail: `${entry.timestamp.toLocaleString()} - ${entry.success ? 'Success' : `Failed: ${entry.error}`}`,
      entry,
      picked: false
    }));

    const selectedItem = await vscode.window.showQuickPick(historyItems, {
      placeHolder: 'Select a migration to view details or rollback',
      canPickMany: false
    });

    if (selectedItem) {
      await this.showMigrationDetails(selectedItem.entry);
    }
  }

  /**
   * Show migration details
   */
  private async showMigrationDetails(entry: any): Promise<void> {
    const details = `
Migration Details

Endpoint: ${entry.endpointType}
File: ${entry.filePath}
Line: ${entry.lineNumber}
Timestamp: ${entry.timestamp.toLocaleString()}
Status: ${entry.success ? '✅ Success' : '❌ Failed'}
${entry.error ? `Error: ${entry.error}` : ''}

Original Code:
${entry.originalCode}

${entry.success ? `Migrated Code:
${entry.migratedCode}` : ''}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      details,
      { modal: true },
      'Rollback',
      'View File',
      'Close'
    );

    if (action === 'Rollback' && entry.success) {
      await this.rollbackSpecificMigration(entry);
    } else if (action === 'View File') {
      const document = await vscode.workspace.openTextDocument(entry.filePath);
      const editor = await vscode.window.showTextDocument(document);
      const position = new vscode.Position(entry.lineNumber - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
  }

  /**
   * Rollback a specific migration
   */
  private async rollbackSpecificMigration(entry: any): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    
    const confirmed = await vscode.window.showWarningMessage(
      `Rollback migration of ${entry.endpointType}?`,
      { modal: true },
      'Yes, Rollback',
      'Cancel'
    );

    if (confirmed === 'Yes, Rollback') {
      const success = await migrationService.rollbackMigration(entry);
      
      if (success) {
        vscode.window.showInformationMessage('Migration rolled back successfully');
      } else {
        vscode.window.showErrorMessage('Failed to rollback migration');
      }
    }
  }

  /**
   * Rollback migration (general)
   */
  private async handleRollbackMigration(): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    const history = migrationService.getMigrationHistory();

    if (history.length === 0) {
      vscode.window.showInformationMessage('No migration history found');
      return;
    }

    // Show only successful migrations for rollback
    const rollbackableMigrations = history.filter(entry => entry.success);
    
    if (rollbackableMigrations.length === 0) {
      vscode.window.showInformationMessage('No successful migrations found to rollback');
      return;
    }

    const rollbackItems = rollbackableMigrations.map(entry => ({
      label: `🔄 ${entry.endpointType}`,
      description: `${entry.filePath.split('/').pop()}:${entry.lineNumber}`,
      detail: `${entry.timestamp.toLocaleString()}`,
      entry
    }));

    const selectedItem = await vscode.window.showQuickPick(rollbackItems, {
      placeHolder: 'Select a migration to rollback',
      canPickMany: false
    });

    if (selectedItem) {
      await this.rollbackSpecificMigration(selectedItem.entry);
    }
  }

  /**
   * Clear migration history
   */
  private async handleClearMigrationHistory(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'Clear all migration history? This action cannot be undone.',
      { modal: true },
      'Yes, Clear All',
      'Cancel'
    );

    if (confirmed === 'Yes, Clear All') {
      const migrationService = this._serviceContainer.getMigrationService();
      migrationService.clearMigrationHistory();
      vscode.window.showInformationMessage('Migration history cleared');
    }
  }

  /**
   * Export migration history
   */
  private async handleExportMigrationHistory(): Promise<void> {
    const migrationService = this._serviceContainer.getMigrationService();
    const exportData = migrationService.exportMigrationHistory();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('migration-history.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
      vscode.window.showInformationMessage(`Migration history exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Import migration history
   */
  private async handleImportMigrationHistory(): Promise<void> {
    const openUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (openUri && openUri.length > 0) {
      try {
        const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
        const importData = Buffer.from(fileContent).toString('utf8');
        
        const migrationService = this._serviceContainer.getMigrationService();
        const success = migrationService.importMigrationHistory(importData);
        
        if (success) {
          vscode.window.showInformationMessage('Migration history imported successfully');
        } else {
          vscode.window.showErrorMessage('Failed to import migration history - invalid format');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import migration history: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Show error log
   */
  private async handleShowErrorLog(): Promise<void> {
    const errorHandlingService = this._serviceContainer.getErrorHandlingService();
    const errors = errorHandlingService.getAllErrors();

    if (errors.length === 0) {
      vscode.window.showInformationMessage('No errors found in the log');
      return;
    }

    // Show errors in a quick pick
    const errorItems = errors.map(error => ({
      label: `${error.severity.toUpperCase()} - ${error.category}`,
      description: error.message,
      detail: `${error.context.timestamp.toLocaleString()} - ${error.resolved ? 'Resolved' : 'Unresolved'}`,
      error,
      picked: false
    }));

    const selectedItem = await vscode.window.showQuickPick(errorItems, {
      placeHolder: 'Select an error to view details',
      canPickMany: false
    });

    if (selectedItem) {
      await this.showErrorDetails(selectedItem.error);
    }
  }

  /**
   * Show error details
   */
  private async showErrorDetails(error: any): Promise<void> {
    const details = `
Error Details

ID: ${error.id}
Severity: ${error.severity}
Category: ${error.category}
Message: ${error.message}
${error.details ? `Details: ${error.details}` : ''}
${error.context.filePath ? `File: ${error.context.filePath}` : ''}
${error.context.lineNumber ? `Line: ${error.context.lineNumber}` : ''}
${error.context.endpointType ? `Endpoint: ${error.context.endpointType}` : ''}
Timestamp: ${error.context.timestamp.toLocaleString()}
Session: ${error.context.sessionId}
Status: ${error.resolved ? 'Resolved' : 'Unresolved'}
${error.resolution ? `Resolution: ${error.resolution}` : ''}
${error.stackTrace ? `\nStack Trace:\n${error.stackTrace}` : ''}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      details,
      { modal: true },
      'Mark as Resolved',
      'View in File',
      'Close'
    );

    if (action === 'Mark as Resolved') {
      const resolution = await vscode.window.showInputBox({
        prompt: 'Enter resolution details',
        placeHolder: 'How was this error resolved?'
      });

      if (resolution) {
        const errorHandlingService = this._serviceContainer.getErrorHandlingService();
        const success = errorHandlingService.resolveError(error.id, resolution);
        
        if (success) {
          vscode.window.showInformationMessage('Error marked as resolved');
        } else {
          vscode.window.showErrorMessage('Failed to mark error as resolved');
        }
      }
    } else if (action === 'View in File' && error.context.filePath) {
      const document = await vscode.workspace.openTextDocument(error.context.filePath);
      const editor = await vscode.window.showTextDocument(document);
      if (error.context.lineNumber) {
        const position = new vscode.Position(error.context.lineNumber - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      }
    }
  }

  /**
   * Show performance metrics
   */
  private async handleShowPerformanceMetrics(): Promise<void> {
    const loggingService = this._serviceContainer.getLoggingService();
    const stats = loggingService.getPerformanceStatistics();

    const metricsText = `
Performance Metrics

Total Operations: ${stats.totalOperations}
Average Duration: ${Math.round(stats.averageDuration)}ms
Success Rate: ${Math.round(stats.successRate * 100)}%

Slowest Operations:
${stats.slowestOperations.map(op => 
  `  • ${op.operation}: ${Math.round(op.duration || 0)}ms (${op.success ? 'Success' : 'Failed'})`
).join('\n')}

Fastest Operations:
${stats.fastestOperations.map(op => 
  `  • ${op.operation}: ${Math.round(op.duration || 0)}ms (${op.success ? 'Success' : 'Failed'})`
).join('\n')}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      metricsText,
      { modal: true },
      'Export Metrics',
      'View Detailed Logs',
      'Close'
    );

    if (action === 'Export Metrics') {
      await this.exportPerformanceMetrics();
    } else if (action === 'View Detailed Logs') {
      await this.showDetailedLogs();
    }
  }

  /**
   * Export performance metrics
   */
  private async exportPerformanceMetrics(): Promise<void> {
    const loggingService = this._serviceContainer.getLoggingService();
    const exportData = loggingService.exportLogs();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('performance-metrics.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
      vscode.window.showInformationMessage(`Performance metrics exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Show detailed logs
   */
  private async showDetailedLogs(): Promise<void> {
    const loggingService = this._serviceContainer.getLoggingService();
    const logs = loggingService.getRecentLogs(50);

    const logContent = logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toString().toUpperCase()}: ${log.message}${log.context.filePath ? ` (${log.context.filePath})` : ''}`
    ).join('\n');

    const doc = await vscode.workspace.openTextDocument({
      content: `Detailed Logs\n\n${logContent}`,
      language: 'plaintext'
    });
    
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Clear error log
   */
  private async handleClearErrorLog(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'Clear all error logs? This action cannot be undone.',
      { modal: true },
      'Yes, Clear All',
      'Clear Resolved Only',
      'Cancel'
    );

    if (confirmed === 'Yes, Clear All') {
      const errorHandlingService = this._serviceContainer.getErrorHandlingService();
      errorHandlingService.clearAllErrors();
      vscode.window.showInformationMessage('All error logs cleared');
    } else if (confirmed === 'Clear Resolved Only') {
      const errorHandlingService = this._serviceContainer.getErrorHandlingService();
      errorHandlingService.clearResolvedErrors();
      vscode.window.showInformationMessage('Resolved error logs cleared');
    }
  }

  /**
   * Export error log
   */
  private async handleExportErrorLog(): Promise<void> {
    const errorHandlingService = this._serviceContainer.getErrorHandlingService();
    const exportData = errorHandlingService.exportErrors();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('error-log.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
      vscode.window.showInformationMessage(`Error log exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Show current configuration
   */
  private async handleShowConfiguration(): Promise<void> {
    const { ConfigurationService } = await import('./ConfigurationService');
    const config = ConfigurationService.getAllConfiguration();

    const configText = `
Current Configuration

Core Settings:
  • Scan on Startup: ${config.scanOnStartup}
  • Auto Validate: ${config.autoValidate}
  • Copilot Timeout: ${config.copilotTimeout}ms
  • Max Retries: ${config.maxRetries}

Backup Settings:
  • Backup Enabled: ${config.backupEnabled}
  • Max Backups per File: ${config.maxBackupsPerFile}

Logging Settings:
  • Log Level: ${config.logLevel}
  • Performance Monitoring: ${config.enablePerformanceMonitoring}
  • Max Log Entries: ${config.maxLogEntries}
  • Max Error Entries: ${config.maxErrorEntries}
  • Auto Cleanup: ${config.autoCleanupLogs}
  • Cleanup Interval: ${config.cleanupInterval}h

Migration Settings:
  • Show Preview: ${config.showMigrationPreview}
  • Confirm Bulk Migration: ${config.confirmBulkMigration}
  • Stop on Error: ${config.stopOnError}
  • Include Comments: ${config.includeComments}
  • Preserve Formatting: ${config.preserveFormatting}
  • Confidence Threshold: ${config.confidenceThreshold}

File Handling:
  • Custom Mapping File: ${config.customMappingFile || 'None'}
  • Ignore Patterns: ${config.ignorePatterns.join(', ')}
  • Scan File Types: ${config.scanFileTypes.join(', ')}
  • Max File Size: ${Math.round(config.maxFileSize / 1024)}KB

Telemetry:
  • Enabled: ${config.enableTelemetry}
  • Endpoint: ${config.telemetryEndpoint}
    `.trim();

    const action = await vscode.window.showInformationMessage(
      configText,
      { modal: true },
      'Export Configuration',
      'Reset to Defaults',
      'Open Settings',
      'Close'
    );

    if (action === 'Export Configuration') {
      await this.handleExportConfiguration();
    } else if (action === 'Reset to Defaults') {
      await this.handleResetConfiguration();
    } else if (action === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'converge-elavon');
    }
  }

  /**
   * Reset configuration to defaults
   */
  private async handleResetConfiguration(): Promise<void> {
    const confirmed = await vscode.window.showWarningMessage(
      'Reset all configuration to defaults? This action cannot be undone.',
      { modal: true },
      'Yes, Reset All',
      'Cancel'
    );

    if (confirmed === 'Yes, Reset All') {
      const { ConfigurationService } = await import('./ConfigurationService');
      await ConfigurationService.resetToDefaults();
      vscode.window.showInformationMessage('Configuration reset to defaults');
    }
  }

  /**
   * Export configuration
   */
  private async handleExportConfiguration(): Promise<void> {
    const { ConfigurationService } = await import('./ConfigurationService');
    const exportData = ConfigurationService.exportConfiguration();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('converge-elavon-config.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportData, 'utf8'));
      vscode.window.showInformationMessage(`Configuration exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Import configuration
   */
  private async handleImportConfiguration(): Promise<void> {
    const openUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (openUri && openUri.length > 0) {
      try {
        const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
        const importData = Buffer.from(fileContent).toString('utf8');
        
        const { ConfigurationService } = await import('./ConfigurationService');
        const success = await ConfigurationService.importConfiguration(importData);
        
        if (success) {
          vscode.window.showInformationMessage('Configuration imported successfully');
        } else {
          vscode.window.showErrorMessage('Failed to import configuration - invalid format');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async handleValidateMigration(): Promise<void> {
    // Check credentials first
    const credentialService = this._serviceContainer.getCredentialService();
    const credentials = await credentialService.retrieveCredentials();
    
    if (!credentials) {
      vscode.window.showWarningMessage('Please configure Elavon credentials before validation');
      return;
    }

    // Validate credentials
    const validationService = this._serviceContainer.getValidationService();
    const isValid = await validationService.validateCredentials(credentials);
    
    if (!isValid) {
      vscode.window.showErrorMessage('Invalid Elavon credentials. Please check your configuration.');
      return;
    }

    // Implement migration validation logic
    try {
      const migrationService = this._serviceContainer.getMigrationService();
      const migrationHistory = migrationService.getMigrationHistory();
      
      if (migrationHistory.entries.length === 0) {
        vscode.window.showInformationMessage('No migrations found to validate. Run a migration first.');
        return;
      }

      // Validate each migration entry
      const validationResults = [];
      let validCount = 0;
      let invalidCount = 0;

      for (const entry of migrationHistory.entries) {
        try {
          // Basic validation checks
          const isValid = this.validateMigrationEntry(entry);
          validationResults.push({
            id: entry.id,
            filePath: entry.filePath,
            status: entry.status,
            isValid,
            issues: isValid ? [] : this.getValidationIssues(entry)
          });

          if (isValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        } catch (error) {
          validationResults.push({
            id: entry.id,
            filePath: entry.filePath,
            status: entry.status,
            isValid: false,
            issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
          invalidCount++;
        }
      }

      // Show validation results
      const message = `Migration Validation Complete:\n✅ Valid: ${validCount}\n❌ Invalid: ${invalidCount}\n📊 Total: ${validationResults.length}`;
      
      if (invalidCount > 0) {
        const action = await vscode.window.showWarningMessage(
          message,
          'View Details',
          'Export Report'
        );
        
        if (action === 'View Details') {
          await this.showValidationDetails(validationResults);
        } else if (action === 'Export Report') {
          await this.exportValidationReport(validationResults);
        }
      } else {
        vscode.window.showInformationMessage(message);
      }

    } catch (error) {
      console.error('Migration validation failed:', error);
      vscode.window.showErrorMessage(`Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleOpenCredentials(): Promise<void> {
    try {
      // Open the credentials panel
      if (this.panelManager) {
        await this.panelManager.openCredentialsPanel();
        vscode.window.showInformationMessage('Credentials panel opened');
      } else {
        vscode.window.showErrorMessage('Panel manager not available');
      }
    } catch (error) {
      console.error('Failed to open credentials panel:', error);
      vscode.window.showErrorMessage(`Failed to open credentials panel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleShowDocumentation(): Promise<void> {
    // Open documentation in external browser or webview
    const choice = await vscode.window.showQuickPick([
      { label: 'Open Converge Documentation', description: 'View Converge API documentation' },
      { label: 'Open Elavon Documentation', description: 'View Elavon API documentation' },
      { label: 'View Field Mappings', description: 'Show field mapping dictionary' }
    ], {
      placeHolder: 'Select documentation to view'
    });

    if (choice) {
      switch (choice.label) {
        case 'Open Converge Documentation':
          vscode.env.openExternal(vscode.Uri.parse('https://developer.converge.com/'));
          break;
        case 'Open Elavon Documentation':
          vscode.env.openExternal(vscode.Uri.parse('https://developer.elavon.com/'));
          break;
        case 'View Field Mappings':
          await this.handleShowMappingDictionary();
          break;
      }
    }
  }

  private async handleRefreshEndpoints(): Promise<void> {
    // Clear scan cache and rescan
    const parserService = this._serviceContainer.getParserService();
    parserService.clearScanCache();
    
    await vscode.commands.executeCommand('setContext', 'elavonx.hasEndpoints', false);
    await this.handleScanProject();
  }

  private async handleClearCredentials(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      'Are you sure you want to clear stored Elavon credentials?',
      { modal: true },
      'Yes, Clear Credentials'
    );

    if (confirmation) {
      try {
        const credentialService = this._serviceContainer.getCredentialService();
        await credentialService.clearCredentials();
        vscode.window.showInformationMessage('Elavon credentials cleared successfully');
      } catch (error) {
        console.error('Error clearing credentials:', error);
        vscode.window.showErrorMessage('Failed to clear credentials');
      }
    }
  }

  private async handleShowMappingDictionary(): Promise<void> {
    try {
      const mappingService = this._serviceContainer.getMappingService();
      const stats = await mappingService.getMappingStatistics();
      
      const choice = await vscode.window.showQuickPick([
        { 
          label: 'View All Mappings', 
          description: `${stats.totalMappings} endpoint mappings available`,
          detail: `Version ${stats.version} - ${stats.totalFields} total fields`
        },
        { 
          label: 'Search by Field', 
          description: 'Find mappings containing a specific field name'
        },
        { 
          label: 'Export Mappings', 
          description: 'Export mapping dictionary to JSON file'
        },
        { 
          label: 'Mapping Statistics', 
          description: 'View detailed mapping statistics'
        }
      ], {
        placeHolder: 'Select mapping dictionary action'
      });

      if (!choice) return;

      switch (choice.label) {
        case 'View All Mappings':
          await this.showAllMappings();
          break;
        case 'Search by Field':
          await this.searchMappingsByField();
          break;
        case 'Export Mappings':
          await this.exportMappings();
          break;
        case 'Mapping Statistics':
          await this.showMappingStatistics();
          break;
      }
    } catch (error) {
      console.error('Error in mapping dictionary handler:', error);
      vscode.window.showErrorMessage(`Failed to access mapping dictionary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async showAllMappings(): Promise<void> {
    const mappingService = this._serviceContainer.getMappingService();
    const mappings = await mappingService.getAllMappings();
    
    const items = mappings.map(mapping => ({
      label: mapping.convergeEndpoint,
      description: `→ ${mapping.elavonEndpoint}`,
      detail: `${mapping.method} - ${Object.keys(mapping.fieldMappings).length} fields`,
      mapping: mapping
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an endpoint mapping to view details'
    });

    if (selected) {
      await this.showMappingDetails(selected.mapping);
    }
  }

  private async showMappingDetails(mapping: any): Promise<void> {
    const fieldMappings = Object.entries(mapping.fieldMappings)
      .map(([converge, elavon]) => `  ${converge} → ${elavon}`)
      .join('\n');

    const details = `
Endpoint Mapping Details

Converge Endpoint: ${mapping.convergeEndpoint}
Elavon Endpoint: ${mapping.elavonEndpoint}
HTTP Method: ${mapping.method}

Field Mappings:
${fieldMappings}

${mapping.description ? `Description: ${mapping.description}` : ''}
    `.trim();

    const choice = await vscode.window.showInformationMessage(
      details,
      { modal: true },
      'Copy to Clipboard',
      'Close'
    );

    if (choice === 'Copy to Clipboard') {
      await vscode.env.clipboard.writeText(details);
      vscode.window.showInformationMessage('Mapping details copied to clipboard');
    }
  }

  private async searchMappingsByField(): Promise<void> {
    const fieldName = await vscode.window.showInputBox({
      prompt: 'Enter field name to search for (Converge or Elavon)',
      placeHolder: 'e.g., ssl_amount, amount.total'
    });

    if (!fieldName) return;

    const mappingService = this._serviceContainer.getMappingService();
    const matchingMappings = await mappingService.searchMappingsByField(fieldName);

    if (matchingMappings.length === 0) {
      vscode.window.showInformationMessage(`No mappings found containing field: ${fieldName}`);
      return;
    }

    const items = matchingMappings.map(mapping => ({
      label: mapping.convergeEndpoint,
      description: `→ ${mapping.elavonEndpoint}`,
      detail: `Contains field: ${fieldName}`,
      mapping: mapping
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${matchingMappings.length} mapping(s) containing "${fieldName}"`
    });

    if (selected) {
      await this.showMappingDetails(selected.mapping);
    }
  }

  private async exportMappings(): Promise<void> {
    const mappingService = this._serviceContainer.getMappingService();
    const exportedJson = await mappingService.exportMappingDictionary();

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('mapping-dictionary.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(exportedJson, 'utf8'));
      vscode.window.showInformationMessage(`Mapping dictionary exported to ${saveUri.fsPath}`);
    }
  }

  private async showMappingStatistics(): Promise<void> {
    const mappingService = this._serviceContainer.getMappingService();
    const stats = await mappingService.getMappingStatistics();

    const statisticsText = `
Mapping Dictionary Statistics

Version: ${stats.version}
Last Updated: ${stats.lastUpdated.toLocaleDateString()}
Total Mappings: ${stats.totalMappings}
Total Fields: ${stats.totalFields}

Endpoint Types:
${stats.endpointTypes.map(endpoint => `  • ${endpoint}`).join('\n')}
    `.trim();

    vscode.window.showInformationMessage(statisticsText, { modal: true });
  }

  private async handleReloadMappings(): Promise<void> {
    try {
      const mappingService = this._serviceContainer.getMappingService();
      await mappingService.reloadMappingDictionary();
      
      const stats = await mappingService.getMappingStatistics();
      vscode.window.showInformationMessage(
        `Mapping dictionary reloaded successfully. Version ${stats.version} with ${stats.totalMappings} mappings.`
      );
    } catch (error) {
      console.error('Error reloading mappings:', error);
      vscode.window.showErrorMessage(`Failed to reload mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show detailed scan results
   */
  private async showScanResults(result: ScanResult): Promise<void> {
    const endpointsByType = new Map<string, ConvergeEndpoint[]>();
    
    // Group endpoints by type
    for (const endpoint of result.endpoints) {
      const type = endpoint.endpointType;
      if (!endpointsByType.has(type)) {
        endpointsByType.set(type, []);
      }
      endpointsByType.get(type)!.push(endpoint);
    }

    // Create summary
    const summary = Array.from(endpointsByType.entries())
      .map(([type, endpoints]) => `  • ${type}: ${endpoints.length} endpoint(s)`)
      .join('\n');

    const details = `
Scan Results Summary

Total Endpoints: ${result.endpoints.length}
Files Scanned: ${result.scannedFiles}
Scan Duration: ${Math.round(result.scanDuration / 1000)}s
Cache Hits: ${result.cacheHits}

Endpoints by Type:
${summary}

${result.errors.length > 0 ? `Errors: ${result.errors.length}` : ''}
    `.trim();

    const choice = await vscode.window.showInformationMessage(
      details,
      { modal: true },
      'Navigate to Endpoint',
      'Export Results',
      'Close'
    );

    if (choice === 'Navigate to Endpoint') {
      await this.navigateToEndpoint(result.endpoints);
    } else if (choice === 'Export Results') {
      await this.exportScanResults(result);
    }
  }

  /**
   * Navigate to a specific endpoint
   */
  private async navigateToEndpoint(endpoints: ConvergeEndpoint[]): Promise<void> {
    const items = endpoints.map(endpoint => ({
      label: `${endpoint.endpointType} (Line ${endpoint.lineNumber})`,
      description: path.basename(endpoint.filePath),
      detail: `${endpoint.sslFields.length} SSL fields`,
      endpoint
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an endpoint to navigate to'
    });

    if (selected) {
      const uri = vscode.Uri.file(selected.endpoint.filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      // Navigate to the specific line
      const position = new vscode.Position(selected.endpoint.lineNumber - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position));
    }
  }

  /**
   * Export scan results to JSON file
   */
  private async exportScanResults(result: ScanResult): Promise<void> {
    const exportData = {
      scanTimestamp: new Date().toISOString(),
      scanDuration: result.scanDuration,
      totalEndpoints: result.endpoints.length,
      scannedFiles: result.scannedFiles,
      cacheHits: result.cacheHits,
      endpoints: result.endpoints.map(endpoint => ({
        id: endpoint.id,
        filePath: endpoint.filePath,
        lineNumber: endpoint.lineNumber,
        endpointType: endpoint.endpointType,
        sslFields: endpoint.sslFields,
        codePreview: endpoint.code.substring(0, 200) + (endpoint.code.length > 200 ? '...' : '')
      })),
      errors: result.errors
    };

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('converge-scan-results.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (saveUri) {
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(JSON.stringify(exportData, null, 2), 'utf8'));
      vscode.window.showInformationMessage(`Scan results exported to ${saveUri.fsPath}`);
    }
  }

  /**
   * Show scan errors
   */
  private async showScanErrors(errors: Array<{ filePath: string; error: string; timestamp: Date }>): Promise<void> {
    const errorSummary = errors
      .map(err => `  • ${path.basename(err.filePath)}: ${err.error}`)
      .join('\n');

    const details = `
Scan Errors (${errors.length})

${errorSummary}

These files were skipped during scanning. Common causes:
- File permission issues
- Binary files
- Very large files
- Corrupted files
    `.trim();

    vscode.window.showWarningMessage(details, { modal: true });
  }

  /**
   * Handle generate report command
   */
  private async handleGenerateReport(): Promise<void> {
    if (!this.panelManager) {
      vscode.window.showErrorMessage('Panel manager not available');
      return;
    }

    try {
      await this.panelManager.generateReport();
      vscode.window.showInformationMessage('Migration report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      vscode.window.showErrorMessage('Failed to generate migration report');
    }
  }

  /**
   * Handle export report command
   */
  private async handleExportReport(): Promise<void> {
    if (!this.panelManager) {
      vscode.window.showErrorMessage('Panel manager not available');
      return;
    }

    try {
      const format = await vscode.window.showQuickPick(
        ['markdown', 'sarif', 'json', 'csv'],
        {
          placeHolder: 'Select export format',
          title: 'Export Report Format'
        }
      );

      if (format) {
        await this.panelManager.exportReport(format);
        vscode.window.showInformationMessage(`Report exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      vscode.window.showErrorMessage('Failed to export report');
    }
  }

  /**
   * Validate a migration entry
   */
  private validateMigrationEntry(entry: any): boolean {
    // Basic validation checks
    if (!entry.id || !entry.filePath || !entry.status) {
      return false;
    }

    // Check if file still exists
    try {
      const fs = require('fs');
      if (!fs.existsSync(entry.filePath)) {
        return false;
      }
    } catch {
      return false;
    }

    // Check if migration was successful
    if (entry.status !== 'success') {
      return false;
    }

    // Check if migrated code is valid
    if (!entry.migratedCode || entry.migratedCode.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get validation issues for a migration entry
   */
  private getValidationIssues(entry: any): string[] {
    const issues: string[] = [];

    if (!entry.id) {
      issues.push('Missing migration ID');
    }

    if (!entry.filePath) {
      issues.push('Missing file path');
    }

    if (!entry.status) {
      issues.push('Missing migration status');
    }

    if (entry.status !== 'success') {
      issues.push(`Migration failed: ${entry.errorMessage || 'Unknown error'}`);
    }

    if (!entry.migratedCode || entry.migratedCode.trim().length === 0) {
      issues.push('Empty migrated code');
    }

    try {
      const fs = require('fs');
      if (!fs.existsSync(entry.filePath)) {
        issues.push('File no longer exists');
      }
    } catch {
      issues.push('Cannot verify file existence');
    }

    return issues;
  }

  /**
   * Show validation details in a new document
   */
  private async showValidationDetails(validationResults: any[]): Promise<void> {
    const content = validationResults.map(result => {
      const status = result.isValid ? '✅' : '❌';
      const issues = result.issues.length > 0 ? `\n  Issues: ${result.issues.join(', ')}` : '';
      return `${status} ${result.filePath} (${result.status})${issues}`;
    }).join('\n');

    const document = await vscode.workspace.openTextDocument({
      content: `Migration Validation Results\n${'='.repeat(50)}\n\n${content}`,
      language: 'plaintext'
    });

    await vscode.window.showTextDocument(document);
  }

  /**
   * Export validation report to file
   */
  private async exportValidationReport(validationResults: any[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      totalMigrations: validationResults.length,
      validMigrations: validationResults.filter(r => r.isValid).length,
      invalidMigrations: validationResults.filter(r => !r.isValid).length,
      results: validationResults
    };

    const content = JSON.stringify(report, null, 2);
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('migration-validation-report.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
      vscode.window.showInformationMessage(`Validation report exported to ${uri.fsPath}`);
    }
  }

  /**
   * Open credentials panel
   */
  private async handleOpenCredentials(): Promise<void> {
    try {
      console.log('🔐 Opening credentials panel...');
      
      // Since the panel focus is failing, let's go directly to the input dialog
      // This provides a more reliable user experience
      console.log('🔐 Showing credentials input dialog directly...');
      await this.showCredentialsInputDialog();
      
    } catch (error) {
      console.error('❌ Failed to open credentials panel:', error);
      // Show fallback dialog even if everything fails
      await this.showCredentialsInputDialog();
    }
  }

  /**
   * Show a simple credentials input dialog as fallback
   */
  private async showCredentialsInputDialog(): Promise<void> {
    try {
      console.log('🔐 Showing fallback credentials dialog...');
      
      // Get current credentials if any
      const credentialService = this._serviceContainer.getCredentialService();
      const existingCredentials = await credentialService.retrieveCredentials();
      
      // Show input dialog for Elavon Public Key
      const publicKey = await vscode.window.showInputBox({
        prompt: 'Enter Elavon Public Key',
        placeHolder: 'e.g., pk_test_1234567890abcdef1234567890',
        value: existingCredentials?.publicKey || '',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Public Key is required';
          }
          if (!value.startsWith('pk_')) {
            return 'Public Key must start with pk_';
          }
          if (value.length < 30) {
            return 'Public Key appears to be too short';
          }
          return null;
        }
      });
      
      if (!publicKey) {
        vscode.window.showInformationMessage('Credentials configuration cancelled');
        return;
      }
      
      // Show input dialog for Elavon Secret Key
      const secretKey = await vscode.window.showInputBox({
        prompt: 'Enter Elavon Secret Key',
        placeHolder: 'e.g., sk_test_1234567890abcdef1234567890',
        value: existingCredentials?.secretKey || '',
        password: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Secret Key is required';
          }
          if (!value.startsWith('sk_')) {
            return 'Secret Key must start with sk_';
          }
          if (value.length < 30) {
            return 'Secret Key appears to be too short';
          }
          return null;
        }
      });
      
      if (!secretKey) {
        vscode.window.showInformationMessage('Credentials configuration cancelled');
        return;
      }
      
      // Ask for environment
      const environment = await vscode.window.showQuickPick([
        { label: 'Sandbox', description: 'Use Elavon sandbox environment (pk_test_/sk_test_)', picked: true },
        { label: 'Production', description: 'Use Elavon production environment (pk_live_/sk_live_)' }
      ], {
        placeHolder: 'Select Elavon environment'
      });
      
      if (!environment) {
        vscode.window.showInformationMessage('Credentials configuration cancelled');
        return;
      }
      
      // Optional: Ask for Merchant ID
      const merchantId = await vscode.window.showInputBox({
        prompt: 'Enter Elavon Merchant ID (Optional)',
        placeHolder: 'e.g., your_merchant_id_here',
        value: existingCredentials?.merchantId || '',
        validateInput: (value) => {
          // Merchant ID is optional, so no validation needed
          return null;
        }
      });
      
      // Save credentials with correct field names
      const credentials = {
        publicKey: publicKey.trim(),
        secretKey: secretKey.trim(),
        environment: environment.label.toLowerCase() as 'sandbox' | 'production',
        merchantId: merchantId?.trim() || undefined
      };
      
      await credentialService.storeCredentials(credentials);
      
      vscode.window.showInformationMessage(
        `✅ Elavon credentials configured successfully for ${environment.label} environment`
      );
      
      console.log('✅ Credentials saved via fallback dialog');
      
    } catch (error) {
      console.error('❌ Failed to show credentials dialog:', error);
      vscode.window.showErrorMessage(`Failed to configure credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}
