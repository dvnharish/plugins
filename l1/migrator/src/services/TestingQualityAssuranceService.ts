import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface TestCase {
    id: string;
    name: string;
    description: string;
    type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility';
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'blocked';
    tags: string[];
    steps: TestStep[];
    expectedResult: string;
    actualResult?: string;
    duration?: number;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    lastRun?: Date;
    runCount: number;
    passRate: number;
    flaky: boolean;
    environment: TestEnvironment;
    dependencies: string[];
    data: any;
}

export interface TestStep {
    id: string;
    description: string;
    action: string;
    expected: string;
    actual?: string;
    status: 'pending' | 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
    screenshot?: string;
    logs?: string[];
}

export interface TestEnvironment {
    name: string;
    description: string;
    os: string;
    browser?: string;
    version: string;
    configuration: Record<string, any>;
    variables: Record<string, string>;
}

export interface TestSuite {
    id: string;
    name: string;
    description: string;
    type: 'smoke' | 'regression' | 'sanity' | 'functional' | 'non-functional';
    testCases: string[]; // Test case IDs
    status: 'pending' | 'running' | 'completed' | 'failed';
    environment: TestEnvironment;
    schedule: TestSchedule;
    parallel: boolean;
    retryCount: number;
    timeout: number;
    createdAt: Date;
    updatedAt: Date;
    lastRun?: Date;
    statistics: TestSuiteStatistics;
}

export interface TestSchedule {
    type: 'manual' | 'scheduled' | 'triggered' | 'continuous';
    cron?: string;
    trigger?: string;
    enabled: boolean;
}

export interface TestSuiteStatistics {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
    duration: number;
    passRate: number;
    averageDuration: number;
    flakyTests: number;
    newFailures: number;
    fixedTests: number;
}

export interface TestReport {
    id: string;
    name: string;
    type: 'test-run' | 'coverage' | 'performance' | 'security' | 'comprehensive';
    testSuiteId: string;
    environment: TestEnvironment;
    status: 'generating' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    duration?: number;
    summary: TestSummary;
    details: TestDetails;
    artifacts: TestArtifact[];
    trends: TestTrend[];
    recommendations: string[];
    createdAt: Date;
}

export interface TestSummary {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
    passRate: number;
    duration: number;
    coverage: CoverageMetrics;
    performance: PerformanceMetrics;
    security: SecurityMetrics;
    accessibility: AccessibilityMetrics;
}

export interface TestDetails {
    testCases: TestCase[];
    failures: TestFailure[];
    flakyTests: string[];
    slowTests: string[];
    newTests: string[];
    fixedTests: string[];
    environment: TestEnvironment;
    configuration: Record<string, any>;
    logs: string[];
}

export interface TestFailure {
    testCaseId: string;
    testCaseName: string;
    error: string;
    stackTrace: string;
    screenshot?: string;
    logs: string[];
    environment: string;
    timestamp: Date;
    category: 'regression' | 'new' | 'flaky' | 'environment' | 'data';
    severity: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    status: 'open' | 'investigating' | 'fixed' | 'wontfix' | 'duplicate';
}

export interface TestArtifact {
    id: string;
    name: string;
    type: 'screenshot' | 'video' | 'log' | 'report' | 'coverage' | 'performance' | 'other';
    path: string;
    size: number;
    mimeType: string;
    description?: string;
    createdAt: Date;
}

export interface TestTrend {
    metric: string;
    values: Array<{ date: Date; value: number }>;
    trend: 'up' | 'down' | 'stable';
    change: number;
    period: string;
}

export interface CoverageMetrics {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
    overall: number;
    thresholds: CoverageThresholds;
}

export interface CoverageThresholds {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
    overall: number;
}

export interface PerformanceMetrics {
    responseTime: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    availability: number;
    thresholds: PerformanceThresholds;
}

export interface PerformanceThresholds {
    responseTime: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    availability: number;
}

export interface SecurityMetrics {
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    compliance: number;
    thresholds: SecurityThresholds;
}

export interface SecurityThresholds {
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    compliance: number;
}

export interface AccessibilityMetrics {
    violations: number;
    errors: number;
    warnings: number;
    notices: number;
    guidelines: string[];
    score: number;
    thresholds: AccessibilityThresholds;
}

export interface AccessibilityThresholds {
    violations: number;
    errors: number;
    warnings: number;
    score: number;
}

