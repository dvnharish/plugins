import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { ConvergeEndpoint } from '../types/ConvergeEndpoint';
import { ParserService } from './ParserService';

/**
 * Advanced workspace scanning service with caching and progress reporting
 */
export class WorkspaceScannerService {
  private readonly parserService: ParserService;
  private scanCache = new Map<string, {
    endpoints: ConvergeEndpoint[];
    timestamp: number;
    fileHash: string;
  }>();

  private readonly defaultIgnorePatterns = [
    '**/node_modules/**',
    '**/vendor/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/*.map',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/.DS_Store',
    '**/Thumbs.db'
  ];

  private readonly supportedExtensions = [
    '.js', '.jsx', '.ts', '.tsx',
    '.php', '.py', '.java', '.cs',
    '.rb', '.go', '.cpp', '.c',
    '.html', '.htm', '.vue', '.svelte'
  ];

  constructor(parserService: ParserService) {
    this.parserService = parserService;
  }

  /**
   * Scan workspace with progress reporting and caching
   */
  public async scanWorkspace(options: {
    useCache?: boolean;
    ignorePatterns?: string[];
    includePatterns?: string[];
    maxFileSize?: number;
    progressCallback?: (progress: ScanProgress) => void;
    cancellationToken?: vscode.CancellationToken;
  } = {}): Promise<ScanResult> {
    const {
      useCache = true,
      ignorePatterns = [],
      includePatterns = [],
      maxFileSize = 1024 * 1024, // 1MB default
      progressCallback,
      cancellationToken
    } = options;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return {
        endpoints: [],
        scannedFiles: 0,
        skippedFiles: 0,
        totalFiles: 0,
        scanDuration: 0,
        cacheHits: 0,
        errors: []
      };
    }

    const startTime = Date.now();
    const allEndpoints: ConvergeEndpoint[] = [];
    let scannedFiles = 0;
    let skippedFiles = 0;
    let totalFiles = 0;
    let cacheHits = 0;
    const errors: ScanError[] = [];

