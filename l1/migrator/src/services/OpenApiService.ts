import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OpenAPI specification interface
 */
export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: Parameter[];
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags?: string[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema: Schema;
  description?: string;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema: Schema;
}

export interface Schema {
  type?: string;
  format?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  description?: string;
  enum?: any[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  $ref?: string;
}

/**
 * Field mapping between Converge and Elavon
 */
export interface FieldMapping {
  convergeField: string;
  elavonField: string;
  confidence: number;
  transformation?: string;
  required: boolean;
  type: string;
}

/**
 * Endpoint mapping between Converge and Elavon
 */
export interface EndpointMapping {
  convergeEndpoint: string;
  elavonEndpoint: string;
  convergeMethod: string;
  elavonMethod: string;
  confidence: number;
  fieldMappings: FieldMapping[];
  description?: string;
}

/**
 * OpenAPI comparison result
 */
export interface OpenApiComparison {
  convergeSpec: OpenApiSpec;
  elavonSpec: OpenApiSpec;
  endpointMappings: EndpointMapping[];
  unmappedConvergeEndpoints: string[];
  unmappedElavonEndpoints: string[];
  fieldMappings: FieldMapping[];
  confidence: number;
}

/**
 * Service for parsing and comparing OpenAPI specifications
 */
export class OpenApiService {
  private convergeSpec: OpenApiSpec | null = null;
  private elavonSpec: OpenApiSpec | null = null;
  private endpointMappings: EndpointMapping[] = [];
  private fieldMappings: FieldMapping[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Load Converge OpenAPI specification
   */
  public async loadConvergeSpec(specPath: string): Promise<OpenApiSpec> {
    try {
      const specContent = await fs.promises.readFile(specPath, 'utf8');
      this.convergeSpec = JSON.parse(specContent);
      return this.convergeSpec;
    } catch (error) {
      throw new Error(`Failed to load Converge OpenAPI spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load Elavon OpenAPI specification
   */
  public async loadElavonSpec(specPath: string): Promise<OpenApiSpec> {
    try {
      const specContent = await fs.promises.readFile(specPath, 'utf8');
      this.elavonSpec = JSON.parse(specContent);
      return this.elavonSpec;
    } catch (error) {
      throw new Error(`Failed to load Elavon OpenAPI spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare Converge and Elavon OpenAPI specifications
   */
  public async compareSpecs(): Promise<OpenApiComparison> {
    if (!this.convergeSpec || !this.elavonSpec) {
      throw new Error('Both Converge and Elavon specifications must be loaded before comparison');
    }

    const endpointMappings = this.generateEndpointMappings();
    const fieldMappings = this.generateFieldMappings();
    
    const unmappedConvergeEndpoints = this.findUnmappedEndpoints(this.convergeSpec, this.elavonSpec);
    const unmappedElavonEndpoints = this.findUnmappedEndpoints(this.elavonSpec, this.convergeSpec);
    
    const confidence = this.calculateOverallConfidence(endpointMappings, fieldMappings);

    return {
      convergeSpec: this.convergeSpec,
      elavonSpec: this.elavonSpec,
      endpointMappings,
      unmappedConvergeEndpoints,
      unmappedElavonEndpoints,
      fieldMappings,
      confidence
    };
  }

  /**
   * Generate endpoint mappings between Converge and Elavon
   */
  private generateEndpointMappings(): EndpointMapping[] {
    if (!this.convergeSpec || !this.elavonSpec) {
      return [];
    }

    const mappings: EndpointMapping[] = [];
    const convergePaths = Object.keys(this.convergeSpec.paths);
    const elavonPaths = Object.keys(this.elavonSpec.paths);

    for (const convergePath of convergePaths) {
      const bestMatch = this.findBestEndpointMatch(convergePath, elavonPaths);
      if (bestMatch) {
        const convergePathItem = this.convergeSpec.paths[convergePath];
        const elavonPathItem = this.elavonSpec.paths[bestMatch.path];
        
        const methodMapping = this.findMethodMapping(convergePathItem, elavonPathItem);
        if (methodMapping) {
          const fieldMappings = this.generateFieldMappingsForEndpoints(
            convergePathItem,
            elavonPathItem,
            methodMapping.convergeMethod,
            methodMapping.elavonMethod
          );

          mappings.push({
            convergeEndpoint: convergePath,
            elavonEndpoint: bestMatch.path,
            convergeMethod: methodMapping.convergeMethod,
            elavonMethod: methodMapping.elavonMethod,
            confidence: bestMatch.confidence,
            fieldMappings,
            description: `Migrate from ${convergePath} to ${bestMatch.path}`
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Find best matching endpoint
   */
  private findBestEndpointMatch(convergePath: string, elavonPaths: string[]): { path: string; confidence: number } | null {
    let bestMatch: { path: string; confidence: number } | null = null;
    let bestScore = 0;

    for (const elavonPath of elavonPaths) {
      const score = this.calculatePathSimilarity(convergePath, elavonPath);
      if (score > bestScore && score > 0.3) { // Minimum confidence threshold
        bestScore = score;
        bestMatch = { path: elavonPath, confidence: score };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate path similarity score
   */
  private calculatePathSimilarity(path1: string, path2: string): number {
    // Normalize paths
    const normalizedPath1 = path1.toLowerCase().replace(/[{}]/g, '');
    const normalizedPath2 = path2.toLowerCase().replace(/[{}]/g, '');

    // Exact match
    if (normalizedPath1 === normalizedPath2) {
      return 1.0;
    }

    // Check for common patterns
    const patterns = [
      { converge: '/hosted-payments', elavon: '/payments' },
      { converge: '/checkout', elavon: '/checkout' },
      { converge: '/process', elavon: '/process' },
      { converge: '/batch', elavon: '/batch' },
      { converge: '/transaction', elavon: '/transaction' }
    ];

    for (const pattern of patterns) {
      if (normalizedPath1.includes(pattern.converge) && normalizedPath2.includes(pattern.elavon)) {
        return 0.9;
      }
    }

    // Calculate string similarity
    return this.calculateStringSimilarity(normalizedPath1, normalizedPath2);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find method mapping between path items
   */
  private findMethodMapping(convergePathItem: PathItem, elavonPathItem: PathItem): { convergeMethod: string; elavonMethod: string } | null {
    const methods = ['get', 'post', 'put', 'delete', 'patch'];
    
    for (const method of methods) {
      if (convergePathItem[method as keyof PathItem] && elavonPathItem[method as keyof PathItem]) {
        return { convergeMethod: method, elavonMethod: method };
      }
    }

    // Try to find similar methods
    for (const convergeMethod of methods) {
      if (convergePathItem[convergeMethod as keyof PathItem]) {
        for (const elavonMethod of methods) {
          if (elavonPathItem[elavonMethod as keyof PathItem]) {
            // Check if operations are similar
            const convergeOp = convergePathItem[convergeMethod as keyof PathItem] as Operation;
            const elavonOp = elavonPathItem[elavonMethod as keyof PathItem] as Operation;
            
            if (this.areOperationsSimilar(convergeOp, elavonOp)) {
              return { convergeMethod, elavonMethod };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if two operations are similar
   */
  private areOperationsSimilar(op1: Operation, op2: Operation): boolean {
    // Check summary similarity
    if (op1.summary && op2.summary) {
      const similarity = this.calculateStringSimilarity(op1.summary.toLowerCase(), op2.summary.toLowerCase());
      if (similarity > 0.7) {
        return true;
      }
    }

    // Check description similarity
    if (op1.description && op2.description) {
      const similarity = this.calculateStringSimilarity(op1.description.toLowerCase(), op2.description.toLowerCase());
      if (similarity > 0.7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate field mappings for specific endpoints
   */
  private generateFieldMappingsForEndpoints(
    convergePathItem: PathItem,
    elavonPathItem: PathItem,
    convergeMethod: string,
    elavonMethod: string
  ): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    const convergeOp = convergePathItem[convergeMethod as keyof PathItem] as Operation;
    const elavonOp = elavonPathItem[elavonMethod as keyof PathItem] as Operation;

    if (!convergeOp || !elavonOp) {
      return mappings;
    }

    // Map request body schemas
    if (convergeOp.requestBody && elavonOp.requestBody) {
      const convergeSchema = this.extractSchemaFromRequestBody(convergeOp.requestBody);
      const elavonSchema = this.extractSchemaFromRequestBody(elavonOp.requestBody);
      
      if (convergeSchema && elavonSchema) {
        const schemaMappings = this.generateSchemaMappings(convergeSchema, elavonSchema);
        mappings.push(...schemaMappings);
      }
    }

    // Map parameters
    if (convergeOp.parameters && elavonOp.parameters) {
      const paramMappings = this.generateParameterMappings(convergeOp.parameters, elavonOp.parameters);
      mappings.push(...paramMappings);
    }

    return mappings;
  }

  /**
   * Extract schema from request body
   */
  private extractSchemaFromRequestBody(requestBody: RequestBody): Schema | null {
    const content = requestBody.content;
    if (content && content['application/json']) {
      return content['application/json'].schema;
    }
    return null;
  }

  /**
   * Generate schema mappings
   */
  private generateSchemaMappings(convergeSchema: Schema, elavonSchema: Schema): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    if (convergeSchema.properties && elavonSchema.properties) {
      for (const [convergeField, convergeFieldSchema] of Object.entries(convergeSchema.properties)) {
        const bestMatch = this.findBestFieldMatch(convergeField, convergeFieldSchema, elavonSchema.properties);
        if (bestMatch) {
          mappings.push({
            convergeField,
            elavonField: bestMatch.field,
            confidence: bestMatch.confidence,
            required: elavonSchema.required?.includes(bestMatch.field) || false,
            type: bestMatch.type,
            transformation: this.generateTransformation(convergeField, bestMatch.field)
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Find best matching field
   */
  private findBestFieldMatch(convergeField: string, convergeFieldSchema: Schema, elavonProperties: Record<string, Schema>): { field: string; confidence: number; type: string } | null {
    let bestMatch: { field: string; confidence: number; type: string } | null = null;
    let bestScore = 0;

    for (const [elavonField, elavonFieldSchema] of Object.entries(elavonProperties)) {
      const score = this.calculateFieldSimilarity(convergeField, elavonField, convergeFieldSchema, elavonFieldSchema);
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = {
          field: elavonField,
          confidence: score,
          type: elavonFieldSchema.type || 'string'
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate field similarity
   */
  private calculateFieldSimilarity(convergeField: string, elavonField: string, convergeSchema: Schema, elavonSchema: Schema): number {
    // Check for known field mappings
    const knownMappings: Record<string, string> = {
      'ssl_amount': 'amount.total',
      'ssl_transaction_type': 'transactionType',
      'ssl_merchant_txn_id': 'merchantTransactionId',
      'ssl_card_number': 'paymentMethod.cardNumber',
      'ssl_exp_date': 'paymentMethod.expirationDate',
      'ssl_cvv': 'paymentMethod.cvv',
      'ssl_first_name': 'customer.firstName',
      'ssl_last_name': 'customer.lastName',
      'ssl_email': 'customer.email',
      'ssl_phone': 'customer.phone'
    };

    if (knownMappings[convergeField] === elavonField) {
      return 1.0;
    }

    // Calculate name similarity
    const nameSimilarity = this.calculateStringSimilarity(convergeField.toLowerCase(), elavonField.toLowerCase());
    
    // Calculate type compatibility
    const typeCompatibility = this.calculateTypeCompatibility(convergeSchema, elavonSchema);
    
    // Weighted combination
    return (nameSimilarity * 0.7) + (typeCompatibility * 0.3);
  }

  /**
   * Calculate type compatibility
   */
  private calculateTypeCompatibility(convergeSchema: Schema, elavonSchema: Schema): number {
    if (convergeSchema.type === elavonSchema.type) {
      return 1.0;
    }

    // Check for compatible types
    const compatibleTypes: Record<string, string[]> = {
      'string': ['string'],
      'number': ['number', 'integer'],
      'integer': ['number', 'integer'],
      'boolean': ['boolean'],
      'array': ['array'],
      'object': ['object']
    };

    const convergeType = convergeSchema.type || 'string';
    const elavonType = elavonSchema.type || 'string';

    if (compatibleTypes[convergeType]?.includes(elavonType)) {
      return 0.8;
    }

    return 0.3;
  }

  /**
   * Generate transformation rule
   */
  private generateTransformation(convergeField: string, elavonField: string): string {
    // Simple field name transformation
    if (convergeField.startsWith('ssl_') && !elavonField.startsWith('ssl_')) {
      return `Remove 'ssl_' prefix and convert to camelCase`;
    }
    
    if (convergeField.includes('_') && !elavonField.includes('_')) {
      return `Convert snake_case to camelCase`;
    }

    return `Direct field mapping`;
  }

  /**
   * Generate parameter mappings
   */
  private generateParameterMappings(convergeParams: Parameter[], elavonParams: Parameter[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    for (const convergeParam of convergeParams) {
      const bestMatch = this.findBestParameterMatch(convergeParam, elavonParams);
      if (bestMatch) {
        mappings.push({
          convergeField: convergeParam.name,
          elavonField: bestMatch.name,
          confidence: bestMatch.confidence,
          required: bestMatch.required || false,
          type: bestMatch.schema.type || 'string',
          transformation: `Parameter mapping: ${convergeParam.in} -> ${bestMatch.in}`
        });
      }
    }

    return mappings;
  }

  /**
   * Find best parameter match
   */
  private findBestParameterMatch(convergeParam: Parameter, elavonParams: Parameter[]): { name: string; confidence: number; required: boolean; schema: Schema; in: string } | null {
    let bestMatch: { name: string; confidence: number; required: boolean; schema: Schema; in: string } | null = null;
    let bestScore = 0;

    for (const elavonParam of elavonParams) {
      const score = this.calculateParameterSimilarity(convergeParam, elavonParam);
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = {
          name: elavonParam.name,
          confidence: score,
          required: elavonParam.required || false,
          schema: elavonParam.schema,
          in: elavonParam.in
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate parameter similarity
   */
  private calculateParameterSimilarity(param1: Parameter, param2: Parameter): number {
    // Name similarity
    const nameSimilarity = this.calculateStringSimilarity(param1.name.toLowerCase(), param2.name.toLowerCase());
    
    // Location similarity (query, header, path, cookie)
    const locationSimilarity = param1.in === param2.in ? 1.0 : 0.5;
    
    // Type similarity
    const typeSimilarity = this.calculateTypeCompatibility(param1.schema, param2.schema);
    
    // Weighted combination
    return (nameSimilarity * 0.5) + (locationSimilarity * 0.3) + (typeSimilarity * 0.2);
  }

  /**
   * Generate field mappings
   */
  private generateFieldMappings(): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    if (this.convergeSpec && this.elavonSpec) {
      // Generate mappings from all endpoint comparisons
      for (const mapping of this.endpointMappings) {
        mappings.push(...mapping.fieldMappings);
      }
    }

    return mappings;
  }

  /**
   * Find unmapped endpoints
   */
  private findUnmappedEndpoints(sourceSpec: OpenApiSpec, targetSpec: OpenApiSpec): string[] {
    const sourcePaths = Object.keys(sourceSpec.paths);
    const targetPaths = Object.keys(targetSpec.paths);
    const unmapped: string[] = [];

    for (const sourcePath of sourcePaths) {
      const hasMatch = targetPaths.some(targetPath => 
        this.calculatePathSimilarity(sourcePath, targetPath) > 0.3
      );
      
      if (!hasMatch) {
        unmapped.push(sourcePath);
      }
    }

    return unmapped;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(endpointMappings: EndpointMapping[], fieldMappings: FieldMapping[]): number {
    if (endpointMappings.length === 0) {
      return 0;
    }

    const endpointConfidence = endpointMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) / endpointMappings.length;
    const fieldConfidence = fieldMappings.length > 0 
      ? fieldMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) / fieldMappings.length
      : 0;

    return (endpointConfidence * 0.7) + (fieldConfidence * 0.3);
  }

  /**
   * Get endpoint mapping for a specific Converge endpoint
   */
  public getEndpointMapping(convergeEndpoint: string): EndpointMapping | null {
    return this.endpointMappings.find(mapping => mapping.convergeEndpoint === convergeEndpoint) || null;
  }

  /**
   * Get field mapping for a specific field
   */
  public getFieldMapping(convergeField: string): FieldMapping | null {
    return this.fieldMappings.find(mapping => mapping.convergeField === convergeField) || null;
  }

  /**
   * Get all endpoint mappings
   */
  public getEndpointMappings(): EndpointMapping[] {
    return [...this.endpointMappings];
  }

  /**
   * Get all field mappings
   */
  public getFieldMappings(): FieldMapping[] {
    return [...this.fieldMappings];
  }

  /**
   * Clear loaded specifications
   */
  public clearSpecs(): void {
    this.convergeSpec = null;
    this.elavonSpec = null;
    this.endpointMappings = [];
    this.fieldMappings = [];
  }
}
