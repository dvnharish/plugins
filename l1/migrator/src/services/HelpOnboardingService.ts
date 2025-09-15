import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    content: string;
    type: 'text' | 'video' | 'interactive' | 'code' | 'quiz';
    duration: number; // in seconds
    prerequisites: string[];
    objectives: string[];
    actions: TutorialAction[];
    validation: TutorialValidation;
    hints: string[];
    resources: TutorialResource[];
}

export interface TutorialAction {
    id: string;
    type: 'click' | 'type' | 'select' | 'drag' | 'navigate' | 'command';
    target: string;
    description: string;
    parameters: { [key: string]: any };
    required: boolean;
    timeout: number;
}

export interface TutorialValidation {
    type: 'file-exists' | 'content-matches' | 'command-executed' | 'ui-state' | 'custom';
    condition: string;
    expectedValue: any;
    errorMessage: string;
    successMessage: string;
}

export interface TutorialResource {
    id: string;
    type: 'documentation' | 'video' | 'code-example' | 'link' | 'file';
    title: string;
    url?: string;
    content?: string;
    filePath?: string;
}

export interface Tutorial {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number; // in minutes
    steps: TutorialStep[];
    prerequisites: string[];
    objectives: string[];
    tags: string[];
    version: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    rating: number;
    completionCount: number;
}

export interface GuidedWalkthrough {
    id: string;
    name: string;
    description: string;
    scenario: string;
    steps: WalkthroughStep[];
    context: WalkthroughContext;
    progress: WalkthroughProgress;
    status: 'not-started' | 'in-progress' | 'completed' | 'paused';
}

export interface WalkthroughStep {
    id: string;
    title: string;
    description: string;
    instructions: string[];
    actions: WalkthroughAction[];
    validation: WalkthroughValidation;
    help: WalkthroughHelp;
    completed: boolean;
    skipped: boolean;
    timeSpent: number; // in seconds
}

export interface WalkthroughAction {
    id: string;
    type: 'navigate' | 'click' | 'type' | 'select' | 'command' | 'wait';
    target: string;
    description: string;
    parameters: { [key: string]: any };
    completed: boolean;
    timestamp?: Date;
}

export interface WalkthroughValidation {
    type: 'file-created' | 'content-added' | 'command-executed' | 'ui-visible' | 'custom';
    condition: string;
    expectedValue: any;
    autoAdvance: boolean;
}

export interface WalkthroughHelp {
    hints: string[];
    troubleshooting: TroubleshootingTip[];
    relatedDocs: string[];
    videoGuide?: string;
}

export interface WalkthroughContext {
    workspace: string;
    files: string[];
    settings: { [key: string]: any };
    environment: string;
    userLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface WalkthroughProgress {
    currentStep: number;
    totalSteps: number;
    completedSteps: number;
    skippedSteps: number;
    timeSpent: number;
    startedAt: Date;
    lastActivity: Date;
    completionPercentage: number;
}

export interface TroubleshootingTip {
    id: string;
    problem: string;
    symptoms: string[];
    causes: string[];
    solutions: string[];
    prevention: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    tags: string[];
}

export interface BestPractice {
    id: string;
    title: string;
    description: string;
    category: string;
    context: string;
    implementation: string;
    benefits: string[];
    examples: string[];
    antiPatterns: string[];
    relatedPractices: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
}

export interface ContextualHelp {
    id: string;
    context: string;
    trigger: string;
    content: string;
    type: 'tip' | 'warning' | 'info' | 'error' | 'success';
    actions: ContextualAction[];
    dismissible: boolean;
    priority: 'low' | 'medium' | 'high';
}

export interface ContextualAction {
    id: string;
    type: 'dismiss' | 'learn-more' | 'execute-command' | 'navigate' | 'custom';
    label: string;
    command?: string;
    parameters?: { [key: string]: any };
    url?: string;
}

export interface SmartErrorResolution {
    id: string;
    errorType: string;
    errorMessage: string;
    errorCode?: string;
    context: string;
    solutions: ErrorSolution[];
    autoFix: AutoFix;
    prevention: string[];
    relatedErrors: string[];
}

export interface ErrorSolution {
    id: string;
    title: string;
    description: string;
    steps: string[];
    commands: string[];
    files: string[];
    parameters: { [key: string]: any };
    successCriteria: string[];
    estimatedTime: number; // in minutes
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface AutoFix {
    available: boolean;
    description: string;
    commands: string[];
    parameters: { [key: string]: any };
    successRate: number;
    risks: string[];
    backupRequired: boolean;
}

export interface HelpSystem {
    id: string;
    name: string;
    description: string;
    tutorials: Tutorial[];
    walkthroughs: GuidedWalkthrough[];
    troubleshooting: TroubleshootingTip[];
    bestPractices: BestPractice[];
    contextualHelp: ContextualHelp[];
    errorResolutions: SmartErrorResolution[];
    searchIndex: SearchIndex;
    analytics: HelpAnalytics;
}

export interface SearchIndex {
    entries: SearchEntry[];
    lastUpdated: Date;
    version: string;
}

export interface SearchEntry {
    id: string;
    title: string;
    content: string;
    type: 'tutorial' | 'walkthrough' | 'troubleshooting' | 'best-practice' | 'contextual-help' | 'error-resolution';
    category: string;
    tags: string[];
    keywords: string[];
    relevanceScore: number;
}

export interface HelpAnalytics {
    totalSearches: number;
    popularTopics: { [topic: string]: number };
    userSatisfaction: number;
    commonIssues: { [issue: string]: number };
    tutorialCompletions: { [tutorialId: string]: number };
    errorResolutions: { [errorType: string]: number };
}

export class HelpOnboardingService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private helpSystem: HelpSystem;
    private activeWalkthroughs: Map<string, GuidedWalkthrough> = new Map();
    private userProgress: Map<string, any> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.helpSystem = this.initializeHelpSystem();
    }

