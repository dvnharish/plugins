import * as vscode from 'vscode';
import * as path from 'path';
import { CredentialService, ElavonCredentials } from '../services/CredentialService';
import { ElavonValidationService, ValidationResult } from '../services/ElavonValidationService';

/**
 * Interface for credentials panel messages
 */
interface CredentialsPanelMessage {
  type: 'saveCredentials' | 'testCredentials' | 'clearCredentials' | 'loadCredentials' | 'validateFormat';
  data?: any;
}

/**
 * Interface for credentials panel state
 */
interface CredentialsPanelState {
  hasCredentials: boolean;
  isValidating: boolean;
  validationResult: ValidationResult | null;
  lastValidated: string | null;
  environment: 'sandbox' | 'production';
}

/**
 * Webview provider for the credentials panel
 */
export class CredentialsPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'convergeElavonMigrator.credentialsPanel';

  private _view?: vscode.WebviewView;
  private _credentialService: CredentialService;
  private _validationService: ElavonValidationService;
  private _currentState: CredentialsPanelState = {
    hasCredentials: false,
    isValidating: false,
    validationResult: null,
    lastValidated: null,
    environment: 'sandbox'
  };

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    this._credentialService = new CredentialService(_context);
    this._validationService = new ElavonValidationService();
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
      (message: CredentialsPanelMessage) => {
        switch (message.type) {
          case 'saveCredentials':
            this._saveCredentials(message.data);
            break;
          case 'testCredentials':
            this._testCredentials(message.data);
            break;
          case 'clearCredentials':
            this._clearCredentials();
            break;
          case 'loadCredentials':
            this._loadCredentials();
            break;
          case 'validateFormat':
            this._validateFormat(message.data);
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );

    // Load initial state
    this._loadInitialState();
  }

  /**
   * Save credentials securely
   */
  private async _saveCredentials(data: {
    publicKey: string;
    secretKey: string;
    environment: 'sandbox' | 'production';
    merchantId?: string;
  }): Promise<void> {
    try {
      // Basic format validation will be done by the validation service
      // We'll let the service handle the validation and catch any format errors

      // Save credentials
      await this._credentialService.storeCredentials({
        publicKey: data.publicKey,
        secretKey: data.secretKey,
        environment: data.environment,
        ...(data.merchantId && { merchantId: data.merchantId })
      });

      this._currentState.hasCredentials = true;
      this._currentState.environment = data.environment;
      this._updateWebviewState();

      vscode.window.showInformationMessage('Elavon credentials saved successfully');

      this._sendMessage({
        type: 'credentialsSaved',
        data: { success: true }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to save credentials: ${errorMessage}`);
      
      this._sendMessage({
        type: 'credentialsSaved',
        data: { 
          success: false, 
          error: errorMessage 
        }
      });
    }
  }

  /**
   * Test credentials by validating with Elavon API
   */
  private async _testCredentials(data?: {
    publicKey?: string;
    secretKey?: string;
    environment?: 'sandbox' | 'production';
    merchantId?: string;
  }): Promise<void> {
    try {
      this._currentState.isValidating = true;
      this._updateWebviewState();

      let credentials: ElavonCredentials;

      if (data && data.publicKey && data.secretKey) {
        // Test provided credentials
        credentials = {
          publicKey: data.publicKey,
          secretKey: data.secretKey,
          environment: data.environment || 'sandbox',
          ...(data.merchantId && { merchantId: data.merchantId })
        };
      } else {
        // Test stored credentials
        const retrievedCredentials = await this._credentialService.retrieveCredentials();
        if (!retrievedCredentials) {
          throw new Error('No credentials found. Please save credentials first.');
        }
        credentials = retrievedCredentials;
      }

      // Validate credentials
      const validationResult = await this._validationService.validateCredentials(credentials);
      
      this._currentState.validationResult = validationResult;
      this._currentState.lastValidated = new Date().toISOString();
      this._currentState.isValidating = false;
      this._updateWebviewState();

      // Show result to user
      if (validationResult.success) {
        vscode.window.showInformationMessage(
          `✅ Credentials validated successfully (${validationResult.responseTime}ms)`
        );
      } else {
        vscode.window.showWarningMessage(
          `❌ Credential validation failed: ${validationResult.message}`
        );
      }

      this._sendMessage({
        type: 'validationComplete',
        data: {
          result: validationResult,
          summary: validationResult.success ? `✅ ${validationResult.message}` : `❌ ${validationResult.message}`,
          report: [
            `Validation Result: ${validationResult.success ? 'PASSED' : 'FAILED'}`,
            `Message: ${validationResult.message}`,
            validationResult.responseTime ? `Response Time: ${validationResult.responseTime}ms` : '',
            validationResult.endpoint ? `Endpoint: ${validationResult.endpoint}` : '',
            validationResult.error ? `Error: ${validationResult.error}` : ''
          ].filter(Boolean)
        }
      });

    } catch (error) {
      this._currentState.isValidating = false;
      this._currentState.validationResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      this._updateWebviewState();

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Credential validation failed: ${errorMessage}`);

      this._sendMessage({
        type: 'validationComplete',
        data: {
          result: this._currentState.validationResult,
          summary: `❌ ${errorMessage}`,
          report: [`Validation failed: ${errorMessage}`]
        }
      });
    }
  }

  /**
   * Clear stored credentials
   */
  private async _clearCredentials(): Promise<void> {
    try {
      await this._credentialService.clearCredentials();
      
      this._currentState.hasCredentials = false;
      this._currentState.validationResult = null;
      this._currentState.lastValidated = null;
      this._updateWebviewState();

      vscode.window.showInformationMessage('Credentials cleared successfully');

      this._sendMessage({
        type: 'credentialsCleared',
        data: { success: true }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to clear credentials: ${errorMessage}`);
      
      this._sendMessage({
        type: 'credentialsCleared',
        data: { 
          success: false, 
          error: errorMessage 
        }
      });
    }
  }

  /**
   * Load stored credentials (without exposing secret values)
   */
  private async _loadCredentials(): Promise<void> {
    try {
      const credentials = await this._credentialService.retrieveCredentials();
      
      if (credentials) {
        this._currentState.hasCredentials = true;
        this._currentState.environment = credentials.environment;
        
        // Send masked credentials to webview (never send actual secret key)
        this._sendMessage({
          type: 'credentialsLoaded',
          data: {
            hasCredentials: true,
            publicKey: credentials.publicKey,
            secretKey: '••••••••••••••••••••••••••••••••', // Masked
            environment: credentials.environment,
            merchantId: credentials.merchantId || ''
          }
        });
      } else {
        this._currentState.hasCredentials = false;
        
        this._sendMessage({
          type: 'credentialsLoaded',
          data: {
            hasCredentials: false,
            publicKey: '',
            secretKey: '',
            environment: 'sandbox',
            merchantId: ''
          }
        });
      }

      this._updateWebviewState();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load credentials:', error);
      
      this._sendMessage({
        type: 'credentialsLoaded',
        data: {
          hasCredentials: false,
          publicKey: '',
          secretKey: '',
          environment: 'sandbox',
          merchantId: '',
          error: errorMessage
        }
      });
    }
  }

  /**
   * Validate credential format without saving
   */
  private _validateFormat(data: {
    publicKey: string;
    secretKey: string;
    environment: 'sandbox' | 'production';
    merchantId?: string;
  }): void {
    try {
      // Basic format validation
      const publicKeyPattern = /^pk_(test_|live_)?[a-zA-Z0-9]{24,}$/;
      const secretKeyPattern = /^sk_(test_|live_)?[a-zA-Z0-9]{24,}$/;
      
      let isValid = true;
      let message = 'Format validation passed';
      
      if (!publicKeyPattern.test(data.publicKey)) {
        isValid = false;
        message = 'Invalid public key format. Expected format: pk_test_... or pk_live_...';
      } else if (!secretKeyPattern.test(data.secretKey)) {
        isValid = false;
        message = 'Invalid secret key format. Expected format: sk_test_... or sk_live_...';
      } else {
        // Check environment consistency
        const isTestKey = data.publicKey.includes('test_') || data.secretKey.includes('test_');
        const isLiveKey = data.publicKey.includes('live_') || data.secretKey.includes('live_');
        
        if (data.environment === 'production' && isTestKey) {
          isValid = false;
          message = 'Cannot use test keys in production environment';
        } else if (data.environment === 'sandbox' && isLiveKey) {
          isValid = false;
          message = 'Cannot use live keys in sandbox environment';
        }
      }

      this._sendMessage({
        type: 'formatValidation',
        data: {
          result: {
            success: isValid,
            message: message
          },
          summary: isValid ? `✅ ${message}` : `❌ ${message}`
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this._sendMessage({
        type: 'formatValidation',
        data: {
          result: {
            success: false,
            message: errorMessage
          },
          summary: `❌ ${errorMessage}`
        }
      });
    }
  }

  /**
   * Load initial state
   */
  private async _loadInitialState(): Promise<void> {
    try {
      const credentials = await this._credentialService.retrieveCredentials();
      this._currentState.hasCredentials = !!credentials;
      if (credentials) {
        this._currentState.environment = credentials.environment;
      }
      this._updateWebviewState();
    } catch (error) {
      console.error('Failed to load initial credentials state:', error);
    }
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
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'credentialsPanel.js'));
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'credentialsPanel.css'));

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
        <title>Elavon Credentials</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  /**
   * Get current credentials state
   */
  public getCredentialsState(): CredentialsPanelState {
    return { ...this._currentState };
  }

  /**
   * Check if credentials are available
   */
  public async hasCredentials(): Promise<boolean> {
    try {
      const credentials = await this._credentialService.retrieveCredentials();
      return !!credentials;
    } catch {
      return false;
    }
  }

  /**
   * Trigger credential validation programmatically
   */
  public async validateStoredCredentials(): Promise<ValidationResult | null> {
    try {
      const credentials = await this._credentialService.retrieveCredentials();
      if (!credentials) {
        return null;
      }
      
      return await this._validationService.validateCredentials(credentials);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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