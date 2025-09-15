import { ConvergeEndpointType } from '../types/ConvergeEndpoint';

/**
 * Advanced pattern matching service for Converge endpoint detection
 */
export class PatternMatchingService {
  
  /**
   * Comprehensive regex patterns for Converge detection
   */
  private readonly patterns = {
    // Endpoint URL patterns
    endpoints: {
      hostedPayments: [
        /\/hosted-payments\/transaction_token/gi,
        /hosted-payments\/transaction_token/gi,
        /hostedpayments\/transactiontoken/gi,
        /hosted_payments_transaction_token/gi
      ],
      checkout: [
        /\/Checkout\.js/gi,
        /Checkout\.js/gi,
        /checkout\.js/gi,
        /converge.*checkout/gi,
        /checkout.*converge/gi
      ],
      processTransaction: [
        /\/ProcessTransactionOnline/gi,
        /ProcessTransactionOnline/gi,
        /process_transaction_online/gi,
        /processtransaction/gi,
        /transaction.*process/gi
      ],
      batchProcessing: [
        /\/batch-processing/gi,
        /batch-processing/gi,
        /batch_processing/gi,
        /batchprocessing/gi,
        /batch.*process/gi
      ],
      deviceManagement: [
        /\/NonElavonCertifiedDevice/gi,
        /NonElavonCertifiedDevice/gi,
        /non_elavon_certified_device/gi,
        /device.*management/gi,
        /terminal.*management/gi
      ]
    },

    // SSL field patterns with variations
    sslFields: {
      // Core SSL fields
      core: /ssl_[a-zA-Z_][a-zA-Z0-9_]*/g,
      // Common variations and typos
      variations: [
        /SSL_[a-zA-Z_][a-zA-Z0-9_]*/g, // Uppercase
        /ssl[A-Z][a-zA-Z0-9]*/g,       // camelCase
        /"ssl_[a-zA-Z_][a-zA-Z0-9_]*"/g, // Quoted
        /'ssl_[a-zA-Z_][a-zA-Z0-9_]*'/g, // Single quoted
        /\$ssl_[a-zA-Z_][a-zA-Z0-9_]*/g, // PHP variables
        /ssl\[['"][a-zA-Z_][a-zA-Z0-9_]*['"]\]/g, // Array notation
        /:ssl_[a-zA-Z_][a-zA-Z0-9_]*/g, // Ruby symbols
        /ssl_[a-zA-Z_][a-zA-Z0-9_]*:/g  // Ruby hash keys
      ]
    },

    // API URL patterns
    urls: {
      converge: [
        /https?:\/\/[^\s]*converge[^\s]*/gi,
        /https?:\/\/api\.converge\.com[^\s]*/gi,
        /https?:\/\/[^\s]*\.converge\.com[^\s]*/gi,
        /converge\.com[^\s]*/gi
      ],
      elavon: [
        /https?:\/\/[^\s]*elavon[^\s]*/gi,
        /https?:\/\/api\.elavon\.com[^\s]*/gi,
        /elavon\.com[^\s]*/gi
      ]
    },

    // HTTP method patterns
    httpMethods: {
      fetch: [
        /fetch\s*\(\s*['"'][^'"]*converge[^'"]*['"']/gi,
        /fetch\s*\(\s*['"'][^'"]*\/hosted-payments[^'"]*['"']/gi,
        /fetch\s*\(\s*['"'][^'"]*ProcessTransaction[^'"]*['"']/gi
      ],
      axios: [
        /axios\.(get|post|put|delete)\s*\([^)]*converge[^)]*/gi,
        /axios\s*\(\s*\{[^}]*url[^}]*converge[^}]*\}/gi
      ],
      curl: [
        /curl_setopt\s*\([^)]*CURLOPT_URL[^)]*converge[^)]*/gi,
        /curl\s+[^\\n]*converge/gi
      ],
      requests: [
        /requests\.(get|post|put|delete)\s*\([^)]*converge[^)]*/gi,
        /urllib.*converge/gi
      ],
      httpClient: [
        /HttpClient.*converge/gi,
        /WebRequest.*converge/gi,
        /HttpPost.*converge/gi,
        /PostAsync.*converge/gi,
        /HttpWebRequest.*converge/gi,
        /RestSharp.*converge/gi,
        /WebClient.*converge/gi,
        /HttpRequestMessage.*converge/gi
      ],
      ruby: [
        /Net::HTTP\.[a-z]+/gi,
        /HTTParty\.[a-z]+/gi,
        /RestClient\.[a-z]+/gi,
        /Faraday\.[a-z]+/gi,
        /Net::HTTP\.[a-z]+\s*\([^)]*converge[^)]*/gi,
        /HTTParty\.[a-z]+\s*\([^)]*converge[^)]*/gi,
        /RestClient\.[a-z]+\s*\([^)]*converge[^)]*/gi,
        /Faraday\.[a-z]+\s*\([^)]*converge[^)]*/gi,
        /open\s*\([^)]*converge[^)]*/gi,
        /uri\.open\s*\([^)]*converge[^)]*/gi
      ]
    },

    // Configuration patterns
    config: {
      apiKeys: [
        /api[_-]?key[^=:]*[:=].*pk_[a-zA-Z0-9_]+/gi,
        /public[_-]?key[^=:]*[:=].*pk_[a-zA-Z0-9_]+/gi,
        /secret[_-]?key[^=:]*[:=].*sk_[a-zA-Z0-9_]+/gi,
        /['"]pk_[a-zA-Z0-9_]+['"]/gi,
        /['"]sk_[a-zA-Z0-9_]+['"]/gi,
        /converge[._-]?api[._-]?key/gi,
        /api[._-]?key.*converge/gi
      ],
      endpoints: [
        /endpoint[^=:]*[:=].*converge/gi,
        /base[_-]?url[^=:]*[:=].*converge/gi,
        /api[_-]?url[^=:]*[:=].*converge/gi,
        /['"].*converge\.com.*['"]/gi
      ],
      environment: [
        /process\.env\.CONVERGE_[A-Z_]+/gi,
        /System\.getenv\s*\(\s*['"']CONVERGE_[^'"']*['"']\s*\)/gi,
        /Environment\.GetEnvironmentVariable\s*\(\s*['"']CONVERGE_[^'"']*['"']\s*\)/gi,
        /os\.environ\s*\[\s*['"']CONVERGE_[^'"']*['"']\s*\]/gi,
        /os\.getenv\s*\(\s*['"']CONVERGE_[^'"']*['"']\s*\)/gi,
        /ENV\s*\[\s*['"']CONVERGE_[^'"']*['"']\s*\]/gi,
        /getenv\s*\(\s*['"']CONVERGE_[^'"']*['"']\s*\)/gi
      ],
      configFile: [
        /@Value\s*\(\s*['"']\$\{converge\./gi,
        /@ConfigurationProperties.*converge/gi,
        /config\s*\[\s*['"']converge/gi,
        /settings\.CONVERGE_/gi,
        /Rails\.application\.credentials\.converge/gi,
        /_configuration\s*\[\s*['"']Converge:/gi
      ]
    },

    // Comment patterns (for migration notes)
    comments: {
      todo: [
        /\/\/.*TODO.*converge/gi,
        /\/\*.*TODO.*converge.*\*\//gi,
        /#.*TODO.*converge/gi
      ],
      migration: [
        /\/\/.*migrate.*converge/gi,
        /\/\*.*migrate.*converge.*\*\//gi,
        /#.*migrate.*converge/gi
      ]
    }
  };

  /**
   * Match endpoint patterns in code
   */
  public matchEndpoints(code: string): Array<{
    type: ConvergeEndpointType;
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    const results: Array<{
      type: ConvergeEndpointType;
      matches: RegExpMatchArray[];
      confidence: number;
    }> = [];

    // Check hosted payments patterns
    const hostedPaymentsMatches = this.findMatches(code, this.patterns.endpoints.hostedPayments);
    if (hostedPaymentsMatches.length > 0) {
      results.push({
        type: ConvergeEndpointType.HOSTED_PAYMENTS,
        matches: hostedPaymentsMatches,
        confidence: this.calculateConfidence(hostedPaymentsMatches, code)
      });
    }

    // Check checkout patterns
    const checkoutMatches = this.findMatches(code, this.patterns.endpoints.checkout);
    if (checkoutMatches.length > 0) {
      results.push({
        type: ConvergeEndpointType.CHECKOUT,
        matches: checkoutMatches,
        confidence: this.calculateConfidence(checkoutMatches, code)
      });
    }

    // Check process transaction patterns
    const processTransactionMatches = this.findMatches(code, this.patterns.endpoints.processTransaction);
    if (processTransactionMatches.length > 0) {
      results.push({
        type: ConvergeEndpointType.PROCESS_TRANSACTION,
        matches: processTransactionMatches,
        confidence: this.calculateConfidence(processTransactionMatches, code)
      });
    }

    // Check batch processing patterns
    const batchProcessingMatches = this.findMatches(code, this.patterns.endpoints.batchProcessing);
    if (batchProcessingMatches.length > 0) {
      results.push({
        type: ConvergeEndpointType.BATCH_PROCESSING,
        matches: batchProcessingMatches,
        confidence: this.calculateConfidence(batchProcessingMatches, code)
      });
    }

    // Check device management patterns
    const deviceManagementMatches = this.findMatches(code, this.patterns.endpoints.deviceManagement);
    if (deviceManagementMatches.length > 0) {
      results.push({
        type: ConvergeEndpointType.DEVICE_MANAGEMENT,
        matches: deviceManagementMatches,
        confidence: this.calculateConfidence(deviceManagementMatches, code)
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract SSL fields with enhanced pattern matching
   */
  public extractSSLFields(code: string, language?: string): Array<{
    field: string;
    line: number;
    context: string;
    confidence: number;
  }> {
    const results: Array<{
      field: string;
      line: number;
      context: string;
      confidence: number;
    }> = [];

    const lines = code.split('\n');

    // Check core SSL pattern
    lines.forEach((line, index) => {
      const matches = line.matchAll(this.patterns.sslFields.core);
      for (const match of matches) {
        results.push({
          field: match[0],
          line: index + 1,
          context: line.trim(),
          confidence: 1.0
        });
      }
    });

    // Check variations with lower confidence
    this.patterns.sslFields.variations.forEach((pattern, patternIndex) => {
      lines.forEach((line, lineIndex) => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          // Normalize the field name
          let fieldName = match[0];
          fieldName = fieldName.replace(/['"$[\]]/g, ''); // Remove quotes, $, brackets
          fieldName = fieldName.toLowerCase(); // Normalize case
          
          // Check if we already have this field (exact match or normalized match)
          const existing = results.find(r => 
            r.field === fieldName || 
            r.field.toLowerCase() === fieldName ||
            fieldName.includes(r.field) ||
            r.field.includes(fieldName)
          );
          if (!existing) {
            results.push({
              field: fieldName,
              line: lineIndex + 1,
              context: line.trim(),
              confidence: 0.8 - (patternIndex * 0.1) // Lower confidence for variations
            });
          }
        }
      });
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect HTTP client usage patterns (with language parameter)
   */
  public detectHTTPClientUsage(code: string, language: string): Array<{
    method: string;
    library: string;
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    const results: Array<{
      method: string;
      library: string;
      matches: RegExpMatchArray[];
      confidence: number;
    }> = [];

    // Language-specific pattern detection
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript': {
        // Check for JavaScript HTTP libraries with converge context
        const jsHttpPatterns = [
          /fetch\s*\(/gi,
          /axios\.[a-z]+/gi,
          /axios\s*\(/gi,
          /XMLHttpRequest/gi,
          /\$\.ajax/gi,
          /\$\.post/gi,
          /\$\.get/gi
        ];
        
        const jsMatches = this.findMatches(code, jsHttpPatterns);
        const hasConvergeContextJS = /converge/gi.test(code);
        
        if (jsMatches.length > 0 && hasConvergeContextJS) {
          // Determine the specific method
          const method = code.includes('axios') ? 'axios' : 'fetch';
          results.push({
            method,
            library: method,
            matches: jsMatches,
            confidence: 0.9
          });
        }
        break;
      }

      case 'php': {
        // Check for PHP HTTP libraries with converge context
        const phpHttpPatterns = [
          /curl_setopt/gi,
          /curl_init/gi,
          /curl_exec/gi,
          /wp_remote_post/gi,
          /wp_remote_get/gi,
          /file_get_contents/gi
        ];
        
        const phpMatches = this.findMatches(code, phpHttpPatterns);
        const hasConvergeContextPHP = /converge/gi.test(code);
        
        if (phpMatches.length > 0 && hasConvergeContextPHP) {
          results.push({
            method: 'curl',
            library: 'curl',
            matches: phpMatches,
            confidence: 0.8
          });
        }
        break;
      }

      case 'python': {
        // Check for Python HTTP libraries with converge context
        const pythonHttpPatterns = [
          /requests\.[a-z]+/gi,
          /urllib\.request/gi,
          /urllib\.parse/gi,
          /http\.client/gi,
          /HTTPSConnection/gi,
          /urlopen/gi
        ];
        
        const pythonMatches = this.findMatches(code, pythonHttpPatterns);
        const hasConvergeContextPython = /converge/gi.test(code);
        
        if (pythonMatches.length > 0 && hasConvergeContextPython) {
          results.push({
            method: 'requests',
            library: 'requests',
            matches: pythonMatches,
            confidence: 0.9
          });
        }
        break;
      }

      case 'java':
      case 'csharp':
      case 'cs': {
        // Check for Java/C# HTTP libraries with converge context
        const httpClientPatterns = [
          /HttpClient/gi,
          /WebRequest/gi,
          /HttpPost/gi,
          /PostAsync/gi,
          /HttpWebRequest/gi,
          /RestSharp/gi,
          /WebClient/gi,
          /HttpRequestMessage/gi,
          /RestClient/gi,
          /URL\s*\(/gi,
          /HttpURLConnection/gi,
          /openConnection/gi
        ];
        
        const httpClientMatches = this.findMatches(code, httpClientPatterns);
        const hasConvergeContextHttp = /converge/gi.test(code);
        
        if (httpClientMatches.length > 0 && hasConvergeContextHttp) {
          results.push({
            method: 'HttpClient',
            library: 'HttpClient',
            matches: httpClientMatches,
            confidence: 0.8
          });
        }
        break;
      }

      case 'ruby': {
        // Check Ruby patterns - look for HTTP libraries and converge context
        const rubyHttpPatterns = [
          /Net::HTTP\.[a-z]+/gi,
          /HTTParty\.[a-z]+/gi,
          /RestClient\.[a-z]+/gi,
          /Faraday\.[a-z]+/gi
        ];
        
        const rubyMatches = this.findMatches(code, rubyHttpPatterns);
        const hasConvergeContext = /converge/gi.test(code);
        
        if (rubyMatches.length > 0 && hasConvergeContext) {
          results.push({
            method: 'ruby_http',
            library: 'ruby',
            matches: rubyMatches,
            confidence: 0.9
          });
        }
        break;
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect HTTP method patterns (backward compatibility)
   */
  public detectHTTPMethods(code: string): Array<{
    method: string;
    library: string;
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    // Try to detect language from code patterns and use appropriate detection
    const results: Array<{
      method: string;
      library: string;
      matches: RegExpMatchArray[];
      confidence: number;
    }> = [];

    // Check all languages
    const languages = ['javascript', 'php', 'python', 'java', 'csharp', 'ruby'];
    
    for (const lang of languages) {
      const langResults = this.detectHTTPClientUsage(code, lang);
      results.push(...langResults);
    }

    // Remove duplicates and sort by confidence
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.method === result.method && r.library === result.library)
    );

    return uniqueResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect configuration patterns
   */
  public detectConfiguration(code: string): {
    apiKeys: RegExpMatchArray[];
    endpoints: RegExpMatchArray[];
    hasConfiguration: boolean;
  } {
    const apiKeyMatches = this.findMatches(code, this.patterns.config.apiKeys);
    const endpointMatches = this.findMatches(code, this.patterns.config.endpoints);

    return {
      apiKeys: apiKeyMatches,
      endpoints: endpointMatches,
      hasConfiguration: apiKeyMatches.length > 0 || endpointMatches.length > 0
    };
  }

  /**
   * Detect configuration patterns (alternative method name)
   */
  public detectConfigurationPatterns(code: string): Array<{
    type: 'api_key' | 'environment' | 'config_file';
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    const results: Array<{
      type: 'api_key' | 'environment' | 'config_file';
      matches: RegExpMatchArray[];
      confidence: number;
    }> = [];

    // Check API key patterns
    for (const pattern of this.patterns.config.apiKeys) {
      const matches = Array.from(code.matchAll(pattern));
      if (matches.length > 0) {
        results.push({
          type: 'api_key',
          matches,
          confidence: 0.9
        });
      }
    }

    // Check environment variable patterns
    for (const pattern of this.patterns.config.environment) {
      const matches = Array.from(code.matchAll(pattern));
      if (matches.length > 0) {
        results.push({
          type: 'environment',
          matches,
          confidence: 0.9
        });
      }
    }

    // Check config file patterns
    for (const pattern of this.patterns.config.configFile) {
      const matches = Array.from(code.matchAll(pattern));
      if (matches.length > 0) {
        results.push({
          type: 'config_file',
          matches,
          confidence: 0.8
        });
      }
    }

    // Check endpoint patterns
    for (const pattern of this.patterns.config.endpoints) {
      const matches = Array.from(code.matchAll(pattern));
      if (matches.length > 0) {
        results.push({
          type: 'config_file',
          matches,
          confidence: 0.7
        });
      }
    }

    return results;
  }

  /**
   * Detect endpoints (alternative method name)
   */
  public detectEndpoints(code: string, _filePath: string): Array<{
    type: ConvergeEndpointType;
    matches: RegExpMatchArray[];
    confidence: number;
  }> {
    return this.matchEndpoints(code);
  }

  /**
   * Detect migration-related comments
   */
  public detectMigrationComments(code: string): {
    todos: RegExpMatchArray[];
    migrationNotes: RegExpMatchArray[];
    hasMigrationContext: boolean;
  } {
    const todoMatches = this.findMatches(code, this.patterns.comments.todo);
    const migrationMatches = this.findMatches(code, this.patterns.comments.migration);

    return {
      todos: todoMatches,
      migrationNotes: migrationMatches,
      hasMigrationContext: todoMatches.length > 0 || migrationMatches.length > 0
    };
  }

  /**
   * Comprehensive pattern analysis
   */
  public analyzeCode(code: string): {
    endpoints: Array<{
      type: ConvergeEndpointType;
      matches: RegExpMatchArray[];
      confidence: number;
    }>;
    sslFields: Array<{
      field: string;
      line: number;
      context: string;
      confidence: number;
    }>;
    httpMethods: Array<{
      method: string;
      library: string;
      matches: RegExpMatchArray[];
      confidence: number;
    }>;
    configuration: {
      apiKeys: RegExpMatchArray[];
      endpoints: RegExpMatchArray[];
      hasConfiguration: boolean;
    };
    migrationContext: {
      todos: RegExpMatchArray[];
      migrationNotes: RegExpMatchArray[];
      hasMigrationContext: boolean;
    };
    overallConfidence: number;
  } {
    const endpoints = this.matchEndpoints(code);
    const sslFields = this.extractSSLFields(code);
    const httpMethods = this.detectHTTPMethods(code);
    const configuration = this.detectConfiguration(code);
    const migrationContext = this.detectMigrationComments(code);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence({
      endpoints,
      sslFields,
      httpMethods,
      configuration,
      migrationContext
    });

    return {
      endpoints,
      sslFields,
      httpMethods,
      configuration,
      migrationContext,
      overallConfidence
    };
  }

  /**
   * Find matches for multiple patterns
   */
  private findMatches(code: string, patterns: RegExp[]): RegExpMatchArray[] {
    const matches: RegExpMatchArray[] = [];
    
    patterns.forEach(pattern => {
      const patternMatches = Array.from(code.matchAll(pattern));
      matches.push(...patternMatches);
    });

    return matches;
  }

  /**
   * Calculate confidence score for matches
   */
  private calculateConfidence(matches: RegExpMatchArray[], code: string): number {
    if (matches.length === 0) return 0;

    let confidence = 0.5; // Base confidence

    // More matches = higher confidence
    confidence += Math.min(matches.length * 0.1, 0.3);

    // Check for supporting evidence
    const hasSSLFields = this.patterns.sslFields.core.test(code);
    if (hasSSLFields) confidence += 0.2;

    const hasConvergeURL = this.patterns.urls.converge.some(pattern => pattern.test(code));
    if (hasConvergeURL) confidence += 0.2;

    const hasHTTPMethod = Object.values(this.patterns.httpMethods)
      .flat()
      .some(pattern => pattern.test(code));
    if (hasHTTPMethod) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Classify configuration pattern type
   */
  private classifyConfigPattern(pattern: RegExp): 'api_key' | 'environment' | 'config_file' {
    const source = pattern.source.toLowerCase();
    
    if (source.includes('env') || source.includes('process')) {
      return 'environment';
    }
    if (source.includes('config') || source.includes('settings')) {
      return 'config_file';
    }
    return 'api_key';
  }

  /**
   * Calculate overall confidence for code analysis
   */
  private calculateOverallConfidence(analysis: {
    endpoints: any[];
    sslFields: any[];
    httpMethods: any[];
    configuration: any;
    migrationContext: any;
  }): number {
    let confidence = 0;
    let factors = 0;

    // Endpoint detection
    if (analysis.endpoints.length > 0) {
      confidence += analysis.endpoints[0].confidence * 0.4;
      factors += 0.4;
    }

    // SSL fields
    if (analysis.sslFields.length > 0) {
      const avgSSLConfidence = analysis.sslFields.reduce((sum, field) => sum + field.confidence, 0) / analysis.sslFields.length;
      confidence += avgSSLConfidence * 0.3;
      factors += 0.3;
    }

    // HTTP methods
    if (analysis.httpMethods.length > 0) {
      confidence += analysis.httpMethods[0].confidence * 0.2;
      factors += 0.2;
    }

    // Configuration
    if (analysis.configuration.hasConfiguration) {
      confidence += 0.1;
      factors += 0.1;
    }

    return factors > 0 ? confidence / factors : 0;
  }

  /**
   * Get pattern statistics
   */
  public getPatternStatistics(): {
    endpointPatterns: number;
    sslFieldPatterns: number;
    httpMethodPatterns: number;
    configPatterns: number;
    commentPatterns: number;
    totalPatterns: number;
  } {
    const endpointPatterns = Object.values(this.patterns.endpoints).flat().length;
    const sslFieldPatterns = [this.patterns.sslFields.core, ...this.patterns.sslFields.variations].length;
    const httpMethodPatterns = Object.values(this.patterns.httpMethods).flat().length;
    const configPatterns = Object.values(this.patterns.config).flat().length;
    const commentPatterns = Object.values(this.patterns.comments).flat().length;

    return {
      endpointPatterns,
      sslFieldPatterns,
      httpMethodPatterns,
      configPatterns,
      commentPatterns,
      totalPatterns: endpointPatterns + sslFieldPatterns + httpMethodPatterns + configPatterns + commentPatterns
    };
  }
}