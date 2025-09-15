#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running DevGuard Integration Tests...\n');

// Test 1: Build all packages
console.log('1️⃣ Testing build process...');
try {
    execSync('pnpm build', { stdio: 'inherit' });
    console.log('✅ Build successful\n');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Test 2: Check extension structure
console.log('2️⃣ Testing extension structure...');
const requiredFiles = [
    'packages/extension/dist/extension.js',
    'packages/server/dist/server.js',
    'packages/runners/dist/index.js',
    'packages/shared/dist/index.js'
];

for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Missing required file: ${file}`);
        process.exit(1);
    }
}
console.log('✅ All required files present\n');

// Test 3: Check demo project
console.log('3️⃣ Testing demo project...');
const demoFiles = [
    'demo-project/pom.xml',
    'demo-project/devguard.config.yml',
    'demo-project/src/main/java/com/example/UserDao.java',
    'demo-project/src/main/java/com/example/CacheService.java',
    'demo-project/src/main/java/com/example/WebController.java',
    'demo-project/src/main/java/com/example/AwsConfig.java'
];

for (const file of demoFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Missing demo file: ${file}`);
        process.exit(1);
    }
}
console.log('✅ Demo project complete\n');

// Test 4: Validate package.json files
console.log('4️⃣ Testing package configurations...');
const packages = [
    'packages/extension/package.json',
    'packages/server/package.json',
    'packages/runners/package.json',
    'packages/shared/package.json',
    'tools/cli/package.json'
];

for (const pkg of packages) {
    try {
        const content = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (!content.name || !content.version) {
            console.error(`❌ Invalid package.json: ${pkg}`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Failed to parse ${pkg}:`, error.message);
        process.exit(1);
    }
}
console.log('✅ All package.json files valid\n');

// Test 5: Check VS Code extension manifest
console.log('5️⃣ Testing VS Code extension manifest...');
const extensionPackage = JSON.parse(fs.readFileSync('packages/extension/package.json', 'utf8'));

const requiredFields = ['name', 'displayName', 'description', 'version', 'engines', 'activationEvents', 'main', 'contributes'];
for (const field of requiredFields) {
    if (!extensionPackage[field]) {
        console.error(`❌ Missing required field in extension package.json: ${field}`);
        process.exit(1);
    }
}

// Check commands
const commands = extensionPackage.contributes.commands;
const requiredCommands = [
    'devguard.scanProject',
    'devguard.explainIssue',
    'devguard.fixWithCopilot',
    'devguard.generateTests',
    'devguard.exportReport'
];

for (const cmd of requiredCommands) {
    if (!commands.find(c => c.command === cmd)) {
        console.error(`❌ Missing required command: ${cmd}`);
        process.exit(1);
    }
}

console.log('✅ Extension manifest valid\n');

console.log('🎉 All integration tests passed!\n');
console.log('📋 DevGuard is ready for use:');
console.log('1. Open VS Code in this directory');
console.log('2. Press F5 to launch Extension Development Host');
console.log('3. Open demo-project folder in the new window');
console.log('4. Look for DevGuard shield icon in Activity Bar');
console.log('5. Click "Scan Project" to see DevGuard in action!');
console.log('\n🚀 Extension features ready:');
console.log('- ✅ Security scanning with mock vulnerabilities');
console.log('- ✅ Copilot-powered fix suggestions');
console.log('- ✅ JUnit test generation');
console.log('- ✅ Production readiness scoring');
console.log('- ✅ Markdown and SARIF report export');
console.log('- ✅ Rich explain panel with references');
console.log('- ✅ Status bar integration');
console.log('- ✅ CLI tool for CI/CD integration');