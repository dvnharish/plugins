// Test file for ElavonX Migrator extension
// This file contains Converge API patterns to test the extension

// Converge ProcessTransactionOnline endpoint
const response = await fetch('/ProcessTransactionOnline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ssl_merchant_id: '12345',
    ssl_pin: 'test123',
    ssl_transaction_type: 'ccsale',
    ssl_amount: '10.00',
    ssl_card_number: '4111111111111111',
    ssl_exp_date: '1225'
  })
});

// Converge hosted payments
const hostedPaymentUrl = 'https://api.converge.com/hosted-payments/transaction_token';

// Converge checkout
const checkoutScript = 'https://api.converge.com/Checkout.js';

console.log('Converge API test file');
