import { FileBackupService, BackupMetadata } from '../../services/FileBackupService';
import * as vscode from 'vscode';

// Mock VS Code workspace
jest.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      delete: jest.fn(),
      stat: jest.fn()
    }
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path }))
  }
}));

// Mock VS Code context
const mockContext = {
  globalStorageUri: {
    fsPath: '/mock/storage'
  }
} as any;

describe('FileBackupService', () => {
  let fileBackupService: FileBackupService;

  beforeEach(() => {
    jest.clearAllMocks();
    fileBackupService = new FileBackupService(mockContext);
  });

  describe('Backup Creation', () => {
    test('should create backup successfully', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const backup = await fileBackupService.createBackup(filePath, {
        migrationId: 'test-migration',
        description: 'Test backup'
      });

      expect(backup).toBeDefined();
      expect(backup.originalPath).toBe(filePath);
      expect(backup.migrationId).toBe('test-migration');
      expect(backup.description).toBe('Test backup');
      expect(backup.fileHash).toBeDefined();
      expect(backup.size).toBe(fileContent.length);
    });

    test('should create backup with default options', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const backup = await fileBackupService.createBackup(filePath);

      expect(backup).toBeDefined();
      expect(backup.originalPath).toBe(filePath);
      expect(backup.migrationId).toBeUndefined();
      expect(backup.description).toBeUndefined();
    });

    test('should handle backup creation failure', async () => {
      const filePath = '/test/file.js';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      await expect(fileBackupService.createBackup(filePath)).rejects.toThrow('Failed to create backup');
    });
  });

  describe('Backup Retrieval', () => {
    test('should get backups for file', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Create multiple backups
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-1' });
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-2' });

      const backups = fileBackupService.getBackupsForFile(filePath);
      expect(backups.length).toBe(2);
    });

    test('should return empty array for file with no backups', () => {
      const backups = fileBackupService.getBackupsForFile('/non-existent/file.js');
      expect(backups).toEqual([]);
    });

    test('should get latest backup for file', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Create multiple backups with delay
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-1' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-2' });

      const latestBackup = fileBackupService.getLatestBackup(filePath);
      expect(latestBackup).toBeDefined();
      expect(latestBackup?.migrationId).toBe('migration-2');
    });

    test('should return null for file with no backups', () => {
      const latestBackup = fileBackupService.getLatestBackup('/non-existent/file.js');
      expect(latestBackup).toBeNull();
    });

    test('should get backup by ID', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const backup = await fileBackupService.createBackup(filePath, { migrationId: 'test-migration' });
      const retrievedBackup = fileBackupService.getBackupById(backup.id);

      expect(retrievedBackup).toBeDefined();
      expect(retrievedBackup?.id).toBe(backup.id);
    });

    test('should return null for non-existent backup ID', () => {
      const backup = fileBackupService.getBackupById('non-existent-id');
      expect(backup).toBeNull();
    });
  });

  describe('Backup Restoration', () => {
    test('should restore from backup successfully', async () => {
      const filePath = '/test/file.js';
      const originalContent = 'console.log("original");';
      const backupContent = 'console.log("backup");';
      
      (vscode.workspace.fs.readFile as jest.Mock)
        .mockResolvedValueOnce(Buffer.from(originalContent)) // Initial read
        .mockResolvedValueOnce(Buffer.from(backupContent))   // Backup read
        .mockResolvedValueOnce(Buffer.from(backupContent));  // Restored read
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});

      const backup = await fileBackupService.createBackup(filePath);
      const success = await fileBackupService.restoreFromBackup(backup);

      expect(success).toBe(true);
    });

    test('should fail restoration when backup file does not exist', async () => {
      const mockBackup: BackupMetadata = {
        id: 'test-backup',
        originalPath: '/test/file.js',
        backupPath: '/non-existent/backup.js',
        timestamp: new Date(),
        fileHash: 'hash123',
        size: 100
      };

      (vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));

      const success = await fileBackupService.restoreFromBackup(mockBackup);
      expect(success).toBe(false);
    });

    test('should fail restoration when file hash mismatch', async () => {
      const filePath = '/test/file.js';
      const originalContent = 'console.log("original");';
      const backupContent = 'console.log("backup");';
      const restoredContent = 'console.log("different");';
      
      (vscode.workspace.fs.readFile as jest.Mock)
        .mockResolvedValueOnce(Buffer.from(originalContent)) // Initial read
        .mockResolvedValueOnce(Buffer.from(backupContent))   // Backup read
        .mockResolvedValueOnce(Buffer.from(restoredContent)); // Restored read (different)
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});

      const backup = await fileBackupService.createBackup(filePath);
      const success = await fileBackupService.restoreFromBackup(backup);

      expect(success).toBe(false);
    });
  });

  describe('Backup Deletion', () => {
    test('should delete backup successfully', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});
      (vscode.workspace.fs.delete as jest.Mock).mockResolvedValue(undefined);

      const backup = await fileBackupService.createBackup(filePath);
      const success = await fileBackupService.deleteBackup(backup.id);

      expect(success).toBe(true);
    });

    test('should fail to delete non-existent backup', async () => {
      const success = await fileBackupService.deleteBackup('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('Backup Cleanup', () => {
    test('should cleanup old backups', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});
      (vscode.workspace.fs.delete as jest.Mock).mockResolvedValue(undefined);

      // Create more backups than the limit
      for (let i = 0; i < 7; i++) {
        await fileBackupService.createBackup(filePath, { migrationId: `migration-${i}` });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const deletedCount = await fileBackupService.cleanupOldBackups(5);
      expect(deletedCount).toBeGreaterThan(0);

      const remainingBackups = fileBackupService.getBackupsForFile(filePath);
      expect(remainingBackups.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Backup Statistics', () => {
    test('should get backup statistics', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await fileBackupService.createBackup(filePath, { migrationId: 'migration-1' });
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-2' });

      const stats = fileBackupService.getBackupStatistics();

      expect(stats.totalBackups).toBeGreaterThanOrEqual(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBeInstanceOf(Date);
      expect(stats.newestBackup).toBeInstanceOf(Date);
      expect(stats.backupsByFile.has(filePath)).toBe(true);
    });
  });

  describe('Export/Import', () => {
    test('should export backup metadata', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await fileBackupService.createBackup(filePath, { migrationId: 'test-migration' });

      const exportData = fileBackupService.exportBackupMetadata();
      const parsed = JSON.parse(exportData);

      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('totalBackups');
      expect(parsed).toHaveProperty('backups');
      expect(Array.isArray(parsed.backups)).toBe(true);
    });

    test('should import backup metadata', () => {
      const importData = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalBackups: 1,
        backups: [{
          filePath: '/test/file.js',
          backups: [{
            id: 'imported-backup',
            originalPath: '/test/file.js',
            backupPath: '/backup/file.js',
            timestamp: new Date().toISOString(),
            fileHash: 'hash123',
            size: 100
          }]
        }]
      });

      const success = fileBackupService.importBackupMetadata(importData);
      expect(success).toBe(true);

      const backups = fileBackupService.getBackupsForFile('/test/file.js');
      expect(backups.length).toBe(1);
    });

    test('should fail to import invalid metadata', () => {
      const success = fileBackupService.importBackupMetadata('invalid json');
      expect(success).toBe(false);
    });
  });

  describe('Clear All Backups', () => {
    test('should clear all backups', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({});
      (vscode.workspace.fs.delete as jest.Mock).mockResolvedValue(undefined);

      await fileBackupService.createBackup(filePath, { migrationId: 'migration-1' });
      await fileBackupService.createBackup(filePath, { migrationId: 'migration-2' });

      const deletedCount = await fileBackupService.clearAllBackups();
      expect(deletedCount).toBeGreaterThan(0);

      const backups = fileBackupService.getBackupsForFile(filePath);
      expect(backups.length).toBe(0);
    });
  });

  describe('File Hash Calculation', () => {
    test('should calculate consistent file hash', async () => {
      const filePath = '/test/file.js';
      const fileContent = 'console.log("test");';
      
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(fileContent));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const backup1 = await fileBackupService.createBackup(filePath);
      const backup2 = await fileBackupService.createBackup(filePath);

      expect(backup1.fileHash).toBe(backup2.fileHash);
    });

    test('should calculate different hashes for different content', async () => {
      const filePath1 = '/test/file1.js';
      const filePath2 = '/test/file2.js';
      const content1 = 'console.log("test1");';
      const content2 = 'console.log("test2");';
      
      (vscode.workspace.fs.readFile as jest.Mock)
        .mockResolvedValueOnce(Buffer.from(content1))
        .mockResolvedValueOnce(Buffer.from(content2));
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const backup1 = await fileBackupService.createBackup(filePath1);
      const backup2 = await fileBackupService.createBackup(filePath2);

      expect(backup1.fileHash).not.toBe(backup2.fileHash);
    });
  });
});
