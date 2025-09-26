import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';

/**
 * Data provider for the scan view in the Activity Bar
 */
export class ScanViewProvider implements vscode.TreeDataProvider<ScanViewItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ScanViewItem | undefined | null | void> = new vscode.EventEmitter<ScanViewItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ScanViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private endpoints: any[] = [];
  private hasEndpoints: boolean = false;

  constructor(private readonly serviceContainer: ServiceContainer) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ScanViewItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ScanViewItem): Promise<ScanViewItem[]> {
    if (!element) {
      // Root level items
      if (!this.hasEndpoints) {
        return Promise.resolve([
          new ScanViewItem(
            'No Converge endpoints found',
            'Click to scan project',
            vscode.TreeItemCollapsibleState.None,
            'scan-project'
          )
        ]);
      }

      return Promise.resolve([
        new ScanViewItem(
          `Found ${this.endpoints.length} Converge endpoint(s)`,
          'Click to refresh',
          vscode.TreeItemCollapsibleState.Expanded,
          'refresh-endpoints'
        )
      ]);
    }

    if (element.contextValue === 'refresh-endpoints') {
      // Show individual endpoints
      return Promise.resolve(
        this.endpoints.map((endpoint, index) => 
          new ScanViewItem(
            `${endpoint.endpointType} (Line ${endpoint.lineNumber})`,
            endpoint.filePath.split('/').pop() || endpoint.filePath,
            vscode.TreeItemCollapsibleState.None,
            'endpoint',
            endpoint
          )
        )
      );
    }

    return Promise.resolve([]);
  }

  updateEndpoints(endpoints: any[]): void {
    this.endpoints = endpoints;
    this.hasEndpoints = endpoints.length > 0;
    this.refresh();
  }

  clearEndpoints(): void {
    this.endpoints = [];
    this.hasEndpoints = false;
    this.refresh();
  }
}

/**
 * Tree item for the scan view
 */
export class ScanViewItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly endpoint?: any
  ) {
    super(label, collapsibleState);

    this.description = description;
    this.contextValue = contextValue;

    // Set appropriate icons and commands
    switch (contextValue) {
      case 'scan-project':
        this.iconPath = new vscode.ThemeIcon('search');
        this.command = {
          command: 'elavonx.scanProject',
          title: 'Scan Project for Converge Endpoints'
        };
        break;
      case 'refresh-endpoints':
        this.iconPath = new vscode.ThemeIcon('refresh');
        this.command = {
          command: 'elavonx.refreshEndpoints',
          title: 'Refresh Endpoints'
        };
        break;
      case 'endpoint':
        this.iconPath = new vscode.ThemeIcon('symbol-method');
        this.command = {
          command: 'elavonx.migrateEndpoint',
          title: 'Migrate to Elavon',
          arguments: [this.endpoint]
        };
        break;
    }
  }
}

