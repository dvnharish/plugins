import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';

/**
 * Data provider for the migration view in the Activity Bar
 */
export class MigrationViewProvider implements vscode.TreeDataProvider<MigrationViewItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MigrationViewItem | undefined | null | void> = new vscode.EventEmitter<MigrationViewItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MigrationViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private hasMigrations: boolean = false;
  private migrationCount: number = 0;

  constructor(private readonly serviceContainer: ServiceContainer) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MigrationViewItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MigrationViewItem): Promise<MigrationViewItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new MigrationViewItem(
          this.hasMigrations ? `${this.migrationCount} Migration(s) Completed` : 'No Migrations Yet',
          this.hasMigrations ? 'Click to view history' : 'Start migration process',
          vscode.TreeItemCollapsibleState.None,
          this.hasMigrations ? 'view-history' : 'start-migration'
        )
      ]);
    }

    return Promise.resolve([]);
  }

  updateMigrationStatus(hasMigrations: boolean, count: number = 0): void {
    this.hasMigrations = hasMigrations;
    this.migrationCount = count;
    this.refresh();
  }
}

/**
 * Tree item for the migration view
 */
export class MigrationViewItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);

    this.description = description;
    this.contextValue = contextValue;

    // Set appropriate icons and commands
    switch (contextValue) {
      case 'start-migration':
        this.iconPath = new vscode.ThemeIcon('arrow-right');
        this.command = {
          command: 'elavonx.bulkMigrate',
          title: 'Start Migration Process'
        };
        break;
      case 'view-history':
        this.iconPath = new vscode.ThemeIcon('history');
        this.command = {
          command: 'elavonx.showMigrationHistory',
          title: 'View Migration History'
        };
        break;
    }
  }
}

