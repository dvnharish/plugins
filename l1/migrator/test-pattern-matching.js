// Simple test for pattern matching without requiring compiled modules
const fs = require('fs');

console.log('🧪 Testing Converge Pattern Matching');
console.log('===================================');

// Test patterns directly
const patterns = {
  sslFields: [
    'ssl_merchant_ID',
    'ssl_user_id', 
    'ssl_pin',
    'ssl_transaction_type',
    'ssl_card_number',
    'ssl_exp_date',
    'ssl_amount',
    'ssl_first_name',
    'ssl_last_name',
    'ssl_cvv2cvc2',
    'ssl_avs_address',
    'ssl_avs_zip',
    'ssl_invoice_number'
  ],
  urls: [
    'convergepay.com',
    'api.demo.convergepay.com',
    'VirtualMerchantDemo',
    'processxml.do'
  ],
  endpoints: [
    'processxml',
    'ssl_transaction_type',
    'ssl_merchant_ID',
    'ssl_user_id',
    'ssl_pin'
  ]
};

// Test file path
const testFilePath = 'D:\\converge\\converge-sale-service\\src\\main\\java\\com\\example\\converge\\dto\\xml\\ConvergeSaleXmlRequest.java';

console.log('📁 Testing file:', testFilePath);

try {
  // Read the test file
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('📄 File content length:', content.length);
  
  // Test SSL field detection
  console.log('\n🔍 Testing SSL field detection...');
  const foundSslFields = [];
  patterns.sslFields.forEach(pattern => {
    if (content.includes(pattern)) {
      foundSslFields.push(pattern);
    }
  });
  console.log('Found SSL fields:', foundSslFields.length);
  foundSslFields.forEach((field, index) => {
    console.log(`  ${index + 1}. ${field}`);
  });
  
  // Test URL detection
  console.log('\n🔍 Testing URL detection...');
  const foundUrls = [];
  patterns.urls.forEach(pattern => {
    if (content.includes(pattern)) {
      foundUrls.push(pattern);
    }
  });
  console.log('Found URLs:', foundUrls.length);
  foundUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url}`);
  });
  
  // Test endpoint detection
  console.log('\n🔍 Testing endpoint detection...');
  const foundEndpoints = [];
  patterns.endpoints.forEach(pattern => {
    if (content.includes(pattern)) {
      foundEndpoints.push(pattern);
    }
  });
  console.log('Found endpoints:', foundEndpoints.length);
  foundEndpoints.forEach((endpoint, index) => {
    console.log(`  ${index + 1}. ${endpoint}`);
  });
  
  // Show some sample lines
  console.log('\n📄 Sample lines from file:');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('ssl_') || line.includes('converge') || line.includes('processxml')) {
      console.log(`  Line ${index + 1}: ${line.trim()}`);
    }
  });
  
  console.log('\n✅ Pattern matching test completed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
