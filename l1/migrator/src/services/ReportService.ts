// Removed unused import

/**
 * Interface for report data
 */
export interface ReportData {
  totalMigrations: number;
  successfulMigrations: number;
  failedMigrations: number;
  successRate: number;
  recentMigrations: any[];
  migrationHistory: any[];
  performanceMetrics?: {
    averageTime: number;
    fastestTime: number;
    slowestTime: number;
  };
}

/**
 * Interface for report generation options
 */
export interface ReportOptions {
  migrationHistory: any[];
  migrationStats: any;
  includeDetails: boolean;
  includeErrors: boolean;
  includePerformance: boolean;
}

/**
 * Service for generating and managing migration reports
 */
export class ReportService {
  /**
   * Generate a comprehensive migration report
   */
  public async generateReport(options: ReportOptions): Promise<ReportData> {
    const { migrationHistory, migrationStats, includeDetails, includeErrors, includePerformance } = options;

    // Calculate basic statistics
    const totalMigrations = migrationHistory.length;
    const successfulMigrations = migrationHistory.filter(m => m.success).length;
    const failedMigrations = totalMigrations - successfulMigrations;
    const successRate = totalMigrations > 0 ? successfulMigrations / totalMigrations : 0;

    // Get recent migrations (last 10)
    const recentMigrations = migrationHistory
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Calculate performance metrics if requested
    let performanceMetrics;
    if (includePerformance && migrationHistory.length > 0) {
      const times = migrationHistory
        .filter(m => m.duration !== undefined)
        .map(m => m.duration);
      
      if (times.length > 0) {
        performanceMetrics = {
          averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
          fastestTime: Math.min(...times),
          slowestTime: Math.max(...times)
        };
      }
    }

    return {
      totalMigrations,
      successfulMigrations,
      failedMigrations,
      successRate,
      recentMigrations,
      migrationHistory,
      performanceMetrics
    };
  }

  /**
   * Export report in specified format
   */
  public async exportReport(reportData: ReportData, format: string): Promise<string> {
    switch (format.toLowerCase()) {
      case 'markdown':
        return this.exportAsMarkdown(reportData);
      case 'sarif':
        return this.exportAsSarif(reportData);
      case 'json':
        return this.exportAsJson(reportData);
      case 'csv':
        return this.exportAsCsv(reportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as Markdown
   */
  private exportAsMarkdown(reportData: ReportData): string {
    const timestamp = new Date().toISOString();
    
    return `# Migration Report

Generated: ${timestamp}

## Summary

- **Total Migrations**: ${reportData.totalMigrations}
- **Successful**: ${reportData.successfulMigrations}
- **Failed**: ${reportData.failedMigrations}
- **Success Rate**: ${Math.round(reportData.successRate * 100)}%

## Recent Migrations

${reportData.recentMigrations.map(migration => `
### ${migration.endpointType || 'Unknown Endpoint'}
- **File**: ${migration.filePath}:${migration.lineNumber}
- **Status**: ${migration.success ? '✅ Success' : '❌ Failed'}
- **Timestamp**: ${new Date(migration.timestamp).toLocaleString()}
${migration.error ? `- **Error**: ${migration.error}` : ''}
`).join('\n')}

## Performance Metrics

${reportData.performanceMetrics ? `
- **Average Time**: ${reportData.performanceMetrics.averageTime}ms
- **Fastest**: ${reportData.performanceMetrics.fastestTime}ms
- **Slowest**: ${reportData.performanceMetrics.slowestTime}ms
` : 'No performance data available'}

## Failed Migrations

${reportData.migrationHistory
  .filter(m => !m.success)
  .map(migration => `
### ${migration.endpointType || 'Unknown Endpoint'}
- **File**: ${migration.filePath}:${migration.lineNumber}
- **Error**: ${migration.error || 'Unknown error'}
- **Timestamp**: ${new Date(migration.timestamp).toLocaleString()}
`).join('\n')}
`;
  }

  /**
   * Export as SARIF
   */
  private exportAsSarif(reportData: ReportData): string {
    const timestamp = new Date().toISOString();
    
    const sarif = {
      "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      "version": "2.1.0",
      "runs": [{
        "tool": {
          "driver": {
            "name": "Converge to Elavon Migrator",
            "version": "1.0.0",
            "informationUri": "https://github.com/elavonx/migrator"
          }
        },
        "results": reportData.migrationHistory.map(migration => ({
          "ruleId": migration.success ? "migration-success" : "migration-failure",
          "level": migration.success ? "note" : "error",
          "message": {
            "text": migration.success 
              ? `Successfully migrated ${migration.endpointType}`
              : `Failed to migrate ${migration.endpointType}: ${migration.error || 'Unknown error'}`
          },
          "locations": [{
            "physicalLocation": {
              "artifactLocation": {
                "uri": migration.filePath
              },
              "region": {
                "startLine": migration.lineNumber,
                "endLine": migration.lineNumber
              }
            }
          }],
          "properties": {
            "endpointType": migration.endpointType,
            "timestamp": migration.timestamp,
            "success": migration.success
          }
        }))
      }]
    };

    return JSON.stringify(sarif, null, 2);
  }

  /**
   * Export as JSON
   */
  private exportAsJson(reportData: ReportData): string {
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Export as CSV
   */
  private exportAsCsv(reportData: ReportData): string {
    const headers = ['Endpoint Type', 'File Path', 'Line Number', 'Success', 'Timestamp', 'Error'];
    const rows = reportData.migrationHistory.map(migration => [
      migration.endpointType || 'Unknown',
      migration.filePath,
      migration.lineNumber,
      migration.success ? 'Yes' : 'No',
      new Date(migration.timestamp).toISOString(),
      migration.error || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}
