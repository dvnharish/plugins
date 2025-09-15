# Converge-Elavon Migrator - Developer Guide

## Overview

The Converge-Elavon Migrator is a VS Code extension that helps developers migrate from Converge payment processing to Elavon's modern payment APIs. This guide provides comprehensive information for developers working on or extending the extension.

## Architecture

### Core Components

#### 1. Extension Manager (`src/core/ExtensionManager.ts`)
- **Purpose**: Orchestrates the entire extension lifecycle
- **Responsibilities**:
  - Initialize all services
  - Handle extension activation/deactivation
  - Manage configuration listeners
  - Perform startup scans

#### 2. Service Container (`src/core/ServiceContainer.ts`)
- **Purpose**: Dependency injection container
- **Responsibilities**:
  - Initialize all services
  - Provide service access
  - Manage service lifecycle

#### 3. Command Registry (`src/core/CommandRegistry.ts`)
- **Purpose**: Manages VS Code commands
- **Responsibilities**:
  - Register all extension commands
  - Handle command execution
  - Manage status bar items

#### 4. Panel Manager (`src/core/PanelManager.ts`)
- **Purpose**: Manages webview panels
- **Responsibilities**:
  - Initialize webview providers
  - Handle panel lifecycle

### Services

#### 1. Parser Service (`src/services/ParserService.ts`)
- **Purpose**: Parse code files to detect Converge endpoints
- **Key Methods**:
  - `scanWorkspace()`: Scan entire workspace
  - `parseFile()`: Parse individual files
  - `extractSSLFields()`: Extract SSL fields from code

#### 2. Migration Service (`src/services/MigrationService.ts`)
- **Purpose**: Handle endpoint migrations
- **Key Methods**:
  - `migrateEndpoint()`: Migrate single endpoint
  - `migrateEndpointsBulk()`: Migrate multiple endpoints
  - `rollbackMigration()`: Rollback a migration

#### 3. Error Handling Service (`src/services/ErrorHandlingService.ts`)
- **Purpose**: Centralized error handling and logging
- **Key Methods**:
  - `logError()`: Log errors with context
  - `getErrorStatistics()`: Get error statistics
  - `resolveError()`: Mark errors as resolved

#### 4. File Backup Service (`src/services/FileBackupService.ts`)
- **Purpose**: Manage file backups during migrations
- **Key Methods**:
  - `createBackup()`: Create file backup
  - `restoreFromBackup()`: Restore from backup
  - `cleanupOldBackups()`: Clean up old backups

#### 5. Logging Service (`src/services/LoggingService.ts`)
- **Purpose**: Detailed logging and performance monitoring
- **Key Methods**:
  - `log()`: Log messages with levels
  - `startPerformanceMonitoring()`: Start performance tracking
  - `getPerformanceStatistics()`: Get performance metrics

## Development Setup

### Prerequisites
- Node.js 16+
- VS Code 1.85+
- TypeScript 4.9+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd converge-elavon-migrator

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Watch for changes
npm run watch
```

### Project Structure
```
src/
├── core/                 # Core extension components
│   ├── ExtensionManager.ts
│   ├── ServiceContainer.ts
│   ├── CommandRegistry.ts
│   ├── PanelManager.ts
│   └── ConfigurationService.ts
├── services/             # Business logic services
│   ├── ParserService.ts
│   ├── MigrationService.ts
│   ├── ErrorHandlingService.ts
│   ├── FileBackupService.ts
│   ├── LoggingService.ts
│   └── ...
├── types/                # TypeScript type definitions
│   ├── ConvergeEndpoint.ts
│   ├── EndpointMapping.ts
│   ├── Credentials.ts
│   └── ValidationResult.ts
├── webview/              # Webview providers
│   ├── ScanPanelProvider.ts
│   ├── CredentialsPanelProvider.ts
│   └── ...
└── test/                 # Test files
    ├── services/
    ├── core/
    └── webview/
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- PatternMatchingService.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Structure
- **Unit Tests**: Test individual services and components
- **Integration Tests**: Test service interactions
- **End-to-End Tests**: Test complete workflows

