import * as vscode from 'vscode';
import { PatternMatchingService } from './PatternMatchingService';
import { ConvergeEndpointType } from '../types/ConvergeEndpoint';
import { WorkspaceScannerService } from './WorkspaceScannerService';

/**
 * Interface for context menu action
 */
export interface ContextMenuAction {
  id: string;
  title: string;
  command: string;
  icon?: string;
  tooltip?: string;
  when?: string;
  group?: string;
  order?: number;
}

/**
 * Interface for detected endpoint
 */
export interface DetectedEndpoint {
  type: ConvergeEndpointType;
  endpoint: string;
  confidence: number;
  lineNumber: number;
  startColumn?: number;
  endColumn?: number;
  context: string;
}

/**
 * Interface for endpoint context
 */
export interface EndpointContext {
  endpoint: DetectedEndpoint;
  document: vscode.TextDocument;
  range: vscode.Range;
  line: string;
}

/**
 * Interface for context menu provider
 */
export interface ContextMenuProvider {
  getActions(context: EndpointContext): ContextMenuAction[];
  canHandle(context: EndpointContext): boolean;
}

/**
 * Service for managing context menu integration for Converge endpoints
 */
export class ContextMenuService {
  private _patternService: PatternMatchingService;
  private _scannerService: WorkspaceScannerService;
  private _providers: Map<string, ContextMenuProvider> = new Map();
  private _disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _context: vscode.ExtensionContext,
    patternService: PatternMatchingService,
    scannerService: WorkspaceScannerService
  ) {
    this._patternService = patternService;
    this._scannerService = scannerService;
  }

  /**
   * Initialize the context menu service
   */
  public async initialize(): Promise<void> {
    try {
      // Register built-in context menu providers
      this._registerBuiltInProviders();

      // Register VS Code commands for context menu actions
      this._registerCommands();

      // Register code action provider for inline suggestions
      this._registerCodeActionProvider();

      console.log('Context menu service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize context menu service:', error);
      throw new Error(`Failed to initialize context menu service: ${error instanceof Error ? error.message : 'Unknown error'}`);    }

  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];
  }

  /**
   * Register a context menu provider
   */
  public registerProvider(id: string, provider: ContextMenuProvider): void {
    this._providers.set(id, provider);
  }

  /**
   * Unregister a context menu provider
   */
  public unregisterProvider(id: string): void {
    this._providers.delete(id);
  }

  /**
   * Get context menu actions for a specific location
   */
  public async getContextMenuActions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<ContextMenuAction[]> {
    try {
      // Get the line at the position
      const line = document.lineAt(position);
      const lineText = line.text;

      // Check if this line contains a Converge endpoint
      const language = this._getLanguageFromDocument(document);
      const endpointMatches = this._patternService.matchEndpoints(lineText);
      const sslFields = this._patternService.extractSSLFields(lineText, language);
      
      // Convert matches to DetectedEndpoint format
      const endpoints = this._convertMatchesToEndpoints(endpointMatches, sslFields, position.line, lineText);

      if (endpoints.length === 0) {
        return [];
      }

      // Create context for the first detected endpoint
      const endpoint = endpoints[0];
      const range = new vscode.Range(
        position.line,
        endpoint.startColumn || 0,
        position.line,
        endpoint.endColumn || lineText.length
      );

      const context: EndpointContext = {
        endpoint,
        document,
        range,
        line: lineText
      };

      // Collect actions from all providers
      const actions: ContextMenuAction[] = [];
      for (const provider of this._providers.values()) {
        if (provider.canHandle(context)) {
          const providerActions = provider.getActions(context);
          actions.push(...providerActions);
        }
      }

      return actions;
    } catch (error) {
      console.error('Error getting context menu actions:', error);
      return [];
    }
  }

  /**
   * Execute a context menu action
   */
  public async executeAction(
    actionId: string,
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<void> {
    try {
      const actions = await this.getContextMenuActions(document, position);
      const action = actions.find(a => a.id === actionId);

      if (!action) {
        throw new Error(`Action ${actionId} not found`);
      }

      // Execute the command
      await vscode.commands.executeCommand(action.command, {
        document,
        position,
        action
      });
    } catch (error) {
      console.error(`Error executing action ${actionId}:`, error);
      vscode.window.showErrorMessage(`Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register built-in context menu providers
   */
  private _registerBuiltInProviders(): void {
    // Register migration provider
    this.registerProvider('migration', new MigrationContextMenuProvider());

    // Register documentation provider
    this.registerProvider('documentation', new DocumentationContextMenuProvider());

    // Register validation provider
    this.registerProvider('validation', new ValidationContextMenuProvider());
  }

  /**
   * Register VS Code commands for context menu actions
   */
  private _registerCommands(): void {
    // Register migrate to Elavon command
    const migrateCommand = vscode.commands.registerCommand(
      'converge-elavon-migrator.migrateEndpoint',
      async (args: { document: vscode.TextDocument; position: vscode.Position; action: ContextMenuAction }) => {
        await this._handleMigrateEndpoint(args.document, args.position);
      }
    );
    this._disposables.push(migrateCommand);

    // Register show documentation command
    const docsCommand = vscode.commands.registerCommand(
      'converge-elavon-migrator.showDocumentation',
      async (args: { document: vscode.TextDocument; position: vscode.Position; action: ContextMenuAction }) => {
        await this._handleShowDocumentation(args.document, args.position);
      }
    );
    this._disposables.push(docsCommand);

    // Register validate endpoint command
    const validateCommand = vscode.commands.registerCommand(
      'converge-elavon-migrator.validateEndpoint',
      async (args: { document: vscode.TextDocument; position: vscode.Position; action: ContextMenuAction }) => {
        await this._handleValidateEndpoint(args.document, args.position);
      }
    );
    this._disposables.push(validateCommand);

    // Register scan file command
    const scanCommand = vscode.commands.registerCommand(
      'converge-elavon-migrator.scanFile',
      async (args: { document: vscode.TextDocument; position: vscode.Position; action: ContextMenuAction }) => {
        await this._handleScanFile(args.document);
      }
    );
    this._disposables.push(scanCommand);

    // Register show mapping command
    const mappingCommand = vscode.commands.registerCommand(
      'converge-elavon-migrator.showMapping',
      async (args: { document: vscode.TextDocument; position: vscode.Position; action: ContextMenuAction }) => {
        await this._handleShowMapping(args.document, args.position);
      }
    );
    this._disposables.push(mappingCommand);
  }

  /**
   * Register code action provider for inline suggestions
   */
  private _registerCodeActionProvider(): void {
    const provider = vscode.languages.registerCodeActionsProvider(
      [
        { scheme: 'file', language: 'javascript' },
        { scheme: 'file', language: 'typescript' },
        { scheme: 'file', language: 'php' },
        { scheme: 'file', language: 'python' },
        { scheme: 'file', language: 'java' },
        { scheme: 'file', language: 'csharp' },
        { scheme: 'file', language: 'ruby' }
      ],
      new ConvergeCodeActionProvider(this),
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.Refactor
        ]
      }
    );
    this._disposables.push(provider);
  }

  /**
   * Handle migrate endpoint action
   */
  private async _handleMigrateEndpoint(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<void> {
    try {
      // Show migration panel and start migration process
      await vscode.commands.executeCommand('converge-elavon-migrator.showMigrationPanel');
      
      // Get the endpoint at the position
      const line = document.lineAt(position);
      const language = this._getLanguageFromDocument(document);
      const endpointMatches = this._patternService.matchEndpoints(line.text);
      const sslFields = this._patternService.extractSSLFields(line.text, language);
      const endpoints = this._convertMatchesToEndpoints(endpointMatches, sslFields, position.line, line.text);

      if (endpoints.length > 0) {
        const endpoint = endpoints[0];
        
        // Add this endpoint to the migration queue
        await vscode.commands.executeCommand('converge-elavon-migrator.addMigrationItem', {
          filePath: document.uri.fsPath,
          lineNumber: position.line + 1,
          endpoint: endpoint,
          originalCode: line.text.trim()
        });

        vscode.window.showInformationMessage(
          `Added ${endpoint.type} endpoint to migration queue`
        );
      }
    } catch (error) {
      console.error('Error handling migrate endpoint:', error);
      vscode.window.showErrorMessage(`Failed to migrate endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle show documentation action
   */
  private async _handleShowDocumentation(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<void> {
    try {
      // Show documentation panel
      await vscode.commands.executeCommand('converge-elavon-migrator.showDocumentationPanel');

      // Get the endpoint at the position
      const line = document.lineAt(position);
      const language = this._getLanguageFromDocument(document);
      const endpointMatches = this._patternService.matchEndpoints(line.text);
      const sslFields = this._patternService.extractSSLFields(line.text, language);
      const endpoints = this._convertMatchesToEndpoints(endpointMatches, sslFields, position.line, line.text);

      if (endpoints.length > 0) {
        const endpoint = endpoints[0];
        
        // Navigate to relevant documentation
        await vscode.commands.executeCommand('converge-elavon-migrator.showEndpointDocumentation', {
          endpointType: endpoint.type,
          endpoint: endpoint.endpoint
        });
      }
    } catch (error) {
      console.error('Error showing documentation:', error);
      vscode.window.showErrorMessage(`Failed to show documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle validate endpoint action
   */
  private async _handleValidateEndpoint(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<void> {
    try {
      // Get the endpoint at the position
      const line = document.lineAt(position);
      const language = this._getLanguageFromDocument(document);
      const endpointMatches = this._patternService.matchEndpoints(line.text);
      const sslFields = this._patternService.extractSSLFields(line.text, language);
      const endpoints = this._convertMatchesToEndpoints(endpointMatches, sslFields, position.line, line.text);

      if (endpoints.length > 0) {
        const endpoint = endpoints[0];
        
        // Show validation progress
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Validating Converge endpoint...',
          cancellable: false
        }, async (progress) => {
          progress.report({ increment: 50, message: 'Analyzing endpoint...' });
          
          // Simulate validation (in real implementation, this would validate the endpoint)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          progress.report({ increment: 50, message: 'Validation complete' });
          
          vscode.window.showInformationMessage(
            `Endpoint validation complete: ${endpoint.type} at ${endpoint.endpoint}`
          );
        });
      }
    } catch (error) {
      console.error('Error validating endpoint:', error);
      vscode.window.showErrorMessage(`Failed to validate endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle scan file action
   */
  private async _handleScanFile(document: vscode.TextDocument): Promise<void> {
    try {
      // Show scan panel
      await vscode.commands.executeCommand('converge-elavon-migrator.showScanPanel');

      // Trigger file scan
      await vscode.commands.executeCommand('converge-elavon-migrator.scanFile', {
        filePath: document.uri.fsPath
      });

      vscode.window.showInformationMessage('File scan initiated');
    } catch (error) {
      console.error('Error scanning file:', error);
      vscode.window.showErrorMessage(`Failed to scan file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle show mapping action
   */
  private async _handleShowMapping(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<void> {
    try {
      // Get the line content
      const line = document.lineAt(position);
      const lineText = line.text;

      // Extract SSL fields from the line
      const sslFields = this._extractSslFields(lineText);

      if (sslFields.length > 0) {
        // Show mapping information in a quick pick
        const mappingItems = sslFields.map(field => ({
          label: field,
          description: this._getElavonMapping(field),
          detail: `Converge field: ${field}`
        }));

        const selected = await vscode.window.showQuickPick(mappingItems, {
          title: 'Field Mappings',
          placeHolder: 'Select a field to see its Elavon equivalent'
        });

        if (selected) {
          vscode.window.showInformationMessage(
            `${selected.label} → ${selected.description}`
          );
        }
      } else {
        vscode.window.showInformationMessage('No Converge fields found on this line');
      }
    } catch (error) {
      console.error('Error showing mapping:', error);
      vscode.window.showErrorMessage(`Failed to show mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get language from document
   */
  private _getLanguageFromDocument(document: vscode.TextDocument): string {
    return document.languageId;
  }

  /**
   * Extract SSL fields from line text
   */
  private _extractSslFields(lineText: string): string[] {
    const sslFieldPattern = /ssl_\w+/g;
    const matches = lineText.match(sslFieldPattern);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Get Elavon mapping for SSL field
   */
  private _getElavonMapping(sslField: string): string {
    const mappings: Record<string, string> = {
      'ssl_amount': 'amount',
      'ssl_card_number': 'card_number',
      'ssl_exp_date': 'expiry_date',
      'ssl_cvv2cvc2': 'cvv',
      'ssl_first_name': 'cardholder_name',
      'ssl_last_name': 'cardholder_name',
      'ssl_merchant_id': 'merchant_id',
      'ssl_user_id': 'api_key',
      'ssl_pin': 'api_secret',
      'ssl_transaction_type': 'transaction_type',
      'ssl_invoice_number': 'reference',
      'ssl_description': 'description'
    };
    return mappings[sslField] || 'Unknown mapping';
  }

  /**
   * Convert pattern matches to DetectedEndpoint format
   */
  private _convertMatchesToEndpoints(
    endpointMatches: Array<{ type: ConvergeEndpointType; matches: RegExpMatchArray[] }>,
    sslFields: Array<{ field: string; line: number; context: string; confidence: number }>,
    lineNumber: number,
    lineText: string
  ): DetectedEndpoint[] {
    const endpoints: DetectedEndpoint[] = [];

    // Convert endpoint matches
    for (const match of endpointMatches) {
      if (match.matches.length > 0) {
        const firstMatch = match.matches[0];
        endpoints.push({
          type: match.type,
          endpoint: firstMatch[0],
          confidence: 0.9,
          lineNumber: lineNumber + 1,
          startColumn: firstMatch.index || 0,
          endColumn: (firstMatch.index || 0) + firstMatch[0].length,
          context: lineText
        });
      }
    }

    // If no endpoint matches but SSL fields found, create a generic payment endpoint
    if (endpoints.length === 0 && sslFields.length > 0) {
      endpoints.push({
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.7,
        lineNumber: lineNumber + 1,
        startColumn: 0,
        endColumn: lineText.length,
        context: lineText
      });
    }

    return endpoints;
  }
}

/**
 * Migration context menu provider
 */
class MigrationContextMenuProvider implements ContextMenuProvider {
  canHandle(context: EndpointContext): boolean {
    return context.endpoint.confidence > 0.7;
  }

  getActions(context: EndpointContext): ContextMenuAction[] {
    const actions: ContextMenuAction[] = [
      {
        id: 'migrate-to-elavon',
        title: 'Migrate to Elavon',
        command: 'converge-elavon-migrator.migrateEndpoint',
        icon: '$(arrow-right)',
        tooltip: 'Migrate this Converge endpoint to Elavon',
        group: 'migration',
        order: 1
      }
    ];

    // Add endpoint-specific actions
    switch (context.endpoint.type) {
      case ConvergeEndpointType.PROCESS_TRANSACTION:
        actions.push({
          id: 'migrate-payment',
          title: 'Migrate Payment Endpoint',
          command: 'converge-elavon-migrator.migrateEndpoint',
          icon: '$(credit-card)',
          tooltip: 'Migrate payment processing to Elavon',
          group: 'migration',
          order: 2
        });
        break;

      case ConvergeEndpointType.HOSTED_PAYMENTS:
        actions.push({
          id: 'migrate-hosted',
          title: 'Migrate Hosted Payments',
          command: 'converge-elavon-migrator.migrateEndpoint',
          icon: '$(globe)',
          tooltip: 'Migrate hosted payments to Elavon',
          group: 'migration',
          order: 2
        });
        break;

      case ConvergeEndpointType.BATCH_PROCESSING:
        actions.push({
          id: 'migrate-batch',
          title: 'Migrate Batch Processing',
          command: 'converge-elavon-migrator.migrateEndpoint',
          icon: '$(list-ordered)',
          tooltip: 'Migrate batch processing to Elavon',
          group: 'migration',
          order: 2
        });
        break;
    }

    return actions;
  }
}

/**
 * Documentation context menu provider
 */
class DocumentationContextMenuProvider implements ContextMenuProvider {
  canHandle(context: EndpointContext): boolean {
    return true; // Always provide documentation options
  }

  getActions(context: EndpointContext): ContextMenuAction[] {
    return [
      {
        id: 'show-documentation',
        title: 'Show Documentation',
        command: 'converge-elavon-migrator.showDocumentation',
        icon: '$(book)',
        tooltip: 'Show API documentation for this endpoint',
        group: 'documentation',
        order: 1
      },
      {
        id: 'show-mapping',
        title: 'Show Field Mapping',
        command: 'converge-elavon-migrator.showMapping',
        icon: '$(list-tree)',
        tooltip: 'Show field mappings for Converge to Elavon',
        group: 'documentation',
        order: 2
      }
    ];
  }
}

/**
 * Validation context menu provider
 */
class ValidationContextMenuProvider implements ContextMenuProvider {
  canHandle(context: EndpointContext): boolean {
    return context.endpoint.confidence > 0.5;
  }

  getActions(context: EndpointContext): ContextMenuAction[] {
    return [
      {
        id: 'validate-endpoint',
        title: 'Validate Endpoint',
        command: 'converge-elavon-migrator.validateEndpoint',
        icon: '$(check)',
        tooltip: 'Validate this Converge endpoint',
        group: 'validation',
        order: 1
      },
      {
        id: 'scan-file',
        title: 'Scan File',
        command: 'converge-elavon-migrator.scanFile',
        icon: '$(search)',
        tooltip: 'Scan entire file for Converge endpoints',
        group: 'validation',
        order: 2
      }
    ];
  }
}

/**
 * Code action provider for inline suggestions
 */
class ConvergeCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private _contextMenuService: ContextMenuService) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    try {
      // Get context menu actions for the current position
      const position = range.start;
      const contextActions = await this._contextMenuService.getContextMenuActions(document, position);

      // Convert context menu actions to code actions
      for (const contextAction of contextActions) {
        const codeAction = new vscode.CodeAction(
          contextAction.title,
          vscode.CodeActionKind.QuickFix
        );

        codeAction.command = {
          title: contextAction.title,
          command: contextAction.command,
          arguments: [{ document, position, action: contextAction }]
        };

        // Note: VS Code CodeAction doesn't have tooltip property
        // The tooltip is handled by the command itself

        actions.push(codeAction);
      }
    } catch (error) {
      console.error('Error providing code actions:', error);
    }

    return actions;
  }
}