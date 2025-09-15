import * as vscode from 'vscode';
import { CredentialService, ElavonCredentials } from '../../services/CredentialService';

// Mock VS Code API
const mockSecrets = {
  store: jest.fn(),
  get: jest.fn(),
  delete: jest.fn()
};

const mockContext = {
  secrets: mockSecrets
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
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox',
        merchantId: 'MERCHANT123'
      };

      mockSecrets.store.mockResolvedValue(undefined);

      await credentialService.storeCredentials(credentials);

      expect(mockSecrets.store).toHaveBeenCalledTimes(4);
      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.publicKey',
        credentials.publicKey
      );
      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.secretKey',
        credentials.secretKey
      );
      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.environment',
        credentials.environment
      );
      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.merchantId',
        credentials.merchantId
      );
    });

    it('should store valid production credentials', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_fake_key_for_testing_only',
        secretKey: 'sk_test_fake_key_for_testing_only',
        environment: 'production'
      };

      mockSecrets.store.mockResolvedValue(undefined);

      await credentialService.storeCredentials(credentials);

      expect(mockSecrets.store).toHaveBeenCalledTimes(3); // No merchant ID
    });

    it('should throw error for invalid public key format', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'invalid_key',
        secretKey: 'sk_test_1234567890abcdef1234567890',
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
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'production'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Cannot use test keys in production environment'
      );
    });

    it('should throw error for live keys in sandbox environment', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_fake_key_for_testing_only',
        secretKey: 'sk_test_fake_key_for_testing_only',
        environment: 'sandbox'
      };

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Cannot use live keys in sandbox environment'
      );
    });

    it('should handle storage errors gracefully', async () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox'
      };

      mockSecrets.store.mockRejectedValue(new Error('Storage failed'));

      await expect(credentialService.storeCredentials(credentials)).rejects.toThrow(
        'Failed to store credentials securely'
      );
    });
  });

  describe('retrieveCredentials', () => {
    it('should retrieve complete credentials', async () => {
      const expectedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox',
        merchantId: 'MERCHANT123'
      };

      mockSecrets.get
        .mockResolvedValueOnce(expectedCredentials.publicKey)
        .mockResolvedValueOnce(expectedCredentials.secretKey)
        .mockResolvedValueOnce(expectedCredentials.environment)
        .mockResolvedValueOnce(expectedCredentials.merchantId);

      const result = await credentialService.retrieveCredentials();

      expect(result).toEqual(expectedCredentials);
      expect(mockSecrets.get).toHaveBeenCalledTimes(4);
    });

    it('should retrieve credentials without merchant ID', async () => {
      const expectedCredentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox'
      };

      mockSecrets.get
        .mockResolvedValueOnce(expectedCredentials.publicKey)
        .mockResolvedValueOnce(expectedCredentials.secretKey)
        .mockResolvedValueOnce(expectedCredentials.environment)
        .mockResolvedValueOnce(undefined); // No merchant ID

      const result = await credentialService.retrieveCredentials();

      expect(result).toEqual(expectedCredentials);
    });

    it('should return null when essential credentials are missing', async () => {
      mockSecrets.get
        .mockResolvedValueOnce(undefined) // No public key
        .mockResolvedValueOnce('sk_test_1234567890abcdef1234567890')
        .mockResolvedValueOnce('sandbox')
        .mockResolvedValueOnce(undefined);

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });

    it('should return null when retrieval fails', async () => {
      mockSecrets.get.mockRejectedValue(new Error('Retrieval failed'));

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });

    it('should return null when retrieved credentials are invalid', async () => {
      mockSecrets.get
        .mockResolvedValueOnce('invalid_key') // Invalid public key
        .mockResolvedValueOnce('sk_test_1234567890abcdef1234567890')
        .mockResolvedValueOnce('sandbox')
        .mockResolvedValueOnce(undefined);

      const result = await credentialService.retrieveCredentials();

      expect(result).toBeNull();
    });
  });

  describe('hasCredentials', () => {
    it('should return true when credentials exist', async () => {
      mockSecrets.get
        .mockResolvedValueOnce('pk_test_1234567890abcdef1234567890')
        .mockResolvedValueOnce('sk_test_1234567890abcdef1234567890');

      const result = await credentialService.hasCredentials();

      expect(result).toBe(true);
    });

    it('should return false when credentials are missing', async () => {
      mockSecrets.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('sk_test_1234567890abcdef1234567890');

      const result = await credentialService.hasCredentials();

      expect(result).toBe(false);
    });

    it('should return false when check fails', async () => {
      mockSecrets.get.mockRejectedValue(new Error('Check failed'));

      const result = await credentialService.hasCredentials();

      expect(result).toBe(false);
    });
  });

  describe('clearCredentials', () => {
    it('should clear all credentials', async () => {
      mockSecrets.delete.mockResolvedValue(undefined);

      await credentialService.clearCredentials();

      expect(mockSecrets.delete).toHaveBeenCalledTimes(4);
      expect(mockSecrets.delete).toHaveBeenCalledWith('converge-migrator.elavon.publicKey');
      expect(mockSecrets.delete).toHaveBeenCalledWith('converge-migrator.elavon.secretKey');
      expect(mockSecrets.delete).toHaveBeenCalledWith('converge-migrator.elavon.environment');
      expect(mockSecrets.delete).toHaveBeenCalledWith('converge-migrator.elavon.merchantId');
    });

    it('should handle deletion errors', async () => {
      mockSecrets.delete.mockRejectedValue(new Error('Deletion failed'));

      await expect(credentialService.clearCredentials()).rejects.toThrow(
        'Failed to clear credentials'
      );
    });
  });

  describe('updateCredentialField', () => {
    it('should update public key field', async () => {
      const newPublicKey = 'pk_test_1234567890abcdef1234567890';
      mockSecrets.store.mockResolvedValue(undefined);

      await credentialService.updateCredentialField('publicKey', newPublicKey);

      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.publicKey',
        newPublicKey
      );
    });

    it('should update environment field', async () => {
      mockSecrets.store.mockResolvedValue(undefined);

      await credentialService.updateCredentialField('environment', 'production');

      expect(mockSecrets.store).toHaveBeenCalledWith(
        'converge-migrator.elavon.environment',
        'production'
      );
    });

    it('should throw error for invalid field', async () => {
      await expect(
        credentialService.updateCredentialField('invalidField' as any, 'value')
      ).rejects.toThrow('Invalid credential field');
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
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox'
      };

      expect(() => credentialService.validateCredentials(credentials)).not.toThrow();
    });

    it('should validate correct production credentials', () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_fake_key_for_testing_only',
        secretKey: 'sk_test_fake_key_for_testing_only',
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
        secretKey: 'sk_test_1234567890abcdef1234567890',
        environment: 'sandbox'
      } as ElavonCredentials;

      expect(() => credentialService.validateCredentials(credentials)).toThrow(
        'Public key is required'
      );
    });

    it('should throw error for invalid environment', () => {
      const credentials: ElavonCredentials = {
        publicKey: 'pk_test_1234567890abcdef1234567890',
        secretKey: 'sk_test_1234567890abcdef1234567890',
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
          'sk_test_1234567890abcdef1234567890'
        );
        expect(result).toBe('sandbox');
      });

      it('should return production for live keys', () => {
        const result = CredentialService.getEnvironmentFromKeys(
          'pk_test_fake_key_for_testing_only',
          'sk_test_fake_key_for_testing_only'
        );
        expect(result).toBe('production');
      });
    });

    describe('maskCredentials', () => {
      it('should mask sensitive credential data', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
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
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'sandbox'
        };

        expect(CredentialService.isSandboxCredentials(credentials)).toBe(true);
      });

      it('should return true for test keys regardless of environment', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'production' // Inconsistent but test keys detected
        };

        expect(CredentialService.isSandboxCredentials(credentials)).toBe(true);
      });
    });

    describe('isProductionCredentials', () => {
      it('should return true for production environment with live keys', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_fake_key_for_testing_only',
          secretKey: 'sk_test_fake_key_for_testing_only',
          environment: 'production'
        };

        expect(CredentialService.isProductionCredentials(credentials)).toBe(true);
      });

      it('should return false for production environment with test keys', () => {
        const credentials: ElavonCredentials = {
          publicKey: 'pk_test_1234567890abcdef1234567890',
          secretKey: 'sk_test_1234567890abcdef1234567890',
          environment: 'production'
        };

        expect(CredentialService.isProductionCredentials(credentials)).toBe(false);
      });
    });
  });
});