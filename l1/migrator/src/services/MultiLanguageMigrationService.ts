import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService } from './ErrorHandlingService';

export interface LanguageMigrationPattern {
    id: string;
    language: string;
    framework?: string;
    pattern: string;
    replacement: string;
    description: string;
    category: 'import' | 'syntax' | 'api-call' | 'error-handling' | 'async' | 'validation' | 'custom';
    confidence: number;
    examples: LanguageExample[];
    dependencies: string[];
    imports: string[];
}

export interface LanguageExample {
    id: string;
    title: string;
    description: string;
    convergeCode: string;
    elavonCode: string;
    explanation: string;
    framework?: string;
}

export interface FrameworkConfiguration {
    id: string;
    name: string;
    language: string;
    version: string;
    patterns: LanguageMigrationPattern[];
    dependencies: FrameworkDependency[];
    configuration: FrameworkConfig;
    templates: FrameworkTemplate[];
}

export interface FrameworkDependency {
    name: string;
    version: string;
    type: 'runtime' | 'dev' | 'peer' | 'optional';
    description: string;
    installCommand: string;
}

export interface FrameworkConfig {
    files: string[];
    directories: string[];
    settings: { [key: string]: any };
    scripts: { [key: string]: string };
    environment: { [key: string]: string };
}

export interface FrameworkTemplate {
    id: string;
    name: string;
        description: string;
    type: 'component' | 'service' | 'controller' | 'model' | 'config' | 'test';
    template: string;
    variables: string[];
    outputPath: string;
    framework: string;
}

export interface RubyMigrationPattern extends LanguageMigrationPattern {
    language: 'ruby';
    framework?: 'rails' | 'sinatra' | 'grape' | 'hanami';
    gems: string[];
    requireStatements: string[];
}

export interface PHPMigrationPattern extends LanguageMigrationPattern {
    language: 'php';
    framework?: 'laravel' | 'symfony' | 'wordpress' | 'codeigniter' | 'yii';
    composerPackages: string[];
    useStatements: string[];
    namespaces: string[];
}

export interface PythonMigrationPattern extends LanguageMigrationPattern {
    language: 'python';
    framework?: 'django' | 'flask' | 'fastapi' | 'tornado' | 'bottle';
    pipPackages: string[];
    importStatements: string[];
    virtualEnv: boolean;
}

export interface JavaMigrationPattern extends LanguageMigrationPattern {
    language: 'java';
    framework?: 'spring-boot' | 'jax-rs' | 'jersey' | 'restlet' | 'spark';
    mavenDependencies: string[];
    gradleDependencies: string[];
    importStatements: string[];
    annotations: string[];
}

export interface CSharpMigrationPattern extends LanguageMigrationPattern {
    language: 'csharp';
    framework?: 'dotnet-core' | 'asp-net' | 'web-api' | 'mvc' | 'blazor';
    nugetPackages: string[];
    usingStatements: string[];
    namespaces: string[];
    attributes: string[];
}

export interface TypeScriptMigrationPattern extends LanguageMigrationPattern {
    language: 'typescript';
    framework?: 'angular' | 'react' | 'vue' | 'node' | 'express' | 'nestjs';
    npmPackages: string[];
    importStatements: string[];
    types: string[];
    interfaces: string[];
}

export interface MigrationResult {
    id: string;
    filePath: string;
    language: string;
    framework?: string;
    originalCode: string;
    migratedCode: string;
    patterns: AppliedPattern[];
    imports: string[];
    dependencies: string[];
    confidence: number;
    warnings: string[];
    errors: string[];
    suggestions: string[];
}

export interface AppliedPattern {
    patternId: string;
    patternName: string;
    originalText: string;
    replacedText: string;
    lineNumber: number;
    confidence: number;
}

