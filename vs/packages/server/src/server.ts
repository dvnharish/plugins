import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ScanResult, Issue, DevGuardConfig } from '@devguard/shared';
import { ScannerOrchestrator } from './scanner-orchestrator';
import { ConfigLoader } from './config-loader';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let scannerOrchestrator: ScannerOrchestrator;
let configLoader: ConfigLoader;

connection.onInitialize((params: InitializeParams) => {
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental
        }
    };

    // Initialize services
    scannerOrchestrator = new ScannerOrchestrator();
    configLoader = new ConfigLoader();

    return result;
});

connection.onInitialized(() => {
    connection.console.log('DevGuard LSP Server initialized');
});

// DevGuard request handlers

connection.onRequest('devguard/scanProject', async (params: { projectPath: string }): Promise<ScanResult> => {
    try {
        connection.console.log(`Starting scan for project: ${params.projectPath}`);
        
        // Load configuration
        const config = await configLoader.loadConfig(params.projectPath);
        
        // Run scan
        const result = await scannerOrchestrator.scanProject(params.projectPath, config);
        
        connection.console.log(`Scan completed. Found ${result.issues.length} issues. Score: ${result.score}`);
        return result;
    } catch (error) {
        connection.console.error(`Scan failed: ${error}`);
        throw error;
    }
});

connection.onRequest('devguard/fixIssue', async (params: { issue: Issue; codeSnippet: string }): Promise<{ success: boolean; patch?: string; error?: string }> => {
    try {
        connection.console.log(`Fixing issue: ${params.issue.rule}`);
        
        // Generate fix based on issue type
        const patch = generateMockFix(params.issue);
        
        return {
            success: true,
            patch: patch
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
});

function generateMockFix(issue: Issue): string {
    // Generate appropriate fixes based on issue type
    switch (issue.rule) {
        case 'SQL_INJECTION':
            return `// Fixed SQL Injection
PreparedStatement stmt = connection.prepareStatement("SELECT * FROM users WHERE id = ?");
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();`;
        
        case 'HARDCODED_PASSWORD':
            return `// Fixed hardcoded password
String password = System.getenv("DB_PASSWORD");
if (password == null) {
    throw new IllegalStateException("DB_PASSWORD environment variable not set");
}`;
        
        case 'THREAD_SAFETY':
            return `// Fixed thread safety issue
private final ConcurrentHashMap<String, Object> cache = new ConcurrentHashMap<>();`;
        
        default:
            return `// TODO: Fix ${issue.rule}
// ${issue.remediation}`;
    }
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
