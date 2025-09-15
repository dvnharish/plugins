import { BaseRunner } from './base-runner';
import { Issue, ScannerResult } from '@devguard/shared';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class SpotBugsRunner extends BaseRunner {
    constructor(enabled: boolean = true) {
        super('spotbugs', enabled);
    }

    async run(projectPath: string, config?: any): Promise<ScannerResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];

        try {
            // Check if SpotBugs is available
            const spotbugsPath = await this.findSpotBugs();
            if (!spotbugsPath) {
                return {
                    scanner: this.name,
                    issues: [],
                    duration: Date.now() - startTime,
                    success: false,
                    error: 'SpotBugs not found. Please install SpotBugs and ensure it\'s in PATH.'
                };
            }

            // Check if project has compiled classes
            const classesDir = this.findClassesDirectory(projectPath);
            if (!classesDir) {
                return {
                    scanner: this.name,
                    issues: [],
                    duration: Date.now() - startTime,
                    success: false,
                    error: 'No compiled classes found. Please compile the project first.'
                };
            }

            // Run SpotBugs
            const result = await this.executeCommand(spotbugsPath, [
                '-textui',
                '-xml',
                '-output', join(projectPath, 'spotbugs-report.xml'),
                classesDir
            ], projectPath);

            if (result.exitCode === 0 || result.exitCode === 2) { // 2 means bugs found
                // Parse SpotBugs XML report
                const reportPath = join(projectPath, 'spotbugs-report.xml');
                if (existsSync(reportPath)) {
                    const report = readFileSync(reportPath, 'utf8');
                    issues.push(...this.parseSpotBugsReport(report, projectPath));
                }
            }

            return {
                scanner: this.name,
                issues,
                duration: Date.now() - startTime,
                success: true
            };

        } catch (error) {
            return {
                scanner: this.name,
                issues: [],
                duration: Date.now() - startTime,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async findSpotBugs(): Promise<string | null> {
        try {
            const result = await this.executeCommand('which', ['spotbugs'], process.cwd());
            if (result.exitCode === 0) {
                return result.stdout.trim();
            }
        } catch {
            // Try alternative names
        }

        // Try common installation paths
        const commonPaths = [
            '/usr/local/bin/spotbugs',
            '/opt/spotbugs/bin/spotbugs',
            'spotbugs.bat', // Windows
            'spotbugs.cmd'  // Windows
        ];

        for (const path of commonPaths) {
            try {
                const result = await this.executeCommand('which', [path], process.cwd());
                if (result.exitCode === 0) {
                    return result.stdout.trim();
                }
            } catch {
                // Continue to next path
            }
        }

        return null;
    }

    private findClassesDirectory(projectPath: string): string | null {
        const possibleDirs = [
            join(projectPath, 'target', 'classes'),
            join(projectPath, 'build', 'classes'),
            join(projectPath, 'out', 'production', 'classes'),
            join(projectPath, 'bin')
        ];

        for (const dir of possibleDirs) {
            if (existsSync(dir)) {
                return dir;
            }
        }

        return null;
    }

    private parseSpotBugsReport(xmlContent: string, projectPath: string): Issue[] {
        const issues: Issue[] = [];

        try {
            // Simple XML parsing - in production, use a proper XML parser
            const bugMatches = xmlContent.match(/<BugInstance[^>]*>/g) || [];
            
            for (const bugMatch of bugMatches) {
                const typeMatch = bugMatch.match(/type="([^"]*)"/);
                const priorityMatch = bugMatch.match(/priority="([^"]*)"/);
                const categoryMatch = bugMatch.match(/category="([^"]*)"/);
                
                if (typeMatch && priorityMatch) {
                    const type = typeMatch[1];
                    const priority = priorityMatch[1];
                    const category = categoryMatch ? categoryMatch[1] : 'CORRECTNESS';
                    
                    // Extract source line information
                    const sourceLineMatch = xmlContent.match(
                        new RegExp(`<SourceLine[^>]*start="(\\d+)"[^>]*sourcefile="([^"]*)"[^>]*>`, 'g')
                    );
                    
                    if (sourceLineMatch) {
                        const lineMatch = sourceLineMatch[0].match(/start="(\d+)"/);
                        const fileMatch = sourceLineMatch[0].match(/sourcefile="([^"]*)"/);
                        
                        if (lineMatch && fileMatch) {
                            const line = parseInt(lineMatch[1]);
                            const file = join(projectPath, 'src', 'main', 'java', fileMatch[1]);
                            
                            const severity = this.mapPriorityToSeverity(priority);
                            const categoryType = this.mapCategoryToType(category);
                            
                            issues.push(this.createIssue(
                                type,
                                severity,
                                categoryType,
                                `SpotBugs: ${type}`,
                                file,
                                line,
                                undefined,
                                `SpotBugs detected: ${type}`,
                                'Review the SpotBugs documentation for this bug pattern'
                            ));
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to parse SpotBugs report:', error);
        }

        return issues;
    }

    private mapPriorityToSeverity(priority: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
        switch (priority) {
            case '1': return 'critical';
            case '2': return 'high';
            case '3': return 'medium';
            case '4': return 'low';
            default: return 'info';
        }
    }

    private mapCategoryToType(category: string): 'security' | 'oss' | 'secrets' | 'concurrency' | 'tests' | 'style' {
        switch (category) {
            case 'SECURITY': return 'security';
            case 'MALICIOUS_CODE': return 'security';
            case 'CORRECTNESS': return 'style';
            case 'PERFORMANCE': return 'style';
            case 'STYLE': return 'style';
            case 'MT_CORRECTNESS': return 'concurrency';
            case 'I18N': return 'style';
            default: return 'style';
        }
    }
}
