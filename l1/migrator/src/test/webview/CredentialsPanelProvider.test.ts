import { CredentialsPanelProvider } from '../../webview/CredentialsPanelProvider';
import * as vscode from 'vscode';
import { CredentialService, ElavonCredentials } from '../../services/CredentialService';
import { ElavonValidationService, ValidationResult } from '../../services/ElavonValidationService';

// Mock VS Code API
jest.mock('vscode', () => ({
  Uri: {
    joinPath: jest.fn((base, ...paths) => ({
      fsPath: `${base.fsPath}/${paths.join('/')}`
    }))
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn()
  }
}));

// Mock services
jest.mock('../../services/CredentialService');
jest.mock('../../services/ElavonValidationService');

const MockCredentialService = CredentialService as jest.MockedClass<typeof CredentialService>;
const MockElavonValidationService = ElavonValidationService as jest.MockedClass<typeof ElavonValidationService>;

describe('CredentialsPanelProvider', () => {
  let credentialsPanelProvider: CredentialsPanelProvider;
  let mockContext: vscode.ExtensionContext;
  let mockExtensionUri: vscode.Uri;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockCredentialService: jest.Mocked<CredentialService>;
  let mockValidationService: jest.Mocked<ElavonValidationService>;

  beforeEach(() => {
    // Mock extension context
    mockContext = {
      subscriptions: []
    } as any;

    // Mock extension URI
    mockExtensionUri = {
      fsPath: '/mock/extension/path'
    } as vscode.Uri;

    // Mock webview
    mockWebview = {
      options: {},
      html: '',
      asWebviewUri: jest.fn((uri) => ({ toString: () => uri.fsPath + '/credentialsPanel.js' })),
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
      cspSource: 'vscode-webview:'
    } as any;

    // Mock webview view
    mockWebviewView = {
      webview: mockWebview
    } as any;

    // Mock services
    mockCredentialService = {
      storeCredentials: jest.fn(),
      retrieveCredentials: jest.fn(),
      clearCredentials: jest.fn(),
      hasCredentials: jest.fn()
    } as any;

    mockValidationService = {
      validateCredentials: jest.fn(),
      validateCredentialFormat: jest.fn(),
      getValidationSummary: jest.fn(),
      getValidationReport: jest.fn()
    } as any;

    MockCredentialService.mockImplementation(() => mockCredentialService);
    MockElavonValidationService.mockImplementation(() => mockValidationService);

    credentialsPanelProvider = new CredentialsPanelProvider(mockExtensionUri, mockContext);

    jest.clearAllMocks();
  });

  describe('resolveWebviewView', () => {
    it('should configure webview options correctly', () => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [mockExtensionUri]
      });
    });

    it('should set HTML content for webview', () => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.html).toContain('<!DOCTYPE html>');
      expect(mockWebview.html).toContain('Elavon Credentials');
      expect(mockWebview.html).toContain('credentialsPanel.js');
    });

    it('should register message handler', () => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        mockContext.subscriptions
      );
    });

    it('should load initial state', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValueOnce(null);

      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    let messageHandler: (message: any) => void;

    beforeEach(() => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      
      // Get the message handler that was registered
      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      messageHandler = onDidReceiveMessageCall[0];
    });

    describe('saveCredentials message', () => {
      it('should save valid credentials', async () => {
        const credentialsData = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox' as const,
          merchantId: 'MERCHANT123'
        };

        const mockValidationResult: ValidationResult = {
          success: true,
          message: 'Credentials are valid'
        };

        // Mock the private method by mocking the entire validation
        mockValidationService.validateCredentials.mockResolvedValueOnce(mockValidationResult);
        mockCredentialService.storeCredentials.mockResolvedValueOnce(undefined);

        await messageHandler({ type: 'saveCredentials', data: credentialsData });

        // Note: validateCredentialFormat is private, so we test the overall flow
        expect(mockCredentialService.storeCredentials).toHaveBeenCalledWith(credentialsData);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Elavon credentials saved successfully');
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          type: 'credentialsSaved',
          data: { success: true }
        });
      });
    });

    describe('testCredentials message', () => {
      it('should test stored credentials when no data provided', async () => {
        const storedCredentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox'
        };

        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(storedCredentials);
        mockValidationService.validateCredentials.mockResolvedValueOnce({
          success: false,
          message: 'Invalid credentials'
        });

        await messageHandler({ type: 'testCredentials' });

        expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
        // Just verify the basic flow works
        expect(mockValidationService.validateCredentials).toHaveBeenCalled();
      });

      it('should handle missing stored credentials', async () => {
        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(null);

        await messageHandler({ type: 'testCredentials' });

        expect(mockWebview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'validationComplete',
            data: expect.objectContaining({
              result: expect.objectContaining({
                success: false,
                message: 'No credentials found. Please save credentials first.'
              })
            })
          })
        );
      });
    });

    describe('clearCredentials message', () => {
      it('should clear credentials successfully', async () => {
        mockCredentialService.clearCredentials.mockResolvedValueOnce(undefined);

        await messageHandler({ type: 'clearCredentials' });

        expect(mockCredentialService.clearCredentials).toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Credentials cleared successfully');
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          type: 'credentialsCleared',
          data: { success: true }
        });
      });
    });

    describe('loadCredentials message', () => {
      it('should load existing credentials with masked secret key', async () => {
        const storedCredentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox',
          merchantId: 'MERCHANT123'
        };

        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(storedCredentials);

        await messageHandler({ type: 'loadCredentials' });

        expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          type: 'credentialsLoaded',
          data: {
            hasCredentials: true,
            publicKey: 'pk_test_1234567890abcdef1234567890',
            secretKey: '••••••••••••••••••••••••••••••••',
            environment: 'sandbox',
            merchantId: 'MERCHANT123'
          }
        });
      });

      it('should handle no stored credentials', async () => {
        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(null);

        await messageHandler({ type: 'loadCredentials' });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          type: 'credentialsLoaded',
          data: {
            hasCredentials: false,
            publicKey: '',
            secretKey: '',
            environment: 'sandbox',
            merchantId: ''
          }
        });
      });
    });
  });

  describe('public methods', () => {
    beforeEach(() => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    describe('getCredentialsState', () => {
      it('should return current credentials state', () => {
        const state = credentialsPanelProvider.getCredentialsState();
        
        expect(state).toEqual({
          hasCredentials: false,
          isValidating: false,
          validationResult: null,
          lastValidated: null,
          environment: 'sandbox'
        });
      });
    });

    describe('hasCredentials', () => {
      it('should return true when credentials exist', async () => {
        const mockCredentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox'
        };

        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(mockCredentials);

        const result = await credentialsPanelProvider.hasCredentials();

        expect(result).toBe(true);
        expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
      });

      it('should return false when no credentials exist', async () => {
        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(null);

        const result = await credentialsPanelProvider.hasCredentials();

        expect(result).toBe(false);
      });
    });

    describe('validateStoredCredentials', () => {
      it('should validate stored credentials', async () => {
        const mockCredentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox'
        };

        const mockValidationResult: ValidationResult = {
          success: true,
          message: 'Credentials are valid'
        };

        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(mockCredentials);
        mockValidationService.validateCredentials.mockResolvedValueOnce(mockValidationResult);

        const result = await credentialsPanelProvider.validateStoredCredentials();

        expect(result).toEqual(mockValidationResult);
        expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
        expect(mockValidationService.validateCredentials).toHaveBeenCalledWith(mockCredentials);
      });

      it('should return null when no credentials exist', async () => {
        mockCredentialService.retrieveCredentials.mockResolvedValueOnce(null);

        const result = await credentialsPanelProvider.validateStoredCredentials();

        expect(result).toBeNull();
      });
    });
  });

  describe('HTML generation', () => {
    it('should generate valid HTML with security policy', () => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      const html = mockWebview.html;
      
      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain('nonce-');
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('credentialsPanel.js');
      expect(html).toContain('credentialsPanel.css');
    });

    it('should include all required CSS files', () => {
      credentialsPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      const html = mockWebview.html;
      
      expect(html).toContain('reset.css');
      expect(html).toContain('vscode.css');
      expect(html).toContain('credentialsPanel.css');
    });
  });
});