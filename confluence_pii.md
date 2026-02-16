# Confluence PII & Security Suite: Reconstruction Prompt

This document serves as the "Master Blueprint" for recreating the Confluence PII Detector and Governance Suite. It contains the architectural analysis and the specific prompt required to build this project from scratch using Atlassian Forge.

---

## 🏗️ Project Architecture

### 1. Backend (Forge Trigger & Functions)

- **Entry Point**: `src/index.jsx`
- **Trigger**: `avi:confluence:created:page`, `avi:confluence:updated:page`.
- **Logic**:
  - **Debouncing**: Prevents redundant execution using Page Properties (`last-pii-scan-version`) and ephemeral Storage.
  - **PII Scanning**: Regex-based detection for Emails, Phone Numbers, Credit Cards, SSNs, and Driver's Licenses.
  - **Classification**: Keyword-based ranking (1-5) to identify institutional sensitivity (e.g., "Highly Secret").
  - **Governance Actions**:
    - Automatic page labeling.
    - Access restriction (Quarantine) to origin author only.
    - Historical version analysis (Deep scanning).
    - Incident logging to Forge Storage.

### 2. Services Layer

- `pii-service.js`: Core detection logic and historical version traversal.
- `page-service.js`: Wrapper for Confluence REST API (Restrictions, Labels, Properties, Space Data).
- `classification-service.js`: Logic for mapping keywords to institutional ranks and ACLs.
- `incident-service.js`: CRUD operations for security incident logs.
- `config-service.js`: Management of global administrative settings.

### 3. Frontend (Admin Custom UI)

- **Tech**: React + Parcel.
- **Components**:
  - **Tabbed Navigation**: "Security Profiles" (Config) vs. "Detection Oversight" (Audit Log).
  - **Dashboard**: High-level metrics with SVG-based risk distribution charts.
  - **Security Hierarchy**: Expandable accordion UI to manage authorized groups per classification rank.
  - **Live Site Analysis**: On-demand recursive scan of Confluence spaces.

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
> - **Efficiency**: Use `page properties` to store the last scanned version number. Skip execution if the current version has already been analyzed.
> - **PII Detection**: Scan page bodies for: Emails, US Phone Numbers, Credit Cards (Luhn validated), SSNs, and Driver's Licenses.
> - **Classification System**: Define a hierarchy from Rank 1 (Internal) to Rank 5 (Top Secret). Assign ranks based on keyword presence (e.g., "M&A", "Confidential").
> - **Automated Response**:
>   - If PII is found: Add labels `pii-detected` and `confidential`.
>   - **Quarantine**: If enabled in settings, restrict page permissions to the author only.
>   - **Warning Banner**: Inject a visual warning banner at the top of the page content.
>   - **In-place Highlighting**: Replace PII strings with redacted/highlighted placeholders in the storage format.
>
> #### 2. Service Architecture
>
> - Create a `services/` directory with modular logic:
>   - **PII Service**: Handles regex matching and historical version fetching.
>   - **Page Service**: Wraps `@forge/api` for restrictions, labels, and space metadata.
>   - **Classification Service**: Logic for ranking and ACL group mappings.
>   - **Incident Service**: Manages a persistent log of security findings in `storage`.
>
> #### 3. Administrative UI (`static/admin`)
>
> - **Technology**: Build a React-based Custom UI using Parcel.
> - **Design**: Implement a professional, institutional aesthetic with a tabbed interface:
>   - **Tab 1: Security Profiles**:
>     - Toggles for individual PII detectors.
>     - Global toggles for Auto-Quarantine and Historical Deep Scanning.
>     - **Clearance Hierarchy**: An interactive accordion section where admins can map Rank Level 1-5 to specific authorized Confluence User Groups.
>   - **Tab 2: Detection Oversight**:
>     - An Audit Log table showing: Timestamp, Entity Title, Space Name, PII Profile (tags), and Governance Status (Quarantined/Resolved).
>     - Actions to "Acknowledge/Resolve" or "Delete" incident records.
>   - **Dashboard**: Visualize risk incidents using a clean layout and small SVG data visualizations.
>
> #### 4. Manfest & Permissions (`manifest.yml`)
>
> - Scopes required: `read:page:confluence`, `write:page:confluence`, `read:confluence-content.all`, `write:confluence-content`, `search:confluence`, `read:confluence-user`, `storage:app`, and `read:space:confluence`.
> - Define a `globalSettings` module for the admin page.
>
> #### 5. Advanced Feature: Site Analysis
>
> - Provide a "Launch Site Analysis" button in the Admin UI that recursively fetches all pages in the instance, scans them, and populates the Incident Log/Dashboard without waiting for a trigger.
