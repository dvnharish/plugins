import { BaseRunner } from './base-runner';
import { Issue, ScannerResult } from '@devguard/shared';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class PMDRunner extends BaseRunner {
    constructor(enabled: boolean = true) {
        super('pmd', enabled);
    }

    async run(projectPath: string, config?: any): Promise<ScannerResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];

        try {
            // For demo purposes, generate mock PMD issues
            const mockIssues = this.generateMockIssues(projectPath);
            issues.push(...mockIssues);

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

    private generateMockIssues(projectPath: string): Issue[] {
        const issues: Issue[] = [];
        
        // Mock PMD issues for demo
        issues.push(
            this.createIssue(
                'UnusedPrivateField',
                'medium',
                'style',
                'Unused private field detected',
                join(projectPath, 'src/main/java/com/example/UserDao.java'),
                47,
                undefined,
                'This private field is declared but never used',
                'Remove the unused field or use it in the code'
            ),
            this.createIssue(
                'AvoidDuplicateLiterals',
                'low',
                'style',
                'Duplicate string literal found',
                join(projectPath, 'src/main/java/com/example/UserDao.java'),
                18,
                undefined,
                'String literal "SELECT * FROM users" appears multiple times',
                'Extract the string literal to a constant'
            ),
            this.createIssue(
                'CyclomaticComplexity',
                'high',
                'style',
                'Method has high cyclomatic complexity',
                join(projectPath, 'src/main/java/com/example/CacheService.java'),
                35,
                undefined,
                'Method complexity is 15, exceeds threshold of 10',
                'Break down the method into smaller, more focused methods'
            )
        );

        return issues;
    }
}