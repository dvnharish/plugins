import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';
import { ErrorHandlingService, ErrorCategory } from './ErrorHandlingService';

export interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'list' | 'progress' | 'status' | 'custom';
    title: string;
    description: string;
    position: { x: number; y: number; width: number; height: number };
    data: any;
    refreshInterval: number;
    lastUpdated: Date;
    visible: boolean;
}

export interface Dashboard {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    layout: DashboardLayout;
    theme: DashboardTheme;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

export interface DashboardLayout {
    columns: number;
    rows: number;
    gap: number;
    padding: number;
    responsive: boolean;
}

export interface DashboardTheme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
    };
    typography: {
        fontFamily: string;
        fontSize: string;
        fontWeight: string;
    };
    spacing: {
        small: number;
        medium: number;
        large: number;
    };
}

export interface MigrationFlowDiagram {
    id: string;
    name: string;
    description: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    layout: FlowLayout;
    interactions: FlowInteraction[];
    animations: FlowAnimation[];
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
}

export interface FlowNode {
    id: string;
    type: 'start' | 'end' | 'process' | 'decision' | 'parallel' | 'merge' | 'custom';
    label: string;
    description: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: NodeStyle;
    data: any;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    type: 'solid' | 'dashed' | 'dotted' | 'thick';
    style: EdgeStyle;
    condition?: string;
    weight?: number;
}

export interface FlowLayout {
    type: 'hierarchical' | 'force-directed' | 'circular' | 'grid' | 'custom';
    direction: 'top-down' | 'bottom-up' | 'left-right' | 'right-left';
    spacing: { x: number; y: number };
    alignment: 'start' | 'center' | 'end';
}

export interface FlowInteraction {
    id: string;
    type: 'click' | 'hover' | 'drag' | 'zoom' | 'pan' | 'select';
    target: string;
    action: string;
    parameters: { [key: string]: any };
}

export interface FlowAnimation {
    id: string;
    type: 'fade' | 'slide' | 'scale' | 'rotate' | 'pulse' | 'bounce';
    target: string;
    duration: number;
    delay: number;
    easing: string;
    loop: boolean;
}

export interface NodeStyle {
    fill: string;
    stroke: string;
    strokeWidth: number;
    borderRadius: number;
    opacity: number;
    shadow: boolean;
    gradient?: {
        type: 'linear' | 'radial';
        colors: string[];
        direction?: string;
    };
}

export interface EdgeStyle {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    arrowSize: number;
    curve: 'straight' | 'smooth' | 'step';
}

export interface KeyboardShortcut {
    id: string;
    key: string;
    command: string;
    context: string;
    description: string;
    enabled: boolean;
    category: string;
}

export interface PowerUserFeature {
    id: string;
    name: string;
    description: string;
    type: 'shortcut' | 'macro' | 'template' | 'automation' | 'custom';
    implementation: string;
    parameters: { [key: string]: any };
    enabled: boolean;
    category: string;
}

export interface DragDropOperation {
    id: string;
    type: 'file' | 'text' | 'widget' | 'node' | 'custom';
    source: string;
    target: string;
    action: string;
    validation: string;
    feedback: string;
}

export interface VisualProgressTracker {
    id: string;
    name: string;
    type: 'linear' | 'circular' | 'step' | 'timeline' | 'gantt';
    total: number;
    current: number;
    steps: ProgressStep[];
    style: ProgressStyle;
    animations: ProgressAnimation[];
}

export interface ProgressStep {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    progress: number;
    substeps?: ProgressStep[];
}

export interface ProgressStyle {
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    fontSize: string;
    fontFamily: string;
    showPercentage: boolean;
    showTime: boolean;
    showSteps: boolean;
}

export interface ProgressAnimation {
    type: 'pulse' | 'glow' | 'slide' | 'fade' | 'bounce';
    duration: number;
    delay: number;
    easing: string;
    loop: boolean;
}

export interface CustomizableView {
    id: string;
    name: string;
    type: 'panel' | 'editor' | 'sidebar' | 'modal' | 'popup';
    components: ViewComponent[];
    layout: ViewLayout;
    theme: ViewTheme;
    interactions: ViewInteraction[];
    data: any;
}

