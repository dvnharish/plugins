import * as vscode from 'vscode';
import { CopilotResponse } from './CopilotService';
import { MappingDictionaryService, FieldMapping } from './MappingDictionaryService';

/**
 * Interface for processed migration response
 */
export interface ProcessedMigrationResponse {
  success: boolean;
  migratedCode: string;
  originalCode: string;
  language: string;
  validation: {
    syntaxValid: boolean;
    mappingsApplied: FieldMapping[];
    missingMappings: string[];
    codeQualityScore: number;
    securityIssues: string[];
    warnings: string[];
  };
  changes: {
    fieldChanges: Array<{
      from: string;
      to: string;
      line: number;
      type: 'field_mapping' | 'endpoint_change' | 'syntax_fix';
    }>;
    endpointChanges: Array<{
      from: string;
      to: string;
      line: number;
    }>;
    addedLines: string[];
    removedLines: string[];
  };
  metadata: {
    processingTime: number;
    confidence: number;
    complexity: 'low' | 'medium' | 'high';
    reviewRequired: boolean;
  };
  error?: string;
}

/**
 * Interface for syntax validation result
 */
interface SyntaxValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Interface for code quality analysis
 */
interface CodeQualityAnalysis {
  score: number; // 0-100
  issues: Array<{
    type: 'security' | 'performance' | 'maintainability' | 'style';
    severity: 'low' | 'medium' | 'high';
    message: string;
    line?: number;
    suggestion?: string;
  }>;
}

/**
 * Service for processing and validating Copilot migration responses
 */
