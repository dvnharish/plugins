import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface APIConfiguration {
    id: string;
    name: string;
    description: string;
    baseUrl: string;
    version: string;
    authentication: APIAuthentication;
    endpoints: APIEndpoint[];
    rateLimiting: RateLimiting;
    retryPolicy: RetryPolicy;
    timeout: number;
    enabled: boolean;
}

export interface APIAuthentication {
    type: 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
    credentials: { [key: string]: string };
    headers: { [key: string]: string };
    queryParams: { [key: string]: string };
}

export interface APIEndpoint {
    id: string;
    name: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    description: string;
    parameters: APIParameter[];
    requestBody?: APIRequestBody;
    responseSchema?: APIResponseSchema;
    examples: APIExample[];
}

export interface ParameterValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    required?: boolean;
}

export interface APIParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    location: 'path' | 'query' | 'header' | 'body';
    description: string;
    defaultValue?: any;
    validation?: ParameterValidation;
}

export interface APIRequestBody {
    contentType: string;
    schema: any;
    required: boolean;
    examples: { [key: string]: any };
}

export interface APIResponseSchema {
    statusCodes: { [code: string]: ResponseSchema };
}

export interface ResponseSchema {
    description: string;
    contentType: string;
    schema: any;
    examples: { [key: string]: any };
}

export interface APIExample {
    name: string;
    description: string;
    request: APIExampleRequest;
    response: APIExampleResponse;
}

export interface APIExampleRequest {
    headers: { [key: string]: string };
    body?: any;
    queryParams: { [key: string]: string };
}

export interface APIExampleResponse {
    statusCode: number;
    headers: { [key: string]: string };
    body: any;
}

export interface RateLimiting {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
}

export interface RetryPolicy {
    enabled: boolean;
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableStatusCodes: number[];
}

export interface WebhookConfiguration {
    id: string;
    name: string;
    description: string;
    url: string;
    events: string[];
    authentication: WebhookAuthentication;
    headers: { [key: string]: string };
    payload: WebhookPayload;
    retryPolicy: RetryPolicy;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebhookAuthentication {
    type: 'none' | 'api-key' | 'bearer' | 'hmac' | 'custom';
    credentials: { [key: string]: string };
    signatureHeader: string;
    signatureAlgorithm: string;
}

export interface WebhookPayload {
    format: 'json' | 'xml' | 'form' | 'custom';
    template: string;
    includeMetadata: boolean;
    customFields: { [key: string]: any };
}

export interface WebhookEvent {
    id: string;
    webhookId: string;
    eventType: string;
    payload: any;
    timestamp: Date;
    status: 'pending' | 'sent' | 'failed' | 'retrying';
    attempts: number;
    lastAttempt?: Date;
    nextAttempt?: Date;
    response?: WebhookResponse;
    error?: string;
}

export interface WebhookResponse {
    statusCode: number;
    headers: { [key: string]: string };
    body: string;
    duration: number;
    timestamp: Date;
}

export interface APICall {
    id: string;
    apiId: string;
    endpointId: string;
    method: string;
    url: string;
    headers: { [key: string]: string };
    body?: any;
    timestamp: Date;
    duration?: number;
    statusCode?: number;
    response?: any;
    error?: string;
}

export interface IntegrationPlatform {
    id: string;
    name: string;
    type: 'slack' | 'teams' | 'jira' | 'confluence' | 'github' | 'gitlab' | 'custom';
    configuration: { [key: string]: any };
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SlackIntegration extends IntegrationPlatform {
    type: 'slack';
    configuration: {
        webhookUrl: string;
        channel: string;
        username: string;
        iconEmoji: string;
        mentions: string[];
    };
}

export interface TeamsIntegration extends IntegrationPlatform {
    type: 'teams';
    configuration: {
        webhookUrl: string;
        channel: string;
        title: string;
        color: string;
    };
}

export interface JIRAIntegration extends IntegrationPlatform {
    type: 'jira';
    configuration: {
        baseUrl: string;
        username: string;
        apiToken: string;
        projectKey: string;
        issueType: string;
    };
}

export class APIIntegrationService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private apiConfigurations: Map<string, APIConfiguration> = new Map();
    private webhookConfigurations: Map<string, WebhookConfiguration> = new Map();
    private webhookEvents: Map<string, WebhookEvent> = new Map();
    private apiCalls: Map<string, APICall> = new Map();
    private integrationPlatforms: Map<string, IntegrationPlatform> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
    }

