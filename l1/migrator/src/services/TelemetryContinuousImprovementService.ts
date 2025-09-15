import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface TelemetryEvent {
    id: string;
    name: string;
    category: 'user-action' | 'system-event' | 'performance' | 'error' | 'feature-usage' | 'custom';
    properties: Record<string, any>;
    measurements: Record<string, number>;
    timestamp: Date;
    userId?: string;
    sessionId: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    privacy: 'public' | 'internal' | 'sensitive' | 'confidential';
}

export interface UserSession {
    id: string;
    userId?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    events: string[]; // Event IDs
    properties: Record<string, any>;
    environment: string;
    version: string;
    platform: string;
    language: string;
    timezone: string;
    active: boolean;
}

export interface FeatureUsage {
    featureId: string;
    featureName: string;
    userId?: string;
    usageCount: number;
    lastUsed: Date;
    firstUsed: Date;
    totalTime: number; // in seconds
    averageTime: number; // in seconds
    successRate: number;
    errorRate: number;
    satisfaction?: number;
    feedback?: string;
    properties: Record<string, any>;
}

export interface PerformanceMetrics {
    metricId: string;
    metricName: string;
    value: number;
    unit: string;
    timestamp: Date;
    category: 'response-time' | 'memory-usage' | 'cpu-usage' | 'disk-usage' | 'network' | 'custom';
    source: string;
    environment: string;
    version: string;
    properties: Record<string, any>;
}

export interface ErrorTelemetry {
    errorId: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
    userId?: string;
    sessionId: string;
    timestamp: Date;
    source: string;
    version: string;
    environment: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
    resolved: boolean;
    properties: Record<string, any>;
}

export interface UserFeedback {
    id: string;
    userId?: string;
    type: 'rating' | 'comment' | 'suggestion' | 'bug-report' | 'feature-request';
    rating?: number;
    comment?: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'reviewed' | 'in-progress' | 'resolved' | 'rejected';
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
    properties: Record<string, any>;
}

export interface AnalyticsReport {
    id: string;
    name: string;
    type: 'usage' | 'performance' | 'error' | 'feature' | 'user' | 'custom';
    period: {
        start: Date;
        end: Date;
    };
    metrics: AnalyticsMetric[];
    insights: AnalyticsInsight[];
    recommendations: AnalyticsRecommendation[];
    generatedAt: Date;
    generatedBy: string;
    status: 'generating' | 'completed' | 'failed';
}

export interface AnalyticsMetric {
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    changePercent: number;
    category: string;
    description: string;
}

export interface AnalyticsInsight {
    id: string;
    title: string;
    description: string;
    type: 'trend' | 'anomaly' | 'pattern' | 'correlation' | 'prediction';
    confidence: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    data: any;
    actionable: boolean;
    createdAt: Date;
}

export interface AnalyticsRecommendation {
    id: string;
    title: string;
    description: string;
    type: 'optimization' | 'feature' | 'fix' | 'enhancement' | 'removal';
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    status: 'pending' | 'in-progress' | 'completed' | 'rejected';
    assignedTo?: string;
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    properties: Record<string, any>;
}

export interface AITrainingData {
    id: string;
    type: 'migration-pattern' | 'user-behavior' | 'error-pattern' | 'performance-pattern' | 'custom';
    input: any;
    output: any;
    quality: number;
    verified: boolean;
    source: string;
    timestamp: Date;
    properties: Record<string, any>;
}

export interface ModelPerformance {
    modelId: string;
    modelName: string;
    version: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    trainingDataSize: number;
    lastTrained: Date;
    performance: ModelPerformanceMetrics;
    status: 'training' | 'ready' | 'deployed' | 'retired' | 'failed';
}

export interface ModelPerformanceMetrics {
    responseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
    memoryUsage: number;
    cpuUsage: number;
}

