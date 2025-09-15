import * as assert from 'assert';
import * as vscode from 'vscode';
import { MigrationValidationService, ValidationRequest, ValidationResult } from '../../services/MigrationValidationService';
import { ElavonSandboxClient } from '../../services/ElavonSandboxClient';
import { MappingDictionaryService, FieldMapping } from '../../services/MappingDictionaryService';

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
  extensionUri: { fsPath: '/test', scheme: 'file', authority: '', path: '/test', query: '', fragment: '' } as vscode.Uri,
  extensionPath: '/test',
  asAbsolutePath: (relativePath: string) => `/test/${relativePath}`,
  storageUri: { fsPath: '/test/storage', scheme: 'file', authority: '', path: '/test/storage', query: '', fragment: '' } as vscode.Uri,
  storagePath: '/test/storage',
  globalStorageUri: { fsPath: '/test/global', scheme: 'file', authority: '', path: '/test/global', query: '', fragment: '' } as vscode.Uri,
  globalStoragePath: '/test/global',
  logUri: { fsPath: '/test/log', scheme: 'file', authority: '', path: '/test/log', query: '', fragment: '' } as vscode.Uri,
  logPath: '/test/log',
  extensionMode: 3 as vscode.ExtensionMode, // ExtensionMode.Test
  environmentVariableCollection: {} as any,
  extension: {} as any,
  languageModelAccessInformation: {} as any
};

// Mock ElavonSandboxClient
class MockElavonSandboxClient extends ElavonSandboxClient {
  private _mockResponses: Map<string, any> = new Map();
  private _shouldThrowError: boolean = false;

  constructor() {
    super(mockContext);
  }

  setMockResponse(endpoint: string, response: any): void {
    this._mockResponses.set(endpoint, response);
  }

  setShouldThrowError(shouldThrow: boolean): void {
    this._shouldThrowError = shouldThrow;
  }

  async makeRequest(request: { method: string; endpoint: string; data?: any; headers?: Record<string, string> }): Promise<any> {
    if (this._shouldThrowError) {
      const error: any = new Error('Mock API error');
      error.response = {
        status: 400,
        data: { error: 'Invalid request' }
      };
      throw error;
    }

    const mockResponse = this._mockResponses.get(request.endpoint);
    if (mockResponse) {
      return mockResponse;
    }

    // Default successful response
    return {
      transaction_id: 'txn_12345',
      status: 'approved',
      message: 'Transaction successful'
    };
  }
}

