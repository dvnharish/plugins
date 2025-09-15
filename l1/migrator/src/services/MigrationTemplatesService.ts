import * as vscode from 'vscode';
import { LoggingService, LogLevel } from './LoggingService';

export interface MigrationTemplate {
    id: string;
    name: string;
    description: string;
    category: 'endpoint' | 'field' | 'pattern' | 'optimization';
    language: string;
    convergePattern: string;
    elavonPattern: string;
    confidence: number;
    complexity: 'low' | 'medium' | 'high';
    tags: string[];
    examples: TemplateExample[];
    dependencies: string[];
    businessLogicPreservation: string[];
}

export interface TemplateExample {
    title: string;
    description: string;
    convergeCode: string;
    elavonCode: string;
    explanation: string;
}

export interface PatternMatch {
    template: MigrationTemplate;
    confidence: number;
    matchedCode: string;
    suggestedReplacement: string;
    reasoning: string[];
}

export class MigrationTemplatesService {
    private readonly loggingService: LoggingService;
    private readonly context: vscode.ExtensionContext;
    private templates: MigrationTemplate[] = [];

    constructor(context: vscode.ExtensionContext, loggingService: LoggingService) {
        this.context = context;
        this.loggingService = loggingService;
        this.initializeTemplates();
    }

    /**
     * Initialize the migration templates library
     */
    private initializeTemplates(): void {
        this.loggingService.log(LogLevel.INFO, 'Initializing migration templates library');

        // JavaScript/TypeScript templates
        this.templates.push(
            {
                id: 'js-fetch-to-axios',
                name: 'Convert Fetch to Axios',
                description: 'Convert fetch API calls to axios for better error handling',
                category: 'pattern',
                language: 'javascript',
                convergePattern: 'fetch\\([^)]+\\).then\\([^)]+\\)',
                elavonPattern: 'axios\\([^)]+\\)\\.then\\([^)]+\\)',
                confidence: 0.9,
                complexity: 'low',
                tags: ['http', 'fetch', 'axios', 'error-handling'],
                examples: [
                    {
                        title: 'Basic Fetch to Axios',
                        description: 'Convert basic fetch call to axios',
                        convergeCode: `fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'ssl_account_id=123&ssl_amount=10.00'
}).then(response => response.json())`,
                        elavonCode: `axios.post('https://uat.api.converge.eu.elavonaws.com/transactions', {
  processorAccount: { id: '123' },
  amount: { total: 10.00, currency: 'USD' }
}).then(response => response.data)`,
                        explanation: 'Axios provides better error handling and automatic JSON parsing'
                    }
                ],
                dependencies: ['axios'],
                businessLogicPreservation: ['Error handling', 'Response processing', 'Request configuration']
            },
            {
                id: 'js-xml-to-json',
                name: 'Convert XML to JSON',
                description: 'Convert XML-based Converge requests to JSON-based Elavon requests',
                category: 'pattern',
                language: 'javascript',
                convergePattern: 'application/x-www-form-urlencoded',
                elavonPattern: 'application/json',
                confidence: 0.95,
                complexity: 'medium',
                tags: ['xml', 'json', 'content-type', 'data-format'],
                examples: [
                    {
                        title: 'Form Data to JSON',
                        description: 'Convert form-encoded data to JSON structure',
                        convergeCode: `const formData = new URLSearchParams();
formData.append('ssl_account_id', '123');
formData.append('ssl_amount', '10.00');
formData.append('ssl_currency_code', 'USD');`,
                        elavonCode: `const requestData = {
  processorAccount: { id: '123' },
  amount: { total: 10.00, currency: 'USD' }
};`,
                        explanation: 'JSON structure is more maintainable and type-safe'
                    }
                ],
                dependencies: [],
                businessLogicPreservation: ['Data structure', 'Field mapping', 'Validation logic']
            }
        );

        // PHP templates
        this.templates.push(
            {
                id: 'php-curl-to-guzzle',
                name: 'Convert cURL to Guzzle',
                description: 'Convert cURL-based requests to Guzzle HTTP client',
                category: 'pattern',
                language: 'php',
                convergePattern: 'curl_setopt\\([^)]+\\)',
                elavonPattern: '\\$client->post\\([^)]+\\)',
                confidence: 0.9,
                complexity: 'medium',
                tags: ['curl', 'guzzle', 'http-client', 'php'],
                examples: [
                    {
                        title: 'cURL to Guzzle Conversion',
                        description: 'Convert cURL request to Guzzle',
                        convergeCode: `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.convergepay.com/hosted-payments/transaction_token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, 'ssl_account_id=123&ssl_amount=10.00');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);`,
                        elavonCode: `$client = new \\GuzzleHttp\\Client();
$response = $client->post('https://uat.api.converge.eu.elavonaws.com/transactions', [
    'json' => [
        'processorAccount' => ['id' => '123'],
        'amount' => ['total' => 10.00, 'currency' => 'USD']
    ]
]);`,
                        explanation: 'Guzzle provides better error handling and cleaner syntax'
                    }
                ],
                dependencies: ['guzzlehttp/guzzle'],
                businessLogicPreservation: ['Request configuration', 'Error handling', 'Response processing']
            }
        );

        // Python templates
        this.templates.push(
            {
                id: 'python-requests-ssl',
                name: 'Convert SSL Fields to Elavon Structure',
                description: 'Convert SSL field dictionary to Elavon JSON structure',
                category: 'field',
                language: 'python',
                convergePattern: 'ssl_[a-zA-Z_]+',
                elavonPattern: '[a-zA-Z_]+\\.[a-zA-Z_]+',
                confidence: 0.95,
                complexity: 'low',
                tags: ['ssl-fields', 'dictionary', 'json', 'python'],
                examples: [
                    {
                        title: 'SSL Fields to Nested Structure',
                        description: 'Convert flat SSL fields to nested Elavon structure',
                        convergeCode: `data = {
    'ssl_account_id': '123',
    'ssl_amount': '10.00',
    'ssl_currency_code': 'USD',
    'ssl_first_name': 'John',
    'ssl_last_name': 'Doe'
}`,
                        elavonCode: `data = {
    'processorAccount': {'id': '123'},
    'amount': {'total': 10.00, 'currency': 'USD'},
    'customer': {'firstName': 'John', 'lastName': 'Doe'}
}`,
                        explanation: 'Nested structure provides better organization and type safety'
                    }
                ],
                dependencies: [],
                businessLogicPreservation: ['Field mapping', 'Data validation', 'Business logic']
            }
        );

        // Java templates
        this.templates.push(
            {
                id: 'java-httpclient-ssl',
                name: 'Convert SSL Fields to Elavon JSON',
                description: 'Convert Java properties to Elavon JSON structure',
                category: 'field',
                language: 'java',
                convergePattern: 'ssl_[a-zA-Z_]+',
                elavonPattern: '[a-zA-Z_]+\\.[a-zA-Z_]+',
                confidence: 0.9,
                complexity: 'medium',
                tags: ['ssl-fields', 'properties', 'json', 'java'],
                examples: [
                    {
                        title: 'Properties to JSON Object',
                        description: 'Convert properties to JSON object structure',
                        convergeCode: `Properties props = new Properties();
props.setProperty("ssl_account_id", "123");
props.setProperty("ssl_amount", "10.00");
props.setProperty("ssl_currency_code", "USD");`,
                        elavonCode: `ObjectMapper mapper = new ObjectMapper();
Map<String, Object> data = new HashMap<>();
data.put("processorAccount", Map.of("id", "123"));
data.put("amount", Map.of("total", 10.00, "currency", "USD"));
String json = mapper.writeValueAsString(data);`,
                        explanation: 'JSON structure provides better type safety and validation'
                    }
                ],
                dependencies: ['com.fasterxml.jackson.core:jackson-databind'],
                businessLogicPreservation: ['Data structure', 'Type safety', 'Validation']
            }
        );

        // C# templates
        this.templates.push(
            {
                id: 'csharp-webrequest-to-httpclient',
                name: 'Convert WebRequest to HttpClient',
                description: 'Convert WebRequest to modern HttpClient with JSON',
                category: 'pattern',
                language: 'csharp',
                convergePattern: 'WebRequest\\.Create\\([^)]+\\)',
                elavonPattern: 'HttpClient\\.PostAsJsonAsync\\([^)]+\\)',
                confidence: 0.9,
                complexity: 'medium',
                tags: ['webrequest', 'httpclient', 'json', 'csharp'],
                examples: [
                    {
                        title: 'WebRequest to HttpClient',
                        description: 'Convert WebRequest to HttpClient with JSON',
                        convergeCode: `var request = WebRequest.Create("https://api.convergepay.com/hosted-payments/transaction_token");
request.Method = "POST";
request.ContentType = "application/x-www-form-urlencoded";
var data = "ssl_account_id=123&ssl_amount=10.00";
var bytes = Encoding.UTF8.GetBytes(data);
request.ContentLength = bytes.Length;
using (var stream = request.GetRequestStream())
{
    stream.Write(bytes, 0, bytes.Length);
}`,
                        elavonCode: `var client = new HttpClient();
var data = new
{
    processorAccount = new { id = "123" },
    amount = new { total = 10.00, currency = "USD" }
};
var response = await client.PostAsJsonAsync("https://uat.api.converge.eu.elavonaws.com/transactions", data);`,
                        explanation: 'HttpClient provides better async support and JSON handling'
                    }
                ],
                dependencies: ['System.Net.Http', 'System.Text.Json'],
                businessLogicPreservation: ['Async patterns', 'Error handling', 'Request configuration']
            }
        );

        // Ruby templates
        this.templates.push(
            {
                id: 'ruby-nethttp-to-faraday',
                name: 'Convert Net::HTTP to Faraday',
                description: 'Convert Net::HTTP to Faraday with better JSON support',
                category: 'pattern',
                language: 'ruby',
                convergePattern: 'Net::HTTP\\.new\\([^)]+\\)',
                elavonPattern: 'Faraday\\.post\\([^)]+\\)',
                confidence: 0.9,
                complexity: 'medium',
                tags: ['net-http', 'faraday', 'json', 'ruby'],
                examples: [
                    {
                        title: 'Net::HTTP to Faraday',
                        description: 'Convert Net::HTTP to Faraday with JSON',
                        convergeCode: `uri = URI('https://api.convergepay.com/hosted-payments/transaction_token')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
request = Net::HTTP::Post.new(uri)
request.set_form_data('ssl_account_id' => '123', 'ssl_amount' => '10.00')
response = http.request(request)`,
                        elavonCode: `conn = Faraday.new(url: 'https://uat.api.converge.eu.elavonaws.com')
response = conn.post('/transactions') do |req|
  req.headers['Content-Type'] = 'application/json'
  req.body = {
    processorAccount: { id: '123' },
    amount: { total: 10.00, currency: 'USD' }
  }.to_json
end`,
                        explanation: 'Faraday provides better JSON support and cleaner syntax'
                    }
                ],
                dependencies: ['faraday'],
                businessLogicPreservation: ['Request configuration', 'Error handling', 'Response processing']
            }
        );
    }

