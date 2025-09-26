/**
 * Dynamic configuration for pattern matching and API endpoints
 * This replaces hardcoded values throughout the codebase
 */

export interface PatternConfig {
  converge: {
    endpoints: {
      hostedPayments: string[];
      checkout: string[];
      processTransaction: string[];
      batchProcessing: string[];
      deviceManagement: string[];
    };
    sslFields: {
      core: string;
      variations: string[];
    };
    urls: string[];
    apiCalls: string[];
  };
  elavon: {
    endpoints: {
      hostedPayments: string[];
      checkout: string[];
      processTransaction: string[];
      batchProcessing: string[];
      deviceManagement: string[];
    };
    sslFields: {
      core: string;
      variations: string[];
    };
    urls: string[];
    apiCalls: string[];
  };
  supportedExtensions: string[];
  ignorePatterns: string[];
  maxFileSize: number;
}

/**
 * Default configuration - can be overridden by user settings
 */
export const defaultPatternConfig: PatternConfig = {
  converge: {
    endpoints: {
      hostedPayments: [
        '/hosted-payments/transaction_token',
        'hosted-payments/transaction_token',
        'hostedpayments/transactiontoken',
        'hosted_payments_transaction_token'
      ],
      checkout: [
        '/Checkout.js',
        'Checkout.js',
        'checkout.js',
        'converge.*checkout',
        'checkout.*converge'
      ],
      processTransaction: [
        '/ProcessTransactionOnline\\b',
        'ProcessTransactionOnline\\b.*\\(',
        'process_transaction_online',
        'processtransaction',
        'transaction.*process.*\\(',
        '\\.ProcessTransactionOnline',
        'ProcessTransactionOnline.*http',
        'ProcessTransactionOnline.*api',
        'processxml\\.do',
        'processxml',
        'ssl_transaction_type',
        'ssl_merchant_ID',
        'ssl_user_id',
        'ssl_pin',
        'convergepay\\.com',
        'VirtualMerchantDemo'
      ],
      batchProcessing: [
        '/batch-processing',
        'batch-processing',
        'batch_processing',
        'batchprocessing',
        'batch.*process'
      ],
      deviceManagement: [
        '/NonElavonCertifiedDevice',
        'NonElavonCertifiedDevice',
        'non_elavon_certified_device',
        'device.*management',
        'terminal.*management'
      ]
    },
    sslFields: {
      core: 'ssl_[a-zA-Z_][a-zA-Z0-9_]*',
      variations: [
        'SSL_[a-zA-Z_][a-zA-Z0-9_]*',
        'ssl[A-Z][a-zA-Z0-9]*',
        '"ssl_[a-zA-Z_][a-zA-Z0-9_]*"',
        "'ssl_[a-zA-Z_][a-zA-Z0-9_]*'",
        '\\$ssl_[a-zA-Z_][a-zA-Z0-9_]*',
        'ssl\\[["\'][a-zA-Z_][a-zA-Z0-9_]*["\']\\]',
        ':ssl_[a-zA-Z_][a-zA-Z0-9_]*',
        'ssl_[a-zA-Z_][a-zA-Z0-9_]*:',
        '@XmlElement\\(name\\s*=\\s*["\']ssl_[a-zA-Z_][a-zA-Z0-9_]*["\']\\)',
        'ssl_merchant_ID',
        'ssl_user_id',
        'ssl_pin',
        'ssl_transaction_type',
        'ssl_card_number',
        'ssl_exp_date',
        'ssl_amount',
        'ssl_first_name',
        'ssl_last_name',
        'ssl_cvv2cvc2',
        'ssl_avs_address',
        'ssl_avs_zip',
        'ssl_invoice_number'
      ]
    },
    urls: [
      'https?:\\/\\/[^\\s]*converge[^\\s]*',
      'https?:\\/\\/api\\.converge\\.com[^\\s]*',
      'https?:\\/\\/[^\\s]*\\.converge\\.com[^\\s]*',
      'converge\\.com[^\\s]*',
      'convergepay\\.com[^\\s]*',
      'api\\.demo\\.convergepay\\.com[^\\s]*',
      'VirtualMerchantDemo[^\\s]*',
      'processxml\\.do'
    ],
    apiCalls: [
      'fetch\\s*\\(\\s*["\'][^"\']*converge[^"\']*["\']',
      'fetch\\s*\\(\\s*["\'][^"\']*\\/hosted-payments[^"\']*["\']',
      'fetch\\s*\\(\\s*["\'][^"\']*ProcessTransaction[^"\']*["\']',
      'axios\\.(get|post|put|delete)\\s*\\([^)]*converge[^)]*',
      'axios\\s*\\(\\s*\\{[^}]*url[^}]*converge[^}]*\\}',
      'curl_setopt\\s*\\([^)]*CURLOPT_URL[^)]*converge[^)]*',
      'curl\\s+[^\\n]*converge',
      'restTemplate\\.postForObject[^)]*converge[^)]*',
      'restTemplate\\.(get|post|put|delete)ForObject[^)]*converge[^)]*',
      'HttpEntity[^)]*converge[^)]*',
      'ResponseEntity[^)]*converge[^)]*',
      'RestTemplate[^)]*converge[^)]*'
    ]
  },
  elavon: {
    endpoints: {
      hostedPayments: [
        '/api/v1/payments/hosted',
        'api/v1/payments/hosted',
        'payments/hosted',
        'hosted_payments'
      ],
      checkout: [
        '/api/v1/checkout',
        'api/v1/checkout',
        'checkout',
        'elavon.*checkout',
        'checkout.*elavon'
      ],
      processTransaction: [
        '/api/v1/transactions/process',
        'api/v1/transactions/process',
        'transactions/process',
        'process.*transaction',
        'transaction.*process'
      ],
      batchProcessing: [
        '/api/v1/batch',
        'api/v1/batch',
        'batch',
        'batch.*process'
      ],
      deviceManagement: [
        '/api/v1/devices',
        'api/v1/devices',
        'devices',
        'device.*management'
      ]
    },
    sslFields: {
      core: 'api_[a-zA-Z_][a-zA-Z0-9_]*',
      variations: [
        'API_[a-zA-Z_][a-zA-Z0-9_]*',
        'api[A-Z][a-zA-Z0-9]*',
        '"api_[a-zA-Z_][a-zA-Z0-9_]*"',
        "'api_[a-zA-Z_][a-zA-Z0-9_]*'",
        '\\$api_[a-zA-Z_][a-zA-Z0-9_]*',
        'api\\[["\'][a-zA-Z_][a-zA-Z0-9_]*["\']\\]',
        ':api_[a-zA-Z_][a-zA-Z0-9_]*',
        'api_[a-zA-Z_][a-zA-Z0-9_]*:'
      ]
    },
    urls: [
      'https?:\\/\\/[^\\s]*elavon[^\\s]*',
      'https?:\\/\\/api\\.elavon\\.com[^\\s]*',
      'https?:\\/\\/[^\\s]*\\.elavon\\.com[^\\s]*',
      'elavon\\.com[^\\s]*'
    ],
    apiCalls: [
      'fetch\\s*\\(\\s*["\'][^"\']*elavon[^"\']*["\']',
      'fetch\\s*\\(\\s*["\'][^"\']*\\/api\\/v1[^"\']*["\']',
      'axios\\.(get|post|put|delete)\\s*\\([^)]*elavon[^)]*',
      'axios\\s*\\(\\s*\\{[^}]*url[^}]*elavon[^}]*\\}',
      'curl_setopt\\s*\\([^)]*CURLOPT_URL[^)]*elavon[^)]*',
      'curl\\s+[^\\n]*elavon'
    ]
  },
  supportedExtensions: ['.js', '.ts', '.php', '.py', '.java', '.cs', '.rb', '.jsx', '.tsx', '.vue', '.svelte', '.html', '.htm'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/vendor/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/*.min.js',
    '**/*.bundle.js',
    '**/*.map',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/.DS_Store',
    '**/Thumbs.db'
  ],
  maxFileSize: 1024 * 1024 // 1MB
};

