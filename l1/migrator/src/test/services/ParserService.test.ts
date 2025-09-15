import * as vscode from 'vscode';
import * as fs from 'fs';
import { ParserService } from '../../services/ParserService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('glob', () => ({
  glob: jest.fn()
}));

const mockGlob = require('glob').glob;

describe('ParserService', () => {
  let parserService: ParserService;
  let mockWorkspaceFolders: vscode.WorkspaceFolder[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    parserService = new ParserService();
    
    mockWorkspaceFolders = [
      {
        uri: { fsPath: '/test/workspace' } as vscode.Uri,
        name: 'test-workspace',
        index: 0
      }
    ];

    // Mock vscode.workspace.workspaceFolders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: mockWorkspaceFolders,
      configurable: true
    });
  });

  describe('scanWorkspace', () => {
    it('should return empty array when no workspace folders', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: null,
        configurable: true
      });

      const result = await parserService.scanWorkspace();
      expect(result.endpoints).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });

    it('should scan all workspace folders', async () => {
      mockGlob.mockResolvedValue(['test.js', 'src/api.ts']);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('// No Converge code');

      const result = await parserService.scanWorkspace();
      
      expect(mockGlob).toHaveBeenCalledWith(
        expect.stringContaining('**/*{.js,.jsx,.ts,.tsx,.php,.py,.java,.cs,.rb,.go,.cpp,.c,.html,.htm,.vue,.svelte}'),
        expect.objectContaining({
          cwd: '/test/workspace',
          ignore: expect.arrayContaining(['**/node_modules/**'])
        })
      );
      expect(result.endpoints).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });
  });

  describe('parseFile', () => {
    it('should parse JavaScript file with Converge endpoint', async () => {
      const jsCode = `
        const response = await fetch('/hosted-payments/transaction_token', {
          method: 'POST',
          body: JSON.stringify({
            ssl_account_id: '123456',
            ssl_user_id: 'merchant1',
            ssl_pin: 'secret123',
            ssl_transaction_type: 'ccsale',
            ssl_amount: '10.00'
          })
        });
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(jsCode);

      const result = await parserService.parseFile('/test/api.js');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].endpointType).toBe(ConvergeEndpointType.HOSTED_PAYMENTS);
      expect(result[0].sslFields.some(field => field.includes('ssl_account_id'))).toBe(true);
      // Check if any result contains ssl_amount (with or without colon)
      const hasAmountField = result.some(endpoint => 
        endpoint.sslFields.some(field => field.includes('ssl_amount'))
      );
      expect(hasAmountField).toBe(true);
      expect(result[0].filePath).toBe('/test/api.js');
    });

    it('should parse PHP file with Converge patterns', async () => {
      const phpCode = `
        <?php
        $ssl_account_id = '123456';
        $ssl_user_id = 'merchant1';
        $ssl_pin = 'secret123';
        
        curl_setopt($ch, CURLOPT_URL, 'https://api.converge.com/ProcessTransactionOnline');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        ?>
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(phpCode);

      const result = await parserService.parseFile('/test/payment.php');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sslFields).toContain('ssl_account_id');
      expect(result[0].filePath).toBe('/test/payment.php');
    });

    it('should parse TypeScript file with SSL fields', async () => {
      const tsCode = `
        interface ConvergeRequest {
          ssl_transaction_type: string;
          ssl_amount: string;
          ssl_card_number: string;
          ssl_exp_date: string;
        }
        
        const processPayment = (data: ConvergeRequest) => {
          return axios.post('/ProcessTransactionOnline', data);
        };
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(tsCode);

      const result = await parserService.parseFile('/test/types.ts');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sslFields.some(field => field.includes('ssl_card_number'))).toBe(true);
      expect(result[0].sslFields.some(field => field.includes('ssl_exp_date'))).toBe(true);
    });

    it('should handle file read errors gracefully', async () => {
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await parserService.parseFile('/nonexistent/file.js');
      
      expect(result).toEqual([]);
    });

    it('should detect Checkout.js endpoint type', async () => {
      const jsCode = `
        const checkoutScript = document.createElement('script');
        checkoutScript.src = 'https://api.converge.com/Checkout.js';
        checkoutScript.onload = function() {
          // Initialize checkout
        };
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(jsCode);

      const result = await parserService.parseFile('/test/checkout.js');
      
      expect(result).toHaveLength(1);
      expect(result[0].endpointType).toBe(ConvergeEndpointType.CHECKOUT);
    });

    it('should detect batch processing endpoint', async () => {
      const code = `
        const batchData = {
          ssl_batch_number: '001',
          ssl_total_amount: '1000.00',
          batch_file: uploadedFile
        };
        
        fetch('/batch-processing', {
          method: 'POST',
          body: JSON.stringify(batchData)
        });
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(code);

      const result = await parserService.parseFile('/test/batch.js');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].endpointType).toBe(ConvergeEndpointType.BATCH_PROCESSING);
      expect(result[0].sslFields.some(field => field.includes('ssl_batch_number'))).toBe(true);
    });

    it('should deduplicate endpoints from same location', async () => {
      const code = `
        const ssl_amount = '10.00';
        const ssl_amount = '20.00'; // Duplicate on same line context
        fetch('/ProcessTransactionOnline', { ssl_amount });
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(code);

      const result = await parserService.parseFile('/test/duplicate.js');
      
      // Should not have duplicate endpoints from the same location
      const uniqueLocations = new Set(result.map(e => `${e.filePath}:${e.lineNumber}:${e.endpointType}`));
      expect(uniqueLocations.size).toBe(result.length);
    });
  });

  describe('analyzeEndpoint', () => {
    it('should analyze endpoint complexity correctly', async () => {
      const simpleEndpoint = {
        id: '1',
        filePath: '/test/simple.js',
        lineNumber: 10,
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS,
        code: 'fetch("/hosted-payments/transaction_token")',
        sslFields: ['ssl_amount', 'ssl_account_id']
      };

      const analysis = await parserService.analyzeEndpoint(simpleEndpoint);
      
      expect(analysis.complexity).toBe('simple');
      expect(analysis.sslFields).toEqual(['ssl_amount', 'ssl_account_id']);
      expect(analysis.endpointType).toBe(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should generate appropriate migration notes', async () => {
      const recurringEndpoint = {
        id: '2',
        filePath: '/test/recurring.js',
        lineNumber: 15,
        endpointType: ConvergeEndpointType.PROCESS_TRANSACTION,
        code: 'const data = { ssl_recurring_flag: "Y", ssl_token: "abc123" }',
        sslFields: ['ssl_recurring_flag', 'ssl_token', 'ssl_amount']
      };

      const analysis = await parserService.analyzeEndpoint(recurringEndpoint);
      
      expect(analysis.migrationNotes.some(note => 
        note.includes('recurring payment logic')
      )).toBe(true);
      expect(analysis.migrationNotes.some(note => 
        note.includes('tokenization')
      )).toBe(true);
    });

    it('should assess complex endpoints correctly', async () => {
      const complexCode = 'a'.repeat(2000); // Long code
      const complexEndpoint = {
        id: '3',
        filePath: '/test/complex.js',
        lineNumber: 20,
        endpointType: ConvergeEndpointType.PROCESS_TRANSACTION,
        code: complexCode,
        sslFields: Array.from({ length: 25 }, (_, i) => `ssl_field_${i}`)
      };

      const analysis = await parserService.analyzeEndpoint(complexEndpoint);
      
      expect(analysis.complexity).toBe('complex');
      expect(analysis.migrationNotes.some(note => 
        note.includes('Complex field mapping required')
      )).toBe(true);
    });
  });

  describe('extractConvergeCode', () => {
    it('should extract code from endpoint', () => {
      const endpoint = {
        id: '1',
        filePath: '/test/file.js',
        lineNumber: 10,
        endpointType: ConvergeEndpointType.HOSTED_PAYMENTS,
        code: 'const ssl_amount = "10.00";',
        sslFields: ['ssl_amount']
      };

      const result = parserService.extractConvergeCode(endpoint);
      
      expect(result).toBe('const ssl_amount = "10.00";');
    });
  });

  describe('language-specific parsing', () => {
    it('should parse Python files correctly', async () => {
      const pythonCode = `
        import requests
        
        data = {
            'ssl_account_id': '123456',
            'ssl_user_id': 'merchant1',
            'ssl_amount': '10.00'
        }
        
        response = requests.post('https://api.converge.com/ProcessTransactionOnline', data=data)
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(pythonCode);

      const result = await parserService.parseFile('/test/payment.py');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sslFields).toContain('ssl_account_id');
    });

    it('should parse Java files correctly', async () => {
      const javaCode = `
        public class PaymentProcessor {
          private String ssl_account_id = "123456";
          private String ssl_amount = "10.00";
          
          public void processPayment() {
            HttpClient client = HttpClient.newHttpClient();
            // Process Converge payment
          }
        }
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(javaCode);

      const result = await parserService.parseFile('/test/PaymentProcessor.java');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sslFields).toContain('ssl_account_id');
    });

    it('should parse C# files correctly', async () => {
      const csharpCode = `
        public class ConvergeClient {
          private string ssl_account_id = "123456";
          private string ssl_amount = "10.00";
          
          public async Task<string> ProcessPayment() {
            using var client = new HttpClient();
            // Process payment
          }
        }
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(csharpCode);

      const result = await parserService.parseFile('/test/ConvergeClient.cs');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sslFields).toContain('ssl_account_id');
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      (fs.promises.readFile as jest.Mock).mockResolvedValue('');

      const result = await parserService.parseFile('/test/empty.js');
      
      expect(result).toEqual([]);
    });

    it('should handle files with no Converge patterns', async () => {
      const normalCode = `
        const regularFunction = () => {
          console.log('Hello world');
          return 42;
        };
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(normalCode);

      const result = await parserService.parseFile('/test/normal.js');
      
      expect(result).toEqual([]);
    });

    it('should handle malformed SSL field patterns', async () => {
      const malformedCode = `
        const ssl_ = 'incomplete';
        const _ssl_invalid = 'wrong prefix';
        const ssl_valid_field = 'correct';
      `;

      (fs.promises.readFile as jest.Mock).mockResolvedValue(malformedCode);

      const result = await parserService.parseFile('/test/malformed.js');
      
      if (result.length > 0) {
        expect(result[0].sslFields).toContain('ssl_valid_field');
        expect(result[0].sslFields).not.toContain('ssl_');
        expect(result[0].sslFields).not.toContain('_ssl_invalid');
      }
    });
  });
});