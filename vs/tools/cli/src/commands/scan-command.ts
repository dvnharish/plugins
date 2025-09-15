import { Command } from 'commander';
import { ScanService } from '../services/scan-service';
import { ConfigLoader } from '@devguard/shared';
import chalk from 'chalk';
import ora from 'ora';

export class ScanCommand extends Command {
    constructor() {
        super('scan');
        this.description('Scan project for issues');
        this.option('-p, --path <path>', 'Project path', process.cwd());
        this.option('-o, --output <format>', 'Output format (markdown, sarif, json)', 'markdown');
        this.option('-f, --output-file <file>', 'Output file path');
        this.option('--no-security', 'Skip security scans');
        this.option('--no-oss', 'Skip OSS dependency scans');
        this.option('--no-secrets', 'Skip secrets scans');
        this.option('--no-concurrency', 'Skip concurrency scans');
        this.option('--no-tests', 'Skip test coverage scans');
        this.option('--no-style', 'Skip style scans');
        this.action(this.execute.bind(this));
    }

    async execute(options: any) {
        const spinner = ora('Starting DevGuard scan...').start();
        
        try {
            // Load configuration
            const config = ConfigLoader.loadConfig(options.path);
            
            // Create scan service
            const scanService = new ScanService();
            
            // Run scan
            spinner.text = 'Running scanners...';
            const result = await scanService.scanProject(options.path, config);
            
            spinner.succeed('Scan completed!');
            
            // Display results
            this.displayResults(result);
            
            // Generate report if requested
            if (options.output || options.outputFile) {
                await this.generateReport(result, options);
            }
            
        } catch (error) {
            spinner.fail('Scan failed');
            console.error(chalk.red('Error:'), error);
            process.exit(1);
        }
    }

    private displayResults(result: any) {
        console.log('\n' + chalk.bold.blue('📊 DevGuard Scan Results'));
        console.log(chalk.gray('='.repeat(50)));
        
        // Score
        let scoreText = `Score: ${result.score}/100`;
        if (result.score >= 90) {
            console.log(chalk.bold.green(scoreText));
        } else if (result.score >= 80) {
            console.log(chalk.bold.yellow(scoreText));
        } else if (result.score >= 70) {
            console.log(chalk.bold.yellow(scoreText));
        } else {
            console.log(chalk.bold.red(scoreText));
        }
        
        // Issues by category
        const issuesByCategory = this.groupIssuesByCategory(result.issues);
        const categories = [
            { key: 'security', icon: '🔒', name: 'Security' },
            { key: 'oss', icon: '📦', name: 'OSS/Dependencies' },
            { key: 'secrets', icon: '🔑', name: 'Secrets' },
            { key: 'concurrency', icon: '🔀', name: 'Concurrency' },
            { key: 'tests', icon: '🧪', name: 'Tests' },
            { key: 'style', icon: '🎨', name: 'Style' }
        ];
        
        console.log('\n' + chalk.bold('Issues by Category:'));
        for (const category of categories) {
            const issues = issuesByCategory.get(category.key) || [];
            if (issues.length > 0) {
                const severityCounts = this.getSeverityCounts(issues);
                console.log(`  ${category.icon} ${category.name}: ${issues.length} issues ${severityCounts}`);
            }
        }
        
        // Top issues
        const topIssues = result.issues.slice(0, 5);
        if (topIssues.length > 0) {
            console.log('\n' + chalk.bold('Top Issues:'));
            for (const issue of topIssues) {
                const severityIcon = this.getSeverityIcon(issue.severity);
                console.log(`  ${severityIcon} ${issue.rule} - ${issue.file}:${issue.line}`);
            }
        }
    }

    private groupIssuesByCategory(issues: any[]): Map<string, any[]> {
        const grouped = new Map();
        for (const issue of issues) {
            if (!grouped.has(issue.category)) {
                grouped.set(issue.category, []);
            }
            grouped.get(issue.category).push(issue);
        }
        return grouped;
    }

    private getSeverityCounts(issues: any[]): string {
        const counts: { [key: string]: number } = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        issues.forEach(issue => {
            if (counts.hasOwnProperty(issue.severity)) {
                counts[issue.severity]++;
            }
        });
        
        const parts = [];
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

    private async generateReport(result: any, options: any) {
        const { writeFileSync } = await import('fs');
        const { join } = await import('path');
        
        const outputFormat = options.output || 'markdown';
        const outputFile = options.outputFile || `devguard-report.${outputFormat === 'json' ? 'json' : 'md'}`;
        
        let content = '';
        if (outputFormat === 'markdown') {
            content = this.generateMarkdownReport(result);
        } else if (outputFormat === 'sarif') {
            content = JSON.stringify(this.generateSarifReport(result), null, 2);
        } else if (outputFormat === 'json') {
            content = JSON.stringify(result, null, 2);
        }
        
        writeFileSync(outputFile, content, 'utf8');
        console.log(chalk.green(`\n✅ Report generated: ${outputFile}`));
    }

    private generateMarkdownReport(result: any): string {
        let report = `# 📊 DevGuard Project Review\n\n`;
        report += `**Score:** ${result.score} / 100\n`;
        report += `**Generated:** ${result.timestamp.toISOString()}\n\n`;
        
        // Issues by category
        const issuesByCategory = this.groupIssuesByCategory(result.issues);
        const categories = [
            { key: 'security', icon: '🔒', name: 'Security' },
            { key: 'oss', icon: '📦', name: 'OSS/Dependencies' },
            { key: 'secrets', icon: '🔑', name: 'Secrets' },
            { key: 'concurrency', icon: '🔀', name: 'Concurrency' },
            { key: 'tests', icon: '🧪', name: 'Tests' },
            { key: 'style', icon: '🎨', name: 'Style' }
        ];
        
        for (const category of categories) {
            const issues = issuesByCategory.get(category.key) || [];
            if (issues.length > 0) {
                report += `## ${category.icon} ${category.name}\n\n`;
                for (const issue of issues) {
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
        
        return report;
    }

    private generateSarifReport(result: any): any {
        return {
            version: "2.1.0",
            $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            runs: [{
                tool: {
                    driver: {
                        name: "DevGuard",
                        version: "1.0.0"
                    }
                },
                results: result.issues.map((issue: any) => ({
                    ruleId: issue.rule,
                    level: this.mapSeverityToSarif(issue.severity),
                    message: { text: issue.message },
                    locations: [{
                        physicalLocation: {
                            artifactLocation: { uri: issue.file },
                            region: {
                                startLine: issue.line,
                                startColumn: issue.column || 1
                            }
                        }
                    }]
                }))
            }]
        };
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
}
