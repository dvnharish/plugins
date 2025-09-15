import * as vscode from 'vscode';
import { Issue } from '@devguard/shared';
import { CopilotService } from '../services/copilot-service';

export class ExplainPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devguardExplainView';
    private _view?: vscode.WebviewView;
    private _currentIssue?: Issue;

    constructor(private copilotService: CopilotService) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'fixWithCopilot':
                        if (this._currentIssue) {
                            this.copilotService.fixIssue(this._currentIssue);
                        }
                        return;
                    case 'showDiff':
                        if (this._currentIssue) {
                            this.copilotService.showDiff(this._currentIssue);
                        }
                        return;
                    case 'undoFix':
                        if (this._currentIssue) {
                            this.copilotService.undoFix(this._currentIssue);
                        }
                        return;
                }
            },
            undefined,
            []
        );
    }

    public showIssue(issue: Issue) {
        this._currentIssue = issue;
        if (this._view) {
            this._view.webview.html = this.getHtmlForWebview(this._view.webview);
            this._view.show();
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        if (!this._currentIssue) {
            return this.getEmptyHtml();
        }

        const issue = this._currentIssue;
        const severityIcon = this.getSeverityIcon(issue.severity);
        const categoryIcon = this.getCategoryIcon(issue.category);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevGuard Issue Details</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    margin: 0;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .meta {
                    display: flex;
                    gap: 15px;
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground);
                }
                .section {
                    margin-bottom: 20px;
                }
                .section-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textLink-foreground);
                }
                .content {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 12px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                    font-family: var(--vscode-editor-font-family);
                    white-space: pre-wrap;
                }
                .code-snippet {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 12px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-panel-border);
                    font-family: var(--vscode-editor-font-family);
                    font-size: 13px;
                    overflow-x: auto;
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }
                .btn-primary {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                .btn-primary:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .btn-secondary {
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .btn-secondary:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground);
                }
                .references {
                    list-style: none;
                    padding: 0;
                }
                .references li {
                    margin-bottom: 5px;
                }
                .references a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                .references a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${severityIcon} ${issue.rule}</div>
                <div class="meta">
                    <span>${categoryIcon} ${issue.category.toUpperCase()}</span>
                    <span>📁 ${issue.file}:${issue.line}</span>
                    <span>🔍 ${issue.severity.toUpperCase()}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Description</div>
                <div class="content">${issue.description}</div>
            </div>

            <div class="section">
                <div class="section-title">Why it fails in production</div>
                <div class="content">${issue.message}</div>
            </div>

            <div class="section">
                <div class="section-title">Recommended fix</div>
                <div class="content">${issue.remediation}</div>
            </div>

            ${issue.codeSnippet ? `
            <div class="section">
                <div class="section-title">Code snippet</div>
                <div class="code-snippet">${this.escapeHtml(issue.codeSnippet)}</div>
            </div>
            ` : ''}

            ${issue.references && issue.references.length > 0 ? `
            <div class="section">
                <div class="section-title">References</div>
                <ul class="references">
                    ${issue.references.map(ref => `
                        <li><a href="${ref.url}" target="_blank">${ref.title}</a></li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="actions">
                <button class="btn btn-primary" onclick="fixWithCopilot()">✅ Fix with Copilot</button>
                <button class="btn btn-secondary" onclick="showDiff()">📖 Show Diff</button>
                <button class="btn btn-secondary" onclick="undoFix()">↩ Undo Fix</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function fixWithCopilot() {
                    vscode.postMessage({ command: 'fixWithCopilot' });
                }
                
                function showDiff() {
                    vscode.postMessage({ command: 'showDiff' });
                }
                
                function undoFix() {
                    vscode.postMessage({ command: 'undoFix' });
                }
            </script>
        </body>
        </html>`;
    }

    private getEmptyHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevGuard Issue Details</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    margin: 0;
                    text-align: center;
                }
                .empty-state {
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                <h3>No issue selected</h3>
                <p>Click on an issue in the DevGuard panel to view details</p>
            </div>
        </body>
        </html>`;
    }

    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🔵';
            case 'info': return '⚪';
            default: return '⚪';
        }
    }

    private getCategoryIcon(category: string): string {
        switch (category) {
            case 'security': return '🔒';
            case 'oss': return '📦';
            case 'secrets': return '🔑';
            case 'concurrency': return '🔀';
            case 'tests': return '🧪';
            case 'style': return '🎨';
            default: return '📝';
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
