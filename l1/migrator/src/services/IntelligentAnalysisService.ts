import * as vscode from 'vscode';
import { PatternMatchingService } from './PatternMatchingService';
import { MappingService } from './MappingService';
import { LoggingService, LogLevel } from './LoggingService';

export interface CodeContext {
    filePath: string;
    language: string;
    functionName?: string;
    className?: string;
    imports: string[];
    dependencies: string[];
    businessLogic: string[];
    sslFields: string[];
    confidence: number;
}

export interface MigrationSuggestion {
    id: string;
    type: 'endpoint' | 'field' | 'pattern' | 'optimization';
    title: string;
    description: string;
    confidence: number;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    codeSnippet: string;
    suggestedReplacement: string;
    reasoning: string[];
    dependencies: string[];
}

export interface SemanticAnalysis {
    businessContext: string;
    dataFlow: string[];
    errorHandling: string[];
    securityPatterns: string[];
    performanceConsiderations: string[];
    integrationPoints: string[];
}

export class IntelligentAnalysisService {
    private readonly patternMatchingService: PatternMatchingService;
    private readonly mappingService: MappingService;
    private readonly loggingService: LoggingService;
    private readonly context: vscode.ExtensionContext;

    constructor(
        context: vscode.ExtensionContext,
        patternMatchingService: PatternMatchingService,
        mappingService: MappingService,
        loggingService: LoggingService
    ) {
        this.context = context;
        this.patternMatchingService = patternMatchingService;
        this.mappingService = mappingService;
        this.loggingService = loggingService;
    }

    /**
     * Performs intelligent analysis of Converge code to understand business context
     */
    async analyzeCodeContext(filePath: string, code: string): Promise<CodeContext> {
        this.loggingService.log(LogLevel.DEBUG, `Analyzing code context for ${filePath}`);

        const language = this.getLanguageFromFilePath(filePath);
        const sslFields = this.extractSslFields(code, language);
        const imports = this.extractImports(code, language);
        const dependencies = this.extractDependencies(code, language);
        const businessLogic = this.extractBusinessLogic(code, language);
        const functionName = this.extractFunctionName(code, language);
        const className = this.extractClassName(code, language);
        
        const confidence = this.calculateConfidence(sslFields, businessLogic, imports);

        return {
            filePath,
            language,
            functionName: functionName || '',
            className: className || '',
            imports,
            dependencies,
            businessLogic,
            sslFields,
            confidence
        };
    }

