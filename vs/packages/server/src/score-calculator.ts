import { Issue, DevGuardConfig, Severity } from '@devguard/shared';

export class ScoreCalculator {
    private readonly defaultWeights = {
        security: 30,
        tests: 20,
        style: 10,
        maintainability: 10,
        oss: 15,
        secrets: 15,
        concurrency: 10
    };

    private readonly severityWeights = {
        critical: 10,
        high: 7,
        medium: 4,
        low: 2,
        info: 1
    };

    calculateScore(issues: Issue[], config: DevGuardConfig): number {
        if (issues.length === 0) {
            return 100;
        }

        // Group issues by category
        const issuesByCategory = this.groupIssuesByCategory(issues);
        
        // Calculate penalty for each category
        let totalPenalty = 0;
        
        for (const [category, categoryIssues] of issuesByCategory) {
            const categoryPenalty = this.calculateCategoryPenalty(categoryIssues);
            const weight = (this.defaultWeights as any)[category] || 10;
            totalPenalty += (categoryPenalty * weight) / 100;
        }

        // Calculate final score (0-100)
        const score = Math.max(0, 100 - totalPenalty);
        return Math.round(score);
    }

    private groupIssuesByCategory(issues: Issue[]): Map<string, Issue[]> {
        const grouped = new Map<string, Issue[]>();
        
        for (const issue of issues) {
            const category = issue.category;
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(issue);
        }
        
        return grouped;
    }

    private calculateCategoryPenalty(issues: Issue[]): number {
        let penalty = 0;
        
        for (const issue of issues) {
            penalty += (this.severityWeights as any)[issue.severity] || 1;
        }
        
        // Cap penalty at 100 per category
        return Math.min(100, penalty);
    }
}