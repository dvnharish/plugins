import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConvergeEndpoint, ConvergeEndpointType } from '../types/ConvergeEndpoint';

/**
 * Simple scanner service that uses basic pattern matching
 * This is a fallback when the complex scanner gets stuck
 */
export class SimpleScannerService {
  
  /**
   * Simple scan that just looks for basic patterns
   */
  public async scanWorkspace(): Promise<{
    endpoints: ConvergeEndpoint[];
    scannedFiles: number;
    totalFiles: number;
    scanDuration: number;
    errors: Array<{ filePath: string; error: string; timestamp: Date }>;
  }> {
    const startTime = Date.now();
    const endpoints: ConvergeEndpoint[] = [];
    const errors: Array<{ filePath: string; error: string; timestamp: Date }> = [];
    let scannedFiles = 0;
    let totalFiles = 0;

    try {
      console.log('🔍 Simple scanner starting...');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return { endpoints, scannedFiles, totalFiles, scanDuration: 0, errors };
      }

      // Get all Java files
      const javaFiles = await this.findJavaFiles(workspaceFolders[0].uri.fsPath);
      totalFiles = javaFiles.length;
      
      console.log(`📁 Found ${totalFiles} Java files to scan`);

      for (let i = 0; i < javaFiles.length; i++) {
        const filePath = javaFiles[i];
        const relativePath = path.relative(workspaceFolders[0].uri.fsPath, filePath);
        
        console.log(`📄 Scanning file ${i + 1}/${totalFiles}: ${relativePath}`);
        
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const fileEndpoints = this.scanFileContent(filePath, content);
          
          if (fileEndpoints.length > 0) {
            console.log(`✅ Found ${fileEndpoints.length} endpoints in ${relativePath}`);
            endpoints.push(...fileEndpoints);
          }
          
          scannedFiles++;
        } catch (error) {
          console.error(`❌ Error scanning ${relativePath}:`, error);
          errors.push({
            filePath: relativePath,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

      const scanDuration = Date.now() - startTime;
      console.log(`🎯 Simple scan completed: ${endpoints.length} endpoints found in ${scannedFiles} files (${scanDuration}ms)`);

      return {
        endpoints,
        scannedFiles,
        totalFiles,
        scanDuration,
        errors
      };

    } catch (error) {
      console.error('❌ Simple scanner error:', error);
      return {
        endpoints,
        scannedFiles,
        totalFiles,
        scanDuration: Date.now() - startTime,
        errors: [{
          filePath: 'workspace',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }]
      };
    }
  }

  /**
   * Find all Java files in the workspace
   */
  private async findJavaFiles(rootPath: string): Promise<string[]> {
    const javaFiles: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories that don't contain source code
          if (!['node_modules', '.git', 'target', 'build', 'dist', 'out'].includes(entry.name)) {
            const subFiles = await this.findJavaFiles(fullPath);
            javaFiles.push(...subFiles);
          }
        } else if (entry.isFile() && entry.name.endsWith('.java')) {
          javaFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${rootPath}:`, error);
    }
    
    return javaFiles;
  }

  /**
   * Scan file content for converge patterns
   */
  private scanFileContent(filePath: string, content: string): ConvergeEndpoint[] {
    const endpoints: ConvergeEndpoint[] = [];
    const lines = content.split('\n');
    
    // Enhanced patterns to look for
    const sslFieldPattern = /ssl_[a-zA-Z_][a-zA-Z0-9_]*/g;
    const convergeUrlPattern = /convergepay\.com|api\.demo\.convergepay\.com|VirtualMerchantDemo|processxml\.do/g;
    const processTransactionPattern = /processxml|ssl_transaction_type|ssl_merchant_ID|ssl_user_id|ssl_pin/g;
    
    // Service layer patterns
    const serviceClassPattern = /class\s+\w*[Cc]onverge\w*\s*\{/g;
    const controllerPattern = /@RestController|@Controller|@RequestMapping/g;
    const serviceMethodPattern = /public\s+\w+\s+\w*[Ss]ale\w*\(|public\s+\w+\s+\w*[Pp]rocess\w*\(/g;
    const restTemplatePattern = /RestTemplate|restTemplate/g;
    const httpMethodPattern = /@PostMapping|@GetMapping|@PutMapping|@DeleteMapping/g;
    
    // Check if this is a service, controller, or DTO file
    const isServiceFile = serviceClassPattern.test(content) || serviceMethodPattern.test(content);
    const isControllerFile = controllerPattern.test(content) || httpMethodPattern.test(content);
    const isDtoFile = content.includes('@XmlElement') || content.includes('@JsonProperty');
    const hasConvergePatterns = sslFieldPattern.test(content) || convergeUrlPattern.test(content) || processTransactionPattern.test(content);
    
    // Only process files that are relevant to converge integration
    if (hasConvergePatterns || isServiceFile || isControllerFile || isDtoFile) {
      let endpointType = ConvergeEndpointType.PROCESS_TRANSACTION;
      let firstMatchLine = 1;
      
      // Determine endpoint type based on file content
      if (isControllerFile) {
        endpointType = ConvergeEndpointType.PROCESS_TRANSACTION; // API endpoint
      } else if (isServiceFile) {
        endpointType = ConvergeEndpointType.PROCESS_TRANSACTION; // Service method
      } else if (isDtoFile) {
        endpointType = ConvergeEndpointType.PROCESS_TRANSACTION; // Data transfer
      }
      
      // Find the first relevant line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const sslMatches = line.match(sslFieldPattern);
        const urlMatches = line.match(convergeUrlPattern);
        const endpointMatches = line.match(processTransactionPattern);
        const serviceMatches = line.match(serviceMethodPattern);
        const controllerMatches = line.match(controllerPattern);
        
        if (sslMatches || urlMatches || endpointMatches || serviceMatches || controllerMatches) {
          firstMatchLine = i + 1;
          break;
        }
      }
      
      // Create endpoint for this file
      const endpoint: ConvergeEndpoint = {
        id: `simple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filePath: filePath,
        lineNumber: firstMatchLine,
        endpointType: endpointType,
        code: this.extractCodeBlock(lines, firstMatchLine - 1),
        sslFields: this.extractSslFields(content)
      };
      
      endpoints.push(endpoint);
      
      console.log(`📋 Detected ${this.getFileType(isServiceFile, isControllerFile, isDtoFile)}: ${path.basename(filePath)}`);
    }
    
    return endpoints;
  }

  /**
   * Get file type description
   */
  private getFileType(isService: boolean, isController: boolean, isDto: boolean): string {
    if (isController) return 'Controller/API';
    if (isService) return 'Service Layer';
    if (isDto) return 'DTO/Data Model';
    return 'Converge Integration';
  }

  /**
   * Extract code block around a line
   */
  private extractCodeBlock(lines: string[], centerIndex: number, range: number = 5): string {
    const startIndex = Math.max(0, centerIndex - range);
    const endIndex = Math.min(lines.length - 1, centerIndex + range);
    
    return lines.slice(startIndex, endIndex + 1).join('\n');
  }

  /**
   * Extract SSL fields from content
   */
  private extractSslFields(content: string): string[] {
    const sslFieldPattern = /ssl_[a-zA-Z_][a-zA-Z0-9_]*/g;
    const matches = content.match(sslFieldPattern);
    return matches ? [...new Set(matches)] : []; // Remove duplicates
  }
}
