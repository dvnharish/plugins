import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface MigrationMetrics {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    successRate: number;
    averageMigrationTime: number;
    totalMigrationTime: number;
    migrationsByLanguage: { [language: string]: number };
    migrationsByEndpoint: { [endpoint: string]: number };
    migrationsByUser: { [user: string]: number };
    migrationsByDate: { [date: string]: number };
    averageDuration: number;
    mostMigratedEndpoints: string[];
    recentMigrations: any[];
}

export interface PerformanceMetrics {
    averageResponseTime: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
    throughput: number;
    latency: number;
    errorRate: number;
    uptime: number;
}

export interface UsageAnalytics {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    featureUsage: { [feature: string]: number };
    commandUsage: { [command: string]: number };
    panelUsage: { [panel: string]: number };
    userRetention: { [period: string]: number };
    errorRate: number;
    satisfactionScore: number;
}

export interface OptimizationRecommendation {
    id: string;
    type: 'performance' | 'usability' | 'security' | 'maintenance';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    priority: number;
    metrics: { [key: string]: number };
    suggestions: string[];
    implementation: string;
}

export interface HealthStatus {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    responseTime: number;
    errorRate: number;
    uptime: number;
    issues: HealthIssue[];
}

export interface HealthIssue {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolution?: string;
}

export interface AnalyticsReport {
    id: string;
    type: 'migration' | 'performance' | 'usage' | 'health' | 'comprehensive';
    generatedAt: Date;
    period: {
        start: Date;
        end: Date;
    };
    data: any;
    summary: string;
    recommendations: OptimizationRecommendation[];
    charts: ChartData[];
}

export interface ChartData {
    type: 'line' | 'bar' | 'pie' | 'scatter';
    title: string;
    data: any[];
    xAxis: string;
    yAxis: string;
    labels: string[];
}

export interface TelemetryEvent {
    id: string;
    type: string;
    timestamp: Date;
    userId: string;
    sessionId: string;
    properties: { [key: string]: any };
    metrics: { [key: string]: number };
}

