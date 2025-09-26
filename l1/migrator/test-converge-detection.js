// Test script to verify converge endpoint detection
const fs = require('fs');
const path = require('path');

// Import the pattern matching service
const { DynamicPatternMatchingService } = require('./out/services/DynamicPatternMatchingService');
const { PatternConfigManager } = require('./out/config/PatternConfig');

console.log('🧪 Testing Converge Endpoint Detection');
console.log('=====================================');

// Initialize pattern matching service
const configManager = new PatternConfigManager();
const patternMatcher = new DynamicPatternMatchingService(configManager);

// Test file path
const testFilePath = 'D:\\converge\\converge-sale-service\\src\\main\\java\\com\\example\\converge\\dto\\xml\\ConvergeSaleXmlRequest.java';

console.log('📁 Testing file:', testFilePath);

try {
  // Read the test file
  const content = fs.readFileSync(testFilePath, 'utf8');
  console.log('📄 File content length:', content.length);
  
  // Test endpoint detection
  console.log('\n🔍 Testing endpoint detection...');
  const endpoints = patternMatcher.detectEndpoints(content);
  console.log('Found endpoints:', endpoints.length);
  endpoints.forEach((endpoint, index) => {
    console.log(`  ${index + 1}. Type: ${endpoint.type}, Line: ${endpoint.lineNumber}, Match: ${endpoint.match}`);
  });
  
  // Test SSL field detection
  console.log('\n🔍 Testing SSL field detection...');
  const sslFields = patternMatcher.detectSslFields(content);
  console.log('Found SSL fields:', sslFields.length);
  sslFields.forEach((field, index) => {
    console.log(`  ${index + 1}. Field: ${field.field}, Line: ${field.lineNumber}`);
  });
  
  // Test URL detection
  console.log('\n🔍 Testing URL detection...');
  const urls = patternMatcher.detectApiUrls(content);
  console.log('Found URLs:', urls.length);
  urls.forEach((url, index) => {
    console.log(`  ${index + 1}. URL: ${url.url}, Type: ${url.type}, Line: ${url.lineNumber}`);
  });
  
  // Test API call detection
  console.log('\n🔍 Testing API call detection...');
  const apiCalls = patternMatcher.detectApiCalls(content);
  console.log('Found API calls:', apiCalls.length);
  apiCalls.forEach((call, index) => {
    console.log(`  ${index + 1}. Call: ${call.call}, Method: ${call.method}, Line: ${call.lineNumber}`);
  });
  
  console.log('\n✅ Detection test completed!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
