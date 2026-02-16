# Confluence Audit Log Investigation Guide

Since you don't have Forge CLI access to the sandbox installation, use Confluence's built-in audit logs to investigate.

## 🔍 Step-by-Step Investigation

### Step 1: Access Confluence Audit Logs

1. Go to `https://sandbox-wf.atlassian.net`
2. Click **Settings** (⚙️ icon in top right)
3. Under **SECURITY**, click **Audit Log**

**Note:** You need Confluence admin permissions to access audit logs.

---

### Step 2: Filter for Relevant Events

Use these filters to narrow down the investigation:

**Filter Settings:**

- **Date range**: Set to when the issue occurred (e.g., last 14 days)
- **Event type**: Select:
  - "Content updated"
  - "Permission changed"
  - "Restriction added"
  - "Restriction removed"
- **User**: Look for entries by "Forge App" or the app name

**Search terms to try:**

- `restriction`
- `permission`
- `forge`
- `pii`

---

### Step 3: Look for Smoking Gun Patterns

#### Pattern A: Bulk Restriction Changes (SMOKING GUN!)

If you see entries like this:

```
Date/Time           | User              | Action              | Content
--------------------|-------------------|---------------------|------------------
2026-01-29 10:15   | PII Detection App | Restriction added   | Page: "Employee Data"
2026-01-29 10:15   | PII Detection App | Restriction added   | Page: "Customer Info"
2026-01-29 10:16   | PII Detection App | Restriction added   | Page: "HR Records"
2026-01-29 10:16   | PII Detection App | Restriction added   | Page: "Sales Data"
```

**This confirms:** The app was applying restrictions (quarantine was active)

#### Pattern B: Content Updates Only

If you see entries like this:

```
Date/Time           | User              | Action              | Content
--------------------|-------------------|---------------------|------------------
2026-01-29 10:15   | PII Detection App | Content updated     | Page: "Employee Data"
2026-01-29 10:15   | PII Detection App | Content updated     | Page: "Customer Info"
```

**This suggests:** The app was only adding banners/labels, NOT applying restrictions

---

### Step 4: Export Audit Logs

1. Click **Export** button (usually top right)
2. Select date range
3. Choose format (CSV recommended)
4. Download the file

**Analyze the CSV:**

```bash
# Open in Excel/Google Sheets and filter by:
- User = "Forge App" or app name
- Action contains "restriction" or "permission"
```

---

### Step 5: Check Specific Pages

#### Search for PII-Labeled Pages

1. In Confluence, use the search bar
2. Enter this CQL query:
   ```
   label = "pii-detected"
   ```
3. This shows all pages where PII was detected

#### Check Each Page's Restrictions

For each page found:

1. Open the page
2. Click **⋯** (three dots) → **Restrictions**
3. Check:
   - **Is the page restricted?** (Yes/No)
   - **Who can view?** (Everyone / Specific users)
   - **Who can edit?** (Everyone / Specific users)
   - **When were restrictions added?** (Check the timestamp)

**Document findings:**

```
Page Title          | Has Restrictions? | Restricted To      | Date Added
--------------------|-------------------|--------------------|-----------
"Employee Data"     | Yes               | Single user (John) | 2026-01-29
"Customer Info"     | Yes               | Single user (Jane) | 2026-01-29
"Public Docs"       | No                | Everyone           | N/A
```

**Pattern to look for:**

- Multiple pages restricted to single users
- All restrictions added around the same time
- Timestamps match app deployment time

---

### Step 6: Check Team Membership Changes

1. Go to **Settings** → **Teams**
2. Click on each team that was affected
3. Look for:
   - **Members** tab - Who was added?
   - **Activity** or **History** - When were they added?

**Document findings:**

```
Team Name       | User Added | Date Added  | Added By
----------------|------------|-------------|----------
"Team Alpha"    | John Doe   | 2026-01-29  | System
"Team Beta"     | Jane Smith | 2026-01-29  | System
```

**Look for:**

- Multiple users added to teams around the same time
- "System" or "Automatic" as the actor (suggests auto-organization)
- Timestamps that correlate with restriction changes

