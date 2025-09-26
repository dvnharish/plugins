// Comprehensive test file for ElavonX extension
// This file contains various Converge patterns to test all panels

console.log('🧪 ElavonX Extension Test File');
console.log('📋 Testing all panels and functionality...');

// Test 1: ProcessTransactionOnline endpoint
const processTransaction = async () => {
  const response = await fetch('/ProcessTransactionOnline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      ssl_merchant_id: '12345',
      ssl_pin: 'test123',
      ssl_amount: '10.00',
      ssl_transaction_type: 'ccsale',
      ssl_card_number: '4111111111111111',
      ssl_exp_date: '1225',
      ssl_cvv2cvc2: '123'
    })
  });
  
  return response.json();
};

// Test 2: Hosted Payments
const hostedPayments = async () => {
  const tokenResponse = await fetch('/hosted-payments/transaction_token', {
    method: 'POST',
    body: JSON.stringify({
      ssl_merchant_id: '12345',
      ssl_pin: 'test123',
      ssl_amount: '25.50',
      ssl_transaction_type: 'ccsale'
    })
  });
  
  return tokenResponse.json();
};

// Test 3: Checkout.js integration
const checkoutIntegration = () => {
  // Load Converge Checkout.js
  const script = document.createElement('script');
  script.src = 'https://api.convergepay.com/Checkout.js';
  script.onload = () => {
    console.log('Checkout.js loaded');
  };
  document.head.appendChild(script);
};

// Test 4: Batch Processing
const batchProcessing = async () => {
  const batchData = {
    ssl_merchant_id: '12345',
    ssl_pin: 'test123',
    ssl_batch_number: '001',
    ssl_transaction_type: 'ccbatchclose'
  };
  
  const response = await fetch('/batch-processing', {
    method: 'POST',
    body: new URLSearchParams(batchData)
  });
  
  return response.json();
};

// Test 5: Device Management
const deviceManagement = async () => {
  const deviceData = {
    ssl_merchant_id: '12345',
    ssl_pin: 'test123',
    ssl_device_id: 'device123',
    ssl_device_type: 'NonElavonCertifiedDevice'
  };
  
  const response = await fetch('/NonElavonCertifiedDevice', {
    method: 'POST',
    body: new URLSearchParams(deviceData)
  });
  
  return response.json();
};

// Test 6: SSL Fields variations
const sslFields = {
  // Core fields
  ssl_merchant_id: '12345',
  ssl_pin: 'test123',
  ssl_amount: '10.00',
  ssl_transaction_type: 'ccsale',
  ssl_card_number: '4111111111111111',
  ssl_exp_date: '1225',
  ssl_cvv2cvc2: '123',
  
  // Additional fields
  ssl_first_name: 'John',
  ssl_last_name: 'Doe',
  ssl_email: 'john.doe@example.com',
  ssl_phone: '555-1234',
  ssl_address: '123 Main St',
  ssl_city: 'Anytown',
  ssl_state: 'CA',
  ssl_zip: '12345',
  ssl_country: 'US',
  
  // Recurring fields
  ssl_recurring_flag: 'Y',
  ssl_recurring_frequency: 'M',
  ssl_recurring_end_date: '2025-12-31',
  
  // Token fields
  ssl_token: 'token123',
  ssl_token_response: 'SUCCESS',
  
  // Response fields
  ssl_result: 'SUCCESS',
  ssl_result_message: 'Transaction approved',
  ssl_transaction_id: 'TXN123456',
  ssl_approval_code: 'APPROVAL123'
};

// Test 7: API calls with different methods
const apiCalls = {
  // Fetch API
  fetchCall: () => fetch('/ProcessTransactionOnline', { method: 'POST' }),
  
  // Axios (if available)
  axiosCall: () => {
    if (typeof axios !== 'undefined') {
      return axios.post('/ProcessTransactionOnline', sslFields);
    }
  },
  
  // XMLHttpRequest
  xhrCall: () => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/ProcessTransactionOnline');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(new URLSearchParams(sslFields));
  }
};

// Test 8: Error handling
const errorHandling = async () => {
  try {
    const response = await fetch('/ProcessTransactionOnline', {
      method: 'POST',
      body: new URLSearchParams({
        ssl_merchant_id: 'invalid',
        ssl_pin: 'wrong'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processTransaction,
    hostedPayments,
    checkoutIntegration,
    batchProcessing,
    deviceManagement,
    sslFields,
    apiCalls,
    errorHandling
  };
}

console.log('✅ Test file loaded - ready for ElavonX extension testing');
console.log('🔍 This file contains:');
console.log('  - ProcessTransactionOnline endpoint');
console.log('  - Hosted Payments integration');
console.log('  - Checkout.js integration');
console.log('  - Batch processing');
console.log('  - Device management');
console.log('  - SSL fields variations');
console.log('  - API calls with different methods');
console.log('  - Error handling patterns');
