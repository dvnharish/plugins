import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('JavaScript/TypeScript Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('JavaScript HTTP Client Detection', () => {
    it('should detect fetch usage', () => {
      const content = `
        async function processPayment(data) {
          const response = await fetch('https://api.converge.com/ProcessTransactionOnline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return response.json();
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'javascript');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('fetch');
      expect(results[0].library).toBe('fetch');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect axios usage', () => {
      const content = `
        import axios from 'axios';
        
        const convergeClient = axios.create({
          baseURL: 'https://api.converge.com'
        });
        
        export async function callConvergeAPI(data) {
          const response = await convergeClient.post('/ProcessTransactionOnline', data);
          return response.data;
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'javascript');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('axios');
      expect(results[0].library).toBe('axios');
    });

    it('should detect XMLHttpRequest usage', () => {
      const content = `
        function makeConvergeRequest(data) {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://converge.com/ProcessTransactionOnline');
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify(data));
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'javascript');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('fetch');
      expect(results[0].library).toBe('fetch');
    });
  });

  describe('TypeScript HTTP Client Detection', () => {
    it('should detect typed fetch usage', () => {
      const content = `
        interface ConvergeResponse {
          ssl_result: string;
          ssl_result_message: string;
        }
        
        async function processPayment(data: PaymentData): Promise<ConvergeResponse> {
          const response = await fetch('https://api.converge.com/ProcessTransactionOnline', {
            method: 'POST',
            body: JSON.stringify(data)
          });
          return response.json() as ConvergeResponse;
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'typescript');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('fetch');
      expect(results[0].library).toBe('fetch');
    });

    it('should detect axios with TypeScript types', () => {
      const content = `
        import axios, { AxiosResponse } from 'axios';
        
        interface SSLData {
          ssl_account_id: string;
          ssl_amount: string;
        }
        
        export class ConvergeService {
          async processTransaction(data: SSLData): Promise<AxiosResponse> {
            return axios.post<ConvergeResponse>('https://converge.com/ProcessTransactionOnline', data);
          }
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'typescript');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('axios');
      expect(results[0].library).toBe('axios');
    });
  });

  describe('JavaScript SSL Field Detection', () => {
    it('should detect SSL fields in object literals', () => {
      const content = `
        const sslData = {
          ssl_account_id: '123456',
          ssl_user_id: 'merchant1',
          ssl_pin: 'secret123',
          ssl_transaction_type: 'ccsale',
          ssl_amount: '10.00'
        };
      `;

      const results = patternMatcher.extractSSLFields(content, 'javascript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields in class properties', () => {
      const content = `
        class ConvergePayment {
          constructor() {
            this.ssl_account_id = '123456';
            this.ssl_user_id = 'merchant1';
            this.ssl_pin = 'secret123';
          }
          
          buildRequest() {
            return {
              ssl_transaction_type: 'ccsale',
              ssl_amount: this.amount,
              ssl_card_number: this.cardNumber
            };
          }
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'javascript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in React components', () => {
      const content = `
        import React, { useState } from 'react';
        
        export function PaymentForm() {
          const [paymentData, setPaymentData] = useState({
            ssl_merchant_id: process.env.REACT_APP_CONVERGE_MERCHANT_ID,
            ssl_user_id: process.env.REACT_APP_CONVERGE_USER_ID,
            ssl_pin: process.env.REACT_APP_CONVERGE_PIN,
            ssl_card_number: '',
            ssl_exp_date: '',
            ssl_amount: ''
          });
          
          return <form>...</form>;
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'javascript');
      
      expect(results.length).toBeGreaterThan(5);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });
  });

  describe('TypeScript SSL Field Detection', () => {
    it('should detect SSL fields in TypeScript interfaces', () => {
      const content = `
        interface ConvergeSSLData {
          ssl_account_id: string;
          ssl_user_id: string;
          ssl_pin: string;
          ssl_transaction_type: 'ccsale' | 'ccreturn' | 'ccauth';
          ssl_amount: string;
          ssl_card_number?: string;
          ssl_exp_date?: string;
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'typescript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in type definitions', () => {
      const content = `
        type PaymentRequest = {
          ssl_merchant_id: string;
          ssl_amount: number;
          ssl_card_number: string;
        };
        
        class PaymentService {
          private ssl_account_id: string;
          private ssl_user_id: string;
          
          constructor(config: ConvergeConfig) {
            this.ssl_account_id = config.accountId;
            this.ssl_user_id = config.userId;
          }
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'typescript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_account_id');
    });
  });

  describe('JavaScript Endpoint Detection', () => {
    it('should detect Converge endpoints in JavaScript code', () => {
      const content = `
        class ConvergeClient {
          constructor() {
            this.baseUrl = 'https://api.converge.com';
          }
          
          async processTransaction(data) {
            const url = \`\${this.baseUrl}/ProcessTransactionOnline\`;
            const response = await fetch(url, {
              method: 'POST',
              body: JSON.stringify(data)
            });
            return response.json();
          }
          
          async getHostedPaymentToken(tokenData) {
            const url = \`\${this.baseUrl}/hosted-payments/transaction_token\`;
            return fetch(url, { method: 'POST', body: JSON.stringify(tokenData) });
          }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/converge-client.js');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        async function uploadBatch(batchData) {
          const url = 'https://converge.com/batch-processing';
          const formData = new FormData();
          formData.append('batch', batchData);
          
          const response = await fetch(url, {
            method: 'POST',
            body: formData
          });
          
          return response.ok;
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/batch-processor.js');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        function loadConvergeCheckout() {
          const script = document.createElement('script');
          script.src = 'https://api.converge.com/Checkout.js';
          script.onload = initializeCheckout;
          document.head.appendChild(script);
        }
        
        function initializeCheckout() {
          // Checkout initialization code
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/checkout.js');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('JavaScript Configuration Detection', () => {
    it('should detect Node.js environment variables', () => {
      const content = `
        const convergeConfig = {
          apiKey: process.env.CONVERGE_API_KEY || 'pk_test_default',
          merchantId: process.env.CONVERGE_MERCHANT_ID,
          endpoint: process.env.CONVERGE_ENDPOINT || 'https://api.converge.com',
          timeout: parseInt(process.env.CONVERGE_TIMEOUT) || 30000
        };
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'api_key')).toBe(true);
    });

    it('should detect React environment variables', () => {
      const content = `
        const config = {
          convergeApiKey: process.env.REACT_APP_CONVERGE_API_KEY,
          convergeMerchantId: process.env.REACT_APP_CONVERGE_MERCHANT_ID,
          convergeEndpoint: process.env.REACT_APP_CONVERGE_ENDPOINT
        };
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('JavaScript Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        class PaymentProcessor {
          // TODO: Migrate from Converge to Elavon API
          async processPayment(data) {
            // Current Converge implementation
            const sslData = this.buildSslParams(data);
            return this.postToConverge(sslData);
          }
          
          /* TODO: Update this method for Elavon compatibility
           * Need to map SSL fields to Elavon equivalents
           */
          buildSslParams(data) {
            return {
              ssl_merchant_id: this.merchantId,
              ssl_amount: data.amount
            };
          }
        }
      `;

      const results = patternMatcher.detectMigrationComments(content);
      
      expect(results.hasMigrationContext).toBe(true);
      expect(results.todos.length).toBeGreaterThan(0);
    });
  });
});