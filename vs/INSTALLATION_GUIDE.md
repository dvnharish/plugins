# 🚀 DevGuard Installation & Usage Guide

## ✅ Quick Start (5 Minutes)

### Step 1: Install & Build
```bash
# 1. Clone the repository
git clone https://github.com/your-org/devguard
cd devguard

# 2. Install dependencies
pnpm install

# 3. Build all packages
pnpm build
```

### Step 2: Launch Extension
1. **Open VS Code** in the DevGuard directory
2. **Press `F5`** to launch Extension Development Host
3. A new VS Code window opens with DevGuard loaded

### Step 3: Open Demo Project
1. In the new window: **File → Open Folder**
2. Select the `demo-project` folder
3. Click **Select Folder**

### Step 4: Find DevGuard in Activity Bar
1. Look for the **🛡️ shield icon** in the left Activity Bar
2. Click it to open DevGuard panel
3. You'll see categories: Security, OSS, Secrets, etc.

### Step 5: Run Your First Scan
1. Click **▶️ Scan Project** button
2. Watch status bar: "DevGuard: Scanning..."
3. Wait 5-10 seconds for completion
4. See results grouped by category with issue counts

---

## 🎯 How to Use DevGuard

### 📊 **Main Interface (Activity Bar)**
- **Location**: Left sidebar, shield icon (🛡️)
- **Top Section**: Production Readiness Score
- **Categories**: 
  - 🔒 Security (4 issues)
  - 📦 OSS/Dependencies (4 issues)
  - 🔑 Secrets (4 issues)
  - 🔀 Concurrency (3 issues)
  - 🧪 Tests (2 issues)
  - 🎨 Style (2 issues)

### 🔍 **Investigating Issues**
1. **Expand category** → See individual issues
2. **Left-click issue** → Jump to code location
3. **Right-click issue** → Context menu:
   - 🔍 **Explain Issue** - Detailed explanation
   - ✅ **Fix with Copilot** - Auto-fix
   - 📖 **Show Diff** - Preview changes
   - ↩ **Undo Fix** - Revert changes

### 📋 **Explain Panel**
- **Opens**: When you right-click → "Explain Issue"
- **Shows**:
  - Issue severity and category
  - Why it matters in production
  - Step-by-step fix guidance
  - OWASP/CWE security references
  - Action buttons for quick fixes

### 🤖 **AI-Powered Fixes**
- **Click**: "Fix with Copilot" button
- **Modes**: Auto, Preview, or Ask (configurable)
- **Features**: 
  - Context-aware fixes
  - Undo/redo support
  - Diff preview
  - Success notifications

### 🧪 **Test Generation**
1. **Right-click** any `.java` file
2. **Select**: "Generate JUnit Tests"
3. **Result**: Creates proper JUnit5 test in `src/test/java`
4. **Includes**: Mockito setup, AAA pattern, TestDataBuilders

### 📊 **Status Bar Integration**
- **Location**: Bottom status bar
- **Shows**: "DevGuard: 65/100" (current score)
- **Click**: Runs new scan
- **Updates**: Real-time during scanning

### 📄 **Export Reports**
1. **Command Palette**: `Ctrl+Shift+P` → "DevGuard: Export Report"
2. **Choose Format**:
   - **Markdown**: Perfect for PR reviews
   - **SARIF**: GitHub Code Scanning integration
   - **Both**: Generate both formats
3. **Location**: `devguard-reports/` folder

---

## 🎮 Demo Walkthrough

### **What You'll See in Demo Project**

#### **Security Issues (4)**
- **SQL Injection** in UserDao.java:18
- **Hardcoded Password** in UserDao.java:12
- **Weak Crypto (MD5)** in UserDao.java:33
- **XSS Vulnerability** in WebController.java:25

#### **Secrets Exposed (4)**
- **AWS Access Key** in AwsConfig.java:10
- **Database Password** in AwsConfig.java:14
- **API Key** in AwsConfig.java:17
- **Private Key** in AwsConfig.java:11

