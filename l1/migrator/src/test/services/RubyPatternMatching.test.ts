import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('Ruby Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('Ruby HTTP Client Detection', () => {
    it('should detect Net::HTTP usage', () => {
      const content = `
        require 'net/http'
        uri = URI('https://api.converge.com/ProcessTransactionOnline')
        response = Net::HTTP.post(uri, data)
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'ruby');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('ruby_http');
      expect(results[0].library).toBe('ruby');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect HTTParty usage', () => {
      const content = `
        require 'httparty'
        response = HTTParty.post('https://api.converge.com/hosted-payments/transaction_token', {
          body: ssl_data.to_json,
          headers: { 'Content-Type' => 'application/json' }
        })
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'ruby');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('ruby_http');
    });

    it('should detect RestClient usage', () => {
      const content = `
        require 'rest-client'
        response = RestClient.post('https://converge.com/ProcessTransactionOnline', ssl_params)
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'ruby');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('ruby_http');
    });

    it('should detect Faraday usage', () => {
      const content = `
        conn = Faraday.new(url: 'https://api.converge.com')
        response = conn.post('/ProcessTransactionOnline', ssl_data)
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'ruby');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('ruby_http');
    });
  });

  describe('Ruby SSL Field Detection', () => {
    it('should detect SSL fields in Ruby hash syntax', () => {
      const content = `
        ssl_data = {
          ssl_account_id: '123456',
          ssl_user_id: 'merchant1',
          ssl_pin: 'secret123',
          ssl_transaction_type: 'ccsale',
          ssl_amount: '10.00'
        }
      `;

      const results = patternMatcher.extractSSLFields(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields with Ruby symbols', () => {
      const content = `
        params = {
          :ssl_account_id => '123456',
          :ssl_user_id => 'merchant1',
          :ssl_amount => '10.00'
        }
      `;

      const results = patternMatcher.extractSSLFields(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
    });

    it('should detect SSL fields in string keys', () => {
      const content = `
        data = {
          'ssl_account_id' => account_id,
          'ssl_user_id' => user_id,
          'ssl_pin' => pin,
          'ssl_transaction_type' => 'ccsale'
        }
      `;

      const results = patternMatcher.extractSSLFields(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in Rails-style parameters', () => {
      const content = `
        def process_payment
          ssl_params = {
            ssl_merchant_id: params[:merchant_id],
            ssl_user_id: params[:user_id],
            ssl_pin: Rails.application.credentials.converge_pin,
            ssl_transaction_type: 'ccsale',
            ssl_card_number: params[:card_number],
            ssl_exp_date: params[:exp_date],
            ssl_amount: params[:amount]
          }
        end
      `;

      const results = patternMatcher.extractSSLFields(content);
      
      expect(results.length).toBeGreaterThan(5);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });
  });

  describe('Ruby Endpoint Detection', () => {
    it('should detect Converge endpoints in Ruby code', () => {
      const content = `
        class ConvergePayment
          BASE_URL = 'https://api.converge.com'
          
          def process_transaction
            uri = URI.join(BASE_URL, '/ProcessTransactionOnline')
            response = Net::HTTP.post(uri, ssl_data.to_json)
          end
          
          def hosted_payment_token
            HTTParty.post('#{BASE_URL}/hosted-payments/transaction_token', {
              body: token_data.to_json
            })
          end
        end
      `;

      const results = patternMatcher.detectEndpoints(content, '/app/models/converge_payment.rb');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        def upload_batch
          RestClient.post('https://converge.com/batch-processing', {
            file: batch_file,
            ssl_merchant_id: merchant_id
          })
        end
      `;

      const results = patternMatcher.detectEndpoints(content, '/lib/batch_processor.rb');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        def checkout_script_url
          'https://api.converge.com/Checkout.js'
        end
        
        def render_checkout
          content_tag :script, '', src: checkout_script_url
        end
      `;

      const results = patternMatcher.detectEndpoints(content, '/app/helpers/payment_helper.rb');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('Ruby Configuration Detection', () => {
    it('should detect Rails credentials', () => {
      const content = `
        class ConvergeConfig
          def self.api_key
            Rails.application.credentials.converge_api_key
          end
          
          def self.merchant_id
            ENV['CONVERGE_MERCHANT_ID']
          end
          
          def self.endpoint_url
            Rails.env.production? ? 
              'https://api.converge.com' : 
              'https://demo.converge.com'
          end
        end
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'api_key')).toBe(true);
      expect(results.some(r => r.type === 'environment')).toBe(true);
    });

    it('should detect YAML configuration references', () => {
      const content = `
        # config/converge.yml
        production:
          api_key: <%= Rails.application.credentials.converge_api_key %>
          endpoint: 'https://api.converge.com'
          
        development:
          api_key: 'test_key'
          endpoint: 'https://demo.converge.com'
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Ruby Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        class PaymentProcessor
          # TODO: Migrate from Converge to Elavon API
          def process_payment
            # Current Converge implementation
            ssl_data = build_ssl_params
            response = post_to_converge(ssl_data)
          end
          
          # TODO: Update this method for Elavon compatibility
          def build_ssl_params
            {
              ssl_merchant_id: merchant_id,
              ssl_amount: amount
            }
          end
        end
      `;

      const results = patternMatcher.detectMigrationComments(content);
      
      expect(results.hasMigrationContext).toBe(true);
      expect(results.todos.length).toBeGreaterThan(0);
    });
  });
});