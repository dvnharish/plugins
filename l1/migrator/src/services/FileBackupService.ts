import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface for backup metadata
 */
export interface BackupMetadata {
  id: string;
  originalPath: string;
  backupPath: string;
  timestamp: Date;
  fileHash: string;
  size: number;
  migrationId?: string;
  description?: string;
}

/**
 * Interface for backup statistics
 */
export interface BackupStatistics {
  totalBackups: number;
  totalSize: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  backupsByFile: Map<string, BackupMetadata[]>;
}

/**
 * Service for managing file backups during migrations
 */
export class FileBackupService {
  private readonly backupDir: string;
  private readonly metadataFile: string;
  private backups: Map<string, BackupMetadata[]> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {
    this.backupDir = path.join(context.globalStorageUri.fsPath, 'backups');
    this.metadataFile = path.join(this.backupDir, 'backup-metadata.json');
    this.ensureBackupDirectory();
    this.loadBackupMetadata();
  }

  /**
   * Create a backup of a file before migration
   */
  public async createBackup(
    filePath: string,
    options: {
      migrationId?: string;
      description?: string;
      createDirectory?: boolean;
    } = {}
  ): Promise<BackupMetadata> {
    const {
      migrationId,
      description,
      createDirectory = true
    } = options;

    try {
      // Read original file
      const originalContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      const originalText = Buffer.from(originalContent).toString('utf8');
      
      // Calculate file hash
      const fileHash = this.calculateFileHash(originalText);
      
      // Generate backup path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName);
      const baseName = path.basename(fileName, fileExt);
      const backupFileName = `${baseName}.backup.${timestamp}${fileExt}`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Create backup directory if needed
      if (createDirectory) {
        await this.ensureBackupDirectory();
      }

      // Write backup file
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(backupPath),
        originalContent
      );

      // Create backup metadata
      const backupMetadata: BackupMetadata = {
        id: this.generateBackupId(),
        originalPath: filePath,
        backupPath,
        timestamp: new Date(),
        fileHash,
        size: originalContent.length,
        migrationId: migrationId || '',
        description: description || ''
      };

      // Store metadata
      this.addBackupMetadata(backupMetadata);
      await this.saveBackupMetadata();

      return backupMetadata;

    } catch (error) {
      throw new Error(`Failed to create backup for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore a file from backup
   */
  public async restoreFromBackup(backupMetadata: BackupMetadata): Promise<boolean> {
    try {
      // Check if backup file exists
      const backupExists = await this.fileExists(backupMetadata.backupPath);
      if (!backupExists) {
        throw new Error(`Backup file not found: ${backupMetadata.backupPath}`);
      }

      // Read backup content
      const backupContent = await vscode.workspace.fs.readFile(vscode.Uri.file(backupMetadata.backupPath));
      
      // Write to original location
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(backupMetadata.originalPath),
        backupContent
      );

      // Verify restoration
      const restoredContent = await vscode.workspace.fs.readFile(vscode.Uri.file(backupMetadata.originalPath));
      const restoredText = Buffer.from(restoredContent).toString('utf8');
      const restoredHash = this.calculateFileHash(restoredText);

      if (restoredHash !== backupMetadata.fileHash) {
        throw new Error('File hash mismatch after restoration');
      }

      return true;

    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Get all backups for a specific file
   */
  public getBackupsForFile(filePath: string): BackupMetadata[] {
    return this.backups.get(filePath) || [];
  }

  /**
   * Get the most recent backup for a file
   */
  public getLatestBackup(filePath: string): BackupMetadata | null {
    const backups = this.getBackupsForFile(filePath);
    if (backups.length === 0) {
      return null;
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  /**
   * Get backup by ID
   */
  public getBackupById(backupId: string): BackupMetadata | null {
    for (const backups of this.backups.values()) {
      const backup = backups.find(b => b.id === backupId);
      if (backup) {
        return backup;
      }
    }
    return null;
  }

  /**
   * Delete a specific backup
   */
  public async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backup = this.getBackupById(backupId);
      if (!backup) {
        return false;
      }

      // Delete backup file
      const backupExists = await this.fileExists(backup.backupPath);
      if (backupExists) {
        await vscode.workspace.fs.delete(vscode.Uri.file(backup.backupPath));
      }

      // Remove from metadata
      const fileBackups = this.backups.get(backup.originalPath);
      if (fileBackups) {
        const index = fileBackups.findIndex(b => b.id === backupId);
        if (index !== -1) {
          fileBackups.splice(index, 1);
          if (fileBackups.length === 0) {
            this.backups.delete(backup.originalPath);
          }
        }
      }

      await this.saveBackupMetadata();
      return true;

    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Clean up old backups (keep only the last N backups per file)
   */
  public async cleanupOldBackups(maxBackupsPerFile: number = 5): Promise<number> {
    let deletedCount = 0;

    try {
      for (const [filePath, backups] of this.backups.entries()) {
        if (backups.length > maxBackupsPerFile) {
          // Sort by timestamp (newest first)
          const sortedBackups = backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          // Keep only the most recent ones
          const toDelete = sortedBackups.slice(maxBackupsPerFile);
          
          for (const backup of toDelete) {
            const deleted = await this.deleteBackup(backup.id);
            if (deleted) {
              deletedCount++;
            }
          }
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      return deletedCount;
    }
  }

  /**
   * Get backup statistics
   */
  public getBackupStatistics(): BackupStatistics {
    const allBackups: BackupMetadata[] = [];
    for (const backups of this.backups.values()) {
      allBackups.push(...backups);
    }

    const totalBackups = allBackups.length;
    const totalSize = allBackups.reduce((sum, backup) => sum + backup.size, 0);
    
    const timestamps = allBackups.map(b => b.timestamp.getTime());
    const oldestBackup = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
    const newestBackup = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

    return {
      totalBackups,
      totalSize,
      oldestBackup,
      newestBackup,
      backupsByFile: new Map(this.backups)
    };
  }

  /**
   * Export all backup metadata
   */
  public exportBackupMetadata(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalBackups: this.getBackupStatistics().totalBackups,
      backups: Array.from(this.backups.entries()).map(([filePath, backups]) => ({
        filePath,
        backups: backups.map(backup => ({
          ...backup,
          timestamp: backup.timestamp.toISOString()
        }))
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import backup metadata
   */
  public async importBackupMetadata(metadataJson: string): Promise<boolean> {
    try {
      const data = JSON.parse(metadataJson);
      
      if (data.backups && Array.isArray(data.backups)) {
        this.backups.clear();
        
        for (const fileData of data.backups) {
          const filePath = fileData.filePath;
          const backups = fileData.backups.map((backup: any) => ({
            ...backup,
            timestamp: new Date(backup.timestamp)
          }));
          
          this.backups.set(filePath, backups);
        }
        
        await this.saveBackupMetadata();
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('Failed to import backup metadata:', error);
      return false;
    }
  }

  /**
   * Clear all backups
   */
  public async clearAllBackups(): Promise<number> {
    let deletedCount = 0;

    try {
      // Delete all backup files
      for (const backups of this.backups.values()) {
        for (const backup of backups) {
          const backupExists = await this.fileExists(backup.backupPath);
          if (backupExists) {
            await vscode.workspace.fs.delete(vscode.Uri.file(backup.backupPath));
            deletedCount++;
          }
        }
      }

      // Clear metadata
      this.backups.clear();
      await this.saveBackupMetadata();

      return deletedCount;

    } catch (error) {
      console.error('Failed to clear all backups:', error);
      return deletedCount;
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(this.backupDir));
    } catch (error) {
      // Directory might already exist, which is fine
    }
  }

  /**
   * Load backup metadata from storage
   */
  private async loadBackupMetadata(): Promise<void> {
    try {
      const metadataExists = await this.fileExists(this.metadataFile);
      if (!metadataExists) {
        return;
      }

      const metadataContent = await vscode.workspace.fs.readFile(vscode.Uri.file(this.metadataFile));
      const metadata = JSON.parse(Buffer.from(metadataContent).toString('utf8'));

      if (metadata.backups && Array.isArray(metadata.backups)) {
        this.backups.clear();
        
        for (const fileData of metadata.backups) {
          const filePath = fileData.filePath;
          const backups = fileData.backups.map((backup: any) => ({
            ...backup,
            timestamp: new Date(backup.timestamp)
          }));
          
          this.backups.set(filePath, backups);
        }
      }

    } catch (error) {
      console.warn('Failed to load backup metadata:', error);
      this.backups.clear();
    }
  }

  /**
   * Save backup metadata to storage
   */
  private async saveBackupMetadata(): Promise<void> {
    try {
      const metadata = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        backups: Array.from(this.backups.entries()).map(([filePath, backups]) => ({
          filePath,
          backups: backups.map(backup => ({
            ...backup,
            timestamp: backup.timestamp.toISOString()
          }))
        }))
      };

      const metadataJson = JSON.stringify(metadata, null, 2);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(this.metadataFile),
        Buffer.from(metadataJson, 'utf8')
      );

    } catch (error) {
      console.error('Failed to save backup metadata:', error);
    }
  }

  /**
   * Add backup metadata to the collection
   */
  private addBackupMetadata(backup: BackupMetadata): void {
    const filePath = backup.originalPath;
    if (!this.backups.has(filePath)) {
      this.backups.set(filePath, []);
    }
    this.backups.get(filePath)!.push(backup);
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate file hash
   */
  private calculateFileHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