export class MultiLanguageMigrationService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private languagePatterns: Map<string, LanguageMigrationPattern[]> = new Map();
    private frameworkConfigurations: Map<string, FrameworkConfiguration> = new Map();
    private migrationResults: Map<string, MigrationResult> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.initializeLanguagePatterns();
    }

    /**
     * Migrate code for specific language and framework
     */
    async migrateCode(
        filePath: string,
        code: string,
        language: string,
        framework?: string
    ): Promise<MigrationResult> {
        this.loggingService.log(LogLevel.INFO, `Migrating ${language} code${framework ? ` (${framework})` : ''}`);

        const patterns = this.getPatternsForLanguage(language, framework);
        const appliedPatterns: AppliedPattern[] = [];
        let migratedCode = code;
        const imports: string[] = [];
        const dependencies: string[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];
        const suggestions: string[] = [];

        // Apply patterns
        for (const pattern of patterns) {
            try {
                const result = await this.applyPattern(migratedCode, pattern);
                if (result.applied) {
                    migratedCode = result.code;
                    appliedPatterns.push({
                        patternId: pattern.id,
                        patternName: pattern.id,
                        originalText: result.originalText,
                        replacedText: result.replacedText,
                        lineNumber: result.lineNumber,
                        confidence: pattern.confidence
                    });

                    // Collect imports and dependencies
                    imports.push(...pattern.imports);
                    dependencies.push(...pattern.dependencies);
                }
            } catch (error) {
                errors.push(`Failed to apply pattern ${pattern.id}: ${error}`);
            }
        }

        // Add framework-specific imports and dependencies
        if (framework) {
            const frameworkConfig = this.frameworkConfigurations.get(`${language}-${framework}`);
            if (frameworkConfig) {
                imports.push(...frameworkConfig.patterns.flatMap(p => p.imports));
                dependencies.push(...frameworkConfig.dependencies.map(d => d.name));
            }
        }

        // Calculate overall confidence
        const confidence = appliedPatterns.length > 0 
            ? appliedPatterns.reduce((sum, p) => sum + p.confidence, 0) / appliedPatterns.length
            : 0;

        const result: MigrationResult = {
            id: this.generateId(),
            filePath,
            language,
            framework: framework || '',
            originalCode: code,
            migratedCode,
            patterns: appliedPatterns,
            imports: [...new Set(imports)],
            dependencies: [...new Set(dependencies)],
            confidence,
            warnings,
            errors,
            suggestions
        };

        this.migrationResults.set(result.id, result);
        await this.saveMigrationResults();

        return result;
    }

    /**
     * Get patterns for specific language and framework
     */
    getPatternsForLanguage(language: string, framework?: string): LanguageMigrationPattern[] {
        const key = framework ? `${language}-${framework}` : language;
        return this.languagePatterns.get(key) || [];
    }

    /**
     * Add custom language pattern
     */
    async addLanguagePattern(pattern: Omit<LanguageMigrationPattern, 'id'>): Promise<LanguageMigrationPattern> {
        this.loggingService.log(LogLevel.INFO, `Adding language pattern: ${pattern.language}`);

        const newPattern: LanguageMigrationPattern = {
            ...pattern,
            id: this.generateId()
        };

        const key = pattern.framework ? `${pattern.language}-${pattern.framework}` : pattern.language;
        if (!this.languagePatterns.has(key)) {
            this.languagePatterns.set(key, []);
        }
        this.languagePatterns.get(key)!.push(newPattern);

        await this.saveLanguagePatterns();
        return newPattern;
    }

    /**
     * Create framework configuration
     */
    async createFrameworkConfiguration(
        name: string,
        language: string,
        version: string,
        patterns: Omit<LanguageMigrationPattern, 'id'>[],
        dependencies: Omit<FrameworkDependency, 'id'>[]
    ): Promise<FrameworkConfiguration> {
        this.loggingService.log(LogLevel.INFO, `Creating framework configuration: ${name}`);

        const config: FrameworkConfiguration = {
            id: this.generateId(),
            name,
            language,
            version,
            patterns: patterns.map(p => ({ ...p, id: this.generateId() })),
            dependencies: dependencies.map(d => ({ ...d, id: this.generateId() })),
            configuration: {
                files: [],
                directories: [],
                settings: {},
                scripts: {},
                environment: {}
            },
            templates: []
        };

        this.frameworkConfigurations.set(`${language}-${name}`, config);
        await this.saveFrameworkConfigurations();

        return config;
    }

    /**
     * Generate framework-specific code
     */
    async generateFrameworkCode(
        templateId: string,
        variables: { [key: string]: any },
        outputPath: string
    ): Promise<string> {
        this.loggingService.log(LogLevel.INFO, `Generating framework code: ${templateId}`);

        const template = this.findTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        let generatedCode = template.template;
        
        // Replace variables in template
        template.variables.forEach(variable => {
            const value = variables[variable] || '';
            generatedCode = generatedCode.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
        });

        return generatedCode;
    }

    /**
     * Get all supported languages
     */
    getSupportedLanguages(): string[] {
        return Array.from(new Set(Array.from(this.languagePatterns.keys()).map(key => key.split('-')[0])));
    }

    /**
     * Get frameworks for language
     */
    getFrameworksForLanguage(language: string): string[] {
        return Array.from(this.frameworkConfigurations.keys())
            .filter(key => key.startsWith(`${language}-`))
            .map(key => key.substring(`${language}-`.length));
    }

    /**
     * Get migration results
     */
    getMigrationResults(): MigrationResult[] {
        return Array.from(this.migrationResults.values());
    }

    /**
     * Get migration result by ID
     */
    getMigrationResult(id: string): MigrationResult | undefined {
        return this.migrationResults.get(id);
    }

    private initializeLanguagePatterns(): void {
        this.loggingService.log(LogLevel.INFO, 'Initializing multi-language migration patterns');

        // Ruby patterns
        this.initializeRubyPatterns();
        
        // PHP patterns
        this.initializePHPPatterns();
        
        // Python patterns
        this.initializePythonPatterns();
        
        // Java patterns
        this.initializeJavaPatterns();
        
        // C# patterns
        this.initializeCSharpPatterns();
        
        // TypeScript patterns
        this.initializeTypeScriptPatterns();
    }

    private initializeRubyPatterns(): void {
        const rubyPatterns: RubyMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'ruby',
                framework: 'rails',
                pattern: 'Net::HTTP\\.new\\([^)]+\\)',
                replacement: 'Faraday\\.new\\(url: \'https://uat.api.converge.eu.elavonaws.com\'\\)',
                description: 'Convert Net::HTTP to Faraday',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['faraday'],
                imports: ['faraday'],
                gems: ['faraday'],
                requireStatements: ['require \'faraday\'']
            },
            {
                id: this.generateId(),
                language: 'ruby',
                framework: 'rails',
                pattern: 'ssl_[a-zA-Z_]+',
                replacement: 'elavon_\\1',
                description: 'Convert SSL field names to Elavon format',
                category: 'syntax',
                confidence: 0.8,
                examples: [],
                dependencies: [],
                imports: [],
                gems: [],
                requireStatements: []
            }
        ];

        this.languagePatterns.set('ruby', rubyPatterns);
        this.languagePatterns.set('ruby-rails', rubyPatterns);
    }

    private initializePHPPatterns(): void {
        const phpPatterns: PHPMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'php',
                framework: 'laravel',
                pattern: 'curl_setopt\\([^)]+\\)',
                replacement: 'Http::post\\([^)]+\\)',
                description: 'Convert cURL to Laravel HTTP client',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['guzzlehttp/guzzle'],
                imports: ['Illuminate\\Support\\Facades\\Http'],
                composerPackages: ['guzzlehttp/guzzle'],
                useStatements: ['use Illuminate\\Support\\Facades\\Http;'],
                namespaces: ['Illuminate\\Support\\Facades']
            },
            {
                id: this.generateId(),
                language: 'php',
                framework: 'wordpress',
                pattern: 'wp_remote_post\\([^)]+\\)',
                replacement: 'wp_remote_post\\([^)]+\\, [^)]+\\, [^)]+\\)',
                description: 'Update WordPress HTTP functions for Elavon',
                category: 'api-call',
                confidence: 0.8,
                examples: [],
                dependencies: [],
                imports: [],
                composerPackages: [],
                useStatements: [],
                namespaces: []
            }
        ];

        this.languagePatterns.set('php', phpPatterns);
        this.languagePatterns.set('php-laravel', phpPatterns);
        this.languagePatterns.set('php-wordpress', phpPatterns);
    }

    private initializePythonPatterns(): void {
        const pythonPatterns: PythonMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'python',
                framework: 'django',
                pattern: 'requests\\.(get|post|put|delete)\\([^)]+\\)',
                replacement: 'requests\\.\\1\\([^)]+\\, json=[^)]+\\)',
                description: 'Update requests library calls for JSON',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['requests'],
                imports: ['requests'],
                pipPackages: ['requests'],
                importStatements: ['import requests'],
                virtualEnv: true
            },
            {
                id: this.generateId(),
                language: 'python',
                framework: 'flask',
                pattern: 'ssl_[a-zA-Z_]+',
                replacement: 'elavon_\\1',
                description: 'Convert SSL field names to Elavon format',
                category: 'syntax',
                confidence: 0.8,
                examples: [],
                dependencies: [],
                imports: [],
                pipPackages: [],
                importStatements: [],
                virtualEnv: false
            }
        ];

        this.languagePatterns.set('python', pythonPatterns);
        this.languagePatterns.set('python-django', pythonPatterns);
        this.languagePatterns.set('python-flask', pythonPatterns);
    }

    private initializeJavaPatterns(): void {
        const javaPatterns: JavaMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'java',
                framework: 'spring-boot',
                pattern: 'HttpClient\\.newHttpClient\\(\\)',
                replacement: 'RestTemplate\\.class',
                description: 'Convert HttpClient to Spring RestTemplate',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['spring-boot-starter-web'],
                imports: ['org.springframework.web.client.RestTemplate'],
                mavenDependencies: ['org.springframework.boot:spring-boot-starter-web'],
                gradleDependencies: ['implementation \'org.springframework.boot:spring-boot-starter-web\''],
                importStatements: ['import org.springframework.web.client.RestTemplate;'],
                annotations: ['@Service', '@RestController']
            },
            {
                id: this.generateId(),
                language: 'java',
                framework: 'spring-boot',
                pattern: 'ssl_[a-zA-Z_]+',
                replacement: 'elavon\\1',
                description: 'Convert SSL field names to Elavon format',
                category: 'syntax',
                confidence: 0.8,
                examples: [],
                dependencies: [],
                imports: [],
                mavenDependencies: [],
                gradleDependencies: [],
                importStatements: [],
                annotations: []
            }
        ];

        this.languagePatterns.set('java', javaPatterns);
        this.languagePatterns.set('java-spring-boot', javaPatterns);
    }

    private initializeCSharpPatterns(): void {
        const csharpPatterns: CSharpMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'csharp',
                framework: 'dotnet-core',
                pattern: 'HttpClient\\.PostAsync\\([^)]+\\)',
                replacement: 'HttpClient\\.PostAsJsonAsync\\([^)]+\\)',
                description: 'Convert HttpClient to use PostAsJsonAsync',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['System.Net.Http.Json'],
                imports: ['System.Net.Http.Json'],
                nugetPackages: ['System.Net.Http.Json'],
                usingStatements: ['using System.Net.Http.Json;'],
                namespaces: ['System.Net.Http.Json'],
                attributes: ['[HttpPost]', '[FromBody]']
            },
            {
                id: this.generateId(),
                language: 'csharp',
                framework: 'asp-net',
                pattern: 'ssl_[a-zA-Z_]+',
                replacement: 'Elavon\\1',
                description: 'Convert SSL field names to Elavon format',
                category: 'syntax',
                confidence: 0.8,
                examples: [],
                dependencies: [],
                imports: [],
                nugetPackages: [],
                usingStatements: [],
                namespaces: [],
                attributes: []
            }
        ];

        this.languagePatterns.set('csharp', csharpPatterns);
        this.languagePatterns.set('csharp-dotnet-core', csharpPatterns);
        this.languagePatterns.set('csharp-asp-net', csharpPatterns);
    }

    private initializeTypeScriptPatterns(): void {
        const typescriptPatterns: TypeScriptMigrationPattern[] = [
            {
                id: this.generateId(),
                language: 'typescript',
                framework: 'angular',
                pattern: 'HttpClient\\.(get|post|put|delete)\\([^)]+\\)',
                replacement: 'HttpClient\\.\\1<ElavonResponse>\\([^)]+\\)',
                description: 'Add TypeScript types to HttpClient calls',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['@angular/common/http'],
                imports: ['HttpClient', 'HttpHeaders'],
                npmPackages: ['@angular/common'],
                importStatements: ['import { HttpClient, HttpHeaders } from \'@angular/common/http\';'],
                types: ['ElavonResponse', 'ElavonRequest'],
                interfaces: ['interface ElavonResponse { ... }']
            },
            {
                id: this.generateId(),
                language: 'typescript',
                framework: 'react',
                pattern: 'fetch\\([^)]+\\)',
                replacement: 'axios\\.(get|post|put|delete)\\([^)]+\\)',
                description: 'Convert fetch to axios with proper typing',
                category: 'api-call',
                confidence: 0.9,
                examples: [],
                dependencies: ['axios'],
                imports: ['axios'],
                npmPackages: ['axios', '@types/axios'],
                importStatements: ['import axios from \'axios\';'],
                types: ['AxiosResponse', 'AxiosRequestConfig'],
                interfaces: ['interface ElavonApiResponse { ... }']
            }
        ];

        this.languagePatterns.set('typescript', typescriptPatterns);
        this.languagePatterns.set('typescript-angular', typescriptPatterns);
        this.languagePatterns.set('typescript-react', typescriptPatterns);
    }

    private async applyPattern(code: string, pattern: LanguageMigrationPattern): Promise<{
        applied: boolean;
        code: string;
        originalText: string;
        replacedText: string;
        lineNumber: number;
    }> {
        const regex = new RegExp(pattern.pattern, 'g');
        const matches = code.match(regex);
        
        if (!matches || matches.length === 0) {
            return {
                applied: false,
                code,
                originalText: '',
                replacedText: '',
                lineNumber: 0
            };
        }

        const firstMatch = matches[0];
        const lineNumber = code.substring(0, code.indexOf(firstMatch)).split('\n').length;
        const replacedCode = code.replace(regex, pattern.replacement);

        return {
            applied: true,
            code: replacedCode,
            originalText: firstMatch,
            replacedText: pattern.replacement,
            lineNumber
        };
    }

    private findTemplate(templateId: string): FrameworkTemplate | undefined {
        for (const config of this.frameworkConfigurations.values()) {
            const template = config.templates.find(t => t.id === templateId);
            if (template) {
                return template;
            }
        }
        return undefined;
    }

    private async saveLanguagePatterns(): Promise<void> {
        const data: { [key: string]: LanguageMigrationPattern[] } = {};
        this.languagePatterns.forEach((patterns, key) => {
            data[key] = patterns;
        });
        await this.context.globalState.update('languagePatterns', data);
    }

    private async saveFrameworkConfigurations(): Promise<void> {
        const data = Array.from(this.frameworkConfigurations.values());
        await this.context.globalState.update('frameworkConfigurations', data);
    }

    private async saveMigrationResults(): Promise<void> {
        const data = Array.from(this.migrationResults.values());
        await this.context.globalState.update('migrationResults', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
