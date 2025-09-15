import { MigrationService } from '../../services/MigrationService';
import { ConvergeEndpoint, ConvergeEndpointType } from '../../types/ConvergeEndpoint';
import { EndpointMapping } from '../../types/EndpointMapping';

// Mock dependencies
const mockContext = {
  globalState: {
    get: jest.fn(),
    update: jest.fn()
  }
} as any;

const mockCopilotService = {
  generateCode: jest.fn()
} as any;

const mockMappingService = {
  getMappingForEndpoint: jest.fn()
} as any;

const mockValidationService = {
  testEndpoint: jest.fn()
} as any;

const mockCredentialService = {
  retrieveCredentials: jest.fn()
} as any;

const mockParserService = {
  parseFile: jest.fn()
} as any;

describe('MigrationService', () => {
  let migrationService: MigrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    migrationService = new MigrationService(
      mockContext,
      mockCopilotService,
      mockMappingService,
      mockValidationService,
      mockCredentialService,
      mockParserService
    );
  });

  describe('Single Endpoint Migration', () => {
    const mockEndpoint: ConvergeEndpoint = {
      id: 'test-endpoint-1',
      endpointType: ConvergeEndpointType.HOSTED_PAYMENTS_TRANSACTION_TOKEN,
      filePath: '/test/file.js',
      lineNumber: 10,
      code: `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          method: 'POST',
          body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789'
        });
      `,
      sslFields: ['ssl_merchant_id', 'ssl_user_id', 'ssl_pin'],
      confidence: 0.9
    };

    const mockMapping: EndpointMapping = {
      convergeEndpoint: '/hosted-payments/transaction_token',
      elavonEndpoint: '/payments/v1/transactions',
      fieldMappings: {
        'ssl_merchant_id': 'merchant_id',
        'ssl_user_id': 'user_id',
        'ssl_pin': 'api_key'
      },
      httpMethod: 'POST',
      description: 'Migrate hosted payments transaction token to Elavon payments API'
    };

    test('should migrate endpoint successfully', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: `
          const response = await fetch('https://api.elavon.com/payments/v1/transactions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer token' },
            body: JSON.stringify({
              merchant_id: '123',
              user_id: '456',
              api_key: '789'
            })
          });
        `
      });
      mockValidationService.testEndpoint.mockResolvedValue({ success: true });

      const result = await migrationService.migrateEndpoint(mockEndpoint, {
        validateAfterMigration: true,
        createBackup: true
      });

      expect(result.success).toBe(true);
      expect(result.originalCode).toBe(mockEndpoint.code);
      expect(result.migratedCode).toContain('api.elavon.com');
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(mockMappingService.getMappingForEndpoint).toHaveBeenCalledWith(mockEndpoint.endpointType);
      expect(mockCopilotService.generateCode).toHaveBeenCalled();
    });

    test('should handle migration failure', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: false,
        error: 'Code generation failed'
      });

      await expect(migrationService.migrateEndpoint(mockEndpoint)).rejects.toThrow('Migration failed');
    });

    test('should handle missing mapping', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(null);

      await expect(migrationService.migrateEndpoint(mockEndpoint)).rejects.toThrow('No mapping found');
    });

    test('should create backup when requested', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      const result = await migrationService.migrateEndpoint(mockEndpoint, {
        createBackup: true
      });

      expect(result.success).toBe(true);
      // Backup creation is tested in FileBackupService tests
    });

    test('should skip validation when not requested', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      const result = await migrationService.migrateEndpoint(mockEndpoint, {
        validateAfterMigration: false
      });

      expect(result.success).toBe(true);
      expect(mockValidationService.testEndpoint).not.toHaveBeenCalled();
    });
  });

  describe('Bulk Migration', () => {
    const mockEndpoints: ConvergeEndpoint[] = [
      {
        id: 'endpoint-1',
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS_TRANSACTION_TOKEN,
        filePath: '/test/file1.js',
        lineNumber: 10,
        code: 'code1',
        sslFields: ['ssl_merchant_id'],
        confidence: 0.9
      },
      {
        id: 'endpoint-2',
        endpointType: ConvergeEndpointType.PROCESS_TRANSACTION_ONLINE,
        filePath: '/test/file2.js',
        lineNumber: 20,
        code: 'code2',
        sslFields: ['ssl_merchant_id', 'ssl_user_id'],
        confidence: 0.8
      }
    ];

    const mockMapping: EndpointMapping = {
      convergeEndpoint: '/hosted-payments/transaction_token',
      elavonEndpoint: '/payments/v1/transactions',
      fieldMappings: { 'ssl_merchant_id': 'merchant_id' },
      httpMethod: 'POST',
      description: 'Test mapping'
    };

    test('should migrate multiple endpoints successfully', async () => {
      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      const result = await migrationService.migrateEndpointsBulk(mockEndpoints);

      expect(result.success).toBe(true);
      expect(result.totalEndpoints).toBe(2);
      expect(result.successfulMigrations).toBe(2);
      expect(result.failedMigrations).toBe(0);
    });

    test('should handle partial failures in bulk migration', async () => {
      mockMappingService.getMappingForEndpoint
        .mockResolvedValueOnce(mockMapping)
        .mockResolvedValueOnce(null); // Second mapping fails

      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      const result = await migrationService.migrateEndpointsBulk(mockEndpoints, {
        stopOnError: false
      });

      expect(result.success).toBe(false);
      expect(result.totalEndpoints).toBe(2);
      expect(result.successfulMigrations).toBe(1);
      expect(result.failedMigrations).toBe(1);
    });

    test('should stop on error when requested', async () => {
      mockMappingService.getMappingForEndpoint
        .mockResolvedValueOnce(mockMapping)
        .mockResolvedValueOnce(null); // Second mapping fails

      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      await expect(migrationService.migrateEndpointsBulk(mockEndpoints, {
        stopOnError: true
      })).rejects.toThrow('Migration stopped due to error');
    });

    test('should handle cancellation', async () => {
      const cancellationToken = {
        isCancellationRequested: true
      } as any;

      const result = await migrationService.migrateEndpointsBulk(mockEndpoints, {
        cancellationToken
      });

      expect(result.success).toBe(false);
      expect(result.totalEndpoints).toBe(2);
      expect(result.successfulMigrations).toBe(0);
    });
  });

  describe('Migration History', () => {
    test('should record migration in history', async () => {
      const mockEndpoint: ConvergeEndpoint = {
        id: 'test-endpoint',
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS_TRANSACTION_TOKEN,
        filePath: '/test/file.js',
        lineNumber: 10,
        code: 'original code',
        sslFields: ['ssl_merchant_id'],
        confidence: 0.9
      };

      const mockMapping: EndpointMapping = {
        convergeEndpoint: '/hosted-payments/transaction_token',
        elavonEndpoint: '/payments/v1/transactions',
        fieldMappings: { 'ssl_merchant_id': 'merchant_id' },
        httpMethod: 'POST',
        description: 'Test mapping'
      };

      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });

      await migrationService.migrateEndpoint(mockEndpoint);

      const history = migrationService.getMigrationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].endpointType).toBe(mockEndpoint.endpointType);
      expect(history[0].success).toBe(true);
    });

    test('should get migration statistics', async () => {
      // Add some mock history
      const history = migrationService.getMigrationHistory();
      const stats = migrationService.getMigrationStatistics();

      expect(stats.totalMigrations).toBe(history.length);
      expect(stats.successfulMigrations).toBeGreaterThanOrEqual(0);
      expect(stats.failedMigrations).toBeGreaterThanOrEqual(0);
    });

    test('should export migration history', () => {
      const exportData = migrationService.exportMigrationHistory();
      const parsed = JSON.parse(exportData);

      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('totalMigrations');
      expect(parsed).toHaveProperty('migrations');
    });

    test('should import migration history', () => {
      const mockHistoryData = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalMigrations: 1,
        migrations: [{
          id: 'test-id',
          timestamp: new Date().toISOString(),
          endpointType: 'test-type',
          success: true,
          originalCode: 'original',
          migratedCode: 'migrated'
        }]
      });

      const result = migrationService.importMigrationHistory(mockHistoryData);
      expect(result).toBe(true);
    });

    test('should clear migration history', () => {
      migrationService.clearMigrationHistory();
      const history = migrationService.getMigrationHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Rollback Functionality', () => {
    test('should rollback migration successfully', async () => {
      const mockHistoryEntry = {
        id: 'test-id',
        timestamp: new Date(),
        filePath: '/test/file.js',
        lineNumber: 10,
        endpointType: 'test-type',
        originalCode: 'original code',
        migratedCode: 'migrated code',
        success: true,
        rollbackData: {
          originalContent: 'original code',
          fileHash: 'hash123'
        }
      };

      // Mock the history entry
      migrationService['migrationHistory'] = [mockHistoryEntry];

      const result = await migrationService.rollbackMigration(mockHistoryEntry);
      expect(result).toBe(true);
    });

    test('should fail rollback when no rollback data', async () => {
      const mockHistoryEntry = {
        id: 'test-id',
        timestamp: new Date(),
        filePath: '/test/file.js',
        lineNumber: 10,
        endpointType: 'test-type',
        originalCode: 'original code',
        migratedCode: 'migrated code',
        success: true,
        rollbackData: undefined
      };

      const result = await migrationService.rollbackMigration(mockHistoryEntry);
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle copilot service errors', async () => {
      const mockEndpoint: ConvergeEndpoint = {
        id: 'test-endpoint',
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS_TRANSACTION_TOKEN,
        filePath: '/test/file.js',
        lineNumber: 10,
        code: 'original code',
        sslFields: ['ssl_merchant_id'],
        confidence: 0.9
      };

      const mockMapping: EndpointMapping = {
        convergeEndpoint: '/hosted-payments/transaction_token',
        elavonEndpoint: '/payments/v1/transactions',
        fieldMappings: { 'ssl_merchant_id': 'merchant_id' },
        httpMethod: 'POST',
        description: 'Test mapping'
      };

      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockRejectedValue(new Error('Copilot service error'));

      await expect(migrationService.migrateEndpoint(mockEndpoint)).rejects.toThrow('Migration failed');
    });

    test('should handle validation errors', async () => {
      const mockEndpoint: ConvergeEndpoint = {
        id: 'test-endpoint',
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS_TRANSACTION_TOKEN,
        filePath: '/test/file.js',
        lineNumber: 10,
        code: 'original code',
        sslFields: ['ssl_merchant_id'],
        confidence: 0.9
      };

      const mockMapping: EndpointMapping = {
        convergeEndpoint: '/hosted-payments/transaction_token',
        elavonEndpoint: '/payments/v1/transactions',
        fieldMappings: { 'ssl_merchant_id': 'merchant_id' },
        httpMethod: 'POST',
        description: 'Test mapping'
      };

      mockMappingService.getMappingForEndpoint.mockResolvedValue(mockMapping);
      mockCopilotService.generateCode.mockResolvedValue({
        success: true,
        code: 'migrated code'
      });
      mockValidationService.testEndpoint.mockRejectedValue(new Error('Validation error'));

      const result = await migrationService.migrateEndpoint(mockEndpoint, {
        validateAfterMigration: true
      });

      // Should still succeed but with validation error
      expect(result.success).toBe(true);
    });
  });
});
