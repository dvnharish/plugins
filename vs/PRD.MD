Got it ✅ — you want the **PRD rewritten with a clear sequential structure** (step-by-step flow), so it reads like a **story of how DevGuard works from setup → usage → reporting**, while still capturing all requirements.

Here’s the **final sequential PRD** 👇

---

# 📄 Product Requirements Document (PRD)

**DevGuard: VS Code Extension for Clean Code, Security & Testability**

---

## 0) One-liner

A VS Code extension that ensures developers write **production-ready code** by surfacing bugs, security risks, OSS vulnerabilities, secrets, and concurrency problems, **fixing them automatically via Copilot**, generating tests, and producing a **Production Readiness Score** with PR-friendly reports.

---

## 1) Setup & Configuration (First Step)

1. Developer installs DevGuard from VS Code Marketplace or Open VSX.
2. DevGuard detects Java/Maven/Gradle projects automatically.
3. Optional: place `devguard.config.yml` in project root to customize:

   ```yaml
   copilot:
     applyFix: auto # auto | preview | ask
   policy:
     minScore: 75
   sca:
     allowLicenses: ["Apache-2.0","MIT"]
   reports:
     formats: [markdown, sarif]
   ```
4. All scanners (SpotBugs, PMD, Semgrep, Dependency-Check, gitleaks, etc.) run locally in **offline mode** unless cloud adapters are enabled.

---

## 2) Scanning Workflow (Second Step)

1. Developer opens DevGuard panel in Activity Bar.
2. **Top Node** shows current **📊 Readiness Score**.
3. Developer clicks ▶️ **Scan Project** (play button).
4. DevGuard runs analyzers in parallel:

   * 🔒 Security (Semgrep, SpotBugs Security)
   * 📦 OSS/Dependencies (OWASP Dependency-Check)
   * 🔑 Secrets (gitleaks)
   * 🔀 Concurrency/Sync (SpotBugs MT detectors)
   * 🧪 Tests & Coverage (JaCoCo)
   * 🎨 Style & Maintainability (PMD, Checkstyle)
5. Issues are grouped in the TreeView with severity icons:

   * 🔴 Critical, 🟠 High, 🟡 Medium, 🔵 Info, ⚪ Minor

---

## 3) Issue Navigation (Third Step)

1. Developer **expands categories** in TreeView.
2. **Left-click issue** → jumps to file + line in editor.
3. **Right-click issue** → context menu:

   * 🔍 Explain Issue
   * ✅ Fix with Copilot
   * 📖 Show Diff
   * ↩ Undo Fix

---

## 4) Explain Panel (Fourth Step)

1. Explain Panel opens as a Webview.
2. Displays structured details:

   * **Severity, Rule, File, Line**
   * **Description** of issue
   * **Why it fails in production**
   * **Recommended fix**
   * **References (OWASP, CERT, etc.)**
3. Action Buttons:

   * ✅ **Fix with Copilot** → auto-patch (default)
   * 📖 **Show Diff** → preview changes
   * ↩ **Undo Last Fix** → rollback

---

## 5) Copilot Fix Flow (Fifth Step)

1. DevGuard prepares a structured remediation prompt:

   > “Fix SQL Injection (rule SQLI-001) in this code by using parameterized queries.”
2. Sends snippet + metadata to Copilot.
3. Copilot returns patch.
4. DevGuard **applies patch directly** (auto).
5. Toast message:

   > “✅ Fix applied. \[Undo] \[Show Diff]”
6. Configurable via `copilot.applyFix: auto | preview | ask`.

---

## 6) Test Generation (Sixth Step)

1. Developer right-clicks a class → **Generate JUnit Tests**.
2. DevGuard uses JavaParser to parse methods.
3. Generates **JUnit5 test stubs** with AAA pattern.
4. Adds **Mockito** for dependencies and **TestDataBuilders** for domain objects.
5. Writes files under `src/test/java/...`.

---

## 7) Production Readiness Score (Seventh Step)

1. After scan, DevGuard calculates **score (0–100)**.
2. Formula (configurable weights):

   * Bugs: 30%
   * Security: 30%
   * Tests: 20%
   * Style: 10%
   * Maintainability: 10%
3. Displayed in:

   * **Status Bar**
   * **TreeView Root**
   * **Markdown Report**

---

## 8) Reporting (Eighth Step)

1. Developer runs `DevGuard: Export Report`.
2. **Markdown Report** generated for PRs:

   ```markdown
   # 📊 DevGuard Project Review
   Score: 82 / 100  
   🔴 2 Critical   🟠 2 High   🟡 1 Medium   ⚪ 3 Minor  

   ## 🔒 Security
   - 🔴 SQL Injection – UserDao.java:42  
   - 🟠 Insecure TrustManager – SSLConfig.java:18  

   ## 📦 OSS / Dependencies
   - 🟠 jackson-databind 2.15.0 → 2.17.1  

   🚀 Top Fixes:
   1. Prevent SQL Injection in UserDao.java:42
   2. Replace HashMap with ConcurrentHashMap in CacheService.java
   3. Upgrade jackson-databind to 2.17.1
   ```
3. **SARIF Export** available for GitHub Code Scanning.

---

## 9) Demo Path (For First-Time User)

1. Install extension → open sample project.
2. Open DevGuard panel → **Scan Project**.
3. Expand “Security” → right-click issue → **Explain Issue**.
4. Click **Fix with Copilot** → patch applied.
5. Right-click service class → **Generate JUnit Tests**.
6. Export **Markdown Report** → attach to PR.

---

## 10) Non-Functional Requirements

* **Performance:** ≤ 20s first scan, ≤ 3s incremental.
* **Offline Support:** bundle minimal rules.
* **Privacy:** no code leaves machine unless consented.
* **Extensible:** new runners via YAML config.

---

## 11) Risks & Mitigations

* **False positives** → allow suppressions (`// devguard:ignore <rule>`).
* **Copilot privacy** → redact literals, opt-in toggle.
* **Tool overhead** → incremental caching + parallel runners.

---

## 12) Enhancements & Extensions

### For Developers

* Auto-patch common issues with Copilot.
* Save time with auto-generated JUnit tests.
* Real-time readiness score in status bar.

### For Reviewers

* Consistent PR reports with icons/badges.
* Explain Panel with production context + references.

### For Project Managers

* Export readiness reports by sprint/repo.
* Minimum score policy enforcement.

### For DevSecOps

* SARIF integration with GitHub/GitLab.
* License enforcement policies.
* Offline-friendly, secure by default.

### Future Roadmap

* AI Reviewer Mode → auto-generate PR comments.
* Mutation testing (PIT).
* Kotlin/Scala support.
* Team dashboard (score trends, hotspots).

---

# ✅ Summary

This sequential PRD walks through **setup → scanning → fixing → testing → scoring → reporting → demo flow**, ensuring clarity for developers, reviewers, leads, and managers.

---