    /**
     * Find matching templates for given code
     */
    async findMatchingTemplates(code: string, language: string): Promise<PatternMatch[]> {
        this.loggingService.log(LogLevel.INFO, `Finding matching templates for ${language} code`);

        const matches: PatternMatch[] = [];
        const languageTemplates = this.templates.filter(t => t.language === language);

        for (const template of languageTemplates) {
            const regex = new RegExp(template.convergePattern, 'g');
            const codeMatches = code.match(regex);

            if (codeMatches) {
                codeMatches.forEach(matchedCode => {
                    const confidence = this.calculateMatchConfidence(matchedCode, template);
                    if (confidence > 0.5) {
                        matches.push({
                            template,
                            confidence,
                            matchedCode,
                            suggestedReplacement: this.generateReplacement(matchedCode, template),
                            reasoning: this.generateReasoning(template)
                        });
                    }
                });
            }
        }

        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get all available templates
     */
    getTemplates(): MigrationTemplate[] {
        return this.templates;
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: string): MigrationTemplate[] {
        return this.templates.filter(t => t.category === category);
    }

    /**
     * Get templates by language
     */
    getTemplatesByLanguage(language: string): MigrationTemplate[] {
        return this.templates.filter(t => t.language === language);
    }

    /**
     * Get templates by complexity
     */
    getTemplatesByComplexity(complexity: string): MigrationTemplate[] {
        return this.templates.filter(t => t.complexity === complexity);
    }

    /**
     * Search templates by tags
     */
    searchTemplates(tags: string[]): MigrationTemplate[] {
        return this.templates.filter(template =>
            tags.some(tag => template.tags.includes(tag))
        );
    }

    /**
     * Get template by ID
     */
    getTemplateById(id: string): MigrationTemplate | undefined {
        return this.templates.find(t => t.id === id);
    }

    /**
     * Add custom template
     */
    addCustomTemplate(template: MigrationTemplate): void {
        this.loggingService.log(LogLevel.INFO, `Adding custom template: ${template.id}`);
        this.templates.push(template);
    }

    /**
     * Remove custom template
     */
    removeCustomTemplate(id: string): boolean {
        const index = this.templates.findIndex(t => t.id === id);
        if (index > -1) {
            this.templates.splice(index, 1);
            this.loggingService.log(LogLevel.INFO, `Removed custom template: ${id}`);
            return true;
        }
        return false;
    }

    /**
     * Export templates to JSON
     */
    exportTemplates(): string {
        return JSON.stringify(this.templates, null, 2);
    }

    /**
     * Import templates from JSON
     */
    importTemplates(json: string): boolean {
        try {
            const importedTemplates = JSON.parse(json);
            if (Array.isArray(importedTemplates)) {
                this.templates.push(...importedTemplates);
                this.loggingService.log(LogLevel.INFO, `Imported ${importedTemplates.length} templates`);
                return true;
            }
            return false;
        } catch (error) {
            this.loggingService.log(LogLevel.ERROR, `Failed to import templates: ${error}`);
            return false;
        }
    }

    private calculateMatchConfidence(matchedCode: string, template: MigrationTemplate): number {
        let confidence = template.confidence;

        // Adjust confidence based on code complexity
        if (matchedCode.length > 100) confidence += 0.1;
        if (matchedCode.includes('ssl_')) confidence += 0.1;
        if (matchedCode.includes('converge')) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    private generateReplacement(matchedCode: string, template: MigrationTemplate): string {
        // This would implement actual code transformation logic
        // For now, return a placeholder
        return `// Elavon equivalent using ${template.name}`;
    }

    private generateReasoning(template: MigrationTemplate): string[] {
        const reasoning: string[] = [];

        reasoning.push(`High confidence match for ${template.name}`);
        reasoning.push(`Template complexity: ${template.complexity}`);
        
        if (template.dependencies.length > 0) {
            reasoning.push(`Requires dependencies: ${template.dependencies.join(', ')}`);
        }

        if (template.businessLogicPreservation.length > 0) {
            reasoning.push(`Preserves: ${template.businessLogicPreservation.join(', ')}`);
        }

        return reasoning;
    }
}
