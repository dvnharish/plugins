#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building DevGuard...\n');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
    execSync('pnpm clean', { stdio: 'inherit' });
} catch (error) {
    console.warn('Warning: Clean command failed:', error.message);
}

// Build shared package first
console.log('📦 Building shared package...');
execSync('cd packages/shared && pnpm build', { stdio: 'inherit' });

// Build runners package
console.log('🔧 Building runners package...');
execSync('cd packages/runners && pnpm build', { stdio: 'inherit' });

// Build server package
console.log('🖥️ Building server package...');
execSync('cd packages/server && pnpm build', { stdio: 'inherit' });

// Build extension package
console.log('🔌 Building extension package...');
execSync('cd packages/extension && pnpm build', { stdio: 'inherit' });

// Build CLI tool (skipped for now)
console.log('⚡ Skipping CLI tool build...');

console.log('\n✅ Build completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Open VS Code');
console.log('2. Press F5 to run the extension in development mode');
console.log('3. Open the demo-project folder');
console.log('4. Click the DevGuard icon in the Activity Bar');
console.log('5. Click "Scan Project" to see DevGuard in action!');
