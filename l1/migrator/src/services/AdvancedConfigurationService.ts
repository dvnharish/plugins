import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface OrganizationSettings {
    id: string;
    name: string;
    domain: string;
    settings: OrganizationConfiguration;
    policies: MigrationPolicy[];
    customMappings: CustomMapping[];
    environments: Environment[];
    createdAt: Date;
    updatedAt: Date;
}

export interface OrganizationConfiguration {
    defaultLanguage: string;
    codeStyle: CodeStyleSettings;
    migrationRules: MigrationRule[];
    validationRules: ValidationRule[];
    notificationSettings: NotificationSettings;
    securitySettings: SecuritySettings;
    performanceSettings: PerformanceSettings;
}

export interface CodeStyleSettings {
    indentation: 'spaces' | 'tabs';
    indentSize: number;
    lineLength: number;
    quoteStyle: 'single' | 'double';
    semicolonStyle: 'always' | 'never' | 'as-needed';
    bracketStyle: 'same-line' | 'new-line';
}

export interface MigrationRule {
    id: string;
    name: string;
    description: string;
    condition: string;
    action: string;
    priority: number;
    enabled: boolean;
    language: string;
    category: string;
}

export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    field: string;
    type: 'required' | 'format' | 'range' | 'custom';
    value: any;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export interface NotificationSettings {
    email: EmailSettings;
    slack: SlackSettings;
    teams: TeamsSettings;
    webhook: WebhookSettings;
}

export interface EmailSettings {
    enabled: boolean;
    smtpServer: string;
    smtpPort: number;
    username: string;
    fromAddress: string;
    templates: EmailTemplate[];
}

export interface SlackSettings {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    username: string;
    iconEmoji: string;
}

export interface TeamsSettings {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
}

export interface WebhookSettings {
    enabled: boolean;
    url: string;
    secret: string;
    events: string[];
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    variables: string[];
}

export interface SecuritySettings {
    encryptionEnabled: boolean;
    encryptionKey: string;
    auditLogging: boolean;
    sessionTimeout: number;
    passwordPolicy: PasswordPolicy;
    twoFactorAuth: boolean;
    ipWhitelist: string[];
}

export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
}

export interface PerformanceSettings {
    maxConcurrentMigrations: number;
    timeout: number;
    retryAttempts: number;
    cacheEnabled: boolean;
    cacheSize: number;
    cacheTimeout: number;
}

export interface Environment {
    id: string;
    name: string;
    type: 'sandbox' | 'staging' | 'production';
    baseUrl: string;
    credentials: EnvironmentCredentials;
    settings: EnvironmentSettings;
    active: boolean;
}

export interface EnvironmentCredentials {
    publicKey: string;
    secretKey: string;
    merchantId: string;
    terminalId?: string;
}

export interface EnvironmentSettings {
    timeout: number;
    retryAttempts: number;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    validationEnabled: boolean;
}

export interface CustomMapping {
    id: string;
    name: string;
    description: string;
    convergeField: string;
    elavonField: string;
    transformation: TransformationRule;
    validation: ValidationRule;
    language: string;
    category: string;
    enabled: boolean;
}

export interface TransformationRule {
    type: 'direct' | 'calculated' | 'lookup' | 'custom';
    formula?: string;
    lookupTable?: LookupTable;
    customFunction?: string;
}

export interface LookupTable {
    id: string;
    name: string;
    entries: LookupEntry[];
}

export interface LookupEntry {
    key: string;
    value: string;
    description?: string;
}

export interface MigrationPolicy {
    id: string;
    name: string;
    description: string;
    rules: PolicyRule[];
    conditions: PolicyCondition[];
    actions: PolicyAction[];
    priority: number;
    enabled: boolean;
}

export interface PolicyRule {
    id: string;
    field: string;
    operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater-than' | 'less-than';
    value: any;
}

export interface PolicyCondition {
    id: string;
    type: 'file-type' | 'file-size' | 'file-location' | 'code-pattern' | 'custom';
    value: any;
}

export interface PolicyAction {
    id: string;
    type: 'block' | 'allow' | 'warn' | 'transform' | 'custom';
    value: any;
}