    /**
     * Create API configuration
     */
    async createAPIConfiguration(
        name: string,
        description: string,
        baseUrl: string,
        version: string,
        authentication: APIAuthentication,
        endpoints: Omit<APIEndpoint, 'id'>[]
    ): Promise<APIConfiguration> {
        this.loggingService.log(LogLevel.INFO, `Creating API configuration: ${name}`);

        const config: APIConfiguration = {
            id: this.generateId(),
            name,
            description,
            baseUrl,
            version,
            authentication,
            endpoints: endpoints.map(endpoint => ({ ...endpoint, id: this.generateId() })),
            rateLimiting: {
                enabled: true,
                requestsPerMinute: 60,
                requestsPerHour: 1000,
                requestsPerDay: 10000,
                burstLimit: 10
            },
            retryPolicy: {
                enabled: true,
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                retryableStatusCodes: [500, 502, 503, 504]
            },
            timeout: 30000,
            enabled: true
        };

        this.apiConfigurations.set(config.id, config);
        await this.saveAPIConfigurations();

        return config;
    }

    /**
     * Make API call
     */
    async makeAPICall(
        apiId: string,
        endpointId: string,
        parameters: { [key: string]: any } = {},
        body?: any
    ): Promise<APICall> {
        this.loggingService.log(LogLevel.INFO, `Making API call to ${apiId}/${endpointId}`);

        const apiConfig = this.apiConfigurations.get(apiId);
        if (!apiConfig) {
            throw new Error(`API configuration ${apiId} not found`);
        }

        const endpoint = apiConfig.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            throw new Error(`Endpoint ${endpointId} not found`);
        }

        const apiCall: APICall = {
            id: this.generateId(),
            apiId,
            endpointId,
            method: endpoint.method,
            url: this.buildUrl(apiConfig.baseUrl, endpoint.path, parameters),
            headers: this.buildHeaders(apiConfig.authentication, endpoint),
            body,
            timestamp: new Date()
        };

