import { Issue, ScannerResult } from '@devguard/shared';

export abstract class BaseRunner {
    protected name: string;
    protected enabled: boolean;

    constructor(name: string, enabled: boolean = true) {
        this.name = name;
        this.enabled = enabled;
    }

    abstract run(projectPath: string, config?: any): Promise<ScannerResult>;

    protected createIssue(
        rule: string,
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
        category: 'security' | 'oss' | 'secrets' | 'concurrency' | 'tests' | 'style',
        message: string,
        file: string,
        line: number,
        column?: number,
        description?: string,
        remediation?: string
    ): Issue {
        return {
            id: `${this.name}-${rule}-${file}-${line}`,
            rule,
            severity,
            category,
            message,
            file,
            line,
            column,
            description: description || message,
            remediation: remediation || 'Review and fix this issue',
            references: []
        };
    }

    protected async executeCommand(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        const { execa } = await import('execa');
        
        try {
            const result = await execa(command, args, { cwd });
            return {
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode ?? 0
            };
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || error.message || '',
                exitCode: error.exitCode || 1
            };
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getName(): string {
        return this.name;
    }
}
