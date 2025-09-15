import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContextMenuService, ContextMenuAction, EndpointContext, DetectedEndpoint } from '../../services/ContextMenuService';
import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';
import { WorkspaceScannerService, ScanResult } from '../../services/WorkspaceScannerService';

// Mock VS Code API
jest.mock('vscode', () => ({
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path, path }))
  },
  EndOfLine: {
    LF: 1
  },
  Position: jest.fn()
}));

// Mock VS Code extension context
const mockContext: vscode.ExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: () => undefined,
    update: () => Promise.resolve(),
    keys: () => []
  },
  globalState: {
    get: () => undefined,
    update: () => Promise.resolve(),
    setKeysForSync: () => {},
    keys: () => []
  },
  secrets: {
    get: () => Promise.resolve(undefined),
    store: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    onDidChange: (() => {
      const emitter = {
        event: () => ({ dispose: () => {} })
      };
      return emitter.event;
    })()
  },
  extensionUri: vscode.Uri.file('/test'),
  extensionPath: '/test',
  asAbsolutePath: (relativePath: string) => `/test/${relativePath}`,
  storageUri: vscode.Uri.file('/test/storage'),
  storagePath: '/test/storage',
  globalStorageUri: vscode.Uri.file('/test/global'),
  globalStoragePath: '/test/global',
  logUri: vscode.Uri.file('/test/log'),
  logPath: '/test/log',
  extensionMode: 3 as vscode.ExtensionMode, // ExtensionMode.Test
  environmentVariableCollection: {} as any,
  extension: {} as any,
  languageModelAccessInformation: {} as any
};

// Mock PatternMatchingService
class MockPatternMatchingService extends PatternMatchingService {
  private _mockEndpointMatches: Array<{ type: ConvergeEndpointType; matches: RegExpMatchArray[] }> = [];
  private _mockSslFields: Array<{ field: string; line: number; match: RegExpMatchArray }> = [];

  constructor() {
    super();
  }

  setMockEndpointMatches(matches: Array<{ type: ConvergeEndpointType; matches: RegExpMatchArray[] }>): void {
    this._mockEndpointMatches = matches;
  }

  setMockSslFields(fields: Array<{ field: string; line: number; match: RegExpMatchArray }>): void {
    this._mockSslFields = fields;
  }

  matchEndpoints(code: string): Array<{ type: ConvergeEndpointType; matches: RegExpMatchArray[]; confidence: number }> {
    return this._mockEndpointMatches.map(match => ({ ...match, confidence: 0.8 }));
  }

  extractSSLFields(code: string, language?: string): Array<{ field: string; line: number; context: string; confidence: number }> {
    return this._mockSslFields.map(field => ({ 
      field: field.field, 
      line: field.line, 
      context: `Context for ${field.field}`,
      confidence: 0.8
    }));
  }

  setMockEndpoints(endpoints: Array<DetectedEndpoint>) {
    // Convert DetectedEndpoint to the expected format
    this._mockEndpointMatches = endpoints.map(endpoint => ({
      type: endpoint.type,
      matches: [Object.assign([endpoint.endpoint], {
        0: endpoint.endpoint,
        index: 0,
        input: endpoint.context,
        groups: {} as { [key: string]: string }
      }) as RegExpMatchArray]
    }));
  }

  findEndpoints: any;
}

// Mock WorkspaceScannerService
class MockWorkspaceScannerService extends WorkspaceScannerService {
  constructor() {
    super({} as any);
  }

  async scanWorkspace(): Promise<ScanResult> {
    return {
      endpoints: [],
      scannedFiles: 0,
      skippedFiles: 0,
      totalFiles: 0,
      scanDuration: 0,
      cacheHits: 0,
      errors: []
    };
  }
}

// Mock TextDocument
class MockTextDocument implements vscode.TextDocument {
  uri: vscode.Uri;
  fileName: string;
  isUntitled: boolean = false;
  languageId: string;
  version: number = 1;
  isDirty: boolean = false;
  isClosed: boolean = false;
  eol: vscode.EndOfLine = vscode.EndOfLine.LF;
  lineCount: number;
  encoding: string = 'utf8';
  private _lines: string[];

