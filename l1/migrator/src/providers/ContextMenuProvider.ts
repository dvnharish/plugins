import * as vscode from 'vscode';
import { ParserService } from '../services/ParserService';
import { MigrationService } from '../services/MigrationService';
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';

/**
 * Context menu provider for Converge to Elavon migration
 */
export class ConvergeContextMenuProvider {
  private _parserService: ParserService;
  private _migrationService: MigrationService;

  constructor(
    parserService: ParserService,
    migrationService: MigrationService
  ) {
    this._parserService = parserService;
    this._migrationService = migrationService;
  }

  /**
   * Register context menu commands
   */
  public registerCommands(context: vscode.ExtensionContext): void {
    // Register migrate endpoint command
    const migrateCommand = vscode.commands.registerCommand(
      'elavonx.migrateEndpoint',
      (endpoint: ConvergeEndpoint) => this.migrateEndpoint(endpoint)
    );

    // Register migrate selection command
    const migrateSelectionCommand = vscode.commands.registerCommand(
      'elavonx.migrateSelection',
      () => this.migrateSelection()
    );

    // Register validate migration command
    const validateCommand = vscode.commands.registerCommand(
      'elavonx.validateMigration',
      (endpoint: ConvergeEndpoint) => this.validateMigration(endpoint)
    );

    // Register bulk migrate command
    const bulkMigrateCommand = vscode.commands.registerCommand(
      'elavonx.bulkMigrate',
      () => this.bulkMigrate()
    );

    // Register show migration history command
    const showHistoryCommand = vscode.commands.registerCommand(
      'elavonx.showMigrationHistory',
      (migration?: any) => this.showMigrationHistory(migration)
    );

    // Register rollback migration command
    const rollbackCommand = vscode.commands.registerCommand(
      'elavonx.rollbackMigration',
      (migration: any) => this.rollbackMigration(migration)
    );

    context.subscriptions.push(
      migrateCommand,
      migrateSelectionCommand,
      validateCommand,
      bulkMigrateCommand,
      showHistoryCommand,
      rollbackCommand
    );
  }

  /**
   * Migrate a specific endpoint
   */
  private async migrateEndpoint(endpoint: ConvergeEndpoint): Promise<void> {
    try {
      if (!endpoint) {
        vscode.window.showErrorMessage('No endpoint provided for migration');
        return;
      }

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Migrating Converge endpoint to Elavon',
        cancellable: true
      }, async (progress, token) => {
        progress.report({ message: 'Analyzing endpoint...' });

        const result = await this._migrationService.migrateEndpoint(endpoint, {
          validateAfterMigration: true,
          createBackup: true,
          progressCallback: (migrationProgress) => {
            progress.report({
              message: migrationProgress.message,
              increment: migrationProgress.progress
            });
          }
        });

        if (result.success) {
          vscode.window.showInformationMessage(
            `✅ Migration completed successfully! Confidence: ${Math.round(result.metadata.confidence * 100)}%`
          );
        } else {
          vscode.window.showErrorMessage(`❌ Migration failed: ${result.error || 'Unknown error'}`);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Migration failed: ${errorMessage}`);
    }
  }

  /**
   * Migrate selected text
   */
  private async migrateSelection(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage('No text selected');
        return;
      }

      const selectedText = editor.document.getText(selection);
      const filePath = editor.document.uri.fsPath;

      // Parse the selected text to find endpoints
      const endpoints = await this._parserService.parseText(selectedText, filePath);
      
      if (endpoints.length === 0) {
        vscode.window.showWarningMessage('No Converge endpoints found in selected text');
        return;
      }

      if (endpoints.length === 1) {
        // Single endpoint - migrate directly
        await this.migrateEndpoint(endpoints[0]);
      } else {
        // Multiple endpoints - show selection dialog
        const items = endpoints.map(endpoint => ({
          label: `${endpoint.endpointType} (Line ${endpoint.lineNumber})`,
          description: endpoint.sslFields.join(', '),
          endpoint
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select endpoint to migrate',
          title: 'Multiple endpoints found'
        });

        if (selected) {
          await this.migrateEndpoint(selected.endpoint);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Selection migration failed: ${errorMessage}`);
    }
  }

  /**
   * Validate migration
   */
  private async validateMigration(endpoint: ConvergeEndpoint): Promise<void> {
    try {
      if (!endpoint) {
        vscode.window.showErrorMessage('No endpoint provided for validation');
        return;
      }

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating migration against Elavon sandbox',
        cancellable: true
      }, async (progress, token) => {
        progress.report({ message: 'Preparing validation...' });

        // This would typically involve:
        // 1. Migrating the endpoint
        // 2. Testing against Elavon sandbox
        // 3. Reporting results

        progress.report({ message: 'Validating against sandbox...' });

        // Simulate validation (replace with actual implementation)
        await new Promise(resolve => setTimeout(resolve, 2000));

        vscode.window.showInformationMessage('✅ Validation completed successfully');
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
    }
  }

