import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface MigrationProject {
    id: string;
    name: string;
    description: string;
    teamId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    status: 'draft' | 'in-progress' | 'completed' | 'archived';
    endpoints: MigrationEndpoint[];
    templates: string[];
    settings: ProjectSettings;
    permissions: ProjectPermissions;
}

export interface MigrationEndpoint {
    id: string;
    name: string;
    type: string;
    filePath: string;
    lineNumber: number;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
    convergeCode: string;
    elavonCode?: string;
    comments: Comment[];
    attachments: Attachment[];
}

export interface Comment {
    id: string;
    author: string;
    content: string;
    createdAt: Date;
    type: 'general' | 'review' | 'approval' | 'rejection';
    resolved: boolean;
}

export interface Attachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: Date;
}

export interface ProjectSettings {
    autoAssign: boolean;
    requireApproval: boolean;
    notificationSettings: NotificationSettings;
    migrationRules: MigrationRule[];
    customMappings: CustomMapping[];
}

export interface ProjectPermissions {
    owner: string[];
    admin: string[];
    editor: string[];
    viewer: string[];
}

export interface NotificationSettings {
    email: boolean;
    slack: boolean;
    teams: boolean;
    webhook: boolean;
    webhookUrl?: string;
}

export interface MigrationRule {
    id: string;
    name: string;
    condition: string;
    action: string;
    priority: number;
    enabled: boolean;
}

export interface CustomMapping {
    id: string;
    convergeField: string;
    elavonField: string;
    transformation: string;
    validation: string;
}

export interface TeamTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    language: string;
    template: string;
    createdBy: string;
    createdAt: Date;
    usageCount: number;
    rating: number;
    tags: string[];
}

export interface AuditTrail {
    id: string;
    projectId: string;
    action: string;
    performedBy: string;
    performedAt: Date;
    details: any;
    ipAddress: string;
    userAgent: string;
}

export interface ComplianceReport {
    id: string;
    projectId: string;
    reportType: 'migration' | 'security' | 'performance' | 'compliance';
    generatedAt: Date;
    generatedBy: string;
    data: any;
    summary: string;
    recommendations: string[];
}

