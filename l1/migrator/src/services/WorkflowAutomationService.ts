import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface WorkflowStep {
    id: string;
    name: string;
    type: 'scan' | 'analyze' | 'migrate' | 'validate' | 'test' | 'deploy' | 'custom';
    description: string;
    dependencies: string[];
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    timeout: number;
    retryCount: number;
    parallel: boolean;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    result?: any;
}

export interface WorkflowCondition {
    id: string;
    type: 'file-exists' | 'file-modified' | 'endpoint-detected' | 'validation-passed' | 'custom';
    expression: string;
    value: any;
    operator: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater-than' | 'less-than' | 'exists' | 'not-exists';
}

export interface WorkflowAction {
    id: string;
    type: 'execute-command' | 'run-script' | 'send-notification' | 'create-backup' | 'update-file' | 'custom';
    command: string;
    parameters: { [key: string]: any };
    async: boolean;
    timeout: number;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    version: string;
    steps: WorkflowStep[];
    triggers: WorkflowTrigger[];
    schedule?: WorkflowSchedule;
    settings: WorkflowSettings;
    status: 'draft' | 'active' | 'paused' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    lastRun?: Date;
    nextRun?: Date;
}

export interface WorkflowTrigger {
    id: string;
    type: 'manual' | 'file-change' | 'schedule' | 'webhook' | 'event';
    condition: string;
    enabled: boolean;
    parameters: { [key: string]: any };
}

export interface WorkflowSchedule {
    type: 'once' | 'interval' | 'cron';
    value: string;
    timezone: string;
    enabled: boolean;
}

export interface WorkflowSettings {
    maxConcurrency: number;
    timeout: number;
    retryPolicy: RetryPolicy;
    notificationSettings: NotificationSettings;
    rollbackOnFailure: boolean;
    continueOnError: boolean;
}

export interface RetryPolicy {
    maxAttempts: number;
    delay: number;
    backoffMultiplier: number;
    maxDelay: number;
}

export interface NotificationSettings {
    onSuccess: boolean;
    onFailure: boolean;
    onCompletion: boolean;
    channels: ('email' | 'slack' | 'teams' | 'webhook')[];
    recipients: string[];
}

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    steps: WorkflowStepExecution[];
    logs: WorkflowLog[];
    metrics: WorkflowMetrics;
}

export interface WorkflowStepExecution {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
    error?: string;
    result?: any;
    logs: string[];
}

export interface WorkflowLog {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    stepId?: string;
    data?: any;
}

export interface WorkflowMetrics {
    totalDuration: number;
    stepsCompleted: number;
    stepsFailed: number;
    stepsSkipped: number;
    successRate: number;
    averageStepDuration: number;
    peakMemoryUsage: number;
    peakCpuUsage: number;
}

export interface DependencyAnalysis {
    filePath: string;
    dependencies: string[];
    dependents: string[];
    impact: 'low' | 'medium' | 'high';
    migrationOrder: number;
    risk: 'low' | 'medium' | 'high';
}

export interface MigrationPlan {
    id: string;
    name: string;
    description: string;
    phases: MigrationPhase[];
    dependencies: DependencyAnalysis[];
    estimatedDuration: number;
    riskAssessment: RiskAssessment;
    rollbackPlan: RollbackPlan;
    status: 'draft' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}

export interface MigrationPhase {
    id: string;
    name: string;
    description: string;
    steps: WorkflowStep[];
    dependencies: string[];
    estimatedDuration: number;
    riskLevel: 'low' | 'medium' | 'high';
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    risks: Risk[];
    mitigations: Mitigation[];
    contingencyPlans: ContingencyPlan[];
}