// Mock MappingDictionaryService
class MockMappingDictionaryService extends MappingDictionaryService {
  constructor() {
    super(mockContext);
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async getFieldMapping(convergeField: string): Promise<FieldMapping | null> {
    const mappings: Record<string, FieldMapping> = {
      'ssl_amount': {
        convergeField: 'ssl_amount',
        elavonField: 'amount',
        dataType: 'string',
        required: true,
        notes: 'Transaction amount'
      },
      'ssl_card_number': {
        convergeField: 'ssl_card_number',
        elavonField: 'card_number',
        dataType: 'string',
        required: true,
        notes: 'Card number'
      },
      'ssl_exp_date': {
        convergeField: 'ssl_exp_date',
        elavonField: 'expiry_date',
        dataType: 'string',
        required: true,
        notes: 'Expiry date'
      }
    };
    return mappings[convergeField] || null;
  }
}

describe('MigrationValidationService Tests', () => {
  let validationService: MigrationValidationService;
  let mockElavonClient: MockElavonSandboxClient;
  let mockMappingService: MockMappingDictionaryService;

  beforeEach(() => {
    mockElavonClient = new MockElavonSandboxClient();
    mockMappingService = new MockMappingDictionaryService();
    validationService = new MigrationValidationService(
      mockContext,
      mockElavonClient,
      mockMappingService
    );
  });

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      const request: ValidationRequest = {
        id: 'test-1',
        originalCode: 'ssl_amount=10.00&ssl_card_number=4111111111111111',
        migratedCode: 'fetch("/v1/payments", { method: "POST", body: JSON.stringify({ amount: 10.00, card_number: "4111111111111111" }) })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      mockElavonClient.setMockResponse('/v1/payments', {
        transaction_id: 'txn_12345',
        status: 'approved',
        amount: 10.00
      });

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 'passed');
      assert.strictEqual(result.id, 'test-1');
      assert.strictEqual(result.details.errors.length, 0);
      assert.ok(result.duration > 0);
    });

    it('should handle API errors', async () => {
      const request: ValidationRequest = {
        id: 'test-2',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'fetch("/v1/payments", { method: "POST" })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      mockElavonClient.setShouldThrowError(true);

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, 'failed');
      assert.ok(result.details.errors.length > 0);
      assert.strictEqual(result.details.errors[0].type, 'response');
    });

    it('should handle invalid migrated code', async () => {
      const request: ValidationRequest = {
        id: 'test-3',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'invalid code here',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, false);
      assert.ok(result.details.errors.some(e => e.type === 'parsing'));
    });

    it('should validate response structure', async () => {
      const request: ValidationRequest = {
        id: 'test-4',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'fetch("/v1/payments", { method: "POST", body: JSON.stringify({ amount: 10.00 }) })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      // Mock response missing required fields
      mockElavonClient.setMockResponse('/v1/payments', {
        message: 'Success'
        // Missing transaction_id and status
      });

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, false);
      assert.ok(result.details.errors.some(e => e.code === 'MISSING_TRANSACTION_ID'));
      assert.ok(result.details.errors.some(e => e.code === 'MISSING_STATUS'));
    });

    it('should include request and response details', async () => {
      const request: ValidationRequest = {
        id: 'test-5',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'fetch("/v1/payments", { method: "POST", headers: { "Authorization": "Bearer token" }, body: JSON.stringify({ amount: 10.00 }) })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      const result = await validationService.validateMigration(request);

      assert.ok(result.details.request);
      assert.strictEqual(result.details.request.method, 'POST');
      assert.ok(result.details.request.headers);
      assert.ok(result.details.response);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple requests', async () => {
      const requests: ValidationRequest[] = [
        {
          id: 'batch-1',
          originalCode: 'ssl_amount=10.00',
          migratedCode: 'fetch("/v1/payments", { method: "POST", body: JSON.stringify({ amount: 10.00 }) })',
          language: 'javascript',
          endpoint: '/v1/payments'
        },
        {
          id: 'batch-2',
          originalCode: 'ssl_amount=20.00',
          migratedCode: 'fetch("/v1/payments", { method: "POST", body: JSON.stringify({ amount: 20.00 }) })',
          language: 'javascript',
          endpoint: '/v1/payments'
        }
      ];

      const results = await validationService.validateBatch(requests);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].id, 'batch-1');
      assert.strictEqual(results[1].id, 'batch-2');
    });

    it('should handle errors in batch validation', async () => {
      const requests: ValidationRequest[] = [
        {
          id: 'batch-error-1',
          originalCode: 'ssl_amount=10.00',
          migratedCode: 'invalid code',
          language: 'javascript',
          endpoint: '/v1/payments'
        }
      ];

      const results = await validationService.validateBatch(requests);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].success, false);
    });
  });

  describe('generateTestData', () => {
    it('should generate test data for payments endpoint', () => {
      const testData = validationService.generateTestData('/v1/payments', 'javascript');

      assert.ok(testData.amount);
      assert.ok(testData.currency);
      assert.ok(testData.card_number);
      assert.ok(testData.description);
      assert.ok(testData.reference);
    });

    it('should generate test data for auth endpoint', () => {
      const testData = validationService.generateTestData('/v1/auth', 'javascript');

      assert.strictEqual(testData.grant_type, 'client_credentials');
      assert.strictEqual(testData.scope, 'payments');
    });

    it('should generate test data for refunds endpoint', () => {
      const testData = validationService.generateTestData('/v1/refunds', 'javascript');

      assert.ok(testData.amount);
      assert.ok(testData.original_transaction_id);
      assert.ok(testData.reason);
    });
  });

  describe('analyzeCode', () => {
    it('should analyze JavaScript fetch code', () => {
      const code = 'fetch("/v1/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 10.00 }) })';
      
      const apiCall = validationService.analyzeCode(code, 'javascript');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
      assert.ok(apiCall.headers);
    });

    it('should analyze axios code', () => {
      const code = 'axios.post("/v1/payments", { amount: 10.00 })';
      
      const apiCall = validationService.analyzeCode(code, 'javascript');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
    });

    it('should analyze Python requests code', () => {
      const code = 'requests.post("/v1/payments", json={"amount": 10.00})';
      
      const apiCall = validationService.analyzeCode(code, 'python');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
    });

    it('should return null for invalid code', () => {
      const code = 'invalid code here';
      
      const apiCall = validationService.analyzeCode(code, 'javascript');

      assert.strictEqual(apiCall, null);
    });

    it('should return null for unsupported language', () => {
      const code = 'some code';
      
      const apiCall = validationService.analyzeCode(code, 'unsupported');

      assert.strictEqual(apiCall, null);
    });
  });

  describe('getValidationStatistics', () => {
    it('should calculate statistics correctly', () => {
      const results: ValidationResult[] = [
        {
          id: 'stat-1',
          success: true,
          status: 'passed',
          message: 'Success',
          details: {
            errors: [],
            warnings: [],
            metrics: { responseTime: 100, requestSize: 0, responseSize: 0, retryCount: 0 }
          },
          timestamp: '2024-01-01T00:00:00Z',
          duration: 100
        },
        {
          id: 'stat-2',
          success: false,
          status: 'failed',
          message: 'Failed',
          details: {
            errors: [{ type: 'validation', code: 'ERROR', message: 'Error' }],
            warnings: [],
            metrics: { responseTime: 200, requestSize: 0, responseSize: 0, retryCount: 0 }
          },
          timestamp: '2024-01-01T00:00:00Z',
          duration: 200
        },
        {
          id: 'stat-3',
          success: false,
          status: 'error',
          message: 'Error',
          details: {
            errors: [{ type: 'validation', code: 'ERROR', message: 'Error' }],
            warnings: [],
            metrics: { responseTime: 50, requestSize: 0, responseSize: 0, retryCount: 0 }
          },
          timestamp: '2024-01-01T00:00:00Z',
          duration: 50
        }
      ];

      const stats = validationService.getValidationStatistics(results);

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.passed, 1);
      assert.strictEqual(stats.failed, 1);
      assert.strictEqual(stats.errors, 1);
      assert.strictEqual(stats.skipped, 0);
      assert.strictEqual(stats.averageResponseTime, (100 + 200 + 50) / 3);
      assert.strictEqual(stats.successRate, (1 / 3) * 100);
    });

    it('should handle empty results', () => {
      const results: ValidationResult[] = [];

      const stats = validationService.getValidationStatistics(results);

      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.passed, 0);
      assert.strictEqual(stats.failed, 0);
      assert.strictEqual(stats.errors, 0);
      assert.strictEqual(stats.skipped, 0);
      assert.strictEqual(stats.averageResponseTime, 0);
      assert.strictEqual(stats.successRate, 0);
    });
  });

  describe('Code Analysis Edge Cases', () => {
    it('should handle complex JavaScript fetch with nested objects', () => {
      const code = `
        fetch("/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer token123"
          },
          body: JSON.stringify({
            amount: 25.50,
            currency: "USD",
            card: {
              number: "4111111111111111",
              expiry: "12/25"
            }
          })
        })
      `;
      
      const apiCall = validationService.analyzeCode(code, 'javascript');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
      assert.ok(apiCall.headers['Content-Type']);
      assert.ok(apiCall.headers['Authorization']);
    });

    it('should handle Java HttpPost code', () => {
      const code = 'HttpPost httpPost = new HttpPost("/v1/payments");';
      
      const apiCall = validationService.analyzeCode(code, 'java');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
    });

    it('should handle C# HttpClient code', () => {
      const code = 'httpClient.PostAsync("/v1/payments", content);';
      
      const apiCall = validationService.analyzeCode(code, 'csharp');

      assert.ok(apiCall);
      assert.strictEqual(apiCall.endpoint, '/v1/payments');
      assert.strictEqual(apiCall.method, 'POST');
    });
  });

  describe('Response Validation Edge Cases', () => {
    it('should detect Elavon-specific error patterns', async () => {
      const request: ValidationRequest = {
        id: 'error-test',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'fetch("/v1/payments", { method: "POST", body: JSON.stringify({ amount: 10.00 }) })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      mockElavonClient.setMockResponse('/v1/payments', {
        error: 'Invalid card number',
        message: 'Invalid card number format'
      });

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, false);
      assert.ok(result.details.errors.some(e => e.code === 'API_ERROR'));
      assert.ok(result.details.errors.some(e => e.code === 'INVALID_DATA'));
    });

    it('should validate auth endpoint response structure', async () => {
      const request: ValidationRequest = {
        id: 'auth-test',
        originalCode: 'grant_type=client_credentials',
        migratedCode: 'fetch("/v1/auth", { method: "POST", body: JSON.stringify({ grant_type: "client_credentials" }) })',
        language: 'javascript',
        endpoint: '/v1/auth'
      };

      mockElavonClient.setMockResponse('/v1/auth', {
        token_type: 'Bearer',
        expires_in: 3600
        // Missing access_token
      });

      const result = await validationService.validateMigration(request);

      assert.strictEqual(result.success, false);
      assert.ok(result.details.errors.some(e => e.code === 'MISSING_ACCESS_TOKEN'));
    });

    it('should provide helpful error suggestions', async () => {
      const request: ValidationRequest = {
        id: 'suggestion-test',
        originalCode: 'ssl_amount=10.00',
        migratedCode: 'fetch("/v1/payments", { method: "POST" })',
        language: 'javascript',
        endpoint: '/v1/payments'
      };

      const error: any = new Error('Mock 401 error');
      error.response = {
        status: 401,
        data: { error: 'Unauthorized' }
      };
      mockElavonClient.setShouldThrowError(true);

      const result = await validationService.validateMigration(request);

      const authError = result.details.errors.find(e => e.code === 'HTTP_401');
      assert.ok(authError);
      assert.ok(authError.suggestion);
      assert.ok(authError.suggestion.includes('credentials'));
    });
  });
});
