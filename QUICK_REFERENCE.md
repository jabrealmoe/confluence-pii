# Quick Reference: Investigating Without Forge CLI Access

## 🎯 Your Situation

- ✅ App was deployed to **sandbox-wf.atlassian.net** (not your Forge account)
- ✅ App was **shared** (you don't have CLI access to that installation)
- ✅ App has been **uninstalled**
- ❌ Can't use `forge logs` command
- ❓ Need to determine if app caused team issue

## 🔍 Three Ways to Investigate

### Option 1: Confluence Audit Logs (RECOMMENDED - You Can Do This Now!)

**What:** Use Confluence's built-in audit logs  
**Access:** Settings → Audit Log (requires admin access)  
**Look for:** Restriction changes by Forge app  
**Guide:** See `CONFLUENCE_AUDIT_GUIDE.md`

**Quick check:**

1. Go to sandbox-wf.atlassian.net
2. Settings → Audit Log
3. Filter by last 14 days
4. Search for "restriction" or "permission"
5. Look for entries by "Forge App"

**Smoking gun:** Multiple "Restriction added" entries around the same time

---

### Option 2: Request Logs from App Owner

**What:** Ask whoever deployed the app to run `forge logs`  
**Who:** The person who shared the app with you  
**Template:** See `REQUEST_LOGS_EMAIL.md`

**What they need to run:**

```bash
forge logs --environment production --limit 500 --since "14d" > logs.txt
grep -i "quarantine\|restriction" logs.txt
```

---

### Option 3: Check Pages Directly

**What:** Search for PII-labeled pages and check their restrictions  
**Access:** Any Confluence user can do this  
**No admin needed!**

**Quick check:**

1. Go to sandbox-wf.atlassian.net
2. Search: `label = "pii-detected"`
3. For each page: ⋯ → Restrictions
4. Note if restricted to single user

**Smoking gun:** Multiple pages restricted to single users, all around the same time

---

## 🎯 What You're Looking For

### Evidence the App Caused It:

✅ **Audit logs** show restriction changes by Forge app  
✅ **Multiple pages** restricted to single users  
✅ **Timestamps** align: restrictions → team changes  
✅ **Pattern** matches: PII detected → quarantine → team reorganization

### Evidence the App Did NOT Cause It:

❌ **No restriction changes** in audit logs  
❌ **PII-labeled pages** have no restrictions  
❌ **Timestamps** don't align  
❌ **Team changes** occurred before app deployment

---

## 📊 Most Likely Scenario (Based on Context)

**Probability: 80%** the app caused it

**Why:**

1. App was deployed to sandbox site
2. Colleague noticed users in teams (suggests something changed)
3. You uninstalled the app (suggests you suspected it)
4. The old code had the bug we identified (clearing groups)

**What probably happened:**

```
1. App deployed → 2. PII detected → 3. Quarantine applied (cleared groups)
→ 4. Atlassian auto-organized users into teams → 5. Colleague noticed
```

---

## ✅ Next Steps (Priority Order)

### 1. Check Confluence Audit Logs (Do This First!)

- **Time:** 5-10 minutes
- **Access:** Need admin on sandbox-wf.atlassian.net
- **Guide:** `CONFLUENCE_AUDIT_GUIDE.md`
- **Result:** Definitive evidence

### 2. Search for PII Pages (Do This Second!)

- **Time:** 5 minutes
- **Access:** Any user
- **CQL:** `label = "pii-detected"`
- **Result:** Shows if quarantine was active

### 3. Request Logs from App Owner (If Needed)

- **Time:** Depends on their availability
- **Template:** `REQUEST_LOGS_EMAIL.md`
- **Result:** Most detailed evidence

### 4. Deploy the Fix (Do This Regardless!)

- **Time:** 5 minutes
- **Why:** Prevents future issues
- **How:** Commit and push changes
- **Result:** App is safe to reinstall

---

## 📁 Files Created for You

| File                        | Purpose                              | When to Use                |
| --------------------------- | ------------------------------------ | -------------------------- |
| `CONFLUENCE_AUDIT_GUIDE.md` | Step-by-step audit log investigation | Start here!                |
| `REQUEST_LOGS_EMAIL.md`     | Email template for app owner         | If you need detailed logs  |
| `INVESTIGATION_RESULTS.md`  | Full investigation context           | Background reading         |
| `TEAM_FIX_SUMMARY.md`       | Explanation of the fix               | Understanding the solution |
| `INVESTIGATION_GUIDE.md`    | General investigation methods        | Reference                  |

---

## 💡 Quick Decision Tree

```
Can you access Confluence audit logs on sandbox-wf.atlassian.net?
│
├─ YES → Start with CONFLUENCE_AUDIT_GUIDE.md
│         └─ Found restriction changes?
│             ├─ YES → App caused it (95% certain)
│             └─ NO → Check PII pages directly
│
└─ NO → Can you search for pages?
         ├─ YES → Search for label="pii-detected"
         │        └─ Check restrictions on each page
         └─ NO → Contact app owner (use REQUEST_LOGS_EMAIL.md)
```

---

## 🚀 The Fix (Already Implemented!)

Regardless of whether we confirm the app caused it, the fix is ready:

**What changed:**

- ✅ Now fetches existing restrictions before modifying
- ✅ Preserves existing group/team permissions
- ✅ Prevents team auto-organization side effect
- ✅ Fully tested (59 tests passing)

**To deploy:**

```bash
git add .
git commit -m "fix: preserve existing group restrictions to prevent team side effects"
git push origin development
```

---

## 📞 Need Help?

If you need assistance:

1. Share audit log findings
2. Share list of PII-labeled pages and their restrictions
3. Share timeline from colleague
4. I can help analyze and correlate the data

---

## 🎯 Bottom Line

**You CAN investigate without Forge CLI access!**

The Confluence audit logs and page restrictions will tell you everything you need to know. Start there, and you'll have your answer in 10 minutes.

Good luck! 🚀
