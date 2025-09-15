import * as vscode from 'vscode';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  PARSING = 'parsing',
  MIGRATION = 'migration',
  VALIDATION = 'validation',
  CREDENTIALS = 'credentials',
  NETWORK = 'network',
  FILE_SYSTEM = 'file_system',
  CONFIGURATION = 'configuration',
  USER_INPUT = 'user_input',
  CICD = 'cicd',
  SECURITY = 'security',
  PACKAGING = 'packaging',
  UNKNOWN = 'unknown'
}

/**
 * Error context information
 */
export interface ErrorContext {
  filePath?: string;
  lineNumber?: number;
  endpointType?: string;
  migrationId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  userAgent?: string;
  workspaceRoot?: string;
  error?: any;
  stepId?: string;
  pipelineId?: string;
  executionId?: string;
  importedBy?: string;
  reportId?: string;
  suiteId?: string;
  testCaseId?: string;
  apiCall?: any;
  integrationId?: string;
  message?: string;
  event?: any;
  config?: any;
  resolutionId?: string;
  service?: string;
  projectId?: string;
  role?: string;
  sharedBy?: string;
  workflowId?: string;
  summary?: string;
  errorContext?: any;
}

/**
 * Error entry
 */
export interface ErrorEntry {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  details?: string;
  stackTrace?: string;
  context: ErrorContext;
  resolved: boolean;
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsBySeverity: Map<ErrorSeverity, number>;
  errorsByCategory: Map<ErrorCategory, number>;
  recentErrors: ErrorEntry[];
  unresolvedErrors: ErrorEntry[];
  averageResolutionTime: number; // in minutes
}

/**
 * Service for centralized error handling and logging
 */