#### **Concurrency Issues (3)**
- **HashMap Thread Safety** in CacheService.java:12
- **Singleton Pattern Issue** in CacheService.java:18
- **Concurrent Modification** in CacheService.java:25

#### **Style & Quality (5)**
- **High Complexity** in CacheService.java:35
- **Unused Field** in UserDao.java:47
- **Duplicate Literals** in UserDao.java:18

### **Expected Demo Flow**
1. **Scan** → 19 issues found, Score: 65/100
2. **Investigate** → Click SQL Injection issue
3. **Explain** → Rich panel with OWASP references
4. **Fix** → Auto-converts to PreparedStatement
5. **Test** → Generate JUnit tests for UserDao
6. **Report** → Export Markdown for PR review

---

## 🔧 Configuration

### **VS Code Settings**
```json
{
  "devguard.copilot.applyFix": "auto",
  "devguard.policy.minScore": 75,
  "devguard.ui.explainPanel": true
}
```

### **Project Configuration** (`devguard.config.yml`)
```yaml
copilot:
  applyFix: auto # auto | preview | ask

policy:
  minScore: 75

sca:
  allowLicenses: ["Apache-2.0", "MIT"]

reports:
  formats: [markdown, sarif]

scanners:
  spotbugs:
    enabled: true
  semgrep:
    enabled: true
  gitleaks:
    enabled: true
```

---

## 🛠️ Troubleshooting

### **Extension Not Loading**
```bash
# 1. Ensure proper build
pnpm build

# 2. Check for errors
# Press F12 in VS Code → Console tab

# 3. Restart extension
# Close Extension Development Host, press F5 again
```

### **No Issues Found**
- ✅ Verify you opened `demo-project` folder
- ✅ Check Java files exist in `src/main/java/com/example/`
- ✅ Ensure `devguard.config.yml` is present
- ✅ Try manual scan: `Ctrl+Shift+P` → "DevGuard: Scan Project"

### **Shield Icon Missing**
- ✅ Look in Activity Bar (left sidebar)
- ✅ Right-click Activity Bar → ensure no views hidden
- ✅ Restart Extension Development Host
- ✅ Check Developer Tools for errors

### **Fixes Not Applied**
- ✅ Ensure file is not read-only
- ✅ Check write permissions
- ✅ Try "Show Diff" first
- ✅ Change fix mode to "preview" in settings

---

## 📋 Command Reference

### **Command Palette Commands**
- `DevGuard: Scan Project` - Run full analysis
- `DevGuard: Export Report` - Generate reports
- `DevGuard: Generate JUnit Tests` - Create test files

### **Context Menu Actions**
- **Right-click issue**: Explain, Fix, Show Diff, Undo
- **Right-click Java file**: Generate JUnit Tests

### **Keyboard Shortcuts**
- `F5` - Launch Extension Development Host
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+` - Toggle Terminal

---

## 🎯 Next Steps

### **For Evaluation**
1. ✅ Follow this guide to install
2. ✅ Run demo walkthrough
3. ✅ Try different features
4. ✅ Export sample reports

### **For Development**
1. ✅ Modify demo files to see different issues
2. ✅ Experiment with fix modes
3. ✅ Test report generation
4. ✅ Try test generation on different classes

### **For Production**
1. ✅ Package extension: `pnpm package`
2. ✅ Install in VS Code: Extensions → Install from VSIX
3. ✅ Configure for your projects
4. ✅ Integrate with CI/CD workflows

---

## 📞 Support

- **Issues**: GitHub Issues for bugs/features
- **Documentation**: README.md, DEMO.md, USER_GUIDE.md
- **Development**: VS Code Developer Tools (F12)

---

**🎉 You're all set! DevGuard is ready to help you write production-ready code!**

**Quick Start**: Open VS Code → Press F5 → Open demo-project → Click 🛡️ → Scan Project