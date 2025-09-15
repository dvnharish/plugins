export interface Issue {
  id: string;
  rule: string;
  severity: Severity;
  category: Category;
  message: string;
  file: string;
  line: number;
  column?: number;
  description: string;
  remediation: string;
  references: Reference[];
  codeSnippet?: string;
  fix?: Fix;
}

export interface Fix {
  description: string;
  patch: string;
  confidence: number;
}

export interface Reference {
  title: string;
  url: string;
  type: 'OWASP' | 'CERT' | 'CWE' | 'NIST' | 'OTHER';
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Category = 'security' | 'oss' | 'secrets' | 'concurrency' | 'tests' | 'style';

export interface ScanResult {
  issues: Issue[];
  score: number;
  timestamp: Date;
  projectPath: string;
  scannerResults: ScannerResult[];
}

export interface ScannerResult {
  scanner: string;
  issues: Issue[];
  duration: number;
  success: boolean;
  error?: string;
}

export interface DevGuardConfig {
  copilot: {
    applyFix: 'auto' | 'preview' | 'ask';
  };
  policy: {
    minScore: number;
  };
  sca: {
    allowLicenses: string[];
  };
  reports: {
    formats: ('markdown' | 'sarif')[];
  };
  scanners: {
    [key: string]: {
      enabled: boolean;
      config?: any;
    };
  };
}

export interface TestGenerationRequest {
  filePath: string;
  className: string;
  methods: string[];
  packageName: string;
}

export interface GeneratedTest {
  filePath: string;
  content: string;
  testMethods: string[];
}

export interface CopilotFixRequest {
  issue: Issue;
  codeSnippet: string;
  context: string;
}

export interface CopilotFixResponse {
  success: boolean;
  patch?: string;
  error?: string;
  confidence?: number;
}