    try {
      // Discover all files first
      const allFiles = await this.discoverFiles(workspaceFolders, {
        ignorePatterns: [...this.defaultIgnorePatterns, ...ignorePatterns],
        includePatterns,
        maxFileSize
      });

      totalFiles = allFiles.length;

      progressCallback?.({
        phase: 'scanning',
        filesProcessed: 0,
        totalFiles,
        currentFile: '',
        endpointsFound: 0
      });

      // Process files with progress reporting
      for (let i = 0; i < allFiles.length; i++) {
        if (cancellationToken?.isCancellationRequested) {
          break;
        }

        const filePath = allFiles[i];
        const relativePath = this.getRelativePath(filePath, workspaceFolders);

        progressCallback?.({
          phase: 'scanning',
          filesProcessed: i + 1,
          totalFiles,
          currentFile: relativePath,
          endpointsFound: allEndpoints.length
        });

        try {
          // Check cache first
          if (useCache) {
            const cached = await this.getCachedResult(filePath);
            if (cached) {
              allEndpoints.push(...cached.endpoints);
              cacheHits++;
              continue;
            }
          }

          // Parse file
          const endpoints = await this.parserService.parseFile(filePath);
          
          if (endpoints.length > 0) {
            allEndpoints.push(...endpoints);
            
            // Cache results
            if (useCache) {
              await this.cacheResult(filePath, endpoints);
            }
          }

          scannedFiles++;
        } catch (error) {
          errors.push({
            filePath: relativePath,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
          skippedFiles++;
        }
      }

      const scanDuration = Date.now() - startTime;

      progressCallback?.({
        phase: 'complete',
        filesProcessed: totalFiles,
        totalFiles,
        currentFile: '',
        endpointsFound: allEndpoints.length
      });

      return {
        endpoints: allEndpoints,
        scannedFiles,
        skippedFiles,
        totalFiles,
        scanDuration,
        cacheHits,
        errors
      };

    } catch (error) {
      throw new Error(`Workspace scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Discover files in workspace folders
   */
  private async discoverFiles(
    workspaceFolders: readonly vscode.WorkspaceFolder[],
    options: {
      ignorePatterns: string[];
      includePatterns: string[];
      maxFileSize: number;
    }
  ): Promise<string[]> {
    const allFiles: string[] = [];

    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      
      // Create include pattern
      const extensions = this.supportedExtensions.join(',');
      const includePattern = options.includePatterns.length > 0 
        ? options.includePatterns.join(',')
        : `**/*{${extensions}}`;

      try {
        const files = await glob(includePattern, {
          cwd: folderPath,
          ignore: options.ignorePatterns,
          absolute: true
        });

        // Filter by file size
        const validFiles = await this.filterFilesBySize(files, options.maxFileSize);
        allFiles.push(...validFiles);
      } catch (error) {
        console.warn(`Failed to scan folder ${folderPath}:`, error);
      }
    }

    return allFiles;
  }

  /**
   * Filter files by size
   */
  private async filterFilesBySize(files: string[], maxFileSize: number): Promise<string[]> {
    const validFiles: string[] = [];

    for (const file of files) {
      try {
        const stats = await fs.promises.stat(file);
        if (stats.size <= maxFileSize) {
          validFiles.push(file);
        }
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }

    return validFiles;
  }

  /**
   * Get cached scan result for a file
   */
  private async getCachedResult(filePath: string): Promise<{
    endpoints: ConvergeEndpoint[];
    timestamp: number;
    fileHash: string;
  } | null> {
    const cached = this.scanCache.get(filePath);
    if (!cached) {
      return null;
    }

    try {
      // Check if file has been modified
      const stats = await fs.promises.stat(filePath);
      const currentHash = `${stats.mtime.getTime()}-${stats.size}`;
      
      if (cached.fileHash === currentHash) {
        return cached;
      } else {
        // File modified, remove from cache
        this.scanCache.delete(filePath);
        return null;
      }
    } catch (error) {
      // File no longer exists, remove from cache
      this.scanCache.delete(filePath);
      return null;
    }
  }

  /**
   * Cache scan result for a file
   */
  private async cacheResult(filePath: string, endpoints: ConvergeEndpoint[]): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath);
      const fileHash = `${stats.mtime.getTime()}-${stats.size}`;
      
      this.scanCache.set(filePath, {
        endpoints,
        timestamp: Date.now(),
        fileHash
      });
    } catch (error) {
      // Ignore caching errors
    }
  }

  /**
   * Get relative path from workspace folders
   */
  private getRelativePath(filePath: string, workspaceFolders: readonly vscode.WorkspaceFolder[]): string {
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      if (filePath.startsWith(folderPath)) {
        return path.relative(folderPath, filePath);
      }
    }
    return filePath;
  }

  /**
   * Clear scan cache
   */
  public clearCache(): void {
    this.scanCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    totalEntries: number;
    totalEndpoints: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    cacheSize: number;
  } {
    let totalEndpoints = 0;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;

    for (const entry of this.scanCache.values()) {
      totalEndpoints += entry.endpoints.length;
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      totalEntries: this.scanCache.size,
      totalEndpoints,
      oldestEntry: oldestTimestamp === Number.MAX_SAFE_INTEGER ? null : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp),
      cacheSize: this.scanCache.size
    };
  }

