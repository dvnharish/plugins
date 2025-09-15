import { ScanResult, Issue, DevGuardConfig } from '@devguard/shared';
import { SpotBugsRunner } from '@devguard/runners';
import { PMDRunner } from '@devguard/runners';
import { SemgrepRunner } from '@devguard/runners';
import { GitleaksRunner } from '@devguard/runners';
import { DependencyCheckRunner } from '@devguard/runners';

export class ScanService {
    private runners = [
        new SpotBugsRunner(),
        new PMDRunner(),
        new SemgrepRunner(),
        new GitleaksRunner(),
        new DependencyCheckRunner()
    ];

    async scanProject(projectPath: string, config: DevGuardConfig): Promise<ScanResult> {
        const startTime = Date.now();
        const allIssues: Issue[] = [];
        const scannerResults: any[] = [];

        // Run enabled scanners in parallel
        const enabledRunners = this.runners.filter(runner => 
            config.scanners[runner.getName()]?.enabled !== false
        );

        const runnerPromises = enabledRunners.map(async (runner) => {
            try {
                const result = await runner.run(projectPath, config);
                scannerResults.push(result);
                allIssues.push(...result.issues);
                return result;
            } catch (error) {
                console.error(`Scanner ${runner.getName()} failed:`, error);
                return {
                    scanner: runner.getName(),
                    issues: [],
                    duration: 0,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        });

        await Promise.all(runnerPromises);

        // Calculate overall score
        const score = this.calculateScore(allIssues);

        return {
            issues: allIssues,
            score,
            timestamp: new Date(),
            projectPath,
            scannerResults
        };
    }

    private calculateScore(issues: Issue[]): number {
        if (issues.length === 0) {
            return 100;
        }

        let totalWeight = 0;
        let weightedScore = 0;

        // Weight by category
        const categoryWeights = {
            security: 0.30,
            tests: 0.20,
            style: 0.10,
            oss: 0.15,
            secrets: 0.15,
            concurrency: 0.10
        };

        // Weight by severity
        const severityWeights = {
            critical: 1.0,
            high: 0.8,
            medium: 0.6,
            low: 0.4,
            info: 0.2
        };

        // Group issues by category
        const issuesByCategory = issues.reduce((acc, issue) => {
            if (!acc[issue.category]) {
                acc[issue.category] = [];
            }
            acc[issue.category].push(issue);
            return acc;
        }, {} as Record<string, Issue[]>);

        // Calculate score for each category
        for (const [category, categoryIssues] of Object.entries(issuesByCategory)) {
            const categoryWeight = categoryWeights[category as keyof typeof categoryWeights] || 0.1;
            
            let categoryScore = 100; // Start with perfect score
            
            for (const issue of categoryIssues) {
                const severityWeight = severityWeights[issue.severity];
                const penalty = severityWeight * 10; // Penalty per issue
                categoryScore = Math.max(0, categoryScore - penalty);
            }
            
            weightedScore += categoryScore * categoryWeight;
            totalWeight += categoryWeight;
        }

        // Normalize score
        return Math.round(weightedScore / Math.max(totalWeight, 0.1));
    }
}
