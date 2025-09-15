import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MappingDictionary, EndpointMapping } from '../types/EndpointMapping';

/**
 * Service for managing Converge to Elavon endpoint mappings
 */
export class MappingService {
  private mappingDictionary: MappingDictionary | null = null;
  private readonly mappingFilePath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.mappingFilePath = path.join(context.extensionPath, 'resources', 'mapping.json');
  }

  /**
   * Load the mapping dictionary from file
   */
  public async loadMappingDictionary(): Promise<MappingDictionary> {
    if (this.mappingDictionary) {
      return this.mappingDictionary;
    }

    try {
      const mappingContent = await fs.promises.readFile(this.mappingFilePath, 'utf8');
      const parsedMapping = JSON.parse(mappingContent) as MappingDictionary;
      
      // Validate the mapping structure
      this.validateMappingDictionary(parsedMapping);
      
      // Convert lastUpdated string to Date if needed
      if (typeof parsedMapping.lastUpdated === 'string') {
        parsedMapping.lastUpdated = new Date(parsedMapping.lastUpdated);
      }
      
      this.mappingDictionary = parsedMapping;
      console.log(`Loaded mapping dictionary v${parsedMapping.version} with ${parsedMapping.mappings.length} mappings`);
      
      return this.mappingDictionary;
    } catch (error) {
      console.error('Failed to load mapping dictionary:', error);
      throw new Error(`Failed to load mapping dictionary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get mapping for a specific Converge endpoint
   */
  public async getMappingForEndpoint(convergeEndpoint: string): Promise<EndpointMapping | null> {
    const dictionary = await this.loadMappingDictionary();
    
    return dictionary.mappings.find(mapping => 
      mapping.convergeEndpoint === convergeEndpoint ||
      convergeEndpoint.includes(mapping.convergeEndpoint)
    ) || null;
  }

  /**
   * Get all available mappings
   */
  public async getAllMappings(): Promise<EndpointMapping[]> {
    const dictionary = await this.loadMappingDictionary();
    return dictionary.mappings;
  }

  /**
   * Get mapping dictionary version
   */
  public async getVersion(): Promise<string> {
    const dictionary = await this.loadMappingDictionary();
    return dictionary.version;
  }

  /**
   * Get field mapping for a specific Converge field
   */
  public async getFieldMapping(convergeEndpoint: string, convergeField: string): Promise<string | null> {
    const mapping = await this.getMappingForEndpoint(convergeEndpoint);
    
    if (!mapping) {
      return null;
    }

    return mapping.fieldMappings[convergeField] || null;
  }

  /**
   * Get all SSL fields for a specific endpoint
   */
  public async getSslFieldsForEndpoint(convergeEndpoint: string): Promise<string[]> {
    const mapping = await this.getMappingForEndpoint(convergeEndpoint);
    
    if (!mapping) {
      return [];
    }

    return Object.keys(mapping.fieldMappings).filter(field => field.startsWith('ssl_'));
  }

  /**
   * Search for mappings by field name
   */
  public async searchMappingsByField(fieldName: string): Promise<EndpointMapping[]> {
    const dictionary = await this.loadMappingDictionary();
    
    return dictionary.mappings.filter(mapping =>
      Object.keys(mapping.fieldMappings).some(field =>
        field.toLowerCase().includes(fieldName.toLowerCase())
      ) ||
      Object.values(mapping.fieldMappings).some(elavonField =>
        elavonField.toLowerCase().includes(fieldName.toLowerCase())
      )
    );
  }

  /**
   * Get reverse mapping (Elavon to Converge)
   */
  public async getReverseMappingForField(elavonField: string): Promise<{ endpoint: string; convergeField: string }[]> {
    const dictionary = await this.loadMappingDictionary();
    const results: { endpoint: string; convergeField: string }[] = [];

    for (const mapping of dictionary.mappings) {
      for (const [convergeField, mappedElavonField] of Object.entries(mapping.fieldMappings)) {
        if (mappedElavonField === elavonField) {
          results.push({
            endpoint: mapping.convergeEndpoint,
            convergeField: convergeField
          });
        }
      }
    }

    return results;
  }

  /**
   * Validate mapping dictionary structure
   */
  private validateMappingDictionary(dictionary: any): void {
    if (!dictionary || typeof dictionary !== 'object') {
      throw new Error('Invalid mapping dictionary: must be an object');
    }

    if (!dictionary.version || typeof dictionary.version !== 'string') {
      throw new Error('Invalid mapping dictionary: version is required and must be a string');
    }

    if (!dictionary.mappings || !Array.isArray(dictionary.mappings)) {
      throw new Error('Invalid mapping dictionary: mappings must be an array');
    }

    for (let i = 0; i < dictionary.mappings.length; i++) {
      const mapping = dictionary.mappings[i];
      
      if (!mapping.convergeEndpoint || typeof mapping.convergeEndpoint !== 'string') {
        throw new Error(`Invalid mapping at index ${i}: convergeEndpoint is required and must be a string`);
      }

      if (!mapping.elavonEndpoint || typeof mapping.elavonEndpoint !== 'string') {
        throw new Error(`Invalid mapping at index ${i}: elavonEndpoint is required and must be a string`);
      }

      if (!mapping.method || typeof mapping.method !== 'string') {
        throw new Error(`Invalid mapping at index ${i}: method is required and must be a string`);
      }

      if (!mapping.fieldMappings || typeof mapping.fieldMappings !== 'object') {
        throw new Error(`Invalid mapping at index ${i}: fieldMappings is required and must be an object`);
      }
    }
  }

  /**
   * Reload mapping dictionary from file
   */
  public async reloadMappingDictionary(): Promise<MappingDictionary> {
    this.mappingDictionary = null;
    return await this.loadMappingDictionary();
  }

  /**
   * Export mapping dictionary for external use
   */
  public async exportMappingDictionary(): Promise<string> {
    const dictionary = await this.loadMappingDictionary();
    return JSON.stringify(dictionary, null, 2);
  }

  /**
   * Get mapping statistics
   */
  public async getMappingStatistics(): Promise<{
    totalMappings: number;
    totalFields: number;
    endpointTypes: string[];
    version: string;
    lastUpdated: Date;
  }> {
    const dictionary = await this.loadMappingDictionary();
    
    const totalFields = dictionary.mappings.reduce(
      (total, mapping) => total + Object.keys(mapping.fieldMappings).length,
      0
    );

    const endpointTypes = dictionary.mappings.map(mapping => mapping.convergeEndpoint);

    return {
      totalMappings: dictionary.mappings.length,
      totalFields,
      endpointTypes,
      version: dictionary.version,
      lastUpdated: dictionary.lastUpdated
    };
  }
}