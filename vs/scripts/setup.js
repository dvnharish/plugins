#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up DevGuard development environment...\n');

// Install dependencies
console.log('📦 Installing dependencies...');
try {
    execSync('pnpm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

// Build all packages
console.log('🔨 Building all packages...');
try {
    execSync('pnpm build', { stdio: 'inherit' });
    console.log('✅ All packages built successfully\n');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

// Verify extension structure
console.log('🔍 Verifying extension structure...');
const extensionPackageJson = path.join(__dirname, '..', 'packages', 'extension', 'package.json');
const extensionDist = path.join(__dirname, '..', 'packages', 'extension', 'dist');

if (!fs.existsSync(extensionPackageJson)) {
    console.error('❌ Extension package.json not found');
    process.exit(1);
}

if (!fs.existsSync(extensionDist)) {
    console.error('❌ Extension dist folder not found');
    process.exit(1);
}

console.log('✅ Extension structure verified\n');

// Check demo project
console.log('📁 Checking demo project...');
const demoProject = path.join(__dirname, '..', 'demo-project');
const pomXml = path.join(demoProject, 'pom.xml');
const configYml = path.join(demoProject, 'devguard.config.yml');

if (!fs.existsSync(pomXml)) {
    console.error('❌ Demo project pom.xml not found');
    process.exit(1);
}

if (!fs.existsSync(configYml)) {
    console.error('❌ Demo project devguard.config.yml not found');
    process.exit(1);
}

console.log('✅ Demo project verified\n');

console.log('🎉 Setup completed successfully!\n');
console.log('📋 Next steps:');
console.log('1. Open VS Code in this directory');
console.log('2. Press F5 to launch the extension in development mode');
console.log('3. Open the demo-project folder in the new VS Code window');
console.log('4. Look for the DevGuard shield icon in the Activity Bar');
console.log('5. Click the icon and then "Scan Project" to see DevGuard in action!');
console.log('\n🔧 Development commands:');
console.log('- pnpm dev: Start development mode with file watching');
console.log('- pnpm test: Run all tests');
console.log('- pnpm lint: Run linting');
console.log('- pnpm clean: Clean all build artifacts');