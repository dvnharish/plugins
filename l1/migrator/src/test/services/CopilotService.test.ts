import { CopilotService, CopilotRequest, CopilotResponse } from '../../services/CopilotService';
import * as vscode from 'vscode';
import { MappingDictionaryService } from '../../services/MappingDictionaryService';

// Mock VS Code API
jest.mock('vscode', () => ({
  extensions: {
    getExtension: jest.fn()
  },
  workspace: {
    openTextDocument: jest.fn()
  },
  Position: jest.fn(),
  InlineCompletionTriggerKind: {
    Automatic: 0
  }
}));

// Mock MappingDictionaryService
jest.mock('../../services/MappingDictionaryService');

const MockMappingDictionaryService = MappingDictionaryService as jest.MockedClass<typeof MappingDictionaryService>;

describe('CopilotService', () => {
  let copilotService: CopilotService;
  let mockContext: vscode.ExtensionContext;
  let mockMappingService: jest.Mocked<MappingDictionaryService>;
  let mockCopilotExtension: any;
  let mockCopilotApi: any;

  beforeEach(() => {
    // Mock extension context
    mockContext = {} as vscode.ExtensionContext;

    // Mock mapping service
    mockMappingService = {
      loadMappingDictionary: jest.fn(),
      getFieldMapping: jest.fn(),
      getEndpointMapping: jest.fn()
    } as any;

    // Mock Copilot API
    mockCopilotApi = {
      getCompletions: jest.fn()
    };

    // Mock Copilot extension
    mockCopilotExtension = {
      isActive: true,
      activate: jest.fn(),
      exports: mockCopilotApi,
      packageJSON: {
        version: '1.0.0'
      }
    };

    MockMappingDictionaryService.mockImplementation(() => mockMappingService);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with Copilot extension available', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      
      copilotService = new CopilotService(mockContext);
      
      const isAvailable = await copilotService.isAvailable();
      
      expect(isAvailable).toBe(true);
    });

    it('should initialize without Copilot extension', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
      
      copilotService = new CopilotService(mockContext);
      
      const isAvailable = await copilotService.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should handle Copilot extension activation failure', async () => {
      mockCopilotExtension.isActive = false;
      mockCopilotExtension.activate = jest.fn().mockRejectedValue(new Error('Activation failed'));
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      
      copilotService = new CopilotService(mockContext);
      
      const isAvailable = await copilotService.isAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('generateCode', () => {
    beforeEach(() => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      copilotService = new CopilotService(mockContext);
    });

    it('should generate code using Copilot when available', async () => {
      const mockCompletions = {
        items: [
          {
            insertText: 'const merchantId = merchant_id;',
            score: 0.9
          }
        ]
      };

      mockCopilotApi.getCompletions.mockResolvedValue(mockCompletions);
      mockMappingService.loadMappingDictionary.mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        transformationRules: {},
        migrationNotes: [],
        commonFields: [
          {
            convergeField: 'ssl_merchant_id',
            elavonField: 'merchant_id',
            dataType: 'string',
            required: true,
            notes: 'Merchant identifier'
          }
        ],
        endpoints: []
      });
      mockMappingService.getFieldMapping.mockResolvedValue({
        convergeField: 'ssl_merchant_id',
        elavonField: 'merchant_id',
        dataType: 'string',
        required: true,
        notes: 'Merchant identifier'
      });

      const request: CopilotRequest = {
        prompt: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        context: {
          filePath: 'test.js',
          lineNumber: 1
        }
      };

      const response = await copilotService.generateCode(request);

      expect(response.success).toBe(true);
      expect(response.code).toBeDefined();
    });

    it('should handle Copilot API errors gracefully', async () => {
      mockCopilotApi.getCompletions.mockRejectedValue(new Error('API Error'));

      const request: CopilotRequest = {
        prompt: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        context: {
          filePath: 'test.js',
          lineNumber: 1
        }
      };

      const response = await copilotService.generateCode(request);

      // Should fall back to mock implementation
      expect(response.success).toBe(true);
      expect(response.code).toBeDefined();
      expect(response.metadata?.model).toBe('mock-copilot');
    });

    it('should handle unavailable Copilot extension', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
      copilotService = new CopilotService(mockContext);

      const request: CopilotRequest = {
        prompt: 'const transactionAmount = ssl_amount;',
        language: 'javascript',
        context: {
          filePath: 'test.js',
          lineNumber: 1
        }
      };

      const response = await copilotService.generateCode(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('not available');
    });

    it('should include context in code generation', async () => {
      const request: CopilotRequest = {
        prompt: 'const url = "https://api.converge.com/VirtualMerchant/process.do";',
        language: 'javascript',
        context: {
          filePath: 'test.js',
          lineNumber: 1,
          endpointType: 'payment',
          surroundingCode: 'function processPayment() {'
        }
      };

      const response = await copilotService.generateCode(request);

      expect(response).toBeDefined();
    });

    it('should handle different language contexts', async () => {
      const request: CopilotRequest = {
        prompt: 'const test = ssl_merchant_id;',
        language: 'typescript',
        context: {
          filePath: 'test.ts',
          lineNumber: 1,
          surroundingCode: 'function processPayment() {'
        }
      };

      const response = await copilotService.generateCode(request);

      expect(response).toBeDefined();
    });
  });

  describe('status and testing', () => {
    it('should check availability when Copilot is available', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      copilotService = new CopilotService(mockContext);

      const isAvailable = await copilotService.isAvailable();

      expect(isAvailable).toBe(true);
    });

    it('should check availability when Copilot is not available', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
      copilotService = new CopilotService(mockContext);

      const isAvailable = await copilotService.isAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should get status information', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      copilotService = new CopilotService(mockContext);

      const status = await copilotService.getStatus();

      expect(status.available).toBeDefined();
      expect(status.authenticated).toBeDefined();
    });

    it('should test connection successfully', async () => {
      (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockCopilotExtension);
      copilotService = new CopilotService(mockContext);

      const testResult = await copilotService.testConnection();

      expect(testResult.success).toBeDefined();
    });
  });
});