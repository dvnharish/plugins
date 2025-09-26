import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { v4 as uuidv4 } from 'uuid';
import { ConvergeEndpoint, ConvergeEndpointType } from '../types/ConvergeEndpoint';
import { DynamicPatternMatchingService } from './DynamicPatternMatchingService';
import { PatternConfigManager } from '../config/PatternConfig';
import { WorkspaceScannerService, ScanResult, ScanProgress } from './WorkspaceScannerService';

/**
 * Service for parsing code and detecting Converge endpoints
 */
export class ParserService {
  private readonly configManager: PatternConfigManager;
  private patternMatcher: DynamicPatternMatchingService;
  private workspaceScanner?: WorkspaceScannerService;
  
  constructor(configManager?: PatternConfigManager) {
    this.configManager = configManager || new PatternConfigManager();
    this.patternMatcher = new DynamicPatternMatchingService(this.configManager);
  }
  
  /**
   * Get supported extensions from configuration
   */
  private get supportedExtensions(): string[] {
    return this.configManager.getSupportedExtensions();
  }
  
  /**
   * Load configuration from file
   */
  public async loadConfigFromFile(filePath: string): Promise<void> {
    await this.configManager.loadFromFile(filePath);
    // Recreate pattern matcher with new config
    this.patternMatcher = new DynamicPatternMatchingService(this.configManager);
  }

  /**
   * Scan the entire workspace for Converge endpoints with enhanced functionality
   */
  public async scanWorkspace(options: {
    useCache?: boolean;
    ignorePatterns?: string[];
    includePatterns?: string[];
    maxFileSize?: number;
    progressCallback?: (progress: ScanProgress) => void;
    cancellationToken?: vscode.CancellationToken;
  } = {}): Promise<ScanResult> {
    if (!this.workspaceScanner) {
      this.workspaceScanner = new WorkspaceScannerService(this);
    }

    const result = await this.workspaceScanner.scanWorkspace(options);
    
    console.log(`Found ${result.endpoints.length} Converge endpoints in workspace (${result.scannedFiles} files scanned, ${result.cacheHits} cache hits)`);
    return result;
  }

  /**
   * Legacy method for backward compatibility
   */
  public async scanWorkspaceLegacy(): Promise<ConvergeEndpoint[]> {
    const result = await this.scanWorkspace();
    return result.endpoints;
  }

