# DevGuard

A VS Code extension that ensures developers write **production-ready code** by surfacing bugs, security risks, OSS vulnerabilities, secrets, and concurrency problems, **fixing them automatically via Copilot**, generating tests, and producing a **Production Readiness Score** with PR-friendly reports.

## 🚀 Features

- **🔍 Comprehensive Scanning**: Security, OSS dependencies, secrets, concurrency, tests, and style issues
- **🤖 AI-Powered Fixes**: Automatic code fixes using GitHub Copilot integration
- **📊 Production Readiness Score**: Real-time scoring based on code quality metrics
- **🧪 Test Generation**: Auto-generate JUnit tests with proper patterns
- **📋 Rich Reporting**: Markdown and SARIF reports for PR reviews
- **⚡ Real-time Analysis**: Instant feedback as you code
- **🔧 Configurable**: Customize rules, thresholds, and behavior

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "DevGuard"
4. Click Install

### From Source

```bash
git clone https://github.com/your-org/devguard
cd devguard
pnpm install
pnpm build
```

## 🎯 Quick Start

### Development Setup

1. **Clone and setup**:
   ```bash
   git clone https://github.com/your-org/devguard
   cd devguard
   pnpm setup
   ```

2. **Launch extension**:
   - Open this directory in VS Code
   - Press `F5` to launch Extension Development Host
   - Open the `demo-project` folder in the new window

3. **Try DevGuard**:
   - Look for the shield icon (🛡️) in the Activity Bar
   - Click it to open the DevGuard panel
   - Click "▶️ Scan Project" to run analysis
   - Explore the issues found in the demo project

### Using DevGuard

1. **Open a Java project** in VS Code
2. **Click the DevGuard icon** in the Activity Bar
3. **Click "Scan Project"** to run analysis
4. **Review issues** in the categorized tree view
5. **Right-click issues** to explain, fix, or generate tests
6. **Export reports** for PR reviews

## 🔧 Configuration

Create a `devguard.config.yml` file in your project root:

```yaml
copilot:
  applyFix: auto # auto | preview | ask

policy:
  minScore: 75

sca:
  allowLicenses: ["Apache-2.0", "MIT", "BSD-3-Clause"]

reports:
  formats: [markdown, sarif]

scanners:
  spotbugs:
    enabled: true
  pmd:
    enabled: true
  semgrep:
    enabled: true
  gitleaks:
    enabled: true
  dependencyCheck:
    enabled: true
```

## 🛠️ CLI Usage

Install the CLI globally:

```bash
npm install -g devguard-cli
```

### Scan a project

```bash
devguard scan --path /path/to/project --output markdown
```

### Generate configuration

```bash
devguard config --init
```

## 📊 Supported Scanners

| Scanner | Purpose | Category |
|---------|---------|----------|
| **SpotBugs** | Bug detection | Security, Concurrency |
| **PMD** | Code quality | Style, Security |
| **Semgrep** | Security patterns | Security |
| **Gitleaks** | Secret detection | Secrets |
| **OWASP Dependency-Check** | Vulnerability scanning | OSS |
| **JaCoCo** | Test coverage | Tests |

## 🎨 UI Components

### Tree View
- **📊 Readiness Score**: Overall project health
- **🔒 Security**: Security vulnerabilities
- **📦 OSS**: Dependency issues
- **🔑 Secrets**: Exposed credentials
- **🔀 Concurrency**: Thread safety issues
- **🧪 Tests**: Test coverage and quality
- **🎨 Style**: Code style and maintainability

### Explain Panel
- Issue details and context
- Remediation guidance
- Reference links
- One-click fixes

## 🔄 Workflow

1. **Scan** → Run comprehensive analysis
2. **Review** → Browse issues by category
3. **Explain** → Understand issue details
4. **Fix** → Apply automatic fixes
5. **Test** → Generate unit tests
6. **Report** → Export for PR reviews

## 🧪 Demo Project

A sample Java project with intentional issues is included in `demo-project/`:

```bash
cd demo-project
mvn compile
# Open in VS Code and run DevGuard scan
```

## 📈 Production Readiness Score

The score (0-100) is calculated based on:

- **Security Issues**: 30% weight
- **Test Coverage**: 20% weight
- **Code Style**: 10% weight
- **Maintainability**: 10% weight
- **OSS Dependencies**: 15% weight
- **Secrets**: 15% weight
- **Concurrency**: 10% weight

## 🔒 Security

- **Offline-first**: All analysis runs locally
- **Privacy-focused**: Code never leaves your machine
- **Configurable**: Control what data is shared
- **Auditable**: Open source and transparent

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/devguard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/devguard/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/devguard/wiki)

## 🗺️ Roadmap

- [ ] Kotlin/Scala support
- [ ] Team dashboard
- [ ] Mutation testing
- [ ] AI Reviewer Mode
- [ ] IDE integrations (IntelliJ, Eclipse)
- [ ] CI/CD integration

---

Made with ❤️ by the DevGuard team
