import { ElavonSandboxClient, ElavonApiRequest } from '../../services/ElavonSandboxClient';
import { CredentialService, ElavonCredentials } from '../../services/CredentialService';
import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock VS Code API
jest.mock('vscode', () => ({}));

// Mock CredentialService
jest.mock('../../services/CredentialService');
const MockCredentialService = CredentialService as jest.MockedClass<typeof CredentialService>;

describe('ElavonSandboxClient', () => {
  let client: ElavonSandboxClient;
  let mockContext: vscode.ExtensionContext;
  let mockCredentialService: jest.Mocked<CredentialService>;
  let mockAxiosInstance: any;

  const mockCredentials: ElavonCredentials = {
    publicKey: 'pk_test_123456789',
    secretKey: 'sk_test_987654321',
    merchantId: 'merchant_123',
    environment: 'sandbox'
  };

  beforeEach(() => {
    mockContext = {} as vscode.ExtensionContext;
    
    mockCredentialService = {
      retrieveCredentials: jest.fn()
    } as any;

    MockCredentialService.mockImplementation(() => mockCredentialService);

    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockImplementation((error: any) => {
      return error && error.isAxiosError === true;
    });

    client = new ElavonSandboxClient(mockContext);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid credentials', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);

      await client.initialize();

      expect(mockCredentialService.retrieveCredentials).toHaveBeenCalled();
      expect(client.getCredentialsInfo()).toEqual({
        environment: 'sandbox',
        hasCredentials: true
      });
    });

    it('should throw error when no credentials found', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(null);

      await expect(client.initialize()).rejects.toThrow('No Elavon credentials found');
    });

    it('should warn when using production credentials', async () => {
      const productionCredentials = { ...mockCredentials, environment: 'production' as const };
      mockCredentialService.retrieveCredentials.mockResolvedValue(productionCredentials);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await client.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using production credentials with sandbox client')
      );

      consoleSpy.mockRestore();
    });

    it('should handle credential service errors', async () => {
      mockCredentialService.retrieveCredentials.mockRejectedValue(new Error('Credential error'));

      await expect(client.initialize()).rejects.toThrow('Failed to initialize client');
    });
  });

  describe('makeRequest', () => {
    beforeEach(async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();
    });

    it('should make successful API request', async () => {
      const mockResponse = {
        data: { success: true, transactionId: 'txn_123' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const request: ElavonApiRequest = {
        endpoint: '/v1/payments',
        method: 'POST',
        data: { amount: 100 }
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(result.status).toBe(200);
      expect(result.metadata.retryCount).toBe(0);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/payments',
          data: { amount: 100 }
        })
      );
    });

    it('should throw error when not initialized', async () => {
      const uninitializedClient = new ElavonSandboxClient(mockContext);
      
      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      await expect(uninitializedClient.makeRequest(request)).rejects.toThrow('Client not initialized');
    });

    it('should retry on retryable HTTP status codes', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 503',
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          config: {} as any
        },
        toJSON: () => ({})
      } as AxiosError;

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockResponse);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(true);
      expect(result.metadata.retryCount).toBe(2);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors', async () => {
      const networkError = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Connection reset',
        code: 'ECONNRESET',
        toJSON: () => ({})
      } as AxiosError;

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue(mockResponse);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(true);
      expect(result.metadata.retryCount).toBe(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable status codes', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Invalid credentials' },
          config: {} as any
        },
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_401');
      expect(result.metadata.retryCount).toBe(0);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after max attempts', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 503',
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          config: {} as any
        },
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HTTP_503');
      expect(result.metadata.retryCount).toBe(3); // Default max retries
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      };

      mockAxiosInstance.request
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue(mockResponse);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(true);
      expect(result.metadata.retryCount).toBe(1);
    });

    it('should include custom headers in request', async () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'POST',
        headers: {
          'Custom-Header': 'custom-value'
        }
      };

      await client.makeRequest(request);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Custom-Header': 'custom-value'
          })
        })
      );
    });
  });

  describe('API methods', () => {
    beforeEach(async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();

      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {}
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);
    });

    it('should test connection', async () => {
      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/health'
        })
      );
    });

    it('should validate payment', async () => {
      const paymentData = { amount: 100, currency: 'USD' };
      
      const result = await client.validatePayment(paymentData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/payments/validate',
          data: paymentData,
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should process test payment', async () => {
      const paymentData = { amount: 100, currency: 'USD' };
      
      const result = await client.processTestPayment(paymentData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/payments',
          data: paymentData
        })
      );
    });

    it('should get transaction status', async () => {
      const transactionId = 'txn_123';
      
      const result = await client.getTransactionStatus(transactionId);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/v1/transactions/txn_123'
        })
      );
    });

    it('should refund transaction', async () => {
      const transactionId = 'txn_123';
      const refundData = { amount: 50, reason: 'Customer request' };
      
      const result = await client.refundTransaction(transactionId, refundData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/transactions/txn_123/refund',
          data: refundData
        })
      );
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = client.getConfig();

      expect(config.baseURL).toBe('https://uat.api.converge.eu.elavonaws.com');
      expect(config.timeout).toBe(30000);
      expect(config.retryConfig.maxRetries).toBe(3);
    });

    it('should update configuration', () => {
      const newConfig = {
        timeout: 60000,
        retryConfig: {
          maxRetries: 5,
          baseDelay: 2000,
          maxDelay: 60000,
          backoffMultiplier: 3,
          retryableStatusCodes: [500, 502, 503],
          retryableErrors: ['ECONNRESET']
        }
      };

      client.updateConfig(newConfig);

      const config = client.getConfig();
      expect(config.timeout).toBe(60000);
      expect(config.retryConfig.maxRetries).toBe(5);
      expect(config.retryConfig.baseDelay).toBe(2000);
    });

    it('should create new HTTP client when config is updated', () => {
      const createSpy = jest.spyOn(mockedAxios, 'create');
      const initialCallCount = createSpy.mock.calls.length;

      client.updateConfig({ timeout: 60000 });

      expect(createSpy).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('statistics and info', () => {
    it('should return statistics when not initialized', () => {
      const stats = client.getStatistics();

      expect(stats.hasCredentials).toBe(false);
      expect(stats.isInitialized).toBe(false);
      expect(stats.baseURL).toBe('https://uat.api.converge.eu.elavonaws.com');
    });

    it('should return statistics when initialized', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();

      const stats = client.getStatistics();

      expect(stats.hasCredentials).toBe(true);
      expect(stats.isInitialized).toBe(true);
    });

    it('should return credentials info when initialized', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();

      const info = client.getCredentialsInfo();

      expect(info).toEqual({
        environment: 'sandbox',
        hasCredentials: true
      });
    });

    it('should return null credentials info when not initialized', () => {
      const info = client.getCredentialsInfo();

      expect(info).toBeNull();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();
    });

    it('should handle axios errors with response', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Invalid request data' },
          headers: { 'content-type': 'application/json' },
          config: {} as any
        },
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'POST'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('HTTP_400');
      expect(result.error?.message).toBe('Invalid request data');
    });

    it('should handle axios errors without response', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Network Error',
        request: {},
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NETWORK_ERROR');
      expect(result.error?.message).toBe('No response received from server');
    });

    it('should handle non-axios errors', async () => {
      const error = new Error('Generic error');

      mockAxiosInstance.request.mockRejectedValue(error);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      const result = await client.makeRequest(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('Error');
      expect(result.error?.message).toBe('Generic error');
    });
  });

  describe('retry logic', () => {
    beforeEach(async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();
    });

    it('should calculate exponential backoff delay', async () => {
      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 503',
        response: { status: 503, config: {} as any },
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const sleepSpy = jest.spyOn(client as any, '_sleep').mockResolvedValue(undefined);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      await client.makeRequest(request);

      // Should have called sleep for each retry
      expect(sleepSpy).toHaveBeenCalledTimes(3);
      
      // First retry should be around 1000ms (base delay)
      expect(sleepSpy).toHaveBeenNthCalledWith(1, expect.any(Number));
      
      sleepSpy.mockRestore();
    });

    it('should respect max delay', async () => {
      client.updateConfig({
        retryConfig: {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 2000,
          backoffMultiplier: 10,
          retryableStatusCodes: [503],
          retryableErrors: []
        }
      });

      const error = {
        isAxiosError: true,
        name: 'AxiosError',
        message: 'Request failed with status code 503',
        response: { status: 503, config: {} as any },
        toJSON: () => ({})
      } as AxiosError;

      mockAxiosInstance.request.mockRejectedValue(error);

      const sleepSpy = jest.spyOn(client as any, '_sleep').mockResolvedValue(undefined);

      const request: ElavonApiRequest = {
        endpoint: '/test',
        method: 'GET'
      };

      await client.makeRequest(request);

      // All delays should be capped at maxDelay (2000ms)
      sleepSpy.mock.calls.forEach(call => {
        expect(call[0]).toBeLessThanOrEqual(2200); // 2000 + some jitter
      });

      sleepSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should clear credentials on dispose', async () => {
      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();

      expect(client.getCredentialsInfo()).not.toBeNull();

      client.dispose();

      expect(client.getCredentialsInfo()).toBeNull();
    });
  });

  describe('logging', () => {
    it('should log when logging is enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await client.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ElavonSandboxClient] Elavon Sandbox Client initialized successfully')
      );

      consoleSpy.mockRestore();
    });

    it('should not log when logging is disabled', async () => {
      const clientWithoutLogging = new ElavonSandboxClient(mockContext, {
        enableLogging: false
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockCredentialService.retrieveCredentials.mockResolvedValue(mockCredentials);
      await clientWithoutLogging.initialize();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});