export interface ViewComponent {
    id: string;
    type: 'text' | 'button' | 'input' | 'select' | 'table' | 'chart' | 'custom';
    properties: { [key: string]: any };
    position: { x: number; y: number; width: number; height: number };
    visible: boolean;
    enabled: boolean;
}

export interface ViewLayout {
    type: 'flex' | 'grid' | 'absolute' | 'relative';
    direction: 'row' | 'column';
    wrap: boolean;
    justify: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
    align: 'start' | 'center' | 'end' | 'stretch';
    gap: number;
}

export interface ViewTheme {
    colors: { [key: string]: string };
    typography: { [key: string]: any };
    spacing: { [key: string]: number };
    borders: { [key: string]: any };
    shadows: { [key: string]: any };
}

export interface ViewInteraction {
    id: string;
    type: 'click' | 'hover' | 'focus' | 'blur' | 'change' | 'submit';
    target: string;
    action: string;
    parameters: { [key: string]: any };
}

export class AdvancedUIService {
    private readonly loggingService: LoggingService;
    private readonly errorHandlingService: ErrorHandlingService;
    private readonly context: vscode.ExtensionContext;
    private dashboards: Map<string, Dashboard> = new Map();
    private flowDiagrams: Map<string, MigrationFlowDiagram> = new Map();
    private keyboardShortcuts: Map<string, KeyboardShortcut> = new Map();
    private powerUserFeatures: Map<string, PowerUserFeature> = new Map();
    private dragDropOperations: Map<string, DragDropOperation> = new Map();
    private progressTrackers: Map<string, VisualProgressTracker> = new Map();
    private customizableViews: Map<string, CustomizableView> = new Map();

    constructor(
        context: vscode.ExtensionContext,
        loggingService: LoggingService,
        errorHandlingService: ErrorHandlingService
    ) {
        this.context = context;
        this.loggingService = loggingService;
        this.errorHandlingService = errorHandlingService;
        this.initializeDefaultShortcuts();
        this.initializePowerUserFeatures();
    }

    /**
     * Create customizable dashboard
     */
    async createDashboard(
        name: string,
        description: string,
        createdBy: string,
        theme?: Partial<DashboardTheme>
    ): Promise<Dashboard> {
        this.loggingService.log(LogLevel.INFO, `Creating dashboard: ${name}`);

        const dashboard: Dashboard = {
            id: this.generateId(),
            name,
            description,
            widgets: [],
            layout: {
                columns: 4,
                rows: 3,
                gap: 16,
                padding: 16,
                responsive: true
            },
            theme: {
                name: 'default',
                colors: {
                    primary: '#007acc',
                    secondary: '#6c757d',
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    text: '#212529',
                    accent: '#28a745'
                },
                typography: {
                    fontFamily: 'Segoe UI, sans-serif',
                    fontSize: '14px',
                    fontWeight: '400'
                },
                spacing: {
                    small: 8,
                    medium: 16,
                    large: 24
                },
                ...theme
            },
            permissions: [createdBy],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy
        };

        this.dashboards.set(dashboard.id, dashboard);
        await this.saveDashboards();

        return dashboard;
    }

    /**
     * Add widget to dashboard
     */
    async addWidgetToDashboard(
        dashboardId: string,
        widget: Omit<DashboardWidget, 'id' | 'lastUpdated'>
    ): Promise<DashboardWidget> {
        this.loggingService.log(LogLevel.INFO, `Adding widget to dashboard: ${dashboardId}`);

        const dashboard = this.dashboards.get(dashboardId);
        if (!dashboard) {
            throw new Error(`Dashboard ${dashboardId} not found`);
        }

        const newWidget: DashboardWidget = {
            ...widget,
            id: this.generateId(),
            lastUpdated: new Date()
        };

        dashboard.widgets.push(newWidget);
        dashboard.updatedAt = new Date();

        this.dashboards.set(dashboardId, dashboard);
        await this.saveDashboards();

        return newWidget;
    }

