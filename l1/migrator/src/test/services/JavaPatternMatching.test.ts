import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('Java Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('Java HTTP Client Detection', () => {
    it('should detect HttpClient usage', () => {
      const content = `
        import java.net.http.HttpClient;
        import java.net.http.HttpRequest;
        
        public class ConvergeClient {
          public String processPayment() {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
              .uri(URI.create("https://api.converge.com/ProcessTransactionOnline"))
              .POST(HttpRequest.BodyPublishers.ofString(data))
              .build();
            return client.send(request, HttpResponse.BodyHandlers.ofString()).body();
          }
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'java');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
      expect(results[0].library).toBe('HttpClient');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect Apache HttpClient usage', () => {
      const content = `
        import org.apache.http.client.HttpClient;
        import org.apache.http.client.methods.HttpPost;
        
        public class ConvergeService {
          public void callConvergeAPI() {
            HttpClient httpClient = HttpClients.createDefault();
            HttpPost httpPost = new HttpPost("https://api.converge.com/ProcessTransactionOnline");
            HttpResponse response = httpClient.execute(httpPost);
          }
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'java');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
      expect(results[0].library).toBe('HttpClient');
    });

    it('should detect URL connection usage', () => {
      const content = `
        import java.net.URL;
        import java.net.HttpURLConnection;
        
        public class ConvergeConnector {
          public String makeRequest() {
            URL url = new URL("https://converge.com/ProcessTransactionOnline");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            return readResponse(connection);
          }
        }
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'java');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('HttpClient');
      expect(results[0].library).toBe('HttpClient');
    });
  });

  describe('Java SSL Field Detection', () => {
    it('should detect SSL fields in Java class properties', () => {
      const content = `
        public class ConvergeRequest {
          private String ssl_account_id = "123456";
          private String ssl_user_id = "merchant1";
          private String ssl_pin = "secret123";
          private String ssl_transaction_type = "ccsale";
          private BigDecimal ssl_amount = new BigDecimal("10.00");
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'java');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields in HashMap initialization', () => {
      const content = `
        public Map<String, String> buildSslData() {
          Map<String, String> sslData = new HashMap<>();
          sslData.put("ssl_account_id", accountId);
          sslData.put("ssl_user_id", userId);
          sslData.put("ssl_pin", pin);
          sslData.put("ssl_transaction_type", "ccsale");
          sslData.put("ssl_amount", amount.toString());
          return sslData;
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'java');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in Spring Boot application', () => {
      const content = `
        @RestController
        public class PaymentController {
          
          @PostMapping("/payment")
          public ResponseEntity<String> processPayment(@RequestBody PaymentRequest request) {
            Map<String, Object> convergeData = Map.of(
              "ssl_merchant_id", merchantId,
              "ssl_user_id", userId,
              "ssl_pin", pin,
              "ssl_card_number", request.getCardNumber(),
              "ssl_exp_date", request.getExpDate(),
              "ssl_amount", request.getAmount()
            );
            return ResponseEntity.ok(processConvergePayment(convergeData));
          }
        }
      `;

      const results = patternMatcher.extractSSLFields(content, 'java');
      
      expect(results.length).toBeGreaterThan(5);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });
  });

  describe('Java Endpoint Detection', () => {
    it('should detect Converge endpoints in Java code', () => {
      const content = `
        @Service
        public class ConvergePaymentService {
          private static final String BASE_URL = "https://api.converge.com";
          
          public String processTransaction(PaymentData data) {
            String url = BASE_URL + "/ProcessTransactionOnline";
            HttpClient client = HttpClient.newHttpClient();
            // ... rest of implementation
          }
          
          public String getHostedPaymentToken(TokenData tokenData) {
            String url = BASE_URL + "/hosted-payments/transaction_token";
            return makeHttpRequest(url, tokenData);
          }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/main/java/ConvergePaymentService.java');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        public class BatchProcessor {
          public boolean uploadBatch(byte[] batchData) {
            String url = "https://converge.com/batch-processing";
            HttpPost post = new HttpPost(url);
            post.setEntity(new ByteArrayEntity(batchData));
            return executeRequest(post);
          }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/main/java/BatchProcessor.java');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        @Controller
        public class CheckoutController {
          
          @GetMapping("/checkout")
          public String getCheckoutPage(Model model) {
            String checkoutScript = "https://api.converge.com/Checkout.js";
            model.addAttribute("checkoutScriptUrl", checkoutScript);
            return "checkout";
          }
        }
      `;

      const results = patternMatcher.detectEndpoints(content, '/src/main/java/CheckoutController.java');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('Java Configuration Detection', () => {
    it('should detect Spring Boot properties', () => {
      const content = `
        @Configuration
        @ConfigurationProperties(prefix = "converge")
        public class ConvergeConfig {
          
          @Value("\${converge.api.key}")
          private String apiKey;
          
          @Value("\${converge.merchant.id}")
          private String merchantId;
          
          @Value("\${converge.endpoint:https://api.converge.com}")
          private String endpoint;
        }
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'config_file')).toBe(true);
    });

    it('should detect environment variables', () => {
      const content = `
        public class ConvergeSettings {
          public static final String API_KEY = System.getenv("CONVERGE_API_KEY");
          public static final String MERCHANT_ID = System.getenv("CONVERGE_MERCHANT_ID");
          public static final String ENDPOINT = System.getProperty("converge.endpoint", "https://api.converge.com");
        }
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Java Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        public class PaymentProcessor {
          
          // TODO: Migrate from Converge to Elavon API
          public PaymentResult processPayment(PaymentRequest request) {
            // Current Converge implementation
            Map<String, String> sslData = buildSslParameters(request);
            return postToConverge(sslData);
          }
          
          /* TODO: Update this method for Elavon compatibility
           * Need to map SSL fields to Elavon equivalents
           */
          private Map<String, String> buildSslParameters(PaymentRequest request) {
            Map<String, String> params = new HashMap<>();
            params.put("ssl_merchant_id", request.getMerchantId());
            params.put("ssl_amount", request.getAmount().toString());
            return params;
          }
        }
      `;

      const results = patternMatcher.detectMigrationComments(content);
      
      expect(results.hasMigrationContext).toBe(true);
      expect(results.todos.length).toBeGreaterThan(0);
    });
  });
});