  constructor(uri: string, languageId: string, lines: string[]) {
    this.uri = vscode.Uri.file(uri);
    this.fileName = uri;
    this.languageId = languageId;
    this._lines = lines;
    this.lineCount = lines.length;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  lineAt(line: number | vscode.Position): vscode.TextLine {
    const lineNumber = typeof line === 'number' ? line : line.line;
    const text = this._lines[lineNumber] || '';
    
    return {
      lineNumber,
      text,
      range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0
    };
  }

  offsetAt(position: vscode.Position): number {
    let offset = 0;
    for (let i = 0; i < position.line; i++) {
      offset += this._lines[i].length + 1; // +1 for line break
    }
    return offset + position.character;
  }

  positionAt(offset: number): vscode.Position {
    let currentOffset = 0;
    for (let line = 0; line < this._lines.length; line++) {
      const lineLength = this._lines[line].length + 1; // +1 for line break
      if (currentOffset + lineLength > offset) {
        return new vscode.Position(line, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new vscode.Position(this._lines.length - 1, this._lines[this._lines.length - 1].length);
  }

  getText(range?: vscode.Range): string {
    if (!range) {
      return this._lines.join('\n');
    }
    
    if (range.start.line === range.end.line) {
      return this._lines[range.start.line].substring(range.start.character, range.end.character);
    }
    
    let result = this._lines[range.start.line].substring(range.start.character);
    for (let i = range.start.line + 1; i < range.end.line; i++) {
      result += '\n' + this._lines[i];
    }
    result += '\n' + this._lines[range.end.line].substring(0, range.end.character);
    return result;
  }

  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined {
    const line = this._lines[position.line];
    const wordRegex = regex || /\w+/g;
    let match;
    
    while ((match = wordRegex.exec(line)) !== null) {
      if (match.index <= position.character && match.index + match[0].length >= position.character) {
        return new vscode.Range(position.line, match.index, position.line, match.index + match[0].length);
      }
    }
    
    return undefined;
  }

  validateRange(range: vscode.Range): vscode.Range {
    return range;
  }

  validatePosition(position: vscode.Position): vscode.Position {
    return position;
  }
}

describe('ContextMenuService Tests', () => {
  let contextMenuService: ContextMenuService;
  let mockPatternService: MockPatternMatchingService;
  let mockScannerService: MockWorkspaceScannerService;

  beforeEach(() => {
    mockPatternService = new MockPatternMatchingService();
    mockScannerService = new MockWorkspaceScannerService();
    contextMenuService = new ContextMenuService(
      mockContext,
      mockPatternService,
      mockScannerService
    );
  });

  afterEach(() => {
    contextMenuService.dispose();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await contextMenuService.initialize();
      // No assertion needed - if it doesn't throw, it's successful
    });
  });

  describe('getContextMenuActions', () => {
    it('should return empty array when no endpoints detected', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'console.log("hello world");'
      ]);
      const position = new vscode.Position(0, 0);

      mockPatternService.setMockEndpointMatches([]);
      mockPatternService.setMockSslFields([]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.strictEqual(actions.length, 0);
    });

    it('should return actions when Converge endpoint detected', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00&ssl_card_number=4111111111111111'
      ]);
      const position = new vscode.Position(0, 0);

      const mockMatch: RegExpMatchArray = Object.assign(['ssl_amount=10.00'], { 
        0: 'ssl_amount=10.00',
        index: 0, 
        input: 'ssl_amount=10.00&ssl_card_number=4111111111111111', 
        groups: {} as { [key: string]: string }
      }) as RegExpMatchArray;
      
      mockPatternService.setMockEndpointMatches([]);
      mockPatternService.setMockSslFields([
        { field: 'ssl_amount', line: 0, match: mockMatch },
        { field: 'ssl_card_number', line: 0, match: mockMatch }
      ]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.length > 0);
      assert.ok(actions.some(a => a.id === 'migrate-to-elavon'));
      assert.ok(actions.some(a => a.id === 'show-documentation'));
    });

