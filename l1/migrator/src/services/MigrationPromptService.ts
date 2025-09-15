import * as vscode from "vscode";
import {
  MappingDictionaryService,
  FieldMapping,
  EndpointMapping,
} from "./MappingDictionaryService";

/**
 * Interface for migration prompt request
 */
export interface MigrationPromptRequest {
  originalCode: string;
  language: string;
  filePath: string;
  lineNumber: number;
  endpointType?: string;
  context?: {
    surroundingCode?: string;
    projectType?: string;
    frameworkInfo?: string;
    dependencies?: string[];
  };
}

/**
 * Interface for generated migration prompt
 */
export interface MigrationPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: {
    mappings: FieldMapping[];
    endpoints: EndpointMapping[];
    codeQualityRules: string[];
    bestPractices: string[];
  };
  metadata: {
    language: string;
    endpointType?: string;
    complexity: "low" | "medium" | "high";
    estimatedTokens: number;
  };
}

/**
 * Interface for prompt template
 */
interface PromptTemplate {
  systemTemplate: string;
  userTemplate: string;
  codeQualityRules: string[];
  bestPractices: string[];
}

/**
 * Service for generating migration-specific prompts for Copilot
 */
export class MigrationPromptService {
  private _mappingService: MappingDictionaryService;
  private _promptTemplates: Map<string, PromptTemplate> = new Map();

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._mappingService = new MappingDictionaryService(_context);
    this._initializePromptTemplates();
  }

  /**
   * Generate migration prompt for Copilot
   */
  public async generateMigrationPrompt(
    request: MigrationPromptRequest
  ): Promise<MigrationPrompt> {
    try {
      // Load mapping dictionary
      const mappingDictionary =
        await this._mappingService.loadMappingDictionary();

      // Get relevant mappings
      const relevantMappings = await this._getRelevantMappings(
        request.originalCode,
        request.endpointType
      );

      // Get endpoint mappings
      const endpointMappings = request.endpointType
        ? await this._getEndpointMappings(request.endpointType)
        : [];

      // Select appropriate template
      const template = this._selectPromptTemplate(request);

      // Build system prompt
      const systemPrompt = this._buildSystemPrompt(
        template,
        request,
        relevantMappings,
        endpointMappings
      );

      // Build user prompt
      const userPrompt = this._buildUserPrompt(
        template,
        request,
        relevantMappings
      );

      // Calculate complexity and token estimate
      const complexity = this._calculateComplexity(request);
      const estimatedTokens = this._estimateTokenCount(
        systemPrompt + userPrompt
      );

      return {
        systemPrompt,
        userPrompt,
        context: {
          mappings: relevantMappings,
          endpoints: endpointMappings,
          codeQualityRules: template.codeQualityRules,
          bestPractices: template.bestPractices,
        },
        metadata: {
          language: request.language,
          ...(request.endpointType && { endpointType: request.endpointType }),
          complexity,
          estimatedTokens,
        },
      };
    } catch (error) {
      console.error("Failed to generate migration prompt:", error);
      throw new Error(
        `Failed to generate migration prompt: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Initialize prompt templates for different scenarios
   */
  private _initializePromptTemplates(): void {
    // JavaScript/TypeScript template
    this._promptTemplates.set("javascript", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate JavaScript/TypeScript code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`{language}
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Use proper TypeScript/JavaScript syntax and conventions",
        "Include proper error handling with try-catch blocks",
        "Use async/await for asynchronous operations",
        "Add JSDoc comments for functions and complex logic",
        "Follow ES6+ best practices",
        "Ensure proper type safety (for TypeScript)",
      ],
      bestPractices: [
        "Validate input parameters before API calls",
        "Use environment variables for API credentials",
        "Implement proper logging for debugging",
        "Add timeout handling for API requests",
        "Use proper HTTP status code checking",
        "Implement retry logic for transient failures",
      ],
    });

    // PHP template
    this._promptTemplates.set("php", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate PHP code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`php
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Use proper PHP syntax and PSR standards",
        "Include proper error handling with try-catch blocks",
        "Use cURL or Guzzle for HTTP requests",
        "Add PHPDoc comments for functions",
        "Follow PSR-4 autoloading standards",
        "Use proper variable naming conventions",
      ],
      bestPractices: [
        "Validate and sanitize input data",
        "Use secure credential storage",
        "Implement proper logging mechanisms",
        "Add request timeout handling",
        "Use HTTPS for all API communications",
        "Implement proper session management",
      ],
    });

    // Python template
    this._promptTemplates.set("python", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate Python code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`python
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Follow PEP 8 style guidelines",
        "Use proper exception handling",
        "Use requests library for HTTP calls",
        "Add docstrings for functions and classes",
        "Use type hints where appropriate",
        "Follow Python naming conventions",
      ],
      bestPractices: [
        "Use environment variables for configuration",
        "Implement proper logging with the logging module",
        "Add request timeouts and retry logic",
        "Use context managers for resource handling",
        "Validate input data with proper schemas",
        "Use virtual environments for dependencies",
      ],
    });

    // Java template
    this._promptTemplates.set("java", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate Java code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`java
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Follow Java coding conventions",
        "Use proper exception handling",
        "Use HttpClient or OkHttp for HTTP requests",
        "Add Javadoc comments for public methods",
        "Use proper access modifiers",
        "Follow SOLID principles",
      ],
      bestPractices: [
        "Use dependency injection for configuration",
        "Implement proper logging with SLF4J",
        "Add connection pooling for HTTP clients",
        "Use builder patterns for complex objects",
        "Implement proper validation",
        "Use try-with-resources for resource management",
      ],
    });

    // C# template
    this._promptTemplates.set("csharp", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate C# code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`csharp
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Follow C# coding conventions",
        "Use proper exception handling",
        "Use HttpClient for HTTP requests",
        "Add XML documentation comments",
        "Use async/await patterns properly",
        "Follow .NET naming conventions",
      ],
      bestPractices: [
        "Use dependency injection container",
        "Implement proper logging with ILogger",
        "Use configuration providers",
        "Implement proper disposal patterns",
        "Use data annotations for validation",
        "Follow SOLID principles",
      ],
    });

    // Generic template for other languages
    this._promptTemplates.set("generic", {
      systemTemplate: `You are an expert payment gateway migration assistant. Your task is to migrate code from Converge Payment Gateway to Elavon Payment Gateway.

MIGRATION RULES:
{mappingRules}

ENDPOINT MAPPINGS:
{endpointMappings}

CODE QUALITY REQUIREMENTS:
{codeQualityRules}

BEST PRACTICES:
{bestPractices}

Always maintain the original functionality while updating field names, endpoints, and API calls according to the mapping rules.`,
      userTemplate: `Migrate this Converge payment code to Elavon:

FILE: {filePath}
LINE: {lineNumber}
LANGUAGE: {language}
{contextInfo}

ORIGINAL CODE:
\`\`\`{language}
{originalCode}
\`\`\`

{surroundingContext}

Please provide the migrated Elavon code with:
1. Updated field names according to the mapping rules
2. Correct Elavon API endpoints
3. Proper error handling
4. Comments explaining significant changes
5. Maintained original functionality`,
      codeQualityRules: [
        "Follow language-specific coding conventions",
        "Include proper error handling",
        "Use appropriate HTTP libraries",
        "Add comments for complex logic",
        "Use proper variable naming",
        "Follow security best practices",
      ],
      bestPractices: [
        "Validate input parameters",
        "Use secure credential management",
        "Implement proper logging",
        "Add timeout handling",
        "Use HTTPS for API calls",
        "Implement retry mechanisms",
      ],
    });
  }

  /**
   * Get relevant field mappings from the original code
   */
  private async _getRelevantMappings(
    originalCode: string,
    endpointType?: string
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];

    try {
      const mappingDictionary =
        await this._mappingService.loadMappingDictionary();

      // Check common fields
      for (const mapping of mappingDictionary.commonFields) {
        if (this._codeContainsField(originalCode, mapping.convergeField)) {
          mappings.push(mapping);
        }
      }

      // Check endpoint-specific fields
      if (endpointType) {
        const endpointMapping = mappingDictionary.endpoints.find(
          (e) =>
            e.convergeEndpoint
              .toLowerCase()
              .includes(endpointType.toLowerCase()) ||
            e.elavonEndpoint.toLowerCase().includes(endpointType.toLowerCase())
        );

        if (endpointMapping) {
          for (const fieldMapping of endpointMapping.fieldMappings) {
            if (
              this._codeContainsField(originalCode, fieldMapping.convergeField)
            ) {
              mappings.push(fieldMapping);
            }
          }
        }
      }

      return mappings;
    } catch (error) {
      console.error("Failed to get relevant mappings:", error);
      return [];
    }
  }

  /**
   * Get endpoint mappings for a specific endpoint type
   */
  private async _getEndpointMappings(
    endpointType: string
  ): Promise<EndpointMapping[]> {
    try {
      const mappingDictionary =
        await this._mappingService.loadMappingDictionary();

      return mappingDictionary.endpoints.filter(
        (endpoint) =>
          endpoint.convergeEndpoint
            .toLowerCase()
            .includes(endpointType.toLowerCase()) ||
          endpoint.elavonEndpoint
            .toLowerCase()
            .includes(endpointType.toLowerCase()) ||
          endpoint.description
            .toLowerCase()
            .includes(endpointType.toLowerCase())
      );
    } catch (error) {
      console.error("Failed to get endpoint mappings:", error);
      return [];
    }
  }

  /**
   * Check if code contains a specific field
   */
  private _codeContainsField(code: string, field: string): boolean {
    // Check for various patterns: field names, string literals, object properties
    const patterns = [
      new RegExp(`\\b${field}\\b`, "i"), // Word boundary
      new RegExp(`["']${field}["']`, "i"), // String literal
      new RegExp(`${field}\\s*[:=]`, "i"), // Assignment/property
      new RegExp(`\\[["']${field}["']\\]`, "i"), // Array/object access
    ];

    return patterns.some((pattern) => pattern.test(code));
  }

  /**
   * Select appropriate prompt template based on language
   */
  private _selectPromptTemplate(
    request: MigrationPromptRequest
  ): PromptTemplate {
    const language = request.language.toLowerCase();

    // Map language variations to template keys
    const languageMap: Record<string, string> = {
      javascript: "javascript",
      typescript: "javascript",
      js: "javascript",
      ts: "javascript",
      php: "php",
      python: "python",
      py: "python",
      java: "java",
      csharp: "csharp",
      cs: "csharp",
      "c#": "csharp",
    };

    const templateKey = languageMap[language] || "generic";
    return (
      this._promptTemplates.get(templateKey) ||
      this._promptTemplates.get("generic")!
    );
  }

  /**
   * Build system prompt with context
   */
  private _buildSystemPrompt(
    template: PromptTemplate,
    request: MigrationPromptRequest,
    mappings: FieldMapping[],
    endpoints: EndpointMapping[]
  ): string {
    let systemPrompt = template.systemTemplate;

    // Replace mapping rules
    const mappingRules = this._formatMappingRules(mappings);
    systemPrompt = systemPrompt.replace("{mappingRules}", mappingRules);

    // Replace endpoint mappings
    const endpointMappings = this._formatEndpointMappings(endpoints);
    systemPrompt = systemPrompt.replace("{endpointMappings}", endpointMappings);

    // Replace code quality rules
    const codeQualityRules = template.codeQualityRules
      .map((rule, index) => `${index + 1}. ${rule}`)
      .join("\n");
    systemPrompt = systemPrompt.replace("{codeQualityRules}", codeQualityRules);

    // Replace best practices
    const bestPractices = template.bestPractices
      .map((practice, index) => `${index + 1}. ${practice}`)
      .join("\n");
    systemPrompt = systemPrompt.replace("{bestPractices}", bestPractices);

    return systemPrompt;
  }

  /**
   * Build user prompt with code and context
   */
  private _buildUserPrompt(
    template: PromptTemplate,
    request: MigrationPromptRequest,
    mappings: FieldMapping[]
  ): string {
    let userPrompt = template.userTemplate;

    // Replace basic placeholders
    userPrompt = userPrompt.replace("{filePath}", request.filePath);
    userPrompt = userPrompt.replace(
      "{lineNumber}",
      request.lineNumber.toString()
    );
    userPrompt = userPrompt.replace(/\{language\}/g, request.language);
    userPrompt = userPrompt.replace("{originalCode}", request.originalCode);

    // Add context information
    const contextInfo = this._buildContextInfo(request);
    userPrompt = userPrompt.replace("{contextInfo}", contextInfo);

    // Add surrounding context if available
    const surroundingContext = request.context?.surroundingCode
      ? `\nSURROUNDING CONTEXT:\n\`\`\`${request.language}\n${request.context.surroundingCode}\n\`\`\``
      : "";
    userPrompt = userPrompt.replace("{surroundingContext}", surroundingContext);

    return userPrompt;
  }

  /**
   * Build context information string
   */
  private _buildContextInfo(request: MigrationPromptRequest): string {
    const contextParts: string[] = [];

    if (request.endpointType) {
      contextParts.push(`ENDPOINT TYPE: ${request.endpointType}`);
    }

    if (request.context?.projectType) {
      contextParts.push(`PROJECT TYPE: ${request.context.projectType}`);
    }

    if (request.context?.frameworkInfo) {
      contextParts.push(`FRAMEWORK: ${request.context.frameworkInfo}`);
    }

    if (
      request.context?.dependencies &&
      request.context.dependencies.length > 0
    ) {
      contextParts.push(
        `DEPENDENCIES: ${request.context.dependencies.join(", ")}`
      );
    }

    return contextParts.length > 0 ? contextParts.join("\n") + "\n" : "";
  }

  /**
   * Format mapping rules for prompt
   */
  private _formatMappingRules(mappings: FieldMapping[]): string {
    if (mappings.length === 0) {
      return "No specific field mappings found for this code.";
    }

    return mappings
      .map((mapping) => {
        let rule = `• ${mapping.convergeField} → ${mapping.elavonField}`;
        if (mapping.dataType) {
          rule += ` (${mapping.dataType})`;
        }
        if (mapping.required) {
          rule += " [REQUIRED]";
        }
        if (mapping.notes) {
          rule += ` - ${mapping.notes}`;
        }
        return rule;
      })
      .join("\n");
  }

  /**
   * Format endpoint mappings for prompt
   */
  private _formatEndpointMappings(endpoints: EndpointMapping[]): string {
    if (endpoints.length === 0) {
      return "No specific endpoint mappings found.";
    }

    return endpoints
      .map((endpoint) => {
        let mapping = `• ${endpoint.convergeEndpoint} → ${endpoint.elavonEndpoint}`;
        mapping += ` (${endpoint.method})`;
        if (endpoint.description) {
          mapping += ` - ${endpoint.description}`;
        }
        return mapping;
      })
      .join("\n");
  }

  /**
   * Calculate complexity of the migration
   */
  private _calculateComplexity(
    request: MigrationPromptRequest
  ): "low" | "medium" | "high" {
    const codeLength = request.originalCode.length;
    const lineCount = request.originalCode.split("\n").length;

    // Check for complex patterns
    const complexPatterns = [
      /async|await/gi,
      /promise|then|catch/gi,
      /try\s*{[\s\S]*catch/gi,
      /class\s+\w+/gi,
      /function\s*\w*\s*\(/gi,
      /\w+\s*=>\s*/gi,
    ];

    const complexityScore = complexPatterns.reduce((score, pattern) => {
      return score + (pattern.test(request.originalCode) ? 1 : 0);
    }, 0);

    if (codeLength < 200 && lineCount < 10 && complexityScore < 2) {
      return "low";
    } else if (codeLength < 1000 && lineCount < 50 && complexityScore < 5) {
      return "medium";
    } else {
      return "high";
    }
  }

  /**
   * Estimate token count for the prompt
   */
  private _estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate prompt request
   */
  public validatePromptRequest(request: MigrationPromptRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.originalCode || request.originalCode.trim().length === 0) {
      errors.push("Original code is required");
    }

    if (!request.language || request.language.trim().length === 0) {
      errors.push("Language is required");
    }

    if (!request.filePath || request.filePath.trim().length === 0) {
      errors.push("File path is required");
    }

    if (request.lineNumber < 1) {
      errors.push("Line number must be greater than 0");
    }

    if (request.originalCode && request.originalCode.length > 10000) {
      errors.push("Original code is too long (max 10,000 characters)");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): string[] {
    return ["javascript", "typescript", "php", "python", "java", "csharp"];
  }

  /**
   * Get prompt statistics
   */
  public async getPromptStatistics(request: MigrationPromptRequest): Promise<{
    estimatedTokens: number;
    complexity: "low" | "medium" | "high";
    mappingCount: number;
    endpointCount: number;
  }> {
    const prompt = await this.generateMigrationPrompt(request);

    return {
      estimatedTokens: prompt.metadata.estimatedTokens,
      complexity: prompt.metadata.complexity,
      mappingCount: prompt.context.mappings.length,
      endpointCount: prompt.context.endpoints.length,
    };
  }
}