    /**
     * Create interactive tutorial
     */
    async createTutorial(
        name: string,
        description: string,
        category: string,
        difficulty: 'beginner' | 'intermediate' | 'advanced',
        steps: Omit<TutorialStep, 'id'>[],
        createdBy: string
    ): Promise<Tutorial> {
        this.loggingService.log(LogLevel.INFO, `Creating tutorial: ${name}`);

        const tutorial: Tutorial = {
            id: this.generateId(),
            name,
            description,
            category,
            difficulty,
            estimatedDuration: steps.reduce((total, step) => total + step.duration, 0) / 60,
            steps: steps.map(step => ({ ...step, id: this.generateId() })),
            prerequisites: [],
            objectives: [],
            tags: [],
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy,
            rating: 0,
            completionCount: 0
        };

        this.helpSystem.tutorials.push(tutorial);
        await this.saveHelpSystem();

        return tutorial;
    }

    /**
     * Start guided walkthrough
     */
    async startWalkthrough(
        walkthroughId: string,
        context: WalkthroughContext
    ): Promise<GuidedWalkthrough> {
        this.loggingService.log(LogLevel.INFO, `Starting walkthrough: ${walkthroughId}`);

        const walkthrough = this.helpSystem.walkthroughs.find(w => w.id === walkthroughId);
        if (!walkthrough) {
            throw new Error(`Walkthrough ${walkthroughId} not found`);
        }

        const activeWalkthrough: GuidedWalkthrough = {
            ...walkthrough,
            context,
            progress: {
                currentStep: 0,
                totalSteps: walkthrough.steps.length,
                completedSteps: 0,
                skippedSteps: 0,
                timeSpent: 0,
                startedAt: new Date(),
                lastActivity: new Date(),
                completionPercentage: 0
            },
            status: 'in-progress'
        };

        this.activeWalkthroughs.set(walkthroughId, activeWalkthrough);
        await this.saveActiveWalkthroughs();

        return activeWalkthrough;
    }

    /**
     * Complete walkthrough step
     */
    async completeWalkthroughStep(
        walkthroughId: string,
        stepId: string,
        actions: WalkthroughAction[]
    ): Promise<boolean> {
        const walkthrough = this.activeWalkthroughs.get(walkthroughId);
        if (!walkthrough) {
            return false;
        }

        const step = walkthrough.steps.find(s => s.id === stepId);
        if (!step) {
            return false;
        }

        // Validate step completion
        const isValid = await this.validateWalkthroughStep(step, actions);
        if (!isValid) {
            return false;
        }

        // Mark step as completed
        step.completed = true;
        step.actions = actions;
        walkthrough.progress.completedSteps++;
        walkthrough.progress.completionPercentage = 
            (walkthrough.progress.completedSteps / walkthrough.progress.totalSteps) * 100;

        // Check if walkthrough is complete
        if (walkthrough.progress.completedSteps === walkthrough.progress.totalSteps) {
            walkthrough.status = 'completed';
        }

        walkthrough.progress.lastActivity = new Date();
        this.activeWalkthroughs.set(walkthroughId, walkthrough);
        await this.saveActiveWalkthroughs();

        return true;
    }

