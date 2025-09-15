import axios, { AxiosResponse, AxiosError } from 'axios';
import { ElavonCredentials } from './CredentialService';

/**
 * Interface for Elavon API validation results
 */
export interface ValidationResult {
  success: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
  endpoint?: string;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Interface for Elavon API endpoints
 */
export interface ElavonEndpoints {
  sandbox: string;
  production: string;
}

/**
 * Service for validating Elavon credentials and testing API connectivity
 */
export class ElavonValidationService {
  private static readonly ENDPOINTS: ElavonEndpoints = {
    sandbox: 'https://uat.api.converge.eu.elavonaws.com',
    production: 'https://api.converge.eu.elavonaws.com'
  };

  private static readonly TIMEOUT_MS = 30000; // 30 seconds
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000; // 1 second

  /**
   * Validate Elavon credentials by testing API connectivity
   */
  async validateCredentials(credentials: ElavonCredentials): Promise<ValidationResult> {
    const startTime = Date.now();
    
    // Check for null credentials first
    if (!credentials) {
      return {
        success: false,
        message: 'Invalid credentials provided',
        error: 'Credentials are required',
        responseTime: Date.now() - startTime,
        endpoint: 'unknown'
      };
    }
    
    try {
      // Validate credential format first
      this.validateCredentialFormat(credentials);

      // Get appropriate endpoint
      const endpoint = this.getEndpointForEnvironment(credentials.environment);
      
      // Test API connectivity with a simple health check or token validation
      const result = await this.testApiConnectivity(credentials, endpoint);
      
      const responseTime = Date.now() - startTime;
      
      return {
        ...result,
        responseTime,
        endpoint
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        message: 'Credential validation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        endpoint: credentials ? this.getEndpointForEnvironment(credentials.environment) : 'unknown'
      };
    }
  }

  /**
   * Test connection to Elavon sandbox environment
   */
  async testSandboxConnection(credentials: ElavonCredentials): Promise<ValidationResult> {
    if (credentials.environment !== 'sandbox') {
      return {
        success: false,
        message: 'Credentials are not configured for sandbox environment',
        error: 'Environment mismatch'
      };
    }

    return this.validateCredentials(credentials);
  }

  /**
   * Test connection to Elavon production environment
   */
  async testProductionConnection(credentials: ElavonCredentials): Promise<ValidationResult> {
    if (credentials.environment !== 'production') {
      return {
        success: false,
        message: 'Credentials are not configured for production environment',
        error: 'Environment mismatch'
      };
    }

    return this.validateCredentials(credentials);
  }