---

### Step 7: Correlate Events

Create a timeline:

```
Time        | Event Type           | Details
------------|----------------------|--------------------------------
10:00 AM    | App Deployed         | (Approximate)
10:15 AM    | PII Detected         | Page: "Employee Data"
10:15 AM    | Restriction Added    | Page: "Employee Data" → User: John
10:16 AM    | PII Detected         | Page: "Customer Info"
10:16 AM    | Restriction Added    | Page: "Customer Info" → User: Jane
10:20 AM    | Team Change          | John added to "Team Alpha"
10:20 AM    | Team Change          | Jane added to "Team Beta"
```

**If events are within minutes of each other:** Strong evidence of causation

---

## 🎯 What Each Scenario Tells You

### Scenario 1: Restrictions Found + Team Changes Correlate

**Evidence:**

- ✅ Audit logs show restriction changes by Forge app
- ✅ Multiple pages restricted to single users
- ✅ Team changes occurred shortly after
- ✅ Timestamps align

**Conclusion:** 95% certain the app caused the team issue

**Action:** Deploy the fix before reinstalling

---

### Scenario 2: No Restrictions Found

**Evidence:**

- ✅ Audit logs show content updates (banners/labels)
- ❌ No restriction changes found
- ✅ Team changes occurred independently

**Conclusion:** App did NOT cause the team issue

**Action:** Investigate other causes (Atlassian updates, other apps, etc.)

---

### Scenario 3: Can't Access Audit Logs

**If you don't have admin access:**

1. **Ask an admin** to export audit logs for you
2. **Check individual pages** manually (you can still see restrictions on pages you have access to)
3. **Ask your colleague** for more details about what they observed

---

## 📋 Investigation Checklist

Use this checklist to track your progress:

- [ ] Accessed Confluence Audit Logs
- [ ] Filtered by date range (when issue occurred)
- [ ] Searched for "restriction" events
- [ ] Searched for "permission" events
- [ ] Searched for Forge app actions
- [ ] Exported audit logs to CSV
- [ ] Searched for pages with `pii-detected` label
- [ ] Checked restrictions on each PII page
- [ ] Documented restriction timestamps
- [ ] Checked Team membership changes
- [ ] Documented team change timestamps
- [ ] Created correlation timeline
- [ ] Interviewed colleague for details
- [ ] Documented all findings

---

## 📊 Sample Investigation Report

After completing the investigation, document your findings:

```markdown
# Investigation Report: Team Side Effect

## Summary

[Brief overview of findings]

## Evidence Collected

### Audit Log Findings

- Total restriction changes: [number]
- Date range: [start] to [end]
- Pages affected: [list]

### PII-Labeled Pages

- Total pages with pii-detected label: [number]
- Pages with restrictions: [number]
- Pages without restrictions: [number]

### Team Membership Changes

- Teams affected: [list]
- Users added: [number]
- Date range: [start] to [end]

### Timeline Correlation

[Timeline showing correlation between events]

## Conclusion

[Based on evidence, was the app the cause?]

## Recommendations

[Next steps]
```

---

## 🚀 Quick Start Commands

If you have access to the Confluence API, you can automate some checks:

### Check for PII-Labeled Pages (API)

```bash
curl -u email@example.com:api_token \
  "https://sandbox-wf.atlassian.net/wiki/rest/api/content/search?cql=label=pii-detected&expand=restrictions"
```

### Export Audit Logs (API)

```bash
curl -u email@example.com:api_token \
  "https://sandbox-wf.atlassian.net/wiki/rest/api/audit?startDate=2026-01-22&endDate=2026-01-29" \
  > audit-logs.json
```

---

## 💡 Tips

1. **Start with audit logs** - This is your best source of truth
2. **Look for patterns** - Multiple similar events at the same time
3. **Correlate timestamps** - Events within minutes suggest causation
4. **Document everything** - Take screenshots and export data
5. **Ask for help** - If you don't have admin access, ask someone who does

---

Would you like help analyzing any specific findings from the audit logs?
