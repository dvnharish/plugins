import { ScanPanelProvider } from '../../webview/ScanPanelProvider';
import * as vscode from 'vscode';
import { WorkspaceScannerService, ScanResult } from '../../services/WorkspaceScannerService';
import { PatternMatchingService } from '../../services/PatternMatchingService';

// Mock VS Code API
jest.mock('vscode', () => ({
  Uri: {
    joinPath: jest.fn((base, ...paths) => ({
      fsPath: `${base.fsPath}/${paths.join('/')}`
    }))
  },
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: '/mock/workspace' }
      }
    ],
    openTextDocument: jest.fn()
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showTextDocument: jest.fn()
  },
  Position: jest.fn(),
  Selection: jest.fn(),
  Range: jest.fn()
}));

// Mock services
jest.mock('../../services/WorkspaceScannerService');
jest.mock('../../services/PatternMatchingService');

const MockWorkspaceScannerService = WorkspaceScannerService as jest.MockedClass<typeof WorkspaceScannerService>;
const MockPatternMatchingService = PatternMatchingService as jest.MockedClass<typeof PatternMatchingService>;

describe('ScanPanelProvider', () => {
  let scanPanelProvider: ScanPanelProvider;
  let mockContext: vscode.ExtensionContext;
  let mockExtensionUri: vscode.Uri;
  let mockWebviewView: vscode.WebviewView;
  let mockWebview: vscode.Webview;
  let mockScannerService: jest.Mocked<WorkspaceScannerService>;
  let mockPatternService: jest.Mocked<PatternMatchingService>;

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
      asWebviewUri: jest.fn((uri) => ({ toString: () => uri.fsPath + '/scanPanel.js' })),
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
      cspSource: 'vscode-webview:'
    } as any;

    // Mock webview view
    mockWebviewView = {
      webview: mockWebview
    } as any;

    // Mock services
    mockScannerService = {
      scanWorkspace: jest.fn()
    } as any;

    mockPatternService = {} as any;

    MockWorkspaceScannerService.mockImplementation(() => mockScannerService);
    MockPatternMatchingService.mockImplementation(() => mockPatternService);

    scanPanelProvider = new ScanPanelProvider(mockExtensionUri, mockContext, mockScannerService);

    jest.clearAllMocks();
  });

  describe('resolveWebviewView', () => {
    it('should configure webview options correctly', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.options).toEqual({
        enableScripts: true,
        localResourceRoots: [mockExtensionUri]
      });
    });

    it('should set HTML content for webview', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.html).toContain('<!DOCTYPE html>');
      expect(mockWebview.html).toContain('Converge Endpoint Scanner');
      expect(mockWebview.html).toContain('scanPanel.js');
    });

    it('should register message handler', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalledWith(
        expect.any(Function),
        undefined,
        mockContext.subscriptions
      );
    });

    it('should send initial state to webview', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'updateState',
        data: expect.objectContaining({
          isScanning: false,
          scanResults: [],
          totalFiles: 0,
          scannedFiles: 0,
          progress: 0
        })
      });
    });
  });

  describe('message handling', () => {
    let messageHandler: (message: any) => void;

    beforeEach(() => {
      // Mock workspace folders
      (vscode.workspace as any).workspaceFolders = [
        { uri: { fsPath: '/test/workspace' } }
      ];
      
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      
      // Get the message handler that was registered
      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      messageHandler = onDidReceiveMessageCall[0];
    });

    describe('startScan message', () => {
      it('should start workspace scan', async () => {
        const mockScanResult: ScanResult = {
          endpoints: [
            {
              filePath: '/test/file.js',
              lineNumber: 10,
              endpointType: '/hosted-payments',
              confidence: 0.9,
              language: 'javascript',
              matchedPattern: 'ssl_merchant_id',
              context: 'const merchantId = ssl_merchant_id;'
            } as any
          ],
          scannedFiles: 1,
          skippedFiles: 0,
          totalFiles: 1,
          scanDuration: 100,
          cacheHits: 0,
          errors: []
        };

        mockScannerService.scanWorkspace.mockResolvedValueOnce(mockScanResult);

        await messageHandler({ type: 'startScan' });

        expect(mockScannerService.scanWorkspace).toHaveBeenCalledWith(
          expect.objectContaining({
            progressCallback: expect.any(Function)
          })
        );
      });

      it('should handle scan errors', async () => {
        mockScannerService.scanWorkspace.mockRejectedValueOnce(new Error('Scan failed'));

        await messageHandler({ type: 'startScan' });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Scan failed: Scan failed');
      });

      it('should show error when no workspace is open', async () => {
        (vscode.workspace as any).workspaceFolders = null;

        await messageHandler({ type: 'startScan' });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder is open');
      });
    });

    describe('stopScan message', () => {
      it('should stop scanning and show message', () => {
        messageHandler({ type: 'stopScan' });

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Scan stopped');
      });
    });

    describe('openFile message', () => {
      it('should open file at specified line', async () => {
        const mockDocument = {} as vscode.TextDocument;
        const mockEditor = {
          selection: null,
          revealRange: jest.fn()
        } as any;

        (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValueOnce(mockDocument);
        (vscode.window.showTextDocument as jest.Mock).mockResolvedValueOnce(mockEditor);

        await messageHandler({
          type: 'openFile',
          data: { filePath: '/test/file.js', lineNumber: 10 }
        });

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith('/test/file.js');
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
      });

      it('should handle file open errors', async () => {
        (vscode.workspace.openTextDocument as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

        await messageHandler({
          type: 'openFile',
          data: { filePath: '/test/file.js', lineNumber: 10 }
        });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to open file: /test/file.js');
      });
    });

    describe('refreshScan message', () => {
      it('should trigger a new scan', async () => {
        const mockScanResult: ScanResult = {
          endpoints: [],
          scannedFiles: 0,
          skippedFiles: 0,
          totalFiles: 0,
          scanDuration: 0,
          cacheHits: 0,
          errors: []
        };

        mockScannerService.scanWorkspace.mockResolvedValueOnce(mockScanResult);

        await messageHandler({ type: 'refreshScan' });

        expect(mockScannerService.scanWorkspace).toHaveBeenCalled();
      });
    });

    describe('filterResults message', () => {
      it('should send filter update to webview', () => {
        const filters = { language: 'javascript', confidence: 0.8 };

        messageHandler({ type: 'filterResults', data: filters });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          type: 'updateFilters',
          data: filters
        });
      });
    });
  });

  describe('public methods', () => {
    beforeEach(() => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    });

    describe('getScanResults', () => {
      it('should return current scan results', () => {
        const results = scanPanelProvider.getScanResults();
        expect(results).toEqual([]);
      });
    });

    describe('isScanning', () => {
      it('should return current scanning state', () => {
        const isScanning = scanPanelProvider.isScanning();
        expect(isScanning).toBe(false);
      });
    });

    describe('triggerScan', () => {
      it('should start scan programmatically', async () => {
        // Mock workspace folders
        (vscode.workspace as any).workspaceFolders = [
          { uri: { fsPath: '/test/workspace' } }
        ];
        
        const mockScanResult: ScanResult = {
          endpoints: [],
          scannedFiles: 0,
          skippedFiles: 0,
          totalFiles: 0,
          scanDuration: 0,
          cacheHits: 0,
          errors: []
        };

        mockScannerService.scanWorkspace.mockResolvedValueOnce(mockScanResult);

        await scanPanelProvider.triggerScan();

        expect(mockScannerService.scanWorkspace).toHaveBeenCalled();
      });
    });
  });

  describe('progress updates', () => {
    let messageHandler: (message: any) => void;
    let progressCallback: (progress: any) => void;

    beforeEach(() => {
      // Mock workspace folders
      (vscode.workspace as any).workspaceFolders = [
        { uri: { fsPath: '/test/workspace' } }
      ];
      
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
      
      const onDidReceiveMessageCall = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0];
      messageHandler = onDidReceiveMessageCall[0];

      mockScannerService.scanWorkspace.mockImplementation(async (options) => {
        progressCallback = options?.progressCallback!;
        return {
          endpoints: [],
          scannedFiles: 0,
          skippedFiles: 0,
          totalFiles: 0,
          scanDuration: 0,
          cacheHits: 0,
          errors: []
        };
      });
    });

    it('should send progress updates to webview', async () => {
      const scanPromise = messageHandler({ type: 'startScan' });

      // Simulate progress update
      progressCallback({ 
        phase: 'scanning' as const,
        filesProcessed: 5, 
        totalFiles: 10,
        currentFile: '/test/file.js',
        endpointsFound: 0
      });

      await scanPromise;

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'progressUpdate',
        data: {
          scannedFiles: 5,
          totalFiles: 10,
          progress: 50
        }
      });
    });
  });

  describe('HTML generation', () => {
    it('should generate valid HTML with security policy', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      const html = mockWebview.html;
      
      expect(html).toContain('Content-Security-Policy');
      expect(html).toContain('nonce-');
      expect(html).toContain('<div id=\"root\"></div>');
      expect(html).toContain('scanPanel.js');
      expect(html).toContain('scanPanel.css');
    });

    it('should include all required CSS files', () => {
      scanPanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

      const html = mockWebview.html;
      
      expect(html).toContain('reset.css');
      expect(html).toContain('vscode.css');
      expect(html).toContain('scanPanel.css');
    });
  });
});