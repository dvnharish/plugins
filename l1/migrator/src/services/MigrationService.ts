import * as vscode from 'vscode';
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';
import { EndpointMapping } from '../types/EndpointMapping';
import { CopilotService, CopilotRequest, CopilotResponse } from './CopilotService';
import { MappingService } from './MappingService';
import { ValidationService } from './ValidationService';
import { CredentialService } from './CredentialService';
import { ParserService } from './ParserService';
import { FileBackupService } from './FileBackupService';

/**
 * Interface for migration progress
 */
export interface MigrationProgress {
  phase: 'analyzing' | 'generating' | 'validating' | 'applying' | 'complete';
  progress: number;
  message: string;
  details?: string;
}

/**
 * Interface for migration result
 */
export interface MigrationResult {
  success: boolean;
  originalCode: string;
  migratedCode: string;
  diff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  validationResult?: any;
  error?: string;
  metadata: {
    endpointType: string;
    confidence: number;
    migrationTime: number;
    filePath: string;
    lineNumber: number;
  };
}

/**
 * Interface for migration history entry
 */
export interface MigrationHistoryEntry {
  id: string;
  timestamp: Date;
  filePath: string;
  lineNumber: number;
  endpointType: string;
  originalCode: string;
  migratedCode: string;
  success: boolean;
  error?: string;
  rollbackData?: {
    originalContent: string;
    fileHash: string;
  };
}

/**
 * Interface for bulk migration progress
 */
export interface BulkMigrationProgress {
  phase: 'preparing' | 'migrating' | 'validating' | 'applying' | 'complete';
  currentEndpoint: number;
  totalEndpoints: number;
  progress: number;
  message: string;
  details?: string;
  completedMigrations: MigrationResult[];
  failedMigrations: Array<{ endpoint: ConvergeEndpoint; error: string }>;
}

/**
 * Interface for bulk migration result
 */
export interface BulkMigrationResult {
  success: boolean;
  totalEndpoints: number;
  successfulMigrations: number;
  failedMigrations: number;
  results: MigrationResult[];
  errors: Array<{ endpoint: ConvergeEndpoint; error: string }>;
  summary: {
    totalTime: number;
    averageConfidence: number;
    filesModified: string[];
  };
}

/**
 * Service for handling individual and bulk migrations
 */
