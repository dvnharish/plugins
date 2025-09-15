import { BaseRunner } from './base-runner';
import { Issue, ScannerResult } from '@devguard/shared';
import { join } from 'path';

export class SemgrepRunner extends BaseRunner {
    constructor(enabled: boolean = true) {
        super('semgrep', enabled);
    }

    async run(projectPath: string, config?: any): Promise<ScannerResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];

        try {
            // For demo purposes, generate mock Semgrep security issues
            const mockIssues = this.generateMockSecurityIssues(projectPath);
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

    private generateMockSecurityIssues(projectPath: string): Issue[] {
        const issues: Issue[] = [];
        
        // Mock security issues for demo
        issues.push(
            this.createIssue(
                'SQL_INJECTION',
                'critical',
                'security',
                'Potential SQL injection vulnerability',
                join(projectPath, 'src/main/java/com/example/UserDao.java'),
                18,
                15,
                'User input is directly concatenated into SQL query without sanitization',
                'Use parameterized queries or prepared statements to prevent SQL injection'
            ),
            this.createIssue(
                'HARDCODED_PASSWORD',
                'high',
                'security',
                'Hardcoded password detected',
                join(projectPath, 'src/main/java/com/example/UserDao.java'),
                12,
                25,
                'Password is hardcoded in source code',
                'Store passwords in environment variables or secure configuration files'
            ),
            this.createIssue(
                'WEAK_CRYPTO',
                'high',
                'security',
                'Weak cryptographic algorithm detected',
                join(projectPath, 'src/main/java/com/example/UserDao.java'),
                33,
                10,
                'MD5 is cryptographically broken and should not be used',
                'Use SHA-256 or stronger cryptographic hash functions'
            ),
            this.createIssue(
                'XSS_VULNERABILITY',
                'medium',
                'security',
                'Potential XSS vulnerability',
                join(projectPath, 'src/main/java/com/example/WebController.java'),
                25,
                20,
                'User input is rendered without proper escaping',
                'Sanitize and escape user input before rendering in HTML'
            )
        );

        // Add references for security issues
        issues.forEach(issue => {
            switch (issue.rule) {
                case 'SQL_INJECTION':
                    issue.references = [
                        { title: 'OWASP SQL Injection', url: 'https://owasp.org/www-community/attacks/SQL_Injection', type: 'OWASP' },
                        { title: 'CWE-89', url: 'https://cwe.mitre.org/data/definitions/89.html', type: 'CWE' }
                    ];
                    break;
                case 'HARDCODED_PASSWORD':
                    issue.references = [
                        { title: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'CWE' },
                        { title: 'OWASP Hardcoded Credentials', url: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password', type: 'OWASP' }
                    ];
                    break;
                case 'WEAK_CRYPTO':
                    issue.references = [
                        { title: 'CWE-327', url: 'https://cwe.mitre.org/data/definitions/327.html', type: 'CWE' },
                        { title: 'OWASP Cryptographic Storage Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html', type: 'OWASP' }
                    ];
                    break;
                case 'XSS_VULNERABILITY':
                    issue.references = [
                        { title: 'OWASP XSS Prevention', url: 'https://owasp.org/www-community/attacks/xss/', type: 'OWASP' },
                        { title: 'CWE-79', url: 'https://cwe.mitre.org/data/definitions/79.html', type: 'CWE' }
                    ];
                    break;
            }
        });

        return issues;
    }
}