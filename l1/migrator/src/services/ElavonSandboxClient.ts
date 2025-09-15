import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import * as vscode from "vscode";
import { CredentialService, ElavonCredentials } from "./CredentialService";

/**
 * Interface for Elavon API request configuration
 */
export interface ElavonApiRequest {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Interface for Elavon API response
 */
export interface ElavonApiResponse<T = any> {
  success: boolean;
  data?: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    responseTime: number;
    retryCount: number;
    endpoint: string;
  };
}

/**
 * Interface for retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

/**
 * Interface for client configuration
 */
export interface ElavonClientConfig {
  baseURL: string;
  timeout: number;
  retryConfig: RetryConfig;
  enableLogging: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: [
    "ECONNRESET",
    "ENOTFOUND",
    "ECONNABORTED",
    "ETIMEDOUT",
    "NETWORK_ERROR",
  ],
};

/**
 * Default client configuration
 */
const DEFAULT_CLIENT_CONFIG: ElavonClientConfig = {
  baseURL: "https://uat.api.converge.eu.elavonaws.com",
  timeout: 30000, // 30 seconds
  retryConfig: DEFAULT_RETRY_CONFIG,
  enableLogging: true,
};

/**
 * Elavon Sandbox API Client with authentication and retry logic
 */
export class ElavonSandboxClient {
  private _httpClient: AxiosInstance;
  private _credentialService: CredentialService;
  private _config: ElavonClientConfig;
  private _credentials: ElavonCredentials | null = null;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    config?: Partial<ElavonClientConfig>
  ) {
    this._config = { ...DEFAULT_CLIENT_CONFIG, ...config };
    this._credentialService = new CredentialService(_context);
    this._httpClient = this._createHttpClient();
  }

  /**
   * Initialize the client with credentials
   */
  public async initialize(): Promise<void> {
    try {
      this._credentials = await this._credentialService.retrieveCredentials();

      if (!this._credentials) {
        throw new Error(
          "No Elavon credentials found. Please configure credentials first."
        );
      }

      if (this._credentials.environment !== "sandbox") {
        console.warn(
          "Using production credentials with sandbox client. This may cause authentication issues."
        );
      }

      this._log("Elavon Sandbox Client initialized successfully");
    } catch (error) {
      this._log("Failed to initialize Elavon Sandbox Client:", error);
      throw new Error(
        `Failed to initialize client: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  public async makeRequest<T = any>(
    request: ElavonApiRequest
  ): Promise<ElavonApiResponse<T>> {
    const requestId = this._generateRequestId();
    const startTime = Date.now();
    let retryCount = 0;

    if (!this._credentials) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    this._log(`Making request to ${request.endpoint}`, {
      requestId,
      method: request.method,
    });

    while (retryCount <= this._config.retryConfig.maxRetries) {
      try {
        const response = await this._executeRequest(
          request,
          requestId,
          retryCount
        );

        return {
          success: true,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          metadata: {
            requestId,
            responseTime: Date.now() - startTime,
            retryCount,
            endpoint: request.endpoint,
          },
        };
      } catch (error) {
        const isLastAttempt = retryCount >= this._config.retryConfig.maxRetries;
        const shouldRetry = this._shouldRetry(error, retryCount);

        if (isLastAttempt || !shouldRetry) {
          return this._createErrorResponse(
            error,
            requestId,
            Date.now() - startTime,
            retryCount,
            request.endpoint
          );
        }

        const delay = this._calculateRetryDelay(retryCount);
        this._log(
          `Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${
            this._config.retryConfig.maxRetries
          })`,
          { error: error instanceof Error ? error.message : "Unknown error" }
        );

        await this._sleep(delay);
        retryCount++;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error("Unexpected error in retry logic");
  }

  /**
   * Test connection to Elavon sandbox
   */
  public async testConnection(): Promise<ElavonApiResponse> {
    return this.makeRequest({
      endpoint: "/health",
      method: "GET",
    });
  }

  /**
   * Validate payment request
   */
  public async validatePayment(paymentData: any): Promise<ElavonApiResponse> {
    return this.makeRequest({
      endpoint: "/v1/payments/validate",
      method: "POST",
      data: paymentData,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Process test payment
   */
  public async processTestPayment(
    paymentData: any
  ): Promise<ElavonApiResponse> {
    return this.makeRequest({
      endpoint: "/v1/payments",
      method: "POST",
      data: paymentData,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(
    transactionId: string
  ): Promise<ElavonApiResponse> {
    return this.makeRequest({
      endpoint: `/v1/transactions/${transactionId}`,
      method: "GET",
    });
  }

  /**
   * Refund transaction
   */
  public async refundTransaction(
    transactionId: string,
    refundData: any
  ): Promise<ElavonApiResponse> {
    return this.makeRequest({
      endpoint: `/v1/transactions/${transactionId}/refund`,
      method: "POST",
      data: refundData,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get client configuration
   */
  public getConfig(): ElavonClientConfig {
    return { ...this._config };
  }

  /**
   * Update client configuration
   */
  public updateConfig(config: Partial<ElavonClientConfig>): void {
    this._config = { ...this._config, ...config };
    this._httpClient = this._createHttpClient();
  }

  /**
   * Get current credentials (without sensitive data)
   */
  public getCredentialsInfo(): {
    environment: string;
    hasCredentials: boolean;
  } | null {
    if (!this._credentials) {
      return null;
    }

    return {
      environment: this._credentials.environment,
      hasCredentials: !!(
        this._credentials.publicKey && this._credentials.secretKey
      ),
    };
  }

  /**
   * Create HTTP client instance
   */
  private _createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this._config.baseURL,
      timeout: this._config.timeout,
      headers: {
        "User-Agent": "Converge-Elavon-Migrator/1.0.0",
        Accept: "application/json",
      },
    });

    // Request interceptor for authentication
    client.interceptors.request.use(
      (config) => {
        if (this._credentials) {
          // Add authentication headers
          config.headers = config.headers || {};
          config.headers[
            "Authorization"
          ] = `Bearer ${this._credentials.publicKey}`;
          config.headers["X-API-Key"] = this._credentials.secretKey;

          if (this._credentials.merchantId) {
            config.headers["X-Merchant-ID"] = this._credentials.merchantId;
          }
        }

        // Add request timestamp
        config.headers = config.headers || {};
        config.headers["X-Request-Timestamp"] = new Date().toISOString();

        return config;
      },
      (error) => {
        this._log("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        this._log(
          `Response received: ${response.status} ${response.statusText}`,
          {
            endpoint: response.config.url,
            status: response.status,
          }
        );
        return response;
      },
      (error) => {
        this._log("Response error:", {
          endpoint: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Execute HTTP request
   */
  private async _executeRequest(
    request: ElavonApiRequest,
    requestId: string,
    retryCount: number
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.endpoint,
      data: request.data,
      headers: {
        ...request.headers,
        "X-Request-ID": requestId,
        "X-Retry-Count": retryCount.toString(),
      },
      timeout: request.timeout || this._config.timeout,
    };

    return this._httpClient.request(config);
  }

  /**
   * Determine if request should be retried
   */
  private _shouldRetry(error: any, retryCount: number): boolean {
    if (retryCount >= this._config.retryConfig.maxRetries) {
      return false;
    }

    // Check if it's an Axios error
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Retry on specific HTTP status codes
      if (axiosError.response?.status) {
        return this._config.retryConfig.retryableStatusCodes.includes(
          axiosError.response.status
        );
      }

      // Retry on network errors
      if (axiosError.code) {
        return this._config.retryConfig.retryableErrors.includes(
          axiosError.code
        );
      }
    }

    // Retry on timeout errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private _calculateRetryDelay(retryCount: number): number {
    const delay =
      this._config.retryConfig.baseDelay *
      Math.pow(this._config.retryConfig.backoffMultiplier, retryCount);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;

    return Math.min(delay + jitter, this._config.retryConfig.maxDelay);
  }

  /**
   * Create error response
   */
  private _createErrorResponse(
    error: any,
    requestId: string,
    responseTime: number,
    retryCount: number,
    endpoint: string
  ): ElavonApiResponse {
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = "An unknown error occurred";
    let status = 0;
    let statusText = "";
    let headers: Record<string, string> = {};

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        status = axiosError.response.status;
        statusText = axiosError.response.statusText;
        headers = axiosError.response.headers as Record<string, string>;
        errorCode = `HTTP_${status}`;
        errorMessage =
          (axiosError.response.data as any)?.message || axiosError.message;
      } else if (axiosError.request) {
        errorCode = "NETWORK_ERROR";
        errorMessage = "No response received from server";
      } else {
        errorCode = "REQUEST_ERROR";
        errorMessage = axiosError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = error.name || "ERROR";
    }

    return {
      success: false,
      status,
      statusText,
      headers,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error,
      },
      metadata: {
        requestId,
        responseTime,
        retryCount,
        endpoint,
      },
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private _generateRequestId(): string {
    return `elavon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log message if logging is enabled
   */
  private _log(message: string, data?: any): void {
    if (this._config.enableLogging) {
      if (data) {
        console.log(`[ElavonSandboxClient] ${message}`, data);
      } else {
        console.log(`[ElavonSandboxClient] ${message}`);
      }
    }
  }

  /**
   * Get client statistics
   */
  public getStatistics(): {
    baseURL: string;
    timeout: number;
    maxRetries: number;
    hasCredentials: boolean;
    isInitialized: boolean;
  } {
    return {
      baseURL: this._config.baseURL,
      timeout: this._config.timeout,
      maxRetries: this._config.retryConfig.maxRetries,
      hasCredentials: !!this._credentials,
      isInitialized: !!this._credentials,
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Clear sensitive data
    this._credentials = null;
    this._log("ElavonSandboxClient disposed");
  }
}
