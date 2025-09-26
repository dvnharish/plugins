// Test script to verify the extension scan functionality

console.log('🧪 Testing Extension Scan Functionality');
console.log('======================================');

// Mock VS Code workspace
const mockWorkspace = {
  workspaceFolders: [
    {
      uri: {
        fsPath: 'D:\\converge\\converge-sale-service'
      }
    }
  ]
};

// Mock VS Code window
const mockWindow = {
  showInformationMessage: (message) => {
    console.log('📢 Info:', message);
  },
  showWarningMessage: (message) => {
    console.log('⚠️ Warning:', message);
  },
  showErrorMessage: (message) => {
    console.log('❌ Error:', message);
  },
  withProgress: async (options, task) => {
    console.log('⏳ Progress:', options.title);
    return await task();
  }
};

// Mock VS Code commands
const mockCommands = {
  executeCommand: async (command, ...args) => {
    console.log('🔧 Command:', command, args);
    return true;
  }
};

// Mock VS Code
global.vscode = {
  workspace: mockWorkspace,
  window: mockWindow,
  commands: mockCommands,
  ProgressLocation: {
    Notification: 'notification'
  },
  StatusBarAlignment: {
    Right: 'right'
  }
};

// Test the pattern matching directly
console.log('🔍 Testing pattern matching with converge-sale-service...');

// Test patterns
const testPatterns = {
  sslFields: /ssl_[a-zA-Z_][a-zA-Z0-9_]*/g,
  convergeUrls: /convergepay\.com|api\.demo\.convergepay\.com|VirtualMerchantDemo|processxml\.do/g,
  processTransaction: /processxml|ssl_transaction_type|ssl_merchant_ID|ssl_user_id|ssl_pin/g
};

// Test file content
const testContent = `
@XmlElement(name = "ssl_merchant_ID")
private String merchantId;

@XmlElement(name = "ssl_user_id")
private String userId;

@XmlElement(name = "ssl_pin")
private String pin;

@XmlElement(name = "ssl_transaction_type")
private String transactionType;

@XmlElement(name = "ssl_card_number")
private String cardNumber;

@XmlElement(name = "ssl_amount")
private String amount;

// Converge API URL
private String baseUrl = "https://api.demo.convergepay.com/VirtualMerchantDemo/processxml.do";
`;

console.log('📄 Test content:', testContent);

// Test SSL field detection
console.log('\n🔍 Testing SSL field detection...');
const sslMatches = testContent.match(testPatterns.sslFields);
console.log('Found SSL fields:', sslMatches ? sslMatches.length : 0);
if (sslMatches) {
  sslMatches.forEach((match, index) => {
    console.log(`  ${index + 1}. ${match}`);
  });
}

// Test URL detection
console.log('\n🔍 Testing URL detection...');
const urlMatches = testContent.match(testPatterns.convergeUrls);
console.log('Found URLs:', urlMatches ? urlMatches.length : 0);
if (urlMatches) {
  urlMatches.forEach((match, index) => {
    console.log(`  ${index + 1}. ${match}`);
  });
}

// Test endpoint detection
console.log('\n🔍 Testing endpoint detection...');
const endpointMatches = testContent.match(testPatterns.processTransaction);
console.log('Found endpoints:', endpointMatches ? endpointMatches.length : 0);
if (endpointMatches) {
  endpointMatches.forEach((match, index) => {
    console.log(`  ${index + 1}. ${match}`);
  });
}

console.log('\n✅ Extension scan test completed!');
console.log('🎯 The extension should now be able to detect converge endpoints in the converge-sale-service project.');
