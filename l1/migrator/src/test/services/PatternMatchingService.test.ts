import { PatternMatchingService } from '../../services/PatternMatchingService';

describe('PatternMatchingService', () => {
  let patternMatchingService: PatternMatchingService;

  beforeEach(() => {
    patternMatchingService = new PatternMatchingService();
  });

  describe('Converge Endpoint Detection', () => {
    test('should detect hosted-payments/transaction_token endpoint', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
      expect(results[0].endpointType).toBe('/hosted-payments/transaction_token');
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect Checkout.js endpoint', () => {
      const code = `
        ConvergeCheckout({
          ssl_merchant_id: '123',
          ssl_user_id: '456',
          ssl_pin: '789',
          ssl_transaction_type: 'ccsale'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
      expect(results[0].endpointType).toBe('/Checkout.js');
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect ProcessTransactionOnline endpoint', () => {
      const code = `
        const transaction = {
          ssl_merchant_id: '123',
          ssl_user_id: '456',
          ssl_pin: '789',
          ssl_transaction_type: 'ccsale',
          ssl_amount: '10.00'
        };
        const response = await axios.post('https://api.convergepay.com/ProcessTransactionOnline', transaction);
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
      expect(results[0].endpointType).toBe('/ProcessTransactionOnline');
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect batch-processing endpoint', () => {
      const code = `
        const batchData = {
          ssl_merchant_id: '123',
          ssl_user_id: '456',
          ssl_pin: '789',
          ssl_batch_number: '001'
        };
        const response = await fetch('https://api.convergepay.com/batch-processing', {
          method: 'POST',
          body: JSON.stringify(batchData)
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
      expect(results[0].endpointType).toBe('/batch-processing');
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });

    test('should detect NonElavonCertifiedDevice endpoint', () => {
      const code = `
        const deviceData = {
          ssl_merchant_id: '123',
          ssl_user_id: '456',
          ssl_pin: '789',
          ssl_device_id: 'device123'
        };
        const response = await axios.post('https://api.convergepay.com/NonElavonCertifiedDevice', deviceData);
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
      expect(results[0].endpointType).toBe('/NonElavonCertifiedDevice');
      expect(results[0].confidence).toBeGreaterThan(0.7);
    });
  });

  describe('SSL Field Detection', () => {
    test('should extract SSL fields from code', () => {
      const code = `
        const data = {
          ssl_merchant_id: '123',
          ssl_user_id: '456',
          ssl_pin: '789',
          ssl_transaction_type: 'ccsale',
          ssl_amount: '10.00',
          ssl_card_number: '4111111111111111',
          ssl_exp_date: '1225',
          ssl_cvv: '123'
        };
      `;

      const sslFields = patternMatchingService.extractSSLFields(code);
      expect(sslFields).toContain('ssl_merchant_id');
      expect(sslFields).toContain('ssl_user_id');
      expect(sslFields).toContain('ssl_pin');
      expect(sslFields).toContain('ssl_transaction_type');
      expect(sslFields).toContain('ssl_amount');
      expect(sslFields).toContain('ssl_card_number');
      expect(sslFields).toContain('ssl_exp_date');
      expect(sslFields).toContain('ssl_cvv');
    });

    test('should handle different SSL field formats', () => {
      const code = `
        // Snake case
        ssl_merchant_id: '123',
        // Camel case
        sslMerchantId: '123',
        // With underscores and numbers
        ssl_transaction_type_2: 'ccsale',
        // In strings
        'ssl_amount': '10.00',
        // In template literals
        \`ssl_card_number\`: '4111111111111111'
      `;

      const sslFields = patternMatchingService.extractSSLFields(code);
      expect(sslFields.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-language Support', () => {
    test('should detect endpoints in JavaScript', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          method: 'POST',
          body: 'ssl_merchant_id=123'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code, 'javascript');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in TypeScript', () => {
      const code = `
        interface ConvergeRequest {
          ssl_merchant_id: string;
          ssl_user_id: string;
        }
        
        const response = await fetch('https://api.convergepay.com/ProcessTransactionOnline', {
          method: 'POST',
          body: JSON.stringify({ ssl_merchant_id: '123' })
        });
      `;

      const results = patternMatchingService.matchEndpoints(code, 'typescript');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in PHP', () => {
      const code = `
        <?php
        $data = array(
          'ssl_merchant_id' => '123',
          'ssl_user_id' => '456'
        );
        
        $response = file_get_contents('https://api.convergepay.com/hosted-payments/transaction_token', false, stream_context_create([
          'http' => [
            'method' => 'POST',
            'content' => http_build_query($data)
          ]
        ]));
        ?>
      `;

      const results = patternMatchingService.matchEndpoints(code, 'php');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in Python', () => {
      const code = `
        import requests
        
        data = {
            'ssl_merchant_id': '123',
            'ssl_user_id': '456'
        }
        
        response = requests.post('https://api.convergepay.com/ProcessTransactionOnline', data=data)
      `;

      const results = patternMatchingService.matchEndpoints(code, 'python');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in Java', () => {
      const code = `
        import java.net.http.HttpClient;
        import java.net.http.HttpRequest;
        
        Map<String, String> data = Map.of(
            "ssl_merchant_id", "123",
            "ssl_user_id", "456"
        );
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://api.convergepay.com/hosted-payments/transaction_token"))
            .POST(HttpRequest.BodyPublishers.ofString(data.toString()))
            .build();
      `;

      const results = patternMatchingService.matchEndpoints(code, 'java');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in C#', () => {
      const code = `
        using System.Net.Http;
        
        var data = new Dictionary<string, string>
        {
            { "ssl_merchant_id", "123" },
            { "ssl_user_id", "456" }
        };
        
        var response = await httpClient.PostAsync("https://api.convergepay.com/ProcessTransactionOnline", 
            new FormUrlEncodedContent(data));
      `;

      const results = patternMatchingService.matchEndpoints(code, 'csharp');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in Ruby', () => {
      const code = `
        require 'net/http'
        require 'uri'
        
        data = {
          ssl_merchant_id: '123',
          ssl_user_id: '456'
        }
        
        uri = URI('https://api.convergepay.com/hosted-payments/transaction_token')
        response = Net::HTTP.post_form(uri, data)
      `;

      const results = patternMatchingService.matchEndpoints(code, 'ruby');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in Go', () => {
      const code = `
        package main
        
        import (
            "bytes"
            "net/http"
            "net/url"
        )
        
        data := url.Values{}
        data.Set("ssl_merchant_id", "123")
        data.Set("ssl_user_id", "456")
        
        resp, err := http.PostForm("https://api.convergepay.com/ProcessTransactionOnline", data)
      `;

      const results = patternMatchingService.matchEndpoints(code, 'go');
      expect(results).toHaveLength(1);
    });

    test('should detect endpoints in C++', () => {
      const code = `
        #include <curl/curl.h>
        
        std::string data = "ssl_merchant_id=123&ssl_user_id=456";
        
        CURL* curl = curl_easy_init();
        curl_easy_setopt(curl, CURLOPT_URL, "https://api.convergepay.com/hosted-payments/transaction_token");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
      `;

      const results = patternMatchingService.matchEndpoints(code, 'cpp');
      expect(results).toHaveLength(1);
    });
  });

  describe('HTTP Client Detection', () => {
    test('should detect fetch usage', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token');
      `;

      const httpClients = patternMatchingService.detectHTTPClientUsage(code);
      expect(httpClients).toContain('fetch');
    });

    test('should detect axios usage', () => {
      const code = `
        const response = await axios.post('https://api.convergepay.com/ProcessTransactionOnline', data);
      `;

      const httpClients = patternMatchingService.detectHTTPClientUsage(code);
      expect(httpClients).toContain('axios');
    });

    test('should detect jQuery AJAX usage', () => {
      const code = `
        $.ajax({
          url: 'https://api.convergepay.com/hosted-payments/transaction_token',
          method: 'POST',
          data: formData
        });
      `;

      const httpClients = patternMatchingService.detectHTTPClientUsage(code);
      expect(httpClients).toContain('jquery');
    });

    test('should detect XMLHttpRequest usage', () => {
      const code = `
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.convergepay.com/ProcessTransactionOnline');
        xhr.send(data);
      `;

      const httpClients = patternMatchingService.detectHTTPClientUsage(code);
      expect(httpClients).toContain('xmlhttprequest');
    });
  });

  describe('Confidence Calculation', () => {
    test('should calculate high confidence for clear matches', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results[0].confidence).toBeGreaterThan(0.8);
    });

    test('should calculate lower confidence for ambiguous matches', () => {
      const code = `
        // This might be a Converge endpoint
        const url = 'https://api.convergepay.com/some-endpoint';
      `;

      const results = patternMatchingService.matchEndpoints(code);
      if (results.length > 0) {
        expect(results[0].confidence).toBeLessThan(0.8);
      }
    });

    test('should increase confidence with more SSL fields', () => {
      const codeWithFewFields = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          body: 'ssl_merchant_id=123'
        });
      `;

      const codeWithManyFields = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789&ssl_transaction_type=ccsale&ssl_amount=10.00'
        });
      `;

      const resultsFew = patternMatchingService.matchEndpoints(codeWithFewFields);
      const resultsMany = patternMatchingService.matchEndpoints(codeWithManyFields);

      if (resultsFew.length > 0 && resultsMany.length > 0) {
        expect(resultsMany[0].confidence).toBeGreaterThan(resultsFew[0].confidence);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty code', () => {
      const results = patternMatchingService.matchEndpoints('');
      expect(results).toHaveLength(0);
    });

    test('should handle code without Converge endpoints', () => {
      const code = `
        const response = await fetch('https://api.example.com/endpoint', {
          method: 'POST',
          body: 'data=value'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(0);
    });

    test('should handle malformed URLs', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token?invalid', {
          method: 'POST'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
    });

    test('should handle commented code', () => {
      const code = `
        // const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token');
        /* 
         * const data = { ssl_merchant_id: '123' };
         */
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(0);
    });

    test('should handle code with special characters', () => {
      const code = `
        const response = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
          method: 'POST',
          body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789&ssl_amount=10.00&ssl_currency=USD'
        });
      `;

      const results = patternMatchingService.matchEndpoints(code);
      expect(results).toHaveLength(1);
    });
  });

  describe('Performance', () => {
    test('should handle large code files efficiently', () => {
      const largeCode = `
        // Generate a large code file with many Converge endpoints
        ${Array.from({ length: 1000 }, (_, i) => `
          const response${i} = await fetch('https://api.convergepay.com/hosted-payments/transaction_token', {
            method: 'POST',
            body: 'ssl_merchant_id=123&ssl_user_id=456&ssl_pin=789'
          });
        `).join('\n')}
      `;

      const startTime = Date.now();
      const results = patternMatchingService.matchEndpoints(largeCode);
      const endTime = Date.now();

      expect(results.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
  });
});