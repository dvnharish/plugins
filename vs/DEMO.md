# 🎯 DevGuard Demo Guide

This guide walks you through demonstrating DevGuard's complete functionality.

## 🚀 Quick Demo Setup

1. **Setup DevGuard**:
   ```bash
   pnpm setup
   ```

2. **Launch Extension**:
   - Open VS Code in this directory
   - Press `F5` to launch Extension Development Host
   - Open `demo-project` folder in the new window

3. **Start Demo**:
   - Look for the shield icon (🛡️) in the Activity Bar
   - Click it to open DevGuard panel

## 📋 Demo Script

### Part 1: Project Scanning (2 minutes)

1. **Show the DevGuard Panel**:
   - Point out the categories: Security, OSS, Secrets, etc.
   - Show the readiness score placeholder

2. **Run Initial Scan**:
   - Click "▶️ Scan Project" button
   - Watch status bar change to "Scanning..."
   - Show scan completion with score

3. **Explore Results**:
   - Expand Security category (4 critical/high issues)
   - Expand Secrets category (4 exposed credentials)
   - Show issue counts with severity icons

### Part 2: Issue Investigation (3 minutes)

1. **Select SQL Injection Issue**:
   - Click on "SQL_INJECTION" in Security category
   - File opens at exact line (UserDao.java:18)
   - Show vulnerable code with string concatenation

2. **Open Explain Panel**:
   - Right-click issue → "Explain Issue"
   - Show rich issue details:
     - Severity and category
     - Production impact explanation
     - OWASP/CWE references
     - Remediation guidance

3. **Demonstrate Navigation**:
   - Click file location to jump to code
   - Show multiple issues in same file

### Part 3: Automated Fixes (3 minutes)

1. **Fix SQL Injection**:
   - Click "✅ Fix with Copilot" in explain panel
   - Show intelligent fix applied (PreparedStatement)
   - Demonstrate undo functionality

2. **Fix Concurrency Issue**:
   - Navigate to CacheService.java
   - Show HashMap → ConcurrentHashMap fix
   - Show diff view

3. **Fix Hardcoded Secret**:
   - Show password replacement with environment variable
   - Demonstrate different fix patterns

### Part 4: Test Generation (2 minutes)

1. **Generate Tests**:
   - Right-click UserDao.java → "Generate JUnit Tests"
   - Show test file creation in src/test/java
   - Point out JUnit5, Mockito, AAA pattern

2. **Show Test Structure**:
   - Test methods for each public method
   - Edge case and null input tests
   - TestDataBuilder pattern

### Part 5: Reporting (2 minutes)

1. **Export Report**:
   - Click "Export Report" command
   - Choose Markdown format
   - Show generated report with:
     - Executive summary with score
     - Issues grouped by category
     - Top priority fixes
     - Scanner performance metrics

2. **Show SARIF Export**:
   - Mention GitHub Code Scanning integration
   - Show structured security findings

## 🎨 Key Demo Points

### Visual Elements
- **Severity Icons**: 🔴🟠🟡🔵⚪ for immediate impact assessment
- **Category Icons**: 🔒📦🔑🔀🧪🎨 for quick categorization
- **Status Bar**: Real-time score updates during scanning
- **Rich Webview**: Professional explain panel with VS Code theming

### Technical Highlights
- **Real Issues**: Actual vulnerabilities in demo Java code
- **Smart Fixes**: Context-aware remediation for different issue types
- **Production Focus**: Explains why issues matter in production
- **Industry Standards**: OWASP, CWE, NIST references

### Business Value
- **Time Saving**: Automated fix suggestions reduce manual research
- **Quality Assurance**: Production readiness scoring
- **Security First**: Proactive vulnerability detection
- **Team Collaboration**: PR-ready reports with clear explanations

## 🔧 Troubleshooting

### Extension Not Loading
- Ensure all packages are built: `pnpm build`
- Check VS Code Developer Tools for errors
- Restart Extension Development Host

### No Issues Found
- Verify demo-project files exist
- Check devguard.config.yml is present
- Ensure Java files contain intentional issues

### LSP Server Issues
- Check Output panel → DevGuard Language Server
- Verify server.js exists in packages/server/dist
- Restart VS Code if needed

## 📊 Demo Metrics

The demo project contains:
- **12 Security Issues**: SQL injection, XSS, weak crypto, hardcoded secrets
- **4 Concurrency Issues**: Thread safety problems
- **3 Style Issues**: Code quality and maintainability
- **2 OSS Issues**: Vulnerable dependencies

**Expected Score**: ~65/100 (intentionally low for demo impact)

## 🎯 Audience Adaptations

### For Developers
- Focus on fix quality and test generation
- Show diff views and undo functionality
- Emphasize time-saving aspects

### For Security Teams
- Highlight OWASP/CWE mappings
- Show SARIF export for security tools
- Emphasize proactive vulnerability detection

### For Managers
- Focus on production readiness score
- Show report generation for stakeholders
- Emphasize risk reduction and quality metrics

---

*This demo showcases DevGuard's complete end-to-end workflow from scanning to fixing to reporting.*