  /**
   * Validate credential expiration and refresh handling
   */
  async checkCredentialExpiration(credentials: ElavonCredentials): Promise<ValidationResult> {
    try {
      // Test with a simple API call to check if credentials are still valid
      const result = await this.validateCredentials(credentials);
      
      if (!result.success && result.statusCode === 401) {
        return {
          success: false,
          message: 'Credentials appear to be expired or invalid',
          error: 'Authentication failed',
          statusCode: 401,
          details: {
            suggestion: 'Please update your Elavon API credentials',
            action: 'refresh_credentials'
          }
        };
      }

      return {
        success: true,
        message: 'Credentials are valid and not expired',
        details: {
          lastValidated: new Date().toISOString(),
          environment: credentials.environment
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to check credential expiration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform comprehensive credential validation workflow
   */
  async performComprehensiveValidation(credentials: ElavonCredentials): Promise<{
    formatValidation: ValidationResult;
    connectivityTest: ValidationResult;
    expirationCheck: ValidationResult;
    overallResult: ValidationResult;
  }> {
    // Step 1: Format validation
    const formatValidation = this.validateCredentialFormatResult(credentials);
    
    // Step 2: Connectivity test (only if format is valid)
    let connectivityTest: ValidationResult;
    if (formatValidation.success) {
      connectivityTest = await this.validateCredentials(credentials);
    } else {
      connectivityTest = {
        success: false,
        message: 'Skipped due to format validation failure',
        error: 'Invalid credential format'
      };
    }

    // Step 3: Expiration check (only if connectivity test passes)
    let expirationCheck: ValidationResult;
    if (connectivityTest.success) {
      expirationCheck = await this.checkCredentialExpiration(credentials);
    } else {
      expirationCheck = {
        success: false,
        message: 'Skipped due to connectivity test failure',
        error: 'Connection failed'
      };
    }

    // Overall result
    const overallResult: ValidationResult = {
      success: formatValidation.success && connectivityTest.success && expirationCheck.success,
      message: this.generateOverallMessage(formatValidation, connectivityTest, expirationCheck),
      details: {
        formatValid: formatValidation.success,
        connectionValid: connectivityTest.success,
        credentialsValid: expirationCheck.success,
        environment: credentials.environment
      }
    };

    return {
      formatValidation,
      connectivityTest,
      expirationCheck,
      overallResult
    };
  }

  /**
   * Test API connectivity with retry logic
   */
  private async testApiConnectivity(
    credentials: ElavonCredentials, 
    endpoint: string
  ): Promise<ValidationResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= ElavonValidationService.RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await this.makeTestApiCall(credentials, endpoint);
        
        if (result.success) {
          return result;
        }
        
        // If it's an authentication error, don't retry
        if (result.statusCode === 401 || result.statusCode === 403) {
          return result;
        }
        
        lastError = new Error(result.error || 'API call failed');
        
        // Wait before retry (except on last attempt)
        if (attempt < ElavonValidationService.RETRY_ATTEMPTS) {
          await this.delay(ElavonValidationService.RETRY_DELAY_MS * attempt);
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Wait before retry (except on last attempt)
        if (attempt < ElavonValidationService.RETRY_ATTEMPTS) {
          await this.delay(ElavonValidationService.RETRY_DELAY_MS * attempt);
        }
      }
    }

    return {
      success: false,
      message: `API connectivity test failed after ${ElavonValidationService.RETRY_ATTEMPTS} attempts`,
      error: lastError?.message || 'Connection failed'
    };
  }

  /**
   * Make a test API call to validate credentials
   */
  private async makeTestApiCall(
    credentials: ElavonCredentials, 
    endpoint: string
  ): Promise<ValidationResult> {
    try {
      // Use a simple endpoint that requires authentication but doesn't perform transactions
      // This could be a health check or token validation endpoint
      const testEndpoint = `${endpoint}/v1/health`; // Placeholder endpoint
      
      const response: AxiosResponse = await axios.get(testEndpoint, {
        headers: {
          'Authorization': `Bearer ${credentials.publicKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Converge-Elavon-Migrator/1.0.0'
        },
        timeout: ElavonValidationService.TIMEOUT_MS,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'API connectivity test successful',
          statusCode: response.status,
          details: {
            environment: credentials.environment,
            endpoint: testEndpoint
          }
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Authentication failed - invalid credentials',
          statusCode: response.status,
          error: 'Invalid API credentials'
        };
      } else if (response.status === 403) {
        return {
          success: false,
          message: 'Access forbidden - insufficient permissions',
          statusCode: response.status,
          error: 'Insufficient permissions'
        };
      } else {
        return {
          success: false,
          message: `API returned unexpected status: ${response.status}`,
          statusCode: response.status,
          error: response.statusText
        };
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.code === 'ECONNABORTED') {
          return {
            success: false,
            message: 'API request timed out',
            error: 'Connection timeout',
            statusCode: 408
          };
        }
        
        if (axiosError.response) {
          return {
            success: false,
            message: `API error: ${axiosError.response.status}`,
            statusCode: axiosError.response.status,
            error: axiosError.message
          };
        }
        
        if (axiosError.request) {
          return {
            success: false,
            message: 'No response received from API',
            error: 'Network error'
          };
        }
      }

      return {
        success: false,
        message: 'API connectivity test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate credential format without making API calls
   */
  private validateCredentialFormat(credentials: ElavonCredentials): void {
    if (!credentials) {
      throw new Error('Credentials are required');
    }

    if (!credentials.publicKey || !credentials.secretKey) {
      throw new Error('Both public key and secret key are required');
    }

    if (!credentials.environment) {
      throw new Error('Environment is required');
    }

    // Validate key formats
    const publicKeyPattern = /^pk_(test_|live_)?[a-zA-Z0-9]{24,}$/;
    const secretKeyPattern = /^sk_(test_|live_)?[a-zA-Z0-9]{24,}$/;

    if (!publicKeyPattern.test(credentials.publicKey)) {
      throw new Error('Invalid public key format');
    }

    if (!secretKeyPattern.test(credentials.secretKey)) {
      throw new Error('Invalid secret key format');
    }

    // Validate environment consistency
    const isTestKey = credentials.publicKey.includes('test_') || credentials.secretKey.includes('test_');
    const isLiveKey = credentials.publicKey.includes('live_') || credentials.secretKey.includes('live_');

    if (credentials.environment === 'production' && isTestKey) {
      throw new Error('Cannot use test keys in production environment');
    }

    if (credentials.environment === 'sandbox' && isLiveKey) {
      throw new Error('Cannot use live keys in sandbox environment');
    }
  }

  /**
   * Validate credential format and return result object
   */
  private validateCredentialFormatResult(credentials: ElavonCredentials): ValidationResult {
    try {
      this.validateCredentialFormat(credentials);
      return {
        success: true,
        message: 'Credential format validation passed'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Credential format validation failed',
        error: error instanceof Error ? error.message : 'Invalid format'
      };
    }
  }

  /**
   * Get appropriate endpoint for environment
   */
  private getEndpointForEnvironment(environment: 'sandbox' | 'production'): string {
    return environment === 'production' 
      ? ElavonValidationService.ENDPOINTS.production 
      : ElavonValidationService.ENDPOINTS.sandbox;
  }

  /**
   * Generate overall validation message
   */
  private generateOverallMessage(
    formatValidation: ValidationResult,
    connectivityTest: ValidationResult,
    expirationCheck: ValidationResult
  ): string {
    if (formatValidation.success && connectivityTest.success && expirationCheck.success) {
      return 'All credential validations passed successfully';
    }

    const failures: string[] = [];
    if (!formatValidation.success) failures.push('format validation');
    if (!connectivityTest.success) failures.push('connectivity test');
    if (!expirationCheck.success) failures.push('expiration check');

    return `Credential validation failed: ${failures.join(', ')}`;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get validation service configuration
   */
  static getConfiguration(): {
    endpoints: ElavonEndpoints;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  } {
    return {
      endpoints: ElavonValidationService.ENDPOINTS,
      timeout: ElavonValidationService.TIMEOUT_MS,
      retryAttempts: ElavonValidationService.RETRY_ATTEMPTS,
      retryDelay: ElavonValidationService.RETRY_DELAY_MS
    };
  }

  /**
   * Check if endpoint is reachable
   */
  static async isEndpointReachable(endpoint: string): Promise<boolean> {
    try {
      const response = await axios.get(endpoint, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }
}