export interface Risk {
    id: string;
    type: 'technical' | 'business' | 'security' | 'compliance';
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Mitigation {
    id: string;
    riskId: string;
    description: string;
    implementation: string;
    cost: 'low' | 'medium' | 'high';
    effectiveness: 'low' | 'medium' | 'high';
}

export interface ContingencyPlan {
    id: string;
    riskId: string;
    trigger: string;
    actions: string[];
    timeline: string;
    resources: string[];
}

export interface RollbackPlan {
    id: string;
    name: string;
    description: string;
    steps: RollbackStep[];
    triggers: string[];
    estimatedDuration: number;
    successCriteria: string[];
}

export interface RollbackStep {
    id: string;
    name: string;
    description: string;
    action: string;
    parameters: { [key: string]: any };
    order: number;
    timeout: number;
}

export class WorkflowAutomationService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private workflows: Map<string, Workflow> = new Map();
    private executions: Map<string, WorkflowExecution> = new Map();
    private migrationPlans: Map<string, MigrationPlan> = new Map();

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
     * Create intelligent migration workflow
     */
    async createMigrationWorkflow(
        name: string,
        description: string,
        filePaths: string[],
        createdBy: string
    ): Promise<Workflow> {
        this.loggingService.log(LogLevel.INFO, `Creating migration workflow: ${name}`);

        const workflow: Workflow = {
            id: this.generateId(),
            name,
            description,
            version: '1.0',
            steps: await this.generateWorkflowSteps(filePaths),
            triggers: [{
                id: this.generateId(),
                type: 'manual',
                condition: 'user-initiated',
                enabled: true,
                parameters: {}
            }],
            settings: {
                maxConcurrency: 3,
                timeout: 3600000, // 1 hour
                retryPolicy: {
                    maxAttempts: 3,
                    delay: 5000,
                    backoffMultiplier: 2,
                    maxDelay: 60000
                },
                notificationSettings: {
                    onSuccess: true,
                    onFailure: true,
                    onCompletion: true,
                    channels: ['email'],
                    recipients: [createdBy]
                },
                rollbackOnFailure: true,
                continueOnError: false
            },
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy
        };

        this.workflows.set(workflow.id, workflow);
        await this.saveWorkflows();

        return workflow;
    }