### Test Coverage
- **Parser Service**: 95%+ coverage
- **Migration Service**: 90%+ coverage
- **Error Handling**: 85%+ coverage
- **File Backup**: 90%+ coverage

## Configuration

### Extension Settings
The extension supports extensive configuration through VS Code settings:

```json
{
  "converge-elavon.scanOnStartup": true,
  "converge-elavon.autoValidate": true,
  "converge-elavon.backupEnabled": true,
  "converge-elavon.logLevel": "info",
  "converge-elavon.confidenceThreshold": 0.7,
  "converge-elavon.ignorePatterns": [
    "node_modules/**",
    ".git/**",
    "dist/**"
  ]
}
```

### Configuration Categories
1. **Core Settings**: Basic extension behavior
2. **Backup Settings**: File backup configuration
3. **Logging Settings**: Logging and monitoring
4. **Migration Settings**: Migration behavior
5. **File Handling**: File scanning and processing
6. **Quality Settings**: Confidence thresholds
7. **Telemetry**: Usage analytics

## API Reference

### Parser Service API

#### `scanWorkspace(): Promise<ScanResult>`
Scans the entire workspace for Converge endpoints.

**Returns:**
```typescript
interface ScanResult {
  endpoints: ConvergeEndpoint[];
  totalFiles: number;
  scannedFiles: number;
  duration: number;
  errors: string[];
}
```

#### `parseFile(filePath: string): Promise<ConvergeEndpoint[]>`
Parses a single file for Converge endpoints.

**Parameters:**
- `filePath`: Path to the file to parse

**Returns:** Array of detected Converge endpoints

### Migration Service API

#### `migrateEndpoint(endpoint: ConvergeEndpoint, options?: MigrationOptions): Promise<MigrationResult>`
Migrates a single Converge endpoint to Elavon.

**Parameters:**
- `endpoint`: The Converge endpoint to migrate
- `options`: Migration options (optional)

**Returns:**
```typescript
interface MigrationResult {
  success: boolean;
  originalCode: string;
  migratedCode: string;
  diff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  validationResult?: any;
  error?: string;
  metadata: {
    endpointType: string;
    confidence: number;
    migrationTime: number;
    filePath: string;
    lineNumber: number;
  };
}
```

#### `migrateEndpointsBulk(endpoints: ConvergeEndpoint[], options?: BulkMigrationOptions): Promise<BulkMigrationResult>`
Migrates multiple Converge endpoints in bulk.

**Parameters:**
- `endpoints`: Array of Converge endpoints to migrate
- `options`: Bulk migration options (optional)

### Error Handling API

#### `logError(error: Error | string, options?: ErrorOptions): string`
Logs an error with context information.

**Parameters:**
- `error`: Error object or error message
- `options`: Error logging options (optional)

**Returns:** Unique error ID

#### `getErrorStatistics(): ErrorStatistics`
Gets comprehensive error statistics.

**Returns:**
```typescript
interface ErrorStatistics {
  totalErrors: number;
  errorsBySeverity: Map<ErrorSeverity, number>;
  errorsByCategory: Map<ErrorCategory, number>;
  recentErrors: ErrorEntry[];
  unresolvedErrors: ErrorEntry[];
  averageResolutionTime: number;
}
```

## Extension Commands

### Core Commands
- `converge-elavon.scanProject`: Scan workspace for Converge endpoints
- `converge-elavon.migrateEndpoint`: Migrate selected endpoint
- `converge-elavon.bulkMigrate`: Migrate multiple endpoints
- `converge-elavon.validateMigration`: Validate migrated code

### Management Commands
- `converge-elavon.showMigrationHistory`: View migration history
- `converge-elavon.rollbackMigration`: Rollback a migration
- `converge-elavon.showErrorLog`: View error log
- `converge-elavon.showConfiguration`: View current configuration

### Utility Commands
- `converge-elavon.exportMigrationHistory`: Export migration data
- `converge-elavon.importMigrationHistory`: Import migration data
- `converge-elavon.resetConfiguration`: Reset to defaults

