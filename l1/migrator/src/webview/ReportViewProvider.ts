import * as vscode from 'vscode';
import { MigrationService } from '../services/MigrationService';
import { ReportService } from '../services/ReportService';

/**
 * Tree item for report view
 */
export class ReportViewItem extends vscode.TreeItem {
  public readonly reportData?: any;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    reportData?: any
  ) {
    super(label, collapsibleState);
    this.reportData = reportData;
    
    // Set properties based on report data
    if (reportData) {
      this.tooltip = reportData.description || this.label;
      this.description = reportData.status || '';
      this.contextValue = reportData.type || 'report-item';
      
      // Set icon based on type
      if (reportData.type === 'summary') {
        this.iconPath = new vscode.ThemeIcon('chart-line');
      } else if (reportData.type === 'migration') {
        this.iconPath = new vscode.ThemeIcon('arrow-right');
      } else if (reportData.type === 'error') {
        this.iconPath = new vscode.ThemeIcon('error');
      } else if (reportData.type === 'success') {
        this.iconPath = new vscode.ThemeIcon('check');
      } else {
        this.iconPath = new vscode.ThemeIcon('file-text');
      }
    }
  }
}

/**
 * Tree data provider for report view
 */
export class ReportViewProvider implements vscode.TreeDataProvider<ReportViewItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ReportViewItem | undefined | null | void> = new vscode.EventEmitter<ReportViewItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ReportViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private _migrationService: MigrationService;
  private _reportService: ReportService;
  private _reportData: any = null;

  constructor(migrationService: MigrationService) {
    this._migrationService = migrationService;
    this._reportService = new ReportService();
  }

  /**
   * Refresh the tree data
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item element
   */
  public getTreeItem(element: ReportViewItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of tree item
   */
  public getChildren(element?: ReportViewItem): Promise<ReportViewItem[]> {
    if (!element) {
      return this.getRootItems();
    }

    return this.getChildItems(element);
  }

  /**
   * Get root items
   */
  private async getRootItems(): Promise<ReportViewItem[]> {
    try {
      // Get migration history
      const migrationHistory = this._migrationService.getMigrationHistory();
      const migrationStats = this._migrationService.getMigrationStatistics();

      if (migrationHistory.length === 0) {
        return [
          new ReportViewItem(
            'No migration data available',
            vscode.TreeItemCollapsibleState.None,
            { type: 'empty', description: 'Run migrations to see reports' }
          )
        ];
      }

      // Generate report data
      this._reportData = await this._reportService.generateReport({
        migrationHistory,
        migrationStats,
        includeDetails: true,
        includeErrors: true,
        includePerformance: true
      });

      const items: ReportViewItem[] = [];

      // Summary item
      items.push(new ReportViewItem(
        'Migration Summary',
        vscode.TreeItemCollapsibleState.Collapsed,
        {
          type: 'summary',
          description: `Total: ${this._reportData.totalMigrations}, Success: ${this._reportData.successfulMigrations}, Failed: ${this._reportData.failedMigrations}`,
          status: `${Math.round(this._reportData.successRate * 100)}% success rate`
        }
      ));

      // Recent migrations
      if (this._reportData.recentMigrations && this._reportData.recentMigrations.length > 0) {
        items.push(new ReportViewItem(
          'Recent Migrations',
          vscode.TreeItemCollapsibleState.Collapsed,
          {
            type: 'recent',
            description: `${this._reportData.recentMigrations.length} recent migrations`,
            status: 'Last 10 migrations'
          }
        ));
      }

      // Failed migrations
      if (this._reportData.failedMigrations > 0) {
        items.push(new ReportViewItem(
          'Failed Migrations',
          vscode.TreeItemCollapsibleState.Collapsed,
          {
            type: 'failed',
            description: `${this._reportData.failedMigrations} failed migrations`,
            status: 'Requires attention'
          }
        ));
      }

      // Performance metrics
      if (this._reportData.performanceMetrics) {
        items.push(new ReportViewItem(
          'Performance Metrics',
          vscode.TreeItemCollapsibleState.Collapsed,
          {
            type: 'performance',
            description: 'Migration performance data',
            status: 'Average time and success rates'
          }
        ));
      }

      return items;

    } catch (error) {
      console.error('Error getting root items:', error);
      return [
        new ReportViewItem(
          'Error loading report data',
          vscode.TreeItemCollapsibleState.None,
          { type: 'error', description: error instanceof Error ? error.message : 'Unknown error' }
        )
      ];
    }
  }

  /**
   * Get child items for a tree item
   */
  private async getChildItems(element: ReportViewItem): Promise<ReportViewItem[]> {
    if (!this._reportData) {
      return [];
    }

    const items: ReportViewItem[] = [];

    switch (element.reportData?.type) {
      case 'summary':
        items.push(new ReportViewItem(
          `Total Migrations: ${this._reportData.totalMigrations}`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'stat', description: 'Total number of migration attempts' }
        ));
        items.push(new ReportViewItem(
          `Successful: ${this._reportData.successfulMigrations}`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'success', description: 'Successfully completed migrations' }
        ));
        items.push(new ReportViewItem(
          `Failed: ${this._reportData.failedMigrations}`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'error', description: 'Failed migration attempts' }
        ));
        items.push(new ReportViewItem(
          `Success Rate: ${Math.round(this._reportData.successRate * 100)}%`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'stat', description: 'Overall success rate' }
        ));
        break;

      case 'recent':
        if (this._reportData.recentMigrations) {
          for (const migration of this._reportData.recentMigrations.slice(0, 10)) {
            items.push(new ReportViewItem(
              `${migration.endpointType} - ${migration.timestamp.toLocaleDateString()}`,
              vscode.TreeItemCollapsibleState.None,
              {
                type: migration.success ? 'success' : 'error',
                description: `File: ${migration.filePath}:${migration.lineNumber}`,
                status: migration.success ? 'Success' : 'Failed',
                migration: migration
              }
            ));
          }
        }
        break;

      case 'failed':
        if (this._reportData.failedMigrations > 0) {
          const failedMigrations = this._reportData.migrationHistory?.filter((m: any) => !m.success) || [];
          for (const migration of failedMigrations.slice(0, 10)) {
            items.push(new ReportViewItem(
              `${migration.endpointType} - ${migration.timestamp.toLocaleDateString()}`,
              vscode.TreeItemCollapsibleState.None,
              {
                type: 'error',
                description: `File: ${migration.filePath}:${migration.lineNumber}`,
                status: migration.error || 'Failed',
                migration: migration
              }
            ));
          }
        }
        break;

      case 'performance':
        if (this._reportData.performanceMetrics) {
          const metrics = this._reportData.performanceMetrics;
          items.push(new ReportViewItem(
            `Average Migration Time: ${metrics.averageTime}ms`,
            vscode.TreeItemCollapsibleState.None,
            { type: 'stat', description: 'Average time per migration' }
          ));
          items.push(new ReportViewItem(
            `Fastest Migration: ${metrics.fastestTime}ms`,
            vscode.TreeItemCollapsibleState.None,
            { type: 'stat', description: 'Fastest migration time' }
          ));
          items.push(new ReportViewItem(
            `Slowest Migration: ${metrics.slowestTime}ms`,
            vscode.TreeItemCollapsibleState.None,
            { type: 'stat', description: 'Slowest migration time' }
          ));
        }
        break;
    }

    return items;
  }

  /**
   * Get report data
   */
  public getReportData(): any {
    return this._reportData;
  }

  /**
   * Generate new report
   */
  public async generateReport(): Promise<void> {
    try {
      const migrationHistory = this._migrationService.getMigrationHistory();
      const migrationStats = this._migrationService.getMigrationStatistics();

      this._reportData = await this._reportService.generateReport({
        migrationHistory,
        migrationStats,
        includeDetails: true,
        includeErrors: true,
        includePerformance: true
      });

      this.refresh();
    } catch (error) {
      console.error('Error generating report:', error);
      vscode.window.showErrorMessage('Failed to generate report');
    }
  }

  /**
   * Export report
   */
  public async exportReport(format: string): Promise<void> {
    if (!this._reportData) {
      vscode.window.showWarningMessage('No report data available. Please generate a report first.');
      return;
    }

    try {
      const exportContent = await this._reportService.exportReport(this._reportData, format);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`migration-report.${format}`),
        filters: {
          [format.toUpperCase()]: [format]
        }
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(exportContent, 'utf8'));
        vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      vscode.window.showErrorMessage('Failed to export report');
    }
  }
}