/**
 * Configuration manager for dynamic pattern loading
 */
export class PatternConfigManager {
  private config: PatternConfig;
  private configFile?: string;

  constructor(config?: Partial<PatternConfig>, configFile?: string) {
    this.config = { ...defaultPatternConfig, ...config };
    this.configFile = configFile;
  }

  /**
   * Load configuration from file
   */
  public async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs');
      const content = await fs.promises.readFile(filePath, 'utf8');
      const userConfig = JSON.parse(content);
      this.config = { ...defaultPatternConfig, ...userConfig };
    } catch (error) {
      console.warn(`Failed to load config from ${filePath}, using defaults:`, error);
    }
  }

  /**
   * Save configuration to file
   */
  public async saveToFile(filePath: string): Promise<void> {
    try {
      const fs = require('fs');
      await fs.promises.writeFile(filePath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(`Failed to save config to ${filePath}:`, error);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): PatternConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<PatternConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get patterns for a specific API type
   */
  public getPatterns(apiType: 'converge' | 'elavon') {
    return this.config[apiType];
  }

  /**
   * Get supported file extensions
   */
  public getSupportedExtensions(): string[] {
    return [...this.config.supportedExtensions];
  }

  /**
   * Get ignore patterns
   */
  public getIgnorePatterns(): string[] {
    return [...this.config.ignorePatterns];
  }

  /**
   * Get max file size
   */
  public getMaxFileSize(): number {
    return this.config.maxFileSize;
  }
}