## Webview Panels

### Scan Panel
- **Purpose**: Display scan results and manage scanning
- **Provider**: `ScanPanelProvider`
- **Features**: Real-time scanning, filtering, file navigation

### Credentials Panel
- **Purpose**: Manage Elavon API credentials
- **Provider**: `CredentialsPanelProvider`
- **Features**: Secure credential storage, validation

### Documentation Panel
- **Purpose**: Show migration documentation
- **Provider**: `DocumentationPanelProvider`
- **Features**: Interactive documentation, examples

### Migration Panel
- **Purpose**: Manage migration workflows
- **Provider**: `MigrationPanelProvider`
- **Features**: Migration progress, results, rollback

## Error Handling

### Error Categories
- **PARSING**: Code parsing errors
- **MIGRATION**: Migration process errors
- **VALIDATION**: Validation errors
- **CREDENTIALS**: Authentication errors
- **NETWORK**: Network communication errors
- **FILE_SYSTEM**: File operation errors
- **CONFIGURATION**: Configuration errors
- **USER_INPUT**: User input validation errors

### Error Severity Levels
- **INFO**: Informational messages
- **WARNING**: Warning conditions
- **ERROR**: Error conditions
- **CRITICAL**: Critical errors requiring immediate attention

### Error Context
Each error includes context information:
- File path and line number
- Endpoint type and migration ID
- Timestamp and session ID
- User agent and workspace root

## Performance Monitoring

### Metrics Tracked
- **Operation Duration**: Time taken for operations
- **Success Rate**: Percentage of successful operations
- **Memory Usage**: Memory consumption patterns
- **File Processing**: File scanning performance

### Performance Thresholds
- **File Scan**: < 100ms per file
- **Migration**: < 5s per endpoint
- **Bulk Migration**: < 30s for 100 endpoints
- **Memory Usage**: < 100MB for typical workspace

## Security Considerations

### Credential Management
- Credentials stored in VS Code Secret Storage
- No credentials logged or transmitted
- Automatic credential validation
- Secure credential clearing

### File Backup Security
- Backups stored in secure location
- File hash validation
- Automatic backup cleanup
- No sensitive data in backup metadata

### Error Logging Security
- No sensitive data in error logs
- Error context sanitization
- Secure error storage
- Optional error reporting

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Use meaningful variable names
- Add comprehensive JSDoc comments

### Testing Requirements
- Unit tests for all services
- Integration tests for workflows
- Error handling tests
- Performance tests for critical paths

### Pull Request Process
1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit pull request

## Troubleshooting

### Common Issues

#### Extension Not Activating
- Check VS Code version compatibility
- Verify Node.js version
- Check extension logs

#### Migration Failures
- Verify Elavon credentials
- Check endpoint mapping
- Review error logs
- Validate code format

#### Performance Issues
- Check file size limits
- Review ignore patterns
- Monitor memory usage
- Enable performance logging

### Debug Mode
Enable debug mode by setting:
```json
{
  "converge-elavon.logLevel": "debug"
}
```

### Log Locations
- **Extension Logs**: VS Code Developer Console
- **Error Logs**: Extension storage
- **Performance Logs**: Extension storage
- **Migration History**: Extension storage

## Future Enhancements

### Planned Features
- **Advanced Pattern Matching**: ML-based endpoint detection
- **Custom Migration Rules**: User-defined migration patterns
- **Team Collaboration**: Shared migration configurations
- **CI/CD Integration**: Automated migration in pipelines

### Extension Points
- **Custom Parsers**: Add support for new languages
- **Custom Validators**: Add custom validation logic
- **Custom Mappings**: Add custom endpoint mappings
- **Custom UI**: Add custom webview panels

## Support

### Documentation
- **User Guide**: `README.md`
- **API Reference**: This document
- **Configuration Guide**: `CONFIGURATION.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community discussions
- **Wiki**: Community-maintained documentation

### Professional Support
- **Enterprise Support**: Available for enterprise customers
- **Custom Development**: Custom features and integrations
- **Training**: Developer training and workshops