export interface ContinuousImprovementPlan {
    id: string;
    name: string;
    description: string;
    objectives: string[];
    metrics: string[];
    timeline: {
        start: Date;
        end: Date;
        milestones: Milestone[];
    };
    status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    owner: string;
    team: string[];
    progress: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Milestone {
    id: string;
    name: string;
    description: string;
    dueDate: Date;
    status: 'pending' | 'in-progress' | 'completed' | 'overdue';
    deliverables: string[];
    successCriteria: string[];
}

export interface Experiment {
    id: string;
    name: string;
    description: string;
    hypothesis: string;
    type: 'a-b' | 'multivariate' | 'feature-flag' | 'canary' | 'custom';
    status: 'draft' | 'running' | 'completed' | 'cancelled';
    startDate: Date;
    endDate?: Date;
    variants: ExperimentVariant[];
    metrics: string[];
    successCriteria: string[];
    results?: ExperimentResults;
    owner: string;
    team: string[];
}

export interface ExperimentVariant {
    id: string;
    name: string;
    description: string;
    configuration: Record<string, any>;
    trafficPercentage: number;
    users: string[];
}

export interface ExperimentResults {
    variant: string;
    metrics: Record<string, number>;
    significance: number;
    confidence: number;
    winner?: string;
    insights: string[];
    recommendations: string[];
}

export class TelemetryContinuousImprovementService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private telemetryEvents: Map<string, TelemetryEvent> = new Map();
    private userSessions: Map<string, UserSession> = new Map();
    private featureUsage: Map<string, FeatureUsage> = new Map();
    private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
    private errorTelemetry: Map<string, ErrorTelemetry> = new Map();
    private userFeedback: Map<string, UserFeedback> = new Map();
    private analyticsReports: Map<string, AnalyticsReport> = new Map();
    private aiTrainingData: Map<string, AITrainingData> = new Map();
    private modelPerformance: Map<string, ModelPerformance> = new Map();
    private improvementPlans: Map<string, ContinuousImprovementPlan> = new Map();
    private experiments: Map<string, Experiment> = new Map();
    private currentSessionId: string;
    private telemetryEnabled: boolean = true;
    private privacyMode: boolean = false;

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.currentSessionId = this.generateId();
        this.initializeTelemetry();
    }

    /**
     * Telemetry collection
     */
    async trackEvent(
        name: string,
        category: 'user-action' | 'system-event' | 'performance' | 'error' | 'feature-usage' | 'custom',
        properties: Record<string, any> = {},
        measurements: Record<string, number> = {},
        severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
        privacy: 'public' | 'internal' | 'sensitive' | 'confidential' = 'internal'
    ): Promise<void> {
        if (!this.telemetryEnabled || this.privacyMode) {
            return;
        }

        this.loggingService.log(LogLevel.DEBUG, `Tracking event: ${name}`);

        const event: TelemetryEvent = {
            id: this.generateId(),
            name,
            category,
            properties: this.sanitizeProperties(properties, privacy),
            measurements,
            timestamp: new Date(),
            sessionId: this.currentSessionId,
            version: this.getExtensionVersion(),
            environment: this.getEnvironment(),
            source: 'extension',
            severity,
            privacy
        };

        this.telemetryEvents.set(event.id, event);
        await this.saveTelemetryEvents();

        // Update feature usage if applicable
        if (category === 'feature-usage') {
            await this.updateFeatureUsage(name, properties);
        }
    }

    async trackPerformance(
        metricName: string,
        value: number,
        unit: string,
        category: 'response-time' | 'memory-usage' | 'cpu-usage' | 'disk-usage' | 'network' | 'custom',
        properties: Record<string, any> = {}
    ): Promise<void> {
        if (!this.telemetryEnabled) {
            return;
        }

        this.loggingService.log(LogLevel.DEBUG, `Tracking performance metric: ${metricName}`);

        const metric: PerformanceMetrics = {
            metricId: this.generateId(),
            metricName,
            value,
            unit,
            timestamp: new Date(),
            category,
            source: 'extension',
            environment: this.getEnvironment(),
            version: this.getExtensionVersion(),
            properties: this.sanitizeProperties(properties, 'internal')
        };

        this.performanceMetrics.set(metric.metricId, metric);
        await this.savePerformanceMetrics();
    }

    async trackError(
        errorType: string,
        errorMessage: string,
        stackTrace?: string,
        properties: Record<string, any> = {},
        severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ): Promise<void> {
        this.loggingService.log(LogLevel.ERROR, `Tracking error: ${errorType}`);

        const errorId = this.generateId();
        const error: ErrorTelemetry = {
            errorId,
            errorType,
            errorMessage,
            stackTrace: stackTrace || '',
            sessionId: this.currentSessionId,
            timestamp: new Date(),
            source: 'extension',
            version: this.getExtensionVersion(),
            environment: this.getEnvironment(),
            severity,
            frequency: 1,
            firstOccurrence: new Date(),
            lastOccurrence: new Date(),
            resolved: false,
            properties: this.sanitizeProperties(properties, 'sensitive')
        };

        this.errorTelemetry.set(errorId, error);
        await this.saveErrorTelemetry();

        // Also track as a telemetry event
        await this.trackEvent(
            'error-occurred',
            'error',
            { errorType, errorMessage, severity },
            {},
            severity,
            'sensitive'
        );
    }

    /**
     * User session management
     */
    async startSession(userId?: string): Promise<UserSession> {
        this.loggingService.log(LogLevel.INFO, 'Starting user session');

        const session: UserSession = {
            id: this.currentSessionId,
            userId: userId || '',
            startTime: new Date(),
            events: [],
            properties: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            },
            environment: this.getEnvironment(),
            version: this.getExtensionVersion(),
            platform: process.platform,
            language: vscode.env.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            active: true
        };

        this.userSessions.set(session.id, session);
        await this.saveUserSessions();

        return session;
    }

    async endSession(): Promise<void> {
        this.loggingService.log(LogLevel.INFO, 'Ending user session');

        const session = this.userSessions.get(this.currentSessionId);
        if (session) {
            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();
            session.active = false;
            this.userSessions.set(session.id, session);
            await this.saveUserSessions();
        }

        this.currentSessionId = this.generateId();
    }

    /**
     * Feature usage tracking
     */
    private async updateFeatureUsage(featureName: string, properties: Record<string, any>): Promise<void> {
        const featureId = this.generateFeatureId(featureName);
        let usage = this.featureUsage.get(featureId);

        if (!usage) {
            usage = {
                featureId,
                featureName,
                usageCount: 0,
                lastUsed: new Date(),
                firstUsed: new Date(),
                totalTime: 0,
                averageTime: 0,
                successRate: 100,
                errorRate: 0,
                properties: {}
            };
        }

        usage.usageCount++;
        usage.lastUsed = new Date();
        usage.properties = { ...usage.properties, ...properties };

        this.featureUsage.set(featureId, usage);
        await this.saveFeatureUsage();
    }

    /**
     * Analytics and reporting
     */
    async generateAnalyticsReport(
        type: 'usage' | 'performance' | 'error' | 'feature' | 'user' | 'custom',
        period: { start: Date; end: Date },
        metrics: string[]
    ): Promise<AnalyticsReport> {
        this.loggingService.log(LogLevel.INFO, `Generating analytics report: ${type}`);

        const report: AnalyticsReport = {
            id: this.generateId(),
            name: `${type} Analytics Report`,
            type,
            period,
            metrics: [],
            insights: [],
            recommendations: [],
            generatedAt: new Date(),
            generatedBy: 'system',
            status: 'generating'
        };

        this.analyticsReports.set(report.id, report);
        await this.saveAnalyticsReports();

        try {
            await this.processAnalyticsReport(report, metrics);
            report.status = 'completed';
        } catch (error) {
            report.status = 'failed';
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to generate analytics report'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to generate analytics report',
                    context: {  reportId: report.id, error  }
                }
            );
        }

        await this.saveAnalyticsReports();
        return report;
    }

    /**
     * AI training data collection
     */
    async collectTrainingData(
        type: 'migration-pattern' | 'user-behavior' | 'error-pattern' | 'performance-pattern' | 'custom',
        input: any,
        output: any,
        quality: number = 1.0,
        verified: boolean = false,
        source: string = 'extension'
    ): Promise<void> {
        this.loggingService.log(LogLevel.DEBUG, `Collecting training data: ${type}`);

        const trainingData: AITrainingData = {
            id: this.generateId(),
            type,
            input: this.sanitizeProperties(input, 'sensitive'),
            output: this.sanitizeProperties(output, 'sensitive'),
            quality,
            verified,
            source,
            timestamp: new Date(),
            properties: {}
        };

        this.aiTrainingData.set(trainingData.id, trainingData);
        await this.saveAITrainingData();
    }

    /**
     * Continuous improvement planning
     */
    async createImprovementPlan(
        name: string,
        description: string,
        objectives: string[],
        metrics: string[],
        timeline: { start: Date; end: Date; milestones: Milestone[] },
        priority: 'low' | 'medium' | 'high' | 'critical',
        owner: string,
        team: string[]
    ): Promise<ContinuousImprovementPlan> {
        this.loggingService.log(LogLevel.INFO, `Creating improvement plan: ${name}`);

        const plan: ContinuousImprovementPlan = {
            id: this.generateId(),
            name,
            description,
            objectives,
            metrics,
            timeline,
            status: 'planning',
            priority,
            owner,
            team,
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.improvementPlans.set(plan.id, plan);
        await this.saveImprovementPlans();

        return plan;
    }

    /**
     * A/B testing and experiments
     */
    async createExperiment(
        name: string,
        description: string,
        hypothesis: string,
        type: 'a-b' | 'multivariate' | 'feature-flag' | 'canary' | 'custom',
        variants: ExperimentVariant[],
        metrics: string[],
        successCriteria: string[],
        owner: string,
        team: string[]
    ): Promise<Experiment> {
        this.loggingService.log(LogLevel.INFO, `Creating experiment: ${name}`);

        const experiment: Experiment = {
            id: this.generateId(),
            name,
            description,
            hypothesis,
            type,
            status: 'draft',
            startDate: new Date(),
            variants,
            metrics,
            successCriteria,
            owner,
            team
        };

        this.experiments.set(experiment.id, experiment);
        await this.saveExperiments();

        return experiment;
    }

    /**
     * Get analytics data
     */
    getAnalyticsData(): {
        totalEvents: number;
        totalSessions: number;
        activeUsers: number;
        featureUsage: FeatureUsage[];
        performanceMetrics: PerformanceMetrics[];
        errorRate: number;
        averageSessionDuration: number;
        topFeatures: string[];
        recentErrors: ErrorTelemetry[];
    } {
        const events = Array.from(this.telemetryEvents.values());
        const sessions = Array.from(this.userSessions.values());
        const features = Array.from(this.featureUsage.values());
        const performance = Array.from(this.performanceMetrics.values());
        const errors = Array.from(this.errorTelemetry.values());

        const totalEvents = events.length;
        const totalSessions = sessions.length;
        const activeUsers = sessions.filter(s => s.active).length;
        const errorRate = events.filter(e => e.category === 'error').length / totalEvents;
        const averageSessionDuration = sessions
            .filter(s => s.duration)
            .reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;

        const topFeatures = features
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10)
            .map(f => f.featureName);

        const recentErrors = errors
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

        return {
            totalEvents,
            totalSessions,
            activeUsers,
            featureUsage: features,
            performanceMetrics: performance,
            errorRate,
            averageSessionDuration,
            topFeatures,
            recentErrors
        };
    }

    /**
     * Get user feedback
     */
    getUserFeedback(): UserFeedback[] {
        return Array.from(this.userFeedback.values());
    }

    /**
     * Get improvement plans
     */
    getImprovementPlans(): ContinuousImprovementPlan[] {
        return Array.from(this.improvementPlans.values());
    }

    /**
     * Get experiments
     */
    getExperiments(): Experiment[] {
        return Array.from(this.experiments.values());
    }

    /**
     * Privacy and compliance
     */
    setPrivacyMode(enabled: boolean): void {
        this.privacyMode = enabled;
        this.loggingService.log(LogLevel.INFO, `Privacy mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    setTelemetryEnabled(enabled: boolean): void {
        this.telemetryEnabled = enabled;
        this.loggingService.log(LogLevel.INFO, `Telemetry ${enabled ? 'enabled' : 'disabled'}`);
    }

    async exportUserData(userId: string): Promise<any> {
        this.loggingService.log(LogLevel.INFO, `Exporting user data for: ${userId}`);

        const userEvents = Array.from(this.telemetryEvents.values())
            .filter(e => e.userId === userId);
        const userSessions = Array.from(this.userSessions.values())
            .filter(s => s.userId === userId);
        const userFeedback = Array.from(this.userFeedback.values())
            .filter(f => f.userId === userId);

        return {
            events: userEvents,
            sessions: userSessions,
            feedback: userFeedback,
            exportedAt: new Date()
        };
    }

    async deleteUserData(userId: string): Promise<void> {
        this.loggingService.log(LogLevel.INFO, `Deleting user data for: ${userId}`);

        // Remove user events
        for (const [id, event] of this.telemetryEvents.entries()) {
            if (event.userId === userId) {
                this.telemetryEvents.delete(id);
            }
        }

        // Remove user sessions
        for (const [id, session] of this.userSessions.entries()) {
            if (session.userId === userId) {
                this.userSessions.delete(id);
            }
        }

        // Remove user feedback
        for (const [id, feedback] of this.userFeedback.entries()) {
            if (feedback.userId === userId) {
                this.userFeedback.delete(id);
            }
        }

        await this.saveTelemetryEvents();
        await this.saveUserSessions();
        await this.saveUserFeedback();
    }

    private async processAnalyticsReport(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Process analytics data based on report type
        switch (report.type) {
            case 'usage':
                await this.processUsageAnalytics(report, metrics);
                break;
            case 'performance':
                await this.processPerformanceAnalytics(report, metrics);
                break;
            case 'error':
                await this.processErrorAnalytics(report, metrics);
                break;
            case 'feature':
                await this.processFeatureAnalytics(report, metrics);
                break;
            case 'user':
                await this.processUserAnalytics(report, metrics);
                break;
            default:
                await this.processCustomAnalytics(report, metrics);
        }
    }

    private async processUsageAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement usage analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing usage analytics');
    }

    private async processPerformanceAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement performance analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing performance analytics');
    }

    private async processErrorAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement error analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing error analytics');
    }

    private async processFeatureAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement feature analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing feature analytics');
    }

    private async processUserAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement user analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing user analytics');
    }

    private async processCustomAnalytics(report: AnalyticsReport, metrics: string[]): Promise<void> {
        // Implement custom analytics processing
        this.loggingService.log(LogLevel.DEBUG, 'Processing custom analytics');
    }

    private sanitizeProperties(properties: Record<string, any>, privacy: string): Record<string, any> {
        if (privacy === 'public') {
            return properties;
        }

        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(properties)) {
            if (this.isSensitiveData(key, value)) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    private isSensitiveData(key: string, value: any): boolean {
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential', 'auth'];
        return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
    }

    private generateFeatureId(featureName: string): string {
        return `feature-${featureName.toLowerCase().replace(/\s+/g, '-')}`;
    }

    private getExtensionVersion(): string {
        return this.context.extension.packageJSON.version;
    }

    private getEnvironment(): 'development' | 'staging' | 'production' {
        // In a real implementation, this would be determined by configuration
        return 'development';
    }

    private initializeTelemetry(): void {
        this.loggingService.log(LogLevel.INFO, 'Initializing telemetry service');
        // Initialize any required telemetry components
    }

    private async saveTelemetryEvents(): Promise<void> {
        const data = Array.from(this.telemetryEvents.values());
        await this.context.globalState.update('telemetryEvents', data);
    }

    private async saveUserSessions(): Promise<void> {
        const data = Array.from(this.userSessions.values());
        await this.context.globalState.update('userSessions', data);
    }

    private async saveFeatureUsage(): Promise<void> {
        const data = Array.from(this.featureUsage.values());
        await this.context.globalState.update('featureUsage', data);
    }

    private async savePerformanceMetrics(): Promise<void> {
        const data = Array.from(this.performanceMetrics.values());
        await this.context.globalState.update('performanceMetrics', data);
    }

    private async saveErrorTelemetry(): Promise<void> {
        const data = Array.from(this.errorTelemetry.values());
        await this.context.globalState.update('errorTelemetry', data);
    }

    private async saveUserFeedback(): Promise<void> {
        const data = Array.from(this.userFeedback.values());
        await this.context.globalState.update('userFeedback', data);
    }

    private async saveAnalyticsReports(): Promise<void> {
        const data = Array.from(this.analyticsReports.values());
        await this.context.globalState.update('analyticsReports', data);
    }

    private async saveAITrainingData(): Promise<void> {
        const data = Array.from(this.aiTrainingData.values());
        await this.context.globalState.update('aiTrainingData', data);
    }

    private async saveImprovementPlans(): Promise<void> {
        const data = Array.from(this.improvementPlans.values());
        await this.context.globalState.update('improvementPlans', data);
    }

    private async saveExperiments(): Promise<void> {
        const data = Array.from(this.experiments.values());
        await this.context.globalState.update('experiments', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