    /**
     * Create migration flow diagram
     */
    async createMigrationFlowDiagram(
        name: string,
        description: string,
        nodes: Omit<FlowNode, 'id'>[],
        edges: Omit<FlowEdge, 'id'>[]
    ): Promise<MigrationFlowDiagram> {
        this.loggingService.log(LogLevel.INFO, `Creating migration flow diagram: ${name}`);

        const diagram: MigrationFlowDiagram = {
            id: this.generateId(),
            name,
            description,
            nodes: nodes.map(node => ({ ...node, id: this.generateId() })),
            edges: edges.map(edge => ({ ...edge, id: this.generateId() })),
            layout: {
                type: 'hierarchical',
                direction: 'top-down',
                spacing: { x: 200, y: 100 },
                alignment: 'center'
            },
            interactions: [],
            animations: [],
            createdAt: new Date(),
            createdBy: 'system',
            updatedAt: new Date()
        };

        this.flowDiagrams.set(diagram.id, diagram);
        await this.saveFlowDiagrams();

        return diagram;
    }

    /**
     * Add interaction to flow diagram
     */
    async addFlowInteraction(
        diagramId: string,
        interaction: Omit<FlowInteraction, 'id'>
    ): Promise<FlowInteraction> {
        const diagram = this.flowDiagrams.get(diagramId);
        if (!diagram) {
            throw new Error(`Flow diagram ${diagramId} not found`);
        }

        const newInteraction: FlowInteraction = {
            ...interaction,
            id: this.generateId()
        };

        diagram.interactions.push(newInteraction);
        diagram.updatedAt = new Date();

        this.flowDiagrams.set(diagramId, diagram);
        await this.saveFlowDiagrams();

        return newInteraction;
    }

    /**
     * Create visual progress tracker
     */
    async createProgressTracker(
        name: string,
        type: 'linear' | 'circular' | 'step' | 'timeline' | 'gantt',
        total: number,
        style?: Partial<ProgressStyle>
    ): Promise<VisualProgressTracker> {
        this.loggingService.log(LogLevel.INFO, `Creating progress tracker: ${name}`);

        const tracker: VisualProgressTracker = {
            id: this.generateId(),
            name,
            type,
            total,
            current: 0,
            steps: [],
            style: {
                color: '#007acc',
                backgroundColor: '#e9ecef',
                borderColor: '#dee2e6',
                borderWidth: 1,
                borderRadius: 4,
                fontSize: '14px',
                fontFamily: 'Segoe UI, sans-serif',
                showPercentage: true,
                showTime: true,
                showSteps: true,
                ...style
            },
            animations: []
        };

        this.progressTrackers.set(tracker.id, tracker);
        await this.saveProgressTrackers();

        return tracker;
    }

    /**
     * Update progress tracker
     */
    async updateProgressTracker(
        trackerId: string,
        current: number,
        step?: Omit<ProgressStep, 'id'>
    ): Promise<boolean> {
        const tracker = this.progressTrackers.get(trackerId);
        if (!tracker) {
            return false;
        }

        tracker.current = Math.min(current, tracker.total);

        if (step) {
            const newStep: ProgressStep = {
                ...step,
                id: this.generateId()
            };
            tracker.steps.push(newStep);
        }

        await this.saveProgressTrackers();
        return true;
    }

    /**
     * Create customizable view
     */
    async createCustomizableView(
        name: string,
        type: 'panel' | 'editor' | 'sidebar' | 'modal' | 'popup',
        components: Omit<ViewComponent, 'id'>[],
        layout?: Partial<ViewLayout>,
        theme?: Partial<ViewTheme>
    ): Promise<CustomizableView> {
        this.loggingService.log(LogLevel.INFO, `Creating customizable view: ${name}`);

        const view: CustomizableView = {
            id: this.generateId(),
            name,
            type,
            components: components.map(component => ({ ...component, id: this.generateId() })),
            layout: {
                type: 'flex',
                direction: 'column',
                wrap: false,
                justify: 'start',
                align: 'start',
                gap: 8,
                ...layout
            },
            theme: {
                colors: {},
                typography: {},
                spacing: {},
                borders: {},
                shadows: {},
                ...theme
            },
            interactions: [],
            data: {}
        };

        this.customizableViews.set(view.id, view);
        await this.saveCustomizableViews();

        return view;
    }

    /**
     * Register keyboard shortcut
     */
    async registerKeyboardShortcut(
        key: string,
        command: string,
        context: string,
        description: string,
        category: string = 'general'
    ): Promise<KeyboardShortcut> {
        this.loggingService.log(LogLevel.INFO, `Registering keyboard shortcut: ${key}`);

        const shortcut: KeyboardShortcut = {
            id: this.generateId(),
            key,
            command,
            context,
            description,
            enabled: true,
            category
        };

        this.keyboardShortcuts.set(shortcut.id, shortcut);
        await this.saveKeyboardShortcuts();

        return shortcut;
    }

