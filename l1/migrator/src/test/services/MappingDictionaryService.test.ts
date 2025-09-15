import { MappingDictionaryService, FieldMapping, EndpointMapping, MappingDictionary } from '../../services/MappingDictionaryService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock VS Code extension context
const mockContext = {
  extensionPath: '/mock/extension/path'
} as vscode.ExtensionContext;

// Mock fs.promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn()
  }
}));

const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
const mockAccess = fs.promises.access as jest.MockedFunction<typeof fs.promises.access>;

describe('MappingDictionaryService', () => {
  let mappingService: MappingDictionaryService;
  let mockMappingDictionary: MappingDictionary;

  beforeEach(() => {
    mappingService = new MappingDictionaryService(mockContext);
    
    // Create mock mapping dictionary
    mockMappingDictionary = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      endpoints: [
        {
          convergeEndpoint: '/hosted-payments',
          elavonEndpoint: '/v1/payments',
          method: 'POST',
          description: 'Process hosted payments',
          fieldMappings: [
            {
              convergeField: 'ssl_merchant_id',
              elavonField: 'merchant_id',
              dataType: 'string',
              required: true,
              maxLength: 50
            },
            {
              convergeField: 'ssl_amount',
              elavonField: 'amount',
              dataType: 'number',
              required: true,
              transformation: 'currency_conversion'
            }
          ]
        }
      ],
      commonFields: [
        {
          convergeField: 'ssl_card_number',
          elavonField: 'card_number',
          dataType: 'string',
          required: true,
          maxLength: 19
        },
        {
          convergeField: 'ssl_exp_date',
          elavonField: 'expiry_date',
          dataType: 'string',
          required: true,
          transformation: 'date_format',
          deprecated: false
        },
        {
          convergeField: 'ssl_old_field',
          elavonField: 'new_field',
          dataType: 'string',
          required: false,
          deprecated: true
        }
      ],
      transformationRules: {
        'currency_conversion': 'Convert cents to dollars by dividing by 100',
        'date_format': 'Convert MMYY to MM/YY format'
      },
      migrationNotes: ['Test migration notes']
    };

    jest.clearAllMocks();
  });

  describe('loadMappingDictionary', () => {
    it('should load mapping dictionary from file successfully', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockMappingDictionary));

      const result = await mappingService.loadMappingDictionary();

      expect(result).toEqual(mockMappingDictionary);
      expect(mockReadFile).toHaveBeenCalledWith(
        path.join(mockContext.extensionPath, 'resources', 'mapping.json'),
        'utf8'
      );
    });

    it('should return cached dictionary on subsequent calls', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockMappingDictionary));

      const result1 = await mappingService.loadMappingDictionary();
      const result2 = await mappingService.loadMappingDictionary();

      expect(result1).toEqual(result2);
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid json');

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('Failed to load mapping dictionary');
    });

    it('should throw error for missing version', async () => {
      const invalidDictionary = { ...mockMappingDictionary };
      delete (invalidDictionary as any).version;
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidDictionary));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('Mapping dictionary missing version');
    });

    it('should throw error for missing endpoints', async () => {
      const invalidDictionary = { ...mockMappingDictionary };
      delete (invalidDictionary as any).endpoints;
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidDictionary));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('Mapping dictionary missing or invalid endpoints');
    });

    it('should throw error for file read failure', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('Failed to load mapping dictionary: File not found');
    });
  });

  describe('getFieldMapping', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should find field mapping in common fields', async () => {
      const result = await mappingService.getFieldMapping('ssl_card_number');

      expect(result).toEqual({
        convergeField: 'ssl_card_number',
        elavonField: 'card_number',
        dataType: 'string',
        required: true,
        maxLength: 19
      });
    });

    it('should find field mapping in endpoint-specific mappings', async () => {
      const result = await mappingService.getFieldMapping('ssl_merchant_id');

      expect(result).toEqual({
        convergeField: 'ssl_merchant_id',
        elavonField: 'merchant_id',
        dataType: 'string',
        required: true,
        maxLength: 50
      });
    });

    it('should return null for non-existent field', async () => {
      const result = await mappingService.getFieldMapping('non_existent_field');

      expect(result).toBeNull();
    });

    it('should be case insensitive', async () => {
      const result = await mappingService.getFieldMapping('SSL_CARD_NUMBER');

      expect(result).toEqual({
        convergeField: 'ssl_card_number',
        elavonField: 'card_number',
        dataType: 'string',
        required: true,
        maxLength: 19
      });
    });
  });

  describe('getEndpointMapping', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should find endpoint mapping by exact match', async () => {
      const result = await mappingService.getEndpointMapping('/hosted-payments');

      expect(result?.convergeEndpoint).toBe('/hosted-payments');
      expect(result?.elavonEndpoint).toBe('/v1/payments');
    });

    it('should find endpoint mapping by partial match', async () => {
      const result = await mappingService.getEndpointMapping('hosted-payments');

      expect(result?.convergeEndpoint).toBe('/hosted-payments');
    });

    it('should return null for non-existent endpoint', async () => {
      const result = await mappingService.getEndpointMapping('/non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getFieldMappings', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should return mappings for multiple fields', async () => {
      const result = await mappingService.getFieldMappings(['ssl_card_number', 'ssl_merchant_id']);

      expect(result.size).toBe(2);
      expect(result.get('ssl_card_number')?.elavonField).toBe('card_number');
      expect(result.get('ssl_merchant_id')?.elavonField).toBe('merchant_id');
    });

    it('should skip non-existent fields', async () => {
      const result = await mappingService.getFieldMappings(['ssl_card_number', 'non_existent']);

      expect(result.size).toBe(1);
      expect(result.has('ssl_card_number')).toBe(true);
      expect(result.has('non_existent')).toBe(false);
    });
  });

  describe('searchMappings', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should find exact field matches with highest confidence', async () => {
      const results = await mappingService.searchMappings('ssl_card_number');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBe(1.0);
      expect(results[0].convergeItem).toBe('ssl_card_number');
    });

    it('should find partial matches with lower confidence', async () => {
      const results = await mappingService.searchMappings('card');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeLessThan(1.0);
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should find endpoint matches', async () => {
      const results = await mappingService.searchMappings('hosted-payments');

      const endpointResult = results.find(r => r.type === 'endpoint');
      expect(endpointResult).toBeDefined();
      expect(endpointResult?.convergeItem).toBe('/hosted-payments');
    });

    it('should return empty array for no matches', async () => {
      const results = await mappingService.searchMappings('xyz123nonexistent');

      expect(results).toEqual([]);
    });

    it('should sort results by confidence', async () => {
      const results = await mappingService.searchMappings('ssl');

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });
  });

  describe('getTransformationRule', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should return transformation rule for field with transformation', async () => {
      const result = await mappingService.getTransformationRule('ssl_amount');

      expect(result).toBe('Convert cents to dollars by dividing by 100');
    });

    it('should return null for field without transformation', async () => {
      const result = await mappingService.getTransformationRule('ssl_card_number');

      expect(result).toBeNull();
    });

    it('should return direct transformation rule if exists', async () => {
      const result = await mappingService.getTransformationRule('date_format');

      expect(result).toBe('Convert MMYY to MM/YY format');
    });
  });

  describe('getDeprecatedFields', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should return all deprecated fields', async () => {
      const result = await mappingService.getDeprecatedFields();

      expect(result.length).toBe(1);
      expect(result[0].convergeField).toBe('ssl_old_field');
      expect(result[0].deprecated).toBe(true);
    });
  });

  describe('getMigrationComplexity', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should calculate complexity for mapped fields', async () => {
      const result = await mappingService.getMigrationComplexity(['ssl_card_number', 'ssl_amount']);

      expect(result.details.totalFields).toBe(2);
      expect(result.details.mappedFields).toBe(2);
      expect(result.details.unmappedFields).toBe(0);
      expect(result.details.transformationRequired).toBe(1); // ssl_amount has transformation
      expect(result.score).toBeGreaterThan(0);
      // With 2 mapped fields but 1 transformation required, complexity should be medium
      expect(['low', 'medium']).toContain(result.complexity);
    });

    it('should calculate complexity for mixed fields', async () => {
      const result = await mappingService.getMigrationComplexity(['ssl_card_number', 'non_existent', 'ssl_old_field']);

      expect(result.details.totalFields).toBe(3);
      expect(result.details.mappedFields).toBe(2);
      expect(result.details.unmappedFields).toBe(1);
      expect(result.details.deprecatedFields).toBe(1);
    });

    it('should return appropriate complexity for mostly unmapped fields', async () => {
      const result = await mappingService.getMigrationComplexity(['non_existent1', 'non_existent2', 'ssl_card_number']);

      expect(result.details.totalFields).toBe(3);
      expect(result.details.mappedFields).toBe(1);
      expect(result.details.unmappedFields).toBe(2);
      // Score calculation: 100 - (2/3 * 40) = 100 - 26.67 = 73.33 (low complexity)
      expect(result.score).toBeCloseTo(73.33, 1);
      expect(result.complexity).toBe('low'); // Score > 70 = low complexity
    });
  });

  describe('generateMigrationCode', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should generate JavaScript code without transformation', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'javascript');

      expect(result).toContain('// Migration: ssl_card_number -> card_number');
      expect(result).toContain('const card_number = convergeData.ssl_card_number;');
    });

    it('should generate JavaScript code with transformation', async () => {
      const result = await mappingService.generateMigrationCode('ssl_amount', 'javascript');

      expect(result).toContain('// Migration: ssl_amount -> amount');
      expect(result).toContain('// Transformation required:');
      expect(result).toContain('const amount = transformssl_amount(convergeData.ssl_amount);');
    });

    it('should generate PHP code', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'php');

      expect(result).toContain('// Migration: ssl_card_number -> card_number');
      expect(result).toContain("$card_number = $convergeData['ssl_card_number'];");
    });

    it('should generate Python code', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'python');

      expect(result).toContain('# Migration: ssl_card_number -> card_number');
      expect(result).toContain("card_number = converge_data['ssl_card_number']");
    });

    it('should generate Java code', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'java');

      expect(result).toContain('// Migration: ssl_card_number -> card_number');
      expect(result).toContain('String card_number = convergeData.getssl_card_number();');
    });

    it('should generate C# code', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'csharp');

      expect(result).toContain('// Migration: ssl_card_number -> card_number');
      expect(result).toContain('var card_number = convergeData.ssl_card_number;');
    });

    it('should generate Ruby code', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'ruby');

      expect(result).toContain('# Migration: ssl_card_number -> card_number');
      expect(result).toContain('card_number = converge_data[:ssl_card_number]');
    });

    it('should return null for non-existent field', async () => {
      const result = await mappingService.generateMigrationCode('non_existent', 'javascript');

      expect(result).toBeNull();
    });

    it('should return null for unsupported language', async () => {
      const result = await mappingService.generateMigrationCode('ssl_card_number', 'cobol' as any);

      expect(result).toBeNull();
    });
  });

  describe('getMappingStatistics', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));
    });

    it('should return correct statistics', async () => {
      const result = await mappingService.getMappingStatistics();

      expect(result.totalEndpoints).toBe(1);
      expect(result.totalFieldMappings).toBe(5); // 3 common + 2 endpoint-specific
      expect(result.commonFields).toBe(3);
      expect(result.deprecatedFields).toBe(1);
      expect(result.transformationRules).toBe(2);
      expect(result.version).toBe('1.0.0');
      expect(result.lastUpdated).toBe('2024-01-01');
    });
  });

  describe('utility methods', () => {
    it('should check if mapping dictionary exists', async () => {
      mockAccess.mockResolvedValueOnce(undefined);

      const result = await mappingService.mappingDictionaryExists();

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith(
        path.join(mockContext.extensionPath, 'resources', 'mapping.json')
      );
    });

    it('should return false if mapping dictionary does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('File not found'));

      const result = await mappingService.mappingDictionaryExists();

      expect(result).toBe(false);
    });

    it('should return correct mapping file path', () => {
      const result = mappingService.getMappingFilePath();

      expect(result).toBe(path.join(mockContext.extensionPath, 'resources', 'mapping.json'));
    });

    it('should reload mapping dictionary', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockMappingDictionary));

      // Load once
      await mappingService.loadMappingDictionary();
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      // Reload should force re-read
      await mappingService.reloadMappingDictionary();
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation', () => {
    it('should validate field mappings structure', async () => {
      const invalidDictionary = {
        ...mockMappingDictionary,
        commonFields: [
          {
            convergeField: 'ssl_test',
            elavonField: 'test',
            // Missing dataType
            required: true
          }
        ]
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidDictionary));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('missing data type');
    });

    it('should validate endpoint structure', async () => {
      const invalidDictionary = {
        ...mockMappingDictionary,
        endpoints: [
          {
            // Missing convergeEndpoint
            elavonEndpoint: '/v1/test',
            method: 'POST',
            description: 'Test',
            fieldMappings: []
          }
        ]
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(invalidDictionary));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('missing endpoint URLs');
    });
  });
});