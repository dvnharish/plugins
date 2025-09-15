import { BaseRunner } from "./base-runner";
import { Issue, ScannerResult } from "@devguard/shared";
import { join } from "path";

export class DependencyCheckRunner extends BaseRunner {
  constructor(enabled: boolean = true) {
    super("dependency-check", enabled);
  }

  async run(projectPath: string, config?: any): Promise<ScannerResult> {
    const startTime = Date.now();
    const issues: Issue[] = [];

    try {
      // For demo purposes, generate mock dependency vulnerability issues
      const mockIssues = this.generateMockDependencyIssues(projectPath);
      issues.push(...mockIssues);

      return {
        scanner: this.name,
        issues,
        duration: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        scanner: this.name,
        issues: [],
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private generateMockDependencyIssues(projectPath: string): Issue[] {
    const issues: Issue[] = [];

    // Mock dependency vulnerability issues for demo
    issues.push(
      this.createIssue(
        "CVE-2023-35116",
        "high",
        "oss",
        "jackson-databind vulnerable to deserialization attack",
        join(projectPath, "pom.xml"),
        15,
        undefined,
        "jackson-databind 2.15.0 contains a deserialization vulnerability (CVE-2023-35116)",
        "Upgrade jackson-databind to version 2.15.2 or later"
      ),
      this.createIssue(
        "CVE-2023-20883",
        "medium",
        "oss",
        "Spring Boot vulnerable to path traversal",
        join(projectPath, "pom.xml"),
        22,
        undefined,
        "Spring Boot 3.1.0 contains a path traversal vulnerability",
        "Upgrade Spring Boot to version 3.1.2 or later"
      ),
      this.createIssue(
        "SNYK-JAVA-ORGAPACHECOMMONS-1234567",
        "low",
        "oss",
        "Apache Commons Text vulnerable to RCE",
        join(projectPath, "pom.xml"),
        28,
        undefined,
        "Transitive dependency commons-text contains a remote code execution vulnerability",
        "Update to use a version that includes the patched commons-text"
      ),
      this.createIssue(
        "LICENSE_VIOLATION",
        "medium",
        "oss",
        "GPL licensed dependency detected",
        join(projectPath, "pom.xml"),
        35,
        undefined,
        "Dependency uses GPL license which may not be compatible with your project",
        "Review license compatibility or find an alternative dependency"
      )
    );

    // Add references for dependency issues
    issues.forEach((issue) => {
      switch (issue.rule) {
        case "CVE-2023-35116":
          issue.references = [
            {
              title: "CVE-2023-35116",
              url: "https://nvd.nist.gov/vuln/detail/CVE-2023-35116",
              type: "NIST",
            },
            {
              title: "Jackson Security Advisory",
              url: "https://github.com/FasterXML/jackson-databind/security/advisories",
              type: "OTHER",
            },
          ];
          break;
        case "CVE-2023-20883":
          issue.references = [
            {
              title: "CVE-2023-20883",
              url: "https://nvd.nist.gov/vuln/detail/CVE-2023-20883",
              type: "NIST",
            },
            {
              title: "Spring Security Advisory",
              url: "https://spring.io/security/cve-2023-20883",
              type: "OTHER",
            },
          ];
          break;
        default:
          issue.references = [
            {
              title: "OWASP Dependency Check",
              url: "https://owasp.org/www-project-dependency-check/",
              type: "OWASP",
            },
            {
              title: "National Vulnerability Database",
              url: "https://nvd.nist.gov/",
              type: "NIST",
            },
          ];
      }
    });

    return issues;
  }
}