    /**
     * Generates intelligent migration suggestions based on code analysis
     */
    async generateMigrationSuggestions(context: CodeContext): Promise<MigrationSuggestion[]> {
        this.loggingService.log(LogLevel.DEBUG, `Generating migration suggestions for ${context.filePath}`);

        const suggestions: MigrationSuggestion[] = [];

        // Analyze endpoint patterns
        const endpointSuggestions = await this.analyzeEndpointPatterns(context);
        suggestions.push(...endpointSuggestions);

        // Analyze field mappings
        const fieldSuggestions = await this.analyzeFieldMappings(context);
        suggestions.push(...fieldSuggestions);

        // Analyze code patterns
        const patternSuggestions = await this.analyzeCodePatterns(context);
        suggestions.push(...patternSuggestions);

        // Analyze optimizations
        const optimizationSuggestions = await this.analyzeOptimizations(context);
        suggestions.push(...optimizationSuggestions);

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Performs semantic analysis to understand business logic context
     */
    async performSemanticAnalysis(context: CodeContext): Promise<SemanticAnalysis> {
        this.loggingService.log(LogLevel.DEBUG, `Performing semantic analysis for ${context.filePath}`);

        const businessContext = this.analyzeBusinessContext(context);
        const dataFlow = this.analyzeDataFlow(context);
        const errorHandling = this.analyzeErrorHandling(context);
        const securityPatterns = this.analyzeSecurityPatterns(context);
        const performanceConsiderations = this.analyzePerformanceConsiderations(context);
        const integrationPoints = this.analyzeIntegrationPoints(context);

        return {
            businessContext,
            dataFlow,
            errorHandling,
            securityPatterns,
            performanceConsiderations,
            integrationPoints
        };
    }

    /**
     * Detects custom Converge implementations and variations
     */
    async detectCustomImplementations(context: CodeContext): Promise<MigrationSuggestion[]> {
        this.loggingService.log(LogLevel.DEBUG, `Detecting custom implementations for ${context.filePath}`);

        const suggestions: MigrationSuggestion[] = [];

        // Check for custom SSL field patterns
        const customSslFields = this.findCustomSslFields(context);
        if (customSslFields.length > 0) {
            suggestions.push({
                id: 'custom-ssl-fields',
                type: 'field',
                title: 'Custom SSL Field Patterns Detected',
                description: `Found ${customSslFields.length} custom SSL field patterns that may need special handling`,
                confidence: 0.8,
                impact: 'medium',
                effort: 'medium',
                codeSnippet: customSslFields.join(', '),
                suggestedReplacement: 'Map to equivalent Elavon fields',
                reasoning: ['Custom patterns require manual mapping', 'May need custom transformation logic'],
                dependencies: []
            });
        }

        // Check for custom endpoint implementations
        const customEndpoints = this.findCustomEndpoints(context);
        if (customEndpoints.length > 0) {
            suggestions.push({
                id: 'custom-endpoints',
                type: 'endpoint',
                title: 'Custom Endpoint Implementations',
                description: `Found ${customEndpoints.length} custom endpoint implementations`,
                confidence: 0.9,
                impact: 'high',
                effort: 'high',
                codeSnippet: customEndpoints.join(', '),
                suggestedReplacement: 'Implement equivalent Elavon endpoints',
                reasoning: ['Custom endpoints require complete rewrite', 'May need new API design'],
                dependencies: []
            });
        }

        return suggestions;
    }

    private getLanguageFromFilePath(filePath: string): string {
        const extension = filePath.split('.').pop()?.toLowerCase();
        const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'php': 'php',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'rb': 'ruby',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html'
        };
        return languageMap[extension || ''] || 'unknown';
    }

