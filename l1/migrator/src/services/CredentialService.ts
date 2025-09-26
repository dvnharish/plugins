import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for Elavon API credentials
 */
export interface ElavonCredentials {
  publicKey: string;
  secretKey: string;
  environment: 'sandbox' | 'production';
  merchantId?: string;
}

/**
 * Service for credential management using local file storage
 */
export class CredentialService {
  private static readonly CREDENTIALS_FILE = 'elavon-credentials.json';

  private static readonly KEY_PATTERNS = {
    PUBLIC_KEY: /^pk_[a-zA-Z0-9]{24,}$/,
    SECRET_KEY: /^sk_[a-zA-Z0-9]{24,}$/
  };

  private readonly credentialsPath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    // Store credentials in the extension's global storage directory
    this.credentialsPath = path.join(context.globalStorageUri.fsPath, CredentialService.CREDENTIALS_FILE);
  }

  /**
   * Store Elavon credentials securely in VS Code's secret storage
   */
  async storeCredentials(credentials: ElavonCredentials): Promise<void> {
    // Validate credentials before storing
    this.validateCredentials(credentials);

    try {
      // Store credentials in VS Code's secure secret storage
      const credentialsData = {
        publicKey: credentials.publicKey,
        secretKey: credentials.secretKey,
        environment: credentials.environment,
        merchantId: credentials.merchantId,
        lastUpdated: new Date().toISOString()
      };

      // Use VS Code's secret storage API for secure storage
      await this.context.secrets.store('elavon-credentials', JSON.stringify(credentialsData));

      // Log successful storage (without sensitive data)
      console.log('Elavon credentials stored securely in VS Code secret storage', {
        environment: credentials.environment,
        hasPublicKey: !!credentials.publicKey,
        hasSecretKey: !!credentials.secretKey,
        hasMerchantId: !!credentials.merchantId
      });

    } catch (error) {
      console.error('Failed to store Elavon credentials:', error);
      throw new Error('Failed to store credentials securely');
    }
  }

  /**
   * Retrieve stored Elavon credentials
   */
  async retrieveCredentials(): Promise<ElavonCredentials | null> {
    try {
      // Retrieve credentials from VS Code's secret storage
      const credentialsString = await this.context.secrets.get('elavon-credentials');
      
      if (!credentialsString) {
        return null;
      }

      // Parse the credentials data
      const credentialsData = JSON.parse(credentialsString);

      // Return null if essential credentials are missing
      if (!credentialsData.publicKey || !credentialsData.secretKey || !credentialsData.environment) {
        return null;
      }

      const credentials: ElavonCredentials = {
        publicKey: credentialsData.publicKey,
        secretKey: credentialsData.secretKey,
        environment: credentialsData.environment as 'sandbox' | 'production'
      };

      if (credentialsData.merchantId) {
        credentials.merchantId = credentialsData.merchantId;
      }

      // Validate retrieved credentials
      this.validateCredentials(credentials);

      return credentials;

    } catch (error) {
      console.error('Failed to retrieve Elavon credentials:', error);
      return null;
    }
  }

  /**
   * Check if credentials are stored
   */
  async hasCredentials(): Promise<boolean> {
    try {
      // Check if credentials exist in secret storage
      const credentialsString = await this.context.secrets.get('elavon-credentials');
      
      if (!credentialsString) {
        return false;
      }

      const credentialsData = JSON.parse(credentialsString);
      return !!(credentialsData.publicKey && credentialsData.secretKey);
    } catch (error) {
      console.error('Failed to check credential existence:', error);
      return false;
    }
  }

  /**
   * Clear all stored credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      // Remove credentials from VS Code's secret storage
      await this.context.secrets.delete('elavon-credentials');

      console.log('Elavon credentials cleared successfully from VS Code secret storage');
    } catch (error) {
      console.error('Failed to clear Elavon credentials:', error);
      throw new Error('Failed to clear credentials');
    }
  }

  /**
   * Update specific credential field
   */
  async updateCredentialField(
    field: keyof ElavonCredentials,
    value: string
  ): Promise<void> {
    // Validate the specific field
    this.validateCredentialField(field, value);

    try {
      // Get existing credentials
      const existingCredentials = await this.retrieveCredentials();
      
      if (!existingCredentials) {
        throw new Error('No existing credentials found. Please save credentials first.');
      }

      // Update the specific field
      existingCredentials[field] = value as any;

      // Validate the complete credentials object
      this.validateCredentials(existingCredentials);

      // Store the updated credentials
      await this.storeCredentials(existingCredentials);

      console.log(`Credential field '${field}' updated successfully`);
    } catch (error) {
      console.error(`Failed to update credential field '${field}':`, error);
      throw new Error(`Failed to update ${field}`);
    }
  }

  /**
   * Validate Elavon credentials format and requirements
   */
  validateCredentials(credentials: ElavonCredentials): void {
    if (!credentials) {
      throw new Error('Credentials object is required');
    }

    // Validate public key
    if (!credentials.publicKey) {
      throw new Error('Public key is required');
    }
    if (!CredentialService.KEY_PATTERNS.PUBLIC_KEY.test(credentials.publicKey)) {
      throw new Error('Invalid public key format. Expected format: pk_test_... or pk_live_...');
    }

    // Validate secret key
    if (!credentials.secretKey) {
      throw new Error('Secret key is required');
    }
    if (!CredentialService.KEY_PATTERNS.SECRET_KEY.test(credentials.secretKey)) {
      throw new Error('Invalid secret key format. Expected format: sk_test_... or sk_live_...');
    }

    // Validate environment
    if (!credentials.environment) {
      throw new Error('Environment is required');
    }
    if (!['sandbox', 'production'].includes(credentials.environment)) {
      throw new Error('Environment must be either "sandbox" or "production"');
    }

    // Note: Environment validation is flexible to support various Elavon key formats
    // Users can choose sandbox or production based on their actual environment

    // Validate merchant ID if provided
    if (credentials.merchantId && credentials.merchantId.trim().length === 0) {
      throw new Error('Merchant ID cannot be empty if provided');
    }
  }

  /**
   * Validate individual credential field
   */
  private validateCredentialField(field: keyof ElavonCredentials, value: string): void {
    switch (field) {
      case 'publicKey':
        if (!CredentialService.KEY_PATTERNS.PUBLIC_KEY.test(value)) {
          throw new Error('Invalid public key format');
        }
        break;
      case 'secretKey':
        if (!CredentialService.KEY_PATTERNS.SECRET_KEY.test(value)) {
          throw new Error('Invalid secret key format');
        }
        break;
      case 'environment':
        if (!['sandbox', 'production'].includes(value)) {
          throw new Error('Environment must be either "sandbox" or "production"');
        }
        break;
      case 'merchantId':
        if (value && value.trim().length === 0) {
          throw new Error('Merchant ID cannot be empty if provided');
        }
        break;
    }
  }


  /**
   * Get credential environment from keys
   */
  static getEnvironmentFromKeys(publicKey: string, secretKey: string): 'sandbox' | 'production' {
    const isTestKey = publicKey.includes('test_') || secretKey.includes('test_');
    return isTestKey ? 'sandbox' : 'production';
  }

  /**
   * Mask sensitive credential data for logging
   */
  static maskCredentials(credentials: ElavonCredentials): Record<string, string | undefined> {
    return {
      publicKey: credentials.publicKey ? `${credentials.publicKey.substring(0, 8)}...` : undefined,
      secretKey: credentials.secretKey ? 'sk_***' : undefined,
      environment: credentials.environment,
      merchantId: credentials.merchantId
    };
  }

  /**
   * Check if credentials are for sandbox environment
   */
  static isSandboxCredentials(credentials: ElavonCredentials): boolean {
    return credentials.environment === 'sandbox' || 
           credentials.publicKey.includes('test_') || 
           credentials.secretKey.includes('test_');
  }

  /**
   * Check if credentials are for production environment
   */
  static isProductionCredentials(credentials: ElavonCredentials): boolean {
    return credentials.environment === 'production' && 
           (credentials.publicKey.includes('live_') || credentials.secretKey.includes('live_'));
  }
}