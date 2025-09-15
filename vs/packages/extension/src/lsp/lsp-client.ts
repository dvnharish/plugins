import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ScanResult, Issue } from '@devguard/shared';

export class LSPClient {
    private client: LanguageClient | undefined;

    constructor(private context: vscode.ExtensionContext) {}

    async start(): Promise<void> {
        try {
            // Server options
            const serverModule = this.context.asAbsolutePath('../server/dist/server.js');
            const serverOptions: ServerOptions = {
                run: { module: serverModule, transport: TransportKind.ipc },
                debug: { module: serverModule, transport: TransportKind.ipc }
            };

            // Client options
            const clientOptions: LanguageClientOptions = {
                documentSelector: [{ scheme: 'file', language: 'java' }],
                synchronize: {
                    fileEvents: vscode.workspace.createFileSystemWatcher('**/*.java')
                }
            };

            // Create and start the client
            this.client = new LanguageClient(
                'devguard-lsp',
                'DevGuard Language Server',
                serverOptions,
                clientOptions
            );

            await this.client.start();
            console.log('DevGuard LSP client started successfully');
            console.log('Server module path:', serverModule);
        } catch (error) {
            console.error('Failed to start LSP client:', error);
            vscode.window.showErrorMessage('Failed to start DevGuard language server');
        }
    }

    async stop(): Promise<void> {
        if (this.client) {
            await this.client.stop();
            this.client = undefined;
        }
    }

    async scanProject(): Promise<ScanResult | null> {
        if (!this.client) {
            throw new Error('LSP client not started');
        }

        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const projectPath = workspaceFolder.uri.fsPath;
            const result = await this.client.sendRequest('devguard/scanProject', { projectPath });
            return result as ScanResult;
        } catch (error) {
            console.error('Scan request failed:', error);
            throw error;
        }
    }

    async getIssues(): Promise<any[]> {
        if (!this.client) {
            throw new Error('LSP client not started');
        }

        try {
            const result = await this.client.sendRequest('devguard/getIssues');
            return result as any[];
        } catch (error) {
            console.error('Get issues request failed:', error);
            throw error;
        }
    }

    async fixIssue(issue: Issue, codeSnippet: string): Promise<{ success: boolean; patch?: string; error?: string }> {
        if (!this.client) {
            throw new Error('LSP client not started');
        }

        try {
            const result = await this.client.sendRequest('devguard/fixIssue', { issue, codeSnippet });
            return result as { success: boolean; patch?: string; error?: string };
        } catch (error) {
            console.error('Fix issue request failed:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    dispose(): void {
        this.stop();
    }
}
