import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface for field mapping entry
 */
export interface FieldMapping {
  convergeField: string;
  elavonField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  maxLength?: number;
  validValues?: string[];
  transformation?: string;
  notes?: string;
  deprecated?: boolean;
}

/**
 * Interface for endpoint mapping
 */
export interface EndpointMapping {
  convergeEndpoint: string;
  elavonEndpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  fieldMappings: FieldMapping[];
  additionalHeaders?: Record<string, string>;
  authenticationChanges?: string;
  notes?: string;
}

/**
 * Interface for complete mapping dictionary
 */
export interface MappingDictionary {
  version: string;
  lastUpdated: string;
  endpoints: EndpointMapping[];
  commonFields: FieldMapping[];
  transformationRules: Record<string, string>;
  migrationNotes: string[];
}

/**
 * Interface for mapping search result
 */
export interface MappingSearchResult {
  type: 'field' | 'endpoint';
  convergeItem: string;
  elavonItem: string;
  mapping: FieldMapping | EndpointMapping;
  confidence: number;
}

/**
 * Service for managing Converge-to-Elavon field and endpoint mappings
 */
export class MappingDictionaryService {
  private mappingDictionary: MappingDictionary | null = null;
  private readonly mappingFilePath: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.mappingFilePath = path.join(context.extensionPath, 'resources', 'mapping.json');
  }

  /**
   * Load mapping dictionary from JSON file
   */
  async loadMappingDictionary(): Promise<MappingDictionary> {
    try {
      if (this.mappingDictionary) {
        return this.mappingDictionary;
      }

      const mappingContent = await fs.promises.readFile(this.mappingFilePath, 'utf8');
      this.mappingDictionary = JSON.parse(mappingContent) as MappingDictionary;
      
      // Validate the loaded dictionary
      this.validateMappingDictionary(this.mappingDictionary);
      
      console.log(`Mapping dictionary loaded successfully. Version: ${this.mappingDictionary.version}`);
      return this.mappingDictionary;

    } catch (error) {
      console.error('Failed to load mapping dictionary:', error);
      throw new Error(`Failed to load mapping dictionary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get field mapping for a specific Converge field
   */
  async getFieldMapping(convergeField: string): Promise<FieldMapping | null> {
    const dictionary = await this.loadMappingDictionary();
    
    // Search in common fields first
    const commonFieldMapping = dictionary.commonFields.find(
      mapping => mapping.convergeField.toLowerCase() === convergeField.toLowerCase()
    );
    
    if (commonFieldMapping) {
      return commonFieldMapping;
    }

    // Search in endpoint-specific mappings
    for (const endpoint of dictionary.endpoints) {
      const fieldMapping = endpoint.fieldMappings.find(
        mapping => mapping.convergeField.toLowerCase() === convergeField.toLowerCase()
      );
      if (fieldMapping) {
        return fieldMapping;
      }
    }

    return null;
  }

  /**
   * Get endpoint mapping for a specific Converge endpoint
   */
  async getEndpointMapping(convergeEndpoint: string): Promise<EndpointMapping | null> {
    const dictionary = await this.loadMappingDictionary();
    
    return dictionary.endpoints.find(
      mapping => mapping.convergeEndpoint.toLowerCase().includes(convergeEndpoint.toLowerCase()) ||
                 convergeEndpoint.toLowerCase().includes(mapping.convergeEndpoint.toLowerCase())
    ) || null;
  }

  /**
   * Get all field mappings for multiple Converge fields
   */
  async getFieldMappings(convergeFields: string[]): Promise<Map<string, FieldMapping>> {
    const mappings = new Map<string, FieldMapping>();
    
    for (const field of convergeFields) {
      const mapping = await this.getFieldMapping(field);
      if (mapping) {
        mappings.set(field, mapping);
      }
    }
    
    return mappings;
  }

  /**
   * Search for mappings using fuzzy matching
   */
  async searchMappings(query: string): Promise<MappingSearchResult[]> {
    const dictionary = await this.loadMappingDictionary();
    const results: MappingSearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search field mappings
    const allFieldMappings = [
      ...dictionary.commonFields,
      ...dictionary.endpoints.flatMap(endpoint => endpoint.fieldMappings)
    ];

    for (const fieldMapping of allFieldMappings) {
      const convergeFieldLower = fieldMapping.convergeField.toLowerCase();
      const elavonFieldLower = fieldMapping.elavonField.toLowerCase();
      
      let confidence = 0;
      
      // Exact match
      if (convergeFieldLower === queryLower || elavonFieldLower === queryLower) {
        confidence = 1.0;
      }
      // Starts with query
      else if (convergeFieldLower.startsWith(queryLower) || elavonFieldLower.startsWith(queryLower)) {
        confidence = 0.8;
      }
      // Contains query
      else if (convergeFieldLower.includes(queryLower) || elavonFieldLower.includes(queryLower)) {
        confidence = 0.6;
      }
      // Partial word match
      else if (this.partialWordMatch(convergeFieldLower, queryLower) || 
               this.partialWordMatch(elavonFieldLower, queryLower)) {
        confidence = 0.4;
      }

      if (confidence > 0) {
        results.push({
          type: 'field',
          convergeItem: fieldMapping.convergeField,
          elavonItem: fieldMapping.elavonField,
          mapping: fieldMapping,
          confidence
        });
      }
    }

    // Search endpoint mappings
    for (const endpointMapping of dictionary.endpoints) {
      const convergeEndpointLower = endpointMapping.convergeEndpoint.toLowerCase();
      const elavonEndpointLower = endpointMapping.elavonEndpoint.toLowerCase();
      
      let confidence = 0;
      
      if (convergeEndpointLower.includes(queryLower) || elavonEndpointLower.includes(queryLower)) {
        confidence = convergeEndpointLower === queryLower || elavonEndpointLower === queryLower ? 1.0 : 0.7;
        
        results.push({
          type: 'endpoint',
          convergeItem: endpointMapping.convergeEndpoint,
          elavonItem: endpointMapping.elavonEndpoint,
          mapping: endpointMapping,
          confidence
        });
      }
    }

    // Sort by confidence and remove duplicates
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .filter((result, index, array) => 
        index === array.findIndex(r => 
          r.convergeItem === result.convergeItem && r.elavonItem === result.elavonItem
        )
      );
  }

  /**
   * Get transformation rule for a field
   */
  async getTransformationRule(convergeField: string): Promise<string | null> {
    const dictionary = await this.loadMappingDictionary();
    const fieldMapping = await this.getFieldMapping(convergeField);
    
    if (fieldMapping?.transformation) {
      return dictionary.transformationRules[fieldMapping.transformation] || fieldMapping.transformation;
    }
    
    return dictionary.transformationRules[convergeField] || null;
  }

  /**
   * Get all deprecated fields
   */
  async getDeprecatedFields(): Promise<FieldMapping[]> {
    const dictionary = await this.loadMappingDictionary();
    const allFieldMappings = [
      ...dictionary.commonFields,
      ...dictionary.endpoints.flatMap(endpoint => endpoint.fieldMappings)
    ];
    
    return allFieldMappings.filter(mapping => mapping.deprecated === true);
  }

  /**
   * Get migration complexity score for a set of fields
   */
  async getMigrationComplexity(convergeFields: string[]): Promise<{
    score: number;
    complexity: 'low' | 'medium' | 'high';
    details: {
      totalFields: number;
      mappedFields: number;
      unmappedFields: number;
      deprecatedFields: number;
      transformationRequired: number;
    };
  }> {
    const mappings = await this.getFieldMappings(convergeFields);
    const deprecatedFields = await this.getDeprecatedFields();
    
    const totalFields = convergeFields.length;
    const mappedFields = mappings.size;
    const unmappedFields = totalFields - mappedFields;
    const deprecatedCount = convergeFields.filter(field => 
      deprecatedFields.some(dep => dep.convergeField === field)
    ).length;
    
    let transformationRequired = 0;
    for (const mapping of mappings.values()) {
      if (mapping.transformation) {
        transformationRequired++;
      }
    }
    
    // Calculate complexity score (0-100)
    let score = 100; // Start with perfect score
    score -= (unmappedFields / totalFields) * 40; // -40% for unmapped fields
    score -= (deprecatedCount / totalFields) * 30; // -30% for deprecated fields
    score -= (transformationRequired / totalFields) * 20; // -20% for transformations needed
    
    score = Math.max(0, Math.min(100, score));
    
    let complexity: 'low' | 'medium' | 'high';
    if (score >= 70) {
      complexity = 'low';
    } else if (score >= 40) {
      complexity = 'medium';
    } else {
      complexity = 'high';
    }
    
    return {
      score,
      complexity,
      details: {
        totalFields,
        mappedFields,
        unmappedFields,
        deprecatedFields: deprecatedCount,
        transformationRequired
      }
    };
  }

  /**
   * Generate migration code snippet for a field mapping
   */
  async generateMigrationCode(
    convergeField: string, 
    language: 'javascript' | 'typescript' | 'php' | 'python' | 'java' | 'csharp' | 'ruby' = 'javascript'
  ): Promise<string | null> {
    const mapping = await this.getFieldMapping(convergeField);
    if (!mapping) {
      return null;
    }

    const transformationRule = await this.getTransformationRule(convergeField);
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.generateJavaScriptMigrationCode(mapping, transformationRule);
      case 'php':
        return this.generatePHPMigrationCode(mapping, transformationRule);
      case 'python':
        return this.generatePythonMigrationCode(mapping, transformationRule);
      case 'java':
        return this.generateJavaMigrationCode(mapping, transformationRule);
      case 'csharp':
        return this.generateCSharpMigrationCode(mapping, transformationRule);
      case 'ruby':
        return this.generateRubyMigrationCode(mapping, transformationRule);
      default:
        return null;
    }
  }

  /**
   * Get mapping statistics
   */
  async getMappingStatistics(): Promise<{
    totalEndpoints: number;
    totalFieldMappings: number;
    commonFields: number;
    deprecatedFields: number;
    transformationRules: number;
    version: string;
    lastUpdated: string;
  }> {
    const dictionary = await this.loadMappingDictionary();
    const deprecatedFields = await this.getDeprecatedFields();
    
    const totalFieldMappings = dictionary.commonFields.length + 
      dictionary.endpoints.reduce((sum, endpoint) => sum + endpoint.fieldMappings.length, 0);
    
    return {
      totalEndpoints: dictionary.endpoints.length,
      totalFieldMappings,
      commonFields: dictionary.commonFields.length,
      deprecatedFields: deprecatedFields.length,
      transformationRules: Object.keys(dictionary.transformationRules).length,
      version: dictionary.version,
      lastUpdated: dictionary.lastUpdated
    };
  }

  /**
   * Validate mapping dictionary structure
   */
  private validateMappingDictionary(dictionary: MappingDictionary): void {
    if (!dictionary.version) {
      throw new Error('Mapping dictionary missing version');
    }
    
    if (!dictionary.endpoints || !Array.isArray(dictionary.endpoints)) {
      throw new Error('Mapping dictionary missing or invalid endpoints');
    }
    
    if (!dictionary.commonFields || !Array.isArray(dictionary.commonFields)) {
      throw new Error('Mapping dictionary missing or invalid common fields');
    }
    
    // Validate each endpoint
    for (const endpoint of dictionary.endpoints) {
      if (!endpoint.convergeEndpoint || !endpoint.elavonEndpoint) {
        throw new Error('Invalid endpoint mapping: missing endpoint URLs');
      }
      
      if (!endpoint.fieldMappings || !Array.isArray(endpoint.fieldMappings)) {
        throw new Error(`Invalid endpoint mapping for ${endpoint.convergeEndpoint}: missing field mappings`);
      }
    }
    
    // Validate field mappings
    const allFieldMappings = [...dictionary.commonFields, ...dictionary.endpoints.flatMap(e => e.fieldMappings)];
    for (const fieldMapping of allFieldMappings) {
      if (!fieldMapping.convergeField || !fieldMapping.elavonField) {
        throw new Error('Invalid field mapping: missing field names');
      }
      
      if (!fieldMapping.dataType) {
        throw new Error(`Invalid field mapping for ${fieldMapping.convergeField}: missing data type`);
      }
    }
  }

  /**
   * Partial word matching for fuzzy search
   */
  private partialWordMatch(text: string, query: string): boolean {
    const textWords = text.split(/[_\s-]+/);
    const queryWords = query.split(/[_\s-]+/);
    
    return queryWords.some(queryWord => 
      textWords.some(textWord => 
        textWord.includes(queryWord) || queryWord.includes(textWord)
      )
    );
  }

  /**
   * Generate JavaScript migration code
   */
  private generateJavaScriptMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `// Transformation required: ${transformationRule}\n` +
             `const ${elavonField} = transform${convergeField}(convergeData.${convergeField});`;
    } else {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `const ${elavonField} = convergeData.${convergeField};`;
    }
  }

  /**
   * Generate PHP migration code
   */
  private generatePHPMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `// Transformation required: ${transformationRule}\n` +
             `$${elavonField} = transform_${convergeField}($convergeData['${convergeField}']);`;
    } else {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `$${elavonField} = $convergeData['${convergeField}'];`;
    }
  }

  /**
   * Generate Python migration code
   */
  private generatePythonMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `# Migration: ${convergeField} -> ${elavonField}\n` +
             `# Transformation required: ${transformationRule}\n` +
             `${elavonField} = transform_${convergeField}(converge_data['${convergeField}'])`;
    } else {
      return `# Migration: ${convergeField} -> ${elavonField}\n` +
             `${elavonField} = converge_data['${convergeField}']`;
    }
  }

  /**
   * Generate Java migration code
   */
  private generateJavaMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `// Transformation required: ${transformationRule}\n` +
             `String ${elavonField} = transform${convergeField}(convergeData.get${convergeField}());`;
    } else {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `String ${elavonField} = convergeData.get${convergeField}();`;
    }
  }

  /**
   * Generate C# migration code
   */
  private generateCSharpMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `// Transformation required: ${transformationRule}\n` +
             `var ${elavonField} = Transform${convergeField}(convergeData.${convergeField});`;
    } else {
      return `// Migration: ${convergeField} -> ${elavonField}\n` +
             `var ${elavonField} = convergeData.${convergeField};`;
    }
  }

  /**
   * Generate Ruby migration code
   */
  private generateRubyMigrationCode(mapping: FieldMapping, transformationRule: string | null): string {
    const convergeField = mapping.convergeField;
    const elavonField = mapping.elavonField;
    
    if (transformationRule) {
      return `# Migration: ${convergeField} -> ${elavonField}\n` +
             `# Transformation required: ${transformationRule}\n` +
             `${elavonField} = transform_${convergeField}(converge_data[:${convergeField}])`;
    } else {
      return `# Migration: ${convergeField} -> ${elavonField}\n` +
             `${elavonField} = converge_data[:${convergeField}]`;
    }
  }

  /**
   * Reload mapping dictionary from file
   */
  async reloadMappingDictionary(): Promise<MappingDictionary> {
    this.mappingDictionary = null;
    return await this.loadMappingDictionary();
  }

  /**
   * Check if mapping dictionary file exists
   */
  async mappingDictionaryExists(): Promise<boolean> {
    try {
      await fs.promises.access(this.mappingFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get mapping dictionary file path
   */
  getMappingFilePath(): string {
    return this.mappingFilePath;
  }
}