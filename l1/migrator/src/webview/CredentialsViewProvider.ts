import * as vscode from 'vscode';
import { ServiceContainer } from '../core/ServiceContainer';

/**
 * Data provider for the credentials view in the Activity Bar
 */
export class CredentialsViewProvider implements vscode.TreeDataProvider<CredentialsViewItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CredentialsViewItem | undefined | null | void> = new vscode.EventEmitter<CredentialsViewItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CredentialsViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private hasCredentials: boolean = false;

  constructor(private readonly serviceContainer: ServiceContainer) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CredentialsViewItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: CredentialsViewItem): Promise<CredentialsViewItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new CredentialsViewItem(
          this.hasCredentials ? 'Elavon Credentials Configured' : 'Configure Elavon Credentials',
          this.hasCredentials ? 'Click to manage' : 'Click to configure',
          vscode.TreeItemCollapsibleState.None,
          this.hasCredentials ? 'manage-credentials' : 'configure-credentials'
        )
      ]);
    }

    return Promise.resolve([]);
  }

  updateCredentialsStatus(hasCredentials: boolean): void {
    this.hasCredentials = hasCredentials;
    this.refresh();
  }
}

/**
 * Tree item for the credentials view
 */
export class CredentialsViewItem extends vscode.TreeItem {
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
      case 'configure-credentials':
        this.iconPath = new vscode.ThemeIcon('key');
        this.command = {
          command: 'elavonx.openCredentials',
          title: 'Configure Elavon Credentials'
        };
        break;
      case 'manage-credentials':
        this.iconPath = new vscode.ThemeIcon('gear');
        this.command = {
          command: 'elavonx.openCredentials',
          title: 'Manage Elavon Credentials'
        };
        break;
    }
  }
}