    /**
     * Get contextual help
     */
    async getContextualHelp(
        context: string,
        trigger: string
    ): Promise<ContextualHelp[]> {
        this.loggingService.log(LogLevel.INFO, `Getting contextual help for: ${context}`);

        return this.helpSystem.contextualHelp.filter(help => 
            help.context === context && help.trigger === trigger
        );
    }

    /**
     * Search help content
     */
    async searchHelpContent(query: string, filters?: { [key: string]: any }): Promise<SearchEntry[]> {
        this.loggingService.log(LogLevel.INFO, `Searching help content: ${query}`);

        const results = this.helpSystem.searchIndex.entries.filter(entry => {
            const matchesQuery = entry.title.toLowerCase().includes(query.toLowerCase()) ||
                               entry.content.toLowerCase().includes(query.toLowerCase()) ||
                               entry.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()));

            if (!matchesQuery) return false;

            if (filters) {
                if (filters.type && entry.type !== filters.type) return false;
                if (filters.category && entry.category !== filters.category) return false;
                if (filters.tags && !filters.tags.some((tag: string) => entry.tags.includes(tag))) return false;
            }

            return true;
        });

        // Sort by relevance score
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        return results;
    }

    /**
     * Get smart error resolution
     */
    async getErrorResolution(
        errorType: string,
        errorMessage: string,
        context: string
    ): Promise<SmartErrorResolution | null> {
        this.loggingService.log(LogLevel.INFO, `Getting error resolution for: ${errorType}`);

        const resolution = this.helpSystem.errorResolutions.find(r => 
            r.errorType === errorType && 
            r.context === context &&
            (r.errorMessage === errorMessage || r.errorMessage === '*')
        );

        return resolution || null;
    }

    /**
     * Apply auto-fix for error
     */
    async applyAutoFix(resolutionId: string, errorContext: any): Promise<boolean> {
        this.loggingService.log(LogLevel.INFO, `Applying auto-fix for resolution: ${resolutionId}`);

        const resolution = this.helpSystem.errorResolutions.find(r => r.id === resolutionId);
        if (!resolution || !resolution.autoFix.available) {
            return false;
        }

        try {
            // Execute auto-fix commands
            for (const command of resolution.autoFix.commands) {
                await vscode.commands.executeCommand(command, resolution.autoFix.parameters);
            }

            return true;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Auto-fix failed for resolution ${resolutionId}'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Auto-fix failed for resolution ${resolutionId}',
                    context: { resolutionId, error: error, errorContext   }
                }
            );
            return false;
        }
    }

    /**
     * Add troubleshooting tip
     */
    async addTroubleshootingTip(tip: Omit<TroubleshootingTip, 'id'>): Promise<TroubleshootingTip> {
        this.loggingService.log(LogLevel.INFO, `Adding troubleshooting tip: ${tip.problem}`);

        const newTip: TroubleshootingTip = {
            ...tip,
            id: this.generateId()
        };

        this.helpSystem.troubleshooting.push(newTip);
        await this.saveHelpSystem();

        return newTip;
    }

    /**
     * Add best practice
     */
    async addBestPractice(practice: Omit<BestPractice, 'id'>): Promise<BestPractice> {
        this.loggingService.log(LogLevel.INFO, `Adding best practice: ${practice.title}`);

        const newPractice: BestPractice = {
            ...practice,
            id: this.generateId()
        };

        this.helpSystem.bestPractices.push(newPractice);
        await this.saveHelpSystem();

        return newPractice;
    }

    /**
     * Get all tutorials
     */
    getAllTutorials(): Tutorial[] {
        return this.helpSystem.tutorials;
    }

    /**
     * Get tutorials by category
     */
    getTutorialsByCategory(category: string): Tutorial[] {
        return this.helpSystem.tutorials.filter(t => t.category === category);
    }

    /**
     * Get tutorials by difficulty
     */
    getTutorialsByDifficulty(difficulty: string): Tutorial[] {
        return this.helpSystem.tutorials.filter(t => t.difficulty === difficulty);
    }

    /**
     * Get all walkthroughs
     */
    getAllWalkthroughs(): GuidedWalkthrough[] {
        return this.helpSystem.walkthroughs;
    }

    /**
     * Get active walkthroughs
     */
    getActiveWalkthroughs(): GuidedWalkthrough[] {
        return Array.from(this.activeWalkthroughs.values());
    }

    /**
     * Get troubleshooting tips
     */
    getTroubleshootingTips(): TroubleshootingTip[] {
        return this.helpSystem.troubleshooting;
    }

    /**
     * Get best practices
     */
    getBestPractices(): BestPractice[] {
        return this.helpSystem.bestPractices;
    }

    /**
     * Get help analytics
     */
    getHelpAnalytics(): HelpAnalytics {
        return this.helpSystem.analytics;
    }

    private initializeHelpSystem(): HelpSystem {
        const helpSystem: HelpSystem = {
            id: this.generateId(),
            name: 'Converge to Elavon Migration Help System',
            description: 'Comprehensive help and onboarding system for the migration extension',
            tutorials: this.initializeDefaultTutorials(),
            walkthroughs: this.initializeDefaultWalkthroughs(),
            troubleshooting: this.initializeDefaultTroubleshooting(),
            bestPractices: this.initializeDefaultBestPractices(),
            contextualHelp: this.initializeDefaultContextualHelp(),
            errorResolutions: this.initializeDefaultErrorResolutions(),
            searchIndex: {
                entries: [],
                lastUpdated: new Date(),
                version: '1.0'
            },
            analytics: {
                totalSearches: 0,
                popularTopics: {},
                userSatisfaction: 0,
                commonIssues: {},
                tutorialCompletions: {},
                errorResolutions: {}
            }
        };

        // Build search index
        this.buildSearchIndex(helpSystem);

        return helpSystem;
    }

    private initializeDefaultTutorials(): Tutorial[] {
        return [
            {
                id: this.generateId(),
                name: 'Getting Started with Migration',
                description: 'Learn the basics of migrating Converge endpoints to Elavon',
                category: 'basics',
                difficulty: 'beginner',
                estimatedDuration: 15,
                steps: [
                    {
                        id: this.generateId(),
                        title: 'Install and Setup',
                        description: 'Install the extension and configure your environment',
                        content: 'Welcome to the Converge to Elavon Migration extension!',
                        type: 'text',
                        duration: 300,
                        prerequisites: [],
                        objectives: ['Install extension', 'Configure settings'],
                        actions: [],
                        validation: {
                            type: 'command-executed',
                            condition: 'extension.installed',
                            expectedValue: true,
                            errorMessage: 'Extension not installed',
                            successMessage: 'Extension installed successfully'
                        },
                        hints: ['Make sure VS Code is up to date'],
                        resources: []
                    }
                ],
                prerequisites: [],
                objectives: ['Learn basic migration concepts', 'Set up the extension'],
                tags: ['beginner', 'setup', 'migration'],
                version: '1.0',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
                rating: 0,
                completionCount: 0
            }
        ];
    }

    private initializeDefaultWalkthroughs(): GuidedWalkthrough[] {
        return [
            {
                id: this.generateId(),
                name: 'First Migration Walkthrough',
                description: 'Step-by-step guide for your first migration',
                scenario: 'Migrating a simple payment endpoint',
                steps: [
                    {
                        id: this.generateId(),
                        title: 'Scan for Endpoints',
                        description: 'Scan your project for Converge endpoints',
                        instructions: ['Open the Scan panel', 'Click "Scan Project"', 'Review detected endpoints'],
                        actions: [],
                        validation: {
                            type: 'ui-visible',
                            condition: 'scan.results.visible',
                            expectedValue: true,
                            autoAdvance: true
                        },
                        help: {
                            hints: ['Make sure your project is open in VS Code'],
                            troubleshooting: [],
                            relatedDocs: ['scanning-guide.md']
                        },
                        completed: false,
                        skipped: false,
                        timeSpent: 0
                    }
                ],
                context: {
                    workspace: '',
                    files: [],
                    settings: {},
                    environment: 'development',
                    userLevel: 'beginner'
                },
                progress: {
                    currentStep: 0,
                    totalSteps: 1,
                    completedSteps: 0,
                    skippedSteps: 0,
                    timeSpent: 0,
                    startedAt: new Date(),
                    lastActivity: new Date(),
                    completionPercentage: 0
                },
                status: 'not-started'
            }
        ];
    }

    private initializeDefaultTroubleshooting(): TroubleshootingTip[] {
        return [
            {
                id: this.generateId(),
                problem: 'No endpoints detected during scan',
                symptoms: ['Empty scan results', 'No files found', 'Scan completes with 0 results'],
                causes: ['No Converge code in project', 'Incorrect file patterns', 'Scan configuration issues'],
                solutions: ['Check file patterns in settings', 'Verify project structure', 'Try different scan options'],
                prevention: ['Use standard Converge patterns', 'Keep code organized', 'Regular project maintenance'],
                severity: 'medium',
                category: 'scanning',
                tags: ['scan', 'endpoints', 'detection']
            }
        ];
    }

    private initializeDefaultBestPractices(): BestPractice[] {
        return [
            {
                id: this.generateId(),
                title: 'Always backup before migration',
                description: 'Create backups of your code before starting any migration',
                category: 'safety',
                context: 'pre-migration',
                implementation: 'Use the built-in backup feature or create manual backups',
                benefits: ['Easy rollback', 'Data safety', 'Peace of mind'],
                examples: ['Enable auto-backup in settings', 'Create git commit before migration'],
                antiPatterns: ['Migrating without backup', 'Skipping backup for small changes'],
                relatedPractices: ['Version control', 'Testing'],
                difficulty: 'beginner',
                tags: ['backup', 'safety', 'best-practice']
            }
        ];
    }

    private initializeDefaultContextualHelp(): ContextualHelp[] {
        return [
            {
                id: this.generateId(),
                context: 'editor',
                trigger: 'converge-code-detected',
                content: 'Converge code detected! Click here to migrate to Elavon.',
                type: 'tip',
                actions: [
                    {
                        id: this.generateId(),
                        type: 'execute-command',
                        label: 'Migrate to Elavon',
                        command: 'migrateEndpoint'
                    }
                ],
                dismissible: true,
                priority: 'medium'
            }
        ];
    }

    private initializeDefaultErrorResolutions(): SmartErrorResolution[] {
        return [
            {
                id: this.generateId(),
                errorType: 'validation-failed',
                errorMessage: 'Invalid credentials',
                context: 'migration',
                solutions: [
                    {
                        id: this.generateId(),
                        title: 'Update Elavon credentials',
                        description: 'Enter valid Elavon API credentials',
                        steps: ['Open Credentials panel', 'Enter valid API keys', 'Test connection'],
                        commands: ['openCredentialsPanel'],
                        files: [],
                        parameters: {},
                        successCriteria: ['Credentials validated', 'Connection successful'],
                        estimatedTime: 2,
                        difficulty: 'easy'
                    }
                ],
                autoFix: {
                    available: false,
                    description: 'Manual credential update required',
                    commands: [],
                    parameters: {},
                    successRate: 0,
                    risks: [],
                    backupRequired: false
                },
                prevention: ['Regular credential validation', 'Secure credential storage'],
                relatedErrors: ['connection-failed', 'authentication-error']
            }
        ];
    }

    private buildSearchIndex(helpSystem: HelpSystem): void {
        const entries: SearchEntry[] = [];

        // Add tutorial entries
        helpSystem.tutorials.forEach(tutorial => {
            entries.push({
                id: this.generateId(),
                title: tutorial.name,
                content: tutorial.description,
                type: 'tutorial',
                category: tutorial.category,
                tags: tutorial.tags,
                keywords: [tutorial.name, tutorial.description, ...tutorial.tags],
                relevanceScore: 1.0
            });
        });

        // Add walkthrough entries
        helpSystem.walkthroughs.forEach(walkthrough => {
            entries.push({
                id: this.generateId(),
                title: walkthrough.name,
                content: walkthrough.description,
                type: 'walkthrough',
                category: 'walkthrough',
                tags: [],
                keywords: [walkthrough.name, walkthrough.description],
                relevanceScore: 1.0
            });
        });

        // Add troubleshooting entries
        helpSystem.troubleshooting.forEach(tip => {
            entries.push({
                id: this.generateId(),
                title: tip.problem,
                content: tip.solutions.join(' '),
                type: 'troubleshooting',
                category: tip.category,
                tags: tip.tags,
                keywords: [tip.problem, ...tip.symptoms, ...tip.tags],
                relevanceScore: 1.0
            });
        });

        helpSystem.searchIndex.entries = entries;
    }

    private async validateWalkthroughStep(
        step: WalkthroughStep,
        actions: WalkthroughAction[]
    ): Promise<boolean> {
        // This would implement actual step validation
        // For now, return true if actions are provided
        return actions.length > 0;
    }

    private async saveHelpSystem(): Promise<void> {
        await this.context.globalState.update('helpSystem', this.helpSystem);
    }

    private async saveActiveWalkthroughs(): Promise<void> {
        const data = Array.from(this.activeWalkthroughs.values());
        await this.context.globalState.update('activeWalkthroughs', data);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