    /**
     * Create power user feature
     */
    async createPowerUserFeature(
        name: string,
        description: string,
        type: 'shortcut' | 'macro' | 'template' | 'automation' | 'custom',
        implementation: string,
        parameters: { [key: string]: any } = {},
        category: string = 'general'
    ): Promise<PowerUserFeature> {
        this.loggingService.log(LogLevel.INFO, `Creating power user feature: ${name}`);

        const feature: PowerUserFeature = {
            id: this.generateId(),
            name,
            description,
            type,
            implementation,
            parameters,
            enabled: true,
            category
        };

        this.powerUserFeatures.set(feature.id, feature);
        await this.savePowerUserFeatures();

        return feature;
    }

    /**
     * Create drag and drop operation
     */
    async createDragDropOperation(
        type: 'file' | 'text' | 'widget' | 'node' | 'custom',
        source: string,
        target: string,
        action: string,
        validation: string,
        feedback: string
    ): Promise<DragDropOperation> {
        this.loggingService.log(LogLevel.INFO, `Creating drag and drop operation: ${type}`);

        const operation: DragDropOperation = {
            id: this.generateId(),
            type,
            source,
            target,
            action,
            validation,
            feedback
        };

        this.dragDropOperations.set(operation.id, operation);
        await this.saveDragDropOperations();

        return operation;
    }

    /**
     * Get all dashboards
     */
    getAllDashboards(): Dashboard[] {
        return Array.from(this.dashboards.values());
    }

    /**
     * Get all flow diagrams
     */
    getAllFlowDiagrams(): MigrationFlowDiagram[] {
        return Array.from(this.flowDiagrams.values());
    }

    /**
     * Get all keyboard shortcuts
     */
    getAllKeyboardShortcuts(): KeyboardShortcut[] {
        return Array.from(this.keyboardShortcuts.values());
    }

    /**
     * Get all power user features
     */
    getAllPowerUserFeatures(): PowerUserFeature[] {
        return Array.from(this.powerUserFeatures.values());
    }

    /**
     * Get all progress trackers
     */
    getAllProgressTrackers(): VisualProgressTracker[] {
        return Array.from(this.progressTrackers.values());
    }

    /**
     * Get all customizable views
     */
    getAllCustomizableViews(): CustomizableView[] {
        return Array.from(this.customizableViews.values());
    }

    /**
     * Export UI configuration
     */
    async exportUIConfiguration(): Promise<string> {
        const config = {
            dashboards: Array.from(this.dashboards.values()),
            flowDiagrams: Array.from(this.flowDiagrams.values()),
            keyboardShortcuts: Array.from(this.keyboardShortcuts.values()),
            powerUserFeatures: Array.from(this.powerUserFeatures.values()),
            dragDropOperations: Array.from(this.dragDropOperations.values()),
            progressTrackers: Array.from(this.progressTrackers.values()),
            customizableViews: Array.from(this.customizableViews.values()),
            exportedAt: new Date(),
            version: '1.0'
        };

        return JSON.stringify(config, null, 2);
    }

    /**
     * Import UI configuration
     */
    async importUIConfiguration(configJson: string): Promise<boolean> {
        try {
            const config = JSON.parse(configJson);

            if (config.dashboards) {
                config.dashboards.forEach((dashboard: Dashboard) => {
                    this.dashboards.set(dashboard.id, dashboard);
                });
            }

            if (config.flowDiagrams) {
                config.flowDiagrams.forEach((diagram: MigrationFlowDiagram) => {
                    this.flowDiagrams.set(diagram.id, diagram);
                });
            }

            if (config.keyboardShortcuts) {
                config.keyboardShortcuts.forEach((shortcut: KeyboardShortcut) => {
                    this.keyboardShortcuts.set(shortcut.id, shortcut);
                });
            }

            if (config.powerUserFeatures) {
                config.powerUserFeatures.forEach((feature: PowerUserFeature) => {
                    this.powerUserFeatures.set(feature.id, feature);
                });
            }

            if (config.dragDropOperations) {
                config.dragDropOperations.forEach((operation: DragDropOperation) => {
                    this.dragDropOperations.set(operation.id, operation);
                });
            }

            if (config.progressTrackers) {
                config.progressTrackers.forEach((tracker: VisualProgressTracker) => {
                    this.progressTrackers.set(tracker.id, tracker);
                });
            }

            if (config.customizableViews) {
                config.customizableViews.forEach((view: CustomizableView) => {
                    this.customizableViews.set(view.id, view);
                });
            }

            await this.saveAllUIConfigurations();
            return true;
        } catch (error) {
            this.errorHandlingService.logError(
                error instanceof Error ? error : new Error('Failed to import UI configuration'),
                {
                    category: ErrorCategory.UNKNOWN,
                    details: 'Failed to import UI configuration',
                    context: {  error: error  }
                }
            );
            return false;
        }
    }

