import * as vscode from 'vscode';
import { ElavonSandboxClient } from './ElavonSandboxClient';
import { MappingDictionaryService } from './MappingDictionaryService';

/**
 * Interface for validation request
 */
export interface ValidationRequest {
  id: string;
  originalCode: string;
  migratedCode: string;
  language: string;
  endpoint: string;
  testData?: Record<string, any>;
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  id: string;
  success: boolean;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  message: string;
  details: ValidationDetails;
  timestamp: string;
  duration: number;
}

/**
 * Interface for validation details
 */
export interface ValidationDetails {
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

/**
 * Interface for validation error
 */
export interface ValidationError {
  type: 'authentication' | 'request' | 'response' | 'network' | 'parsing' | 'validation';
  code: string;
  message: string;
  details?: any;
  suggestion?: string;
}

/**
 * Interface for validation warning
 */
export interface ValidationWarning {
  type: 'performance' | 'security' | 'compatibility' | 'best-practice';
  message: string;
  suggestion?: string;
}

/**
 * Interface for validation metrics
 */
export interface ValidationMetrics {
  responseTime: number;
  requestSize: number;
  responseSize: number;
  retryCount: number;
}

/**
 * Interface for test data generator
 */
export interface TestDataGenerator {
  generateTestData(endpoint: string, language: string): Record<string, any>;
}

/**
 * Interface for code analyzer
 */
export interface CodeAnalyzer {
  extractApiCall(code: string, language: string): ApiCallInfo | null;
}

/**
 * Interface for API call information
 */
export interface ApiCallInfo {
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  parameters: Record<string, any>;
}

/**
 * Service for validating migrated code against Elavon sandbox
 */
export class MigrationValidationService {
  private _elavonClient: ElavonSandboxClient;
  private _mappingService: MappingDictionaryService;
  private _testDataGenerator: TestDataGenerator;
  private _codeAnalyzer: CodeAnalyzer;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    elavonClient: ElavonSandboxClient,
    mappingService: MappingDictionaryService
  ) {
    this._elavonClient = elavonClient;
    this._mappingService = mappingService;
    this._testDataGenerator = new DefaultTestDataGenerator();
    this._codeAnalyzer = new DefaultCodeAnalyzer();
  }

  /**
   * Validate migrated code against Elavon sandbox
   */
  public async validateMigration(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
      id: request.id,
      success: false,
      status: 'failed',
      message: '',
      details: {
        errors: [],
        warnings: [],
        metrics: {
          responseTime: 0,
          requestSize: 0,
          responseSize: 0,
          retryCount: 0
        }
      },
      timestamp: new Date().toISOString(),
      duration: 0
    };

    try {
      // Extract API call information from migrated code
      const apiCall = this._codeAnalyzer.extractApiCall(request.migratedCode, request.language);
      if (!apiCall) {
        result.details.errors.push({
          type: 'parsing',
          code: 'INVALID_CODE',
          message: 'Could not extract API call information from migrated code',
          suggestion: 'Ensure the migrated code contains a valid Elavon API call'
        });
        return result;
      }

      // Generate test data if not provided
      const testData = request.testData || this._testDataGenerator.generateTestData(request.endpoint, request.language);

      // Prepare request for Elavon API
      const elavonRequest = this._prepareElavonRequest(apiCall, testData);
      result.details.request = elavonRequest;

      // Execute request against Elavon sandbox
      const response = await this._executeValidationRequest(elavonRequest);
      result.details.response = response;

      // Validate response
      const validationResults = this._validateResponse(response, request.endpoint);
      result.details.errors.push(...validationResults.errors);
      result.details.warnings.push(...validationResults.warnings);

      // Determine overall result
      if (result.details.errors.length === 0) {
        result.success = true;
        result.status = 'passed';
        result.message = 'Migration validation passed successfully';
      } else {
        result.success = false;
        result.status = 'failed';
        result.message = `Migration validation failed with ${result.details.errors.length} error(s)`;
      }

    } catch (error) {
      result.details.errors.push({
        type: 'network',
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        details: error
      });
      result.status = 'error';
      result.message = 'Validation failed due to unexpected error';
    } finally {
      result.duration = Date.now() - startTime;
      result.details.metrics.responseTime = result.duration;
    }

