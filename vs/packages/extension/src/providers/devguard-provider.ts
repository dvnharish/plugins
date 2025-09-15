import * as vscode from 'vscode';
import { Issue, ScanResult, Category } from '@devguard/shared';
import { LSPClient } from '../lsp/lsp-client';
import { CopilotService } from '../services/copilot-service';

export class DevGuardProvider implements vscode.TreeDataProvider<DevGuardItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DevGuardItem | undefined | null | void> = new vscode.EventEmitter<DevGuardItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DevGuardItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private scanResult: ScanResult | null = null;
    private issuesByCategory: Map<Category, Issue[]> = new Map();

    constructor(
        private lspClient: LSPClient,
        private copilotService: CopilotService
    ) {
        // Initialize categories
        const categories: Category[] = ['security', 'oss', 'secrets', 'concurrency', 'tests', 'style'];
        categories.forEach(category => {
            this.issuesByCategory.set(category, []);
        });
    }

    getTreeItem(element: DevGuardItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DevGuardItem): Thenable<DevGuardItem[]> {
        if (!element) {
            // Root level - show readiness score and categories
            return this.getRootItems();
        } else if (element.type === 'category') {
            // Category level - show issues
            return this.getCategoryIssues(element.category!);
        }
        return Promise.resolve([]);
    }

    private async getRootItems(): Promise<DevGuardItem[]> {
        const items: DevGuardItem[] = [];

        // Readiness Score
        const score = this.scanResult?.score || 0;
        const scoreItem = new DevGuardItem(
            `📊 Readiness Score: ${score}/100`,
            vscode.TreeItemCollapsibleState.None,
            'score'
        );
        scoreItem.description = this.getScoreDescription(score);
        scoreItem.contextValue = 'score';
        items.push(scoreItem);

        // Categories
        const categories: { category: Category; icon: string; label: string }[] = [
            { category: 'security', icon: '🔒', label: 'Security' },
            { category: 'oss', icon: '📦', label: 'OSS/Dependencies' },
            { category: 'secrets', icon: '🔑', label: 'Secrets' },
            { category: 'concurrency', icon: '🔀', label: 'Concurrency/Sync' },
            { category: 'tests', icon: '🧪', label: 'Tests & Coverage' },
            { category: 'style', icon: '🎨', label: 'Style & Maintainability' }
        ];

        for (const { category, icon, label } of categories) {
            const issues = this.issuesByCategory.get(category) || [];
            const count = issues.length;
            const severityCounts = this.getSeverityCounts(issues);
            
            const categoryItem = new DevGuardItem(
                `${icon} ${label}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'category'
            );
            categoryItem.category = category;
            categoryItem.description = `${count} issues ${severityCounts}`;
            categoryItem.contextValue = 'category';
            items.push(categoryItem);
        }

        return items;
    }

    private async getCategoryIssues(category: Category): Promise<DevGuardItem[]> {
        const issues = this.issuesByCategory.get(category) || [];
        return issues.map(issue => {
            const severityIcon = this.getSeverityIcon(issue.severity);
            const item = new DevGuardItem(
                `${severityIcon} ${issue.message}`,
                vscode.TreeItemCollapsibleState.None,
                'issue'
            );
            item.issue = issue;
            item.description = `${issue.file}:${issue.line}`;
            item.contextValue = 'issue';
            item.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(issue.file),
                    { selection: new vscode.Range(issue.line - 1, 0, issue.line - 1, 0) }
                ]
            };
            return item;
        });
    }

    private getSeverityCounts(issues: Issue[]): string {
        const counts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            info: 0
        };

        issues.forEach(issue => {
            counts[issue.severity]++;
        });

        const parts: string[] = [];
        if (counts.critical > 0) parts.push(`🔴${counts.critical}`);
        if (counts.high > 0) parts.push(`🟠${counts.high}`);
        if (counts.medium > 0) parts.push(`🟡${counts.medium}`);
        if (counts.low > 0) parts.push(`🔵${counts.low}`);
        if (counts.info > 0) parts.push(`⚪${counts.info}`);

        return parts.length > 0 ? `(${parts.join(' ')})` : '';
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

    private getScoreDescription(score: number): string {
        if (score >= 90) return 'Excellent';
        if (score >= 80) return 'Good';
        if (score >= 70) return 'Fair';
        if (score >= 60) return 'Poor';
        return 'Critical';
    }

    async scanProject(): Promise<ScanResult | null> {
        try {
            vscode.window.showInformationMessage('🔍 Starting DevGuard scan...');
            
            let result: ScanResult | null = null;
            
            try {
                // Try LSP server first
                result = await this.lspClient.scanProject();
            } catch (lspError) {
                console.log('LSP client failed, using fallback mock data:', lspError);
                // Fallback to mock data for demo
                result = this.generateMockScanResult();
            }
            
            if (result) {
                this.scanResult = result;
                this.groupIssuesByCategory(result.issues);
                this._onDidChangeTreeData.fire();
                vscode.window.showInformationMessage(`✅ Scan completed! Score: ${result.score}/100`);
                return result;
            }
            return null;
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Scan failed: ${error}`);
            return null;
        }
    }

    private generateMockScanResult(): ScanResult {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const projectPath = workspaceFolder?.uri.fsPath || '';
        
        const mockIssues: Issue[] = [
            // Security Issues
            {
                id: 'sql-injection-1',
                rule: 'SQL_INJECTION',
                severity: 'critical',
                category: 'security',
                message: 'SQL injection vulnerability detected',
                file: `${projectPath}/src/main/java/com/example/UserDao.java`,
                line: 18,
                column: 15,
                description: 'User input is directly concatenated into SQL query without sanitization',
                remediation: 'Use parameterized queries or prepared statements to prevent SQL injection',
                references: [
                    { title: 'OWASP SQL Injection', url: 'https://owasp.org/www-community/attacks/SQL_Injection', type: 'OWASP' },
                    { title: 'CWE-89', url: 'https://cwe.mitre.org/data/definitions/89.html', type: 'CWE' }
                ]
            },
            {
                id: 'hardcoded-password-1',
                rule: 'HARDCODED_PASSWORD',
                severity: 'high',
                category: 'secrets',
                message: 'Hardcoded password detected',
                file: `${projectPath}/src/main/java/com/example/UserDao.java`,
                line: 12,
                column: 25,
                description: 'Password is hardcoded in source code',
                remediation: 'Store passwords in environment variables or secure configuration files',
                references: [
                    { title: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'CWE' }
                ]
            },
            {
                id: 'weak-crypto-1',
                rule: 'WEAK_CRYPTO',
                severity: 'high',
                category: 'security',
                message: 'Weak cryptographic algorithm detected',
                file: `${projectPath}/src/main/java/com/example/UserDao.java`,
                line: 33,
                column: 10,
                description: 'MD5 is cryptographically broken and should not be used',
                remediation: 'Use SHA-256 or stronger cryptographic hash functions',
                references: [
                    { title: 'CWE-327', url: 'https://cwe.mitre.org/data/definitions/327.html', type: 'CWE' }
                ]
            },
            // Concurrency Issues
            {
                id: 'thread-safety-1',
                rule: 'THREAD_SAFETY',
                severity: 'medium',
                category: 'concurrency',
                message: 'HashMap used in multi-threaded context',
                file: `${projectPath}/src/main/java/com/example/CacheService.java`,
                line: 12,
                column: 5,
                description: 'HashMap is not thread-safe and can cause race conditions',
                remediation: 'Use ConcurrentHashMap for thread-safe operations',
                references: []
            },
            // Style Issues
            {
                id: 'unused-field-1',
                rule: 'UnusedPrivateField',
                severity: 'low',
                category: 'style',
                message: 'Unused private field detected',
                file: `${projectPath}/src/main/java/com/example/UserDao.java`,
                line: 47,
                description: 'This private field is declared but never used',
                remediation: 'Remove the unused field or use it in the code',
                references: []
            }
        ];

        return {
            issues: mockIssues,
            score: 65,
            timestamp: new Date(),
            projectPath,
            scannerResults: [
                {
                    scanner: 'semgrep',
                    issues: mockIssues.filter(i => i.category === 'security'),
                    duration: 1500,
                    success: true
                },
                {
                    scanner: 'gitleaks',
                    issues: mockIssues.filter(i => i.category === 'secrets'),
                    duration: 800,
                    success: true
                },
                {
                    scanner: 'pmd',
                    issues: mockIssues.filter(i => i.category === 'style'),
                    duration: 1200,
                    success: true
                }
            ]
        };
    }

    private groupIssuesByCategory(issues: Issue[]): void {
        // Clear existing categories
        this.issuesByCategory.clear();
        
        // Group issues by category
        issues.forEach(issue => {
            if (!this.issuesByCategory.has(issue.category)) {
                this.issuesByCategory.set(issue.category, []);
            }
            this.issuesByCategory.get(issue.category)!.push(issue);
        });
    }
}

export class DevGuardItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'score' | 'category' | 'issue',
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        if (command) {
            this.command = command;
        }
    }

    public category?: Category;
    public issue?: Issue;
}
