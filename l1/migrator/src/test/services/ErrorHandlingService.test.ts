import { ErrorHandlingService, ErrorSeverity, ErrorCategory } from '../../services/ErrorHandlingService';

// Mock VS Code context
const mockContext = {
  globalState: {
    get: jest.fn(),
    update: jest.fn()
  }
} as any;

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandlingService = new ErrorHandlingService(mockContext);
  });

  describe('Error Logging', () => {
    test('should log error with default severity', () => {
      const errorMessage = 'Test error message';
      const errorId = errorHandlingService.logError(errorMessage);

      expect(errorId).toBeDefined();
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    });

    test('should log error with custom severity and category', () => {
      const errorMessage = 'Test error message';
      const errorId = errorHandlingService.logError(errorMessage, {
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.MIGRATION
      });

      expect(errorId).toBeDefined();
    });

    test('should log error with context information', () => {
      const errorMessage = 'Test error message';
      const errorId = errorHandlingService.logError(errorMessage, {
        context: {
          filePath: '/test/file.js',
          lineNumber: 10,
          endpointType: 'test-endpoint'
        }
      });

      expect(errorId).toBeDefined();
    });

    test('should log error with details', () => {
      const errorMessage = 'Test error message';
      const errorId = errorHandlingService.logError(errorMessage, {
        details: 'Additional error details'
      });

      expect(errorId).toBeDefined();
    });

    test('should log error without showing to user', () => {
      const errorMessage = 'Test error message';
      const errorId = errorHandlingService.logError(errorMessage, {
        showToUser: false
      });

      expect(errorId).toBeDefined();
    });

    test('should log Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const errorId = errorHandlingService.logError(error);

      expect(errorId).toBeDefined();
    });
  });

  describe('Logging Methods', () => {
    test('should log info message', () => {
      const errorId = errorHandlingService.logInfo('Info message');
      expect(errorId).toBeDefined();
    });

    test('should log warning message', () => {
      const errorId = errorHandlingService.logWarning('Warning message');
      expect(errorId).toBeDefined();
    });

    test('should log critical error', () => {
      const errorId = errorHandlingService.logCritical('Critical error');
      expect(errorId).toBeDefined();
    });
  });

  describe('Error Retrieval', () => {
    test('should get all errors', () => {
      errorHandlingService.logError('Error 1');
      errorHandlingService.logError('Error 2');

      const errors = errorHandlingService.getAllErrors();
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });

    test('should get error by ID', () => {
      const errorId = errorHandlingService.logError('Test error');
      const error = errorHandlingService.getError(errorId);

      expect(error).toBeDefined();
      expect(error?.id).toBe(errorId);
      expect(error?.message).toBe('Test error');
    });

    test('should return undefined for non-existent error ID', () => {
      const error = errorHandlingService.getError('non-existent-id');
      expect(error).toBeUndefined();
    });

    test('should get errors by severity', () => {
      errorHandlingService.logError('Error 1', { severity: ErrorSeverity.ERROR });
      errorHandlingService.logError('Error 2', { severity: ErrorSeverity.WARNING });

      const errorErrors = errorHandlingService.getErrorsBySeverity(ErrorSeverity.ERROR);
      const warningErrors = errorHandlingService.getErrorsBySeverity(ErrorSeverity.WARNING);

      expect(errorErrors.length).toBeGreaterThanOrEqual(1);
      expect(warningErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('should get errors by category', () => {
      errorHandlingService.logError('Error 1', { category: ErrorCategory.MIGRATION });
      errorHandlingService.logError('Error 2', { category: ErrorCategory.PARSING });

      const migrationErrors = errorHandlingService.getErrorsByCategory(ErrorCategory.MIGRATION);
      const parsingErrors = errorHandlingService.getErrorsByCategory(ErrorCategory.PARSING);

      expect(migrationErrors.length).toBeGreaterThanOrEqual(1);
      expect(parsingErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('should get unresolved errors', () => {
      errorHandlingService.logError('Unresolved error');
      errorHandlingService.logError('Another error');

      const unresolvedErrors = errorHandlingService.getUnresolvedErrors();
      expect(unresolvedErrors.length).toBeGreaterThanOrEqual(2);
    });

    test('should get recent errors', () => {
      errorHandlingService.logError('Error 1');
      errorHandlingService.logError('Error 2');
      errorHandlingService.logError('Error 3');

      const recentErrors = errorHandlingService.getRecentErrors(2);
      expect(recentErrors.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Resolution', () => {
    test('should resolve error successfully', () => {
      const errorId = errorHandlingService.logError('Test error');
      const success = errorHandlingService.resolveError(errorId, 'Fixed by updating code');

      expect(success).toBe(true);

      const error = errorHandlingService.getError(errorId);
      expect(error?.resolved).toBe(true);
      expect(error?.resolution).toBe('Fixed by updating code');
    });

    test('should fail to resolve non-existent error', () => {
      const success = errorHandlingService.resolveError('non-existent-id', 'Resolution');
      expect(success).toBe(false);
    });
  });

  describe('Error Statistics', () => {
    test('should get error statistics', () => {
      errorHandlingService.logError('Error 1', { severity: ErrorSeverity.ERROR });
      errorHandlingService.logError('Error 2', { severity: ErrorSeverity.WARNING });
      errorHandlingService.logError('Error 3', { severity: ErrorSeverity.ERROR });

      const stats = errorHandlingService.getErrorStatistics();

      expect(stats.totalErrors).toBeGreaterThanOrEqual(3);
      expect(stats.errorsBySeverity.get(ErrorSeverity.ERROR)).toBeGreaterThanOrEqual(2);
      expect(stats.errorsBySeverity.get(ErrorSeverity.WARNING)).toBeGreaterThanOrEqual(1);
      expect(stats.unresolvedErrors.length).toBeGreaterThanOrEqual(3);
    });

    test('should calculate average resolution time', () => {
      const errorId = errorHandlingService.logError('Test error');
      
      // Simulate resolution after some time
      setTimeout(() => {
        errorHandlingService.resolveError(errorId, 'Resolution');
      }, 100);

      const stats = errorHandlingService.getErrorStatistics();
      expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Management', () => {
    test('should clear all errors', () => {
      errorHandlingService.logError('Error 1');
      errorHandlingService.logError('Error 2');

      errorHandlingService.clearAllErrors();
      const errors = errorHandlingService.getAllErrors();
      expect(errors.length).toBe(0);
    });

    test('should clear resolved errors only', () => {
      const errorId1 = errorHandlingService.logError('Error 1');
      const errorId2 = errorHandlingService.logError('Error 2');
      
      errorHandlingService.resolveError(errorId1, 'Resolution');
      errorHandlingService.clearResolvedErrors();

      const errors = errorHandlingService.getAllErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].id).toBe(errorId2);
    });
  });

  describe('Export/Import', () => {
    test('should export errors to JSON', () => {
      errorHandlingService.logError('Test error', {
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.MIGRATION
      });

      const exportData = errorHandlingService.exportErrors();
      const parsed = JSON.parse(exportData);

      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('totalErrors');
      expect(parsed).toHaveProperty('errors');
      expect(Array.isArray(parsed.errors)).toBe(true);
    });

    test('should import errors from JSON', () => {
      const importData = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalErrors: 1,
        errors: [{
          id: 'imported-error',
          severity: 'error',
          category: 'migration',
          message: 'Imported error',
          context: {
            timestamp: new Date().toISOString()
          },
          resolved: false,
          createdAt: new Date().toISOString()
        }]
      });

      const success = errorHandlingService.importErrors(importData);
      expect(success).toBe(true);

      const errors = errorHandlingService.getAllErrors();
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    test('should fail to import invalid JSON', () => {
      const success = errorHandlingService.importErrors('invalid json');
      expect(success).toBe(false);
    });

    test('should fail to import invalid data structure', () => {
      const success = errorHandlingService.importErrors(JSON.stringify({ invalid: 'data' }));
      expect(success).toBe(false);
    });
  });

  describe('Error Context', () => {
    test('should include timestamp in error context', () => {
      const errorId = errorHandlingService.logError('Test error');
      const error = errorHandlingService.getError(errorId);

      expect(error?.context.timestamp).toBeInstanceOf(Date);
    });

    test('should include session ID in error context', () => {
      const errorId = errorHandlingService.logError('Test error');
      const error = errorHandlingService.getError(errorId);

      expect(error?.context.sessionId).toBeDefined();
      expect(error?.context.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    test('should include workspace root in error context', () => {
      const errorId = errorHandlingService.logError('Test error');
      const error = errorHandlingService.getError(errorId);

      expect(error?.context.workspaceRoot).toBeDefined();
    });
  });

  describe('Error ID Generation', () => {
    test('should generate unique error IDs', () => {
      const id1 = errorHandlingService.logError('Error 1');
      const id2 = errorHandlingService.logError('Error 2');

      expect(id1).not.toBe(id2);
    });

    test('should generate error IDs with correct format', () => {
      const errorId = errorHandlingService.logError('Test error');
      expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    });
  });
});
