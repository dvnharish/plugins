#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing DevGuard Extension Loading...\n');

// Check if extension files exist
const extensionPath = path.join(__dirname, 'packages', 'extension');
const distPath = path.join(extensionPath, 'dist');
const packageJsonPath = path.join(extensionPath, 'package.json');

console.log('📁 Checking extension files...');
console.log(`Extension path: ${extensionPath}`);
console.log(`Dist path: ${distPath}`);
console.log(`Package.json: ${packageJsonPath}`);

if (!fs.existsSync(distPath)) {
    console.error('❌ Extension dist folder not found');
    process.exit(1);
}

if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Extension package.json not found');
    process.exit(1);
}

console.log('✅ Extension files found');

// Check main extension file
const mainFile = path.join(distPath, 'extension.js');
if (!fs.existsSync(mainFile)) {
    console.error('❌ Main extension file not found');
    process.exit(1);
}

console.log('✅ Main extension file found');

// Check package.json content
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('\n📋 Extension details:');
console.log(`   Name: ${packageJson.displayName}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Main: ${packageJson.main}`);
console.log(`   Activation: ${packageJson.activationEvents}`);

// Check Activity Bar configuration
if (packageJson.contributes && packageJson.contributes.viewsContainers) {
    const activityBar = packageJson.contributes.viewsContainers.activitybar;
    if (activityBar && activityBar.length > 0) {
        console.log('✅ Activity Bar configuration found');
        console.log(`   Container ID: ${activityBar[0].id}`);
        console.log(`   Title: ${activityBar[0].title}`);
        console.log(`   Icon: ${activityBar[0].icon}`);
    } else {
        console.error('❌ Activity Bar configuration not found');
    }
}

console.log('\n🚀 To launch DevGuard:');
console.log('1. In VS Code, press Cmd+Shift+P');
console.log('2. Type "Debug: Start Debugging"');
console.log('3. Select "Debug DevGuard Extension"');
console.log('4. Look for 🛡️ shield icon in Activity Bar');

console.log('\n🔧 Alternative launch command:');
console.log(`code --extensionDevelopmentPath="${extensionPath}" demo-project`);