  /**
   * Scan a directory for Converge endpoints
   */
  private async scanDirectory(directoryPath: string): Promise<ConvergeEndpoint[]> {
    const endpoints: ConvergeEndpoint[] = [];
    
    try {
      // Create glob pattern for supported file types
      const extensions = this.supportedExtensions.join(',');
      const pattern = `**/*{${extensions}}`;
      
      // Find all matching files
      const files = await glob(pattern, {
        cwd: directoryPath,
        ignore: [
          '**/node_modules/**',
          '**/vendor/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/coverage/**',
          '**/*.min.js',
          '**/*.bundle.js'
        ]
      });

      // Parse each file
      for (const relativePath of files) {
        const fullPath = path.join(directoryPath, relativePath);
        try {
          const fileEndpoints = await this.parseFile(fullPath);
          endpoints.push(...fileEndpoints);
        } catch (error) {
          console.warn(`Failed to parse file ${fullPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${directoryPath}:`, error);
    }

    return endpoints;
  }

  /**
   * Parse a specific file for Converge endpoints
   */
  public async parseFile(filePath: string): Promise<ConvergeEndpoint[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const endpoints: ConvergeEndpoint[] = [];

      // Parse using different strategies based on file type
      const extension = path.extname(filePath).toLowerCase();
      
      switch (extension) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          endpoints.push(...await this.parseJavaScriptFile(filePath, content));
          break;
        case '.php':
          endpoints.push(...await this.parsePHPFile(filePath, content));
          break;
        case '.py':
          endpoints.push(...await this.parsePythonFile(filePath, content));
          break;
        case '.java':
          endpoints.push(...await this.parseJavaFile(filePath, content));
          break;
        case '.cs':
          endpoints.push(...await this.parseCSharpFile(filePath, content));
          break;
        case '.rb':
          endpoints.push(...await this.parseRubyFile(filePath, content));
          break;
        default:
          // Fallback to generic text parsing
          endpoints.push(...await this.parseGenericFile(filePath, content));
      }

      return endpoints;
    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Parse JavaScript/TypeScript files using enhanced pattern analysis
   */
  private async parseJavaScriptFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    const endpoints: ConvergeEndpoint[] = [];
    
    // Use dynamic pattern matching
    const detectedEndpoints = this.patternMatcher.detectEndpoints(content);
    const detectedSslFields = this.patternMatcher.detectSslFields(content);
    const detectedUrls = this.patternMatcher.detectApiUrls(content);
    const detectedCalls = this.patternMatcher.detectApiCalls(content);
    
    // Process detected endpoints
    for (const detection of detectedEndpoints) {
      const endpoint = await this.createEndpoint(
        filePath,
        detection.lineNumber,
        detection.type,
        this.extractCodeBlockAroundLine(content, detection.lineNumber),
        content
      );
      endpoints.push(endpoint);
    }

    // Process SSL fields that might indicate Converge usage
    const sslFieldsByLine = this.groupSSLFieldsByLine(detectedSslFields.map(field => ({
      field: field.field,
      line: field.lineNumber,
      context: '',
      confidence: 0.8
    })));
    for (const [lineNumber, fields] of sslFieldsByLine.entries()) {
      // Check if this line has strong Converge indicators
      const lineContent = this.getLineContent(content, lineNumber);
      const hasConvergeContext = this.hasConvergeContext(lineContent, content, lineNumber);
      
      if (hasConvergeContext && fields.length > 0) {
        const codeBlock = this.extractCodeBlockAroundLine(content, lineNumber);
        const endpoint = await this.createEndpoint(
          filePath,
          lineNumber,
          this.inferEndpointTypeFromSSLFields(fields.map(f => f.field)),
          codeBlock,
          content
        );
        endpoints.push(endpoint);
      }
    }

    return this.deduplicateEndpoints(endpoints);
  }

  /**
   * Parse PHP files for Converge patterns
   */
  private async parsePHPFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    const endpoints: ConvergeEndpoint[] = [];
    
    // Use dynamic pattern matching
    const detectedEndpoints = this.patternMatcher.detectEndpoints(content);
    const detectedSslFields = this.patternMatcher.detectSslFields(content);
    
    // Process detected endpoints
    for (const detection of detectedEndpoints) {
      const endpoint = await this.createEndpoint(
        filePath,
        detection.lineNumber,
        detection.type,
        this.extractCodeBlockAroundLine(content, detection.lineNumber),
        content
      );
      endpoints.push(endpoint);
    }
    
    // Process SSL fields
    for (const sslField of detectedSslFields) {
      const endpoint = await this.createEndpoint(
        filePath,
        sslField.lineNumber,
        ConvergeEndpointType.PROCESS_TRANSACTION,
        this.extractCodeBlockAroundLine(content, sslField.lineNumber),
        content
      );
      endpoints.push(endpoint);
    }

    return this.deduplicateEndpoints(endpoints);
  }

