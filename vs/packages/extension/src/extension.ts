import * as vscode from 'vscode';
import { DevGuardProvider } from './providers/devguard-provider';
import { ExplainPanelProvider } from './providers/explain-panel-provider';
import { CopilotService } from './services/copilot-service';
import { TestGeneratorService } from './services/test-generator-service';
import { ReportService } from './services/report-service';
import { LSPClient } from './lsp/lsp-client';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevGuard extension is now active!');

    // Initialize services
    const lspClient = new LSPClient(context);
    const copilotService = new CopilotService();
    const testGeneratorService = new TestGeneratorService();
    const reportService = new ReportService();

    // Initialize providers
    const devGuardProvider = new DevGuardProvider(lspClient, copilotService);
    const explainPanelProvider = new ExplainPanelProvider(copilotService);

    // Register tree data provider
    const treeView = vscode.window.createTreeView('devguardView', {
        treeDataProvider: devGuardProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register webview panel provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('devguardExplainView', explainPanelProvider)
    );

    // Create status bar item for readiness score
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'devguard.scanProject';
    statusBarItem.text = '$(shield) DevGuard: Ready';
    statusBarItem.tooltip = 'Click to scan project with DevGuard';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('devguard.scanProject', async () => {
            statusBarItem.text = '$(loading~spin) DevGuard: Scanning...';
            try {
                const result = await devGuardProvider.scanProject();
                if (result) {
                    reportService.setLastScanResult(result);
                    statusBarItem.text = `$(shield) DevGuard: ${result.score}/100`;
                    statusBarItem.tooltip = `Production Readiness Score: ${result.score}/100\nClick to scan again`;
                } else {
                    statusBarItem.text = '$(shield) DevGuard: Error';
                    statusBarItem.tooltip = 'Scan failed. Click to try again';
                }
            } catch (error) {
                statusBarItem.text = '$(shield) DevGuard: Error';
                statusBarItem.tooltip = 'Scan failed. Click to try again';
            }
        }),
        vscode.commands.registerCommand('devguard.explainIssue', (issue) => {
            explainPanelProvider.showIssue(issue);
        }),
        vscode.commands.registerCommand('devguard.fixWithCopilot', (issue) => {
            copilotService.fixIssue(issue);
        }),
        vscode.commands.registerCommand('devguard.showDiff', (issue) => {
            copilotService.showDiff(issue);
        }),
        vscode.commands.registerCommand('devguard.undoFix', (issue) => {
            copilotService.undoFix(issue);
        }),
        vscode.commands.registerCommand('devguard.generateTests', (uri) => {
            testGeneratorService.generateTests(uri);
        }),
        vscode.commands.registerCommand('devguard.exportReport', () => {
            reportService.exportReport();
        })
    ];

    // Add to subscriptions
    context.subscriptions.push(...commands, lspClient);

    // Start LSP client
    lspClient.start();
}

export function deactivate() {
    console.log('DevGuard extension is now deactivated!');
}
