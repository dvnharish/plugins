import * as vscode from 'vscode';
import { ErrorHandlingService, ErrorSeverity, ErrorCategory } from './ErrorHandlingService';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Log entry
 */
export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  context: {
    filePath?: string;
    functionName?: string;
    lineNumber?: number;
    userId?: string;
    sessionId?: string;
    workspaceRoot?: string;
  };
  data?: any;
  duration?: number; // in milliseconds
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Service for detailed logging and performance monitoring
 */
export class LoggingService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 5000; // Keep only last 5000 log entries
  private readonly logsKey = 'converge-elavon.logs';
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private sessionId: string;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly errorHandlingService: ErrorHandlingService
  ) {
    this.sessionId = this.generateSessionId();
    this.loadLogs();
  }

  /**
   * Log a message
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Partial<LogEntry['context']>,
    data?: any
  ): string {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      level,
      message,
      timestamp: new Date(),
      context: {
        sessionId: this.sessionId,
        workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        ...context
      },
      data
    };

    this.addLogEntry(logEntry);
    return logEntry.id;
  }

  /**
   * Log debug message
   */
  public debug(message: string, context?: Partial<LogEntry['context']>, data?: any): string {
    return this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Partial<LogEntry['context']>, data?: any): string {
    return this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context?: Partial<LogEntry['context']>, data?: any): string {
    return this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Log error message
   */
  public error(message: string, context?: Partial<LogEntry['context']>, data?: any): string {
    return this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Log critical message
   */
  public critical(message: string, context?: Partial<LogEntry['context']>, data?: any): string {
    return this.log(LogLevel.CRITICAL, message, context, data);
  }

  /**
   * Start performance monitoring
   */
  public startPerformanceMonitoring(
    operation: string,
    metadata?: Record<string, any>
  ): string {
    const operationId = this.generateLogId();
    const metrics: PerformanceMetrics = {
      operation,
      startTime: new Date(),
      success: false,
      metadata: metadata || {}
    };

    this.performanceMetrics.set(operationId, metrics);
    return operationId;
  }

  /**
   * End performance monitoring
   */
  public endPerformanceMonitoring(
    operationId: string,
    success: boolean = true,
    error?: string
  ): PerformanceMetrics | null {
    const metrics = this.performanceMetrics.get(operationId);
    if (!metrics) {
      return null;
    }

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.success = success;
    metrics.error = error || '';

    // Log performance metrics
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      `Performance: ${metrics.operation} completed in ${metrics.duration}ms`,
      { functionName: 'PerformanceMonitoring' },
      metrics
    );

    this.performanceMetrics.delete(operationId);
    return metrics;
  }

  /**
   * Log function execution
   */
  public async logFunctionExecution<T>(
    functionName: string,
    fn: () => Promise<T>,
    context?: Partial<LogEntry['context']>
  ): Promise<T> {
    const operationId = this.startPerformanceMonitoring(functionName, context);
    
    try {
      this.debug(`Starting execution: ${functionName}`, context);
      const result = await fn();
      this.endPerformanceMonitoring(operationId, true);
      this.debug(`Completed execution: ${functionName}`, context);
      return result;
    } catch (error) {
      this.endPerformanceMonitoring(operationId, false, error instanceof Error ? error.message : 'Unknown error');
      this.error(`Failed execution: ${functionName}`, context, error);
      throw error;
    }
  }

  /**
   * Get logs by level
   */
  public getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by context
   */
  public getLogsByContext(context: Partial<LogEntry['context']>): LogEntry[] {
    return this.logs.filter(log => {
      return Object.entries(context).every(([key, value]) => 
        log.context[key as keyof LogEntry['context']] === value
      );
    });
  }

  /**
   * Get recent logs
   */
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(0, count);
  }

  /**
   * Get all logs
   */
  public getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStatistics(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowestOperations: PerformanceMetrics[];
    fastestOperations: PerformanceMetrics[];
  } {
    const allMetrics = this.getPerformanceMetrics();
    const completedMetrics = allMetrics.filter(m => m.endTime);

    const totalOperations = completedMetrics.length;
    const averageDuration = totalOperations > 0
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalOperations
      : 0;
    
    const successRate = totalOperations > 0
      ? completedMetrics.filter(m => m.success).length / totalOperations
      : 0;

    const slowestOperations = [...completedMetrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const fastestOperations = [...completedMetrics]
      .sort((a, b) => (a.duration || 0) - (b.duration || 0))
      .slice(0, 10);

    return {
      totalOperations,
      averageDuration,
      successRate,
      slowestOperations,
      fastestOperations
    };
  }

  /**
   * Clear all logs
   */
  public clearAllLogs(): void {
    this.logs = [];
    this.performanceMetrics.clear();
    this.saveLogs();
  }

  /**
   * Clear old logs (keep only recent ones)
   */
  public clearOldLogs(keepCount: number = 1000): void {
    this.logs = this.logs.slice(0, keepCount);
    this.saveLogs();
  }

  /**
   * Export logs
   */
  public exportLogs(): string {
    const exportData = {
      exportDate: new Date().toISOString(),
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      logs: this.logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      })),
      performanceMetrics: Array.from(this.performanceMetrics.values()).map(metrics => ({
        ...metrics,
        startTime: metrics.startTime.toISOString(),
        endTime: metrics.endTime?.toISOString()
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import logs
   */
  public importLogs(exportData: string): boolean {
    try {
      const data = JSON.parse(exportData);
      
      if (data.logs && Array.isArray(data.logs)) {
        const importedLogs = data.logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));

        this.logs = [...this.logs, ...importedLogs];
        this.saveLogs();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import logs:', error);
      return false;
    }
  }

  /**
   * Add log entry
   */
  private addLogEntry(logEntry: LogEntry): void {
    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Save to storage
    this.saveLogs();

    // Also log to console for debugging
    this.logToConsole(logEntry);
  }

  /**
   * Log to console
   */
  private logToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const level = LogLevel[logEntry.level];
    const context = logEntry.context.filePath ? ` [${logEntry.context.filePath}]` : '';
    const message = `[${timestamp}] ${level}${context}: ${logEntry.message}`;

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.data);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.data);
        break;
      case LogLevel.ERROR:
        console.error(message, logEntry.data);
        break;
      case LogLevel.CRITICAL:
        console.error(`[CRITICAL] ${message}`, logEntry.data);
        break;
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load logs from storage
   */
  private loadLogs(): void {
    try {
      const stored = this.context.globalState.get<string>(this.logsKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.logs = data.logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  /**
   * Save logs to storage
   */
  private saveLogs(): void {
    try {
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        logs: this.logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString()
        }))
      };

      this.context.globalState.update(this.logsKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }
}
