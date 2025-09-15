import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationLoaderService } from '../../services/ConfigurationLoaderService';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  },
  existsSync: jest.fn(),
  watch: jest.fn()
}));

describe('ConfigurationLoaderService', () => {
  let configService: ConfigurationLoaderService;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      extensionPath: '/test/extension/path'
    } as any;

    configService = new ConfigurationLoaderService(mockContext);
  });

  describe('loadConfiguration', () => {
    it('should load and parse configuration file', async () => {
      const mockConfig = { setting1: 'value1', setting2: 42 };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      const result = await configService.loadConfiguration('test-config.json');

      expect(fs.promises.readFile).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'test-config.json'),
        'utf8'
      );
      expect(result).toEqual(mockConfig);
    });

    it('should throw error if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(configService.loadConfiguration('non-existent.json')).rejects.toThrow('Configuration file not found');
    });

    it('should validate configuration against schema', async () => {
      const mockConfig = { setting1: 'value1' };
      const schema = {
        type: 'object' as const,
        required: ['setting1', 'setting2'],
        properties: {
          setting1: { type: 'string' as const },
          setting2: { type: 'number' as const }
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await expect(configService.loadConfiguration('test-config.json', schema)).rejects.toThrow('missing required property');
    });

    it('should cache configuration when useCache is true', async () => {
      const mockConfig = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await configService.loadConfiguration('test-config.json', undefined, true);
      await configService.loadConfiguration('test-config.json', undefined, true);

      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });

    it('should not cache configuration when useCache is false', async () => {
      const mockConfig = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await configService.loadConfiguration('test-config.json', undefined, false);
      await configService.loadConfiguration('test-config.json', undefined, false);

      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration to file', async () => {
      const config = { setting1: 'value1', setting2: 42 };
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await configService.saveConfiguration('test-config.json', config);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'test-config.json'),
        JSON.stringify(config, null, 2),
        'utf8'
      );
    });

    it('should create directory if it does not exist', async () => {
      const config = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await configService.saveConfiguration('subdir/test-config.json', config);

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'subdir'),
        { recursive: true }
      );
    });

    it('should validate configuration against schema before saving', async () => {
      const config = { setting1: 'value1' };
      const schema = {
        type: 'object' as const,
        required: ['setting1', 'setting2'],
        properties: {
          setting1: { type: 'string' as const },
          setting2: { type: 'number' as const }
        }
      };

      await expect(configService.saveConfiguration('test-config.json', config, schema)).rejects.toThrow('missing required property');
    });
  });

  describe('watchConfiguration', () => {
    it('should set up file watcher', () => {
      const mockWatcher = { close: jest.fn() };
      const callback = jest.fn();
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      // Mock vscode.Disposable in the global scope
      const originalDisposable = (global as any).vscode?.Disposable;
      if (!(global as any).vscode) {
        (global as any).vscode = {};
      }
      (global as any).vscode.Disposable = jest.fn().mockImplementation((disposeFunc) => ({
        dispose: disposeFunc
      }));

      const disposable = configService.watchConfiguration('test-config.json', callback);

      expect(fs.watch).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'test-config.json'),
        expect.any(Function)
      );

      // Verify disposable has dispose method and call it
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
      disposable.dispose();
      expect(mockWatcher.close).toHaveBeenCalled();

      // Restore original
      if (originalDisposable) {
        (global as any).vscode.Disposable = originalDisposable;
      }
    });
  });

  describe('clearCache', () => {
    it('should clear specific cache entry', async () => {
      const mockConfig = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      // Load and cache
      await configService.loadConfiguration('test-config.json');
      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);

      // Clear cache and load again
      configService.clearCache('test-config.json');
      await configService.loadConfiguration('test-config.json');
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache entries when no path specified', async () => {
      const mockConfig = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      // Load and cache multiple configs
      await configService.loadConfiguration('config1.json');
      await configService.loadConfiguration('config2.json');
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);

      // Clear all cache and load again
      configService.clearCache();
      await configService.loadConfiguration('config1.json');
      await configService.loadConfiguration('config2.json');
      expect(fs.promises.readFile).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCachedConfiguration', () => {
    it('should return cached configuration', async () => {
      const mockConfig = { setting1: 'value1' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

      await configService.loadConfiguration('test-config.json');
      const cached = configService.getCachedConfiguration('test-config.json');

      expect(cached).toEqual(mockConfig);
    });

    it('should return null for non-cached configuration', () => {
      const cached = configService.getCachedConfiguration('non-existent.json');

      expect(cached).toBeNull();
    });
  });

  describe('configurationExists', () => {
    it('should return true if configuration file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const exists = configService.configurationExists('test-config.json');

      expect(exists).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/test/extension/path', 'test-config.json')
      );
    });

    it('should return false if configuration file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const exists = configService.configurationExists('non-existent.json');

      expect(exists).toBe(false);
    });
  });
});