export class MigrationResponseProcessor {
  private _mappingService: MappingDictionaryService;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._mappingService = new MappingDictionaryService(_context);
  }

  /**
   * Process Copilot response and validate migrated code
   */
  public async processMigrationResponse(
    copilotResponse: CopilotResponse,
    originalCode: string,
    language: string
  ): Promise<ProcessedMigrationResponse> {
    const startTime = Date.now();

    try {
      // Extract migrated code from Copilot response
      const migratedCode = this._extractMigratedCode(copilotResponse, language);
      
      if (!migratedCode) {
        return this._createErrorResponse(
          'No valid migrated code found in Copilot response',
          originalCode,
          language,
          startTime
        );
      }

      // Validate syntax
      const syntaxValidation = await this._validateSyntax(migratedCode, language);
      
      // Analyze applied mappings
      const mappingAnalysis = await this._analyzeMappings(originalCode, migratedCode);
      
      // Perform code quality analysis
      const qualityAnalysis = this._analyzeCodeQuality(migratedCode, language);
      
      // Detect changes
      const changes = this._detectChanges(originalCode, migratedCode, language);
      
      // Calculate confidence and complexity
      const confidence = this._calculateConfidence(
        syntaxValidation,
        mappingAnalysis,
        qualityAnalysis,
        copilotResponse.confidence || 0.5
      );
      
      const complexity = this._calculateComplexity(migratedCode);
      const reviewRequired = this._shouldRequireReview(syntaxValidation, qualityAnalysis, confidence);

      return {
        success: true,
        migratedCode,
        originalCode,
        language,
        validation: {
          syntaxValid: syntaxValidation.valid,
          mappingsApplied: mappingAnalysis.applied,
          missingMappings: mappingAnalysis.missing,
          codeQualityScore: qualityAnalysis.score,
          securityIssues: qualityAnalysis.issues
            .filter(issue => issue.type === 'security')
            .map(issue => issue.message),
          warnings: [
            ...syntaxValidation.errors
              .filter(error => error.severity === 'warning')
              .map(error => `Line ${error.line}: ${error.message}`),
            ...qualityAnalysis.issues
              .filter(issue => issue.severity === 'medium' || issue.severity === 'high')
              .map(issue => issue.message)
          ]
        },
        changes,
        metadata: {
          processingTime: Date.now() - startTime,
          confidence,
          complexity,
          reviewRequired
        }
      };
    } catch (error) {
      console.error('Failed to process migration response:', error);
      return this._createErrorResponse(
        error instanceof Error ? error.message : 'Unknown processing error',
        originalCode,
        language,
        startTime
      );
    }
  }

  /**
   * Extract migrated code from Copilot response
   */
  private _extractMigratedCode(response: CopilotResponse, language: string): string | null {
    if (!response.success || !response.code) {
      return null;
    }

    let code = response.code.trim();

    // Remove markdown code blocks if present
    const codeBlockRegex = new RegExp(`\`\`\`(?:${language})?\\s*([\\s\\S]*?)\`\`\``, 'gi');
    const match = codeBlockRegex.exec(code);
    
    if (match) {
      code = match[1].trim();
    }

    // Remove common prefixes/suffixes that Copilot might add
    const prefixesToRemove = [
      'Here is the migrated code:',
      'Here\'s the migrated code:',
      'Migrated code:',
      'Updated code:',
      'The migrated code is:',
      'Here is the updated code:'
    ];

    for (const prefix of prefixesToRemove) {
      if (code.toLowerCase().startsWith(prefix.toLowerCase())) {
        code = code.substring(prefix.length).trim();
      }
    }

    // Remove trailing explanations
    const explanationMarkers = [
      'Explanation:',
      'Changes made:',
      'Key changes:',
      'Notes:'
    ];

    for (const marker of explanationMarkers) {
      const index = code.toLowerCase().indexOf(marker.toLowerCase());
      if (index > 0) {
        code = code.substring(0, index).trim();
      }
    }

    return code || null;
  }

  /**
   * Validate syntax of migrated code
   */
  private async _validateSyntax(code: string, language: string): Promise<SyntaxValidationResult> {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    try {
      // Basic syntax validation based on language
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          return this._validateJavaScriptSyntax(code);
        
        case 'php':
          return this._validatePHPSyntax(code);
        
        case 'python':
          return this._validatePythonSyntax(code);
        
        case 'java':
          return this._validateJavaSyntax(code);
        
        case 'csharp':
        case 'cs':
          return this._validateCSharpSyntax(code);
        
        default:
          return this._validateGenericSyntax(code);
      }
    } catch (error) {
      errors.push({
        line: 1,
        column: 1,
        message: `Syntax validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  private _validateJavaScriptSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    // Check for basic syntax issues
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for unmatched brackets
      const openBrackets = (line.match(/[{[(]/g) || []).length;
      const closeBrackets = (line.match(/[}\])]/g) || []).length;
      
      // Check for missing semicolons (basic check)
      if (line.length > 0 && 
          !line.endsWith(';') && 
          !line.endsWith('{') && 
          !line.endsWith('}') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !line.includes('//') &&
          /^(const|let|var)\s+\w+\s*=/.test(line)) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: 'Missing semicolon',
          severity: 'warning'
        });
      }
      
      // Check for undefined variables (basic patterns)
      if (/\bundefined\b/.test(line) && !/typeof.*undefined/.test(line)) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: 'Potential undefined variable usage',
          severity: 'warning'
        });
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate PHP syntax
   */
  private _validatePHPSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for missing semicolons (only for assignment statements)
      if (line.length > 0 && 
          !line.endsWith(';') && 
          !line.endsWith('{') && 
          !line.endsWith('}') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !line.startsWith('<?php') &&
          !line.startsWith('?>') &&
          /^\$\w+\s*=/.test(line)) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: 'Missing semicolon',
          severity: 'warning'
        });
      }
      
      // Check for variables without $ prefix (only for variable assignments not starting with $)
      const varMatches = line.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*=/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.replace(/\s*=.*/, '').trim();
          if (!varName.startsWith('$') && 
              !line.includes('->') && 
              !line.includes('::') &&
              !line.includes('function') &&
              !line.includes('class') &&
              !line.includes('const ')) {
            errors.push({
              line: lineNumber,
              column: 1,
              message: 'PHP variables should start with $',
              severity: 'error'
            });
          }
        });
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate Python syntax
   */
  private _validatePythonSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Check indentation (basic check for mixed tabs/spaces)
      if (line.includes('\t') && line.includes('    ')) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: 'Mixed tabs and spaces in indentation',
          severity: 'warning'
        });
      }
      
      // Check for common syntax issues
      if (line.trim().endsWith(':') && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        if (nextLine.trim() && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
          errors.push({
            line: lineNumber + 1,
            column: 1,
            message: 'Expected indented block',
            severity: 'error'
          });
        }
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate Java syntax
   */
  private _validateJavaSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for missing semicolons
      if (line.length > 0 && 
          !line.endsWith(';') && 
          !line.endsWith('{') && 
          !line.endsWith('}') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !/^(if|else|for|while|public|private|protected|class|interface|@)/.test(line)) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: 'Missing semicolon',
          severity: 'warning'
        });
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Validate C# syntax
   */
  private _validateCSharpSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for missing semicolons
      if (line.length > 0 && 
          !line.endsWith(';') && 
          !line.endsWith('{') && 
          !line.endsWith('}') &&
          !line.startsWith('//') &&
          !line.startsWith('/*') &&
          !/^(if|else|for|while|public|private|protected|class|interface|using|namespace)/.test(line)) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: 'Missing semicolon',
          severity: 'warning'
        });
      }
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Generic syntax validation
   */
  private _validateGenericSyntax(code: string): SyntaxValidationResult {
    const errors: Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }> = [];

    // Basic bracket matching
    let bracketStack: Array<{ char: string; line: number }> = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (['(', '[', '{'].includes(char)) {
          bracketStack.push({ char, line: lineNumber });
        } else if ([')', ']', '}'].includes(char)) {
          if (bracketStack.length === 0) {
            errors.push({
              line: lineNumber,
              column: j + 1,
              message: `Unmatched closing bracket '${char}'`,
              severity: 'error'
            });
          } else {
            const last = bracketStack.pop()!;
            const expected = { '(': ')', '[': ']', '{': '}' }[last.char];
            if (char !== expected) {
              errors.push({
                line: lineNumber,
                column: j + 1,
                message: `Expected '${expected}' but found '${char}'`,
                severity: 'error'
              });
            }
          }
        }
      }
    }
    
    // Check for unmatched opening brackets
    bracketStack.forEach(bracket => {
      errors.push({
        line: bracket.line,
        column: 1,
        message: `Unmatched opening bracket '${bracket.char}'`,
        severity: 'error'
      });
    });

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors
    };
  }

  /**
   * Analyze applied and missing mappings
   */
  private async _analyzeMappings(originalCode: string, migratedCode: string): Promise<{
    applied: FieldMapping[];
    missing: string[];
  }> {
    try {
      const mappingDictionary = await this._mappingService.loadMappingDictionary();
      const applied: FieldMapping[] = [];
      const missing: string[] = [];

      // Check each mapping to see if it was applied
      for (const mapping of mappingDictionary.commonFields) {
        const hasConvergeField = this._codeContainsField(originalCode, mapping.convergeField);
        const hasElavonField = this._codeContainsField(migratedCode, mapping.elavonField);
        const stillHasConvergeField = this._codeContainsField(migratedCode, mapping.convergeField);

        if (hasConvergeField) {
          if (hasElavonField && !stillHasConvergeField) {
            applied.push(mapping);
          } else {
            missing.push(mapping.convergeField);
          }
        }
      }

      return { applied, missing };
    } catch (error) {
      console.error('Failed to analyze mappings:', error);
      return { applied: [], missing: [] };
    }
  }

  /**
   * Check if code contains a specific field
   */
  private _codeContainsField(code: string, field: string): boolean {
    const patterns = [
      new RegExp(`\\b${field}\\b`, 'i'),
      new RegExp(`["']${field}["']`, 'i'),
      new RegExp(`${field}\\s*[:=]`, 'i'),
      new RegExp(`\\[["']${field}["']\\]`, 'i')
    ];
    
    return patterns.some(pattern => pattern.test(code));
  }

  /**
   * Analyze code quality
   */
  private _analyzeCodeQuality(code: string, language: string): CodeQualityAnalysis {
    const issues: Array<{
      type: 'security' | 'performance' | 'maintainability' | 'style';
      severity: 'low' | 'medium' | 'high';
      message: string;
      line?: number;
      suggestion?: string;
    }> = [];

    const lines = code.split('\n');
    
    // Security checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const lineNumber = i + 1;
      
      // Check for hardcoded credentials
      if (/password|secret|key|token/.test(line) && /["']\w+["']/.test(line)) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'Potential hardcoded credential detected',
          line: lineNumber,
          suggestion: 'Use environment variables or secure credential storage'
        });
      }
      
      // Check for SQL injection risks
      if (/select|insert|update|delete/.test(line) && /\+|\$/.test(line)) {
        issues.push({
          type: 'security',
          severity: 'high',
          message: 'Potential SQL injection vulnerability',
          line: lineNumber,
          suggestion: 'Use parameterized queries'
        });
      }
    }

    // Performance checks
    if (code.includes('console.log') || code.includes('print(') || code.includes('echo ')) {
      issues.push({
        type: 'performance',
        severity: 'low',
        message: 'Debug statements found in code',
        suggestion: 'Remove debug statements before production'
      });
    }

    // Maintainability checks
    const functionCount = (code.match(/function\s+\w+|def\s+\w+|public\s+\w+\s*\(/g) || []).length;
    if (functionCount > 10) {
      issues.push({
        type: 'maintainability',
        severity: 'medium',
        message: 'High number of functions detected',
        suggestion: 'Consider breaking into smaller modules'
      });
    }

    // Calculate score based on issues
    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    return {
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Detect changes between original and migrated code
   */
  private _detectChanges(originalCode: string, migratedCode: string, language: string): {
    fieldChanges: Array<{
      from: string;
      to: string;
      line: number;
      type: 'field_mapping' | 'endpoint_change' | 'syntax_fix';
    }>;
    endpointChanges: Array<{
      from: string;
      to: string;
      line: number;
    }>;
    addedLines: string[];
    removedLines: string[];
  } {
    const originalLines = originalCode.split('\n');
    const migratedLines = migratedCode.split('\n');
    
    const fieldChanges: Array<{
      from: string;
      to: string;
      line: number;
      type: 'field_mapping' | 'endpoint_change' | 'syntax_fix';
    }> = [];
    
    const endpointChanges: Array<{
      from: string;
      to: string;
      line: number;
    }> = [];
    
    const addedLines: string[] = [];
    const removedLines: string[] = [];

    // Simple diff algorithm
    const maxLines = Math.max(originalLines.length, migratedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const migratedLine = migratedLines[i] || '';
      
      if (originalLine !== migratedLine) {
        if (!originalLine) {
          addedLines.push(migratedLine);
        } else if (!migratedLine) {
          removedLines.push(originalLine);
        } else {
          // Detect field changes
          const fieldChangeMatch = this._detectFieldChange(originalLine, migratedLine);
          if (fieldChangeMatch) {
            fieldChanges.push({
              ...fieldChangeMatch,
              line: i + 1
            });
          }
          
          // Detect endpoint changes
          const endpointChangeMatch = this._detectEndpointChange(originalLine, migratedLine);
          if (endpointChangeMatch) {
            endpointChanges.push({
              ...endpointChangeMatch,
              line: i + 1
            });
          }
        }
      }
    }

    return {
      fieldChanges,
      endpointChanges,
      addedLines,
      removedLines
    };
  }

  /**
   * Detect field changes in a line
   */
  private _detectFieldChange(originalLine: string, migratedLine: string): {
    from: string;
    to: string;
    type: 'field_mapping' | 'endpoint_change' | 'syntax_fix';
  } | null {
    // Look for ssl_ field replacements
    const sslFieldRegex = /ssl_\w+/g;
    const originalFields = originalLine.match(sslFieldRegex) || [];
    
    if (originalFields.length > 0) {
      // Check if any ssl_ fields were replaced
      for (const field of originalFields) {
        if (!migratedLine.includes(field)) {
          // Field was replaced, try to find what it was replaced with
          const fieldPattern = new RegExp(field.replace('ssl_', ''), 'i');
          const match = migratedLine.match(fieldPattern);
          if (match) {
            return {
              from: field,
              to: match[0],
              type: 'field_mapping'
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect endpoint changes in a line
   */
  private _detectEndpointChange(originalLine: string, migratedLine: string): {
    from: string;
    to: string;
  } | null {
    // Look for URL changes
    const urlRegex = /https?:\/\/[^\s"']+/g;
    const originalUrls = originalLine.match(urlRegex) || [];
    const migratedUrls = migratedLine.match(urlRegex) || [];
    
    if (originalUrls.length > 0 && migratedUrls.length > 0 && originalUrls[0] !== migratedUrls[0]) {
      return {
        from: originalUrls[0]!,
        to: migratedUrls[0]!
      };
    }

    return null;
  }

  /**
   * Calculate confidence score
   */
  private _calculateConfidence(
    syntaxValidation: SyntaxValidationResult,
    mappingAnalysis: { applied: FieldMapping[]; missing: string[] },
    qualityAnalysis: CodeQualityAnalysis,
    copilotConfidence: number
  ): number {
    let confidence = copilotConfidence;
    
    // Adjust based on syntax validation
    if (!syntaxValidation.valid) {
      confidence *= 0.5;
    }
    
    // Adjust based on mapping application
    const totalMappings = mappingAnalysis.applied.length + mappingAnalysis.missing.length;
    if (totalMappings > 0) {
      const mappingRatio = mappingAnalysis.applied.length / totalMappings;
      confidence *= (0.5 + mappingRatio * 0.5);
    }
    
    // Adjust based on code quality
    confidence *= (qualityAnalysis.score / 100);
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate complexity of migrated code
   */
  private _calculateComplexity(code: string): 'low' | 'medium' | 'high' {
    const lines = code.split('\n').length;
    const functions = (code.match(/function|def|public|private/g) || []).length;
    const conditionals = (code.match(/if|else|switch|case|try|catch/g) || []).length;
    const loops = (code.match(/for|while|foreach/g) || []).length;
    
    const complexityScore = lines * 0.5 + functions * 3 + conditionals * 2 + loops * 2;
    
    if (complexityScore < 15) return 'low';
    if (complexityScore < 40) return 'medium';
    return 'high';
  }

  /**
   * Determine if manual review is required
   */
  private _shouldRequireReview(
    syntaxValidation: SyntaxValidationResult,
    qualityAnalysis: CodeQualityAnalysis,
    confidence: number
  ): boolean {
    // Require review if syntax is invalid
    if (!syntaxValidation.valid) return true;
    
    // Require review if there are high-severity security issues
    if (qualityAnalysis.issues.some(issue => issue.type === 'security' && issue.severity === 'high')) {
      return true;
    }
    
    // Require review if confidence is low
    if (confidence < 0.7) return true;
    
    // Require review if code quality score is low
    if (qualityAnalysis.score < 60) return true;
    
    return false;
  }

  /**
   * Create error response
   */
  private _createErrorResponse(
    error: string,
    originalCode: string,
    language: string,
    startTime: number
  ): ProcessedMigrationResponse {
    return {
      success: false,
      migratedCode: '',
      originalCode,
      language,
      validation: {
        syntaxValid: false,
        mappingsApplied: [],
        missingMappings: [],
        codeQualityScore: 0,
        securityIssues: [],
        warnings: []
      },
      changes: {
        fieldChanges: [],
        endpointChanges: [],
        addedLines: [],
        removedLines: []
      },
      metadata: {
        processingTime: Date.now() - startTime,
        confidence: 0,
        complexity: 'low',
        reviewRequired: true
      },
      error
    };
  }

  /**
   * Validate processed response
   */
  public validateProcessedResponse(response: ProcessedMigrationResponse): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (!response.success && !response.error) {
      issues.push('Failed response must include error message');
    }
    
    if (response.success && !response.migratedCode) {
      issues.push('Successful response must include migrated code');
    }
    
    if (response.metadata.confidence < 0 || response.metadata.confidence > 1) {
      issues.push('Confidence must be between 0 and 1');
    }
    
    if (response.validation.codeQualityScore < 0 || response.validation.codeQualityScore > 100) {
      issues.push('Code quality score must be between 0 and 100');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}