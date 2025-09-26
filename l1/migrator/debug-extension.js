// Debug script to test ElavonX extension activation
console.log('🔍 Debug: Testing ElavonX extension activation...');

// Force extension activation by opening a JavaScript file
// This should trigger the extension to activate

// Test Converge patterns
const convergeEndpoint = '/ProcessTransactionOnline';
const sslFields = ['ssl_merchant_id', 'ssl_pin', 'ssl_amount'];

// Test API calls
fetch('/ProcessTransactionOnline', {
  method: 'POST',
  body: JSON.stringify({
    ssl_merchant_id: '12345',
    ssl_pin: 'test123'
  })
});

console.log('🔍 Debug: File loaded - extension should activate now');
console.log('🔍 Debug: Try running "ElavonX: Test Extension" command');
