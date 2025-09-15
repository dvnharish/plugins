import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Configuration schema for validation
 */
interface ConfigurationSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

/**
 * Service for loading and validating configuration files
 */
export class ConfigurationLoaderService {
  private readonly configCache = new Map<string, any>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Load configuration from a JSON file with schema validation
   */
  public async loadConfiguration<T>(
    relativePath: string,
    schema?: ConfigurationSchema,
    useCache: boolean = true
  ): Promise<T> {
    const cacheKey = relativePath;
    
    if (useCache && this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey) as T;
    }

    try {
      const configPath = path.join(this.context.extensionPath, relativePath);
      
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const configContent = await fs.promises.readFile(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      // Validate against schema if provided
      if (schema) {
        this.validateConfiguration(parsedConfig, schema, relativePath);
      }

      // Cache the configuration
      if (useCache) {
        this.configCache.set(cacheKey, parsedConfig);
      }

      console.log(`Loaded configuration from ${relativePath}`);
      return parsedConfig as T;
    } catch (error) {
      console.error(`Failed to load configuration from ${relativePath}:`, error);
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save configuration to a JSON file
   */
  public async saveConfiguration(
    relativePath: string,
    configuration: any,
    schema?: ConfigurationSchema
  ): Promise<void> {
    try {
      // Validate against schema if provided
      if (schema) {
        this.validateConfiguration(configuration, schema, relativePath);
      }

      const configPath = path.join(this.context.extensionPath, relativePath);
      const configDir = path.dirname(configPath);

      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true });
      }

      const configContent = JSON.stringify(configuration, null, 2);
      await fs.promises.writeFile(configPath, configContent, 'utf8');

      // Update cache
      this.configCache.set(relativePath, configuration);

      console.log(`Saved configuration to ${relativePath}`);
    } catch (error) {
      console.error(`Failed to save configuration to ${relativePath}:`, error);
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Watch configuration file for changes
   */
  public watchConfiguration(
    relativePath: string,
    callback: (config: any) => void,
    schema?: ConfigurationSchema
  ): vscode.Disposable {
    const configPath = path.join(this.context.extensionPath, relativePath);
    
    const watcher = fs.watch(configPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          // Clear cache and reload
          this.configCache.delete(relativePath);
          const newConfig = await this.loadConfiguration(relativePath, schema, false);
          callback(newConfig);
        } catch (error) {
          console.error(`Error reloading configuration ${relativePath}:`, error);
        }
      }
    });

    return new vscode.Disposable(() => {
      watcher.close();
    });
  }

  /**
   * Clear configuration cache
   */
  public clearCache(relativePath?: string): void {
    if (relativePath) {
      this.configCache.delete(relativePath);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Get cached configuration without loading from file
   */
  public getCachedConfiguration<T>(relativePath: string): T | null {
    return this.configCache.get(relativePath) as T || null;
  }

  /**
   * Check if configuration file exists
   */
  public configurationExists(relativePath: string): boolean {
    const configPath = path.join(this.context.extensionPath, relativePath);
    return fs.existsSync(configPath);
  }

  /**
   * Validate configuration against schema
   */
  private validateConfiguration(config: any, schema: ConfigurationSchema, filePath: string): void {
    if (schema.type === 'object' && typeof config !== 'object') {
      throw new Error(`Configuration validation failed for ${filePath}: expected object, got ${typeof config}`);
    }

    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in config)) {
          throw new Error(`Configuration validation failed for ${filePath}: missing required property '${requiredProp}'`);
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in config) {
          this.validateProperty(config[propName], propSchema, `${filePath}.${propName}`);
        }
      }
    }
  }

  /**
   * Validate individual property
   */
  private validateProperty(value: any, schema: any, propertyPath: string): void {
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== expectedType) {
        throw new Error(`Property validation failed for ${propertyPath}: expected ${expectedType}, got ${actualType}`);
      }
    }

    if (schema.type === 'array' && schema.items) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          this.validateProperty(value[i], schema.items, `${propertyPath}[${i}]`);
        }
      }
    }

    if (schema.type === 'object' && schema.properties) {
      if (typeof value === 'object' && value !== null) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in value) {
            this.validateProperty(value[propName], propSchema, `${propertyPath}.${propName}`);
          }
        }
      }
    }
  }
}