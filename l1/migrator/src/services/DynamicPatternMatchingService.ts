import { ConvergeEndpointType } from '../types/ConvergeEndpoint';
import { PatternConfigManager, defaultPatternConfig } from '../config/PatternConfig';

/**
 * Dynamic pattern matching service that uses configuration instead of hardcoded patterns
 */
export class DynamicPatternMatchingService {
  private configManager: PatternConfigManager;
  
  constructor(configManager?: PatternConfigManager) {
    this.configManager = configManager || new PatternConfigManager();
  }
  
  /**
   * Get patterns from configuration
   */
  private get patterns() {
    const convergeConfig = this.configManager.getPatterns('converge');
    const elavonConfig = this.configManager.getPatterns('elavon');
    
    return {
      // Endpoint URL patterns - dynamically generated from config
      endpoints: {
        hostedPayments: convergeConfig.endpoints.hostedPayments.map(pattern => new RegExp(pattern, 'gi')),
        checkout: convergeConfig.endpoints.checkout.map(pattern => new RegExp(pattern, 'gi')),
        processTransaction: convergeConfig.endpoints.processTransaction.map(pattern => new RegExp(pattern, 'gi')),
        batchProcessing: convergeConfig.endpoints.batchProcessing.map(pattern => new RegExp(pattern, 'gi')),
        deviceManagement: convergeConfig.endpoints.deviceManagement.map(pattern => new RegExp(pattern, 'gi'))
      },

      // SSL field patterns with variations - dynamically generated
      sslFields: {
        core: new RegExp(convergeConfig.sslFields.core, 'g'),
        variations: convergeConfig.sslFields.variations.map(pattern => new RegExp(pattern, 'g'))
      },

      // API URL patterns - dynamically generated
      urls: {
        converge: convergeConfig.urls.map(pattern => new RegExp(pattern, 'gi')),
        elavon: elavonConfig.urls.map(pattern => new RegExp(pattern, 'gi'))
      },

      // HTTP method patterns - dynamically generated
      httpMethods: {
        fetch: convergeConfig.apiCalls.filter(pattern => pattern.includes('fetch')).map(pattern => new RegExp(pattern, 'gi')),
        axios: convergeConfig.apiCalls.filter(pattern => pattern.includes('axios')).map(pattern => new RegExp(pattern, 'gi')),
        curl: convergeConfig.apiCalls.filter(pattern => pattern.includes('curl')).map(pattern => new RegExp(pattern, 'gi'))
      }
    };
  }

  /**
   * Detect Converge endpoints in content using dynamic patterns
   */
  public detectEndpoints(content: string): Array<{
    type: ConvergeEndpointType;
    match: string;
    index: number;
    lineNumber: number;
  }> {
    const results: Array<{
      type: ConvergeEndpointType;
      match: string;
      index: number;
      lineNumber: number;
    }> = [];

    const lines = content.split('\n');
    
    // Check each pattern category
    Object.entries(this.patterns.endpoints).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const endpointType = this.mapCategoryToEndpointType(category);
          
          if (endpointType) {
            results.push({
              type: endpointType,
              match: match[0],
              index: match.index,
              lineNumber
            });
          }
        }
      });
    });

    return results;
  }

  /**
   * Detect SSL fields using dynamic patterns
   */
  public detectSslFields(content: string): Array<{
    field: string;
    index: number;
    lineNumber: number;
  }> {
    const results: Array<{
      field: string;
      index: number;
      lineNumber: number;
    }> = [];

    // Check core pattern
    let match;
    while ((match = this.patterns.sslFields.core.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      results.push({
        field: match[0],
        index: match.index,
        lineNumber
      });
    }

    // Check variations
    this.patterns.sslFields.variations.forEach(pattern => {
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        results.push({
          field: match[0],
          index: match.index,
          lineNumber
        });
      }
    });

    return results;
  }

  /**
   * Detect API URLs using dynamic patterns
   */
  public detectApiUrls(content: string): Array<{
    url: string;
    type: 'converge' | 'elavon';
    index: number;
    lineNumber: number;
  }> {
    const results: Array<{
      url: string;
      type: 'converge' | 'elavon';
      index: number;
      lineNumber: number;
    }> = [];

    // Check Converge URLs
    this.patterns.urls.converge.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        results.push({
          url: match[0],
          type: 'converge',
          index: match.index,
          lineNumber
        });
      }
    });

    // Check Elavon URLs
    this.patterns.urls.elavon.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        results.push({
          url: match[0],
          type: 'elavon',
          index: match.index,
          lineNumber
        });
      }
    });

    return results;
  }

  /**
   * Detect API calls using dynamic patterns
   */
  public detectApiCalls(content: string): Array<{
    call: string;
    method: 'fetch' | 'axios' | 'curl';
    index: number;
    lineNumber: number;
  }> {
    const results: Array<{
      call: string;
      method: 'fetch' | 'axios' | 'curl';
      index: number;
      lineNumber: number;
    }> = [];

    Object.entries(this.patterns.httpMethods).forEach(([method, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          results.push({
            call: match[0],
            method: method as 'fetch' | 'axios' | 'curl',
            index: match.index,
            lineNumber
          });
        }
      });
    });

    return results;
  }

  /**
   * Map category name to ConvergeEndpointType
   */
  private mapCategoryToEndpointType(category: string): ConvergeEndpointType | null {
    switch (category) {
      case 'hostedPayments':
        return ConvergeEndpointType.HOSTED_PAYMENTS;
      case 'checkout':
        return ConvergeEndpointType.CHECKOUT;
      case 'processTransaction':
        return ConvergeEndpointType.PROCESS_TRANSACTION;
      case 'batchProcessing':
        return ConvergeEndpointType.BATCH_PROCESSING;
      case 'deviceManagement':
        return ConvergeEndpointType.DEVICE_MANAGEMENT;
      default:
        return null;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<typeof defaultPatternConfig>): void {
    this.configManager.updateConfig(updates);
  }

  /**
   * Load configuration from file
   */
  public async loadConfigFromFile(filePath: string): Promise<void> {
    await this.configManager.loadFromFile(filePath);
  }

  /**
   * Save configuration to file
   */
  public async saveConfigToFile(filePath: string): Promise<void> {
    await this.configManager.saveToFile(filePath);
  }

  /**
   * Get current configuration
   */
  public getConfig() {
    return this.configManager.getConfig();
  }
}