    return result;
  }

  /**
   * Validate multiple migrations in batch
   */
  public async validateBatch(requests: ValidationRequest[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.validateMigration(request);
        results.push(result);
      } catch (error) {
        results.push({
          id: request.id,
          success: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            errors: [{
              type: 'network',
              code: 'BATCH_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error'
            }],
            warnings: [],
            metrics: {
              responseTime: 0,
              requestSize: 0,
              responseSize: 0,
              retryCount: 0
            }
          },
          timestamp: new Date().toISOString(),
          duration: 0
        });
      }
    }

    return results;
  }

  /**
   * Generate test data for validation
   */
  public generateTestData(endpoint: string, language: string): Record<string, any> {
    return this._testDataGenerator.generateTestData(endpoint, language);
  }

  /**
   * Analyze code and extract API call information
   */
  public analyzeCode(code: string, language: string): ApiCallInfo | null {
    return this._codeAnalyzer.extractApiCall(code, language);
  }

  /**
   * Get validation statistics
   */
  public getValidationStatistics(results: ValidationResult[]): {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    averageResponseTime: number;
    successRate: number;
  } {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    const totalResponseTime = results.reduce((sum, r) => sum + r.details.metrics.responseTime, 0);
    const averageResponseTime = total > 0 ? totalResponseTime / total : 0;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      errors,
      skipped,
      averageResponseTime,
      successRate
    };
  }

  /**
   * Prepare Elavon API request from extracted API call info
   */
  private _prepareElavonRequest(apiCall: ApiCallInfo, testData: Record<string, any>): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  } {
    // Merge API call data with test data
    const requestBody = { ...apiCall.body, ...testData };
    
    // Ensure required headers are present
    const headers = {
      'Content-Type': 'application/json',
      ...apiCall.headers
    };

    return {
      url: apiCall.endpoint,
      method: apiCall.method,
      headers,
      body: requestBody
    };
  }

  /**
   * Execute validation request against Elavon sandbox
   */
  private async _executeValidationRequest(request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    try {
      // Use ElavonSandboxClient to make the request
      const response = await this._elavonClient.makeRequest({
        method: request.method as any,
        endpoint: request.url,
        data: request.body,
        headers: request.headers
      });

      return {
        status: 200, // Assuming success if no error thrown
        headers: {},
        body: response
      };
    } catch (error: any) {
      // Handle HTTP errors
      if (error.response) {
        return {
          status: error.response.status,
          headers: error.response.headers || {},
          body: error.response.data
        };
      }
      throw error;
    }
  }

  /**
   * Validate API response
   */
  private _validateResponse(response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  }, endpoint: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check HTTP status code
    if (response.status >= 400) {
      errors.push({
        type: 'response',
        code: `HTTP_${response.status}`,
        message: `HTTP error ${response.status}: ${this._getHttpStatusMessage(response.status)}`,
        details: response.body,
        suggestion: this._getHttpErrorSuggestion(response.status)
      });
    }

    // Validate response structure based on endpoint
    const structureValidation = this._validateResponseStructure(response.body, endpoint);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);

    // Check for common Elavon error patterns
    if (response.body && typeof response.body === 'object') {
      if (response.body.error || response.body.errors) {
        errors.push({
          type: 'validation',
          code: 'API_ERROR',
          message: response.body.error || 'API returned error',
          details: response.body.errors || response.body.error
        });
      }

      if (response.body.message && response.body.message.includes('Invalid')) {
        errors.push({
          type: 'validation',
          code: 'INVALID_DATA',
          message: response.body.message,
          suggestion: 'Check field mappings and data formats'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate response structure for specific endpoint
   */
  private _validateResponseStructure(body: any, endpoint: string): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!body || typeof body !== 'object') {
      errors.push({
        type: 'response',
        code: 'INVALID_RESPONSE',
        message: 'Response body is not a valid JSON object'
      });
      return { errors, warnings };
    }

    // Endpoint-specific validation
    switch (endpoint) {
      case '/v1/payments':
        if (!body.transaction_id) {
          errors.push({
            type: 'response',
            code: 'MISSING_TRANSACTION_ID',
            message: 'Response missing required transaction_id field'
          });
        }
        if (!body.status) {
          errors.push({
            type: 'response',
            code: 'MISSING_STATUS',
            message: 'Response missing required status field'
          });
        }
        break;

      case '/v1/auth':
        if (!body.access_token) {
          errors.push({
            type: 'response',
            code: 'MISSING_ACCESS_TOKEN',
            message: 'Authentication response missing access_token'
          });
        }
        break;

      default:
        // Generic validation for unknown endpoints
        if (!body.id && !body.transaction_id && !body.reference) {
          warnings.push({
            type: 'compatibility',
            message: 'Response does not contain common identifier fields (id, transaction_id, reference)'
          });
        }
    }

    return { errors, warnings };
  }

  /**
   * Get HTTP status message
   */
  private _getHttpStatusMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return messages[status] || 'Unknown Error';
  }

  /**
   * Get suggestion for HTTP error
   */
  private _getHttpErrorSuggestion(status: number): string {
    const suggestions: Record<number, string> = {
      400: 'Check request format and required fields',
      401: 'Verify API credentials and authentication',
      403: 'Check API permissions and access rights',
      404: 'Verify endpoint URL and API version',
      422: 'Validate request data and field formats',
      429: 'Implement rate limiting and retry logic',
      500: 'Contact Elavon support if issue persists',
      502: 'Check network connectivity and try again',
      503: 'Elavon service may be temporarily unavailable'
    };
    return suggestions[status] || 'Check Elavon API documentation';
  }
}

