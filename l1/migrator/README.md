# Converge to Elavon Migrator

A VS Code extension that automates the migration of legacy Converge APIs (REST + XML) to modern Elavon APIs (REST + JSON) with AI assistance.

## Features

- 🔍 **Project Scanning**: Automatically detect Converge endpoints in your codebase
- 🤖 **AI-Powered Migration**: Use GitHub Copilot to generate Elavon-compliant code
- 🔐 **Secure Credentials**: Store Elavon API keys securely using VS Code Secret Storage
- 📚 **Documentation**: Side-by-side API documentation and mapping reference
- ✅ **Validation**: Test migrations against Elavon sandbox environment
- 🔄 **Bulk Operations**: Migrate multiple endpoints efficiently
- 📝 **Diff Preview**: Review changes before applying migrations
- ↩️ **Rollback**: Undo migrations with full rollback support

## Supported Converge Endpoints

- `/hosted-payments/transaction_token` → `/transactions`
- `/Checkout.js` → `/payment-sessions`
- `/ProcessTransactionOnline` → `/orders`
- `/batch-processing` → `/batches`
- `/NonElavonCertifiedDevice` → `/terminals`

## Installation

1. Install from VS Code Marketplace (coming soon)
2. Or install from VSIX file

## Quick Start

1. Open a project containing Converge API code
2. Run "Scan Project for Converge Endpoints" from Command Palette
3. Configure your Elavon credentials in the Credentials panel
4. Right-click on detected endpoints and select "Migrate to Elavon"
5. Review the generated code and apply the migration

## Requirements

- VS Code 1.85.0 or higher
- GitHub Copilot extension (for AI-assisted migrations)
- Node.js project with Converge API integration

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run compile
```

### Test

```bash
npm test
```

### Package

```bash
npm run package
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.