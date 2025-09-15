import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('Python Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('Python HTTP Client Detection', () => {
    it('should detect requests library usage', () => {
      const content = `
        import requests
        
        def process_payment(data):
            response = requests.post('https://api.converge.com/ProcessTransactionOnline', data=data)
            return response.json()
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'python');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('requests');
      expect(results[0].library).toBe('requests');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect urllib usage', () => {
      const content = `
        import urllib.request
        import urllib.parse
        
        def call_converge_api(ssl_data):
            url = 'https://api.converge.com/ProcessTransactionOnline'
            data = urllib.parse.urlencode(ssl_data).encode()
            response = urllib.request.urlopen(url, data)
            return response.read()
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'python');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('requests');
      expect(results[0].library).toBe('requests');
    });

    it('should detect http.client usage', () => {
      const content = `
        import http.client
        
        def make_converge_request(data):
            conn = http.client.HTTPSConnection('api.converge.com')
            conn.request('POST', '/ProcessTransactionOnline', data)
            response = conn.getresponse()
            return response.read()
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'python');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('requests');
      expect(results[0].library).toBe('requests');
    });
  });

  describe('Python SSL Field Detection', () => {
    it('should detect SSL fields in Python dictionaries', () => {
      const content = `
        ssl_data = {
            'ssl_account_id': '123456',
            'ssl_user_id': 'merchant1',
            'ssl_pin': 'secret123',
            'ssl_transaction_type': 'ccsale',
            'ssl_amount': '10.00'
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'python');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields in class attributes', () => {
      const content = `
        class ConvergePayment:
            def __init__(self):
                self.ssl_account_id = '123456'
                self.ssl_user_id = 'merchant1'
                self.ssl_pin = 'secret123'
                
            def build_request(self):
                return {
                    'ssl_transaction_type': 'ccsale',
                    'ssl_amount': self.amount,
                    'ssl_card_number': self.card_number
                }
      `;

      const results = patternMatcher.extractSSLFields(content, 'python');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in Django-style code', () => {
      const content = `
        from django.conf import settings
        
        def process_django_payment(request):
            ssl_params = {
                'ssl_merchant_id': settings.CONVERGE_MERCHANT_ID,
                'ssl_user_id': settings.CONVERGE_USER_ID,
                'ssl_pin': settings.CONVERGE_PIN,
                'ssl_card_number': request.POST.get('card_number'),
                'ssl_exp_date': request.POST.get('exp_date'),
                'ssl_amount': request.POST.get('amount')
            }
            return ssl_params
      `;

      const results = patternMatcher.extractSSLFields(content, 'python');
      
      expect(results.length).toBeGreaterThan(5);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });
  });

  describe('Python Endpoint Detection', () => {
    it('should detect Converge endpoints in Python code', () => {
      const content = `
        import requests
        
        class ConvergeClient:
            def __init__(self):
                self.base_url = 'https://api.converge.com'
                
            def process_transaction(self, data):
                url = f'{self.base_url}/ProcessTransactionOnline'
                response = requests.post(url, data=data)
                return response.json()
                
            def get_hosted_payment_token(self, token_data):
                url = f'{self.base_url}/hosted-payments/transaction_token'
                return requests.post(url, json=token_data)
      `;

      const results = patternMatcher.detectEndpoints(content, '/app/converge_client.py');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        def upload_batch(batch_data):
            url = 'https://converge.com/batch-processing'
            response = requests.post(url, files={'batch': batch_data})
            return response.status_code == 200
      `;

      const results = patternMatcher.detectEndpoints(content, '/utils/batch_processor.py');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        def get_checkout_script():
            return '<script src="https://api.converge.com/Checkout.js"></script>'
            
        def render_checkout_page(request):
            context = {
                'checkout_script': get_checkout_script(),
                'merchant_id': settings.CONVERGE_MERCHANT_ID
            }
            return render(request, 'checkout.html', context)
      `;

      const results = patternMatcher.detectEndpoints(content, '/views/checkout.py');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('Python Configuration Detection', () => {
    it('should detect Django settings', () => {
      const content = `
        import os
        
        CONVERGE_API_KEY = os.environ.get('CONVERGE_API_KEY', 'pk_test_default')
        CONVERGE_MERCHANT_ID = os.getenv('CONVERGE_MERCHANT_ID')
        
        CONVERGE_CONFIG = {
            'endpoint': 'https://api.converge.com',
            'api_key': CONVERGE_API_KEY,
            'timeout': 30
        }
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'api_key')).toBe(true);
    });

    it('should detect Flask configuration', () => {
      const content = `
        from flask import Flask
        
        app = Flask(__name__)
        app.config['CONVERGE_ENDPOINT'] = 'https://api.converge.com'
        app.config['CONVERGE_API_KEY'] = os.environ['CONVERGE_API_KEY']
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Python Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        class PaymentProcessor:
            # TODO: Migrate from Converge to Elavon API
            def process_payment(self, data):
                # Current Converge implementation
                ssl_data = self.build_ssl_params(data)
                return self.post_to_converge(ssl_data)
                
            # TODO: Update this method for Elavon compatibility
            # Need to map SSL fields to Elavon equivalents
            def build_ssl_params(self, data):
                return {
                    'ssl_merchant_id': self.merchant_id,
                    'ssl_amount': data['amount']
                }
      `;

      const results = patternMatcher.detectMigrationComments(content);
      
      expect(results.hasMigrationContext).toBe(true);
      expect(results.todos.length).toBeGreaterThan(0);
    });
  });
});