    private extractSslFields(code: string, language: string): string[] {
        const sslPatterns = [
            /ssl_[a-zA-Z_]+/g,
            /\$ssl_[a-zA-Z_]+/g,
            /:ssl_[a-zA-Z_]+/g,
            /"ssl_[a-zA-Z_]+"/g,
            /'ssl_[a-zA-Z_]+'/g
        ];

        const fields: string[] = [];
        sslPatterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) {
                fields.push(...matches);
            }
        });

        return [...new Set(fields)];
    }

    private extractImports(code: string, language: string): string[] {
        const importPatterns: { [key: string]: RegExp[] } = {
            'javascript': [/import\s+.*\s+from\s+['"]([^'"]+)['"]/g, /require\(['"]([^'"]+)['"]\)/g],
            'typescript': [/import\s+.*\s+from\s+['"]([^'"]+)['"]/g, /import\s+['"]([^'"]+)['"]/g],
            'php': [/use\s+([^;]+);/g, /require\s+['"]([^'"]+)['"]/g, /include\s+['"]([^'"]+)['"]/g],
            'python': [/import\s+([^\s]+)/g, /from\s+([^\s]+)\s+import/g],
            'java': [/import\s+([^;]+);/g],
            'csharp': [/using\s+([^;]+);/g],
            'ruby': [/require\s+['"]([^'"]+)['"]/g, /require_relative\s+['"]([^'"]+)['"]/g]
        };

        const patterns = importPatterns[language] || [];
        const imports: string[] = [];

        patterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const importMatch = match.match(pattern);
                    if (importMatch && importMatch[1]) {
                        imports.push(importMatch[1]);
                    }
                });
            }
        });

        return [...new Set(imports)];
    }

    private extractDependencies(code: string, language: string): string[] {
        // Look for HTTP libraries and payment-related dependencies
        const dependencyKeywords = [
            'axios', 'fetch', 'request', 'http', 'https', 'curl', 'urllib',
            'jquery', 'restclient', 'faraday', 'httparty', 'net::http',
            'webrequest', 'httpclient', 'restsharp', 'webclient'
        ];

        const dependencies: string[] = [];
        dependencyKeywords.forEach(keyword => {
            if (code.toLowerCase().includes(keyword.toLowerCase())) {
                dependencies.push(keyword);
            }
        });

        return dependencies;
    }

    private extractBusinessLogic(code: string, language: string): string[] {
        // Look for business logic patterns
        const businessPatterns = [
            /transaction/i,
            /payment/i,
            /order/i,
            /customer/i,
            /invoice/i,
            /refund/i,
            /void/i,
            /capture/i,
            /authorize/i,
            /settle/i
        ];

        const logic: string[] = [];
        businessPatterns.forEach(pattern => {
            const matches = code.match(pattern);
            if (matches) {
                logic.push(matches[0]);
            }
        });

        return [...new Set(logic)];
    }

    private extractFunctionName(code: string, language: string): string | undefined {
        const functionPatterns: { [key: string]: RegExp } = {
            'javascript': /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'typescript': /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'php': /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'python': /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'java': /(?:public|private|protected)?\s*(?:static\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
            'csharp': /(?:public|private|protected)?\s*(?:static\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/,
            'ruby': /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'cpp': /[a-zA-Z_][a-zA-Z0-9_]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
        };

        const pattern = functionPatterns[language];
        if (pattern) {
            const match = code.match(pattern);
            return match ? match[1] : undefined;
        }

        return undefined;
    }

    private extractClassName(code: string, language: string): string | undefined {
        const classPatterns: { [key: string]: RegExp } = {
            'javascript': /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'typescript': /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'php': /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'python': /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'java': /(?:public\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'csharp': /(?:public\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'ruby': /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'cpp': /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
            'html': /<([a-zA-Z_][a-zA-Z0-9_]*)/g
        };

        const pattern = classPatterns[language];
        if (pattern) {
            const match = code.match(pattern);
            return match ? match[1] : undefined;
        }

        return undefined;
    }

    private calculateConfidence(sslFields: string[], businessLogic: string[], imports: string[]): number {
        let confidence = 0;

        // SSL fields presence
        if (sslFields.length > 0) confidence += 0.4;
        if (sslFields.length > 5) confidence += 0.2;

        // Business logic indicators
        if (businessLogic.length > 0) confidence += 0.2;
        if (businessLogic.length > 3) confidence += 0.1;

        // HTTP/payment library imports
        const paymentLibraries = ['axios', 'fetch', 'request', 'curl', 'http'];
        const hasPaymentLib = imports.some(imp => 
            paymentLibraries.some(lib => imp.toLowerCase().includes(lib))
        );
        if (hasPaymentLib) confidence += 0.2;

        return Math.min(confidence, 1.0);
    }

    private async analyzeEndpointPatterns(context: CodeContext): Promise<MigrationSuggestion[]> {
        const suggestions: MigrationSuggestion[] = [];
        const endpoints = this.patternMatchingService.detectEndpoints(context.filePath, context.filePath);

        endpoints.forEach((endpoint: any) => {
            if (endpoint.confidence > 0.7) {
                suggestions.push({
                    id: `endpoint-${endpoint.lineNumber}`,
                    type: 'endpoint',
                    title: `Migrate ${endpoint.endpoint} to Elavon`,
                    description: `Convert ${endpoint.endpoint} to equivalent Elavon endpoint`,
                    confidence: endpoint.confidence,
                    impact: 'high',
                    effort: 'medium',
                    codeSnippet: endpoint.codeSnippet,
                    suggestedReplacement: 'Elavon equivalent endpoint',
                    reasoning: ['High confidence Converge endpoint detected', 'Direct mapping available'],
                    dependencies: []
                });
            }
        });

        return suggestions;
    }

    private async analyzeFieldMappings(context: CodeContext): Promise<MigrationSuggestion[]> {
        const suggestions: MigrationSuggestion[] = [];
        const mappings = await this.mappingService.getAllMappings();

        context.sslFields.forEach(field => {
            const mapping = mappings.find((m: any) => 
                m.fieldMappings[field] || 
                Object.keys(m.fieldMappings).some(key => key.includes(field.replace('ssl_', '')))
            );

            if (mapping) {
                suggestions.push({
                    id: `field-${field}`,
                    type: 'field',
                    title: `Map ${field} to Elavon field`,
                    description: `Convert ${field} to ${mapping.fieldMappings[field] || 'equivalent Elavon field'}`,
                    confidence: 0.9,
                    impact: 'medium',
                    effort: 'low',
                    codeSnippet: field,
                    suggestedReplacement: mapping.fieldMappings[field] || 'equivalent Elavon field',
                    reasoning: ['Direct mapping available in dictionary', 'Standard field conversion'],
                    dependencies: []
                });
            } else {
                suggestions.push({
                    id: `field-${field}-custom`,
                    type: 'field',
                    title: `Custom field ${field} needs mapping`,
                    description: `No direct mapping found for ${field}, requires manual mapping`,
                    confidence: 0.6,
                    impact: 'medium',
                    effort: 'high',
                    codeSnippet: field,
                    suggestedReplacement: 'Custom Elavon field mapping required',
                    reasoning: ['No direct mapping available', 'May require custom transformation'],
                    dependencies: []
                });
            }
        });

        return suggestions;
    }

    private async analyzeCodePatterns(context: CodeContext): Promise<MigrationSuggestion[]> {
        const suggestions: MigrationSuggestion[] = [];

        // Check for error handling patterns
        if (!context.businessLogic.some(logic => 
            ['try', 'catch', 'error', 'exception'].some(keyword => 
                logic.toLowerCase().includes(keyword)
            )
        )) {
            suggestions.push({
                id: 'error-handling',
                type: 'pattern',
                title: 'Add error handling for Elavon API calls',
                description: 'Elavon API calls should include proper error handling',
                confidence: 0.8,
                impact: 'high',
                effort: 'medium',
                codeSnippet: 'API call without error handling',
                suggestedReplacement: 'Add try-catch blocks and error handling',
                reasoning: ['Error handling is critical for payment APIs', 'Elavon APIs may return different error formats'],
                dependencies: []
            });
        }

        // Check for async/await patterns
        if (context.language === 'javascript' || context.language === 'typescript') {
            if (!context.businessLogic.some(logic => 
                ['async', 'await', 'promise'].some(keyword => 
                    logic.toLowerCase().includes(keyword)
                )
            )) {
                suggestions.push({
                    id: 'async-pattern',
                    type: 'pattern',
                    title: 'Use async/await for Elavon API calls',
                    description: 'Modern Elavon API calls should use async/await pattern',
                    confidence: 0.7,
                    impact: 'medium',
                    effort: 'low',
                    codeSnippet: 'Synchronous API call',
                    suggestedReplacement: 'Convert to async/await pattern',
                    reasoning: ['Better error handling', 'More readable code', 'Modern JavaScript best practice'],
                    dependencies: []
                });
            }
        }

        return suggestions;
    }

    private async analyzeOptimizations(context: CodeContext): Promise<MigrationSuggestion[]> {
        const suggestions: MigrationSuggestion[] = [];

        // Check for hardcoded values
        const hardcodedPatterns = [
            /['"](https?:\/\/[^'"]+)['"]/g,
            /['"](pk_[a-zA-Z0-9_]+)['"]/g,
            /['"](sk_[a-zA-Z0-9_]+)['"]/g
        ];

        hardcodedPatterns.forEach(pattern => {
            const matches = context.filePath.match(pattern);
            if (matches) {
                suggestions.push({
                    id: 'hardcoded-values',
                    type: 'optimization',
                    title: 'Replace hardcoded values with configuration',
                    description: 'Move hardcoded URLs and keys to configuration',
                    confidence: 0.9,
                    impact: 'medium',
                    effort: 'low',
                    codeSnippet: matches.join(', '),
                    suggestedReplacement: 'Use configuration variables',
                    reasoning: ['Better security', 'Easier maintenance', 'Environment-specific values'],
                    dependencies: []
                });
            }
        });

        return suggestions;
    }

    private analyzeBusinessContext(context: CodeContext): string {
        const businessKeywords = ['payment', 'transaction', 'order', 'customer', 'invoice'];
        const foundKeywords = businessKeywords.filter(keyword => 
            context.businessLogic.some(logic => logic.toLowerCase().includes(keyword))
        );

        if (foundKeywords.length > 0) {
            return `Payment processing system with ${foundKeywords.join(', ')} functionality`;
        }

        return 'General API integration';
    }

    private analyzeDataFlow(context: CodeContext): string[] {
        const dataFlow: string[] = [];
        
        if (context.sslFields.some(field => field.includes('amount'))) {
            dataFlow.push('Amount processing');
        }
        if (context.sslFields.some(field => field.includes('customer'))) {
            dataFlow.push('Customer data handling');
        }
        if (context.sslFields.some(field => field.includes('card'))) {
            dataFlow.push('Card data processing');
        }

        return dataFlow;
    }

    private analyzeErrorHandling(context: CodeContext): string[] {
        const errorPatterns = ['try', 'catch', 'error', 'exception', 'throw'];
        return errorPatterns.filter(pattern => 
            context.businessLogic.some(logic => logic.toLowerCase().includes(pattern))
        );
    }

    private analyzeSecurityPatterns(context: CodeContext): string[] {
        const securityPatterns: string[] = [];
        
        if (context.sslFields.some(field => field.includes('pin') || field.includes('key'))) {
            securityPatterns.push('Credential handling');
        }
        if (context.sslFields.some(field => field.includes('card'))) {
            securityPatterns.push('PCI compliance required');
        }
        if (context.sslFields.some(field => field.includes('token'))) {
            securityPatterns.push('Token-based authentication');
        }

        return securityPatterns;
    }

    private analyzePerformanceConsiderations(context: CodeContext): string[] {
        const performance: string[] = [];
        
        if (context.businessLogic.some(logic => logic.toLowerCase().includes('batch'))) {
            performance.push('Batch processing optimization');
        }
        if (context.businessLogic.some(logic => logic.toLowerCase().includes('async'))) {
            performance.push('Asynchronous processing');
        }

        return performance;
    }

    private analyzeIntegrationPoints(context: CodeContext): string[] {
        const integrations: string[] = [];
        
        if (context.dependencies.some(dep => dep.includes('http'))) {
            integrations.push('HTTP API integration');
        }
        if (context.dependencies.some(dep => dep.includes('curl'))) {
            integrations.push('cURL-based integration');
        }

        return integrations;
    }

    private findCustomSslFields(context: CodeContext): string[] {
        const standardFields = [
            'ssl_account_id', 'ssl_user_id', 'ssl_pin', 'ssl_transaction_type',
            'ssl_amount', 'ssl_currency_code', 'ssl_invoice_number', 'ssl_merchant_txn_id'
        ];

        return context.sslFields.filter(field => 
            !standardFields.some(standard => field.includes(standard.replace('ssl_', '')))
        );
    }

    private findCustomEndpoints(context: CodeContext): string[] {
        const standardEndpoints = [
            '/hosted-payments', '/Checkout.js', '/ProcessTransactionOnline',
            '/batch-processing', '/NonElavonCertifiedDevice'
        ];

        // This would need to be implemented based on actual endpoint detection
        // For now, return empty array
        return [];
    }
}
