import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionManager } from '../../core/ExtensionManager';
import { ServiceContainer } from '../../core/ServiceContainer';
import { WorkspaceScannerService } from '../../services/WorkspaceScannerService';
import { MigrationService } from '../../services/MigrationService';
import { CredentialService } from '../../services/CredentialService';
import { OpenApiService } from '../../services/OpenApiService';
import { CopilotService } from '../../services/CopilotService';
import { ElavonValidationService } from '../../services/ElavonValidationService';

/**
 * End-to-end test suite for the Converge to Elavon Migrator extension
 */
export class EndToEndTestSuite {
  private _extensionManager: ExtensionManager | null = null;
  private _serviceContainer: ServiceContainer | null = null;
  private _testWorkspace: string = '';
  private _testResults: TestResult[] = [];

  constructor() {}

  /**
   * Run all end-to-end tests
   */
  public async runAllTests(): Promise<TestSuiteResult> {
    console.log('🚀 Starting End-to-End Test Suite...');
    
    const startTime = Date.now();
    this._testResults = [];

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run test categories
      await this.runExtensionActivationTests();
      await this.runServiceIntegrationTests();
      await this.runWorkspaceScanningTests();
      await this.runMigrationWorkflowTests();
      await this.runCredentialManagementTests();
      await this.runOpenApiIntegrationTests();
      await this.runCopilotIntegrationTests();
      await this.runValidationTests();
      await this.runPanelTests();
      await this.runCommandTests();

      // Cleanup
      await this.cleanupTestEnvironment();

      const endTime = Date.now();
      const duration = endTime - startTime;

      const result: TestSuiteResult = {
        totalTests: this._testResults.length,
        passedTests: this._testResults.filter(r => r.status === 'passed').length,
        failedTests: this._testResults.filter(r => r.status === 'failed').length,
        duration,
        results: this._testResults
      };

      console.log(`✅ End-to-End Test Suite completed in ${duration}ms`);
      console.log(`📊 Results: ${result.passedTests}/${result.totalTests} tests passed`);

      return result;

    } catch (error) {
      console.error('❌ End-to-End Test Suite failed:', error);
      throw error;
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Create temporary test workspace
    this._testWorkspace = path.join(__dirname, '..', '..', '..', 'test-workspace');
    if (!fs.existsSync(this._testWorkspace)) {
      fs.mkdirSync(this._testWorkspace, { recursive: true });
    }

    // Create test files with Converge endpoints
    await this.createTestFiles();

    // Initialize extension manager
    const mockContext = this.createMockExtensionContext();
    this._extensionManager = new ExtensionManager(mockContext);
    await this._extensionManager.initialize();

    this._serviceContainer = new ServiceContainer(mockContext);
    this._serviceContainer.initialize();

    this.recordTest('setup', 'Test environment setup', 'passed', 'Environment setup completed successfully');
  }