    private initializeDefaultShortcuts(): void {
        // Add default keyboard shortcuts
        const defaultShortcuts = [
            {
                key: 'Ctrl+Shift+M',
                command: 'migrateEndpoint',
                context: 'editor',
                description: 'Migrate selected endpoint',
                category: 'migration'
            },
            {
                key: 'Ctrl+Shift+B',
                command: 'bulkMigrate',
                context: 'explorer',
                description: 'Bulk migrate all endpoints',
                category: 'migration'
            },
            {
                key: 'Ctrl+Shift+S',
                command: 'scanProject',
                context: 'global',
                description: 'Scan project for endpoints',
                category: 'scanning'
            },
            {
                key: 'Ctrl+Shift+V',
                command: 'validateMigration',
                context: 'editor',
                description: 'Validate migration',
                category: 'validation'
            }
        ];

        defaultShortcuts.forEach(shortcut => {
            this.keyboardShortcuts.set(shortcut.key, {
                id: this.generateId(),
                ...shortcut,
                enabled: true
            });
        });
    }

    private initializePowerUserFeatures(): void {
        // Add default power user features
        const defaultFeatures = [
            {
                name: 'Quick Migration Macro',
                description: 'Quickly migrate multiple endpoints with custom settings',
                type: 'macro' as const,
                implementation: 'executeMigrationMacro',
                parameters: { batchSize: 5, validateEach: true },
                category: 'migration'
            },
            {
                name: 'Custom Migration Template',
                description: 'Create and use custom migration templates',
                type: 'template' as const,
                implementation: 'applyCustomTemplate',
                parameters: { templateId: 'custom' },
                category: 'templates'
            },
            {
                name: 'Advanced Search',
                description: 'Advanced search with regex and filters',
                type: 'shortcut' as const,
                implementation: 'openAdvancedSearch',
                parameters: {},
                category: 'search'
            }
        ];

        defaultFeatures.forEach(feature => {
            this.powerUserFeatures.set(feature.name, {
                id: this.generateId(),
                ...feature,
                enabled: true
            });
        });
    }

    private async saveDashboards(): Promise<void> {
        const data = Array.from(this.dashboards.values());
        await this.context.globalState.update('dashboards', data);
    }

    private async saveFlowDiagrams(): Promise<void> {
        const data = Array.from(this.flowDiagrams.values());
        await this.context.globalState.update('flowDiagrams', data);
    }

    private async saveKeyboardShortcuts(): Promise<void> {
        const data = Array.from(this.keyboardShortcuts.values());
        await this.context.globalState.update('keyboardShortcuts', data);
    }

    private async savePowerUserFeatures(): Promise<void> {
        const data = Array.from(this.powerUserFeatures.values());
        await this.context.globalState.update('powerUserFeatures', data);
    }

    private async saveDragDropOperations(): Promise<void> {
        const data = Array.from(this.dragDropOperations.values());
        await this.context.globalState.update('dragDropOperations', data);
    }

    private async saveProgressTrackers(): Promise<void> {
        const data = Array.from(this.progressTrackers.values());
        await this.context.globalState.update('progressTrackers', data);
    }

    private async saveCustomizableViews(): Promise<void> {
        const data = Array.from(this.customizableViews.values());
        await this.context.globalState.update('customizableViews', data);
    }

    private async saveAllUIConfigurations(): Promise<void> {
        await Promise.all([
            this.saveDashboards(),
            this.saveFlowDiagrams(),
            this.saveKeyboardShortcuts(),
            this.savePowerUserFeatures(),
            this.saveDragDropOperations(),
            this.saveProgressTrackers(),
            this.saveCustomizableViews()
        ]);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }
}