  /**
   * Parse Python files for Converge patterns
   */
  private async parsePythonFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    return this.parseGenericFile(filePath, content);
  }

  /**
   * Parse Java files for Converge patterns
   */
  private async parseJavaFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    return this.parseGenericFile(filePath, content);
  }

  /**
   * Parse C# files for Converge patterns
   */
  private async parseCSharpFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    return this.parseGenericFile(filePath, content);
  }

  /**
   * Parse Ruby files for Converge patterns with enhanced detection
   */
  private async parseRubyFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    return this.parseGenericFile(filePath, content);
  }


  /**
   * Parse generic files using dynamic pattern matching
   */
  private async parseGenericFile(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    const endpoints: ConvergeEndpoint[] = [];
    
    try {
      // Use dynamic pattern matcher to detect endpoints
      const detectedEndpoints = this.patternMatcher?.detectEndpoints(content) || [];
      const detectedSslFields = this.patternMatcher?.detectSslFields(content) || [];
      
      console.log(`🔍 Parsing ${filePath}: Found ${detectedEndpoints.length} endpoints, ${detectedSslFields.length} SSL fields`);
      
      // Process detected endpoints
      for (const detection of detectedEndpoints) {
        const endpoint = await this.createEndpoint(
          filePath,
          detection.lineNumber,
          detection.type,
          this.extractCodeBlock(content.split('\n'), detection.lineNumber - 1),
          content
        );
        endpoints.push(endpoint);
      }
      
      // Process SSL fields if no endpoints were found
      if (endpoints.length === 0 && detectedSslFields.length > 0) {
        const sslField = detectedSslFields[0]; // Use first SSL field as reference
        const endpoint = await this.createEndpoint(
          filePath,
          sslField.lineNumber,
          ConvergeEndpointType.PROCESS_TRANSACTION,
          this.extractCodeBlock(content.split('\n'), sslField.lineNumber - 1),
          content
        );
        endpoints.push(endpoint);
      }
    } catch (error) {
      console.error(`Error in parseGenericFile for ${filePath}:`, error);
      // Fallback to basic pattern matching
      endpoints.push(...await this.fallbackPatternMatching(filePath, content));
    }

    return this.deduplicateEndpoints(endpoints);
  }

  /**
   * Fallback pattern matching when dynamic pattern matcher fails
   */
  private async fallbackPatternMatching(filePath: string, content: string): Promise<ConvergeEndpoint[]> {
    const endpoints: ConvergeEndpoint[] = [];
    
    try {
      // Basic SSL field patterns
      const sslFieldPattern = /ssl_[a-zA-Z_][a-zA-Z0-9_]*/g;
      const convergeUrlPattern = /convergepay\.com|api\.demo\.convergepay\.com|VirtualMerchantDemo|processxml\.do/g;
      const processTransactionPattern = /processxml|ssl_transaction_type|ssl_merchant_ID|ssl_user_id|ssl_pin/g;
      
      const lines = content.split('\n');
      let hasConvergePatterns = false;
      let lineNumber = 1;
      
      for (const line of lines) {
        // Check for SSL fields
        const sslMatches = line.match(sslFieldPattern);
        const urlMatches = line.match(convergeUrlPattern);
        const endpointMatches = line.match(processTransactionPattern);
        
        if (sslMatches || urlMatches || endpointMatches) {
          hasConvergePatterns = true;
          
          // Create endpoint if we find converge patterns
          const endpoint = await this.createEndpoint(
            filePath,
            lineNumber,
            ConvergeEndpointType.PROCESS_TRANSACTION,
            this.extractCodeBlock(lines, lineNumber - 1),
            content
          );
          endpoints.push(endpoint);
          break; // Only create one endpoint per file for fallback
        }
        
        lineNumber++;
      }
      
      console.log(`🔧 Fallback pattern matching for ${filePath}: Found ${endpoints.length} endpoints`);
      
    } catch (error) {
      console.error(`Error in fallback pattern matching for ${filePath}:`, error);
    }
    
    return endpoints;
  }

  /**
   * Analyze SSL field context to determine if it's part of a Converge integration
   */
  private async analyzeSSLFieldContext(
    filePath: string,
    lineNumber: number,
    lines: string[],
    currentIndex: number,
    content: string
  ): Promise<ConvergeEndpoint | null> {
    // Look at surrounding lines for context
    const contextRange = 10; // Look 10 lines before and after
    const startIndex = Math.max(0, currentIndex - contextRange);
    const endIndex = Math.min(lines.length - 1, currentIndex + contextRange);

    let hasConvergeContext = false;
    let endpointType = ConvergeEndpointType.PROCESS_TRANSACTION;

    for (let i = startIndex; i <= endIndex; i++) {
      const contextLine = lines[i];
      
      // Check for Converge-specific patterns
      if (this.containsConvergePattern(contextLine)) {
        hasConvergeContext = true;
        const detectedType = this.determineEndpointType(contextLine);
        if (detectedType) {
          endpointType = detectedType;
        }
        break;
      }
    }

    if (hasConvergeContext) {
      return await this.createEndpoint(
        filePath,
        lineNumber,
        endpointType,
        this.extractCodeBlock(lines, currentIndex, contextRange),
        content
      );
    }

    return null;
  }

  /**
   * Extract a code block around a specific line
   */
  private extractCodeBlock(lines: string[], centerIndex: number, range: number = 5): string {
    const startIndex = Math.max(0, centerIndex - range);
    const endIndex = Math.min(lines.length - 1, centerIndex + range);
    
    return lines.slice(startIndex, endIndex + 1).join('\n');
  }

  /**
   * Check if a line contains Converge-specific patterns
   */
  private containsConvergePattern(line: string): boolean {
    const detectedEndpoints = this.patternMatcher.detectEndpoints(line);
    const detectedUrls = this.patternMatcher.detectApiUrls(line);
    
    return detectedEndpoints.length > 0 || 
           detectedUrls.some(url => url.type === 'converge') ||
           line.toLowerCase().includes('converge');
  }

  /**
   * Extract SSL fields from a line of code
   */
  private extractSSLFields(line: string): string[] {
    const detectedSslFields = this.patternMatcher.detectSslFields(line);
    return detectedSslFields.map(field => field.field);
  }

  /**
   * Determine the endpoint type based on the content
   */
  private determineEndpointType(content: string): ConvergeEndpointType | null {
    const lowerContent = content.toLowerCase();
    
    // Skip if this looks like a method declaration or class definition
    if (this.isMethodOrClassDefinition(content)) {
      return null;
    }
    
    // Skip if this is just a method name without actual API usage
    if (this.isJustMethodName(content)) {
      return null;
    }
    
    if (lowerContent.includes('hosted-payments') || lowerContent.includes('transaction_token')) {
      return ConvergeEndpointType.HOSTED_PAYMENTS;
    }
    if (lowerContent.includes('checkout.js')) {
      return ConvergeEndpointType.CHECKOUT;
    }
    if (lowerContent.includes('processtransactiononline')) {
      return ConvergeEndpointType.PROCESS_TRANSACTION;
    }
    if (lowerContent.includes('batch-processing')) {
      return ConvergeEndpointType.BATCH_PROCESSING;
    }
    if (lowerContent.includes('nonelavoncertifieddevice')) {
      return ConvergeEndpointType.DEVICE_MANAGEMENT;
    }
    
    return null;
  }

  /**
   * Check if content is a method or class definition
   */
  private isMethodOrClassDefinition(content: string): boolean {
    const trimmed = content.trim();
    
    // Java method declarations
    if (trimmed.match(/^\s*(public|private|protected|static).*ProcessTransactionOnline\s*\(/)) {
      return true;
    }
    
    // Class definitions
    if (trimmed.match(/^\s*(public|private|protected)?\s*class\s+.*ProcessTransactionOnline/)) {
      return true;
    }
    
    // Interface definitions
    if (trimmed.match(/^\s*(public|private|protected)?\s*interface\s+.*ProcessTransactionOnline/)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if content is just a method name without actual API usage
   */
  private isJustMethodName(content: string): boolean {
    const trimmed = content.trim();
    
    // If it's just "ProcessTransactionOnline" without actual API call
    if (trimmed.match(/^\s*ProcessTransactionOnline\s*$/)) {
      return true;
    }
    
    // If it's a method name in a comment or documentation
    if (trimmed.match(/^\s*\/\/.*ProcessTransactionOnline/) || trimmed.match(/^\s*\*.*ProcessTransactionOnline/)) {
      return true;
    }
    
    // If it's just a method name without parentheses or API context
    if (trimmed.match(/^\s*ProcessTransactionOnline\s*$/) && !trimmed.includes('(') && !trimmed.includes('http') && !trimmed.includes('api')) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a ConvergeEndpoint object
   */
  private async createEndpoint(
    filePath: string,
    lineNumber: number,
    endpointType: ConvergeEndpointType,
    code: string,
    fullContent: string
  ): Promise<ConvergeEndpoint> {
    const sslFields = this.extractSSLFields(code);
    
    return {
      id: uuidv4(),
      filePath: filePath,
      lineNumber: lineNumber,
      endpointType: endpointType,
      code: code,
      sslFields: sslFields
    };
  }

  /**
   * Remove duplicate endpoints based on file path and line number
   */
  private deduplicateEndpoints(endpoints: ConvergeEndpoint[]): ConvergeEndpoint[] {
    const seen = new Set<string>();
    return endpoints.filter(endpoint => {
      const key = `${endpoint.filePath}:${endpoint.lineNumber}:${endpoint.endpointType}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract Converge code from an endpoint
   */
  public extractConvergeCode(endpoint: ConvergeEndpoint): string {
    return endpoint.code;
  }

  /**
   * Get detailed analysis of a Converge endpoint
   */
  public async analyzeEndpoint(endpoint: ConvergeEndpoint): Promise<{
    sslFields: string[];
    endpointType: ConvergeEndpointType;
    complexity: 'simple' | 'moderate' | 'complex';
    migrationNotes: string[];
  }> {
    const sslFields = endpoint.sslFields;
    const complexity = this.assessComplexity(endpoint);
    const migrationNotes = this.generateMigrationNotes(endpoint);

    return {
      sslFields,
      endpointType: endpoint.endpointType,
      complexity,
      migrationNotes
    };
  }

  /**
   * Assess the complexity of migrating an endpoint
   */
  private assessComplexity(endpoint: ConvergeEndpoint): 'simple' | 'moderate' | 'complex' {
    const sslFieldCount = endpoint.sslFields.length;
    const codeLength = endpoint.code.length;
    
    if (sslFieldCount <= 5 && codeLength < 500) {
      return 'simple';
    } else if (sslFieldCount <= 15 && codeLength < 1500) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * Generate migration notes for an endpoint
   */
  private generateMigrationNotes(endpoint: ConvergeEndpoint): string[] {
    const notes: string[] = [];
    
    // Check for common migration challenges
    if (endpoint.sslFields.includes('ssl_recurring_flag')) {
      notes.push('Contains recurring payment logic - verify Elavon recurring API compatibility');
    }
    
    if (endpoint.sslFields.includes('ssl_token')) {
      notes.push('Uses tokenization - map to Elavon payment instrument tokens');
    }
    
    if (endpoint.code.includes('batch')) {
      notes.push('Batch processing detected - review Elavon batch API requirements');
    }
    
    if (endpoint.sslFields.length > 20) {
      notes.push('Complex field mapping required - consider breaking into smaller migrations');
    }

    return notes;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  /**
   * Extract code block around a character index
   */
  private extractCodeBlockAroundIndex(content: string, index: number, range: number = 5): string {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    const startLine = Math.max(0, lineNumber - range - 1);
    const endLine = Math.min(lines.length - 1, lineNumber + range - 1);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Extract code block around a line number
   */
  private extractCodeBlockAroundLine(content: string, lineNumber: number, range: number = 5): string {
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - range - 1);
    const endLine = Math.min(lines.length - 1, lineNumber + range - 1);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Get content of a specific line
   */
  private getLineContent(content: string, lineNumber: number): string {
    const lines = content.split('\n');
    return lines[lineNumber - 1] || '';
  }

  /**
   * Group SSL fields by line number
   */
  private groupSSLFieldsByLine(sslFields: Array<{
    field: string;
    line: number;
    context: string;
    confidence: number;
  }>): Map<number, Array<{
    field: string;
    line: number;
    context: string;
    confidence: number;
  }>> {
    const grouped = new Map();
    
    for (const field of sslFields) {
      if (!grouped.has(field.line)) {
        grouped.set(field.line, []);
      }
      grouped.get(field.line).push(field);
    }
    
    return grouped;
  }

  /**
   * Check if a line has Converge context
   */
  private hasConvergeContext(lineContent: string, fullContent: string, lineNumber: number): boolean {
    // Check the line itself
    if (lineContent.toLowerCase().includes('converge')) {
      return true;
    }

    // Check surrounding lines for context
    const lines = fullContent.split('\n');
    const contextRange = 3;
    const startLine = Math.max(0, lineNumber - contextRange - 1);
    const endLine = Math.min(lines.length - 1, lineNumber + contextRange - 1);

    for (let i = startLine; i <= endLine; i++) {
      const contextLine = lines[i];
      if (contextLine && this.containsConvergePattern(contextLine)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Infer endpoint type from SSL fields
   */
  private inferEndpointTypeFromSSLFields(sslFields: string[]): ConvergeEndpointType {
    // Check for specific field patterns that indicate endpoint types
    if (sslFields.some(field => field.includes('batch'))) {
      return ConvergeEndpointType.BATCH_PROCESSING;
    }
    
    if (sslFields.some(field => field.includes('device') || field.includes('terminal'))) {
      return ConvergeEndpointType.DEVICE_MANAGEMENT;
    }
    
    if (sslFields.some(field => field.includes('checkout') || field.includes('txn_auth_token'))) {
      return ConvergeEndpointType.CHECKOUT;
    }
    
    if (sslFields.some(field => field.includes('transaction_token'))) {
      return ConvergeEndpointType.HOSTED_PAYMENTS;
    }
    
    // Default to process transaction
    return ConvergeEndpointType.PROCESS_TRANSACTION;
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
    if (!this.workspaceScanner) {
      this.workspaceScanner = new WorkspaceScannerService(this);
    }

    return await this.workspaceScanner.scanFiles(filePaths, options);
  }

  /**
   * Get scan recommendations for the workspace
   */
  public async getScanRecommendations() {
    if (!this.workspaceScanner) {
      this.workspaceScanner = new WorkspaceScannerService(this);
    }

    return await this.workspaceScanner.getScanRecommendations();
  }

  /**
   * Clear scan cache
   */
  public clearScanCache(): void {
    if (this.workspaceScanner) {
      this.workspaceScanner.clearCache();
    }
  }

  /**
   * Get cache statistics
   */
  public getScanCacheStatistics() {
    if (!this.workspaceScanner) {
      return null;
    }

    return this.workspaceScanner.getCacheStatistics();
  }

  /**
   * Get enhanced pattern matching statistics
   */
  public getPatternStatistics(): {
    supportedLanguages: string[];
    patternStats: any;
    totalPatterns: number;
  } {
    const config = this.configManager.getConfig();
    const convergePatterns = config.converge;
    const elavonPatterns = config.elavon;
    
    const totalPatterns = 
      convergePatterns.endpoints.hostedPayments.length +
      convergePatterns.endpoints.checkout.length +
      convergePatterns.endpoints.processTransaction.length +
      convergePatterns.endpoints.batchProcessing.length +
      convergePatterns.endpoints.deviceManagement.length +
      convergePatterns.sslFields.variations.length +
      convergePatterns.urls.length +
      convergePatterns.apiCalls.length;
    
    return {
      supportedLanguages: this.supportedExtensions,
      patternStats: {
        convergePatterns: convergePatterns,
        elavonPatterns: elavonPatterns
      },
      totalPatterns
    };
  }
}