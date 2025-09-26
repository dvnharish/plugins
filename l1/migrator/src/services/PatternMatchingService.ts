import { ConvergeEndpointType } from '../types/ConvergeEndpoint';
import { DynamicPatternMatchingService } from './DynamicPatternMatchingService';
import { PatternConfigManager } from '../config/PatternConfig';

/**
 * Legacy pattern matching service that delegates to the dynamic service
 * This maintains backward compatibility while using the new dynamic configuration
 */
export class PatternMatchingService {
  private dynamicMatcher: DynamicPatternMatchingService;
  
  constructor(configManager?: PatternConfigManager) {
    this.dynamicMatcher = new DynamicPatternMatchingService(configManager);
  }

  /**
   * Match endpoint patterns in code
   */
  public matchEndpoints(code: string): Array<{
    type: ConvergeEndpointType;
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    const detectedEndpoints = this.dynamicMatcher.detectEndpoints(code);
    
    return detectedEndpoints.map(detection => ({
      type: detection.type,
      matches: [{ 0: detection.match, index: detection.index }] as RegExpMatchArray[],
      confidence: 0.8 // Default confidence
    }));
  }

  /**
   * Match SSL fields in code
   */
  public matchSslFields(code: string): RegExpMatchArray[] {
    const detectedSslFields = this.dynamicMatcher.detectSslFields(code);
    
    return detectedSslFields.map(field => ({
      0: field.field,
      index: field.index
    } as RegExpMatchArray));
  }

  /**
   * Match API URLs in code
   */
  public matchApiUrls(code: string): Array<{
    type: 'converge' | 'elavon';
    matches: RegExpMatchArray[];
  }> {
    const detectedUrls = this.dynamicMatcher.detectApiUrls(code);
    
    const grouped = detectedUrls.reduce((acc, url) => {
      if (!acc[url.type]) {
        acc[url.type] = [];
      }
      acc[url.type].push({
        0: url.url,
        index: url.index
      } as RegExpMatchArray);
      return acc;
    }, {} as Record<string, RegExpMatchArray[]>);

    return Object.entries(grouped).map(([type, matches]) => ({
      type: type as 'converge' | 'elavon',
      matches
    }));
  }

  /**
   * Match API calls in code
   */
  public matchApiCalls(code: string): Array<{
    method: 'fetch' | 'axios' | 'curl';
    matches: RegExpMatchArray[];
  }> {
    const detectedCalls = this.dynamicMatcher.detectApiCalls(code);
    
    const grouped = detectedCalls.reduce((acc, call) => {
      if (!acc[call.method]) {
        acc[call.method] = [];
      }
      acc[call.method].push({
        0: call.call,
        index: call.index
      } as RegExpMatchArray);
      return acc;
    }, {} as Record<string, RegExpMatchArray[]>);

    return Object.entries(grouped).map(([method, matches]) => ({
      method: method as 'fetch' | 'axios' | 'curl',
      matches
    }));
  }

  /**
   * Analyze code for all patterns
   */
  public analyzeCode(code: string): {
    endpoints: Array<{
      type: ConvergeEndpointType;
      match: string;
      index: number;
      lineNumber: number;
    }>;
    sslFields: Array<{
      field: string;
      index: number;
      lineNumber: number;
    }>;
    urls: Array<{
      url: string;
      type: 'converge' | 'elavon';
      index: number;
      lineNumber: number;
    }>;
    apiCalls: Array<{
      call: string;
      method: 'fetch' | 'axios' | 'curl';
      index: number;
      lineNumber: number;
    }>;
  } {
    return {
      endpoints: this.dynamicMatcher.detectEndpoints(code),
      sslFields: this.dynamicMatcher.detectSslFields(code),
      urls: this.dynamicMatcher.detectApiUrls(code),
      apiCalls: this.dynamicMatcher.detectApiCalls(code)
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: any): void {
    this.dynamicMatcher.updateConfig(updates);
  }

  /**
   * Load configuration from file
   */
  public async loadConfigFromFile(filePath: string): Promise<void> {
    await this.dynamicMatcher.loadConfigFromFile(filePath);
  }

  /**
   * Get current configuration
   */
  public getConfig() {
    return this.dynamicMatcher.getConfig();
  }
}