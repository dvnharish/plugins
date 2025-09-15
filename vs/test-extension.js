#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing DevGuard Extension...\n');

// Check if extension files exist
const extensionPath = path.join(__dirname, 'packages', 'extension');
const distPath = path.join(extensionPath, 'dist');
const packageJsonPath = path.join(extensionPath, 'package.json');

console.log('📁 Checking extension files...');

if (!fs.existsSync(distPath)) {
    console.error('❌ Extension dist folder not found. Run "pnpm build" first.');
    process.exit(1);
}

if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Extension package.json not found.');
    process.exit(1);
}

console.log('✅ Extension files found');

// Check if main extension file exists
const mainFile = path.join(distPath, 'extension.js');
if (!fs.existsSync(mainFile)) {
    console.error('❌ Main extension file not found.');
    process.exit(1);
}

console.log('✅ Main extension file found');

// Check package.json content
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📋 Extension details:');
console.log(`   Name: ${packageJson.displayName}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Publisher: ${packageJson.publisher}`);

// Check if Activity Bar configuration exists
if (packageJson.contributes && packageJson.contributes.viewsContainers) {
    const activityBar = packageJson.contributes.viewsContainers.activitybar;
    if (activityBar && activityBar.length > 0) {
        console.log('✅ Activity Bar configuration found');
        console.log(`   Container ID: ${activityBar[0].id}`);
        console.log(`   Title: ${activityBar[0].title}`);
        console.log(`   Icon: ${activityBar[0].icon}`);
    } else {
        console.error('❌ Activity Bar configuration not found');
        process.exit(1);
    }
} else {
    console.error('❌ Views containers configuration not found');
    process.exit(1);
}

// Check if views are configured
if (packageJson.contributes && packageJson.contributes.views) {
    const views = packageJson.contributes.views;
    if (views.devguard && views.devguard.length > 0) {
        console.log('✅ DevGuard views configured');
        console.log(`   View ID: ${views.devguard[0].id}`);
        console.log(`   View Name: ${views.devguard[0].name}`);
    } else {
        console.error('❌ DevGuard views not configured');
        process.exit(1);
    }
} else {
    console.error('❌ Views configuration not found');
    process.exit(1);
}

// Check if commands are configured
if (packageJson.contributes && packageJson.contributes.commands) {
    const commands = packageJson.contributes.commands;
    console.log(`✅ ${commands.length} commands configured`);
    
    const requiredCommands = [
        'devguard.scanProject',
        'devguard.explainIssue',
        'devguard.fixWithCopilot',
        'devguard.generateTests',
        'devguard.exportReport'
    ];
    
    for (const cmd of requiredCommands) {
        const found = commands.find(c => c.command === cmd);
        if (found) {
            console.log(`   ✅ ${cmd}: ${found.title}`);
        } else {
            console.log(`   ❌ ${cmd}: Missing`);
        }
    }
} else {
    console.error('❌ Commands configuration not found');
    process.exit(1);
}

console.log('\n🎉 Extension configuration looks good!');
console.log('\n📋 Next steps:');
console.log('1. Open VS Code');
console.log('2. Press F5 to run the extension in development mode');
console.log('3. Open the demo-project folder');
console.log('4. Look for the DevGuard icon (shield) in the Activity Bar');
console.log('5. Click the DevGuard icon to open the panel');
console.log('6. Click "Scan Project" to test the functionality');

console.log('\n🔧 Manual verification:');
console.log('- The DevGuard icon should appear in the Activity Bar (left sidebar)');
console.log('- The icon should be a shield symbol');
console.log('- Clicking it should open the DevGuard panel');
console.log('- The panel should show "📊 Readiness Score" and category buttons');