export class ErrorHandlingService {
  private errors: ErrorEntry[] = [];
  private readonly maxErrors = 1000; // Keep only last 1000 errors
  private readonly errorsKey = 'converge-elavon.errors';
  private sessionId: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.sessionId = this.generateSessionId();
    this.loadErrors();
  }

  /**
   * Log an error
   */
  public logError(
    error: Error | string,
    options: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: Partial<ErrorContext>;
      details?: string;
      showToUser?: boolean;
    } = {}
  ): string {
    const {
      severity = ErrorSeverity.ERROR,
      category = ErrorCategory.UNKNOWN,
      context: errorContext = {},
      details,
      showToUser = true
    } = options;

    const errorMessage = error instanceof Error ? error.message : error;
    const stackTrace = error instanceof Error ? error.stack : undefined;

    const errorEntry: ErrorEntry = {
      id: this.generateErrorId(),
      severity,
      category,
      message: errorMessage,
      details: details || '',
      stackTrace: stackTrace || '',
      context: {
        timestamp: new Date(),
        sessionId: this.sessionId,
        workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        ...errorContext
      },
      resolved: false,
      createdAt: new Date()
    };

    // Add to errors list
    this.errors.unshift(errorEntry);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Save to storage
    this.saveErrors();

    // Show to user if requested
    if (showToUser) {
      this.showErrorToUser(errorEntry);
    }

    // Log to console for debugging
    this.logToConsole(errorEntry);

    return errorEntry.id;
  }

  /**
   * Log an info message
   */
  public logInfo(
    message: string,
    context?: Partial<ErrorContext>,
    showToUser: boolean = false
  ): string {
    return this.logError(message, {
      severity: ErrorSeverity.INFO,
      context: context || {},
      showToUser
    });
  }

  /**
   * Log a warning
   */
  public logWarning(
    message: string,
    context?: Partial<ErrorContext>,
    showToUser: boolean = true
  ): string {
    return this.logError(message, {
      severity: ErrorSeverity.WARNING,
      context: context || {},
      showToUser
    });
  }

  /**
   * Log a critical error
   */
  public logCritical(
    error: Error | string,
    context?: Partial<ErrorContext>,
    showToUser: boolean = true
  ): string {
    return this.logError(error, {
      severity: ErrorSeverity.CRITICAL,
      context: context || {},
      showToUser
    });
  }

  /**
   * Resolve an error
   */
  public resolveError(errorId: string, resolution: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolution = resolution;
      error.resolvedAt = new Date();
      this.saveErrors();
      return true;
    }
    return false;
  }

  /**
   * Get error by ID
   */
  public getError(errorId: string): ErrorEntry | undefined {
    return this.errors.find(e => e.id === errorId);
  }

  /**
   * Get all errors
   */
  public getAllErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return this.errors.filter(e => e.severity === severity);
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): ErrorEntry[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Get unresolved errors
   */
  public getUnresolvedErrors(): ErrorEntry[] {
    return this.errors.filter(e => !e.resolved);
  }

  /**
   * Get recent errors (last N)
   */
  public getRecentErrors(count: number = 10): ErrorEntry[] {
    return this.errors.slice(0, count);
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(): ErrorStatistics {
    const errorsBySeverity = new Map<ErrorSeverity, number>();
    const errorsByCategory = new Map<ErrorCategory, number>();
    
    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity.set(severity, 0);
    });
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory.set(category, 0);
    });

    // Count errors
    for (const error of this.errors) {
      errorsBySeverity.set(error.severity, (errorsBySeverity.get(error.severity) || 0) + 1);
      errorsByCategory.set(error.category, (errorsByCategory.get(error.category) || 0) + 1);
    }

    // Calculate average resolution time
    const resolvedErrors = this.errors.filter(e => e.resolved && e.resolvedAt);
    const averageResolutionTime = resolvedErrors.length > 0
      ? resolvedErrors.reduce((sum, error) => {
          const resolutionTime = error.resolvedAt!.getTime() - error.createdAt.getTime();
          return sum + (resolutionTime / (1000 * 60)); // Convert to minutes
        }, 0) / resolvedErrors.length
      : 0;

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      errorsByCategory,
      recentErrors: this.getRecentErrors(10),
      unresolvedErrors: this.getUnresolvedErrors(),
      averageResolutionTime
    };
  }

  /**
   * Clear all errors
   */
  public clearAllErrors(): void {
    this.errors = [];
    this.saveErrors();
  }

  /**
   * Clear resolved errors
   */
  public clearResolvedErrors(): void {
    this.errors = this.errors.filter(e => !e.resolved);
    this.saveErrors();
  }

  /**
   * Export errors to JSON
   */
  public exportErrors(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      sessionId: this.sessionId,
      totalErrors: this.errors.length,
      errors: this.errors.map(error => ({
        ...error,
        createdAt: error.createdAt.toISOString(),
        resolvedAt: error.resolvedAt?.toISOString()
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import errors from JSON
   */
  public importErrors(exportData: string): boolean {
    try {
      const data = JSON.parse(exportData);
      
      if (data.errors && Array.isArray(data.errors)) {
        const importedErrors = data.errors.map((error: any) => ({
          ...error,
          createdAt: new Date(error.createdAt),
          resolvedAt: error.resolvedAt ? new Date(error.resolvedAt) : undefined
        }));

        this.errors = [...this.errors, ...importedErrors];
        this.saveErrors();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import errors:', error);
      return false;
    }
  }

  /**
   * Show error to user based on severity
   */
  private showErrorToUser(error: ErrorEntry): void {
    const message = `${error.message}${error.details ? `\n\nDetails: ${error.details}` : ''}`;
    
    switch (error.severity) {
      case ErrorSeverity.INFO:
        vscode.window.showInformationMessage(message);
        break;
      case ErrorSeverity.WARNING:
        vscode.window.showWarningMessage(message);
        break;
      case ErrorSeverity.ERROR:
        vscode.window.showErrorMessage(message);
        break;
      case ErrorSeverity.CRITICAL:
        vscode.window.showErrorMessage(
          `CRITICAL ERROR: ${message}`,
          { modal: true },
          'View Details',
          'Report Issue'
        ).then(selection => {
          if (selection === 'View Details') {
            this.showErrorDetails(error);
          } else if (selection === 'Report Issue') {
            this.reportError(error);
          }
        });
        break;
    }
  }

  /**
   * Show detailed error information
   */
  private async showErrorDetails(error: ErrorEntry): Promise<void> {
    const details = `
Error Details

ID: ${error.id}
Severity: ${error.severity}
Category: ${error.category}
Message: ${error.message}
${error.details ? `Details: ${error.details}` : ''}
${error.context.filePath ? `File: ${error.context.filePath}` : ''}
${error.context.lineNumber ? `Line: ${error.context.lineNumber}` : ''}
${error.context.endpointType ? `Endpoint: ${error.context.endpointType}` : ''}
Timestamp: ${error.context.timestamp.toLocaleString()}
Session: ${error.context.sessionId}
${error.stackTrace ? `\nStack Trace:\n${error.stackTrace}` : ''}
    `.trim();

    const doc = await vscode.workspace.openTextDocument({
      content: details,
      language: 'plaintext'
    });
    
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Report error (placeholder for future implementation)
   */
  private reportError(error: ErrorEntry): void {
    // TODO: Implement error reporting to external service
    vscode.window.showInformationMessage('Error reporting feature will be implemented in future versions');
  }

  /**
   * Log to console
   */
  private logToConsole(error: ErrorEntry): void {
    const logMessage = `[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.INFO:
        console.info(logMessage, error);
        break;
      case ErrorSeverity.WARNING:
        console.warn(logMessage, error);
        break;
      case ErrorSeverity.ERROR:
        console.error(logMessage, error);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`[CRITICAL] ${logMessage}`, error);
        break;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load errors from storage
   */
  private loadErrors(): void {
    try {
      const stored = this.context.globalState.get<string>(this.errorsKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.errors = data.errors.map((error: any) => ({
          ...error,
          createdAt: new Date(error.createdAt),
          resolvedAt: error.resolvedAt ? new Date(error.resolvedAt) : undefined,
          context: {
            ...error.context,
            timestamp: new Date(error.context.timestamp)
          }
        }));
      }
    } catch (error) {
      console.warn('Failed to load errors from storage:', error);
      this.errors = [];
    }
  }

  /**
   * Save errors to storage
   */
  private saveErrors(): void {
    try {
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        errors: this.errors.map(error => ({
          ...error,
          createdAt: error.createdAt.toISOString(),
          resolvedAt: error.resolvedAt?.toISOString(),
          context: {
            ...error.context,
            timestamp: error.context.timestamp.toISOString()
          }
        }))
      };

      this.context.globalState.update(this.errorsKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save errors to storage:', error);
    }
  }
}
