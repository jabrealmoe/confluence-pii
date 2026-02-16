# Investigation Guide: Team Side Effect Analysis

This guide will help you determine if the app's restriction changes caused the team organization issue.

## 🔍 Investigation Methods

### 1. Check Forge App Logs

The app logs every quarantine action. Look for these log entries:

```bash
# View recent logs from your Forge app
forge logs --environment production --tail

# Or view logs from a specific time period
forge logs --environment production --since "2026-01-29T00:00:00"
```

**What to look for:**

- `🚨 PII detected in <pageId>` - Shows when PII was found
- `✅ Page <pageId> quarantined` - Shows when restrictions were applied (NEW version only)
- Any errors related to `setRestrictions`

**Correlation:**

- Note the **timestamps** when quarantine actions occurred
- Compare with when your colleague noticed users appearing in Teams
- If they align, that's strong evidence

---

### 2. Check Admin Settings

Verify if quarantine was actually enabled when the issue occurred:

```bash
# Check current settings
forge storage get pii-settings-v1 --environment production
```

**What to check:**

```json
{
  "enableQuarantine": true // ← Was this enabled?
}
```

If `enableQuarantine` was `false`, then restrictions were never applied and this wasn't the cause.

---

### 3. Audit Confluence Page Restrictions

Check which pages had restrictions applied:

**Option A: Via Confluence UI**

1. Go to Confluence → Space Settings → Content Tools → Advanced Search
2. Search for pages with label: `pii-detected`
3. For each page, check:
   - Page → ⋯ → Restrictions
   - Look for pages restricted to a single user
   - Note the **date/time** restrictions were added

**Option B: Via API (more detailed)**

Create a script to check all pages with PII labels:

```javascript
// Run this in your Forge app or as a standalone script
import api, { route } from "@forge/api";

async function auditRestrictedPages() {
  // Search for pages with pii-detected label
  const response = await api
    .asApp()
    .requestConfluence(
      route`/wiki/rest/api/content/search?cql=label="pii-detected"&expand=restrictions.read.restrictions.user,restrictions.update.restrictions.user,version,history`,
    );

  const data = await response.json();

  console.log("=== PII Pages Audit ===");
  for (const page of data.results) {
    console.log(`\nPage: ${page.title} (${page.id})`);
    console.log(`Last modified: ${page.version.when}`);
    console.log(`Restrictions:`, JSON.stringify(page.restrictions, null, 2));
  }
}
```

---

### 4. Check Atlassian Audit Logs

Atlassian keeps audit logs of permission changes:

**Via Confluence Admin:**

1. Go to **Settings** (⚙️) → **Audit Log**
2. Filter by:
   - **Event type**: "Permission changed" or "Restriction added"
   - **Date range**: When the issue occurred
   - **User**: Look for actions by your Forge app

**What to look for:**

- Bulk permission changes around the same time
- Multiple pages restricted to single users
- Pattern of restriction changes matching your app's behavior

---

### 5. Check Team Membership Changes

**Via Jira/Confluence Admin:**

1. Go to **Settings** → **Teams**
2. Check the **Activity** or **Audit** section
3. Look for:
   - When users were added to teams
   - Which teams were affected
   - Timestamps of team changes

**Correlation:**

- Do the timestamps match when your app was deployed?
- Do the timestamps match when PII was detected and pages were quarantined?

---

### 6. Analyze Deployment Timeline

Create a timeline to correlate events:

```bash
# Check when the app was deployed
git log --oneline --since="2026-01-20" --until="2026-01-30"

# Check GitHub Actions deployment history
# Go to: https://github.com/<your-repo>/actions
```

**Timeline to build:**

```
[Deployment Time] → [First PII Detection] → [Team Changes Noticed]
      ↓                      ↓                        ↓
   Jan 29 10:00         Jan 29 10:15              Jan 29 11:00
```

If these events are close together, it's strong evidence.

---

## 🎯 Smoking Gun Evidence

You've found the smoking gun if:

✅ **Quarantine was enabled** (`enableQuarantine: true`)  
✅ **Logs show restriction changes** around the time of team changes  
✅ **Multiple pages were quarantined** (check for `pii-detected` label)  
✅ **Audit logs show permission changes** by your app  
✅ **Timeline matches**: Deploy → PII Detection → Team Changes

---

## 📊 Quick Investigation Script

Here's a script to gather all the evidence at once:

```bash
#!/bin/bash
# Save as: investigate-team-issue.sh

echo "=== Forge App Investigation ==="
echo ""

echo "1. Checking quarantine settings..."
forge storage get pii-settings-v1 --environment production
echo ""

echo "2. Checking recent logs (last 100 lines)..."
forge logs --environment production --tail 100 | grep -E "(quarantine|PII detected|setRestrictions)"
echo ""

echo "3. Checking deployment history..."
git log --oneline --since="7 days ago" --grep="deploy\|quarantine\|restriction"
echo ""

echo "=== Investigation Complete ==="
echo "Check Confluence Audit Logs manually for permission changes"
echo "Check Teams settings manually for membership changes"
```

Make it executable and run:

```bash
chmod +x investigate-team-issue.sh
./investigate-team-issue.sh
```

---

## 🔬 Alternative Causes to Rule Out

Before concluding it was your app, check:

1. **Other Forge apps** - Any other apps installed around the same time?
2. **Manual admin actions** - Did anyone manually change permissions?
3. **Atlassian updates** - Did Confluence/Jira update recently?
4. **Other integrations** - Any other tools (Slack, MS Teams, etc.) that sync with Atlassian?

---

## 📝 What to Document

As you investigate, document:

- ✅ Timestamp when team changes were noticed
- ✅ Timestamp when app was deployed
- ✅ Whether quarantine was enabled
- ✅ Number of pages that were quarantined
- ✅ Which users were affected
- ✅ Audit log entries showing permission changes

This will help confirm the root cause and prevent future issues.

---

## 🚀 Next Steps After Confirmation

If you confirm this was the cause:

1. **Deploy the fix** (already implemented)
2. **Manually review** affected pages and restore group permissions if needed
3. **Communicate** with affected users
4. **Monitor** after deploying the fix to ensure no new team changes occur

Would you like me to create any of these investigation scripts for you?
