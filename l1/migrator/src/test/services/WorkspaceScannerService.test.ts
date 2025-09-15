import * as vscode from 'vscode';
import * as fs from 'fs';
import { WorkspaceScannerService, ScanProgress } from '../../services/WorkspaceScannerService';
import { ParserService } from '../../services/ParserService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn()
  }
}));

jest.mock('glob', () => ({
  glob: jest.fn()
}));

const mockGlob = require('glob').glob;

describe('WorkspaceScannerService', () => {
  let scannerService: WorkspaceScannerService;
  let mockParserService: jest.Mocked<ParserService>;
  let mockWorkspaceFolders: vscode.WorkspaceFolder[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockParserService = {
      parseFile: jest.fn().mockResolvedValue([]),
      scanWorkspace: jest.fn(),
      analyzeEndpoint: jest.fn(),
      extractConvergeCode: jest.fn(),
      getPatternStatistics: jest.fn(),
      clearScanCache: jest.fn(),
      getScanCacheStatistics: jest.fn(),
      getScanRecommendations: jest.fn()
    } as any;

    mockWorkspaceFolders = [
      {
        uri: { fsPath: '/test/workspace' } as vscode.Uri,
        name: 'test-workspace',
        index: 0
      }
    ];

    // Mock vscode.workspace.workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: mockWorkspaceFolders,
      configurable: true
    });

    scannerService = new WorkspaceScannerService(mockParserService);
  });

  describe('scanWorkspace', () => {
    it('should return empty result when no workspace folders', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: null,
        configurable: true
      });

      const result = await scannerService.scanWorkspace();
      
      expect(result.endpoints).toEqual([]);
      expect(result.totalFiles).toBe(0);
      expect(result.scannedFiles).toBe(0);
    });

    it('should scan workspace with progress reporting', async () => {
      const mockEndpoint = {
        id: '1',
        filePath: '/test/workspace/api.js',
        lineNumber: 10,
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS,
        code: 'fetch("/hosted-payments/transaction_token")',
        sslFields: ['ssl_amount']
      };

      mockGlob.mockResolvedValue(['api.js', 'payment.ts']);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1000, mtime: new Date() });
      mockParserService.parseFile.mockResolvedValue([mockEndpoint]);

      const progressUpdates: ScanProgress[] = [];
      const result = await scannerService.scanWorkspace({
        progressCallback: (progress) => progressUpdates.push(progress)
      });

      expect(result.endpoints).toHaveLength(2); // One endpoint per file
      expect(result.scannedFiles).toBe(2);
      expect(result.totalFiles).toBe(2);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].phase).toBe('complete');
    });

    it('should use cache when enabled', async () => {
      const mockEndpoint = {
        id: '1',
        filePath: '/test/workspace/api.js',
        lineNumber: 10,
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS,
        code: 'fetch("/hosted-payments/transaction_token")',
        sslFields: ['ssl_amount']
      };

      mockGlob.mockResolvedValue(['api.js']);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ 
        size: 1000, 
        mtime: new Date('2024-01-01') 
      });
      mockParserService.parseFile.mockResolvedValue([mockEndpoint]);

      // First scan
      await scannerService.scanWorkspace({ useCache: true });
      expect(mockParserService.parseFile).toHaveBeenCalledTimes(1);

      // Second scan should use cache
      const result2 = await scannerService.scanWorkspace({ useCache: true });
      expect(mockParserService.parseFile).toHaveBeenCalledTimes(1); // No additional calls
      expect(result2.cacheHits).toBe(1);
    });

    it('should handle file parsing errors gracefully', async () => {
      mockGlob.mockResolvedValue(['error.js', 'good.js']);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1000, mtime: new Date() });
      
      mockParserService.parseFile
        .mockRejectedValueOnce(new Error('Parse error'))
        .mockResolvedValueOnce([]);

      const result = await scannerService.scanWorkspace();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Parse error');
      expect(result.skippedFiles).toBe(1);
      expect(result.scannedFiles).toBe(1);
    });

    it('should respect cancellation token', async () => {
      const mockToken = {
        isCancellationRequested: false
      } as vscode.CancellationToken;

      mockGlob.mockResolvedValue(['file1.js', 'file2.js', 'file3.js']);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1000, mtime: new Date() });
      
      // Mock cancellation after first file
      mockParserService.parseFile.mockImplementation(async () => {
        mockToken.isCancellationRequested = true;
        return [];
      });

      await scannerService.scanWorkspace({ 
        cancellationToken: mockToken 
      });

      // Should stop early due to cancellation
      expect(mockParserService.parseFile).toHaveBeenCalledTimes(1);
    });

    it('should filter files by size', async () => {
      mockGlob.mockResolvedValue(['small.js', 'large.js']);
      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce({ size: 500, mtime: new Date() })    // small file
        .mockResolvedValueOnce({ size: 2000000, mtime: new Date() }); // large file (2MB)

      const result = await scannerService.scanWorkspace({ 
        maxFileSize: 1024 * 1024 // 1MB limit
      });

      expect(mockParserService.parseFile).toHaveBeenCalledTimes(1); // Only small file
      expect(mockParserService.parseFile).toHaveBeenCalledWith(expect.stringContaining('small.js'));
    });
  });

  describe('scanFiles', () => {
    it('should scan specific files', async () => {
      const filePaths = ['/test/file1.js', '/test/file2.ts'];
      const mockEndpoint = {
        id: '1',
        filePath: '/test/file1.js',
        lineNumber: 5,
        endpointType: ConvergeEndpointType.PROCESS_TRANSACTION,
        code: 'ssl_amount = "10.00"',
        sslFields: ['ssl_amount']
      };

      (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1000, mtime: new Date() });
      mockParserService.parseFile
        .mockResolvedValueOnce([mockEndpoint])
        .mockResolvedValueOnce([]);

      const result = await scannerService.scanFiles(filePaths);

      expect(result.endpoints).toHaveLength(1);
      expect(result.scannedFiles).toBe(2);
      expect(result.totalFiles).toBe(2);
      expect(mockParserService.parseFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('getScanRecommendations', () => {
    it('should provide scan recommendations', async () => {
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        'node_modules', 'src', 'dist', 'package.json'
      ]);
      mockGlob.mockResolvedValue(['src/file1.js', 'src/file2.ts']);

      const recommendations = await scannerService.getScanRecommendations();

      expect(recommendations.estimatedFileCount).toBeGreaterThan(0);
      expect(recommendations.recommendedIgnorePatterns).toContain('**/node_modules/**');
      expect(recommendations.estimatedScanTime).toBeGreaterThan(0);
    });

    it('should detect large directories', async () => {
      (fs.promises.readdir as jest.Mock).mockResolvedValue(['large-dir', 'small-dir']);
      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => true });
      
      // Mock large directory with many files
      mockGlob
        .mockResolvedValueOnce(['src/file1.js', 'src/file2.ts']) // Initial workspace scan
        .mockResolvedValueOnce(Array(150).fill(0).map((_, i) => `file${i}.js`)) // large-dir
        .mockResolvedValueOnce(['file1.js', 'file2.js']); // small-dir

      const recommendations = await scannerService.getScanRecommendations();

      expect(recommendations.largeDirectories).toHaveLength(1);
      expect(recommendations.largeDirectories[0].path).toBe('large-dir');
      expect(recommendations.largeDirectories[0].fileCount).toBe(150);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      scannerService.clearCache();
      // Should not throw error
      expect(true).toBe(true);
    });

    it('should provide cache statistics', () => {
      const stats = scannerService.getCacheStatistics();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalEndpoints');
      expect(stats).toHaveProperty('cacheSize');
    });
  });

  describe('error handling', () => {
    it('should handle glob errors gracefully', async () => {
      mockGlob.mockRejectedValue(new Error('Glob error'));

      const result = await scannerService.scanWorkspace();

      expect(result.endpoints).toEqual([]);
      expect(result.errors.length).toBe(0); // Glob errors are handled internally
    });

    it('should handle file stat errors gracefully', async () => {
      mockGlob.mockResolvedValue(['error-file.js']);
      (fs.promises.stat as jest.Mock).mockRejectedValue(new Error('Stat error'));

      const result = await scannerService.scanWorkspace();

      // Should continue scanning despite stat errors
      expect(result.totalFiles).toBe(0); // File filtered out due to stat error
    });
  });
});