  /**
   * Scan specific files
   */
  public async scanFiles(
    filePaths: string[],
    options: {
      useCache?: boolean;
      progressCallback?: (progress: ScanProgress) => void;
      cancellationToken?: vscode.CancellationToken;
    } = {}
  ): Promise<ScanResult> {
    const {
      useCache = true,
      progressCallback,
      cancellationToken
    } = options;

    const startTime = Date.now();
    const allEndpoints: ConvergeEndpoint[] = [];
    let scannedFiles = 0;
    let skippedFiles = 0;
    let cacheHits = 0;
    const errors: ScanError[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      if (cancellationToken?.isCancellationRequested) {
        break;
      }

      const filePath = filePaths[i];

      progressCallback?.({
        phase: 'scanning',
        filesProcessed: i + 1,
        totalFiles: filePaths.length,
        currentFile: path.basename(filePath),
        endpointsFound: allEndpoints.length
      });

      try {
        // Check cache first
        if (useCache) {
          const cached = await this.getCachedResult(filePath);
          if (cached) {
            allEndpoints.push(...cached.endpoints);
            cacheHits++;
            continue;
          }
        }

        // Parse file
        const endpoints = await this.parserService.parseFile(filePath);
        
        if (endpoints.length > 0) {
          allEndpoints.push(...endpoints);
          
          // Cache results
          if (useCache) {
            await this.cacheResult(filePath, endpoints);
          }
        }

        scannedFiles++;
      } catch (error) {
        errors.push({
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
        skippedFiles++;
      }
    }

    const scanDuration = Date.now() - startTime;

    progressCallback?.({
      phase: 'complete',
      filesProcessed: filePaths.length,
      totalFiles: filePaths.length,
      currentFile: '',
      endpointsFound: allEndpoints.length
    });

    return {
      endpoints: allEndpoints,
      scannedFiles,
      skippedFiles,
      totalFiles: filePaths.length,
      scanDuration,
      cacheHits,
      errors
    };
  }

  /**
   * Get scan recommendations based on workspace analysis
   */
  public async getScanRecommendations(): Promise<ScanRecommendations> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return {
        recommendedIgnorePatterns: [],
        estimatedFileCount: 0,
        estimatedScanTime: 0,
        largeDirectories: [],
        suspiciousFiles: []
      };
    }

    const recommendations: ScanRecommendations = {
      recommendedIgnorePatterns: [...this.defaultIgnorePatterns],
      estimatedFileCount: 0,
      estimatedScanTime: 0,
      largeDirectories: [],
      suspiciousFiles: []
    };

    try {
      // Analyze workspace structure
      for (const folder of workspaceFolders) {
        const analysis = await this.analyzeDirectory(folder.uri.fsPath);
        
        recommendations.estimatedFileCount += analysis.fileCount;
        recommendations.largeDirectories.push(...analysis.largeDirectories);
        recommendations.suspiciousFiles.push(...analysis.suspiciousFiles);
        
        // Add project-specific ignore patterns
        if (analysis.hasNodeModules) {
          recommendations.recommendedIgnorePatterns.push('**/node_modules/**');
        }
        if (analysis.hasVendor) {
          recommendations.recommendedIgnorePatterns.push('**/vendor/**');
        }
        if (analysis.hasBuildDir) {
          recommendations.recommendedIgnorePatterns.push('**/build/**', '**/dist/**');
        }
      }

      // Estimate scan time (rough calculation: 10ms per file)
      recommendations.estimatedScanTime = recommendations.estimatedFileCount * 10;

    } catch (error) {
      console.warn('Failed to analyze workspace for recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Analyze directory structure
   */
  private async analyzeDirectory(dirPath: string): Promise<{
    fileCount: number;
    hasNodeModules: boolean;
    hasVendor: boolean;
    hasBuildDir: boolean;
    largeDirectories: Array<{ path: string; fileCount: number }>;
    suspiciousFiles: Array<{ path: string; size: number }>;
  }> {
    const analysis = {
      fileCount: 0,
      hasNodeModules: false,
      hasVendor: false,
      hasBuildDir: false,
      largeDirectories: [] as Array<{ path: string; fileCount: number }>,
      suspiciousFiles: [] as Array<{ path: string; size: number }>
    };

    try {
      const extensions = this.supportedExtensions.join(',');
      const files = await glob(`**/*{${extensions}}`, {
        cwd: dirPath,
        ignore: ['**/node_modules/**', '**/.git/**'],
        nodir: true
      });

      analysis.fileCount = files.length;

      // Check for common directories
      const entries = await fs.promises.readdir(dirPath);
      analysis.hasNodeModules = entries.includes('node_modules');
      analysis.hasVendor = entries.includes('vendor');
      analysis.hasBuildDir = entries.some(entry => 
        ['build', 'dist', 'out', 'target'].includes(entry.toLowerCase())
      );

      // Find large directories (>100 files)
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        try {
          const stat = await fs.promises.stat(entryPath);
          if (stat.isDirectory() && !['node_modules', '.git', 'vendor'].includes(entry)) {
            const subFiles = await glob(`**/*{${extensions}}`, {
              cwd: entryPath,
              nodir: true
            });
            
            if (subFiles.length > 100) {
              analysis.largeDirectories.push({
                path: entry,
                fileCount: subFiles.length
              });
            }
          }
        } catch (error) {
          // Skip inaccessible directories
        }
      }

    } catch (error) {
      console.warn(`Failed to analyze directory ${dirPath}:`, error);
    }

    return analysis;
  }
}

/**
 * Scan progress information
 */
export interface ScanProgress {
  phase: 'discovering' | 'scanning' | 'complete';
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  endpointsFound: number;
}

/**
 * Scan result information
 */
export interface ScanResult {
  endpoints: ConvergeEndpoint[];
  scannedFiles: number;
  skippedFiles: number;
  totalFiles: number;
  scanDuration: number;
  cacheHits: number;
  errors: ScanError[];
}

/**
 * Scan error information
 */
export interface ScanError {
  filePath: string;
  error: string;
  timestamp: Date;
}

/**
 * Scan recommendations
 */
export interface ScanRecommendations {
  recommendedIgnorePatterns: string[];
  estimatedFileCount: number;
  estimatedScanTime: number;
  largeDirectories: Array<{ path: string; fileCount: number }>;
  suspiciousFiles: Array<{ path: string; size: number }>;
}