export class MonitoringAnalyticsService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private migrationMetrics: MigrationMetrics;
    private performanceMetrics: PerformanceMetrics;
    private usageAnalytics: UsageAnalytics;
    private healthStatuses: Map<string, HealthStatus> = new Map();
    private telemetryEvents: TelemetryEvent[] = [];
    private optimizationRecommendations: OptimizationRecommendation[] = [];

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.migrationMetrics = {
            totalMigrations: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            successRate: 0,
            averageMigrationTime: 0,
            totalMigrationTime: 0,
            migrationsByLanguage: {},
            migrationsByEndpoint: {},
            migrationsByUser: {},
            migrationsByDate: {},
            averageDuration: 0,
            mostMigratedEndpoints: [],
            recentMigrations: []
        };
        this.performanceMetrics = {
            averageResponseTime: 0,
            averageMemoryUsage: 0,
            averageCpuUsage: 0,
            peakMemoryUsage: 0,
            peakCpuUsage: 0,
            throughput: 0,
            latency: 0,
            errorRate: 0,
            uptime: 0
        };
        this.usageAnalytics = {
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            averageSessionDuration: 0,
            featureUsage: {},
            commandUsage: {},
            panelUsage: {},
            userRetention: {},
            errorRate: 0,
            satisfactionScore: 0
        };
        this.initializeMetrics();
    }

    /**
     * Track migration success rate and analytics
     */
    async trackMigrationSuccess(
        migrationId: string,
        success: boolean,
        duration: number,
        language: string,
        endpoint: string,
        userId: string
    ): Promise<void> {
        this.loggingService.log(LogLevel.INFO, `Tracking migration success: ${migrationId}`);

        // Update migration metrics
        this.migrationMetrics.totalMigrations++;
        if (success) {
            this.migrationMetrics.successfulMigrations++;
        } else {
            this.migrationMetrics.failedMigrations++;
        }

        this.migrationMetrics.successRate = 
            (this.migrationMetrics.successfulMigrations / this.migrationMetrics.totalMigrations) * 100;

        this.migrationMetrics.totalMigrationTime += duration;
        this.migrationMetrics.averageMigrationTime = 
            this.migrationMetrics.totalMigrationTime / this.migrationMetrics.totalMigrations;

        // Update language metrics
        this.migrationMetrics.migrationsByLanguage[language] = 
            (this.migrationMetrics.migrationsByLanguage[language] || 0) + 1;

        // Update endpoint metrics
        this.migrationMetrics.migrationsByEndpoint[endpoint] = 
            (this.migrationMetrics.migrationsByEndpoint[endpoint] || 0) + 1;

        // Update user metrics
        this.migrationMetrics.migrationsByUser[userId] = 
            (this.migrationMetrics.migrationsByUser[userId] || 0) + 1;

        // Update date metrics
        const today = new Date().toISOString().split('T')[0];
        this.migrationMetrics.migrationsByDate[today] = 
            (this.migrationMetrics.migrationsByDate[today] || 0) + 1;

        await this.saveMigrationMetrics();
        await this.recordTelemetryEvent('migration_completed', {
            migrationId,
            success,
            duration,
            language,
            endpoint,
            userId
        });
    }

    /**
     * Track performance metrics for migration operations
     */
    async trackPerformanceMetrics(
        operation: string,
        responseTime: number,
        memoryUsage: number,
        cpuUsage: number
    ): Promise<void> {
        this.loggingService.log(LogLevel.INFO, `Tracking performance metrics for ${operation}`);

        // Update performance metrics
        this.performanceMetrics.averageResponseTime = 
            (this.performanceMetrics.averageResponseTime + responseTime) / 2;
        
        this.performanceMetrics.averageMemoryUsage = 
            (this.performanceMetrics.averageMemoryUsage + memoryUsage) / 2;
        
        this.performanceMetrics.averageCpuUsage = 
            (this.performanceMetrics.averageCpuUsage + cpuUsage) / 2;

        this.performanceMetrics.peakMemoryUsage = Math.max(
            this.performanceMetrics.peakMemoryUsage,
            memoryUsage
        );

        this.performanceMetrics.peakCpuUsage = Math.max(
            this.performanceMetrics.peakCpuUsage,
            cpuUsage
        );

        await this.savePerformanceMetrics();
        await this.recordTelemetryEvent('performance_metrics', {
            operation,
            responseTime,
            memoryUsage,
            cpuUsage
        });
    }

    /**
     * Track usage analytics
     */
    async trackUsageAnalytics(
        feature: string,
        command: string,
        panel: string,
        userId: string,
        sessionId: string,
        duration: number
    ): Promise<void> {
        this.loggingService.log(LogLevel.INFO, `Tracking usage analytics for ${feature}`);

        // Update feature usage
        this.usageAnalytics.featureUsage[feature] = 
            (this.usageAnalytics.featureUsage[feature] || 0) + 1;

        // Update command usage
        this.usageAnalytics.commandUsage[command] = 
            (this.usageAnalytics.commandUsage[command] || 0) + 1;

        // Update panel usage
        this.usageAnalytics.panelUsage[panel] = 
            (this.usageAnalytics.panelUsage[panel] || 0) + 1;

        // Update session duration
        this.usageAnalytics.averageSessionDuration = 
            (this.usageAnalytics.averageSessionDuration + duration) / 2;

        await this.saveUsageAnalytics();
        await this.recordTelemetryEvent('usage_analytics', {
            feature,
            command,
            panel,
            userId,
            sessionId,
            duration
        });
    }

    /**
     * Monitor health of Copilot and Elavon API integrations
     */
    async monitorServiceHealth(service: string): Promise<HealthStatus> {
        this.loggingService.log(LogLevel.INFO, `Monitoring health of ${service}`);

        const startTime = Date.now();
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let responseTime = 0;
        let errorRate = 0;
        const issues: HealthIssue[] = [];

        try {
            // Simulate health check
            if (service === 'copilot') {
                // Check Copilot API health
                responseTime = Date.now() - startTime;
                if (responseTime > 5000) {
                    status = 'degraded';
                    issues.push({
                        id: this.generateId(),
                        type: 'warning',
                        message: 'High response time detected',
                        timestamp: new Date(),
                        resolved: false
                    });
                }
            } else if (service === 'elavon') {
                // Check Elavon API health
                responseTime = Date.now() - startTime;
                if (responseTime > 3000) {
                    status = 'degraded';
                    issues.push({
                        id: this.generateId(),
                        type: 'warning',
                        message: 'Elavon API response time is high',
                        timestamp: new Date(),
                        resolved: false
                    });
                }
            }

            const healthStatus: HealthStatus = {
                service,
                status,
                lastCheck: new Date(),
                responseTime,
                errorRate,
                uptime: 99.9, // This would be calculated from actual uptime data
                issues
            };

            this.healthStatuses.set(service, healthStatus);
            await this.saveHealthStatuses();

            return healthStatus;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Health check failed for ${service}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Health check failed for ${service}',
                    context: { service, error: error   }
                }
            );

            const healthStatus: HealthStatus = {
                service,
                status: 'unhealthy',
                lastCheck: new Date(),
                responseTime: 0,
                errorRate: 100,
                uptime: 0,
                issues: [{
                    id: this.generateId(),
                    type: 'error',
                    message: `Health check failed: ${error}`,
                    timestamp: new Date(),
                    resolved: false
                }]
            };

            this.healthStatuses.set(service, healthStatus);
            await this.saveHealthStatuses();

            return healthStatus;
        }
    }

    /**
     * Generate optimization recommendations
     */
    async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
        this.loggingService.log(LogLevel.INFO, 'Generating optimization recommendations');

        const recommendations: OptimizationRecommendation[] = [];

        // Performance recommendations
        if (this.performanceMetrics.averageResponseTime > 2000) {
            recommendations.push({
                id: this.generateId(),
                type: 'performance',
                title: 'Optimize Response Time',
                description: 'Average response time is above 2 seconds',
                impact: 'high',
                effort: 'medium',
                priority: 1,
                metrics: { responseTime: this.performanceMetrics.averageResponseTime },
                suggestions: [
                    'Implement caching for frequently accessed data',
                    'Optimize database queries',
                    'Use connection pooling'
                ],
                implementation: 'Add Redis caching layer and optimize database queries'
            });
        }

        // Memory usage recommendations
        if (this.performanceMetrics.averageMemoryUsage > 100) {
            recommendations.push({
                id: this.generateId(),
                type: 'performance',
                title: 'Reduce Memory Usage',
                description: 'Memory usage is above 100MB',
                impact: 'medium',
                effort: 'low',
                priority: 2,
                metrics: { memoryUsage: this.performanceMetrics.averageMemoryUsage },
                suggestions: [
                    'Implement memory pooling',
                    'Optimize data structures',
                    'Add garbage collection tuning'
                ],
                implementation: 'Implement object pooling and optimize data structures'
            });
        }

        // Success rate recommendations
        if (this.migrationMetrics.successRate < 90) {
            recommendations.push({
                id: this.generateId(),
                type: 'usability',
                title: 'Improve Migration Success Rate',
                description: `Migration success rate is ${this.migrationMetrics.successRate.toFixed(1)}%`,
                impact: 'high',
                effort: 'high',
                priority: 1,
                metrics: { successRate: this.migrationMetrics.successRate },
                suggestions: [
                    'Improve error handling',
                    'Add better validation',
                    'Provide clearer error messages'
                ],
                implementation: 'Enhance error handling and validation logic'
            });
        }

        this.optimizationRecommendations = recommendations;
        await this.saveOptimizationRecommendations();

        return recommendations;
    }

    /**
     * Generate analytics report
     */
    async generateAnalyticsReport(
        type: 'migration' | 'performance' | 'usage' | 'health' | 'comprehensive',
        period: { start: Date; end: Date }
    ): Promise<AnalyticsReport> {
        this.loggingService.log(LogLevel.INFO, `Generating ${type} analytics report`);

        const report: AnalyticsReport = {
            id: this.generateId(),
            type,
            generatedAt: new Date(),
            period,
            data: await this.getReportData(type, period),
            summary: await this.generateReportSummary(type),
            recommendations: this.optimizationRecommendations,
            charts: await this.generateCharts(type, period)
        };

        await this.saveAnalyticsReport(report);
        return report;
    }

    /**
     * Get migration metrics
     */
    getMigrationMetrics(): MigrationMetrics {
        return this.migrationMetrics;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return this.performanceMetrics;
    }

    /**
     * Get usage analytics
     */
    getUsageAnalytics(): UsageAnalytics {
        return this.usageAnalytics;
    }

    /**
     * Get health status for all services
     */
    getAllHealthStatuses(): HealthStatus[] {
        return Array.from(this.healthStatuses.values());
    }

    /**
     * Get optimization recommendations
     */
    getOptimizationRecommendations(): OptimizationRecommendation[] {
        return this.optimizationRecommendations;
    }

    private initializeMetrics(): void {
        this.migrationMetrics = {
            totalMigrations: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            successRate: 0,
            averageMigrationTime: 0,
            totalMigrationTime: 0,
            migrationsByLanguage: {},
            migrationsByEndpoint: {},
            migrationsByUser: {},
            migrationsByDate: {},
            averageDuration: 0,
            mostMigratedEndpoints: [],
            recentMigrations: []
        };

        this.performanceMetrics = {
            averageResponseTime: 0,
            averageMemoryUsage: 0,
            averageCpuUsage: 0,
            peakMemoryUsage: 0,
            peakCpuUsage: 0,
            throughput: 0,
            latency: 0,
            errorRate: 0,
            uptime: 100
        };

        this.usageAnalytics = {
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            averageSessionDuration: 0,
            featureUsage: {},
            commandUsage: {},
            panelUsage: {},
            userRetention: {},
            errorRate: 0,
            satisfactionScore: 0
        };
    }

    private async recordTelemetryEvent(type: string, properties: { [key: string]: any }): Promise<void> {
        const event: TelemetryEvent = {
            id: this.generateId(),
            type,
            timestamp: new Date(),
            userId: properties.userId || 'anonymous',
            sessionId: properties.sessionId || 'unknown',
            properties,
            metrics: {}
        };

        this.telemetryEvents.push(event);
        
        // Keep only last 1000 events to prevent memory issues
        if (this.telemetryEvents.length > 1000) {
            this.telemetryEvents = this.telemetryEvents.slice(-1000);
        }

        await this.saveTelemetryEvents();
    }

    private async getReportData(type: string, period: { start: Date; end: Date }): Promise<any> {
        switch (type) {
            case 'migration':
                return this.migrationMetrics;
            case 'performance':
                return this.performanceMetrics;
            case 'usage':
                return this.usageAnalytics;
            case 'health':
                return Array.from(this.healthStatuses.values());
            case 'comprehensive':
                return {
                    migration: this.migrationMetrics,
                    performance: this.performanceMetrics,
                    usage: this.usageAnalytics,
                    health: Array.from(this.healthStatuses.values())
                };
            default:
                return {};
        }
    }

    private async generateReportSummary(type: string): Promise<string> {
        switch (type) {
            case 'migration':
                return `Migration success rate: ${this.migrationMetrics.successRate.toFixed(1)}% (${this.migrationMetrics.successfulMigrations}/${this.migrationMetrics.totalMigrations})`;
            case 'performance':
                return `Average response time: ${this.performanceMetrics.averageResponseTime.toFixed(0)}ms, Memory usage: ${this.performanceMetrics.averageMemoryUsage.toFixed(1)}MB`;
            case 'usage':
                return `Active users: ${this.usageAnalytics.activeUsers}, Total sessions: ${this.usageAnalytics.totalSessions}`;
            case 'health': {
                const healthyServices = Array.from(this.healthStatuses.values()).filter(s => s.status === 'healthy').length;
                const totalServices = this.healthStatuses.size;
                return `${healthyServices}/${totalServices} services are healthy`;
            }
            case 'comprehensive':
                return `Comprehensive report covering migration, performance, usage, and health metrics`;
            default:
                return 'No summary available';
        }
    }

    private async generateCharts(type: string, period: { start: Date; end: Date }): Promise<ChartData[]> {
        const charts: ChartData[] = [];

        if (type === 'migration' || type === 'comprehensive') {
            charts.push({
                type: 'line',
                title: 'Migration Success Rate Over Time',
                data: Object.entries(this.migrationMetrics.migrationsByDate).map(([date, count]) => ({ date, count })),
                xAxis: 'Date',
                yAxis: 'Count',
                labels: Object.keys(this.migrationMetrics.migrationsByDate)
            });

            charts.push({
                type: 'pie',
                title: 'Migrations by Language',
                data: Object.entries(this.migrationMetrics.migrationsByLanguage).map(([language, count]) => ({ language, count })),
                xAxis: 'Language',
                yAxis: 'Count',
                labels: Object.keys(this.migrationMetrics.migrationsByLanguage)
            });
        }

        if (type === 'performance' || type === 'comprehensive') {
            charts.push({
                type: 'bar',
                title: 'Performance Metrics',
                data: [
                    { metric: 'Response Time', value: this.performanceMetrics.averageResponseTime },
                    { metric: 'Memory Usage', value: this.performanceMetrics.averageMemoryUsage },
                    { metric: 'CPU Usage', value: this.performanceMetrics.averageCpuUsage }
                ],
                xAxis: 'Metric',
                yAxis: 'Value',
                labels: ['Response Time', 'Memory Usage', 'CPU Usage']
            });
        }

        return charts;
    }

    private async saveMigrationMetrics(): Promise<void> {
        await this.context.globalState.update('migrationMetrics', this.migrationMetrics);
    }

    private async savePerformanceMetrics(): Promise<void> {
        await this.context.globalState.update('performanceMetrics', this.performanceMetrics);
    }

    private async saveUsageAnalytics(): Promise<void> {
        await this.context.globalState.update('usageAnalytics', this.usageAnalytics);
    }

    private async saveHealthStatuses(): Promise<void> {
        const data = Array.from(this.healthStatuses.entries());
        await this.context.globalState.update('healthStatuses', data);
    }

    private async saveTelemetryEvents(): Promise<void> {
        await this.context.globalState.update('telemetryEvents', this.telemetryEvents);
    }

    private async saveOptimizationRecommendations(): Promise<void> {
        await this.context.globalState.update('optimizationRecommendations', this.optimizationRecommendations);
    }

    private async saveAnalyticsReport(report: AnalyticsReport): Promise<void> {
        const reports = await this.context.globalState.get<AnalyticsReport[]>('analyticsReports', []);
        reports.push(report);
        await this.context.globalState.update('analyticsReports', reports);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