export class MigrationService {
  private migrationHistory: MigrationHistoryEntry[] = [];
  private readonly historyKey = 'converge-elavon.migrationHistory';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly copilotService: CopilotService,
    private readonly mappingService: MappingService,
    private readonly validationService: ValidationService,
    private readonly credentialService: CredentialService,
    private readonly parserService: ParserService
  ) {
    this.fileBackupService = new FileBackupService(context);
    this.loadMigrationHistory();
  }

  private readonly fileBackupService: FileBackupService;

  /**
   * Migrate a single Converge endpoint to Elavon
   */
  public async migrateEndpoint(
    endpoint: ConvergeEndpoint,
    options: {
      validateAfterMigration?: boolean;
      createBackup?: boolean;
      progressCallback?: (progress: MigrationProgress) => void;
    } = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const {
      validateAfterMigration = true,
      createBackup = true,
      progressCallback
    } = options;

    try {
      // Phase 1: Analyzing
      progressCallback?.({
        phase: 'analyzing',
        progress: 10,
        message: 'Analyzing Converge endpoint...',
        details: `Processing ${endpoint.endpointType} at line ${endpoint.lineNumber}`
      });

      const mapping = await this.mappingService.getMappingForEndpoint(endpoint.endpointType);
      if (!mapping) {
        throw new Error(`No mapping found for endpoint type: ${endpoint.endpointType}`);
      }

      // Phase 2: Generating migrated code
      progressCallback?.({
        phase: 'generating',
        progress: 30,
        message: 'Generating Elavon code with AI...',
        details: 'Using GitHub Copilot to transform the code'
      });

      const migratedCode = await this.generateMigratedCode(endpoint, mapping);
      
      // Phase 3: Validating (if requested)
      let validationResult;
      if (validateAfterMigration) {
        progressCallback?.({
          phase: 'validating',
          progress: 70,
          message: 'Validating migrated code...',
          details: 'Testing against Elavon sandbox'
        });

        const credentials = await this.credentialService.retrieveCredentials();
        if (credentials) {
          validationResult = await this.validationService.testEndpoint(migratedCode, credentials);
        }
      }

      // Phase 4: Applying migration
      progressCallback?.({
        phase: 'applying',
        progress: 90,
        message: 'Applying migration...',
        details: 'Updating file with migrated code'
      });

      const result: MigrationResult = {
        success: true,
        originalCode: endpoint.code,
        migratedCode,
        diff: this.calculateDiff(endpoint.code, migratedCode),
        validationResult,
        metadata: {
          endpointType: endpoint.endpointType,
          confidence: this.calculateConfidence(endpoint, mapping),
          migrationTime: Date.now() - startTime,
          filePath: endpoint.filePath,
          lineNumber: endpoint.lineNumber
        }
      };

      // Create backup if requested
      if (createBackup) {
        await this.fileBackupService.createBackup(endpoint.filePath, {
          migrationId: endpoint.id,
          description: `Migration of ${endpoint.endpointType} endpoint`
        });
      }

      // Apply the migration
      await this.applyMigration(endpoint, migratedCode);

      // Record in history
      this.recordMigrationHistory(endpoint, migratedCode, result);

      progressCallback?.({
        phase: 'complete',
        progress: 100,
        message: 'Migration completed successfully!',
        details: `Migrated ${endpoint.endpointType} in ${result.metadata.migrationTime}ms`
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Record failed migration
      this.recordMigrationHistory(endpoint, '', {
        success: false,
        originalCode: endpoint.code,
        migratedCode: '',
        diff: { added: [], removed: [], modified: [] },
        error: errorMessage,
        metadata: {
          endpointType: endpoint.endpointType,
          confidence: 0,
          migrationTime: Date.now() - startTime,
          filePath: endpoint.filePath,
          lineNumber: endpoint.lineNumber
        }
      });

      throw new Error(`Migration failed: ${errorMessage}`);
    }
  }

  /**
   * Generate migrated code using Copilot and mapping rules
   */
  private async generateMigratedCode(
    endpoint: ConvergeEndpoint,
    mapping: EndpointMapping
  ): Promise<string> {
    // Prepare mapping rules for Copilot
    const mappingRules = Object.entries(mapping.fieldMappings)
      .map(([converge, elavon]) => `${converge} → ${elavon}`)
      .join('\n');

    // Create Copilot request
    const request: CopilotRequest = {
      prompt: endpoint.code,
      language: this.getLanguageFromFilePath(endpoint.filePath),
      context: {
        filePath: endpoint.filePath,
        lineNumber: endpoint.lineNumber,
        endpointType: endpoint.endpointType,
        mappingRules: [mappingRules],
        surroundingCode: await this.getSurroundingCode(endpoint)
      },
      options: {
        maxTokens: 2000,
        temperature: 0.3
      }
    };

    // Generate code using Copilot
    const response: CopilotResponse = await this.copilotService.generateCode(request);
    
    if (!response.success || !response.code) {
      throw new Error(`Code generation failed: ${response.error || 'No code generated'}`);
    }

    return response.code;
  }

  /**
   * Calculate diff between original and migrated code
   */
  private calculateDiff(originalCode: string, migratedCode: string): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const originalLines = originalCode.split('\n');
    const migratedLines = migratedCode.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Simple line-by-line diff (could be enhanced with a proper diff library)
    const maxLines = Math.max(originalLines.length, migratedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const migratedLine = migratedLines[i] || '';
      
      if (i >= originalLines.length) {
        added.push(migratedLine);
      } else if (i >= migratedLines.length) {
        removed.push(originalLine);
      } else if (originalLine !== migratedLine) {
        modified.push(`${originalLine} → ${migratedLine}`);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Calculate confidence score for migration
   */
  private calculateConfidence(endpoint: ConvergeEndpoint, mapping: EndpointMapping): number {
    let confidence = 0.5; // Base confidence

    // More SSL fields = higher confidence
    confidence += Math.min(endpoint.sslFields.length * 0.05, 0.3);

    // Better mapping coverage = higher confidence
    const mappedFields = endpoint.sslFields.filter(field => 
      Object.keys(mapping.fieldMappings).includes(field)
    ).length;
    confidence += (mappedFields / endpoint.sslFields.length) * 0.2;

    return Math.min(confidence, 1.0);
  }

  /**
   * Get language from file path
   */
  private getLanguageFromFilePath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'php': 'php',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'rb': 'ruby',
      'go': 'go',
      'cpp': 'cpp',
      'c': 'c'
    };
    return languageMap[extension] || 'javascript';
  }

  /**
   * Get surrounding code context
   */
  private async getSurroundingCode(endpoint: ConvergeEndpoint): Promise<string> {
    try {
      const document = await vscode.workspace.openTextDocument(endpoint.filePath);
      const startLine = Math.max(0, endpoint.lineNumber - 6);
      const endLine = Math.min(document.lineCount - 1, endpoint.lineNumber + 4);
      
      return document.getText(
        new vscode.Range(
          new vscode.Position(startLine, 0),
          new vscode.Position(endLine, 0)
        )
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * Get file backup service
   */
  public getFileBackupService(): FileBackupService {
    return this.fileBackupService;
  }

  /**
   * Apply migration to file
   */
  private async applyMigration(endpoint: ConvergeEndpoint, migratedCode: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(endpoint.filePath);
    const editor = await vscode.window.showTextDocument(document);
    
    // Find the exact range of the original code
    const originalCode = endpoint.code;
    const documentText = document.getText();
    const startIndex = documentText.indexOf(originalCode);
    
    if (startIndex === -1) {
      throw new Error('Could not locate original code in file');
    }
    
    const endIndex = startIndex + originalCode.length;
    const startPosition = document.positionAt(startIndex);
    const endPosition = document.positionAt(endIndex);
    
    // Replace the code
    await editor.edit(editBuilder => {
      editBuilder.replace(new vscode.Range(startPosition, endPosition), migratedCode);
    });
  }

  /**
   * Record migration in history
   */
  private recordMigrationHistory(
    endpoint: ConvergeEndpoint,
    migratedCode: string,
    result: MigrationResult
  ): void {
    const entry: MigrationHistoryEntry = {
      id: endpoint.id,
      timestamp: new Date(),
      filePath: endpoint.filePath,
      lineNumber: endpoint.lineNumber,
      endpointType: endpoint.endpointType,
      originalCode: endpoint.code,
      migratedCode,
      success: result.success,
      error: result.error || '',
      rollbackData: result.success ? {
        originalContent: endpoint.code,
        fileHash: this.calculateFileHash(endpoint.code)
      } : {
        originalContent: endpoint.code,
        fileHash: this.calculateFileHash(endpoint.code)
      }
    };

    this.migrationHistory.unshift(entry);
    
    // Keep only last 100 migrations
    if (this.migrationHistory.length > 100) {
      this.migrationHistory = this.migrationHistory.slice(0, 100);
    }

    this.saveMigrationHistory();
  }

  /**
   * Calculate simple hash for file content
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
   * Load migration history from storage
   */
  private loadMigrationHistory(): void {
    try {
      const stored = this.context.globalState.get<string>(this.historyKey);
      if (stored) {
        this.migrationHistory = JSON.parse(stored).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load migration history:', error);
      this.migrationHistory = [];
    }
  }

  /**
   * Save migration history to storage
   */
  private saveMigrationHistory(): void {
    try {
      this.context.globalState.update(this.historyKey, JSON.stringify(this.migrationHistory));
    } catch (error) {
      console.warn('Failed to save migration history:', error);
    }
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): MigrationHistoryEntry[] {
    return [...this.migrationHistory];
  }

  /**
   * Rollback a migration
   */
  public async rollbackMigration(historyEntry: MigrationHistoryEntry): Promise<boolean> {
    try {
      if (!historyEntry.rollbackData) {
        throw new Error('No rollback data available for this migration');
      }

      const document = await vscode.workspace.openTextDocument(historyEntry.filePath);
      const editor = await vscode.window.showTextDocument(document);
      
      // Find the migrated code and replace with original
      const documentText = document.getText();
      const startIndex = documentText.indexOf(historyEntry.migratedCode);
      
      if (startIndex === -1) {
        throw new Error('Could not locate migrated code in file');
      }
      
      const endIndex = startIndex + historyEntry.migratedCode.length;
      const startPosition = document.positionAt(startIndex);
      const endPosition = document.positionAt(endIndex);
      
      await editor.edit(editBuilder => {
        editBuilder.replace(new vscode.Range(startPosition, endPosition), historyEntry.originalCode);
      });

      // Update history entry
      historyEntry.success = false;
      historyEntry.error = 'Rolled back';
      this.saveMigrationHistory();

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Clear migration history
   */
  public clearMigrationHistory(): void {
    this.migrationHistory = [];
    this.saveMigrationHistory();
  }


  /**
   * Migrate multiple endpoints in bulk
   */
  public async migrateEndpointsBulk(
    endpoints: ConvergeEndpoint[],
    options: {
      validateAfterMigration?: boolean;
      createBackup?: boolean;
      stopOnError?: boolean;
      progressCallback?: (progress: BulkMigrationProgress) => void;
      cancellationToken?: vscode.CancellationToken;
    } = {}
  ): Promise<BulkMigrationResult> {
    const startTime = Date.now();
    const {
      validateAfterMigration = true,
      createBackup = true,
      stopOnError = false,
      progressCallback,
      cancellationToken
    } = options;

    const results: MigrationResult[] = [];
    const errors: Array<{ endpoint: ConvergeEndpoint; error: string }> = [];
    const filesModified = new Set<string>();

    try {
      // Phase 1: Preparing
      progressCallback?.({
        phase: 'preparing',
        currentEndpoint: 0,
        totalEndpoints: endpoints.length,
        progress: 0,
        message: 'Preparing bulk migration...',
        details: `Found ${endpoints.length} endpoints to migrate`,
        completedMigrations: [],
        failedMigrations: []
      });

      // Group endpoints by file for efficient processing
      const endpointsByFile = new Map<string, ConvergeEndpoint[]>();
      for (const endpoint of endpoints) {
        if (!endpointsByFile.has(endpoint.filePath)) {
          endpointsByFile.set(endpoint.filePath, []);
        }
        endpointsByFile.get(endpoint.filePath)!.push(endpoint);
      }

      // Phase 2: Migrating
      for (let i = 0; i < endpoints.length; i++) {
        if (cancellationToken?.isCancellationRequested) {
          break;
        }

        const endpoint = endpoints[i];
        
        progressCallback?.({
          phase: 'migrating',
          currentEndpoint: i + 1,
          totalEndpoints: endpoints.length,
          progress: (i / endpoints.length) * 80,
          message: `Migrating ${endpoint.endpointType} endpoint...`,
          details: `${endpoint.filePath}:${endpoint.lineNumber}`,
          completedMigrations: results,
          failedMigrations: errors
        });

        try {
          const result = await this.migrateEndpoint(endpoint, {
            validateAfterMigration,
            createBackup: createBackup && i === 0 // Only create backup once per file
          });

          results.push(result);
          filesModified.add(endpoint.filePath);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ endpoint, error: errorMessage });

          if (stopOnError) {
            throw new Error(`Migration stopped due to error: ${errorMessage}`);
          }
        }
      }

      // Phase 3: Validation (if requested)
      if (validateAfterMigration && results.length > 0) {
        progressCallback?.({
          phase: 'validating',
          currentEndpoint: endpoints.length,
          totalEndpoints: endpoints.length,
          progress: 85,
          message: 'Validating migrated endpoints...',
          details: `Validating ${results.length} successful migrations`,
          completedMigrations: results,
          failedMigrations: errors
        });

        // Validate a sample of migrations
        const sampleSize = Math.min(3, results.length);
        const sampleResults = results.slice(0, sampleSize);
        
        for (const result of sampleResults) {
          try {
            const credentials = await this.credentialService.retrieveCredentials();
            if (credentials) {
              await this.validationService.testEndpoint(result.migratedCode, credentials);
            }
          } catch (error) {
            console.warn('Validation failed for sample migration:', error);
          }
        }
      }

      // Phase 4: Complete
      const totalTime = Date.now() - startTime;
      const averageConfidence = results.length > 0 
        ? results.reduce((sum, r) => sum + r.metadata.confidence, 0) / results.length 
        : 0;

      const bulkResult: BulkMigrationResult = {
        success: errors.length === 0,
        totalEndpoints: endpoints.length,
        successfulMigrations: results.length,
        failedMigrations: errors.length,
        results,
        errors,
        summary: {
          totalTime,
          averageConfidence,
          filesModified: Array.from(filesModified)
        }
      };

      progressCallback?.({
        phase: 'complete',
        currentEndpoint: endpoints.length,
        totalEndpoints: endpoints.length,
        progress: 100,
        message: `Bulk migration completed! ${results.length} successful, ${errors.length} failed`,
        details: `Completed in ${Math.round(totalTime / 1000)}s`,
        completedMigrations: results,
        failedMigrations: errors
      });

      return bulkResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      progressCallback?.({
        phase: 'complete',
        currentEndpoint: endpoints.length,
        totalEndpoints: endpoints.length,
        progress: 100,
        message: `Bulk migration failed: ${errorMessage}`,
        details: 'Migration was cancelled or stopped due to error',
        completedMigrations: results,
        failedMigrations: errors
      });

      throw new Error(`Bulk migration failed: ${errorMessage}`);
    }
  }

  /**
   * Get migration statistics
   */
  public getMigrationStatistics(): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    averageConfidence: number;
    recentMigrations: MigrationHistoryEntry[];
    mostMigratedEndpoints: Array<{ endpointType: string; count: number }>;
  } {
    const totalMigrations = this.migrationHistory.length;
    const successfulMigrations = this.migrationHistory.filter(m => m.success).length;
    const failedMigrations = totalMigrations - successfulMigrations;
    
    const averageConfidence = this.migrationHistory.length > 0
      ? this.migrationHistory.reduce((sum, m) => sum + (m.success ? 0.8 : 0), 0) / this.migrationHistory.length
      : 0;

    const recentMigrations = this.migrationHistory.slice(0, 10);
    
    // Count endpoint types
    const endpointCounts = new Map<string, number>();
    for (const migration of this.migrationHistory) {
      const count = endpointCounts.get(migration.endpointType) || 0;
      endpointCounts.set(migration.endpointType, count + 1);
    }
    
    const mostMigratedEndpoints = Array.from(endpointCounts.entries())
      .map(([endpointType, count]) => ({ endpointType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalMigrations,
      successfulMigrations,
      failedMigrations,
      averageConfidence,
      recentMigrations,
      mostMigratedEndpoints
    };
  }

  /**
   * Export migration history
   */
  public exportMigrationHistory(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalMigrations: this.migrationHistory.length,
      migrations: this.migrationHistory
    }, null, 2);
  }

  /**
   * Import migration history
   */
  public importMigrationHistory(historyData: string): boolean {
    try {
      const data = JSON.parse(historyData);
      if (data.migrations && Array.isArray(data.migrations)) {
        this.migrationHistory = data.migrations.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        this.saveMigrationHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import migration history:', error);
      return false;
    }
  }
}