    /**
     * Execute workflow
     */
    async executeWorkflow(workflowId: string, parameters: { [key: string]: any } = {}): Promise<WorkflowExecution> {
        this.loggingService.log(LogLevel.INFO, `Executing workflow: ${workflowId}`);

        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const execution: WorkflowExecution = {
            id: this.generateId(),
            workflowId,
            status: 'running',
            startedAt: new Date(),
            steps: workflow.steps.map(step => ({
                stepId: step.id,
                status: 'pending',
                logs: []
            })),
            logs: [],
            metrics: {
                totalDuration: 0,
                stepsCompleted: 0,
                stepsFailed: 0,
                stepsSkipped: 0,
                successRate: 0,
                averageStepDuration: 0,
                peakMemoryUsage: 0,
                peakCpuUsage: 0
            }
        };

        this.executions.set(execution.id, execution);
        await this.saveExecutions();

        // Execute workflow steps
        try {
            await this.executeWorkflowSteps(workflow, execution, parameters);
            execution.status = 'completed';
            execution.completedAt = new Date();
            execution.metrics.totalDuration = execution.completedAt.getTime() - execution.startedAt.getTime();
        } catch (error) {
            execution.status = 'failed';
            execution.completedAt = new Date();
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Workflow execution failed: ${error}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Workflow execution failed: ${error}',
                    context: { workflowId, executionId: execution.id, error: error   }
                }
            );
        }

        await this.saveExecutions();
        return execution;
    }

    /**
     * Create smart migration scheduling
     */
    async createMigrationSchedule(
        workflowId: string,
        schedule: WorkflowSchedule,
        createdBy: string
    ): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Creating migration schedule for workflow: ${workflowId}`);

        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return false;
        }

        workflow.schedule = schedule;
        workflow.updatedAt = new Date();

        // Calculate next run time
        workflow.nextRun = this.calculateNextRun(schedule);

        this.workflows.set(workflowId, workflow);
        await this.saveWorkflows();

        return true;
    }

    /**
     * Analyze dependencies and create migration plan
     */
    async analyzeDependencies(filePaths: string[]): Promise<DependencyAnalysis[]> {
        this.loggingService.log(LogLevel.INFO, `Analyzing dependencies for ${filePaths.length} files`);

        const dependencies: DependencyAnalysis[] = [];

        for (const filePath of filePaths) {
            const analysis = await this.analyzeFileDependencies(filePath, filePaths);
            dependencies.push(analysis);
        }

        // Sort by migration order
        dependencies.sort((a, b) => a.migrationOrder - b.migrationOrder);

        return dependencies;
    }

    /**
     * Create migration plan
     */
    async createMigrationPlan(
        name: string,
        description: string,
        filePaths: string[],
        createdBy: string
    ): Promise<MigrationPlan> {
        this.loggingService.log(LogLevel.INFO, `Creating migration plan: ${name}`);

        const dependencies = await this.analyzeDependencies(filePaths);
        const phases = await this.generateMigrationPhases(dependencies);
        const riskAssessment = await this.assessMigrationRisks(dependencies);
        const rollbackPlan = await this.createRollbackPlan(phases);

        const plan: MigrationPlan = {
            id: this.generateId(),
            name,
            description,
            phases,
            dependencies,
            estimatedDuration: phases.reduce((total, phase) => total + phase.estimatedDuration, 0),
            riskAssessment,
            rollbackPlan,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.migrationPlans.set(plan.id, plan);
        await this.saveMigrationPlans();

        return plan;
    }

    /**
     * Create progressive migration with rollback checkpoints
     */
    async createProgressiveMigration(
        planId: string,
        checkpointInterval: number = 5
    ): Promise<Workflow> {
        this.loggingService.log(LogLevel.INFO, `Creating progressive migration for plan: ${planId}`);

        const plan = this.migrationPlans.get(planId);
        if (!plan) {
            throw new Error(`Migration plan ${planId} not found`);
        }

        const workflow = await this.createMigrationWorkflow(
            `Progressive Migration - ${plan.name}`,
            `Progressive migration with checkpoints every ${checkpointInterval} steps`,
            [],
            'system'
        );

        // Add checkpoint steps
        let stepCount = 0;
        for (const phase of plan.phases) {
            for (const step of phase.steps) {
                workflow.steps.push(step);
                stepCount++;

                if (stepCount % checkpointInterval === 0) {
                    workflow.steps.push(this.createCheckpointStep(stepCount));
                }
            }
        }

        this.workflows.set(workflow.id, workflow);
        await this.saveWorkflows();

        return workflow;
    }

    /**
     * Get workflow execution status
     */
    getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
        return this.executions.get(executionId);
    }

    /**
     * Get all workflows
     */
    getAllWorkflows(): Workflow[] {
        return Array.from(this.workflows.values());
    }

    /**
     * Get migration plans
     */
    getAllMigrationPlans(): MigrationPlan[] {
        return Array.from(this.migrationPlans.values());
    }

    /**
     * Cancel workflow execution
     */
    async cancelWorkflowExecution(executionId: string): Promise<boolean> {
        const execution = this.executions.get(executionId);
        if (!execution || execution.status !== 'running') {
            return false;
        }

        execution.status = 'cancelled';
        execution.completedAt = new Date();
        await this.saveExecutions();

        return true;
    }

    private async generateWorkflowSteps(filePaths: string[]): Promise<WorkflowStep[]> {
        const steps: WorkflowStep[] = [];

        // Add scan step
        steps.push({
            id: this.generateId(),
            name: 'Scan Files',
            type: 'scan',
            description: 'Scan files for Converge endpoints',
            dependencies: [],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'execute-command',
                command: 'scanFiles',
                parameters: { filePaths },
                async: false,
                timeout: 300000
            }],
            timeout: 300000,
            retryCount: 2,
            parallel: false,
            status: 'pending'
        });

        // Add analyze step
        steps.push({
            id: this.generateId(),
            name: 'Analyze Code',
            type: 'analyze',
            description: 'Analyze code for migration patterns',
            dependencies: [steps[0].id],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'execute-command',
                command: 'analyzeCode',
                parameters: { filePaths },
                async: false,
                timeout: 600000
            }],
            timeout: 600000,
            retryCount: 2,
            parallel: false,
            status: 'pending'
        });

        // Add migrate step
        steps.push({
            id: this.generateId(),
            name: 'Migrate Code',
            type: 'migrate',
            description: 'Migrate Converge code to Elavon',
            dependencies: [steps[1].id],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'execute-command',
                command: 'migrateCode',
                parameters: { filePaths },
                async: true,
                timeout: 1800000
            }],
            timeout: 1800000,
            retryCount: 3,
            parallel: true,
            status: 'pending'
        });

        // Add validate step
        steps.push({
            id: this.generateId(),
            name: 'Validate Migration',
            type: 'validate',
            description: 'Validate migrated code',
            dependencies: [steps[2].id],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'execute-command',
                command: 'validateMigration',
                parameters: { filePaths },
                async: false,
                timeout: 300000
            }],
            timeout: 300000,
            retryCount: 2,
            parallel: false,
            status: 'pending'
        });

        return steps;
    }

    private async executeWorkflowSteps(
        workflow: Workflow,
        execution: WorkflowExecution,
        parameters: { [key: string]: any }
    ): Promise<void> {
        for (const step of workflow.steps) {
            const stepExecution = execution.steps.find(s => s.stepId === step.id);
            if (!stepExecution) {
                continue;
            }

            try {
                stepExecution.status = 'running';
                stepExecution.startedAt = new Date();

                // Check conditions
                const conditionsMet = await this.checkStepConditions(step, parameters);
                if (!conditionsMet) {
                    stepExecution.status = 'skipped';
                    stepExecution.completedAt = new Date();
                    continue;
                }

                // Execute actions
                for (const action of step.actions) {
                    await this.executeAction(action, parameters);
                }

                stepExecution.status = 'completed';
                stepExecution.completedAt = new Date();
                stepExecution.duration = stepExecution.completedAt.getTime() - (stepExecution.startedAt?.getTime() || 0);

            } catch (error) {
                stepExecution.status = 'failed';
                stepExecution.error = error instanceof Error ? error.message : String(error);
                stepExecution.completedAt = new Date();
                throw error;
            }
        }
    }

    private async checkStepConditions(
        step: WorkflowStep,
        parameters: { [key: string]: any }
    ): Promise<boolean> {
        for (const condition of step.conditions) {
            const result = await this.evaluateCondition(condition, parameters);
            if (!result) {
                return false;
            }
        }
        return true;
    }

    private async evaluateCondition(
        condition: WorkflowCondition,
        parameters: { [key: string]: any }
    ): Promise<boolean> {
        // This would implement actual condition evaluation
        // For now, return true for all conditions
        return true;
    }

    private async executeAction(
        action: WorkflowAction,
        parameters: { [key: string]: any }
    ): Promise<any> {
        // This would implement actual action execution
        // For now, just log the action
        this.loggingService.log(LogLevel.INFO, `Executing action: ${action.command}`);
        return {};
    }

    private async analyzeFileDependencies(filePath: string, allFilePaths: string[]): Promise<DependencyAnalysis> {
        // This would implement actual dependency analysis
        // For now, return a mock analysis
        return {
            filePath,
            dependencies: [],
            dependents: [],
            impact: 'medium',
            migrationOrder: Math.floor(Math.random() * allFilePaths.length),
            risk: 'low'
        };
    }

    private async generateMigrationPhases(dependencies: DependencyAnalysis[]): Promise<MigrationPhase[]> {
        const phases: MigrationPhase[] = [];

        // Group files by migration order
        const groups = this.groupByMigrationOrder(dependencies);

        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const phase: MigrationPhase = {
                id: this.generateId(),
                name: `Phase ${i + 1}`,
                description: `Migration phase ${i + 1} - ${group.length} files`,
                steps: group.map(dep => this.createMigrationStep(dep)),
                dependencies: i > 0 ? [phases[i - 1].id] : [],
                estimatedDuration: group.length * 300000, // 5 minutes per file
                riskLevel: this.calculatePhaseRisk(group),
                status: 'pending'
            };
            phases.push(phase);
        }

        return phases;
    }

    private groupByMigrationOrder(dependencies: DependencyAnalysis[]): DependencyAnalysis[][] {
        const groups: { [key: number]: DependencyAnalysis[] } = {};
        
        dependencies.forEach(dep => {
            if (!groups[dep.migrationOrder]) {
                groups[dep.migrationOrder] = [];
            }
            groups[dep.migrationOrder].push(dep);
        });

        return Object.values(groups);
    }

    private createMigrationStep(dependency: DependencyAnalysis): WorkflowStep {
        return {
            id: this.generateId(),
            name: `Migrate ${dependency.filePath}`,
            type: 'migrate',
            description: `Migrate file ${dependency.filePath}`,
            dependencies: [],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'execute-command',
                command: 'migrateFile',
                parameters: { filePath: dependency.filePath },
                async: false,
                timeout: 300000
            }],
            timeout: 300000,
            retryCount: 2,
            parallel: false,
            status: 'pending'
        };
    }

    private calculatePhaseRisk(group: DependencyAnalysis[]): 'low' | 'medium' | 'high' {
        const highRiskCount = group.filter(dep => dep.risk === 'high').length;
        const mediumRiskCount = group.filter(dep => dep.risk === 'medium').length;

        if (highRiskCount > 0) return 'high';
        if (mediumRiskCount > group.length / 2) return 'medium';
        return 'low';
    }

    private async assessMigrationRisks(dependencies: DependencyAnalysis[]): Promise<RiskAssessment> {
        const risks: Risk[] = [];
        const mitigations: Mitigation[] = [];
        const contingencyPlans: ContingencyPlan[] = [];

        // Add technical risks
        risks.push({
            id: this.generateId(),
            type: 'technical',
            description: 'Code migration may introduce bugs',
            probability: 'medium',
            impact: 'high',
            severity: 'high'
        });

        // Add business risks
        risks.push({
            id: this.generateId(),
            type: 'business',
            description: 'Migration may cause service downtime',
            probability: 'low',
            impact: 'high',
            severity: 'high'
        });

        const overallRisk = risks.some(r => r.severity === 'critical') ? 'critical' :
                           risks.some(r => r.severity === 'high') ? 'high' :
                           risks.some(r => r.severity === 'medium') ? 'medium' : 'low';

        return {
            overallRisk,
            risks,
            mitigations,
            contingencyPlans
        };
    }

    private async createRollbackPlan(phases: MigrationPhase[]): Promise<RollbackPlan> {
        const steps: RollbackStep[] = [];

        // Add rollback steps in reverse order
        for (let i = phases.length - 1; i >= 0; i--) {
            const phase = phases[i];
            steps.push({
                id: this.generateId(),
                name: `Rollback ${phase.name}`,
                description: `Rollback phase ${phase.name}`,
                action: 'rollbackPhase',
                parameters: { phaseId: phase.id },
                order: phases.length - i,
                timeout: 300000
            });
        }

        return {
            id: this.generateId(),
            name: 'Migration Rollback Plan',
            description: 'Complete rollback plan for migration',
            steps,
            triggers: ['migration-failed', 'validation-failed', 'manual-trigger'],
            estimatedDuration: phases.length * 300000,
            successCriteria: ['All files restored', 'Services operational', 'Data integrity maintained']
        };
    }

    private createCheckpointStep(stepCount: number): WorkflowStep {
        return {
            id: this.generateId(),
            name: `Checkpoint ${stepCount}`,
            type: 'custom',
            description: `Migration checkpoint at step ${stepCount}`,
            dependencies: [],
            conditions: [],
            actions: [{
                id: this.generateId(),
                type: 'create-backup',
                command: 'createCheckpoint',
                parameters: { stepCount },
                async: false,
                timeout: 60000
            }],
            timeout: 60000,
            retryCount: 1,
            parallel: false,
            status: 'pending'
        };
    }

    private calculateNextRun(schedule: WorkflowSchedule): Date {
        if (schedule.type === 'once') {
            return new Date(schedule.value);
        } else if (schedule.type === 'interval') {
            const interval = parseInt(schedule.value);
            return new Date(Date.now() + interval);
        } else if (schedule.type === 'cron') {
            // This would implement cron parsing
            return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }
        return new Date();
    }

    private async saveWorkflows(): Promise<void> {
        const data = Array.from(this.workflows.values());
        await this.context.globalState.update('workflows', data);
    }

    private async saveExecutions(): Promise<void> {
        const data = Array.from(this.executions.values());
        await this.context.globalState.update('workflowExecutions', data);
    }

    private async saveMigrationPlans(): Promise<void> {
        const data = Array.from(this.migrationPlans.values());
        await this.context.globalState.update('migrationPlans', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
