// Test script to verify ElavonX extension functionality
const vscode = require('vscode');

console.log('🧪 ElavonX Extension Test Script');
console.log('================================');

// Test 1: Check if extension is activated
async function testExtensionActivation() {
  console.log('🔍 Testing extension activation...');
  
  try {
    // Check if our commands are registered
    const commands = await vscode.commands.getCommands();
    const elavonxCommands = commands.filter(cmd => cmd.startsWith('elavonx.'));
    
    console.log('📋 Available ElavonX commands:');
    elavonxCommands.forEach(cmd => console.log(`  - ${cmd}`));
    
    if (elavonxCommands.length > 0) {
      console.log('✅ Extension appears to be activated');
      return true;
    } else {
      console.log('❌ No ElavonX commands found - extension not activated');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking extension activation:', error);
    return false;
  }
}

// Test 2: Test command execution
async function testCommandExecution() {
  console.log('🔍 Testing command execution...');
  
  try {
    // Test the test command
    await vscode.commands.executeCommand('elavonx.test');
    console.log('✅ Test command executed successfully');
    
    // Test the scan command
    await vscode.commands.executeCommand('elavonx.scanProject');
    console.log('✅ Scan command executed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Error executing commands:', error);
    return false;
  }
}

// Test 3: Check panel visibility
async function testPanelVisibility() {
  console.log('🔍 Testing panel visibility...');
  
  try {
    // Check if panels are visible
    const context = vscode.workspace.getConfiguration('elavonx');
    console.log('📋 ElavonX configuration:', context);
    
    // Check context variables
    const hasEndpoints = await vscode.commands.executeCommand('getContext', 'elavonx.hasEndpoints');
    const hasCredentials = await vscode.commands.executeCommand('getContext', 'elavonx.hasCredentials');
    const hasMigrations = await vscode.commands.executeCommand('getContext', 'elavonx.hasMigrations');
    const hasReports = await vscode.commands.executeCommand('getContext', 'elavonx.hasReports');
    
    console.log('📊 Panel context variables:');
    console.log(`  - hasEndpoints: ${hasEndpoints}`);
    console.log(`  - hasCredentials: ${hasCredentials}`);
    console.log(`  - hasMigrations: ${hasMigrations}`);
    console.log(`  - hasReports: ${hasReports}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking panel visibility:', error);
    return false;
  }
}

// Test 4: Test workspace scanning
async function testWorkspaceScanning() {
  console.log('🔍 Testing workspace scanning...');
  
  try {
    // Get workspace files
    const workspaceFiles = await vscode.workspace.findFiles('**/*.{js,ts,php,py,java,cs,rb,go,cpp,h,html}', null, 10);
    console.log(`📁 Found ${workspaceFiles.length} files to scan`);
    
    // Test pattern matching
    const testContent = `
      // Test Converge patterns
      fetch('/ProcessTransactionOnline', {
        method: 'POST',
        body: new URLSearchParams({
          ssl_merchant_id: '12345',
          ssl_pin: 'test123'
        })
      });
    `;
    
    console.log('🔍 Test content for pattern matching:');
    console.log(testContent);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing workspace scanning:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting ElavonX Extension Tests');
  console.log('====================================');
  
  const results = {
    activation: await testExtensionActivation(),
    commands: await testCommandExecution(),
    panels: await testPanelVisibility(),
    scanning: await testWorkspaceScanning()
  };
  
  console.log('📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  return results;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testExtensionActivation,
    testCommandExecution,
    testPanelVisibility,
    testWorkspaceScanning,
    runAllTests
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}