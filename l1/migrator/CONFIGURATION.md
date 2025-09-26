# Dynamic Configuration System

The ElavonX Migrator now uses a dynamic configuration system instead of hardcoded patterns. This makes the extension more flexible and allows users to customize pattern matching for their specific needs.

## 🚀 Auto-Build Script

The extension now includes an auto-build script that automatically increments the version and builds the extension:

```bash
# Build with patch version increment (default)
npm run build

# Build with specific version increment
npm run build:patch    # 2.0.8 -> 2.0.9
npm run build:minor    # 2.0.8 -> 2.1.0
npm run build:major    # 2.0.8 -> 3.0.0

# Build without auto-installing
npm run build:no-install
```

## 📁 Configuration Files

### 1. Pattern Configuration (`config/patterns.json`)

This file contains all the patterns used for detecting Converge and Elavon endpoints:

```json
{
  "converge": {
    "endpoints": {
      "hostedPayments": ["/hosted-payments/transaction_token", "..."],
      "checkout": ["/Checkout.js", "..."],
      "processTransaction": ["/ProcessTransactionOnline\\b", "..."],
      "batchProcessing": ["/batch-processing", "..."],
      "deviceManagement": ["/NonElavonCertifiedDevice", "..."]
    },
    "sslFields": {
      "core": "ssl_[a-zA-Z_][a-zA-Z0-9_]*",
      "variations": ["SSL_[a-zA-Z_][a-zA-Z0-9_]*", "..."]
    },
    "urls": ["https?:\\/\\/[^\\s]*converge[^\\s]*", "..."],
    "apiCalls": ["fetch\\s*\\(\\s*[\"'][^\"']*converge[^\"']*[\"']", "..."]
  },
  "elavon": {
    // Similar structure for Elavon patterns
  },
  "supportedExtensions": [".js", ".ts", ".php", "..."],
  "ignorePatterns": ["**/node_modules/**", "..."],
  "maxFileSize": 1048576
}
```

### 2. TypeScript Configuration (`src/config/PatternConfig.ts`)

The TypeScript configuration manager that handles loading and managing patterns:

```typescript
import { PatternConfigManager } from '../config/PatternConfig';

const configManager = new PatternConfigManager();

// Load custom configuration
await configManager.loadFromFile('./custom-patterns.json');

// Update configuration
configManager.updateConfig({
  converge: {
    endpoints: {
      processTransaction: ['custom_pattern']
    }
  }
});
```

## 🔧 Dynamic Services

### 1. DynamicPatternMatchingService

The new dynamic pattern matching service that uses configuration instead of hardcoded patterns:

```typescript
import { DynamicPatternMatchingService } from './DynamicPatternMatchingService';

const matcher = new DynamicPatternMatchingService(configManager);

// Detect endpoints using dynamic patterns
const endpoints = matcher.detectEndpoints(code);

// Detect SSL fields
const sslFields = matcher.detectSslFields(code);

// Detect API URLs
const urls = matcher.detectApiUrls(code);
```

### 2. Updated ParserService

The ParserService now uses the dynamic configuration:

```typescript
import { ParserService } from './ParserService';
import { PatternConfigManager } from '../config/PatternConfig';

const configManager = new PatternConfigManager();
const parser = new ParserService(configManager);

// Load custom patterns
await parser.loadConfigFromFile('./custom-patterns.json');
```

## 🎯 Benefits of Dynamic Configuration

1. **No More Hardcoded Data**: All patterns are now configurable
2. **User Customization**: Users can add their own patterns
3. **Easy Updates**: Patterns can be updated without code changes
4. **Better Maintainability**: Centralized configuration management
5. **Auto-Versioning**: Build script automatically increments versions

## 📝 Adding Custom Patterns

To add custom patterns for your specific use case:

1. Copy `config/patterns.json` to `custom-patterns.json`
2. Modify the patterns as needed
3. Load the custom configuration:

```typescript
const configManager = new PatternConfigManager();
await configManager.loadFromFile('./custom-patterns.json');
```

## 🔄 Migration from Hardcoded Patterns

The old hardcoded patterns have been replaced with the dynamic system:

- ✅ `PatternMatchingService` → `DynamicPatternMatchingService`
- ✅ Hardcoded regex patterns → JSON configuration
- ✅ Static file extensions → Configurable extensions
- ✅ Fixed ignore patterns → Dynamic ignore patterns

## 🚀 Build Process

The new build process:

1. **Version Increment**: Automatically increments version in `package.json`
2. **Compilation**: Compiles TypeScript to JavaScript
3. **Packaging**: Creates `.vsix` file using `vsce`
4. **Installation**: Automatically installs the extension (optional)

## 📊 Version Management

The build script supports semantic versioning:

- **Patch** (2.0.8 → 2.0.9): Bug fixes, small improvements
- **Minor** (2.0.8 → 2.1.0): New features, backward compatible
- **Major** (2.0.8 → 3.0.0): Breaking changes, major updates

## 🎉 Result

The extension is now fully dynamic and configurable, with no hardcoded data. Users can customize patterns, file extensions, and ignore patterns to match their specific needs. The auto-build script makes development and deployment much easier.