        try {
            const startTime = Date.now();
            const response = await this.executeAPICall(apiCall, apiConfig);
            const endTime = Date.now();

            apiCall.duration = endTime - startTime;
            apiCall.statusCode = response.statusCode;
            apiCall.response = response.body;

            this.loggingService.log(LogLevel.INFO, `API call completed: ${apiCall.statusCode}`);
        } catch (error) {
            apiCall.error = error instanceof Error ? error.message : String(error);
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('api-call-failed'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'api-call-failed',
                    context: { apiCall, error: error }
                }
            );
        }

        this.apiCalls.set(apiCall.id, apiCall);
        await this.saveAPICalls();

        return apiCall;
    }

    /**
     * Create webhook configuration
     */
    async createWebhookConfiguration(
        name: string,
        description: string,
        url: string,
        events: string[],
        authentication: WebhookAuthentication,
        payload: WebhookPayload
    ): Promise<WebhookConfiguration> {
        this.loggingService.log(LogLevel.INFO, `Creating webhook configuration: ${name}`);

        const config: WebhookConfiguration = {
            id: this.generateId(),
            name,
            description,
            url,
            events,
            authentication,
            headers: {},
            payload,
            retryPolicy: {
                enabled: true,
                maxAttempts: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                retryableStatusCodes: [500, 502, 503, 504]
            },
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.webhookConfigurations.set(config.id, config);
        await this.saveWebhookConfigurations();

        return config;
    }

    /**
     * Send webhook event
     */
    async sendWebhookEvent(
        webhookId: string,
        eventType: string,
        payload: any
    ): Promise<WebhookEvent> {
        this.loggingService.log(LogLevel.INFO, `Sending webhook event: ${eventType}`);

        const webhookConfig = this.webhookConfigurations.get(webhookId);
        if (!webhookConfig) {
            throw new Error(`Webhook configuration ${webhookId} not found`);
        }

        if (!webhookConfig.events.includes(eventType)) {
            throw new Error(`Event type ${eventType} not supported by webhook ${webhookId}`);
        }

        const webhookEvent: WebhookEvent = {
            id: this.generateId(),
            webhookId,
            eventType,
            payload,
            timestamp: new Date(),
            status: 'pending',
            attempts: 0
        };

        this.webhookEvents.set(webhookEvent.id, webhookEvent);
        await this.saveWebhookEvents();

        // Send webhook asynchronously
        this.sendWebhookAsync(webhookEvent, webhookConfig);

        return webhookEvent;
    }

    /**
     * Create Slack integration
     */
    async createSlackIntegration(
        name: string,
        webhookUrl: string,
        channel: string,
        username: string = 'Migration Bot',
        iconEmoji: string = ':robot_face:'
    ): Promise<SlackIntegration> {
        this.loggingService.log(LogLevel.INFO, `Creating Slack integration: ${name}`);

        const integration: SlackIntegration = {
            id: this.generateId(),
            name,
            type: 'slack',
            configuration: {
                webhookUrl,
                channel,
                username,
                iconEmoji,
                mentions: []
            },
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.integrationPlatforms.set(integration.id, integration);
        await this.saveIntegrationPlatforms();

        return integration;
    }

    /**
     * Send Slack notification
     */
    async sendSlackNotification(
        integrationId: string,
        message: string,
        attachments?: any[]
    ): Promise<boolean> {
        const integration = this.integrationPlatforms.get(integrationId) as SlackIntegration;
        if (!integration || integration.type !== 'slack') {
            return false;
        }

        const payload = {
            channel: integration.configuration.channel,
            username: integration.configuration.username,
            icon_emoji: integration.configuration.iconEmoji,
            text: message,
            attachments: attachments || []
        };

        try {
            await this.sendWebhookRequest(integration.configuration.webhookUrl, payload);
            this.loggingService.log(LogLevel.INFO, `Slack notification sent: ${message}`);
            return true;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to send Slack notification: ${error}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to send Slack notification: ${error}',
                    context: { integrationId, message, error: error   }
                }
            );
            return false;
        }
    }

    /**
     * Create Teams integration
     */
    async createTeamsIntegration(
        name: string,
        webhookUrl: string,
        channel: string,
        title: string = 'Migration Notification',
        color: string = '007acc'
    ): Promise<TeamsIntegration> {
        this.loggingService.log(LogLevel.INFO, `Creating Teams integration: ${name}`);

        const integration: TeamsIntegration = {
            id: this.generateId(),
            name,
            type: 'teams',
            configuration: {
                webhookUrl,
                channel,
                title,
                color
            },
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.integrationPlatforms.set(integration.id, integration);
        await this.saveIntegrationPlatforms();

        return integration;
    }

    /**
     * Send Teams notification
     */
    async sendTeamsNotification(
        integrationId: string,
        message: string,
        summary?: string
    ): Promise<boolean> {
        const integration = this.integrationPlatforms.get(integrationId) as TeamsIntegration;
        if (!integration || integration.type !== 'teams') {
            return false;
        }

        const payload = {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            summary: summary || integration.configuration.title,
            themeColor: integration.configuration.color,
            sections: [
                {
                    activityTitle: integration.configuration.title,
                    activitySubtitle: new Date().toISOString(),
                    text: message
                }
            ]
        };

        try {
            await this.sendWebhookRequest(integration.configuration.webhookUrl, payload);
            this.loggingService.log(LogLevel.INFO, `Teams notification sent: ${message}`);
            return true;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to send Teams notification: ${error}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to send Teams notification: ${error}',
                    context: { integrationId, message, error: error   }
                }
            );
            return false;
        }
    }

    /**
     * Create JIRA integration
     */
    async createJIRAIntegration(
        name: string,
        baseUrl: string,
        username: string,
        apiToken: string,
        projectKey: string,
        issueType: string = 'Task'
    ): Promise<JIRAIntegration> {
        this.loggingService.log(LogLevel.INFO, `Creating JIRA integration: ${name}`);

        const integration: JIRAIntegration = {
            id: this.generateId(),
            name,
            type: 'jira',
            configuration: {
                baseUrl,
                username,
                apiToken,
                projectKey,
                issueType
            },
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.integrationPlatforms.set(integration.id, integration);
        await this.saveIntegrationPlatforms();

        return integration;
    }

    /**
     * Create JIRA issue
     */
    async createJIRAIssue(
        integrationId: string,
        summary: string,
        description: string,
        priority: string = 'Medium',
        labels: string[] = []
    ): Promise<any> {
        const integration = this.integrationPlatforms.get(integrationId) as JIRAIntegration;
        if (!integration || integration.type !== 'jira') {
            throw new Error(`JIRA integration ${integrationId} not found`);
        }

        const issueData = {
            fields: {
                project: { key: integration.configuration.projectKey },
                summary: summary,
                description: description,
                issuetype: { name: integration.configuration.issueType },
                priority: { name: priority },
                labels: labels
            }
        };

        const auth = Buffer.from(`${integration.configuration.username}:${integration.configuration.apiToken}`).toString('base64');
        const url = `${integration.configuration.baseUrl}/rest/api/3/issue`;

        try {
            const response = await this.makeHTTPRequest('POST', url, {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }, issueData);

            this.loggingService.log(LogLevel.INFO, `JIRA issue created: ${response.key}`);
            return response;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to create JIRA issue: ${error}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to create JIRA issue: ${error}',
                    context: { integrationId, summary, error: error   }
                }
            );
            throw error;
        }
    }

    /**
     * Get all API configurations
     */
    getAllAPIConfigurations(): APIConfiguration[] {
        return Array.from(this.apiConfigurations.values());
    }

    /**
     * Get all webhook configurations
     */
    getAllWebhookConfigurations(): WebhookConfiguration[] {
        return Array.from(this.webhookConfigurations.values());
    }

    /**
     * Get all integration platforms
     */
    getAllIntegrationPlatforms(): IntegrationPlatform[] {
        return Array.from(this.integrationPlatforms.values());
    }

    /**
     * Get webhook events
     */
    getWebhookEvents(webhookId?: string): WebhookEvent[] {
        const events = Array.from(this.webhookEvents.values());
        return webhookId ? events.filter(e => e.webhookId === webhookId) : events;
    }

    /**
     * Get API calls
     */
    getAPICalls(apiId?: string): APICall[] {
        const calls = Array.from(this.apiCalls.values());
        return apiId ? calls.filter(c => c.apiId === apiId) : calls;
    }

    private buildUrl(baseUrl: string, path: string, parameters: { [key: string]: any }): string {
        let url = `${baseUrl}${path}`;
        const queryParams = new URLSearchParams();
        
        Object.entries(parameters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });

        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }

        return url;
    }

    private buildHeaders(authentication: APIAuthentication, endpoint: APIEndpoint): { [key: string]: string } {
        const headers: { [key: string]: string } = {
            'Content-Type': 'application/json',
            'User-Agent': 'Converge-Elavon-Migrator/1.0'
        };

        // Add authentication headers
        Object.entries(authentication.headers).forEach(([key, value]) => {
            headers[key] = value;
        });

        // Add endpoint-specific headers
        endpoint.parameters
            .filter(p => p.location === 'header')
            .forEach(param => {
                if (param.required) {
                    headers[param.name] = param.defaultValue || '';
                }
            });

        return headers;
    }

    private async executeAPICall(apiCall: APICall, config: APIConfiguration): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = new URL(apiCall.url);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: apiCall.method,
                headers: apiCall.headers,
                timeout: config.timeout
            };

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = {
                            statusCode: res.statusCode || 0,
                            headers: res.headers,
                            body: data ? JSON.parse(data) : null
                        };
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));

            if (apiCall.body) {
                req.write(JSON.stringify(apiCall.body));
            }

            req.end();
        });
    }

    private async sendWebhookAsync(event: WebhookEvent, config: WebhookConfiguration): Promise<void> {
        try {
            event.attempts++;
            event.lastAttempt = new Date();
            event.status = 'sent';

            const payload = this.buildWebhookPayload(event, config);
            await this.sendWebhookRequest(config.url, payload, config.headers);

            event.status = 'sent';
            this.loggingService.log(LogLevel.INFO, `Webhook sent successfully: ${event.id}`);

        } catch (error) {
            event.status = 'failed';
            event.error = error instanceof Error ? error.message : String(error);

            if (event.attempts < config.retryPolicy.maxAttempts) {
                event.status = 'retrying';
                const delay = Math.min(
                    config.retryPolicy.baseDelay * Math.pow(config.retryPolicy.backoffMultiplier, event.attempts - 1),
                    config.retryPolicy.maxDelay
                );
                event.nextAttempt = new Date(Date.now() + delay);

                // Schedule retry
                setTimeout(() => {
                    this.sendWebhookAsync(event, config);
                }, delay);
            }

            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Webhook send failed: ${event.id}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Webhook send failed: ${event.id}',
                    context: { event, config, error: error   }
                }
            );
        }

        await this.saveWebhookEvents();
    }

    private buildWebhookPayload(event: WebhookEvent, config: WebhookConfiguration): any {
        const basePayload = {
            eventType: event.eventType,
            timestamp: event.timestamp.toISOString(),
            data: event.payload
        };

        if (config.payload.format === 'json') {
            return basePayload;
        } else if (config.payload.format === 'xml') {
            // Convert to XML format
            return this.convertToXML(basePayload);
        } else if (config.payload.format === 'form') {
            // Convert to form data
            return this.convertToFormData(basePayload);
        } else {
            // Custom format using template
            return this.applyTemplate(config.payload.template, basePayload);
        }
    }

    private async sendWebhookRequest(url: string, payload: any, headers: { [key: string]: string } = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    }

    private async makeHTTPRequest(method: string, url: string, headers: { [key: string]: string }, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method,
                headers
            };

            const client = urlObj.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = {
                            statusCode: res.statusCode || 0,
                            headers: res.headers,
                            body: data ? JSON.parse(data) : null
                        };
                        resolve(response.body);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    private convertToXML(obj: any): string {
        // Simple XML conversion - in production, use a proper XML library
        return `<root>${JSON.stringify(obj)}</root>`;
    }

    private convertToFormData(obj: any): string {
        const formData = new URLSearchParams();
        Object.entries(obj).forEach(([key, value]) => {
            formData.append(key, String(value));
        });
        return formData.toString();
    }

    private applyTemplate(template: string, data: any): any {
        // Simple template replacement - in production, use a proper templating engine
        let result = template;
        Object.entries(data).forEach(([key, value]) => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
        return result;
    }

    private async saveAPIConfigurations(): Promise<void> {
        const data = Array.from(this.apiConfigurations.values());
        await this.context.globalState.update('apiConfigurations', data);
    }

    private async saveWebhookConfigurations(): Promise<void> {
        const data = Array.from(this.webhookConfigurations.values());
        await this.context.globalState.update('webhookConfigurations', data);
    }

    private async saveWebhookEvents(): Promise<void> {
        const data = Array.from(this.webhookEvents.values());
        await this.context.globalState.update('webhookEvents', data);
    }

    private async saveAPICalls(): Promise<void> {
        const data = Array.from(this.apiCalls.values());
        await this.context.globalState.update('apiCalls', data);
    }

    private async saveIntegrationPlatforms(): Promise<void> {
        const data = Array.from(this.integrationPlatforms.values());
        await this.context.globalState.update('integrationPlatforms', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
