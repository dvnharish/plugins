Perfect Harish ✅ — let’s generate a **production-ready `TASKS.md`** with **package-by-panel structure**.
This file is tailored for **Cursor AI**: every panel is broken down into **scoped tasks** that map directly to files in its package.
The output is **complete, detailed, and production-level** (no TODOs, no logs, no half stubs).

---

# TASKS.md – Converge → Elavon Migrator VS Code Extension

## 🎯 Goal

Build a **VS Code extension** named **“Converge → Elavon Migrator”** that provides **five fully functional panels** in the left Activity Bar:

1. **Project Scan** – detect Converge API usage.
2. **Credentials Manager** – manage Converge (read-only) + Elavon (securely stored) creds.
3. **Documentation Viewer** – side-by-side Converge vs Elavon OpenAPI.
4. **Migration Suggestions** – AI-assisted migration with Copilot + diff preview.
5. **Migration Report** – export Markdown/SARIF audit reports.

Cross-panel feature: **Sandbox Validation** to test migrated calls against Elavon UAT.

---

## 0) 🏗️ Project Setup

**Tasks**

* [ ] Initialize VS Code extension with TypeScript strict mode.
* [ ] Configure ESLint + Prettier, enforce **no `console.log` / no `TODO` comments**.
* [ ] Add `.vscodeignore` to exclude tests, node\_modules, configs.
* [ ] Add launch config to run/debug extension (`.vscode/launch.json`).
* [ ] Create **main activity bar container** named **“Converge Migrator”**.
* [ ] Register 5 views: `projectScan`, `credentials`, `documentation`, `migration`, `report`.
* [ ] Register commands for scanning, credentials add/test, docs search, migration (current/bulk), validation, report export.

**DoD**

* Extension compiles (`npm run compile`).
* Launching in VS Code shows **all 5 empty panels expanded** under a new activity bar icon.

---

## 1) 📂 Panel 1 – Project Scan (`src/panels/projectScan/`)

**Goal:** Detect Converge endpoints in multi-language repos and display results as a tree.

**Files**

```
ProjectScanPanel.ts
services/FileScanner.ts
services/EndpointCatalog.ts
services/OpenApiLoader.ts
services/OpenApiDiff.ts
services/LanguageDetectors/{jsTs.ts,php.ts,py.ts,java.ts,cs.ts,rb.ts}
```

**Tasks**

* [ ] Implement **EndpointCatalog** with known Converge endpoints.
* [ ] Implement **LanguageDetectors** (per language) to catch HTTP calls & `ssl_*` fields.
* [ ] Implement **FileScanner** to walk repo (ignore `.gitignore`), run detectors, return `Detection[]`.
* [ ] Implement **OpenApiLoader** to parse `converge.json` & `elavon.json`.
* [ ] Implement **OpenApiDiff** to compute endpoint/field differences.
* [ ] Build **ProjectScanPanel**:

  * Tree view groups: Endpoints, Controllers/Services, Fields.
  * Action: \[▶ Scan Project].
  * Clicking node jumps to file/line.
  * Show confidence scores.

**DoD**

* Running **Scan Project** finds endpoints, controllers, fields in mixed-language repos.
* No Converge usage → “No migration candidates found.”
* Works ≤ 5s on 200-file repo.

---

## 2) 🔑 Panel 2 – Credentials Manager (`src/panels/credentials/`)

**Goal:** Manage Converge (read-only) + Elavon creds securely.

**Files**

```
CredentialsPanel.ts
services/CredentialService.ts
services/ConvergeConfigReader.ts
services/ElavonSecretStore.ts
```

**Tasks**

* [ ] Implement **ConvergeConfigReader** to auto-read from `.env`, `application.properties`, or YAML. Mask values in UI.
* [ ] Implement **ElavonSecretStore** with `SecretStorage` keys: `clientId`, `clientSecret`, `merchantId`.
* [ ] Implement **CredentialService** to abstract providers and perform Auth API test.
* [ ] Build **CredentialsPanel**:

  * Tree:

    * **Converge (read-only)** creds auto-populated.
    * **Elavon (active)** → children: Client ID, Client Secret, Merchant ID.
  * Context actions: \[➕ Add/Update], \[▶ Test Connection].
  * Inline status ✅/❌.

**DoD**

* Converge creds auto-populated (masked).
* Elavon creds stored only in SecretStorage.
* Test button shows success/failure via notification + inline badge.

---

## 3) 📘 Panel 3 – Documentation Viewer (`src/panels/documentation/`)

**Goal:** Show Converge vs Elavon OpenAPI side-by-side.

**Files**

