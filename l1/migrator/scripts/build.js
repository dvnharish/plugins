#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Auto-increment version and build script
 */

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function updateVersion(newVersion) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Version updated to ${newVersion}`);
}

function buildExtension() {
  console.log('🔨 Building extension...');
  
  try {
    // Compile TypeScript
    execSync('npm run compile', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed');
    
    // Package extension
    execSync('npx vsce package', { stdio: 'inherit' });
    console.log('✅ Extension packaged successfully');
    
    // Get the generated .vsix file
    const files = fs.readdirSync(__dirname + '/..');
    const vsixFile = files.find(file => file.endsWith('.vsix'));
    
    if (vsixFile) {
      console.log(`📦 Extension packaged: ${vsixFile}`);
      return vsixFile;
    } else {
      throw new Error('No .vsix file found after packaging');
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function installExtension(vsixFile) {
  console.log('📥 Installing extension...');
  
  try {
    execSync(`code --uninstall-extension elavonx.elavonx`, { stdio: 'inherit' });
    execSync(`code --install-extension ${vsixFile}`, { stdio: 'inherit' });
    console.log('✅ Extension installed successfully');
  } catch (error) {
    console.warn('⚠️  Installation failed:', error.message);
    console.log('You may need to install manually:');
    console.log(`code --install-extension ${vsixFile}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // major, minor, or patch
  const skipInstall = args.includes('--no-install');
  
  console.log('🚀 ElavonX Auto-Build Script');
  console.log('============================');
  
  // Get current version
  const currentVersion = getCurrentVersion();
  console.log(`📋 Current version: ${currentVersion}`);
  
  // Increment version
  const newVersion = incrementVersion(currentVersion, versionType);
  console.log(`📈 New version: ${newVersion} (${versionType})`);
  
  // Update package.json
  updateVersion(newVersion);
  
  // Build extension
  const vsixFile = buildExtension();
  
  // Install extension (unless skipped)
  if (!skipInstall) {
    installExtension(vsixFile);
  }
  
  console.log('🎉 Build completed successfully!');
  console.log(`📦 Extension: ${vsixFile}`);
  console.log(`🔢 Version: ${newVersion}`);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  incrementVersion,
  updateVersion,
  buildExtension,
  installExtension
};