/**
 * Default test data generator implementation
 */
class DefaultTestDataGenerator implements TestDataGenerator {
  generateTestData(endpoint: string, language: string): Record<string, any> {
    const baseTestData = {
      // Common test data
      amount: 10.00,
      currency: 'USD',
      card_number: '4111111111111111',
      expiry_date: '12/25',
      cvv: '123',
      cardholder_name: 'Test User'
    };

    // Endpoint-specific test data
    switch (endpoint) {
      case '/v1/payments':
        return {
          ...baseTestData,
          description: 'Test payment transaction',
          reference: `test-${Date.now()}`
        };

      case '/v1/auth':
        return {
          grant_type: 'client_credentials',
          scope: 'payments'
        };

      case '/v1/refunds':
        return {
          ...baseTestData,
          original_transaction_id: 'txn_12345',
          reason: 'Customer request'
        };

      default:
        return baseTestData;
    }
  }
}

/**
 * Default code analyzer implementation
 */
class DefaultCodeAnalyzer implements CodeAnalyzer {
  extractApiCall(code: string, language: string): ApiCallInfo | null {
    try {
      // Simple regex-based extraction for common patterns
      const patterns = this._getExtractionPatterns(language);
      
      for (const pattern of patterns) {
        const match = code.match(pattern.regex);
        if (match) {
          return pattern.extract(match, code);
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting API call:', error);
      return null;
    }
  }

  private _getExtractionPatterns(language: string): Array<{
    regex: RegExp;
    extract: (match: RegExpMatchArray, code: string) => ApiCallInfo;
  }> {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          {
            regex: /fetch\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+)\}/s,
            extract: (match, code) => this._extractJavaScriptFetch(match, code)
          },
          {
            regex: /axios\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/,
            extract: (match, code) => this._extractAxiosCall(match, code)
          }
        ];

      case 'python':
        return [
          {
            regex: /requests\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/,
            extract: (match, code) => this._extractPythonRequests(match, code)
          }
        ];

      case 'java':
        return [
          {
            regex: /HttpPost\s+\w+\s*=\s*new\s+HttpPost\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/,
            extract: (match, code) => this._extractJavaHttpPost(match, code)
          }
        ];

      case 'csharp':
        return [
          {
            regex: /HttpClient\s*\.\s*(GetAsync|PostAsync|PutAsync|DeleteAsync)\s*\(\s*['"`]([^'"`]+)['"`]/,
            extract: (match, code) => this._extractCSharpHttpClient(match, code)
          }
        ];

      default:
        return [];
    }
  }

  private _extractJavaScriptFetch(match: RegExpMatchArray, code: string): ApiCallInfo {
    const url = match[1];
    const optionsStr = match[2];
    
    // Extract method from options
    const methodMatch = optionsStr.match(/method\s*:\s*['"`](\w+)['"`]/);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    
    // Extract headers
    const headersMatch = optionsStr.match(/headers\s*:\s*\{([^}]+)\}/);
    const headers: Record<string, string> = {};
    if (headersMatch) {
      const headerStr = headersMatch[1];
      const headerMatches = headerStr.matchAll(/['"`]([^'"`]+)['"`]\s*:\s*['"`]([^'"`]+)['"`]/g);
      for (const headerMatch of headerMatches) {
        headers[headerMatch[1]] = headerMatch[2];
      }
    }
    
    // Extract body
    const bodyMatch = optionsStr.match(/body\s*:\s*JSON\.stringify\s*\(([^)]+)\)/);
    let body = {};
    if (bodyMatch) {
      try {
        // This is a simplified extraction - in practice, you'd need more sophisticated parsing
        body = JSON.parse(bodyMatch[1].replace(/'/g, '"'));
      } catch (error) {
        // Fallback to empty object
      }
    }

    return {
      endpoint: url,
      method,
      headers,
      body,
      parameters: {}
    };
  }

  private _extractAxiosCall(match: RegExpMatchArray, code: string): ApiCallInfo {
    const method = match[1].toUpperCase();
    const url = match[2];
    
    return {
      endpoint: url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body: {},
      parameters: {}
    };
  }

  private _extractPythonRequests(match: RegExpMatchArray, code: string): ApiCallInfo {
    const method = match[1].toUpperCase();
    const url = match[2];
    
    return {
      endpoint: url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body: {},
      parameters: {}
    };
  }

  private _extractJavaHttpPost(match: RegExpMatchArray, code: string): ApiCallInfo {
    const url = match[1];
    
    return {
      endpoint: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {},
      parameters: {}
    };
  }

  private _extractCSharpHttpClient(match: RegExpMatchArray, code: string): ApiCallInfo {
    const method = match[1].replace('Async', '').toUpperCase();
    const url = match[2];
    
    return {
      endpoint: url,
      method,
      headers: { 'Content-Type': 'application/json' },
      body: {},
      parameters: {}
    };
  }
}