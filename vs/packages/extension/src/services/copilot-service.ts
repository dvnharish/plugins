import * as vscode from 'vscode';
import { Issue, CopilotFixRequest, CopilotFixResponse } from '@devguard/shared';

export class CopilotService {
    private fixHistory: Map<string, string> = new Map();

    async fixIssue(issue: Issue): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('devguard');
            const applyMode = config.get<string>('copilot.applyFix', 'auto');

            // Prepare fix request
            const fixRequest: CopilotFixRequest = {
                issue,
                codeSnippet: issue.codeSnippet || '',
                context: this.buildContext(issue)
            };

            // Get fix from Copilot (mock implementation)
            const fixResponse = await this.getCopilotFix(fixRequest);

            if (fixResponse.success && fixResponse.patch) {
                // Store original content for undo
                const document = await vscode.workspace.openTextDocument(issue.file);
                this.fixHistory.set(issue.id, document.getText());

                // Apply fix based on configuration
                switch (applyMode) {
                    case 'auto':
                        await this.applyFix(issue, fixResponse.patch);
                        break;
                    case 'preview':
                        await this.previewFix(issue, fixResponse.patch);
                        break;
                    case 'ask':
                        await this.askUser(issue, fixResponse.patch);
                        break;
                }
            } else {
                vscode.window.showErrorMessage(`❌ Failed to generate fix: ${fixResponse.error}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Fix failed: ${error}`);
        }
    }

    async showDiff(issue: Issue): Promise<void> {
        try {
            const fixRequest: CopilotFixRequest = {
                issue,
                codeSnippet: issue.codeSnippet || '',
                context: this.buildContext(issue)
            };

            const fixResponse = await this.getCopilotFix(fixRequest);
            
            if (fixResponse.success && fixResponse.patch) {
                const document = await vscode.workspace.openTextDocument(issue.file);
                const originalText = document.getText();
                
                // Create a temporary document with the fix applied
                const tempUri = vscode.Uri.parse(`untitled:${issue.file}.fixed`);
                const tempDoc = await vscode.workspace.openTextDocument(tempUri);
                const edit = new vscode.WorkspaceEdit();
                edit.insert(tempUri, new vscode.Position(0, 0), this.applyPatch(originalText, fixResponse.patch));
                await vscode.workspace.applyEdit(edit);

                // Show diff
                await vscode.commands.executeCommand('vscode.diff', 
                    vscode.Uri.file(issue.file), 
                    tempUri, 
                    `Diff: ${issue.rule}`
                );
            } else {
                vscode.window.showErrorMessage(`❌ Failed to generate diff: ${fixResponse.error}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Diff failed: ${error}`);
        }
    }

    async undoFix(issue: Issue): Promise<void> {
        const originalContent = this.fixHistory.get(issue.id);
        if (!originalContent) {
            vscode.window.showWarningMessage('No previous version found to undo');
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(issue.file);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                originalContent
            );
            
            await vscode.workspace.applyEdit(edit);
            this.fixHistory.delete(issue.id);
            
            vscode.window.showInformationMessage('✅ Fix undone successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Undo failed: ${error}`);
        }
    }

    private async getCopilotFix(request: CopilotFixRequest): Promise<CopilotFixResponse> {
        // Mock implementation - in real implementation, this would call Copilot API
        const { issue } = request;
        
        // Simulate different fixes based on issue type
        let patch = '';
        let confidence = 0.8;

        switch (issue.rule.toLowerCase()) {
            case 'sqli':
            case 'sql-injection':
                patch = this.generateSQLInjectionFix(issue);
                confidence = 0.9;
                break;
            case 'xss':
            case 'cross-site-scripting':
                patch = this.generateXSSFix(issue);
                confidence = 0.85;
                break;
            case 'concurrent-modification':
                patch = this.generateConcurrencyFix(issue);
                confidence = 0.8;
                break;
            default:
                patch = this.generateGenericFix(issue);
                confidence = 0.7;
        }

        return {
            success: true,
            patch,
            confidence
        };
    }

    private generateSQLInjectionFix(issue: Issue): string {
        // Mock SQL injection fix
        return `// Fixed: Use parameterized query to prevent SQL injection
PreparedStatement stmt = connection.prepareStatement("SELECT * FROM users WHERE id = ?");
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();`;
    }

    private generateXSSFix(issue: Issue): string {
        // Mock XSS fix
        return `// Fixed: Escape HTML to prevent XSS
String escapedInput = HtmlUtils.escapeHtml(userInput);
response.getWriter().write(escapedInput);`;
    }

    private generateConcurrencyFix(issue: Issue): string {
        // Mock concurrency fix
        return `// Fixed: Use thread-safe collection
private final ConcurrentHashMap<String, Object> cache = new ConcurrentHashMap<>();`;
    }

    private generateGenericFix(issue: Issue): string {
        // Mock generic fix
        return `// Fixed: ${issue.remediation}
// TODO: Review and test this fix thoroughly`;
    }

    private async applyFix(issue: Issue, patch: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument(issue.file);
        const edit = new vscode.WorkspaceEdit();
        
        // Apply patch at the issue location
        const line = issue.line - 1;
        const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);
        edit.replace(document.uri, range, this.applyPatch(document.getText(), patch));
        
        await vscode.workspace.applyEdit(edit);
        
        // Show success message with actions
        const action = await vscode.window.showInformationMessage(
            '✅ Fix applied successfully',
            'Undo',
            'Show Diff'
        );
        
        if (action === 'Undo') {
            await this.undoFix(issue);
        } else if (action === 'Show Diff') {
            await this.showDiff(issue);
        }
    }

    private async previewFix(issue: Issue, patch: string): Promise<void> {
        const action = await vscode.window.showInformationMessage(
            `Fix available for ${issue.rule}`,
            'Apply Fix',
            'Show Diff',
            'Cancel'
        );

        if (action === 'Apply Fix') {
            await this.applyFix(issue, patch);
        } else if (action === 'Show Diff') {
            await this.showDiff(issue);
        }
    }

    private async askUser(issue: Issue, patch: string): Promise<void> {
        const action = await vscode.window.showInformationMessage(
            `Fix available for ${issue.rule}. Apply automatically?`,
            'Yes, Apply',
            'Preview First',
            'No, Skip'
        );

        if (action === 'Yes, Apply') {
            await this.applyFix(issue, patch);
        } else if (action === 'Preview First') {
            await this.previewFix(issue, patch);
        }
    }

    private buildContext(issue: Issue): string {
        return `Issue: ${issue.rule}
Severity: ${issue.severity}
Category: ${issue.category}
File: ${issue.file}:${issue.line}
Description: ${issue.description}
Remediation: ${issue.remediation}`;
    }

    private applyPatch(originalText: string, patch: string): string {
        // Simple patch application - in real implementation, use proper diff/patch library
        const lines = originalText.split('\n');
        const patchLines = patch.split('\n');
        
        // For demo purposes, just append the patch
        return originalText + '\n\n' + patch;
    }
}
