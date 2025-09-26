Perfect 👍 Harish — let’s consolidate everything.
Here’s the **full Requirements Document** with **all panel requirements** (1–4) plus the **extra Panel 5 for Migration Reporting** and cross-panel requirements.

---

# Requirements Document

## Introduction

The **Converge-to-Elavon Migrator** is a VS Code extension that automates the migration of legacy **Converge APIs (REST + XML)** into modern **Elavon APIs (REST + JSON)**.
It integrates AI assistance via GitHub Copilot, dynamically derives mappings from OpenAPI specifications, and provides a **panel-based workflow** for secure, accurate, and consistent modernization.

The extension includes five panels:

1. **Project Scan Panel** – discover Converge API usage.
2. **Credentials Manager Panel** – manage Converge (read-only) and Elavon (active) credentials.
3. **Documentation Panel** – render side-by-side OpenAPI documentation for Converge and Elavon.
4. **Migration Suggestions Panel** – enable Copilot-powered migration with diff preview, bulk migration, and rollback.
5. **Migration Report Panel** – export migration summary and audit reports.

---

## Panel Requirements

---

### Panel 1 – Project Scan

**User Story:**
As a developer, I want to scan my project for Converge API endpoints across multiple programming languages, so that I can identify all code that needs migration to Elavon APIs regardless of the technology stack.

**Acceptance Criteria:**

1. WHEN the user activates Project Scan THEN the system SHALL identify all Converge endpoints including `/hosted-payments`, `/Checkout.js`, `/ProcessTransactionOnline`, `/batch-processing`, and `/NonElavonCertifiedDevice`.
2. WHEN scanning files THEN the system SHALL support JavaScript (.js, .jsx), TypeScript (.ts, .tsx), PHP (.php), Python (.py), Java (.java), C# (.cs), and Ruby (.rb).
3. WHEN scanning completes THEN the system SHALL display a **tree view** listing endpoints → controllers/services → fields.
4. WHEN endpoints are found THEN the system SHALL show file paths, line numbers, programming language, and confidence scores.
5. WHEN detecting `ssl_*` fields THEN the system SHALL recognize syntax variations such as `$ssl_*` (PHP), `:ssl_*` (Ruby), dictionary keys (Python), Java/C# properties, and JavaScript objects.
6. IF no Converge usage is found THEN the system SHALL display “No migration candidates found”.

---

### Panel 2 – Credentials Manager

**User Story:**
As a developer, I want to manage both Converge and Elavon credentials securely, so that I can authenticate with Elavon services without exposing sensitive information.

**Acceptance Criteria:**

1. WHEN the system scans config files THEN it SHALL auto-populate **Converge credentials** into a tree node (read-only).
2. WHEN the user right-clicks **Elavon Credentials** THEN the system SHALL allow adding `clientId`, `clientSecret`, and `merchantId`.
3. WHEN credentials are stored THEN the system SHALL use **VS Code Secret Storage API**.
4. WHEN the user clicks the **Test** button THEN the system SHALL call the Elavon Auth API and display success (✅) or failure (❌).
5. WHEN credentials are invalid or expired THEN the system SHALL prompt the user to update them.

---

### Panel 3 – Documentation Viewer

**User Story:**
As a developer, I want to view side-by-side documentation for Converge and Elavon APIs, so that I can understand mappings between old and new endpoints.

**Acceptance Criteria:**

1. WHEN the user opens the Documentation Panel THEN the system SHALL load **Converge OpenAPI.json** (left) and **Elavon OpenAPI.json** (right).
2. WHEN viewing endpoint mappings THEN the system SHALL render them side-by-side with aligned schemas.
3. WHEN the user hovers on a Converge field THEN the system SHALL highlight the corresponding Elavon field.
4. WHEN searching THEN the system SHALL filter endpoints and fields across both APIs.
5. WHEN OpenAPI specs change THEN the system SHALL reload and display the latest documentation.

---

### Panel 4 – Migration Suggestions

**User Story:**
As a developer, I want to migrate Converge code to Elavon using AI assistance, so that I can modernize my code with minimal manual effort.

**Acceptance Criteria:**

1. WHEN the user right-clicks a Converge endpoint THEN the system SHALL provide a **“Migrate to Elavon”** option.
2. WHEN migration starts THEN the system SHALL dynamically generate mappings from OpenAPI specs.
3. WHEN executing migration THEN the system SHALL send the Converge snippet + mapping rules to GitHub Copilot.
4. WHEN Copilot responds THEN the system SHALL display Elavon-compliant code in a **diff preview**.
5. WHEN the user accepts THEN the system SHALL update the code inline.
6. WHEN migration is applied THEN the system SHALL allow undo/rollback.
7. WHEN the user selects **“Migrate All Endpoints”** THEN the system SHALL perform bulk migration with progress tracking.
8. WHEN bulk migration completes THEN the system SHALL provide a summary of successes and failures.

---

### Panel 5 – Migration Report

**User Story:**
As a reviewer, I want to export migration reports, so that I can track what was migrated, what failed, and what still needs manual work.

**Acceptance Criteria:**

1. WHEN migration completes THEN the system SHALL generate a **report** of endpoints migrated, fields mapped, and unmapped fields.
2. WHEN exporting THEN the system SHALL support **Markdown** and **SARIF** formats.
3. WHEN exporting THEN the system SHALL include credential validation status (tested/not tested).
4. WHEN bulk migration runs THEN the system SHALL include per-endpoint success/failure details.
5. WHEN a report is generated THEN the system SHALL allow saving it locally from VS Code.

---

## Cross-Panel Functionalities

1. **Sandbox Validation**

   * After migration, the system SHALL allow testing against Elavon sandbox (`https://uat.api.converge.eu.elavonaws.com`).
   * Successful calls SHALL display JSON responses; failures SHALL show error details with remediation hints.

2. **Multi-Language Pattern Detection**

   * JavaScript/TypeScript: detect `fetch()`, `axios`, `XMLHttpRequest`, jQuery.
   * PHP: detect `curl_setopt()`, `file_get_contents()`, `wp_remote_*`.
   * Python: detect `requests`, `urllib`, `http.client`.
   * Java: detect `HttpClient`, `HttpPost`, `URL`.
   * C#: detect `HttpClient`, `WebRequest`, `RestSharp`.
   * Ruby: detect `Net::HTTP`, `HTTParty`, `RestClient`, `Faraday`.
   * Must assign **confidence scores** to detections.

3. **VS Code Integration**

   * The plugin SHALL register commands and panels at install.
   * Context menu actions SHALL appear on Converge API references.
   * Notifications SHALL use VS Code’s native system.
   * UI SHALL follow VS Code theming.

---

✅ Now you have a **complete requirements document** with each panel explicitly defined, plus a dedicated **Migration Report panel** for reviewer workflows and auditing.

Do you want me to also **map these requirements into Epics/Stories/Tasks** (Agile backlog style) so your team can drop them straight into JIRA or GitHub Projects?