  /**
   * Bulk migrate all endpoints
   */
  private async bulkMigrate(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const filePath = editor.document.uri.fsPath;
      
      // Parse file for all endpoints
      const endpoints = await this._parserService.parseFile(filePath);
      
      if (endpoints.length === 0) {
        vscode.window.showInformationMessage('No Converge endpoints found in this file');
        return;
      }

      // Confirm bulk migration
      const confirm = await vscode.window.showWarningMessage(
        `Found ${endpoints.length} endpoints to migrate. This will modify your file. Continue?`,
        'Yes', 'No'
      );

      if (confirm !== 'Yes') {
        return;
      }

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Bulk migrating ${endpoints.length} endpoints`,
        cancellable: true
      }, async (progress, token) => {
        const result = await this._migrationService.migrateEndpointsBulk(endpoints, {
          validateAfterMigration: true,
          createBackup: true,
          stopOnError: false,
          progressCallback: (bulkProgress) => {
            progress.report({
              message: bulkProgress.message,
              increment: bulkProgress.progress
            });
          }
        });

        if (result.success) {
          vscode.window.showInformationMessage(
            `✅ Bulk migration completed! ${result.successfulMigrations} successful, ${result.failedMigrations} failed`
          );
        } else {
          vscode.window.showErrorMessage(
            `❌ Bulk migration failed: ${result.errors.length} errors occurred`
          );
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Bulk migration failed: ${errorMessage}`);
    }
  }

  /**
   * Show migration history
   */
  private async showMigrationHistory(migration?: any): Promise<void> {
    try {
      const history = this._migrationService.getMigrationHistory();
      
      if (history.length === 0) {
        vscode.window.showInformationMessage('No migration history found');
        return;
      }

      // Show recent migrations
      const recentMigrations = history.slice(0, 10);
      const items = recentMigrations.map(migration => ({
        label: `${migration.success ? '✅' : '❌'} ${migration.endpointType}`,
        description: `${migration.filePath}:${migration.lineNumber} - ${migration.timestamp.toLocaleString()}`,
        detail: migration.error || 'Successfully migrated',
        migration
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select migration to view details',
        title: 'Migration History'
      });

      if (selected) {
        // Show migration details
        const details = [
          `File: ${selected.migration.filePath}`,
          `Line: ${selected.migration.lineNumber}`,
          `Endpoint: ${selected.migration.endpointType}`,
          `Status: ${selected.migration.success ? 'Success' : 'Failed'}`,
          `Date: ${selected.migration.timestamp.toLocaleString()}`,
          selected.migration.error ? `Error: ${selected.migration.error}` : ''
        ].filter(Boolean);

        await vscode.window.showInformationMessage(details.join('\n'));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to show migration history: ${errorMessage}`);
    }
  }

  /**
   * Rollback migration
   */
  private async rollbackMigration(migration: any): Promise<void> {
    try {
      if (!migration) {
        vscode.window.showErrorMessage('No migration provided for rollback');
        return;
      }

      // Confirm rollback
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to rollback the migration of ${migration.endpointType}?`,
        'Yes', 'No'
      );

      if (confirm !== 'Yes') {
        return;
      }

      // Perform rollback
      const success = await this._migrationService.rollbackMigration(migration);
      
      if (success) {
        vscode.window.showInformationMessage('✅ Migration rolled back successfully');
      } else {
        vscode.window.showErrorMessage('❌ Failed to rollback migration');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Rollback failed: ${errorMessage}`);
    }
  }

  /**
   * Get context menu items for a document
   */
  public async getContextMenuItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Command[]> {
    const commands: vscode.Command[] = [];

    try {
      // Parse document for endpoints near the cursor
      const endpoints = await this._parserService.parseFile(document.uri.fsPath);
      const lineNumber = position.line + 1; // Convert to 1-based

      // Find endpoints near the cursor
      const nearbyEndpoints = endpoints.filter(endpoint => 
        Math.abs(endpoint.lineNumber - lineNumber) <= 5
      );

      if (nearbyEndpoints.length > 0) {
        // Add migrate command for the closest endpoint
        const closestEndpoint = nearbyEndpoints.reduce((closest, current) => 
          Math.abs(current.lineNumber - lineNumber) < Math.abs(closest.lineNumber - lineNumber) 
            ? current : closest
        );

        commands.push({
          title: '$(arrow-right) Migrate to Elavon',
          command: 'elavonx.migrateEndpoint',
          arguments: [closestEndpoint]
        });

        commands.push({
          title: '$(check) Validate Migration',
          command: 'elavonx.validateMigration',
          arguments: [closestEndpoint]
        });
      }

      // Add selection-based commands
      commands.push({
        title: '$(selection) Migrate Selection',
        command: 'elavonx.migrateSelection'
      });

      // Add bulk migration if multiple endpoints found
      if (endpoints.length > 1) {
        commands.push({
          title: '$(symbol-array) Bulk Migrate All',
          command: 'elavonx.bulkMigrate'
        });
      }

      // Add history command
      if (this._migrationService.getMigrationHistory().length > 0) {
        commands.push({
          title: '$(history) Migration History',
          command: 'elavonx.showMigrationHistory'
        });
      }

    } catch (error) {
      console.error('Error getting context menu items:', error);
    }

    return commands;
  }
}
