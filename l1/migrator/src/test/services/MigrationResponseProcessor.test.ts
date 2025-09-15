import { MigrationResponseProcessor } from '../../services/MigrationResponseProcessor';
import { CopilotResponse } from '../../services/CopilotService';
import { MappingDictionaryService } from '../../services/MappingDictionaryService';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode', () => ({}));

// Mock MappingDictionaryService
jest.mock('../../services/MappingDictionaryService');

const MockMappingDictionaryService = MappingDictionaryService as jest.MockedClass<typeof MappingDictionaryService>;

describe('MigrationResponseProcessor', () => {
  let processor: MigrationResponseProcessor;
  let mockContext: vscode.ExtensionContext;
  let mockMappingService: jest.Mocked<MappingDictionaryService>;

  beforeEach(() => {
    mockContext = {} as vscode.ExtensionContext;
    
    mockMappingService = {
      loadMappingDictionary: jest.fn()
    } as any;

    MockMappingDictionaryService.mockImplementation(() => mockMappingService);

    processor = new MigrationResponseProcessor(mockContext);

    // Setup default mock responses
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
        },
        {
          convergeField: 'ssl_amount',
          elavonField: 'amount',
          dataType: 'string',
          required: true,
          notes: 'Transaction amount'
        }
      ],
      endpoints: []
    });
  });

  describe('processMigrationResponse', () => {
    it('should process successful JavaScript migration', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id; const transactionAmount = amount;',
        confidence: 0.9
      };

      const originalCode = 'const merchantId = ssl_merchant_id; const transactionAmount = ssl_amount;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.migratedCode).toBe('const merchantId = merchant_id; const transactionAmount = amount;');
      expect(result.language).toBe('javascript');
      expect(result.validation.syntaxValid).toBe(true);
      expect(result.validation.mappingsApplied).toHaveLength(2);
      expect(result.metadata.confidence).toBeGreaterThan(0);
    });

    it('should extract code from markdown blocks', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: '```javascript\nconst merchantId = merchant_id;\n```',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.migratedCode).toBe('const merchantId = merchant_id;');
    });

    it('should remove common prefixes from Copilot responses', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'Here is the migrated code:\nconst merchantId = merchant_id;',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.migratedCode).toBe('const merchantId = merchant_id;');
    });

    it('should handle failed Copilot response', async () => {
      const copilotResponse: CopilotResponse = {
        success: false,
        error: 'Copilot API error'
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No valid migrated code found in Copilot response');
      expect(result.metadata.reviewRequired).toBe(true);
    });

    it('should detect syntax errors in JavaScript', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id\nconst amount = amount', // Missing semicolons
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.warnings.length).toBeGreaterThan(0);
    });

    it('should detect security issues', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const password = "hardcoded123"; const merchantId = merchant_id;',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.securityIssues.length).toBeGreaterThan(0);
      expect(result.metadata.reviewRequired).toBe(true);
    });

    it('should process PHP code correctly', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: '<?php\necho "Hello World";',
        confidence: 0.8
      };

      const originalCode = '<?php\necho "Hello World";';
      const language = 'php';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.language).toBe('php');
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('should detect PHP syntax errors', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'merchant_id = "test";', // Missing $ prefix
        confidence: 0.8
      };

      const originalCode = '$ssl_merchant_id = "test";';
      const language = 'php';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(false);
    });

    it('should process Python code correctly', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'merchant_id = merchant_id\namount = amount',
        confidence: 0.8
      };

      const originalCode = 'ssl_merchant_id = ssl_merchant_id\nssl_amount = ssl_amount';
      const language = 'python';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.language).toBe('python');
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('should detect Python indentation issues', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'if True:\nprint("test")', // Missing indentation
        confidence: 0.8
      };

      const originalCode = 'ssl_merchant_id = "test"';
      const language = 'python';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(false);
    });

    it('should process Java code correctly', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'String merchantId = merchantId; String amount = amount;',
        confidence: 0.8
      };

      const originalCode = 'String sslMerchantId = sslMerchantId; String sslAmount = sslAmount;';
      const language = 'java';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.language).toBe('java');
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('should process C# code correctly', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'string merchantId = merchantId; string amount = amount;',
        confidence: 0.8
      };

      const originalCode = 'string sslMerchantId = sslMerchantId; string sslAmount = sslAmount;';
      const language = 'csharp';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.language).toBe('csharp');
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('should handle generic language syntax validation', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'merchant_id = merchant_id; amount = amount;',
        confidence: 0.8
      };

      const originalCode = 'ssl_merchant_id = ssl_merchant_id; ssl_amount = ssl_amount;';
      const language = 'go';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.language).toBe('go');
      expect(result.validation.syntaxValid).toBe(true);
    });

    it('should detect unmatched brackets', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'function test() { console.log("test");', // Missing closing bracket
        confidence: 0.8
      };

      const originalCode = 'ssl_merchant_id = "test"';
      const language = 'go'; // Use generic validation

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.syntaxValid).toBe(false);
    });

    it('should detect missing mappings', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id; const amount = ssl_amount;', // ssl_amount not migrated
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id; const amount = ssl_amount;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.missingMappings).toContain('ssl_amount');
    });

    it('should calculate complexity correctly', async () => {
      const simpleCode = 'const merchantId = merchant_id;';
      const complexCode = `
        function processPayment() {
          if (condition) {
            for (let i = 0; i < 10; i++) {
              try {
                // Complex logic
              } catch (error) {
                // Error handling
              }
            }
          }
        }
      `;

      const simpleCopilotResponse: CopilotResponse = {
        success: true,
        code: simpleCode,
        confidence: 0.8
      };

      const complexCopilotResponse: CopilotResponse = {
        success: true,
        code: complexCode,
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const simpleResult = await processor.processMigrationResponse(simpleCopilotResponse, originalCode, language);
      const complexResult = await processor.processMigrationResponse(complexCopilotResponse, originalCode, language);

      expect(simpleResult.metadata.complexity).toBe('low');
      expect(complexResult.metadata.complexity).toBe('medium');
    });

    it('should detect field changes', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id; const amount = amount;',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id; const amount = ssl_amount;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.changes.fieldChanges.length).toBeGreaterThan(0);
    });

    it('should detect endpoint changes', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const url = "https://api.elavon.com/v1/payments";',
        confidence: 0.8
      };

      const originalCode = 'const url = "https://api.converge.com/VirtualMerchant/process.do";';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.changes.endpointChanges.length).toBeGreaterThan(0);
    });

    it('should handle mapping service errors gracefully', async () => {
      mockMappingService.loadMappingDictionary.mockRejectedValue(new Error('Mapping error'));

      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id;',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.validation.mappingsApplied).toHaveLength(0);
      expect(result.validation.missingMappings).toHaveLength(0);
    });

    it('should require review for low confidence', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id;',
        confidence: 0.3 // Low confidence
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.metadata.reviewRequired).toBe(true);
    });

    it('should calculate processing time', async () => {
      const copilotResponse: CopilotResponse = {
        success: true,
        code: 'const merchantId = merchant_id;',
        confidence: 0.8
      };

      const originalCode = 'const merchantId = ssl_merchant_id;';
      const language = 'javascript';

      const result = await processor.processMigrationResponse(copilotResponse, originalCode, language);

      expect(result.success).toBe(true);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateProcessedResponse', () => {
    it('should validate successful response', () => {
      const response = {
        success: true,
        migratedCode: 'const merchantId = merchant_id;',
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: true,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: 85,
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: 0.8,
          complexity: 'low' as const,
          reviewRequired: false
        }
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should reject failed response without error message', () => {
      const response = {
        success: false,
        migratedCode: '',
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: false,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: 0,
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: 0,
          complexity: 'low' as const,
          reviewRequired: true
        }
        // Missing error property
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Failed response must include error message');
    });

    it('should reject successful response without migrated code', () => {
      const response = {
        success: true,
        migratedCode: '', // Empty migrated code
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: true,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: 85,
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: 0.8,
          complexity: 'low' as const,
          reviewRequired: false
        }
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Successful response must include migrated code');
    });

    it('should reject invalid confidence values', () => {
      const response = {
        success: true,
        migratedCode: 'const merchantId = merchant_id;',
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: true,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: 85,
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: 1.5, // Invalid confidence > 1
          complexity: 'low' as const,
          reviewRequired: false
        }
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Confidence must be between 0 and 1');
    });

    it('should reject invalid code quality scores', () => {
      const response = {
        success: true,
        migratedCode: 'const merchantId = merchant_id;',
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: true,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: 150, // Invalid score > 100
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: 0.8,
          complexity: 'low' as const,
          reviewRequired: false
        }
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Code quality score must be between 0 and 100');
    });

    it('should collect multiple validation issues', () => {
      const response = {
        success: false,
        migratedCode: '', // Missing migrated code for failed response is OK
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        validation: {
          syntaxValid: false,
          mappingsApplied: [],
          missingMappings: [],
          codeQualityScore: -10, // Invalid score
          securityIssues: [],
          warnings: []
        },
        changes: {
          fieldChanges: [],
          endpointChanges: [],
          addedLines: [],
          removedLines: []
        },
        metadata: {
          processingTime: 100,
          confidence: -0.5, // Invalid confidence
          complexity: 'low' as const,
          reviewRequired: true
        }
        // Missing error message
      };

      const validation = processor.validateProcessedResponse(response);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(1);
    });
  });
});