    it('should return payment-specific actions for payment endpoints', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_transaction_type=sale&ssl_amount=10.00'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 40,
        context: 'ssl_transaction_type=sale&ssl_amount=10.00'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.some(a => a.id === 'migrate-payment'));
      assert.ok(actions.some(a => a.title === 'Migrate Payment Endpoint'));
    });

    it('should return auth-specific actions for auth endpoints', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_merchant_id=test&ssl_user_id=user&ssl_pin=pin'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.HOSTED_PAYMENTS,
        endpoint: '/auth',
        confidence: 0.8,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 45,
        context: 'ssl_merchant_id=test&ssl_user_id=user&ssl_pin=pin'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.some(a => a.id === 'migrate-auth'));
      assert.ok(actions.some(a => a.title === 'Migrate Authentication'));
    });

    it('should return refund-specific actions for refund endpoints', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_transaction_type=refund&ssl_txn_id=12345'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.BATCH_PROCESSING,
        endpoint: '/refund',
        confidence: 0.85,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 40,
        context: 'ssl_transaction_type=refund&ssl_txn_id=12345'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.some(a => a.id === 'migrate-refund'));
      assert.ok(actions.some(a => a.title === 'Migrate Refund Endpoint'));
    });

    it('should include validation actions for high confidence endpoints', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 15,
        context: 'ssl_amount=10.00'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.some(a => a.id === 'validate-endpoint'));
      assert.ok(actions.some(a => a.id === 'scan-file'));
    });

    it('should not include migration actions for low confidence endpoints', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.3, // Low confidence
        lineNumber: 1,
        startColumn: 0,
        endColumn: 15,
        context: 'ssl_amount=10.00'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      // Should not have migration actions due to low confidence
      assert.ok(!actions.some(a => a.id === 'migrate-to-elavon'));
      // But should still have documentation actions
      assert.ok(actions.some(a => a.id === 'show-documentation'));
    });
  });

  describe('provider registration', () => {
    it('should register and unregister providers', () => {
      const mockProvider = {
        canHandle: () => true,
        getActions: () => []
      };

      contextMenuService.registerProvider('test', mockProvider);
      // No direct way to test registration, but unregistering should not throw
      contextMenuService.unregisterProvider('test');
    });
  });

  describe('SSL field extraction', () => {
    it('should extract SSL fields from line text', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'const data = { ssl_amount: 10.00, ssl_card_number: "4111111111111111", ssl_exp_date: "1225" };'
      ]);
      const position = new vscode.Position(0, 20);

      // Mock an endpoint to trigger the mapping action
      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 80,
        context: 'const data = { ssl_amount: 10.00, ssl_card_number: "4111111111111111", ssl_exp_date: "1225" };'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      // Should include show mapping action
      assert.ok(actions.some(a => a.id === 'show-mapping'));
    });
  });

  describe('language detection', () => {
    it('should detect JavaScript language', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 15,
        context: 'ssl_amount=10.00'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.length > 0);
    });

    it('should detect PHP language', async () => {
      const document = new MockTextDocument('/test/file.php', 'php', [
        '$ssl_amount = 10.00;'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 20,
        context: '$ssl_amount = 10.00;'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.length > 0);
    });

    it('should detect Python language', async () => {
      const document = new MockTextDocument('/test/file.py', 'python', [
        'ssl_amount = 10.00'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 18,
        context: 'ssl_amount = 10.00'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      assert.ok(actions.length > 0);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully when pattern service fails', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00'
      ]);
      const position = new vscode.Position(0, 0);

      // Mock pattern service to throw error
      mockPatternService.findEndpoints = () => {
        throw new Error('Pattern service error');
      };

      const actions = await contextMenuService.getContextMenuActions(document, position);

      // Should return empty array instead of throwing
      assert.strictEqual(actions.length, 0);
    });

    it('should handle invalid document positions', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00'
      ]);
      const position = new vscode.Position(10, 0); // Invalid line number

      const actions = await contextMenuService.getContextMenuActions(document, position);

      // Should handle gracefully
      assert.strictEqual(actions.length, 0);
    });
  });

  describe('field mapping', () => {
    it('should provide correct Elavon mappings for common SSL fields', async () => {
      const document = new MockTextDocument('/test/file.js', 'javascript', [
        'ssl_amount=10.00&ssl_card_number=4111111111111111&ssl_exp_date=1225'
      ]);
      const position = new vscode.Position(0, 0);

      const mockEndpoint: DetectedEndpoint = {
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        endpoint: '/VirtualMerchant/process.do',
        confidence: 0.9,
        lineNumber: 1,
        startColumn: 0,
        endColumn: 60,
        context: 'ssl_amount=10.00&ssl_card_number=4111111111111111&ssl_exp_date=1225'
      };

      mockPatternService.setMockEndpoints([mockEndpoint]);

      const actions = await contextMenuService.getContextMenuActions(document, position);

      // Should include mapping action
      assert.ok(actions.some(a => a.id === 'show-mapping'));
    });
  });
});
