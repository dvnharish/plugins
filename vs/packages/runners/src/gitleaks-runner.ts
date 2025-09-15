import { BaseRunner } from './base-runner';
import { Issue, ScannerResult } from '@devguard/shared';
import { join } from 'path';

export class GitleaksRunner extends BaseRunner {
    constructor(enabled: boolean = true) {
        super('gitleaks', enabled);
    }

    async run(projectPath: string, config?: any): Promise<ScannerResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];

        try {
            // For demo purposes, generate mock secret detection issues
            const mockIssues = this.generateMockSecretIssues(projectPath);
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

    private generateMockSecretIssues(projectPath: string): Issue[] {
        const issues: Issue[] = [];
        
        // Mock secret detection issues for demo
        issues.push(
            this.createIssue(
                'AWS_ACCESS_KEY',
                'critical',
                'secrets',
                'AWS Access Key detected',
                join(projectPath, 'src/main/java/com/example/AwsConfig.java'),
                10,
                30,
                'Hardcoded AWS access key found in source code',
                'Remove the hardcoded key and use AWS IAM roles or environment variables'
            ),
            this.createIssue(
                'DATABASE_PASSWORD',
                'high',
                'secrets',
                'Database password exposed',
                join(projectPath, 'src/main/java/com/example/AwsConfig.java'),
                14,
                20,
                'Database password is stored in plain text in configuration file',
                'Use encrypted configuration or environment variables for sensitive data'
            ),
            this.createIssue(
                'API_KEY',
                'high',
                'secrets',
                'API key detected',
                join(projectPath, 'src/main/java/com/example/AwsConfig.java'),
                17,
                15,
                'Third-party API key hardcoded in source code',
                'Store API keys in secure configuration management system'
            ),
            this.createIssue(
                'PRIVATE_KEY',
                'critical',
                'secrets',
                'Private key material detected',
                join(projectPath, 'src/main/java/com/example/AwsConfig.java'),
                11,
                1,
                'Private key file committed to version control',
                'Remove private keys from repository and use secure key management'
            )
        );

        // Add references for secret issues
        issues.forEach(issue => {
            issue.references = [
                { title: 'OWASP Secrets Management', url: 'https://owasp.org/www-community/vulnerabilities/Insecure_Storage_of_Sensitive_Information', type: 'OWASP' },
                { title: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html', type: 'CWE' },
                { title: 'NIST SP 800-57', url: 'https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final', type: 'NIST' }
            ];
        });

        return issues;
    }
}