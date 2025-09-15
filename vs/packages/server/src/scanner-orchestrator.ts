import { ScanResult, Issue, DevGuardConfig, ScannerResult } from '@devguard/shared';
import { SpotBugsRunner, PMDRunner, SemgrepRunner, GitleaksRunner, DependencyCheckRunner } from '@devguard/runners';
import { ScoreCalculator } from './score-calculator';

export class ScannerOrchestrator {
    private scoreCalculator: ScoreCalculator;

    constructor() {
        this.scoreCalculator = new ScoreCalculator();
    }

    async scanProject(projectPath: string, config: DevGuardConfig): Promise<ScanResult> {
        const startTime = Date.now();
        const scannerResults: ScannerResult[] = [];
        const allIssues: Issue[] = [];

        // Initialize runners based on config
        const runners = this.initializeRunners(config);

        // Run scanners in parallel
        const scanPromises = runners.map(async (runner) => {
            try {
                const result = await runner.run(projectPath, config.scanners[runner.getName()]?.config);
                scannerResults.push(result);
                allIssues.push(...result.issues);
                return result;
            } catch (error) {
                const failedResult: ScannerResult = {
                    scanner: runner.getName(),
                    issues: [],
                    duration: 0,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                };
                scannerResults.push(failedResult);
                return failedResult;
            }
        });

        await Promise.all(scanPromises);

        // Calculate production readiness score
        const score = this.scoreCalculator.calculateScore(allIssues, config);

        const result: ScanResult = {
            issues: allIssues,
            score,
            timestamp: new Date(),
            projectPath,
            scannerResults
        };

        return result;
    }

    private initializeRunners(config: DevGuardConfig) {
        const runners = [];

        if (config.scanners.spotbugs?.enabled) {
            runners.push(new SpotBugsRunner(true));
        }

        if (config.scanners.pmd?.enabled) {
            runners.push(new PMDRunner(true));
        }

        if (config.scanners.semgrep?.enabled) {
            runners.push(new SemgrepRunner(true));
        }

        if (config.scanners.gitleaks?.enabled) {
            runners.push(new GitleaksRunner(true));
        }

        if (config.scanners.dependencyCheck?.enabled) {
            runners.push(new DependencyCheckRunner(true));
        }

        return runners;
    }
}