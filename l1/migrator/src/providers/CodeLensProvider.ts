import * as vscode from 'vscode';
import { ParserService } from '../services/ParserService';
import { MigrationService } from '../services/MigrationService';
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';

/**
 * CodeLens provider for Converge to Elavon migration suggestions
 */
export class ConvergeCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private _parserService: ParserService;
  private _migrationService: MigrationService;
  private _supportedLanguages: string[] = [
    'javascript',
    'typescript',
    'php',
    'python',
    'java',
    'csharp',
    'ruby',
    'go',
    'cpp',
    'c'
  ];

  constructor(
    parserService: ParserService,
    migrationService: MigrationService
  ) {
    this._parserService = parserService;
    this._migrationService = migrationService;
  }

  /**
   * Provide CodeLens for a document
   */
  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      // Check if document is supported
      if (!this._supportedLanguages.includes(document.languageId)) {
        return codeLenses;
      }

      // Parse document for Converge endpoints
      const endpoints = await this._parserService.parseFile(document.uri.fsPath);
      
      if (endpoints.length === 0) {
        return codeLenses;
      }

      // Create CodeLens for each endpoint
      for (const endpoint of endpoints) {
        const codeLens = this._createCodeLens(document, endpoint);
        if (codeLens) {
          codeLens.push(codeLens);
        }
      }

    } catch (error) {
      console.error('Error providing CodeLenses:', error);
    }

    return codeLenses;
  }

  /**
   * Create a CodeLens for a Converge endpoint
   */
  private _createCodeLens(
    document: vscode.TextDocument,
    endpoint: ConvergeEndpoint
  ): vscode.CodeLens | null {
    try {
      // Calculate position (line is 0-based in VS Code, but endpoint.lineNumber is 1-based)
      const line = Math.max(0, endpoint.lineNumber - 1);
      const position = new vscode.Position(line, 0);
      const range = new vscode.Range(position, position);

      // Create command for migration
      const command: vscode.Command = {
        title: `$(arrow-right) Migrate to Elavon`,
        command: 'elavonx.migrateEndpoint',
        arguments: [endpoint],
        tooltip: `Migrate ${endpoint.endpointType} endpoint to Elavon API`
      };

      return new vscode.CodeLens(range, command);

    } catch (error) {
      console.error('Error creating CodeLens:', error);
      return null;
    }
  }

  /**
   * Resolve CodeLens (called when CodeLens is about to be shown)
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    // Add additional information to the CodeLens
    if (codeLens.command && codeLens.command.arguments && codeLens.command.arguments.length > 0) {
      const endpoint = codeLens.command.arguments[0] as ConvergeEndpoint;
      
      // Update command title with confidence score
      const confidence = this._calculateConfidence(endpoint);
      const confidenceText = confidence >= 0.8 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low';
      
      codeLens.command.title = `$(arrow-right) Migrate to Elavon (${confidenceText} confidence)`;
      codeLens.command.tooltip = `Migrate ${endpoint.endpointType} endpoint to Elavon API\nConfidence: ${Math.round(confidence * 100)}%\nSSL Fields: ${endpoint.sslFields.length}`;
    }

    return codeLens;
  }

  /**
   * Calculate confidence score for an endpoint
   */
  private _calculateConfidence(endpoint: ConvergeEndpoint): number {
    let confidence = 0.5; // Base confidence

    // More SSL fields = higher confidence
    confidence += Math.min(endpoint.sslFields.length * 0.05, 0.3);

    // Known endpoint types get higher confidence
    const knownEndpoints = [
      'hosted-payments',
      'checkout',
      'process',
      'batch',
      'transaction'
    ];

    if (knownEndpoints.some(known => endpoint.endpointType.toLowerCase().includes(known))) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Refresh CodeLenses
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}

/**
 * CodeLens provider for migration history
 */
export class MigrationHistoryCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private _migrationService: MigrationService;

  constructor(migrationService: MigrationService) {
    this._migrationService = migrationService;
  }

  /**
   * Provide CodeLens for migration history
   */
  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      // Get migration history for this file
      const history = this._migrationService.getMigrationHistory();
      const fileHistory = history.filter(entry => entry.filePath === document.uri.fsPath);

      if (fileHistory.length === 0) {
        return codeLenses;
      }

      // Create CodeLens for recent migrations
      const recentMigrations = fileHistory.slice(0, 5); // Show last 5 migrations

      for (const migration of recentMigrations) {
        const line = Math.max(0, migration.lineNumber - 1);
        const position = new vscode.Position(line, 0);
        const range = new vscode.Range(position, position);

        const command: vscode.Command = {
          title: `$(history) Migration History`,
          command: 'elavonx.showMigrationHistory',
          arguments: [migration],
          tooltip: `View migration history for this endpoint\nMigrated: ${migration.timestamp.toLocaleString()}\nStatus: ${migration.success ? 'Success' : 'Failed'}`
        };

        codeLenses.push(new vscode.CodeLens(range, command));
      }

    } catch (error) {
      console.error('Error providing migration history CodeLenses:', error);
    }

    return codeLenses;
  }

  /**
   * Resolve CodeLens
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }

  /**
   * Refresh CodeLenses
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}

/**
 * CodeLens provider for validation suggestions
 */
export class ValidationCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private _parserService: ParserService;

  constructor(parserService: ParserService) {
    this._parserService = parserService;
  }

  /**
   * Provide CodeLens for validation
   */
  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      // Parse document for Converge endpoints
      const endpoints = await this._parserService.parseFile(document.uri.fsPath);
      
      if (endpoints.length === 0) {
        return codeLenses;
      }

      // Create CodeLens for validation
      for (const endpoint of endpoints) {
        const line = Math.max(0, endpoint.lineNumber - 1);
        const position = new vscode.Position(line, 0);
        const range = new vscode.Range(position, position);

        const command: vscode.Command = {
          title: `$(check) Validate Migration`,
          command: 'elavonx.validateMigration',
          arguments: [endpoint],
          tooltip: `Validate ${endpoint.endpointType} endpoint against Elavon sandbox`
        };

        codeLenses.push(new vscode.CodeLens(range, command));
      }

    } catch (error) {
      console.error('Error providing validation CodeLenses:', error);
    }

    return codeLenses;
  }

  /**
   * Resolve CodeLens
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }

  /**
   * Refresh CodeLenses
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Dispose of the provider
   */
  public dispose(): void {
    this._onDidChangeCodeLenses.dispose();
  }
}