export interface QualityGate {
    id: string;
    name: string;
    description: string;
    conditions: QualityCondition[];
    status: 'pass' | 'fail' | 'warning';
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface QualityCondition {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    weight: number;
}

export interface CodeQualityMetrics {
    maintainability: number;
    reliability: number;
    security: number;
    performance: number;
    usability: number;
    overall: number;
    technicalDebt: number;
    duplications: number;
    complexity: number;
    coverage: number;
    violations: number;
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
}

export interface QualityReport {
    id: string;
    name: string;
    type: 'code-quality' | 'test-quality' | 'overall-quality';
    metrics: CodeQualityMetrics;
    qualityGates: QualityGate[];
    status: 'pass' | 'fail' | 'warning';
    trends: QualityTrend[];
    recommendations: QualityRecommendation[];
    createdAt: Date;
    updatedAt: Date;
}

export interface QualityTrend {
    metric: string;
    values: Array<{ date: Date; value: number }>;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
    period: string;
}

export interface QualityRecommendation {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'code' | 'test' | 'performance' | 'security' | 'maintainability';
    impact: string;
    effort: 'low' | 'medium' | 'high';
    status: 'open' | 'in-progress' | 'completed' | 'rejected';
    assignee?: string;
    dueDate?: Date;
    createdAt: Date;
}

export class TestingQualityAssuranceService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private testCases: Map<string, TestCase> = new Map();
    private testSuites: Map<string, TestSuite> = new Map();
    private testReports: Map<string, TestReport> = new Map();
    private qualityGates: Map<string, QualityGate> = new Map();
    private qualityReports: Map<string, QualityReport> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.initializeQualityGates();
    }

    /**
     * Test case management
     */
    async createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'passRate' | 'flaky'>): Promise<TestCase> {
        this.loggingService.log(LogLevel.INFO, `Creating test case: ${testCase.name}`);

        const newTestCase: TestCase = {
            ...testCase,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            runCount: 0,
            passRate: 0,
            flaky: false
        };

        this.testCases.set(newTestCase.id, newTestCase);
        await this.saveTestCases();

        return newTestCase;
    }

    async updateTestCase(id: string, updates: Partial<TestCase>): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Updating test case: ${id}`);

        const testCase = this.testCases.get(id);
        if (!testCase) {
            return false;
        }

        const updatedTestCase = {
            ...testCase,
            ...updates,
            updatedAt: new Date()
        };

        this.testCases.set(id, updatedTestCase);
        await this.saveTestCases();

        return true;
    }

    async deleteTestCase(id: string): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Deleting test case: ${id}`);

        const deleted = this.testCases.delete(id);
        if (deleted) {
            await this.saveTestCases();
        }

        return deleted;
    }

    getTestCase(id: string): TestCase | undefined {
        return this.testCases.get(id);
    }

    getTestCases(filter?: {
        type?: string;
        category?: string;
        status?: string;
        priority?: string;
        tags?: string[];
    }): TestCase[] {
        let testCases = Array.from(this.testCases.values());

        if (filter) {
            if (filter.type) {
                testCases = testCases.filter(tc => tc.type === filter.type);
            }
            if (filter.category) {
                testCases = testCases.filter(tc => tc.category === filter.category);
            }
            if (filter.status) {
                testCases = testCases.filter(tc => tc.status === filter.status);
            }
            if (filter.priority) {
                testCases = testCases.filter(tc => tc.priority === filter.priority);
            }
            if (filter.tags && filter.tags.length > 0) {
                testCases = testCases.filter(tc => 
                    filter.tags!.some(tag => tc.tags.includes(tag))
                );
            }
        }

        return testCases;
    }

    /**
     * Test suite management
     */
    async createTestSuite(testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt' | 'statistics'>): Promise<TestSuite> {
        this.loggingService.log(LogLevel.INFO, `Creating test suite: ${testSuite.name}`);

        const newTestSuite: TestSuite = {
            ...testSuite,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            statistics: {
                totalTests: testSuite.testCases.length,
                passed: 0,
                failed: 0,
                skipped: 0,
                blocked: 0,
                duration: 0,
                passRate: 0,
                averageDuration: 0,
                flakyTests: 0,
                newFailures: 0,
                fixedTests: 0
            }
        };

        this.testSuites.set(newTestSuite.id, newTestSuite);
        await this.saveTestSuites();

        return newTestSuite;
    }

    async runTestSuite(suiteId: string): Promise<TestReport> {
        this.loggingService.log(LogLevel.INFO, `Running test suite: ${suiteId}`);

        const testSuite = this.testSuites.get(suiteId);
        if (!testSuite) {
            throw new Error(`Test suite not found: ${suiteId}`);
        }

        testSuite.status = 'running';
        testSuite.lastRun = new Date();

        const report: TestReport = {
            id: this.generateId(),
            name: `Test Run - ${testSuite.name}`,
            type: 'test-run',
            testSuiteId: suiteId,
            environment: testSuite.environment,
            status: 'generating',
            startTime: new Date(),
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                blocked: 0,
                passRate: 0,
                duration: 0,
                coverage: {
                    lines: 0,
                    functions: 0,
                    branches: 0,
                    statements: 0,
                    overall: 0,
                    thresholds: {
                        lines: 80,
                        functions: 80,
                        branches: 80,
                        statements: 80,
                        overall: 80
                    }
                },
                performance: {
                    responseTime: 0,
                    throughput: 0,
                    memoryUsage: 0,
                    cpuUsage: 0,
                    errorRate: 0,
                    availability: 0,
                    thresholds: {
                        responseTime: 1000,
                        throughput: 100,
                        memoryUsage: 80,
                        cpuUsage: 80,
                        errorRate: 5,
                        availability: 99
                    }
                },
                security: {
                    vulnerabilities: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    info: 0,
                    compliance: 0,
                    thresholds: {
                        vulnerabilities: 0,
                        critical: 0,
                        high: 0,
                        medium: 0,
                        low: 0,
                        compliance: 95
                    }
                },
                accessibility: {
                    violations: 0,
                    errors: 0,
                    warnings: 0,
                    notices: 0,
                    guidelines: [],
                    score: 0,
                    thresholds: {
                        violations: 0,
                        errors: 0,
                        warnings: 0,
                        score: 90
                    }
                }
            },
            details: {
                testCases: [],
                failures: [],
                flakyTests: [],
                slowTests: [],
                newTests: [],
                fixedTests: [],
                environment: testSuite.environment,
                configuration: {},
                logs: []
            },
            artifacts: [],
            trends: [],
            recommendations: [],
            createdAt: new Date()
        };

        this.testReports.set(report.id, report);

        try {
            await this.executeTestSuite(testSuite, report);
            report.status = 'completed';
            report.endTime = new Date();
            report.duration = report.endTime.getTime() - report.startTime.getTime();
        } catch (error) {
            report.status = 'failed';
            report.endTime = new Date();
            report.duration = report.endTime.getTime() - report.startTime.getTime();
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Test suite execution failed'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Test suite execution failed',
                    context: {  suiteId, error  }
                }
            );
        }

        testSuite.status = 'completed';
        testSuite.lastRun = new Date();
        await this.saveTestSuites();
        await this.saveTestReports();

        return report;
    }

    /**
     * Quality gates
     */
    async createQualityGate(qualityGate: Omit<QualityGate, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualityGate> {
        this.loggingService.log(LogLevel.INFO, `Creating quality gate: ${qualityGate.name}`);

        const newQualityGate: QualityGate = {
            ...qualityGate,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.qualityGates.set(newQualityGate.id, newQualityGate);
        await this.saveQualityGates();

        return newQualityGate;
    }

    async evaluateQualityGate(gateId: string, metrics: CodeQualityMetrics): Promise<boolean> {
        this.loggingService.log(LogLevel.DEBUG, `Evaluating quality gate: ${gateId}`);

        const gate = this.qualityGates.get(gateId);
        if (!gate || !gate.enabled) {
            return true;
        }

        let passed = true;
        for (const condition of gate.conditions) {
            const value = (metrics as any)[condition.metric];
            if (value === undefined) {
                continue;
            }

            let conditionPassed = false;
            switch (condition.operator) {
                case '>':
                    conditionPassed = value > condition.value;
                    break;
                case '<':
                    conditionPassed = value < condition.value;
                    break;
                case '>=':
                    conditionPassed = value >= condition.value;
                    break;
                case '<=':
                    conditionPassed = value <= condition.value;
                    break;
                case '==':
                    conditionPassed = value === condition.value;
                    break;
                case '!=':
                    conditionPassed = value !== condition.value;
                    break;
            }

            if (!conditionPassed) {
                passed = false;
                break;
            }
        }

        gate.status = passed ? 'pass' : 'fail';
        gate.updatedAt = new Date();

        await this.saveQualityGates();

        return passed;
    }

    /**
     * Code quality analysis
     */
    async analyzeCodeQuality(filePath: string): Promise<CodeQualityMetrics> {
        this.loggingService.log(LogLevel.INFO, `Analyzing code quality: ${filePath}`);

        // In a real implementation, this would integrate with tools like SonarQube, ESLint, etc.
        const metrics: CodeQualityMetrics = {
            maintainability: 85,
            reliability: 90,
            security: 88,
            performance: 82,
            usability: 87,
            overall: 86,
            technicalDebt: 15,
            duplications: 5,
            complexity: 12,
            coverage: 78,
            violations: 8,
            bugs: 2,
            vulnerabilities: 1,
            codeSmells: 12
        };

        return metrics;
    }

    /**
     * Generate quality report
     */
    async generateQualityReport(type: 'code-quality' | 'test-quality' | 'overall-quality'): Promise<QualityReport> {
        this.loggingService.log(LogLevel.INFO, `Generating quality report: ${type}`);

        const metrics = await this.analyzeCodeQuality(''); // Analyze entire codebase
        const qualityGates = Array.from(this.qualityGates.values());
        
        // Evaluate all quality gates
        let status: 'pass' | 'fail' | 'warning' = 'pass';
        for (const gate of qualityGates) {
            const passed = await this.evaluateQualityGate(gate.id, metrics);
            if (!passed && gate.severity === 'critical') {
                status = 'fail';
            } else if (!passed && gate.severity === 'high' && status !== 'fail') {
                status = 'warning';
            }
        }

        const report: QualityReport = {
            id: this.generateId(),
            name: `${type} Report`,
            type,
            metrics,
            qualityGates,
            status,
            trends: [],
            recommendations: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.qualityReports.set(report.id, report);
        await this.saveQualityReports();

        return report;
    }

    /**
     * Get test statistics
     */
    getTestStatistics(): {
        totalTestCases: number;
        totalTestSuites: number;
        totalTestRuns: number;
        passRate: number;
        averageDuration: number;
        flakyTests: number;
        openFailures: number;
    } {
        const testCases = Array.from(this.testCases.values());
        const testSuites = Array.from(this.testSuites.values());
        const testReports = Array.from(this.testReports.values());

        const totalTestCases = testCases.length;
        const totalTestSuites = testSuites.length;
        const totalTestRuns = testReports.length;
        const passedTests = testCases.filter(tc => tc.status === 'passed').length;
        const passRate = totalTestCases > 0 ? (passedTests / totalTestCases) * 100 : 0;
        const averageDuration = testCases.reduce((sum, tc) => sum + (tc.duration || 0), 0) / totalTestCases;
        const flakyTests = testCases.filter(tc => tc.flaky).length;
        const openFailures = testCases.filter(tc => tc.status === 'failed').length;

        return {
            totalTestCases,
            totalTestSuites,
            totalTestRuns,
            passRate,
            averageDuration,
            flakyTests,
            openFailures
        };
    }

    /**
     * Get quality metrics
     */
    getQualityMetrics(): {
        overallScore: number;
        qualityGates: number;
        passedGates: number;
        failedGates: number;
        recommendations: number;
        openRecommendations: number;
    } {
        const qualityGates = Array.from(this.qualityGates.values());
        const qualityReports = Array.from(this.qualityReports.values());
        const latestReport = qualityReports[qualityReports.length - 1];

        const overallScore = latestReport?.metrics.overall || 0;
        const passedGates = qualityGates.filter(gate => gate.status === 'pass').length;
        const failedGates = qualityGates.filter(gate => gate.status === 'fail').length;
        const recommendations = latestReport?.recommendations.length || 0;
        const openRecommendations = latestReport?.recommendations.filter(rec => rec.status === 'open').length || 0;

        return {
            overallScore,
            qualityGates: qualityGates.length,
            passedGates,
            failedGates,
            recommendations,
            openRecommendations
        };
    }

    private async executeTestSuite(testSuite: TestSuite, report: TestReport): Promise<void> {
        this.loggingService.log(LogLevel.DEBUG, `Executing test suite: ${testSuite.name}`);

        const testCases = testSuite.testCases.map(id => this.testCases.get(id)).filter(Boolean) as TestCase[];
        
        for (const testCase of testCases) {
            try {
                await this.executeTestCase(testCase, report);
            } catch (error) {
                this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Test case execution failed'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Test case execution failed',
                    context: {  testCaseId: testCase.id, error  }
                }
            );
            }
        }

        // Update summary
        report.summary.totalTests = testCases.length;
        report.summary.passed = testCases.filter(tc => tc.status === 'passed').length;
        report.summary.failed = testCases.filter(tc => tc.status === 'failed').length;
        report.summary.skipped = testCases.filter(tc => tc.status === 'skipped').length;
        report.summary.blocked = testCases.filter(tc => tc.status === 'blocked').length;
        report.summary.passRate = report.summary.totalTests > 0 ? (report.summary.passed / report.summary.totalTests) * 100 : 0;
    }

    private async executeTestCase(testCase: TestCase, report: TestReport): Promise<void> {
        this.loggingService.log(LogLevel.DEBUG, `Executing test case: ${testCase.name}`);

        testCase.status = 'running';
        testCase.lastRun = new Date();
        testCase.runCount++;

        const startTime = Date.now();

        try {
            // Simulate test execution
            await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

            // Simulate test result
            const passed = Math.random() > 0.1; // 90% pass rate

            if (passed) {
                testCase.status = 'passed';
                testCase.passRate = ((testCase.passRate * (testCase.runCount - 1)) + 100) / testCase.runCount;
            } else {
                testCase.status = 'failed';
                testCase.passRate = (testCase.passRate * (testCase.runCount - 1)) / testCase.runCount;
                testCase.error = 'Test assertion failed';

                // Add to failures
                report.details.failures.push({
                    testCaseId: testCase.id,
                    testCaseName: testCase.name,
                    error: testCase.error,
                    stackTrace: 'Stack trace would be here',
                    logs: [],
                    environment: testCase.environment.name,
                    timestamp: new Date(),
                    category: 'regression',
                    severity: 'medium',
                    status: 'open'
                });
            }

            testCase.duration = Date.now() - startTime;
            testCase.updatedAt = new Date();

            // Update flaky status
            if (testCase.runCount > 5) {
                testCase.flaky = testCase.passRate < 80 && testCase.passRate > 0;
            }

        } catch (error) {
            testCase.status = 'failed';
            testCase.error = error instanceof Error ? error.message : String(error);
            testCase.duration = Date.now() - startTime;
            testCase.updatedAt = new Date();
        }

        report.details.testCases.push(testCase);
        await this.saveTestCases();
    }

    private initializeQualityGates(): void {
        // Create default quality gates
        const defaultGates: Omit<QualityGate, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                name: 'Code Coverage',
                description: 'Ensure minimum code coverage',
                conditions: [
                    { metric: 'coverage', operator: '>=', value: 80, weight: 1 }
                ],
                status: 'pass',
                severity: 'high',
                enabled: true
            },
            {
                name: 'Technical Debt',
                description: 'Limit technical debt',
                conditions: [
                    { metric: 'technicalDebt', operator: '<=', value: 20, weight: 1 }
                ],
                status: 'pass',
                severity: 'medium',
                enabled: true
            },
            {
                name: 'Security Vulnerabilities',
                description: 'No critical security vulnerabilities',
                conditions: [
                    { metric: 'vulnerabilities', operator: '==', value: 0, weight: 1 }
                ],
                status: 'pass',
                severity: 'critical',
                enabled: true
            },
            {
                name: 'Code Complexity',
                description: 'Limit code complexity',
                conditions: [
                    { metric: 'complexity', operator: '<=', value: 15, weight: 1 }
                ],
                status: 'pass',
                severity: 'medium',
                enabled: true
            }
        ];

        defaultGates.forEach(gate => {
            const newGate: QualityGate = {
                ...gate,
                id: this.generateId(),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.qualityGates.set(newGate.id, newGate);
        });
    }

    private async saveTestCases(): Promise<void> {
        const data = Array.from(this.testCases.values());
        await this.context.globalState.update('testCases', data);
    }

    private async saveTestSuites(): Promise<void> {
        const data = Array.from(this.testSuites.values());
        await this.context.globalState.update('testSuites', data);
    }

    private async saveTestReports(): Promise<void> {
        const data = Array.from(this.testReports.values());
        await this.context.globalState.update('testReports', data);
    }

    private async saveQualityGates(): Promise<void> {
        const data = Array.from(this.qualityGates.values());
        await this.context.globalState.update('qualityGates', data);
    }

    private async saveQualityReports(): Promise<void> {
        const data = Array.from(this.qualityReports.values());
        await this.context.globalState.update('qualityReports', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
