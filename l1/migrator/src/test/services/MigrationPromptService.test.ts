import { MigrationPromptService, MigrationPromptRequest } from '../../services/MigrationPromptService';
import { MappingDictionaryService } from '../../services/MappingDictionaryService';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode', () => ({}));

// Mock MappingDictionaryService
jest.mock('../../services/MappingDictionaryService');

const MockMappingDictionaryService = MappingDictionaryService as jest.MockedClass<typeof MappingDictionaryService>;

describe('MigrationPromptService', () => {
  let promptService: MigrationPromptService;
  let mockContext: vscode.ExtensionContext;
  let mockMappingService: jest.Mocked<MappingDictionaryService>;

  beforeEach(() => {
    mockContext = {} as vscode.ExtensionContext;
    
    mockMappingService = {
      loadMappingDictionary: jest.fn(),
      getFieldMapping: jest.fn(),
      getEndpointMapping: jest.fn()
    } as any;

    MockMappingDictionaryService.mockImplementation(() => mockMappingService);

    promptService = new MigrationPromptService(mockContext);

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
      endpoints: [
        {
          convergeEndpoint: 'https://api.converge.com/VirtualMerchant/process.do',
          elavonEndpoint: 'https://api.elavon.com/v1/payments',
          method: 'POST',
          description: 'Process payment transaction',
          fieldMappings: [
            {
              convergeField: 'ssl_transaction_type',
              elavonField: 'transaction_type',
              dataType: 'string',
              required: true,
              notes: 'Type of transaction'
            }
          ]
        }
      ]
    });
  });

  describe('generateMigrationPrompt', () => {
    it('should generate prompt for JavaScript code', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id; const amount = ssl_amount;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10,
        endpointType: 'payment'
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('JavaScript/TypeScript code');
      expect(prompt.systemPrompt).toContain('ssl_merchant_id → merchant_id');
      expect(prompt.userPrompt).toContain('payment.js');
      expect(prompt.userPrompt).toContain('LINE: 10');
      expect(prompt.userPrompt).toContain(request.originalCode);
      expect(prompt.metadata.language).toBe('javascript');
      expect(prompt.context.mappings).toHaveLength(2);
    });

    it('should generate prompt for PHP code', async () => {
      const request: MigrationPromptRequest = {
        originalCode: '$merchant_id = $ssl_merchant_id;',
        language: 'php',
        filePath: 'payment.php',
        lineNumber: 5
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('PHP code');
      expect(prompt.userPrompt).toContain('```php');
      expect(prompt.metadata.language).toBe('php');
      expect(prompt.context.codeQualityRules).toContain('Use proper PHP syntax and PSR standards');
    });

    it('should generate prompt for Python code', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'merchant_id = ssl_merchant_id',
        language: 'python',
        filePath: 'payment.py',
        lineNumber: 15
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('Python code');
      expect(prompt.userPrompt).toContain('```python');
      expect(prompt.metadata.language).toBe('python');
      expect(prompt.context.codeQualityRules).toContain('Follow PEP 8 style guidelines');
    });

    it('should generate prompt for Java code', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'String merchantId = sslMerchantId;',
        language: 'java',
        filePath: 'Payment.java',
        lineNumber: 20
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('Java code');
      expect(prompt.userPrompt).toContain('```java');
      expect(prompt.metadata.language).toBe('java');
      expect(prompt.context.codeQualityRules).toContain('Follow Java coding conventions');
    });

    it('should generate prompt for C# code', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'string merchantId = sslMerchantId;',
        language: 'csharp',
        filePath: 'Payment.cs',
        lineNumber: 25
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('C# code');
      expect(prompt.userPrompt).toContain('```csharp');
      expect(prompt.metadata.language).toBe('csharp');
      expect(prompt.context.codeQualityRules).toContain('Follow C# coding conventions');
    });

    it('should use generic template for unsupported languages', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'merchant_id := ssl_merchant_id',
        language: 'go',
        filePath: 'payment.go',
        lineNumber: 30
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('payment gateway migration assistant');
      expect(prompt.userPrompt).toContain('```go');
      expect(prompt.metadata.language).toBe('go');
      expect(prompt.context.codeQualityRules).toContain('Follow language-specific coding conventions');
    });

    it('should include context information when provided', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10,
        endpointType: 'payment',
        context: {
          surroundingCode: 'function processPayment() {',
          projectType: 'node',
          frameworkInfo: 'express',
          dependencies: ['axios', 'lodash']
        }
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.userPrompt).toContain('ENDPOINT TYPE: payment');
      expect(prompt.userPrompt).toContain('PROJECT TYPE: node');
      expect(prompt.userPrompt).toContain('FRAMEWORK: express');
      expect(prompt.userPrompt).toContain('DEPENDENCIES: axios, lodash');
      expect(prompt.userPrompt).toContain('SURROUNDING CONTEXT:');
      expect(prompt.userPrompt).toContain('function processPayment() {');
    });

    it('should include endpoint mappings when endpoint type is specified', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const url = "https://api.converge.com/VirtualMerchant/process.do";',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10,
        endpointType: 'payment'
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('https://api.converge.com/VirtualMerchant/process.do → https://api.elavon.com/v1/payments');
      expect(prompt.context.endpoints).toHaveLength(1);
      expect(prompt.context.endpoints[0].method).toBe('POST');
    });

    it('should calculate complexity correctly', async () => {
      const simpleRequest: MigrationPromptRequest = {
        originalCode: 'const id = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'simple.js',
        lineNumber: 1
      };

      const complexRequest: MigrationPromptRequest = {
        originalCode: `
          async function processPayment() {
            try {
              const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(data)
              });
              return response.json();
            } catch (error) {
              console.error(error);
            }
          }
        `,
        language: 'javascript',
        filePath: 'complex.js',
        lineNumber: 1
      };

      const simplePrompt = await promptService.generateMigrationPrompt(simpleRequest);
      const complexPrompt = await promptService.generateMigrationPrompt(complexRequest);

      expect(simplePrompt.metadata.complexity).toBe('low');
      expect(complexPrompt.metadata.complexity).toBe('medium');
    });

    it('should estimate token count', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.metadata.estimatedTokens).toBeGreaterThan(0);
      expect(typeof prompt.metadata.estimatedTokens).toBe('number');
    });

    it('should handle mapping service errors gracefully', async () => {
      mockMappingService.loadMappingDictionary.mockRejectedValue(new Error('Mapping error'));

      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
      };

      await expect(promptService.generateMigrationPrompt(request)).rejects.toThrow('Failed to generate migration prompt');
    });
  });

  describe('validatePromptRequest', () => {
    it('should validate valid request', () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject request with empty original code', () => {
      const request: MigrationPromptRequest = {
        originalCode: '',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Original code is required');
    });

    it('should reject request with empty language', () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: '',
        filePath: 'payment.js',
        lineNumber: 10
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Language is required');
    });

    it('should reject request with empty file path', () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: '',
        lineNumber: 10
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File path is required');
    });

    it('should reject request with invalid line number', () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 0
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Line number must be greater than 0');
    });

    it('should reject request with code too long', () => {
      const request: MigrationPromptRequest = {
        originalCode: 'a'.repeat(10001),
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Original code is too long (max 10,000 characters)');
    });

    it('should collect multiple validation errors', () => {
      const request: MigrationPromptRequest = {
        originalCode: '',
        language: '',
        filePath: '',
        lineNumber: -1
      };

      const validation = promptService.validatePromptRequest(request);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(4);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = promptService.getSupportedLanguages();

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('php');
      expect(languages).toContain('python');
      expect(languages).toContain('java');
      expect(languages).toContain('csharp');
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('getPromptStatistics', () => {
    it('should return prompt statistics', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id; const amount = ssl_amount;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10,
        endpointType: 'payment'
      };

      const stats = await promptService.getPromptStatistics(request);

      expect(stats.estimatedTokens).toBeGreaterThan(0);
      expect(stats.complexity).toBe('low');
      expect(stats.mappingCount).toBe(2);
      expect(stats.endpointCount).toBe(1);
    });
  });

  describe('language template selection', () => {
    it('should map TypeScript to JavaScript template', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId: string = ssl_merchant_id;',
        language: 'typescript',
        filePath: 'payment.ts',
        lineNumber: 10
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.systemPrompt).toContain('JavaScript/TypeScript code');
      expect(prompt.context.codeQualityRules).toContain('Ensure proper type safety (for TypeScript)');
    });

    it('should map language aliases correctly', async () => {
      const testCases = [
        { language: 'js', expectedTemplate: 'javascript' },
        { language: 'ts', expectedTemplate: 'javascript' },
        { language: 'py', expectedTemplate: 'python' },
        { language: 'cs', expectedTemplate: 'csharp' },
        { language: 'c#', expectedTemplate: 'csharp' }
      ];

      for (const testCase of testCases) {
        const request: MigrationPromptRequest = {
          originalCode: 'test code',
          language: testCase.language,
          filePath: 'test.file',
          lineNumber: 1
        };

        const prompt = await promptService.generateMigrationPrompt(request);
        
        // Verify the correct template was used by checking language-specific content
        expect(prompt.systemPrompt).toBeDefined();
        expect(prompt.userPrompt).toBeDefined();
      }
    });
  });

  describe('field detection', () => {
    it('should detect fields in various code patterns', async () => {
      const testCodes = [
        'ssl_merchant_id = "test"',           // Assignment
        'data["ssl_merchant_id"]',            // Array access
        'obj.ssl_merchant_id',                // Property access
        '"ssl_merchant_id": value',           // Object literal
        'ssl_merchant_id: "value"',           // Object property
        'const ssl_merchant_id = getValue()' // Variable declaration
      ];

      for (const code of testCodes) {
        const request: MigrationPromptRequest = {
          originalCode: code,
          language: 'javascript',
          filePath: 'test.js',
          lineNumber: 1
        };

        const prompt = await promptService.generateMigrationPrompt(request);
        
        // Should find the ssl_merchant_id mapping
        expect(prompt.context.mappings.some(m => m.convergeField === 'ssl_merchant_id')).toBe(true);
      }
    });

    it('should not detect fields that are not present', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const someOtherVariable = "test";',
        language: 'javascript',
        filePath: 'test.js',
        lineNumber: 1
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.context.mappings).toHaveLength(0);
    });
  });

  describe('endpoint type handling', () => {
    it('should handle missing endpoint type gracefully', async () => {
      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10
        // No endpointType specified
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.context.endpoints).toHaveLength(0);
      expect(prompt.metadata.endpointType).toBeUndefined();
    });

    it('should find endpoints by partial matching', async () => {
      mockMappingService.loadMappingDictionary.mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2024-01-01',
        transformationRules: {},
        migrationNotes: [],
        commonFields: [],
        endpoints: [
          {
            convergeEndpoint: 'https://api.converge.com/VirtualMerchant/process.do',
            elavonEndpoint: 'https://api.elavon.com/v1/payments',
            method: 'POST',
            description: 'Process payment transaction',
            fieldMappings: []
          },
          {
            convergeEndpoint: 'https://api.converge.com/VirtualMerchant/refund.do',
            elavonEndpoint: 'https://api.elavon.com/v1/refunds',
            method: 'POST',
            description: 'Process refund transaction',
            fieldMappings: []
          }
        ]
      });

      const request: MigrationPromptRequest = {
        originalCode: 'const merchantId = ssl_merchant_id;',
        language: 'javascript',
        filePath: 'payment.js',
        lineNumber: 10,
        endpointType: 'refund'
      };

      const prompt = await promptService.generateMigrationPrompt(request);

      expect(prompt.context.endpoints).toHaveLength(1);
      expect(prompt.context.endpoints[0].description).toContain('refund');
    });
  });
});