import { ScanResult, Issue } from '@devguard/shared';

export class ScanService {
    async scanProject(): Promise<ScanResult> {
        // This is a fallback service - the main scanning is now handled by ScannerOrchestrator
        // This exists for backward compatibility
        return {
            issues: [],
            score: 100,
            timestamp: new Date(),
            projectPath: '',
            scannerResults: []
        };
    }

    async getIssues(): Promise<Issue[]> {
        return [];
    }

    async fixIssue(issueId: string): Promise<boolean> {
        return true;
    }
}