import * as vscode from 'vscode';
import * as path from 'path';
import { MappingDictionaryService, FieldMapping, EndpointMapping, MappingSearchResult } from '../services/MappingDictionaryService';

/**
 * Interface for documentation panel messages
 */
interface DocumentationPanelMessage {
  type: 'searchMappings' | 'getFieldMapping' | 'getEndpointMapping' | 'loadMappingStats' | 'generateCode' | 'exportMappings';
  data?: any;
}

/**
 * Interface for documentation panel state
 */
interface DocumentationPanelState {
  isLoading: boolean;
  searchResults: MappingSearchResult[];
  selectedMapping: FieldMapping | EndpointMapping | null;
  mappingStats: {
    totalEndpoints: number;
    totalFieldMappings: number;
    commonFields: number;
    deprecatedFields: number;
    transformationRules: number;
    version: string;
    lastUpdated: string;
  } | null;
  searchQuery: string;
  activeTab: 'search' | 'browse' | 'stats';
}

/**
 * Webview provider for the documentation panel
 */
export class DocumentationPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'convergeElavonMigrator.documentationPanel';

  private _view?: vscode.WebviewView;
  private _mappingService: MappingDictionaryService;
  private _currentState: DocumentationPanelState = {
    isLoading: false,
    searchResults: [],
    selectedMapping: null,
    mappingStats: null,
    searchQuery: '',
    activeTab: 'search'
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._mappingService = new MappingDictionaryService(_context);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message: DocumentationPanelMessage) => {
        switch (message.type) {
          case 'searchMappings':
            this._searchMappings(message.data);
            break;
          case 'getFieldMapping':
            this._getFieldMapping(message.data);
            break;
          case 'getEndpointMapping':
            this._getEndpointMapping(message.data);
            break;
          case 'loadMappingStats':
            this._loadMappingStats();
            break;
          case 'generateCode':
            this._generateCode(message.data);
            break;
          case 'exportMappings':
            this._exportMappings(message.data);
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );

    // Load initial data
    this._loadInitialData();
  }

  /**
   * Search for mappings
   */
  private async _searchMappings(data: { query: string }): Promise<void> {
    try {
      this._currentState.isLoading = true;
      this._currentState.searchQuery = data.query;
      this._updateWebviewState();

      const searchResults = await this._mappingService.searchMappings(data.query);
      
      this._currentState.searchResults = searchResults;
      this._currentState.isLoading = false;
      this._updateWebviewState();

      this._sendMessage({
        type: 'searchResults',
        data: {
          query: data.query,
          results: searchResults,
          totalResults: searchResults.length
        }
      });

    } catch (error) {
      this._currentState.isLoading = false;
      this._updateWebviewState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Search failed: ${errorMessage}`);
      
      this._sendMessage({
        type: 'searchError',
        data: { error: errorMessage }
      });
    }
  }

  /**
   * Get specific field mapping
   */
  private async _getFieldMapping(data: { fieldName: string }): Promise<void> {
    try {
      const fieldMapping = await this._mappingService.getFieldMapping(data.fieldName);
      
      if (fieldMapping) {
        this._currentState.selectedMapping = fieldMapping;
        this._updateWebviewState();

        // Get transformation rule if available
        const transformationRule = await this._mappingService.getTransformationRule(data.fieldName);

        this._sendMessage({
          type: 'fieldMappingDetails',
          data: {
            mapping: fieldMapping,
            transformationRule: transformationRule,
            codeExamples: await this._generateCodeExamples(fieldMapping)
          }
        });
      } else {
        this._sendMessage({
          type: 'mappingNotFound',
          data: { fieldName: data.fieldName, type: 'field' }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to get field mapping: ${errorMessage}`);
    }
  }

  /**
   * Get specific endpoint mapping
   */
  private async _getEndpointMapping(data: { endpointName: string }): Promise<void> {
    try {
      const endpointMapping = await this._mappingService.getEndpointMapping(data.endpointName);
      
      if (endpointMapping) {
        this._currentState.selectedMapping = endpointMapping;
        this._updateWebviewState();

        this._sendMessage({
          type: 'endpointMappingDetails',
          data: {
            mapping: endpointMapping,
            fieldCount: endpointMapping.fieldMappings.length,
            complexity: await this._getEndpointComplexity(endpointMapping)
          }
        });
      } else {
        this._sendMessage({
          type: 'mappingNotFound',
          data: { endpointName: data.endpointName, type: 'endpoint' }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to get endpoint mapping: ${errorMessage}`);
    }
  }

  /**
   * Load mapping statistics
   */
  private async _loadMappingStats(): Promise<void> {
    try {
      this._currentState.isLoading = true;
      this._updateWebviewState();

      const stats = await this._mappingService.getMappingStatistics();
      
      this._currentState.mappingStats = stats;
      this._currentState.isLoading = false;
      this._updateWebviewState();

      this._sendMessage({
        type: 'mappingStats',
        data: stats
      });

    } catch (error) {
      this._currentState.isLoading = false;
      this._updateWebviewState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load mapping statistics: ${errorMessage}`);
    }
  }

  /**
   * Generate code examples for a field mapping
   */
  private async _generateCode(data: { 
    fieldName: string; 
    language: 'javascript' | 'typescript' | 'php' | 'python' | 'java' | 'csharp' | 'ruby' 
  }): Promise<void> {
    try {
      const code = await this._mappingService.generateMigrationCode(data.fieldName, data.language);
      
      if (code) {
        this._sendMessage({
          type: 'generatedCode',
          data: {
            fieldName: data.fieldName,
            language: data.language,
            code: code
          }
        });

        // Also copy to clipboard
        await vscode.env.clipboard.writeText(code);
        vscode.window.showInformationMessage(`Code copied to clipboard for ${data.fieldName} (${data.language})`);
      } else {
        vscode.window.showWarningMessage(`No code generation available for ${data.fieldName}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Code generation failed: ${errorMessage}`);
    }
  }

  /**
   * Export mappings to file
   */
  private async _exportMappings(data: { format: 'json' | 'csv' | 'markdown' }): Promise<void> {
    try {
      const dictionary = await this._mappingService.loadMappingDictionary();
      let content: string;
      let extension: string;

      switch (data.format) {
        case 'json':
          content = JSON.stringify(dictionary, null, 2);
          extension = 'json';
          break;
        case 'csv':
          content = this._generateCSVExport(dictionary);
          extension = 'csv';
          break;
        case 'markdown':
          content = this._generateMarkdownExport(dictionary);
          extension = 'md';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`converge-elavon-mappings.${extension}`),
        filters: {
          [data.format.toUpperCase()]: [extension]
        }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        vscode.window.showInformationMessage(`Mappings exported to ${uri.fsPath}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Generate code examples for a field mapping
   */
  private async _generateCodeExamples(mapping: FieldMapping): Promise<Record<string, string>> {
    const examples: Record<string, string> = {};
    const languages: Array<'javascript' | 'typescript' | 'php' | 'python' | 'java' | 'csharp' | 'ruby'> = 
      ['javascript', 'typescript', 'php', 'python', 'java', 'csharp', 'ruby'];

    for (const language of languages) {
      try {
        const code = await this._mappingService.generateMigrationCode(mapping.convergeField, language);
        if (code) {
          examples[language] = code;
        }
      } catch (error) {
        // Skip languages that fail
        console.warn(`Failed to generate ${language} code for ${mapping.convergeField}:`, error);
      }
    }

    return examples;
  }

  /**
   * Get endpoint complexity information
   */
  private async _getEndpointComplexity(endpoint: EndpointMapping): Promise<{
    score: number;
    complexity: 'low' | 'medium' | 'high';
    details: any;
  }> {
    const fieldNames = endpoint.fieldMappings.map(m => m.convergeField);
    return await this._mappingService.getMigrationComplexity(fieldNames);
  }

  /**
   * Generate CSV export content
   */
  private _generateCSVExport(dictionary: any): string {
    const lines = ['Type,Converge Field/Endpoint,Elavon Field/Endpoint,Data Type,Required,Max Length,Notes'];
    
    // Add common fields
    for (const field of dictionary.commonFields) {
      lines.push([
        'Field',
        field.convergeField,
        field.elavonField,
        field.dataType,
        field.required ? 'Yes' : 'No',
        field.maxLength || '',
        field.notes || ''
      ].map(v => `"${v}"`).join(','));
    }

    // Add endpoint fields
    for (const endpoint of dictionary.endpoints) {
      lines.push([
        'Endpoint',
        endpoint.convergeEndpoint,
        endpoint.elavonEndpoint,
        endpoint.method,
        '',
        '',
        endpoint.description
      ].map(v => `"${v}"`).join(','));

      for (const field of endpoint.fieldMappings) {
        lines.push([
          'Field',
          field.convergeField,
          field.elavonField,
          field.dataType,
          field.required ? 'Yes' : 'No',
          field.maxLength || '',
          field.notes || ''
        ].map(v => `"${v}"`).join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate Markdown export content
   */
  private _generateMarkdownExport(dictionary: any): string {
    let content = `# Converge to Elavon Migration Mappings\n\n`;
    content += `**Version:** ${dictionary.version}\n`;
    content += `**Last Updated:** ${dictionary.lastUpdated}\n\n`;

    content += `## Common Fields\n\n`;
    content += `| Converge Field | Elavon Field | Data Type | Required | Max Length | Notes |\n`;
    content += `|---|---|---|---|---|---|\n`;
    
    for (const field of dictionary.commonFields) {
      content += `| ${field.convergeField} | ${field.elavonField} | ${field.dataType} | ${field.required ? 'Yes' : 'No'} | ${field.maxLength || ''} | ${field.notes || ''} |\n`;
    }

    content += `\n## Endpoints\n\n`;
    
    for (const endpoint of dictionary.endpoints) {
      content += `### ${endpoint.convergeEndpoint} → ${endpoint.elavonEndpoint}\n\n`;
      content += `**Method:** ${endpoint.method}\n`;
      content += `**Description:** ${endpoint.description}\n\n`;
      
      if (endpoint.fieldMappings.length > 0) {
        content += `| Converge Field | Elavon Field | Data Type | Required | Max Length | Notes |\n`;
        content += `|---|---|---|---|---|---|\n`;
        
        for (const field of endpoint.fieldMappings) {
          content += `| ${field.convergeField} | ${field.elavonField} | ${field.dataType} | ${field.required ? 'Yes' : 'No'} | ${field.maxLength || ''} | ${field.notes || ''} |\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  /**
   * Load initial data
   */
  private async _loadInitialData(): Promise<void> {
    await this._loadMappingStats();
  }

  /**
   * Update webview state
   */
  private _updateWebviewState(): void {
    this._sendMessage({
      type: 'updateState',
      data: this._currentState
    });
  }

  /**
   * Send message to webview
   */
  private _sendMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Get HTML content for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'documentationPanel.js'));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'documentationPanel.css'));

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>Migration Documentation</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  /**
   * Get current documentation state
   */
  public getDocumentationState(): DocumentationPanelState {
    return { ...this._currentState };
  }

  /**
   * Trigger search programmatically
   */
  public async searchMappings(query: string): Promise<MappingSearchResult[]> {
    const results = await this._mappingService.searchMappings(query);
    this._currentState.searchResults = results;
    this._currentState.searchQuery = query;
    this._updateWebviewState();
    return results;
  }

  /**
   * Get mapping statistics
   */
  public async getMappingStatistics() {
    return await this._mappingService.getMappingStatistics();
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}