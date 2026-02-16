# Confluence PII & Security Suite: Reconstruction Prompt

This document serves as the "Master Blueprint" for recreating the Confluence PII Detector and Governance Suite. It contains the architectural analysis and the specific prompt required to build this project from scratch using Atlassian Forge.

---

## 🏗️ Project Architecture

### 1. Backend (Forge Trigger & Functions)

- **Entry Point**: `src/index.jsx`
- **Trigger**: `avi:confluence:created:page`, `avi:confluence:updated:page`.
- **Logic**:
  - **Debouncing**: Prevents redundant execution using Page Properties (`last-pii-scan-version`) and ephemeral Storage with a 3-second cooldown.
  - **PII Scanning**: Regex-based detection for Emails, Phone Numbers, Credit Cards, SSNs, Passports, and Driver's Licenses. Uses pre-compiled regex patterns in `src/utils/pii-detector.js` for performance.
  - **Classification**: Keyword-based ranking (1-5) to identify institutional sensitivity (e.g., "Top Secret", "Confidential").
  - **Governance Actions**:
    - Automatic page labeling (`pii-detected`, `confidential`).
    - Access restriction (Quarantine) to origin author only, with existing group/team permissions preserved.
    - Warning banner injection with PII highlighting in storage format.
    - Historical version analysis (Deep scanning) with incremental optimization.
    - Incident logging to Forge Storage.

### 2. Services Layer

- `pii-service.js`: Core detection logic, text extraction from storage body format, and incremental historical version traversal.
- `page-service.js`: Wrapper for Confluence REST API (Restrictions with merged permissions, Labels, Properties, Space Data via V2 API).
- `classification-service.js`: Logic for mapping keywords to institutional ranks and ACLs.
- `incident-service.js`: CRUD operations for security incident logs using Forge Storage. Uses JavaScript-side filtering (`key.startsWith('pii-incident-')`) instead of GraphQL `where` conditions to ensure compatibility across Forge runtime environments.
- `config-service.js`: Management of global administrative settings with 5-minute in-memory caching. Provides a `getDefaults()` method and merges defaults with incoming settings on save to prevent accidental data loss.
- `notification-service.js`: Handles warning banner injection, in-page PII highlighting with styled spans, findings reporting, and sensitive data masking for logs.
- `scan-site-service.js`: On-demand site-wide PII scanning using Confluence V1 REST API (`/wiki/rest/api/content`) with offset-based pagination for reliable batch processing. Includes diagnostic logging for active rules and per-page content analysis.

### 3. Resolver (Admin API Gateway)

- **File**: `src/resolver.js`
- **Endpoints**:
  - `getSettings` / `saveSettings` — Configuration management with audit logging of rule changes.
  - `getSiteStats` — Total page count via Confluence Search API.
  - `scanSiteBatch` — Batch page scanning with parallelized processing.
  - `getIncidents` / `updateIncidentStatus` / `deleteIncident` — Incident CRUD.
  - `getVersion` — Dynamic version number from `package.json`.

### 4. Frontend (Admin Custom UI)

