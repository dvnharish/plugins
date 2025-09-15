import { Issue, Severity, Category, Reference } from './types';

export class SarifParser {
  static parse(sarifContent: string): Issue[] {
    try {
      const sarif = JSON.parse(sarifContent);
      const issues: Issue[] = [];

      for (const run of sarif.runs || []) {
        for (const result of run.results || []) {
          const issue = this.parseResult(result, run.tool?.driver);
          if (issue) {
            issues.push(issue);
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse SARIF:', error);
      return [];
    }
  }

  private static parseResult(result: any, toolDriver: any): Issue | null {
    const rule = result.ruleId || 'unknown';
    const severity = this.mapSeverity(result.level || 'warning');
    const category = this.determineCategory(rule, result.message?.text || '');
    
    const location = result.locations?.[0]?.physicalLocation;
    const file = location?.artifactLocation?.uri || '';
    const line = location?.region?.startLine || 1;
    const column = location?.region?.startColumn;

    const ruleInfo = toolDriver?.rules?.find((r: any) => r.id === rule);
    const description = ruleInfo?.shortDescription?.text || result.message?.text || '';
    const remediation = ruleInfo?.help?.text || '';

    const references: Reference[] = [];
    if (ruleInfo?.helpUri) {
      references.push({
        title: 'Rule Documentation',
        url: ruleInfo.helpUri,
        type: 'OTHER'
      });
    }

    return {
      id: `${rule}-${file}-${line}`,
      rule,
      severity,
      category,
      message: result.message?.text || '',
      file,
      line,
      column,
      description,
      remediation,
      references,
      codeSnippet: result.codeFlows?.[0]?.threadFlows?.[0]?.locations?.[0]?.location?.physicalLocation?.context?.code?.text
    };
  }

  private static mapSeverity(level: string): Severity {
    switch (level.toLowerCase()) {
      case 'error':
        return 'critical';
      case 'warning':
        return 'high';
      case 'note':
        return 'medium';
      case 'info':
        return 'info';
      default:
        return 'low';
    }
  }

  private static determineCategory(rule: string, message: string): Category {
    const ruleLower = rule.toLowerCase();
    const messageLower = message.toLowerCase();

    if (ruleLower.includes('security') || ruleLower.includes('sqli') || 
        ruleLower.includes('xss') || ruleLower.includes('injection') ||
        messageLower.includes('security') || messageLower.includes('vulnerability')) {
      return 'security';
    }

    if (ruleLower.includes('dependency') || ruleLower.includes('oss') ||
        ruleLower.includes('license') || messageLower.includes('dependency')) {
      return 'oss';
    }

    if (ruleLower.includes('secret') || ruleLower.includes('password') ||
        ruleLower.includes('token') || messageLower.includes('secret')) {
      return 'secrets';
    }

    if (ruleLower.includes('concurrent') || ruleLower.includes('thread') ||
        ruleLower.includes('synchronized') || messageLower.includes('concurrent')) {
      return 'concurrency';
    }

    if (ruleLower.includes('test') || ruleLower.includes('coverage') ||
        messageLower.includes('test')) {
      return 'tests';
    }

    return 'style';
  }
}