  /**
   * Test extension activation
   */
  private async runExtensionActivationTests(): Promise<void> {
    console.log('🧪 Running extension activation tests...');

    try {
      // Test extension manager initialization
      if (!this._extensionManager) {
        throw new Error('Extension manager not initialized');
      }

      // Test service container initialization
      if (!this._serviceContainer) {
        throw new Error('Service container not initialized');
      }

      // Test command registration
      const commands = await vscode.commands.getCommands();
      const expectedCommands = [
        'elavonx.scanProject',
        'elavonx.migrateEndpoint',
        'elavonx.bulkMigrate',
        'elavonx.validateMigration',
        'elavonx.openCredentials'
      ];

      for (const command of expectedCommands) {
        if (!commands.includes(command)) {
          throw new Error(`Command ${command} not registered`);
        }
      }

      this.recordTest('extension-activation', 'Extension activation', 'passed', 'Extension activated successfully');

    } catch (error) {
      this.recordTest('extension-activation', 'Extension activation', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test service integration
   */
  private async runServiceIntegrationTests(): Promise<void> {
    console.log('🧪 Running service integration tests...');

    try {
      if (!this._serviceContainer) {
        throw new Error('Service container not available');
      }

      // Test service instantiation
      const scannerService = this._serviceContainer.getWorkspaceScannerService();
      const migrationService = this._serviceContainer.getMigrationService();
      const credentialService = this._serviceContainer.getCredentialService();

      if (!scannerService || !migrationService || !credentialService) {
        throw new Error('Required services not available');
      }

      this.recordTest('service-integration', 'Service integration', 'passed', 'All services initialized successfully');

    } catch (error) {
      this.recordTest('service-integration', 'Service integration', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test workspace scanning
   */
  private async runWorkspaceScanningTests(): Promise<void> {
    console.log('🧪 Running workspace scanning tests...');

    try {
      if (!this._serviceContainer) {
        throw new Error('Service container not available');
      }

      const scannerService = this._serviceContainer.getWorkspaceScannerService();
      if (!scannerService) {
        throw new Error('Scanner service not available');
      }

      // Test workspace scanning
      const scanResult = await scannerService.scanWorkspace({
        useCache: false,
        progressCallback: (progress) => {
          console.log(`Scan progress: ${progress.filesProcessed}/${progress.totalFiles}`);
        }
      });

      if (scanResult.endpoints.length === 0) {
        throw new Error('No endpoints found in test workspace');
      }

      this.recordTest('workspace-scanning', 'Workspace scanning', 'passed', `Found ${scanResult.endpoints.length} endpoints`);

    } catch (error) {
      this.recordTest('workspace-scanning', 'Workspace scanning', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test migration workflow
   */
  private async runMigrationWorkflowTests(): Promise<void> {
    console.log('🧪 Running migration workflow tests...');

    try {
      if (!this._serviceContainer) {
        throw new Error('Service container not available');
      }

      const migrationService = this._serviceContainer.getMigrationService();
      if (!migrationService) {
        throw new Error('Migration service not available');
      }

      // Test migration history
      const history = migrationService.getMigrationHistory();
      if (!Array.isArray(history)) {
        throw new Error('Migration history should be an array');
      }

      // Test migration statistics
      const stats = migrationService.getMigrationStatistics();
      if (typeof stats.totalMigrations !== 'number') {
        throw new Error('Migration statistics should include totalMigrations');
      }

      this.recordTest('migration-workflow', 'Migration workflow', 'passed', 'Migration workflow functions correctly');

    } catch (error) {
      this.recordTest('migration-workflow', 'Migration workflow', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test credential management
   */
  private async runCredentialManagementTests(): Promise<void> {
    console.log('🧪 Running credential management tests...');

    try {
      if (!this._serviceContainer) {
        throw new Error('Service container not available');
      }

      const credentialService = this._serviceContainer.getCredentialService();
      if (!credentialService) {
        throw new Error('Credential service not available');
      }

      // Test credential storage and retrieval
      const testCredentials = {
        publicKey: 'pk_test_123456789012345678901234',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox' as const
      };

      await credentialService.storeCredentials(testCredentials);
      const retrievedCredentials = await credentialService.retrieveCredentials();

      if (!retrievedCredentials) {
        throw new Error('Failed to retrieve stored credentials');
      }

      if (retrievedCredentials.publicKey !== testCredentials.publicKey) {
        throw new Error('Retrieved credentials do not match stored credentials');
      }

      // Test credential clearing
      await credentialService.clearCredentials();
      const clearedCredentials = await credentialService.retrieveCredentials();

      if (clearedCredentials) {
        throw new Error('Credentials should be cleared');
      }

      this.recordTest('credential-management', 'Credential management', 'passed', 'Credential management functions correctly');

    } catch (error) {
      this.recordTest('credential-management', 'Credential management', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test OpenAPI integration
   */
  private async runOpenApiIntegrationTests(): Promise<void> {
    console.log('🧪 Running OpenAPI integration tests...');

    try {
      const openApiService = new OpenApiService(this.createMockExtensionContext());

      // Test OpenAPI spec loading (with mock data)
      const mockConvergeSpec = {
        openapi: '3.0.0',
        info: { title: 'Converge API', version: '1.0.0' },
        paths: {
          '/hosted-payments': {
            post: {
              operationId: 'createPayment',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        ssl_amount: { type: 'string' },
                        ssl_merchant_id: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const mockElavonSpec = {
        openapi: '3.0.0',
        info: { title: 'Elavon API', version: '1.0.0' },
        paths: {
          '/v1/payments': {
            post: {
              operationId: 'createPayment',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        amount: { type: 'object' },
                        merchantId: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      // Test spec comparison
      const comparison = await openApiService.compareSpecs();
      if (!comparison.endpointMappings || !Array.isArray(comparison.endpointMappings)) {
        throw new Error('Endpoint mappings should be an array');
      }

      this.recordTest('openapi-integration', 'OpenAPI integration', 'passed', 'OpenAPI integration functions correctly');

    } catch (error) {
      this.recordTest('openapi-integration', 'OpenAPI integration', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test Copilot integration
   */
  private async runCopilotIntegrationTests(): Promise<void> {
    console.log('🧪 Running Copilot integration tests...');

    try {
      const copilotService = new CopilotService(this.createMockExtensionContext());

      // Test Copilot service initialization
      const isAvailable = await copilotService.isAvailable();
      if (typeof isAvailable !== 'boolean') {
        throw new Error('Copilot availability should return boolean');
      }

      // Test Copilot status
      const status = await copilotService.getStatus();
      if (!status || typeof status.available !== 'boolean') {
        throw new Error('Copilot status should include availability');
      }

      this.recordTest('copilot-integration', 'Copilot integration', 'passed', 'Copilot integration functions correctly');

    } catch (error) {
      this.recordTest('copilot-integration', 'Copilot integration', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test validation
   */
  private async runValidationTests(): Promise<void> {
    console.log('🧪 Running validation tests...');

    try {
      const validationService = new ElavonValidationService();

      // Test validation service configuration
      const config = ElavonValidationService.getConfiguration();
      if (!config.endpoints || !config.endpoints.sandbox || !config.endpoints.production) {
        throw new Error('Validation service should have endpoint configuration');
      }

      // Test endpoint reachability (mock test)
      const isReachable = await ElavonValidationService.isEndpointReachable('https://httpbin.org/status/200');
      if (typeof isReachable !== 'boolean') {
        throw new Error('Endpoint reachability should return boolean');
      }

      this.recordTest('validation', 'Validation', 'passed', 'Validation functions correctly');

    } catch (error) {
      this.recordTest('validation', 'Validation', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test panels
   */
  private async runPanelTests(): Promise<void> {
    console.log('🧪 Running panel tests...');

    try {
      // Test panel registration
      const views = vscode.workspace.getConfiguration().get('views');
      if (!views) {
        throw new Error('Views configuration not found');
      }

      this.recordTest('panels', 'Panel registration', 'passed', 'Panels registered correctly');

    } catch (error) {
      this.recordTest('panels', 'Panel registration', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Test commands
   */
  private async runCommandTests(): Promise<void> {
    console.log('🧪 Running command tests...');

    try {
      // Test command execution
      const commands = await vscode.commands.getCommands();
      
      // Test that our commands are registered
      const requiredCommands = [
        'elavonx.scanProject',
        'elavonx.migrateEndpoint',
        'elavonx.bulkMigrate',
        'elavonx.validateMigration',
        'elavonx.openCredentials'
      ];

      for (const command of requiredCommands) {
        if (!commands.includes(command)) {
          throw new Error(`Command ${command} not registered`);
        }
      }

      this.recordTest('commands', 'Command registration', 'passed', 'All commands registered correctly');

    } catch (error) {
      this.recordTest('commands', 'Command registration', 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Create test files with Converge endpoints
   */
  private async createTestFiles(): Promise<void> {
    const testFiles = [
      {
        name: 'payment.js',
        content: `
// Converge payment processing
function processPayment() {
  const ssl_merchant_id = '123456';
  const ssl_amount = '10.00';
  const ssl_card_number = '4111111111111111';
  
  fetch('/hosted-payments', {
    method: 'POST',
    body: JSON.stringify({
      ssl_merchant_id,
      ssl_amount,
      ssl_card_number
    })
  });
}
`
      },
      {
        name: 'checkout.php',
        content: `<?php
// Converge checkout processing
function processCheckout() {
    $ssl_merchant_id = '123456';
    $ssl_amount = '25.50';
    
    $data = array(
        'ssl_merchant_id' => $ssl_merchant_id,
        'ssl_amount' => $ssl_amount
    );
    
    $response = file_get_contents('https://api.converge.com/checkout', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ]));
}
?>`
      },
      {
        name: 'transaction.py',
        content: `# Converge transaction processing
import requests

def process_transaction():
    ssl_merchant_id = '123456'
    ssl_amount = '15.75'
    
    data = {
        'ssl_merchant_id': ssl_merchant_id,
        'ssl_amount': ssl_amount
    }
    
    response = requests.post('https://api.converge.com/process', json=data)
    return response.json()
`
      }
    ];

    for (const file of testFiles) {
      const filePath = path.join(this._testWorkspace, file.name);
      fs.writeFileSync(filePath, file.content);
    }
  }

  /**
   * Create mock extension context
   */
  private createMockExtensionContext(): vscode.ExtensionContext {
    return {
      extension: {
        id: 'test-extension',
        extensionPath: __dirname,
        isActive: true,
        packageJSON: {},
        extensionKind: vscode.ExtensionKind.Workspace,
        exports: {},
        activate: () => Promise.resolve({}),
        deactivate: () => Promise.resolve()
      },
      subscriptions: [],
      extensionPath: __dirname,
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        keys: () => []
      },
      globalStorageUri: vscode.Uri.file(path.join(__dirname, 'global-storage')),
      logUri: vscode.Uri.file(path.join(__dirname, 'logs')),
      storageUri: vscode.Uri.file(path.join(__dirname, 'storage')),
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve()
      },
      extensionUri: vscode.Uri.file(__dirname),
      environmentVariableCollection: {} as any,
      extensionMode: vscode.ExtensionMode.Test
    };
  }

  /**
   * Record test result
   */
  private recordTest(testId: string, testName: string, status: 'passed' | 'failed', message: string): void {
    this._testResults.push({
      testId,
      testName,
      status,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Cleanup test environment
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      // Cleanup test workspace
      if (this._testWorkspace && fs.existsSync(this._testWorkspace)) {
        fs.rmSync(this._testWorkspace, { recursive: true, force: true });
      }

      // Dispose extension manager
      if (this._extensionManager) {
        this._extensionManager.dispose();
      }

    } catch (error) {
      console.warn('Warning: Failed to cleanup test environment:', error);
    }
  }
}

/**
 * Test result interface
 */
interface TestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed';
  message: string;
  timestamp: Date;
}

/**
 * Test suite result interface
 */
interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
}

export { TestResult, TestSuiteResult };