- **Tech**: React + Parcel, bundled to `static/admin-build/`.
- **Components**:
  - **DnaAnimation**: Decorative genome sequence animation displayed above the tabbed interface.
  - **Tabbed Navigation**: "Security Profiles" (Config) vs. "Detection Oversight" (Audit Log).
  - **Dashboard**: High-level metrics with SVG-based risk distribution charts. Includes "Content Status" (Clean Content / Total Flags) and "Executive Summary".
  - **Detection Rules**: Toggle switches for individual PII detectors (Email, Phone, Credit Card, SSN, Passport, Driver's License).
  - **Response Protocol**: Toggle switches for Auto-Isolation (Quarantine) and Historical Deep Scan.
  - **Security Hierarchy**: Expandable accordion UI (ClearanceLevel sub-component) to manage authorized groups per classification rank (Unclassified → Top Secret).
  - **Live Site Analysis**: On-demand recursive scan with progress bar and batch processing.
  - **Detection Oversight Log**: Sortable audit table showing Timestamp, Entity Title, Space Name, PII Profile (tags), and Governance Status. Actions: "Acknowledge" (sets status to `Resolved`, keeps record) or "Delete" (permanently removes from storage).

### 5. Utilities

- `src/utils/pii-detector.js`: Pre-compiled regex patterns for SSN, Email, Phone, Credit Card, 9-digit numbers, and alphanumeric IDs. Includes context-aware disambiguation for ambiguous patterns (e.g., 9-digit numbers classified as Passport vs SSN vs Driver's License based on surrounding text). Uses overlap detection to prevent double-counting. Exports `detectPii()`, `aggregateHits()`, `extractContentPreview()`, and validation helpers.

---

## 🔧 Technical Decisions & Known Gotchas

### Forge Storage Queries

The Forge `storage.query().where('key', startsWith(...))` API has a known instability in certain runtime environments, producing a `AppStoredEntityCondition` GraphQL error. **Workaround**: Fetch all records with `.limit(50).getMany()` and filter in JavaScript using `item.key.startsWith('pii-incident-')`.

### Confluence API Version Selection

- **Site Scan (Batch)**: Uses **V1** (`/wiki/rest/api/content`) because V2 does not support `offset`-based pagination (only cursor-based). The frontend's batch loop relies on `start` increments.
- **Page Operations**: Uses **V2** (`/wiki/api/v2/pages/`) for page data, labels, and versions.
- **Search**: Uses **V1** (`/wiki/rest/api/search`) for CQL-based page counting.

### Settings Persistence

`ConfigService.saveSettings()` merges incoming settings with `getDefaults()` before writing to storage. This prevents partial settings objects (e.g., from a UI that only sends toggled fields) from overwriting unrelated defaults like `clearanceLevels`.

### Restriction Merging

`PageService.setRestrictions()` fetches existing page restrictions before applying quarantine. It preserves all existing group and user permissions while adding the author, preventing unintended side effects like Atlassian's automatic team organization.

### Deployment

- **Runtime**: Node.js 22.x, ARM64, 256MB memory.
- **Build**: `cd static/admin && npm run build` (Parcel) → `forge deploy -e production`.
- **`.forgeignore`**: Excludes `node_modules`, `.parcel-cache`, `coverage`, and `tmp` directories to prevent "Maximum call stack size exceeded" errors during Forge's linting/packaging phase.
- **TMPDIR Override**: Required on some systems due to Forge's temporary directory handling: `TMPDIR=$PWD/tmp forge deploy`.

---

## 📝 The Reconstruction Prompt

**Copy and use the prompt below to recreate this project:**

> **System Prompt: Create a Confluence Forge PII Detection & Governance App**
>
> **Objective**: Build a production-grade Atlassian Forge app that monitors Confluence pages for Personal Identifiable Information (PII), enforces institutional security classifications, and provides an administrative oversight dashboard.
>
> ### Core Requirements
>
> #### 1. Backend Trigger Logic (`src/index.jsx`)
>
> - Implement a trigger that fires on page creation and updates.
> - **Efficiency**: Use `page properties` to store the last scanned version number. Skip execution if the current version has already been analyzed. Add a 3-second ephemeral storage debounce for rapid edits.
> - **PII Detection**: Scan page bodies using pre-compiled regex for: Emails, US Phone Numbers, Credit Cards (length-validated), SSNs (strict format with separators), Passports (context-aware 9-digit), and Driver's Licenses (context-aware alphanumeric).
> - **Classification System**: Define a hierarchy from Rank 1 (Unclassified) to Rank 5 (Top Secret). Assign ranks based on keyword presence.
> - **Automated Response**:
>   - If PII is found: Add labels `pii-detected` and `confidential`.
>   - **Quarantine**: If enabled in settings, restrict page permissions to the author only, while preserving existing group/team permissions.
>   - **Warning Banner**: Inject a Confluence `info` macro banner at the top of the page content.
>   - **In-place Highlighting**: Replace PII strings with styled `<span>` elements in the storage format.
>   - **Incident Logging**: Record each detection event to Forge Storage with page ID, title, space context, PII types, and governance status.
>
> #### 2. Service Architecture
>
> - Create a `services/` directory with modular logic:
>   - **PII Service**: Handles text extraction from storage format and historical version fetching with incremental scanning.
>   - **Page Service**: Wraps `@forge/api` for restrictions (with merge logic), labels (V2 API), properties, and space metadata.
>   - **Classification Service**: Logic for ranking and ACL group mappings.
>   - **Incident Service**: Manages a persistent log of security findings in `storage`. Use `storage.query().limit(50).getMany()` and filter by key prefix in JavaScript — do NOT use `storage.query().where()` conditions as they are unstable.
>   - **Config Service**: Settings management with 5-minute caching, a `getDefaults()` method, and merge-on-save to prevent partial overwrites. Include audit logging of rule changes with user account ID.
>   - **Notification Service**: Banner injection, PII highlighting, findings reporting, and data masking for logs.
>   - **Site Scan Service**: Batch page scanning using Confluence V1 API with offset-based pagination and parallel processing.
>
> #### 3. Administrative UI (`static/admin`)
>
> - **Technology**: Build a React-based Custom UI using Parcel, bundled to `static/admin-build/`.
> - **Design**: Implement a professional, institutional aesthetic with a tabbed interface:
>   - **Tab 1: Security Profiles**:
>     - Site-Wide Privacy Analysis dashboard with "Launch Site Analysis" button, progress bar, and results grid (Content Status + Risk Incident Distribution SVG chart).
>     - Detection Rules section: Toggle switches for individual PII detectors.
>     - Response Protocol section: Toggle switches for Auto-Quarantine and Historical Deep Scanning.
>     - **Clearance Hierarchy**: An interactive accordion section (ClearanceLevel sub-component) where admins can map Rank Level 1-5 to specific authorized Confluence User Groups.
>     - "Save Configuration" button.
>   - **Tab 2: Detection Oversight**:
>     - An Audit Log table showing: Timestamp, Entity Title, Space Name, PII Profile (tags), and Governance Status (Detected/Quarantined/Resolved).
>     - "Acknowledge" action (sets status to `Resolved`, keeps record for audit trail).
>     - "Delete" action (permanently removes incident record from storage).
>     - Refresh button for live updates.
>   - **Header**: DnaAnimation component above tabs, dynamic version display from `package.json`.
>
> #### 4. Manifest & Permissions (`manifest.yml`)
>
> - Runtime: `nodejs22.x`, 256MB, ARM64.
> - Scopes required: `read:page:confluence`, `write:page:confluence`, `read:confluence-content.all`, `read:confluence-content.summary`, `write:confluence-content`, `search:confluence`, `read:confluence-user`, `read:space:confluence`, `storage:app`.
> - Define a `confluence:globalSettings` module for the admin page with a resolver function.
> - Two functions: `main` (trigger handler) and `pii-admin-resolver` (resolver handler).
>
> #### 5. Advanced Feature: Site Analysis
>
> - Provide a "Launch Site Analysis" button in the Admin UI that:
>   1. Fetches total page count via Confluence Search API (`/wiki/rest/api/search?cql=type=page&limit=0`).
>   2. Recursively fetches all pages in batches of 10 using V1 Content API with offset-based pagination.
>   3. Scans each page in parallel using the PII detector with current settings.
>   4. Aggregates statistics (clean pages, total flags, hits by type).
>   5. Populates the Dashboard charts and refreshes the Incident Log.
>   6. Includes diagnostic logging: active rules per batch, page content previews, and per-batch hit summaries.
>
> #### 6. Quality Guardrails
>
> - Run `npm run lint` before every commit and deployment.
> - Use Conventional Commits format (`feat`, `fix`, `docs`, `refactor`, etc.).
> - Create a `.forgeignore` file excluding `node_modules`, `.parcel-cache`, `coverage`, and `tmp`.
> - Maintain a `.agent/skills/lint_guardrails/SKILL.md` documenting the quality protocol.
