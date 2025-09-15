#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Packaging DevGuard extension...\n');

// Ensure build is up to date
console.log('🔨 Building project...');
execSync('node scripts/build.js', { stdio: 'inherit' });

// Package the extension
console.log('📦 Creating VSIX package...');
try {
    execSync('cd packages/extension && pnpm package', { stdio: 'inherit' });
    console.log('✅ Extension packaged successfully!');
    
    // Find the generated .vsix file
    const extensionDir = path.join(__dirname, '..', 'packages', 'extension');
    const files = fs.readdirSync(extensionDir);
    const vsixFile = files.find(file => file.endsWith('.vsix'));
    
    if (vsixFile) {
        const vsixPath = path.join(extensionDir, vsixFile);
        const targetPath = path.join(__dirname, '..', 'dist', vsixFile);
        
        // Create dist directory if it doesn't exist
        if (!fs.existsSync(path.dirname(targetPath))) {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        }
        
        // Copy the .vsix file to dist directory
        fs.copyFileSync(vsixPath, targetPath);
        console.log(`📁 Package created: ${targetPath}`);
    }
} catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
}

console.log('\n🎉 DevGuard extension is ready for distribution!');
console.log('\n📋 Installation:');
console.log('1. Install the .vsix file in VS Code:');
console.log('   - Open VS Code');
console.log('   - Go to Extensions (Ctrl+Shift+X)');
console.log('   - Click "..." menu → "Install from VSIX..."');
console.log('   - Select the generated .vsix file');
console.log('\n2. Or publish to VS Code Marketplace:');
console.log('   - Run: cd packages/extension && pnpm publish');
