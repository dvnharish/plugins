import * as vscode from 'vscode';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { Issue, ScanResult } from '@devguard/shared';

export class ReportService {
    private lastScanResult?: ScanResult;

    setLastScanResult(result: ScanResult) {
        this.lastScanResult = result;
    }

    async exportReport(): Promise<void> {
        try {
            if (!this.lastScanResult) {
                vscode.window.showWarningMessage('No scan results available. Please run a scan first.');
                return;
            }

            const scanResult = this.lastScanResult;
            
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const reportPath = join(workspaceFolder.uri.fsPath, 'devguard-report.md');
            const sarifPath = join(workspaceFolder.uri.fsPath, 'devguard-report.sarif');

            // Generate Markdown report
            const markdownReport = this.generateMarkdownReport(scanResult);
            writeFileSync(reportPath, markdownReport, 'utf8');

            // Generate SARIF report
            const sarifReport = this.generateSarifReport(scanResult);
            writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2), 'utf8');

            vscode.window.showInformationMessage(`✅ Reports generated:\n- ${reportPath}\n- ${sarifPath}`);
            
            // Open the Markdown report
            const reportUri = vscode.Uri.file(reportPath);
            await vscode.window.showTextDocument(reportUri);

        } catch (error) {
            vscode.window.showErrorMessage(`❌ Report generation failed: ${error}`);
        }
    }

    private generateMarkdownReport(scanResult: ScanResult): string {
        const { issues, score, timestamp, projectPath } = scanResult;
        
        // Group issues by category
        const issuesByCategory = this.groupIssuesByCategory(issues);
        
        // Count issues by severity
        const severityCounts = this.getSeverityCounts(issues);
        
        let report = `# 📊 DevGuard Project Review\n\n`;
        report += `**Project:** ${projectPath}\n`;
        report += `**Score:** ${score} / 100\n`;
        report += `**Generated:** ${timestamp.toISOString()}\n\n`;
        
        // Summary
        report += `## 📈 Summary\n\n`;
        report += `🔴 **${severityCounts.critical}** Critical   `;
        report += `🟠 **${severityCounts.high}** High   `;
        report += `🟡 **${severityCounts.medium}** Medium   `;
        report += `🔵 **${severityCounts.low}** Low   `;
        report += `⚪ **${severityCounts.info}** Info\n\n`;
        
        // Categories
        const categories = [
            { key: 'security', icon: '🔒', title: 'Security' },
            { key: 'oss', icon: '📦', title: 'OSS / Dependencies' },
            { key: 'secrets', icon: '🔑', title: 'Secrets' },
            { key: 'concurrency', icon: '🔀', title: 'Concurrency / Sync' },
            { key: 'tests', icon: '🧪', title: 'Tests & Coverage' },
            { key: 'style', icon: '🎨', title: 'Style & Maintainability' }
        ];

        for (const category of categories) {
            const categoryIssues = issuesByCategory.get(category.key) || [];
            if (categoryIssues.length > 0) {
                report += `## ${category.icon} ${category.title}\n\n`;
                
                for (const issue of categoryIssues) {
                    const severityIcon = this.getSeverityIcon(issue.severity);
                    report += `- ${severityIcon} **${issue.rule}** – ${issue.file}:${issue.line}\n`;
                    report += `  - ${issue.message}\n`;
                    if (issue.remediation) {
                        report += `  - *Fix:* ${issue.remediation}\n`;
                    }
                    report += `\n`;
                }
            }
        }

        // Top fixes
        const topFixes = this.getTopFixes(issues);
        if (topFixes.length > 0) {
            report += `## 🚀 Top Fixes\n\n`;
            topFixes.forEach((fix, index) => {
                report += `${index + 1}. ${fix}\n`;
            });
            report += `\n`;
        }

        // Recommendations
        report += `## 💡 Recommendations\n\n`;
        if (score < 75) {
            report += `- **Improve overall score:** Current score ${score} is below recommended minimum of 75\n`;
        }
        if (severityCounts.critical > 0) {
            report += `- **Address critical issues:** ${severityCounts.critical} critical issues must be resolved\n`;
        }
        if (severityCounts.high > 0) {
            report += `- **Review high-priority issues:** ${severityCounts.high} high-severity issues need attention\n`;
        }
        
        const testIssues = issuesByCategory.get('tests') || [];
        if (testIssues.length > 0) {
            report += `- **Improve test coverage:** ${testIssues.length} test-related issues found\n`;
        }

        report += `\n---\n`;
        report += `*Generated by DevGuard VS Code Extension*\n`;

        return report;
    }

    private generateSarifReport(scanResult: ScanResult): any {
        const { issues, score, timestamp, projectPath } = scanResult;
        
        return {
            version: "2.1.0",
            $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            runs: [{
                tool: {
                    driver: {
                        name: "DevGuard",
                        version: "1.0.0",
                        informationUri: "https://github.com/devguard/devguard"
                    }
                },
                results: issues.map(issue => ({
                    ruleId: issue.rule,
                    level: this.mapSeverityToSarif(issue.severity),
                    message: {
                        text: issue.message
                    },
                    locations: [{
                        physicalLocation: {
                            artifactLocation: {
                                uri: issue.file
                            },
                            region: {
                                startLine: issue.line,
                                startColumn: issue.column || 1
                            }
                        }
                    }],
                    properties: {
                        category: issue.category,
                        description: issue.description,
                        remediation: issue.remediation
                    }
                })),
                properties: {
                    score: score,
                    timestamp: timestamp.toISOString(),
                    projectPath: projectPath
                }
            }]
        };
    }

    private groupIssuesByCategory(issues: Issue[]): Map<string, Issue[]> {
        const grouped = new Map<string, Issue[]>();
        
        for (const issue of issues) {
            if (!grouped.has(issue.category)) {
                grouped.set(issue.category, []);
            }
            grouped.get(issue.category)!.push(issue);
        }
        
        return grouped;
    }

    private getSeverityCounts(issues: Issue[]): { critical: number; high: number; medium: number; low: number; info: number } {
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        
        for (const issue of issues) {
            counts[issue.severity]++;
        }
        
        return counts;
    }

    private getTopFixes(issues: Issue[]): string[] {
        // Get top 5 issues by severity and frequency
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const highIssues = issues.filter(i => i.severity === 'high');
        
        const topFixes: string[] = [];
        
        // Add critical issues first
        criticalIssues.slice(0, 3).forEach(issue => {
            topFixes.push(`Fix ${issue.rule} in ${issue.file}:${issue.line}`);
        });
        
        // Add high issues
        highIssues.slice(0, 2).forEach(issue => {
            topFixes.push(`Fix ${issue.rule} in ${issue.file}:${issue.line}`);
        });
        
        return topFixes;
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

    private mapSeverityToSarif(severity: string): string {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'note';
            case 'info': return 'note';
            default: return 'note';
        }
    }

    private getMockScanResult(): ScanResult {
        // Mock scan result for demo purposes
        return {
            issues: [
                {
                    id: 'sqli-1',
                    rule: 'SQL Injection',
                    severity: 'critical',
                    category: 'security',
                    message: 'SQL injection vulnerability detected',
                    file: 'src/main/java/com/example/UserDao.java',
                    line: 42,
                    column: 15,
                    description: 'Direct string concatenation in SQL query',
                    remediation: 'Use parameterized queries with PreparedStatement',
                    references: [
                        { title: 'OWASP SQL Injection Prevention', url: 'https://owasp.org/www-community/attacks/SQL_Injection', type: 'OWASP' }
                    ],
                    codeSnippet: 'String query = "SELECT * FROM users WHERE id = " + userId;'
                },
                {
                    id: 'concurrent-1',
                    rule: 'Concurrent Modification',
                    severity: 'high',
                    category: 'concurrency',
                    message: 'HashMap used in multi-threaded context',
                    file: 'src/main/java/com/example/CacheService.java',
                    line: 18,
                    column: 5,
                    description: 'HashMap is not thread-safe',
                    remediation: 'Use ConcurrentHashMap for thread-safe operations',
                    references: [],
                    codeSnippet: 'private Map<String, Object> cache = new HashMap<>();'
                },
                {
                    id: 'test-1',
                    rule: 'Missing Test Coverage',
                    severity: 'medium',
                    category: 'tests',
                    message: 'Method has no test coverage',
                    file: 'src/main/java/com/example/UserService.java',
                    line: 25,
                    column: 1,
                    description: 'Public method lacks unit tests',
                    remediation: 'Add comprehensive unit tests for this method',
                    references: [],
                    codeSnippet: 'public User createUser(String name, String email) { ... }'
                }
            ],
            score: 82,
            timestamp: new Date(),
            projectPath: '/workspace',
            scannerResults: []
        };
    }
}
