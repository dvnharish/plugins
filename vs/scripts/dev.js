#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DevGuard in development mode...\n');

// Start the extension in watch mode
const extensionProcess = spawn('pnpm', ['dev'], {
    cwd: path.join(__dirname, '..', 'packages', 'extension'),
    stdio: 'inherit',
    shell: true
});

// Start the server in watch mode
const serverProcess = spawn('pnpm', ['dev'], {
    cwd: path.join(__dirname, '..', 'packages', 'server'),
    stdio: 'inherit',
    shell: true
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping development servers...');
    extensionProcess.kill();
    serverProcess.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping development servers...');
    extensionProcess.kill();
    serverProcess.kill();
    process.exit(0);
});

console.log('✅ Development servers started!');
console.log('📋 Next steps:');
console.log('1. Open VS Code');
console.log('2. Press F5 to run the extension');
console.log('3. Open the demo-project folder');
console.log('4. Test DevGuard features');
console.log('\nPress Ctrl+C to stop the development servers.');