export interface FilteringOptions {
    fileTypes: string[];
    fileSize: {
        min: number;
        max: number;
    };
    fileLocation: {
        include: string[];
        exclude: string[];
    };
    codePatterns: string[];
    languages: string[];
    confidence: {
        min: number;
        max: number;
    };
}

export interface SearchOptions {
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    regex: boolean;
    fileTypes: string[];
    languages: string[];
    scope: 'all' | 'current-file' | 'current-project' | 'workspace';
}

export class AdvancedConfigurationService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private organizationSettings: Map<string, OrganizationSettings> = new Map();
    private customMappings: Map<string, CustomMapping> = new Map();
    private migrationPolicies: Map<string, MigrationPolicy> = new Map();
    private lookupTables: Map<string, LookupTable> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.initializeDefaultSettings();
    }

    /**
     * Create organization-specific settings
     */
    async createOrganizationSettings(
        name: string,
        domain: string,
        settings: Partial<OrganizationConfiguration>
    ): Promise<OrganizationSettings> {
        this.loggingService.log(LogLevel.INFO, `Creating organization settings for ${name}`);

        const organizationSettings: OrganizationSettings = {
            id: this.generateId(),
            name,
            domain,
            settings: {
                defaultLanguage: 'javascript',
                codeStyle: {
                    indentation: 'spaces',
                    indentSize: 2,
                    lineLength: 80,
                    quoteStyle: 'single',
                    semicolonStyle: 'always',
                    bracketStyle: 'same-line'
                },
                migrationRules: [],
                validationRules: [],
                notificationSettings: {
                    email: { enabled: false, smtpServer: '', smtpPort: 587, username: '', fromAddress: '', templates: [] },
                    slack: { enabled: false, webhookUrl: '', channel: '', username: '', iconEmoji: '' },
                    teams: { enabled: false, webhookUrl: '', channel: '' },
                    webhook: { enabled: false, url: '', secret: '', events: [] }
                },
                securitySettings: {
                    encryptionEnabled: true,
                    encryptionKey: '',
                    auditLogging: true,
                    sessionTimeout: 3600,
                    passwordPolicy: {
                        minLength: 8,
                        requireUppercase: true,
                        requireLowercase: true,
                        requireNumbers: true,
                        requireSpecialChars: true,
                        maxAge: 90
                    },
                    twoFactorAuth: false,
                    ipWhitelist: []
                },
                performanceSettings: {
                    maxConcurrentMigrations: 5,
                    timeout: 30000,
                    retryAttempts: 3,
                    cacheEnabled: true,
                    cacheSize: 100,
                    cacheTimeout: 3600
                },
                ...settings
            },
            policies: [],
            customMappings: [],
            environments: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.organizationSettings.set(organizationSettings.id, organizationSettings);
        await this.saveOrganizationSettings();

        return organizationSettings;
    }

    /**
     * Create custom mapping dictionary editor
     */
    async createCustomMapping(
        name: string,
        description: string,
        convergeField: string,
        elavonField: string,
        transformation: TransformationRule,
        validation: ValidationRule,
        language: string,
        category: string
    ): Promise<CustomMapping> {
        this.loggingService.log(LogLevel.INFO, `Creating custom mapping: ${name}`);

        const customMapping: CustomMapping = {
            id: this.generateId(),
            name,
            description,
            convergeField,
            elavonField,
            transformation,
            validation,
            language,
            category,
            enabled: true
        };

        this.customMappings.set(customMapping.id, customMapping);
        await this.saveCustomMappings();

        return customMapping;
    }

    /**
     * Validate custom mapping
     */
    async validateCustomMapping(mapping: CustomMapping): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        // Validate field names
        if (!mapping.convergeField || mapping.convergeField.trim() === '') {
            errors.push('Converge field is required');
        }

        if (!mapping.elavonField || mapping.elavonField.trim() === '') {
            errors.push('Elavon field is required');
        }

        // Validate transformation
        if (mapping.transformation.type === 'calculated' && !mapping.transformation.formula) {
            errors.push('Formula is required for calculated transformation');
        }

        if (mapping.transformation.type === 'lookup' && !mapping.transformation.lookupTable) {
            errors.push('Lookup table is required for lookup transformation');
        }

        // Validate validation rule
        if (mapping.validation.type === 'required' && mapping.validation.value !== true) {
            errors.push('Required validation must have value true');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Create migration policy
     */
    async createMigrationPolicy(
        name: string,
        description: string,
        rules: PolicyRule[],
        conditions: PolicyCondition[],
        actions: PolicyAction[],
        priority: number
    ): Promise<MigrationPolicy> {
        this.loggingService.log(LogLevel.INFO, `Creating migration policy: ${name}`);

        const policy: MigrationPolicy = {
            id: this.generateId(),
            name,
            description,
            rules,
            conditions,
            actions,
            priority,
            enabled: true
        };

        this.migrationPolicies.set(policy.id, policy);
        await this.saveMigrationPolicies();

        return policy;
    }

    /**
     * Evaluate migration policy
     */
    async evaluateMigrationPolicy(
        policyId: string,
        context: any
    ): Promise<{ matches: boolean; actions: PolicyAction[] }> {
        const policy = this.migrationPolicies.get(policyId);
        if (!policy || !policy.enabled) {
            return { matches: false, actions: [] };
        }

        // Evaluate rules
        const rulesMatch = policy.rules.every(rule => this.evaluateRule(rule, context));
        if (!rulesMatch) {
            return { matches: false, actions: [] };
        }

        // Evaluate conditions
        const conditionsMatch = policy.conditions.every(condition => this.evaluateCondition(condition, context));
        if (!conditionsMatch) {
            return { matches: false, actions: [] };
        }

        return { matches: true, actions: policy.actions };
    }

    /**
     * Add Elavon environment
     */
    async addEnvironment(
        name: string,
        type: 'sandbox' | 'staging' | 'production',
        baseUrl: string,
        credentials: EnvironmentCredentials,
        settings: Partial<EnvironmentSettings> = {}
    ): Promise<Environment> {
        this.loggingService.log(LogLevel.INFO, `Adding Elavon environment: ${name}`);

        const environment: Environment = {
            id: this.generateId(),
            name,
            type,
            baseUrl,
            credentials,
            settings: {
                timeout: 30000,
                retryAttempts: 3,
                loggingLevel: 'info',
                validationEnabled: true,
                ...settings
            },
            active: false
        };

        // Add to all organization settings
        for (const orgSettings of this.organizationSettings.values()) {
            orgSettings.environments.push(environment);
        }

        await this.saveOrganizationSettings();

        return environment;
    }

    /**
     * Set active environment
     */
    async setActiveEnvironment(environmentId: string, organizationId?: string): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Setting active environment: ${environmentId}`);

        const organizations = organizationId 
            ? [this.organizationSettings.get(organizationId)].filter(Boolean)
            : Array.from(this.organizationSettings.values());

        for (const org of organizations) {
            if (org) {
                // Deactivate all environments
                org.environments.forEach(env => env.active = false);
                
                // Activate selected environment
                const environment = org.environments.find(env => env.id === environmentId);
                if (environment) {
                    environment.active = true;
                }
            }
        }

        await this.saveOrganizationSettings();
        return true;
    }

    /**
     * Create lookup table
     */
    async createLookupTable(
        name: string,
        entries: LookupEntry[]
    ): Promise<LookupTable> {
        this.loggingService.log(LogLevel.INFO, `Creating lookup table: ${name}`);

        const lookupTable: LookupTable = {
            id: this.generateId(),
            name,
            entries
        };

        this.lookupTables.set(lookupTable.id, lookupTable);
        await this.saveLookupTables();

        return lookupTable;
    }

    /**
     * Search with advanced filtering
     */
    async searchWithFiltering(
        searchOptions: SearchOptions,
        filteringOptions: FilteringOptions
    ): Promise<any[]> {
        this.loggingService.log(LogLevel.INFO, `Performing advanced search with filtering`);

        // This would implement actual search logic
        // For now, return empty array
        return [];
    }

    /**
     * Get organization settings
     */
    getOrganizationSettings(organizationId: string): OrganizationSettings | undefined {
        return this.organizationSettings.get(organizationId);
    }

    /**
     * Get all organization settings
     */
    getAllOrganizationSettings(): OrganizationSettings[] {
        return Array.from(this.organizationSettings.values());
    }

    /**
     * Get custom mappings by language
     */
    getCustomMappingsByLanguage(language: string): CustomMapping[] {
        return Array.from(this.customMappings.values()).filter(m => m.language === language);
    }

    /**
     * Get custom mappings by category
     */
    getCustomMappingsByCategory(category: string): CustomMapping[] {
        return Array.from(this.customMappings.values()).filter(m => m.category === category);
    }

    /**
     * Get migration policies
     */
    getMigrationPolicies(): MigrationPolicy[] {
        return Array.from(this.migrationPolicies.values());
    }

    /**
     * Get lookup tables
     */
    getLookupTables(): LookupTable[] {
        return Array.from(this.lookupTables.values());
    }

    /**
     * Export configuration
     */
    async exportConfiguration(organizationId: string): Promise<string> {
        const orgSettings = this.organizationSettings.get(organizationId);
        if (!orgSettings) {
            throw new Error(`Organization ${organizationId} not found`);
        }

        const exportData = {
            organization: orgSettings,
            customMappings: Array.from(this.customMappings.values()),
            migrationPolicies: Array.from(this.migrationPolicies.values()),
            lookupTables: Array.from(this.lookupTables.values()),
            exportedAt: new Date(),
            version: '1.0'
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import configuration
     */
    async importConfiguration(configData: string): Promise<boolean> {
        try {
            const data = JSON.parse(configData);
            
            if (data.organization) {
                this.organizationSettings.set(data.organization.id, data.organization);
            }

            if (data.customMappings) {
                data.customMappings.forEach((mapping: CustomMapping) => {
                    this.customMappings.set(mapping.id, mapping);
                });
            }

            if (data.migrationPolicies) {
                data.migrationPolicies.forEach((policy: MigrationPolicy) => {
                    this.migrationPolicies.set(policy.id, policy);
                });
            }

            if (data.lookupTables) {
                data.lookupTables.forEach((table: LookupTable) => {
                    this.lookupTables.set(table.id, table);
                });
            }

            await this.saveAllSettings();
            return true;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to import configuration'),
                {
                    category: ErrorCategory.CONFIGURATION,
                    details: 'Failed to import configuration',
                    context: { error: error }
                }
            );
            return false;
        }
    }

    private initializeDefaultSettings(): void {
        // Initialize with default settings
        this.loggingService.log(LogLevel.INFO, 'Initializing default advanced configuration settings');
    }

    private evaluateRule(rule: PolicyRule, context: any): boolean {
        const value = this.getNestedValue(context, rule.field);
        
        switch (rule.operator) {
            case 'equals':
                return value === rule.value;
            case 'not-equals':
                return value !== rule.value;
            case 'contains':
                return String(value).includes(String(rule.value));
            case 'not-contains':
                return !String(value).includes(String(rule.value));
            case 'greater-than':
                return Number(value) > Number(rule.value);
            case 'less-than':
                return Number(value) < Number(rule.value);
            default:
                return false;
        }
    }

    private evaluateCondition(condition: PolicyCondition, context: any): boolean {
        switch (condition.type) {
            case 'file-type':
                return context.fileType === condition.value;
            case 'file-size':
                return context.fileSize <= condition.value;
            case 'file-location':
                return context.filePath.includes(condition.value);
            case 'code-pattern':
                return context.code.includes(condition.value);
            case 'custom':
                // This would implement custom condition evaluation
                return true;
            default:
                return false;
        }
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private async saveOrganizationSettings(): Promise<void> {
        const data = Array.from(this.organizationSettings.values());
        await this.context.globalState.update('organizationSettings', data);
    }

    private async saveCustomMappings(): Promise<void> {
        const data = Array.from(this.customMappings.values());
        await this.context.globalState.update('customMappings', data);
    }

    private async saveMigrationPolicies(): Promise<void> {
        const data = Array.from(this.migrationPolicies.values());
        await this.context.globalState.update('migrationPolicies', data);
    }

    private async saveLookupTables(): Promise<void> {
        const data = Array.from(this.lookupTables.values());
        await this.context.globalState.update('lookupTables', data);
    }

    private async saveAllSettings(): Promise<void> {
        await Promise.all([
            this.saveOrganizationSettings(),
            this.saveCustomMappings(),
            this.saveMigrationPolicies(),
            this.saveLookupTables()
        ]);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
