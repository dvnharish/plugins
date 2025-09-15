import { PatternMatchingService } from '../../services/PatternMatchingService';
import { ConvergeEndpointType } from '../../types/ConvergeEndpoint';

describe('PHP Pattern Matching', () => {
  let patternMatcher: PatternMatchingService;

  beforeEach(() => {
    patternMatcher = new PatternMatchingService();
  });

  describe('PHP HTTP Client Detection', () => {
    it('should detect curl_setopt usage', () => {
      const content = `
        <?php
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.converge.com/ProcessTransactionOnline');
        curl_setopt($ch, CURLOPT_POST, true);
        $response = curl_exec($ch);
        ?>
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'php');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('curl');
      expect(results[0].library).toBe('curl');
      expect(results[0].confidence).toBeGreaterThan(0);
    });

    it('should detect WordPress wp_remote_post usage', () => {
      const content = `
        <?php
        $response = wp_remote_post('https://api.converge.com/ProcessTransactionOnline', array(
          'body' => $ssl_data,
          'headers' => array('Content-Type' => 'application/x-www-form-urlencoded')
        ));
        ?>
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'php');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('curl');
      expect(results[0].library).toBe('curl');
    });

    it('should detect file_get_contents usage', () => {
      const content = `
        <?php
        $context = stream_context_create(array(
          'http' => array(
            'method' => 'POST',
            'content' => http_build_query($ssl_data)
          )
        ));
        $response = file_get_contents('https://converge.com/ProcessTransactionOnline', false, $context);
        ?>
      `;

      const results = patternMatcher.detectHTTPClientUsage(content, 'php');
      
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('curl');
      expect(results[0].library).toBe('curl');
    });
  });

  describe('PHP SSL Field Detection', () => {
    it('should detect SSL fields in PHP variables', () => {
      const content = `
        <?php
        $ssl_account_id = '123456';
        $ssl_user_id = 'merchant1';
        $ssl_pin = 'secret123';
        $ssl_transaction_type = 'ccsale';
        $ssl_amount = '10.00';
        ?>
      `;

      const results = patternMatcher.extractSSLFields(content, 'php');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_amount');
    });

    it('should detect SSL fields in PHP arrays', () => {
      const content = `
        <?php
        $ssl_data = array(
          'ssl_account_id' => '123456',
          'ssl_user_id' => 'merchant1',
          'ssl_pin' => 'secret123',
          'ssl_transaction_type' => 'ccsale',
          'ssl_amount' => '10.00'
        );
        ?>
      `;

      const results = patternMatcher.extractSSLFields(content, 'php');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.field)).toContain('ssl_account_id');
      expect(results.map(r => r.field)).toContain('ssl_transaction_type');
    });

    it('should detect SSL fields in Laravel-style arrays', () => {
      const content = `
        <?php
        $paymentData = [
          'ssl_merchant_id' => config('converge.merchant_id'),
          'ssl_user_id' => config('converge.user_id'),
          'ssl_pin' => config('converge.pin'),
          'ssl_card_number' => $request->card_number,
          'ssl_exp_date' => $request->exp_date,
          'ssl_amount' => $request->amount
        ];
        ?>
      `;

      const results = patternMatcher.extractSSLFields(content, 'php');
      
      expect(results.length).toBeGreaterThan(5);
      expect(results.map(r => r.field)).toContain('ssl_merchant_id');
      expect(results.map(r => r.field)).toContain('ssl_card_number');
    });
  });

  describe('PHP Endpoint Detection', () => {
    it('should detect Converge endpoints in PHP code', () => {
      const content = `
        <?php
        class ConvergePayment {
          private $base_url = 'https://api.converge.com';
          
          public function processTransaction($data) {
            $url = $this->base_url . '/ProcessTransactionOnline';
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            return curl_exec($ch);
          }
          
          public function getHostedPaymentToken() {
            $url = $this->base_url . '/hosted-payments/transaction_token';
            return wp_remote_post($url, array('body' => $this->ssl_data));
          }
        }
        ?>
      `;

      const results = patternMatcher.detectEndpoints(content, '/app/ConvergePayment.php');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.PROCESS_TRANSACTION);
      expect(results.map(r => r.type)).toContain(ConvergeEndpointType.HOSTED_PAYMENTS);
    });

    it('should detect batch processing endpoints', () => {
      const content = `
        <?php
        function uploadBatch($batchData) {
          $url = 'https://converge.com/batch-processing';
          $ch = curl_init();
          curl_setopt($ch, CURLOPT_URL, $url);
          curl_setopt($ch, CURLOPT_POSTFIELDS, $batchData);
          return curl_exec($ch);
        }
        ?>
      `;

      const results = patternMatcher.detectEndpoints(content, '/lib/batch_processor.php');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.BATCH_PROCESSING);
    });

    it('should detect checkout.js integration', () => {
      const content = `
        <?php
        function getCheckoutScript() {
          return '<script src="https://api.converge.com/Checkout.js"></script>';
        }
        
        function renderCheckout() {
          echo getCheckoutScript();
        }
        ?>
      `;

      const results = patternMatcher.detectEndpoints(content, '/views/checkout.php');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ConvergeEndpointType.CHECKOUT);
    });
  });

  describe('PHP Configuration Detection', () => {
    it('should detect WordPress configuration', () => {
      const content = `
        <?php
        define('CONVERGE_API_KEY', 'pk_test_1234567890');
        define('CONVERGE_MERCHANT_ID', getenv('CONVERGE_MERCHANT_ID'));
        
        $converge_config = array(
          'endpoint' => 'https://api.converge.com',
          'api_key' => CONVERGE_API_KEY
        );
        ?>
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'api_key')).toBe(true);
    });

    it('should detect Laravel configuration', () => {
      const content = `
        <?php
        return [
          'converge' => [
            'api_key' => env('CONVERGE_API_KEY'),
            'merchant_id' => env('CONVERGE_MERCHANT_ID'),
            'endpoint' => env('CONVERGE_ENDPOINT', 'https://api.converge.com')
          ]
        ];
        ?>
      `;

      const results = patternMatcher.detectConfigurationPatterns(content);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('PHP Migration Context Detection', () => {
    it('should detect TODO comments about Converge migration', () => {
      const content = `
        <?php
        class PaymentProcessor {
          // TODO: Migrate from Converge to Elavon API
          public function processPayment($data) {
            // Current Converge implementation
            $ssl_data = $this->buildSslParams($data);
            return $this->postToConverge($ssl_data);
          }
          
          /* TODO: Update this method for Elavon compatibility
           * Need to map SSL fields to Elavon equivalents
           */
          private function buildSslParams($data) {
            return array(
              'ssl_merchant_id' => $this->merchant_id,
              'ssl_amount' => $data['amount']
            );
          }
        }
        ?>
      `;

      const results = patternMatcher.detectMigrationComments(content);
      
      expect(results.hasMigrationContext).toBe(true);
      expect(results.todos.length).toBeGreaterThan(0);
    });
  });
});