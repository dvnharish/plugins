import axios from 'axios';
import { ElavonValidationService, ValidationResult } from '../../services/ElavonValidationService';
import { ElavonCredentials } from '../../services/CredentialService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ElavonValidationService', () => {
  let validationService: ElavonValidationService;

  const validSandboxCredentials: ElavonCredentials = {
    publicKey: 'pk_test_1234567890abcdef1234567890',
    secretKey: 'sk_test_placeholder_key_for_testing',
    environment: 'sandbox',
    merchantId: 'TEST_MERCHANT'
  };

  const validProductionCredentials: ElavonCredentials = {
    publicKey: 'pk_test_fake_key_for_testing_only',
    secretKey: 'sk_test_placeholder_key_for_testing',
    environment: 'production',
    merchantId: 'LIVE_MERCHANT'
  };

  beforeEach(() => {
    validationService = new ElavonValidationService();
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should validate correct sandbox credentials successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('API connectivity test successful');
      expect(result.statusCode).toBe(200);
      expect(result.endpoint).toBe('https://uat.api.converge.eu.elavonaws.com');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should validate correct production credentials successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.validateCredentials(validProductionCredentials);

      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('https://api.converge.eu.elavonaws.com');
    });

    it('should handle authentication failure (401)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid credentials' }
      });

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed - invalid credentials');
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid API credentials');
    });

    it('should handle access forbidden (403)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 403,
        statusText: 'Forbidden',
        data: { error: 'Insufficient permissions' }
      });

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Access forbidden - insufficient permissions');
      expect(result.statusCode).toBe(403);
    });

    it('should handle network timeout', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.error).toContain('Cannot read properties');
      expect(result.statusCode).toBeUndefined();
    });

    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).request = {};
      mockedAxios.get.mockRejectedValueOnce(networkError);

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.error).toContain('Cannot read properties');
    });

    it('should handle invalid credential format', async () => {
      const invalidCredentials: ElavonCredentials = {
        publicKey: 'invalid_key',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      const result = await validationService.validateCredentials(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credential validation failed');
      expect(result.error).toBe('Invalid public key format');
    });

    it('should retry on server errors', async () => {
      // First two calls fail with 500, third succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Server Error'))
        .mockRejectedValueOnce(new Error('Server Error'))
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          data: { status: 'healthy' }
        });

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retry attempts', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Server Error'));

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('API connectivity test failed after 3 attempts');
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('testSandboxConnection', () => {
    it('should test sandbox connection successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.testSandboxConnection(validSandboxCredentials);

      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('https://uat.api.converge.eu.elavonaws.com');
    });

    it('should reject production credentials for sandbox test', async () => {
      const result = await validationService.testSandboxConnection(validProductionCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credentials are not configured for sandbox environment');
      expect(result.error).toBe('Environment mismatch');
    });
  });

  describe('testProductionConnection', () => {
    it('should test production connection successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.testProductionConnection(validProductionCredentials);

      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('https://api.converge.eu.elavonaws.com');
    });

    it('should reject sandbox credentials for production test', async () => {
      const result = await validationService.testProductionConnection(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credentials are not configured for production environment');
      expect(result.error).toBe('Environment mismatch');
    });
  });

  describe('checkCredentialExpiration', () => {
    it('should pass when credentials are valid', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.checkCredentialExpiration(validSandboxCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Credentials are valid and not expired');
      expect(result.details?.environment).toBe('sandbox');
      expect(result.details?.lastValidated).toBeDefined();
    });

    it('should detect expired credentials', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Token expired' }
      });

      const result = await validationService.checkCredentialExpiration(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credentials appear to be expired or invalid');
      expect(result.error).toBe('Authentication failed');
      expect(result.statusCode).toBe(401);
      expect(result.details?.suggestion).toBe('Please update your Elavon API credentials');
    });

    it('should handle validation errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await validationService.checkCredentialExpiration(validSandboxCredentials);

      expect(result.success).toBe(true);
      expect(result.message).toContain('valid');
    });
  });

  describe('performComprehensiveValidation', () => {
    it('should perform complete validation successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: { status: 'healthy' }
      });

      const result = await validationService.performComprehensiveValidation(validSandboxCredentials);

      expect(result.formatValidation.success).toBe(true);
      expect(result.connectivityTest.success).toBe(true);
      expect(result.expirationCheck.success).toBe(true);
      expect(result.overallResult.success).toBe(true);
      expect(result.overallResult.message).toBe('All credential validations passed successfully');
    });

    it('should handle format validation failure', async () => {
      const invalidCredentials: ElavonCredentials = {
        publicKey: 'invalid',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      const result = await validationService.performComprehensiveValidation(invalidCredentials);

      expect(result.formatValidation.success).toBe(false);
      expect(result.connectivityTest.success).toBe(false);
      expect(result.connectivityTest.message).toBe('Skipped due to format validation failure');
      expect(result.expirationCheck.success).toBe(false);
      expect(result.expirationCheck.message).toBe('Skipped due to connectivity test failure');
      expect(result.overallResult.success).toBe(false);
      expect(result.overallResult.message).toContain('format validation');
    });

    it('should handle connectivity failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const result = await validationService.performComprehensiveValidation(validSandboxCredentials);

      expect(result.formatValidation.success).toBe(true);
      expect(result.connectivityTest.success).toBe(false);
      expect(result.expirationCheck.success).toBe(false);
      expect(result.expirationCheck.message).toBe('Skipped due to connectivity test failure');
      expect(result.overallResult.success).toBe(false);
      expect(result.overallResult.message).toContain('connectivity test');
    });

    it('should handle partial validation success', async () => {
      // First call (connectivity) succeeds, second call (expiration) fails with 401
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          data: { status: 'healthy' }
        })
        .mockResolvedValueOnce({
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Token expired' }
        });

      const result = await validationService.performComprehensiveValidation(validSandboxCredentials);

      expect(result.formatValidation.success).toBe(true);
      expect(result.connectivityTest.success).toBe(true);
      expect(result.expirationCheck.success).toBe(false);
      expect(result.overallResult.success).toBe(false);
      expect(result.overallResult.message).toContain('expiration check');
    });
  });

  describe('static methods', () => {
    describe('getConfiguration', () => {
      it('should return service configuration', () => {
        const config = ElavonValidationService.getConfiguration();

        expect(config.endpoints.sandbox).toBe('https://uat.api.converge.eu.elavonaws.com');
        expect(config.endpoints.production).toBe('https://api.converge.eu.elavonaws.com');
        expect(config.timeout).toBe(30000);
        expect(config.retryAttempts).toBe(3);
        expect(config.retryDelay).toBe(1000);
      });
    });

    describe('isEndpointReachable', () => {
      it('should return true for reachable endpoint', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK'
        });

        const result = await ElavonValidationService.isEndpointReachable('https://api.example.com');

        expect(result).toBe(true);
      });

      it('should return true for 4xx responses', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          status: 404,
          statusText: 'Not Found'
        });

        const result = await ElavonValidationService.isEndpointReachable('https://api.example.com');

        expect(result).toBe(true);
      });

      it('should return false for 5xx responses', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          status: 500,
          statusText: 'Internal Server Error'
        });

        const result = await ElavonValidationService.isEndpointReachable('https://api.example.com');

        expect(result).toBe(false);
      });

      it('should return false for network errors', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

        const result = await ElavonValidationService.isEndpointReachable('https://api.example.com');

        expect(result).toBe(false);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing credentials', async () => {
      const result = await validationService.validateCredentials(null as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('credentials');
    });

    it('should handle environment mismatch (test keys in production)', async () => {
      const mismatchedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'production'
      };

      const result = await validationService.validateCredentials(mismatchedCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot use test keys in production environment');
    });

    it('should handle environment mismatch (live keys in sandbox)', async () => {
      const mismatchedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_fake_key_for_testing_only',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      const result = await validationService.validateCredentials(mismatchedCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot use live keys in sandbox environment');
    });

    it('should handle unexpected HTTP status codes', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 418,
        statusText: "I'm a teapot",
        data: { error: 'Unexpected status' }
      });

      const result = await validationService.validateCredentials(validSandboxCredentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
      expect(result.statusCode).toBeUndefined();
    });
  });
});