```
DocumentationPanel.ts
services/OpenApiIndex.ts
webview/index.html
webview/docs.js
webview/docs.css
```

**Tasks**

* [ ] Implement **OpenApiIndex** to index paths, operations, fields.
* [ ] Compare Converge vs Elavon endpoints, produce `FieldMap[] { source, target, status }`.
* [ ] Build **DocumentationPanel (Webview)**:

  * Split view (Converge left, Elavon right).
  * Hover highlight equivalents.
  * Search/filter bar.
  * Refresh button reloads OpenAPI specs.

**DoD**

* Opening panel shows aligned endpoints + field mappings.
* Hover highlights equivalents.
* Color codes: 🟢 mapped, 🟡 partial, 🔴 unmapped.

---

## 4) 🛠 Panel 4 – Migration Suggestions (`src/panels/migration/`)

**Goal:** AI-assisted migration via Copilot.

**Files**

```
MigrationPanel.ts
services/MappingEngine.ts
services/CopilotService.ts
services/DiffService.ts
services/ApplyService.ts
services/BulkRunner.ts
contrib/CodeLensProvider.ts
contrib/ContextMenu.ts
```

**Tasks**

* [ ] Implement **MappingEngine**: derive mappings from OpenAPI specs.
* [ ] Implement **CopilotService**: build prompts (source snippet + mappings), return Elavon code.
* [ ] Implement **DiffService**: render before/after diff editor.
* [ ] Implement **ApplyService**: apply patch with undo.
* [ ] Implement **BulkRunner**: migrate all detections sequentially, show progress.
* [ ] Implement **CodeLensProvider**: show “Migrate to Elavon” above functions.
* [ ] Implement **ContextMenu**: right-click → “Migrate to Elavon”.
* [ ] Build **MigrationPanel**:

  * Buttons: Migrate All, Show Progress.
  * List of per-endpoint statuses.

**DoD**

* Right-click or CodeLens triggers migration.
* Diff preview → Accept/Reject/Undo.
* Bulk migration works with progress bar + summary.

---

## 5) 📊 Panel 5 – Migration Report (`src/panels/report/`)

**Goal:** Export audit reports.

**Files**

```
ReportPanel.ts
services/ReportService.ts
services/SarifBuilder.ts
```

**Tasks**

* [ ] Implement **ReportService**: collate migrated, failed, unmapped stats.
* [ ] Implement **SarifBuilder**: build SARIF 2.1.0 JSON.
* [ ] Build **ReportPanel**:

  * Summary view (✔, ❌, ⚠ counts).
  * Buttons: Export Markdown, Export SARIF.
  * Preview inline before save.

**DoD**

* Export generates valid Markdown + SARIF.
* Saved file chosen by user.
* Bulk run yields complete summary.

---

## 6) 🧪 Cross-Panel – Sandbox Validation (`src/panels/validation/`)

**Goal:** Test migrated calls against Elavon UAT.

**Files**

```
SandboxValidator.ts
ValidateCommand.ts
```

**Tasks**

* [ ] Implement **SandboxValidator**: send migrated snippet payload to `https://uat.api.converge.eu.elavonaws.com`.
* [ ] Command `cm.validate.sandbox`: run validation on active editor.
* [ ] Annotate lines with ✅/❌ gutter icons.
* [ ] Show full JSON response in modal.

**DoD**

* Only runs with valid Elavon creds.
* Errors → actionable messages (not stack traces).

---

## 7) 📦 Non-Functional Requirements

**Tasks**

* [ ] Implement performance tests (≤ 5s scan on 200 files).
* [ ] Security: never expose secrets/logs.
* [ ] Error resilience: malformed OpenAPI handled gracefully.
* [ ] Package with `vsce package`.

---

## 8) 📑 Documentation

**Tasks**

* [ ] Write **README.md**: setup, usage, screenshots.
* [ ] Write **CHANGELOG.md**: initial release.
* [ ] Document panel workflows (Scan → Creds → Docs → Migration → Report).

---

# ✅ Final Acceptance Checklist

* [ ] All 5 panels visible and functional.
* [ ] Project Scan detects endpoints, controllers, fields.
* [ ] Credentials panel: Converge auto, Elavon secure + testable.
* [ ] Docs panel: side-by-side OpenAPI with search + hover highlight.
* [ ] Migration: Copilot diff preview, inline apply, rollback, bulk.
* [ ] Report: Markdown + SARIF export.
* [ ] Validation: sandbox API test with ✅/❌ annotation.
* [ ] No logs, no TODOs, 100% production-ready.
* [ ] `vsce package` builds `.vsix`.

