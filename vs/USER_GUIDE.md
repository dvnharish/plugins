# 🛡️ DevGuard VS Code Extension - Complete User Guide

## 📋 Table of Contents
1. [Installation & Setup](#installation--setup)
2. [How to Use DevGuard](#how-to-use-devguard)
3. [Bookmarking to Activity Bar](#bookmarking-to-activity-bar)
4. [Features Overview](#features-overview)
5. [Demo Walkthrough](#demo-walkthrough)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Installation & Setup

### Prerequisites
- **VS Code** version 1.95.0 or higher
- **Node.js** version 18 or higher
- **pnpm** package manager
- **Java project** with Maven or Gradle

### Step 1: Clone and Build DevGuard
```bash
# Clone the repository
git clone https://github.com/your-org/devguard
cd devguard

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Step 2: Launch Extension in Development Mode
1. **Open VS Code** in the DevGuard directory
2. **Press `F5`** to launch Extension Development Host
3. A new VS Code window will open with DevGuard loaded

### Step 3: Open Demo Project
1. In the new VS Code window, click **File → Open Folder**
2. Navigate to the `demo-project` folder inside DevGuard
3. Click **Select Folder**

---

## 🎯 How to Use DevGuard

### Finding DevGuard in VS Code

#### Method 1: Activity Bar (Recommended)
1. Look for the **🛡️ shield icon** in the left Activity Bar
2. Click it to open the DevGuard panel
3. You'll see the main DevGuard interface

#### Method 2: Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "DevGuard"
3. Select any DevGuard command

#### Method 3: Status Bar
1. Look at the bottom status bar
2. You'll see "DevGuard: Ready" or the current score
3. Click it to run a scan

### Basic Usage Workflow

#### 1. **Initial Scan**
- Click the **▶️ Scan Project** button in the DevGuard panel
- Watch the status bar change to "DevGuard: Scanning..."
- Wait for scan completion (usually 5-10 seconds)

#### 2. **Review Results**
- Expand categories to see issues:
  - 🔒 **Security** - SQL injection, XSS, weak crypto
  - 📦 **OSS/Dependencies** - Vulnerable libraries
  - 🔑 **Secrets** - Hardcoded passwords, API keys
  - 🔀 **Concurrency** - Thread safety issues
  - 🧪 **Tests** - Missing test coverage
  - 🎨 **Style** - Code quality issues

#### 3. **Investigate Issues**
- **Left-click** any issue to jump to the code location
- **Right-click** for context menu options:
  - 🔍 **Explain Issue** - Detailed explanation
  - ✅ **Fix with Copilot** - Automatic fix
  - 📖 **Show Diff** - Preview changes
  - ↩ **Undo Fix** - Revert changes

#### 4. **Use Explain Panel**
- Right-click an issue → "Explain Issue"
- Rich panel opens showing:
  - Issue severity and category
  - Why it matters in production
  - Recommended fix steps
  - OWASP/CWE references
  - Action buttons for fixing

#### 5. **Apply Fixes**
- Click **"Fix with Copilot"** for intelligent fixes
- Choose fix mode in settings:
  - **Auto**: Apply immediately
  - **Preview**: Show diff first
  - **Ask**: Confirm before applying

#### 6. **Generate Tests**
- Right-click any `.java` file → "Generate JUnit Tests"
- Creates proper JUnit5 test structure
- Includes Mockito setup and TestDataBuilders

#### 7. **Export Reports**
- Use Command Palette → "DevGuard: Export Report"
- Choose format:
  - **Markdown**: For PR reviews
  - **SARIF**: For GitHub Code Scanning
  - **Both**: Generate both formats

---

## 📌 Bookmarking to Activity Bar

### DevGuard is Already in the Activity Bar!
When you launch DevGuard, it automatically appears as a **🛡️ shield icon** in the left Activity Bar.

### If You Don't See the Icon:
1. **Check if extension is loaded**:
   - Press `Ctrl+Shift+P`
   - Type "DevGuard"
   - If commands appear, extension is loaded

2. **Restart VS Code**:
   - Close the Extension Development Host window
   - Press `F5` again in the main DevGuard directory

3. **Check Activity Bar**:
   - Right-click on Activity Bar
   - Ensure no views are hidden
   - Look for the shield icon

### Customizing Activity Bar Position:
1. **Drag and drop** the DevGuard icon to reorder
2. **Right-click** Activity Bar → "Reset Activity Bar" if needed

---

## ✨ Features Overview

### 🔍 **Comprehensive Scanning**
- **6 Categories** of analysis
- **19 Types** of issues detected
- **Real-time** status updates
- **Parallel** scanner execution

### 🤖 **AI-Powered Fixes**
- **Context-aware** fix suggestions
- **Multiple fix modes** (auto/preview/ask)
- **Undo/redo** functionality
- **Diff preview** before applying

### 📊 **Production Readiness Scoring**
- **0-100 scale** with weighted categories
- **Real-time updates** in status bar
- **Configurable thresholds**
- **Trend tracking**

### 🧪 **Test Generation**
- **JUnit5** test scaffolding
- **AAA pattern** (Arrange-Act-Assert)
- **Mockito integration**
- **TestDataBuilder** pattern

### 📋 **Rich Reporting**
- **Markdown reports** for PRs
- **SARIF export** for security tools
- **Executive summaries**
- **Actionable recommendations**

---

## 🎮 Demo Walkthrough

### Quick 5-Minute Demo

#### **Minute 1: Setup**
1. Open DevGuard panel (🛡️ icon)
2. Click "Scan Project"
3. Show scan progress in status bar

#### **Minute 2: Explore Issues**
1. Expand Security category (4 issues)
2. Click SQL Injection issue
3. Show code location (UserDao.java:18)

#### **Minute 3: Explain & Fix**
1. Right-click → "Explain Issue"
2. Show rich explanation panel
3. Click "Fix with Copilot"
4. Show applied fix

#### **Minute 4: Test Generation**
1. Right-click UserDao.java
2. Select "Generate JUnit Tests"
3. Show generated test file

#### **Minute 5: Reporting**
1. Export Markdown report
2. Show formatted output
3. Highlight production readiness score

### Expected Demo Results
- **Score**: ~65/100 (intentionally low for impact)
- **Issues Found**: 19 across 6 categories
- **Fixes Applied**: SQL injection → PreparedStatement
- **Tests Generated**: Complete JUnit5 test suite

---

## 🔧 Troubleshooting

### Extension Not Loading
**Problem**: DevGuard icon doesn't appear
**Solutions**:
1. Ensure you pressed `F5` in the DevGuard directory
2. Check VS Code Developer Tools (Help → Toggle Developer Tools)
3. Look for errors in Console tab
4. Restart Extension Development Host

### No Issues Found
**Problem**: Scan completes but shows 0 issues
**Solutions**:
1. Verify you opened the `demo-project` folder
2. Check that Java files exist in `src/main/java/com/example/`
3. Ensure `devguard.config.yml` is present
4. Try rescanning with `Ctrl+Shift+P` → "DevGuard: Scan Project"

### Scan Fails
**Problem**: Error message during scanning
**Solutions**:
1. Check Output panel → "DevGuard Language Server"
2. Verify all packages built successfully (`pnpm build`)
3. Ensure demo project has proper structure
4. Restart VS Code if needed

### Fix Not Applied
**Problem**: "Fix with Copilot" doesn't work
**Solutions**:
1. Check file is not read-only
2. Ensure you have write permissions
3. Try different fix mode in settings
4. Use "Show Diff" to preview changes first

### Status Bar Not Updating
**Problem**: Score doesn't appear in status bar
**Solutions**:
1. Run a scan first
2. Check if status bar is visible (View → Appearance → Status Bar)
3. Look for "DevGuard" text in status bar
4. Restart extension if needed

---

## ⚙️ Configuration

### Settings Location
- **VS Code Settings**: File → Preferences → Settings → Search "DevGuard"
- **Project Config**: `devguard.config.yml` in project root

### Key Settings
```yaml
copilot:
  applyFix: auto # auto | preview | ask

policy:
  minScore: 75

ui:
  explainPanel: true

scanners:
  spotbugs:
    enabled: true
  semgrep:
    enabled: true
```

---

## 🎯 Next Steps

### For Development
1. **Modify demo files** to see different issues
2. **Experiment with fixes** and undo functionality
3. **Try different scan configurations**
4. **Generate tests for different classes**

### For Production Use
1. **Package extension**: `pnpm package`
2. **Install in VS Code**: Extensions → Install from VSIX
3. **Configure for your project**: Add `devguard.config.yml`
4. **Integrate with CI/CD**: Use CLI tool (when available)

---

## 📞 Support

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check README.md and DEMO.md
- **Developer Tools**: Use VS Code's built-in debugging

### Contributing
- **Fork repository** and submit PRs
- **Add new scanners** in `packages/runners`
- **Improve UI** in `packages/extension`
- **Enhance reports** in report service

---

**🎉 Congratulations! You're now ready to use DevGuard to improve your code quality and security!**