import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CredentialService, ElavonCredentials } from '../../services/CredentialService';

// Mock file system
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock VS Code API
const mockGlobalStorageUri = {
  fsPath: '\\mock\\global\\storage'
} as vscode.Uri;

const mockContext = {
  globalStorageUri: mockGlobalStorageUri
} as unknown as vscode.ExtensionContext;

describe('CredentialService', () => {
  let credentialService: CredentialService;

  beforeEach(() => {
    credentialService = new CredentialService(mockContext);
    jest.clearAllMocks();
  });

  describe('storeCredentials', () => {
    it('should store valid sandbox credentials', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        merchantId: 'MERCHANT123'
      };

      mockedFs.existsSync.mockReturnValue(false); // Directory doesn't exist
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      await credentialService.storeCredentials(credentials);

      expect(mockedFs.existsSync).toHaveBeenCalledWith('\\mock\\global\\storage');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('\\mock\\global\\storage', { recursive: true });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '\\mock\\global\\storage\\elavon-credentials.json',
        expect.stringContaining('"publicKey":"pk_test_1234567890abcdef1234567890"'),
        'utf8'
      );
    });

    it('should store valid production credentials', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_live_1234567890abcdef1234567890',
        secretKey: 'sk_live_1234567890abcdef1234567890',
        environment: 'production'
      };

      mockedFs.existsSync.mockReturnValue(true); // Directory exists
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      await credentialService.storeCredentials(credentials);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '\\mock\\global\\storage\\elavon-credentials.json',
        expect.stringContaining('"environment":"production"'),
        'utf8'
      );
    });

    it('should throw error for invalid public key format', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'invalid_key',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Invalid public key format'
      );
    });

    it('should throw error for invalid secret key format', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'invalid_key',
        environment: 'sandbox'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Invalid secret key format'
      );
    });

    it('should throw error for test keys in production environment', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'production'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Cannot use test keys in production environment'
      );
    });

    it('should throw error for live keys in sandbox environment', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_live_1234567890abcdef1234567890',
        secretKey: 'sk_live_1234567890abcdef1234567890',
        environment: 'sandbox'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Cannot use live keys in sandbox environment'
      );
    });

    it('should handle storage errors gracefully', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Storage failed');
      });

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Failed to store credentials locally'
      );
    });
  });

  describe('retrieveCredentials', () => {
    it('should retrieve complete credentials', async () => {
      const expectedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        merchantId: 'MERCHANT123'
      };

      const credentialsData = {
        publicKey: expectedCredentials.publicKey,
        secretKey: expectedCredentials.secretKey,
        environment: expectedCredentials.environment,
        merchantId: expectedCredentials.merchantId,
        lastUpdated: new Date().toISOString()
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.retrieveCredentials();

      expect(result).toEqual(expectedCredentials);
      expect(mockedFs.existsSync).toHaveBeenCalledWith('\\mock\\global\\storage/elavon-credentials.json');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('\\mock\\global\\storage/elavon-credentials.json', 'utf8');
    });

    it('should retrieve credentials without merchant ID', async () => {
      const expectedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      const credentialsData = {
        publicKey: expectedCredentials.publicKey,
        secretKey: expectedCredentials.secretKey,
        environment: expectedCredentials.environment,
        lastUpdated: new Date().toISOString()
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.retrieveCredentials();

      expect(result).toEqual(expectedCredentials);
    });

    it('should return null when file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });

    it('should return null when essential credentials are missing', async () => {
      const credentialsData = {
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        lastUpdated: new Date().toISOString()
        // Missing publicKey
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });

    it('should return null when retrieval fails', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });

    it('should return null when retrieved credentials are invalid', async () => {
      const credentialsData = {
        publicKey: 'invalid_key', // Invalid public key
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        lastUpdated: new Date().toISOString()
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });
  });

  describe('hasCredentials', () => {
    it('should return true when credentials exist', async () => {
      const credentialsData = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        lastUpdated: new Date().toISOString()
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.hasCredentials();

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await credentialService.hasCredentials();

      expect(result).toBe(false);
    });

    it('should return false when credentials are missing', async () => {
      const credentialsData = {
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox',
        lastUpdated: new Date().toISOString()
        // Missing publicKey
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(credentialsData));

      const result = await credentialService.hasCredentials();

      expect(result).toBe(false);
    });

    it('should return false when check fails', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Check failed');
      });

      const result = await credentialService.hasCredentials();

      expect(result).toBe(false);
    });
  });

  describe('clearCredentials', () => {
    it('should clear all credentials when file exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => undefined);

      await credentialService.clearCredentials();

      expect(mockedFs.existsSync).toHaveBeenCalledWith('\\mock\\global\\storage/elavon-credentials.json');
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith('\\mock\\global\\storage/elavon-credentials.json');
    });

    it('should handle file not existing gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await credentialService.clearCredentials();

      expect(mockedFs.existsSync).toHaveBeenCalledWith('\\mock\\global\\storage/elavon-credentials.json');
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Deletion failed');
      });

      await expect(credentialService.clearCredentials()).rejects.toThrow(
        'Failed to clear credentials'
      );
    });
  });

  describe('updateCredentialField', () => {
    it('should update public key field', async () => {
      const newPublicKey = 'pk_test_1234567890abcdef1234567890';
      const existingCredentials = {
        publicKey: 'pk_test_old_key',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox' as const
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        ...existingCredentials,
        lastUpdated: new Date().toISOString()
      }));
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      await credentialService.updateCredentialField('publicKey', newPublicKey);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '\\mock\\global\\storage\\elavon-credentials.json',
        expect.stringContaining(`"publicKey":"${newPublicKey}"`),
        'utf8'
      );
    });

    it('should update environment field', async () => {
      const existingCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox' as const
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        ...existingCredentials,
        lastUpdated: new Date().toISOString()
      }));
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      await credentialService.updateCredentialField('environment', 'production');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '\\mock\\global\\storage\\elavon-credentials.json',
        expect.stringContaining('"environment":"production"'),
        'utf8'
      );
    });

    it('should validate field value before updating', async () => {
      await expect(
        credentialService.updateCredentialField('publicKey', 'invalid_key')
      ).rejects.toThrow('Invalid public key format');
    });
  });

  describe('validateCredentials', () => {
    it('should validate correct sandbox credentials', () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      };

      expect(() => credentialService.validateCredentials(credentials)).not.toThrow();
    });

    it('should validate correct production credentials', () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_live_1234567890abcdef1234567890',
        secretKey: 'sk_live_1234567890abcdef1234567890',
        environment: 'production'
      };

      expect(() => credentialService.validateCredentials(credentials)).not.toThrow();
    });

    it('should throw error for missing credentials object', () => {
      expect(() => credentialService.validateCredentials(null as any)).toThrow(
        'Credentials object is required'
      );
    });

    it('should throw error for missing public key', () => {
      const credentials = {
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'sandbox'
      } as ElavonCredentials;

      expect(() => credentialService.validateCredentials(credentials)).toThrow(
        'Public key is required'
      );
    });

    it('should throw error for invalid environment', () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_placeholder_key_for_testing',
        environment: 'invalid' as any
      };

      expect(() => credentialService.validateCredentials(credentials)).toThrow(
        'Environment must be either "sandbox" or "production"'
      );
    });
  });

  describe('static utility methods', () => {
    describe('getEnvironmentFromKeys', () => {
      it('should return sandbox for test keys', () => {
        const result = CredentialService.getEnvironmentFromKeys(
          'pk_test_1234567890abcdef1234567890',
          'sk_test_placeholder_key_for_testing'
        );
        expect(result).toBe('sandbox');
      });

      it('should return production for live keys', () => {
        const result = CredentialService.getEnvironmentFromKeys(
          'pk_live_1234567890abcdef1234567890',
          'sk_live_1234567890abcdef1234567890'
        );
        expect(result).toBe('production');
      });
    });

    describe('maskCredentials', () => {
      it('should mask sensitive credential data', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_placeholder_key_for_testing',
          environment: 'sandbox',
          merchantId: 'MERCHANT123'
        };

        const masked = CredentialService.maskCredentials(credentials);

        expect(masked.publicKey).toBe('pk_test_...');
        expect(masked.secretKey).toBe('sk_***');
        expect(masked.environment).toBe('sandbox');
        expect(masked.merchantId).toBe('MERCHANT123');
      });
    });

    describe('isSandboxCredentials', () => {
      it('should return true for sandbox environment', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_placeholder_key_for_testing',
          environment: 'sandbox'
        };

        expect(CredentialService.isSandboxCredentials(credentials)).toBe(true);
      });

      it('should return true for test keys regardless of environment', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_placeholder_key_for_testing',
          environment: 'production' // Inconsistent but test keys detected
        };

        expect(CredentialService.isSandboxCredentials(credentials)).toBe(true);
      });
    });

    describe('isProductionCredentials', () => {
      it('should return true for production environment with live keys', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_live_1234567890abcdef1234567890',
          secretKey: 'sk_live_1234567890abcdef1234567890',
          environment: 'production'
        };

        expect(CredentialService.isProductionCredentials(credentials)).toBe(true);
      });

      it('should return false for production environment with test keys', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_placeholder_key_for_testing',
          environment: 'production'
        };

        expect(CredentialService.isProductionCredentials(credentials)).toBe(false);
      });
    });
  });
});