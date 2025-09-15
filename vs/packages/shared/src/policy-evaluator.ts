import { Issue, ScanResult, DevGuardConfig, Severity } from './types';

export class PolicyEvaluator {
  private config: DevGuardConfig;

  constructor(config: DevGuardConfig) {
    this.config = config;
  }

  evaluate(scanResult: ScanResult): {
    score: number;
    passed: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const issues = scanResult.issues;
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Calculate score based on issue severity and category
    const score = this.calculateScore(issues);

    // Check minimum score policy
    if (score < this.config.policy.minScore) {
      violations.push(`Project score ${score} is below minimum required score ${this.config.policy.minScore}`);
    }

    // Check for critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      violations.push(`Found ${criticalIssues.length} critical issues that must be resolved`);
    }

    // Check for security issues
    const securityIssues = issues.filter(i => i.category === 'security' && i.severity !== 'info');
    if (securityIssues.length > 0) {
      recommendations.push(`Address ${securityIssues.length} security issues for better code security`);
    }

    // Check for test coverage
    const testIssues = issues.filter(i => i.category === 'tests');
    if (testIssues.length > 0) {
      recommendations.push(`Improve test coverage - found ${testIssues.length} test-related issues`);
    }

    // Check for OSS license compliance
    const ossIssues = issues.filter(i => i.category === 'oss');
    if (ossIssues.length > 0) {
      recommendations.push(`Review ${ossIssues.length} OSS dependency issues for license compliance`);
    }

    return {
      score,
      passed: violations.length === 0,
      violations,
      recommendations
    };
  }

  private calculateScore(issues: Issue[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    // Weight by category
    const categoryWeights = {
      security: 0.30,
      tests: 0.20,
      style: 0.10,
      maintainability: 0.10,
      oss: 0.15,
      secrets: 0.10,
      concurrency: 0.05
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

    // If no issues, return perfect score
    if (issues.length === 0) {
      return 100;
    }

    // Normalize score
    return Math.round(weightedScore / Math.max(totalWeight, 0.1));
  }

  getSeverityIcon(severity: Severity): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      case 'info': return '⚪';
      default: return '⚪';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'security': return '🔒';
      case 'oss': return '📦';
      case 'secrets': return '🔑';
      case 'concurrency': return '🔀';
      case 'tests': return '🧪';
      case 'style': return '🎨';
      default: return '📝';
    }
  }
}
