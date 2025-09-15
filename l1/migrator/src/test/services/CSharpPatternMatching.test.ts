import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('C# Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('C# HTTP Client Detection', () => {
    it('should detect HttpClient usage', () => {
      const content = `
        using System.Net.Http;
        
        public async Task<string> ProcessPayment()
        {
            using var client = new HttpClient();
            var response = await client.PostAsync("https://api.converge.com/ProcessTransactionOnline", content);
            return await response.Content.ReadAsStringAsync();
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'csharp');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect WebRequest usage', () => {
      const content = `
        public string CallConvergeAPI()
        {
            var request = WebRequest.Create("https://api.converge.com/ProcessTransactionOnline");
            request.Method = "POST";
            // ... rest of implementation
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'csharp');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
    });

    it('should detect RestSharp usage', () => {
      const content = `
        using RestSharp;
        
        public IRestResponse ProcessTransaction()
        {
            var client = new RestClient("https://api.converge.com");
            var request = new RestRequest("/ProcessTransactionOnline", Method.POST);
            return client.Execute(request);
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'csharp');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
    });

    it('should detect WebClient usage', () => {
      const content = `
        using System.Net;
        
        public string UploadData()
        {
            using var client = new WebClient();
            return client.UploadString("https://converge.com/batch-processing", data);
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'csharp');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
    });
  });

  describe('C# SSL Field Detection', () => {
    it('should detect SSL fields in C# properties', () => {
      const content = `
        public class ConvergeRequest
        {
            public string ssl_account_id { get; set; }
            public string ssl_user_id { get; set; }
            public string ssl_pin { get; set; }
            public string ssl_transaction_type { get; set; }
            public decimal ssl_amount { get; set; }
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'csharp');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields in dictionary initialization', () => {
      const content = `
        var sslData = new Dictionary<string, string>
        {
            ["ssl_account_id"] = accountId,
            ["ssl_user_id"] = userId,
            ["ssl_pin"] = pin,
            ["ssl_transaction_type"] = "ccsale",
            ["ssl_amount"] = amount.ToString("F2")
        };
      `;

      const results = patternMatcher.extractSSLFields(content, 'csharp');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in anonymous objects', () => {
      const content = `
        var requestData = new
        {
            ssl_merchant_id = merchantId,
            ssl_user_id = userId,
            ssl_pin = pin,
            ssl_card_number = cardNumber,
            ssl_exp_date = expDate,
            ssl_amount = amount
        };
      `;

      const results = patternMatcher.extractSSLFields(content, 'csharp');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });

    it('should detect SSL fields in string interpolation', () => {
      const content = `
        public string BuildPostData()
        {
            return $"ssl_account_id={ssl_account_id}&ssl_user_id={ssl_user_id}&ssl_amount={ssl_amount}";
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'csharp');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
    });
  });

  describe('C# Endpoint Detection', () => {
    it('should detect Converge endpoints in C# code', () => {
      const content = `
        public class ConvergePaymentService
        {
            private const string BaseUrl = "https://api.converge.com";
            
            public async Task<string> ProcessTransaction(PaymentData data)
            {
                var client = new HttpClient();
                var response = await client.PostAsync($"{BaseUrl}/ProcessTransactionOnline", content);
                return await response.Content.ReadAsStringAsync();
            }
            
            public async Task<string> GetHostedPaymentToken()
            {
                var client = new HttpClient();
                return await client.PostAsync($"{BaseUrl}/hosted-payments/transaction_token", tokenData);
            }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/Services/ConvergePaymentService.cs');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        public class BatchProcessor
        {
            public async Task UploadBatch(byte[] batchData)
            {
                var client = new HttpClient();
                await client.PostAsync("https://converge.com/batch-processing", new ByteArrayContent(batchData));
            }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/Services/BatchProcessor.cs');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        public class CheckoutHelper
        {
            public string GetCheckoutScriptUrl()
            {
                return "https://api.converge.com/Checkout.js";
            }
            
            public IHtmlContent RenderCheckoutScript()
            {
                return new HtmlString($"<script src='{GetCheckoutScriptUrl()}'></script>");
            }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/Helpers/CheckoutHelper.cs');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('C# Configuration Detection', () => {
    it('should detect appsettings.json references', () => {
      const content = `
        public class ConvergeConfiguration
        {
            public string ApiKey => _configuration["Converge:ApiKey"];
            public string MerchantId => _configuration["Converge:MerchantId"];
            public string EndpointUrl => _configuration["Converge:EndpointUrl"];
            
            private readonly IConfiguration _configuration;
            
            public ConvergeConfiguration(IConfiguration configuration)
            {
                _configuration = configuration;
            }
        }
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'config_file')).toBe(true);
    });

    it('should detect environment variables', () => {
      const content = `
        public static class ConvergeSettings
        {
            public static string ApiKey => Environment.GetEnvironmentVariable("CONVERGE_API_KEY");
            public static string MerchantId => Environment.GetEnvironmentVariable("CONVERGE_MERCHANT_ID");
        }
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'environment')).toBe(true);
    });
  });

  describe('C# Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        public class PaymentProcessor
        {
            // TODO: Migrate from Converge to Elavon API
            public async Task<PaymentResult> ProcessPayment(PaymentRequest request)
            {
                // Current Converge implementation
                var sslData = BuildSslParameters(request);
                return await PostToConverge(sslData);
            }
            
            /* TODO: Update this method for Elavon compatibility
             * Need to map SSL fields to Elavon equivalents
             */
            private Dictionary<string, string> BuildSslParameters(PaymentRequest request)
            {
                return new Dictionary<string, string>
                {
                    ["ssl_merchant_id"] = request.MerchantId,
                    ["ssl_amount"] = request.Amount.ToString("F2")
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