export class TeamCollaborationService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private projects: Map<string, MigrationProject> = new Map();
    private teamTemplates: Map<string, TeamTemplate> = new Map();
    private auditTrails: AuditTrail[] = [];
    private complianceReports: ComplianceReport[] = [];

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
     * Create a new migration project
     */
    async createProject(
        name: string,
        description: string,
        teamId: string,
        createdBy: string,
        settings?: Partial<ProjectSettings>
    ): Promise<MigrationProject> {
        this.loggingService.log(LogLevel.INFO, `Creating migration project: ${name}`);

        const project: MigrationProject = {
            id: this.generateId(),
            name,
            description,
            teamId,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft',
            endpoints: [],
            templates: [],
            settings: {
                autoAssign: false,
                requireApproval: true,
                notificationSettings: {
                    email: true,
                    slack: false,
                    teams: false,
                    webhook: false
                },
                migrationRules: [],
                customMappings: [],
                ...settings
            },
            permissions: {
                owner: [createdBy],
                admin: [],
                editor: [],
                viewer: []
            }
        };

        this.projects.set(project.id, project);
        await this.saveProjects();
        await this.recordAuditTrail(project.id, 'project_created', createdBy, { projectName: name });

        return project;
    }

    /**
     * Share a migration project with team members
     */
    async shareProject(
        projectId: string,
        userId: string,
        role: 'admin' | 'editor' | 'viewer',
        sharedBy: string
    ): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Sharing project ${projectId} with user ${userId} as ${role}`);

        const project = this.projects.get(projectId);
        if (!project) {
            this.errorHandlingService.logError(
                new Error(`Project ${projectId} not found`),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: `Project ${projectId} not found`,
                    context: { projectId, userId, role   }
                }
            );
            return false;
        }

        // Check if user has permission to share
        if (!this.hasPermission(project, sharedBy, 'admin')) {
            this.errorHandlingService.logError(
                new Error(`User ${sharedBy} does not have permission to share project`),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: `User ${sharedBy} does not have permission to share project`,
                    context: { projectId, userId, role, sharedBy   }
                }
            );
            return false;
        }

        // Add user to appropriate role
        if (!project.permissions[role].includes(userId)) {
            project.permissions[role].push(userId);
            project.updatedAt = new Date();
            await this.saveProjects();
            await this.recordAuditTrail(projectId, 'project_shared', sharedBy, { userId, role });
        }

        return true;
    }

    /**
     * Export migration project
     */
    async exportProject(projectId: string, format: 'json' | 'yaml' | 'zip'): Promise<string> {
        this.loggingService.log(LogLevel.INFO, `Exporting project ${projectId} in ${format} format`);

        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        const exportData = {
            project,
            auditTrails: this.auditTrails.filter(a => a.projectId === projectId),
            complianceReports: this.complianceReports.filter(r => r.projectId === projectId),
            exportedAt: new Date(),
            version: '1.0'
        };

        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'yaml':
                // Would implement YAML conversion
                return JSON.stringify(exportData, null, 2);
            case 'zip':
                // Would implement ZIP compression
                return JSON.stringify(exportData, null, 2);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Import migration project
     */
    async importProject(exportData: string, importedBy: string): Promise<MigrationProject> {
        this.loggingService.log(LogLevel.INFO, `Importing migration project`);

        try {
            const data = JSON.parse(exportData);
            const project = data.project as MigrationProject;

            // Generate new IDs to avoid conflicts
            project.id = this.generateId();
            project.createdBy = importedBy;
            project.createdAt = new Date();
            project.updatedAt = new Date();
            project.status = 'draft';

            // Reset permissions
            project.permissions = {
                owner: [importedBy],
                admin: [],
                editor: [],
                viewer: []
            };

            this.projects.set(project.id, project);
            await this.saveProjects();
            await this.recordAuditTrail(project.id, 'project_imported', importedBy, { originalId: data.project.id });

            return project;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to import project'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to import project',
                    context: {  error: error, importedBy  }
                }
            );
            throw error;
        }
    }

    /**
     * Create team migration template
     */
    async createTeamTemplate(
        name: string,
        description: string,
        category: string,
        language: string,
        template: string,
        createdBy: string,
        tags: string[] = []
    ): Promise<TeamTemplate> {
        this.loggingService.log(LogLevel.INFO, `Creating team template: ${name}`);

        const teamTemplate: TeamTemplate = {
            id: this.generateId(),
            name,
            description,
            category,
            language,
            template,
            createdBy,
            createdAt: new Date(),
            usageCount: 0,
            rating: 0,
            tags
        };

        this.teamTemplates.set(teamTemplate.id, teamTemplate);
        await this.saveTeamTemplates();
        await this.recordAuditTrail('', 'template_created', createdBy, { templateName: name });

        return teamTemplate;
    }

    /**
     * Get team templates by category
     */
    getTeamTemplatesByCategory(category: string): TeamTemplate[] {
        return Array.from(this.teamTemplates.values()).filter(t => t.category === category);
    }

    /**
     * Get team templates by language
     */
    getTeamTemplatesByLanguage(language: string): TeamTemplate[] {
        return Array.from(this.teamTemplates.values()).filter(t => t.language === language);
    }

    /**
     * Search team templates
     */
    searchTeamTemplates(query: string): TeamTemplate[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.teamTemplates.values()).filter(t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Rate team template
     */
    async rateTeamTemplate(templateId: string, rating: number, ratedBy: string): Promise<boolean> {
        const template = this.teamTemplates.get(templateId);
        if (!template) {
            return false;
        }

        // Simple average rating calculation
        const currentRating = template.rating;
        const currentCount = template.usageCount;
        template.rating = (currentRating * currentCount + rating) / (currentCount + 1);
        template.usageCount++;

        await this.saveTeamTemplates();
        await this.recordAuditTrail('', 'template_rated', ratedBy, { templateId, rating });

        return true;
    }

    /**
     * Create migration approval workflow
     */
    async createApprovalWorkflow(
        projectId: string,
        endpointId: string,
        approverId: string,
        createdBy: string
    ): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Creating approval workflow for endpoint ${endpointId}`);

        const project = this.projects.get(projectId);
        if (!project) {
            return false;
        }

        const endpoint = project.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            return false;
        }

        // Add approval comment
        const comment: Comment = {
            id: this.generateId(),
            author: createdBy,
            content: `Approval workflow created. Awaiting approval from ${approverId}`,
            createdAt: new Date(),
            type: 'approval',
            resolved: false
        };

        endpoint.comments.push(comment);
        project.updatedAt = new Date();

        await this.saveProjects();
        await this.recordAuditTrail(projectId, 'approval_workflow_created', createdBy, { endpointId, approverId });

        return true;
    }

    /**
     * Approve migration
     */
    async approveMigration(
        projectId: string,
        endpointId: string,
        approverId: string,
        comments?: string
    ): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Approving migration for endpoint ${endpointId}`);

        const project = this.projects.get(projectId);
        if (!project) {
            return false;
        }

        const endpoint = project.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            return false;
        }

        // Add approval comment
        const comment: Comment = {
            id: this.generateId(),
            author: approverId,
            content: comments || 'Migration approved',
            createdAt: new Date(),
            type: 'approval',
            resolved: true
        };

        endpoint.comments.push(comment);
        endpoint.status = 'completed';
        project.updatedAt = new Date();

        await this.saveProjects();
        await this.recordAuditTrail(projectId, 'migration_approved', approverId, { endpointId, comments });

        return true;
    }

    /**
     * Reject migration
     */
    async rejectMigration(
        projectId: string,
        endpointId: string,
        approverId: string,
        reason: string
    ): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Rejecting migration for endpoint ${endpointId}`);

        const project = this.projects.get(projectId);
        if (!project) {
            return false;
        }

        const endpoint = project.endpoints.find(e => e.id === endpointId);
        if (!endpoint) {
            return false;
        }

        // Add rejection comment
        const comment: Comment = {
            id: this.generateId(),
            author: approverId,
            content: `Migration rejected: ${reason}`,
            createdAt: new Date(),
            type: 'rejection',
            resolved: true
        };

        endpoint.comments.push(comment);
        endpoint.status = 'failed';
        project.updatedAt = new Date();

        await this.saveProjects();
        await this.recordAuditTrail(projectId, 'migration_rejected', approverId, { endpointId, reason });

        return true;
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(
        projectId: string,
        reportType: 'migration' | 'security' | 'performance' | 'compliance',
        generatedBy: string
    ): Promise<ComplianceReport> {
        this.loggingService.log(LogLevel.INFO, `Generating ${reportType} compliance report for project ${projectId}`);

        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        const report: ComplianceReport = {
            id: this.generateId(),
            projectId,
            reportType,
            generatedAt: new Date(),
            generatedBy,
            data: await this.generateReportData(project, reportType),
            summary: await this.generateReportSummary(project, reportType),
            recommendations: await this.generateRecommendations(project, reportType)
        };

        this.complianceReports.push(report);
        await this.saveComplianceReports();
        await this.recordAuditTrail(projectId, 'compliance_report_generated', generatedBy, { reportType, reportId: report.id });

        return report;
    }

    /**
     * Get audit trail for project
     */
    getAuditTrail(projectId: string): AuditTrail[] {
        return this.auditTrails.filter(a => a.projectId === projectId);
    }

    /**
     * Get compliance reports for project
     */
    getComplianceReports(projectId: string): ComplianceReport[] {
        return this.complianceReports.filter(r => r.projectId === projectId);
    }

    private hasPermission(project: MigrationProject, userId: string, requiredRole: 'owner' | 'admin' | 'editor' | 'viewer'): boolean {
        const roles = ['owner', 'admin', 'editor', 'viewer'];
        const userRoleIndex = roles.findIndex(role => project.permissions[role as keyof ProjectPermissions].includes(userId));
        const requiredRoleIndex = roles.indexOf(requiredRole);
        
        return userRoleIndex !== -1 && userRoleIndex <= requiredRoleIndex;
    }

    private async recordAuditTrail(projectId: string, action: string, performedBy: string, details: any): Promise<void> {
        const auditTrail: AuditTrail = {
            id: this.generateId(),
            projectId,
            action,
            performedBy,
            performedAt: new Date(),
            details,
            ipAddress: '127.0.0.1', // Would get actual IP in real implementation
            userAgent: 'VS Code Extension' // Would get actual user agent
        };

        this.auditTrails.push(auditTrail);
        await this.saveAuditTrails();
    }

    private async generateReportData(project: MigrationProject, reportType: string): Promise<any> {
        // This would implement actual report data generation
        return {
            projectId: project.id,
            projectName: project.name,
            totalEndpoints: project.endpoints.length,
            completedEndpoints: project.endpoints.filter(e => e.status === 'completed').length,
            failedEndpoints: project.endpoints.filter(e => e.status === 'failed').length,
            reportType
        };
    }

    private async generateReportSummary(project: MigrationProject, reportType: string): Promise<string> {
        const totalEndpoints = project.endpoints.length;
        const completedEndpoints = project.endpoints.filter(e => e.status === 'completed').length;
        const successRate = totalEndpoints > 0 ? (completedEndpoints / totalEndpoints) * 100 : 0;

        return `Migration project "${project.name}" has ${totalEndpoints} endpoints with ${successRate.toFixed(1)}% completion rate.`;
    }

    private async generateRecommendations(project: MigrationProject, reportType: string): Promise<string[]> {
        const recommendations: string[] = [];

        const failedEndpoints = project.endpoints.filter(e => e.status === 'failed');
        if (failedEndpoints.length > 0) {
            recommendations.push(`Review ${failedEndpoints.length} failed endpoints and address issues`);
        }

        const pendingEndpoints = project.endpoints.filter(e => e.status === 'pending');
        if (pendingEndpoints.length > 0) {
            recommendations.push(`Complete migration of ${pendingEndpoints.length} pending endpoints`);
        }

        return recommendations;
    }

    private async saveProjects(): Promise<void> {
        const data = Array.from(this.projects.values());
        await this.context.globalState.update('migrationProjects', data);
    }

    private async saveTeamTemplates(): Promise<void> {
        const data = Array.from(this.teamTemplates.values());
        await this.context.globalState.update('teamTemplates', data);
    }

    private async saveAuditTrails(): Promise<void> {
        await this.context.globalState.update('auditTrails', this.auditTrails);
    }

    private async saveComplianceReports(): Promise<void> {
        await this.context.globalState.update('complianceReports', this.complianceReports);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
