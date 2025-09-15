import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MappingService } from '../../services/MappingService';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

describe('MappingService', () => {
  let mappingService: MappingService;
  let mockContext: vscode.ExtensionContext;
  let mockMappingData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      extensionPath: '/test/extension/path'
    } as any;

    mockMappingData = {
      version: '1.0.0',
      lastUpdated: '2024-01-01T00:00:00.000Z',
      mappings: [
        {
          convergeEndpoint: '/hosted-payments/transaction_token',
          elavonEndpoint: '/transactions',
          method: 'POST',
          fieldMappings: {
            ssl_account_id: 'processorAccount.id',
            ssl_user_id: 'merchantAlias',
            ssl_amount: 'amount.total'
          }
        },
        {
          convergeEndpoint: '/Checkout.js',
          elavonEndpoint: '/payment-sessions',
          method: 'POST',
          fieldMappings: {
            ssl_txn_auth_token: 'sessionId',
            ssl_amount: 'amount.total'
          }
        }
      ]
    };

    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockMappingData));

    mappingService = new MappingService(mockContext);
  });

  describe('loadMappingDictionary', () => {
    it('should load and parse mapping dictionary', async () => {
      const result = await mappingService.loadMappingDictionary();

      expect(fs.promises.readFile).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'resources', 'mapping.json'),
        'utf8'
      );
      expect(result.version).toBe('1.0.0');
      expect(result.mappings).toHaveLength(2);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should cache mapping dictionary on subsequent calls', async () => {
      await mappingService.loadMappingDictionary();
      await mappingService.loadMappingDictionary();

      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid JSON', async () => {
      (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json');

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('Failed to load mapping dictionary');
    });

    it('should validate mapping structure', async () => {
      const invalidMapping = { version: '1.0.0' }; // Missing required fields
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidMapping));

      await expect(mappingService.loadMappingDictionary()).rejects.toThrow('mappings must be an array');
    });
  });

  describe('getMappingForEndpoint', () => {
    it('should return mapping for exact endpoint match', async () => {
      const mapping = await mappingService.getMappingForEndpoint('/hosted-payments/transaction_token');

      expect(mapping).toBeTruthy();
      expect(mapping?.convergeEndpoint).toBe('/hosted-payments/transaction_token');
      expect(mapping?.elavonEndpoint).toBe('/transactions');
    });

    it('should return mapping for partial endpoint match', async () => {
      const mapping = await mappingService.getMappingForEndpoint('https://api.converge.com/hosted-payments/transaction_token');

      expect(mapping).toBeTruthy();
      expect(mapping?.convergeEndpoint).toBe('/hosted-payments/transaction_token');
    });

    it('should return null for non-existent endpoint', async () => {
      const mapping = await mappingService.getMappingForEndpoint('/non-existent-endpoint');

      expect(mapping).toBeNull();
    });
  });

  describe('getFieldMapping', () => {
    it('should return Elavon field for Converge field', async () => {
      const elavonField = await mappingService.getFieldMapping('/hosted-payments/transaction_token', 'ssl_account_id');

      expect(elavonField).toBe('processorAccount.id');
    });

    it('should return null for non-existent field', async () => {
      const elavonField = await mappingService.getFieldMapping('/hosted-payments/transaction_token', 'non_existent_field');

      expect(elavonField).toBeNull();
    });

    it('should return null for non-existent endpoint', async () => {
      const elavonField = await mappingService.getFieldMapping('/non-existent-endpoint', 'ssl_account_id');

      expect(elavonField).toBeNull();
    });
  });

  describe('getSslFieldsForEndpoint', () => {
    it('should return all SSL fields for endpoint', async () => {
      const sslFields = await mappingService.getSslFieldsForEndpoint('/hosted-payments/transaction_token');

      expect(sslFields).toEqual(['ssl_account_id', 'ssl_user_id', 'ssl_amount']);
    });

    it('should return empty array for non-existent endpoint', async () => {
      const sslFields = await mappingService.getSslFieldsForEndpoint('/non-existent-endpoint');

      expect(sslFields).toEqual([]);
    });
  });

  describe('searchMappingsByField', () => {
    it('should find mappings by Converge field name', async () => {
      const mappings = await mappingService.searchMappingsByField('ssl_amount');

      expect(mappings).toHaveLength(2);
      expect(mappings[0].convergeEndpoint).toBe('/hosted-payments/transaction_token');
      expect(mappings[1].convergeEndpoint).toBe('/Checkout.js');
    });

    it('should find mappings by Elavon field name', async () => {
      const mappings = await mappingService.searchMappingsByField('sessionId');

      expect(mappings).toHaveLength(1);
      expect(mappings[0].convergeEndpoint).toBe('/Checkout.js');
    });

    it('should return empty array for non-existent field', async () => {
      const mappings = await mappingService.searchMappingsByField('non_existent_field');

      expect(mappings).toEqual([]);
    });
  });

  describe('getReverseMappingForField', () => {
    it('should return reverse mappings for Elavon field', async () => {
      const reverseMappings = await mappingService.getReverseMappingForField('amount.total');

      expect(reverseMappings).toHaveLength(2);
      expect(reverseMappings[0]).toEqual({
        endpoint: '/hosted-payments/transaction_token',
        convergeField: 'ssl_amount'
      });
      expect(reverseMappings[1]).toEqual({
        endpoint: '/Checkout.js',
        convergeField: 'ssl_amount'
      });
    });

    it('should return empty array for non-existent Elavon field', async () => {
      const reverseMappings = await mappingService.getReverseMappingForField('non.existent.field');

      expect(reverseMappings).toEqual([]);
    });
  });

  describe('getMappingStatistics', () => {
    it('should return correct statistics', async () => {
      const stats = await mappingService.getMappingStatistics();

      expect(stats.totalMappings).toBe(2);
      expect(stats.totalFields).toBe(5); // 3 + 2 fields
      expect(stats.endpointTypes).toEqual(['/hosted-payments/transaction_token', '/Checkout.js']);
      expect(stats.version).toBe('1.0.0');
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('reloadMappingDictionary', () => {
    it('should clear cache and reload mapping dictionary', async () => {
      // Load once
      await mappingService.loadMappingDictionary();
      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);

      // Reload should call readFile again
      await mappingService.reloadMappingDictionary();
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('exportMappingDictionary', () => {
    it('should export mapping dictionary as JSON string', async () => {
      const exported = await mappingService.exportMappingDictionary();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.mappings).toHaveLength(2);
    });
  });
});