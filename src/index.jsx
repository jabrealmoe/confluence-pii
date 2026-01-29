import api, { route, storage } from "@forge/api";



export async function run(event) {
  console.log("🔔 PII Detection triggered for Confluence page");

  const pageId = event?.content?.id;
  const spaceKey = event?.content?.space?.key;

  if (!pageId) {
    console.log("❌ No pageId found in event");
    return;
  }

  console.log(`📄 Processing page ${pageId} in space ${spaceKey || 'N/A'}`);

  // Step 1: Get current page data
  console.log("\n📥 Step 1: Fetching current page data...");
  const currentPage = await getCurrentPageData(pageId);

  if (!currentPage) {
    console.log("❌ Failed to fetch current page data");
    return;
  }

  // 🛡️ INFINITE LOOP GUARD
  // If the last update was made by this app (indicated by our semantic version message), STOP.
  const appGeneratedMessages = [
    "Auto-detected PII: Highlights & Warning Added",
    "Auto-detected PII: Added Confidential Banner"
  ];
  if (appGeneratedMessages.includes(currentPage.version?.message)) {
    console.log("🛑 Event triggered by App's own update - aborting to prevent loop");
    return;
  }

  console.log(`✅ Page retrieved: "${currentPage.title}"`);

  // Step 2: Extract Content Preview (<p> tags)
  console.log("\n🔍 Step 2: Extracting Content Preview...");
  const contentPreview = extractContentPreview(currentPage.body);

  if (!contentPreview) {
    console.log("⚠️ No Content Preview found in page");
    return;
  }

  console.log(`✅ Content Preview extracted (${contentPreview.length} characters)`);

  // Step 3: Check Content Preview for PII
  console.log("\n🚨 Step 3: Scanning Content Preview for PII...");

  // Fetch PII settings
  const piiSettings = await storage.get('pii-settings-v1');
  const previewPiiHits = detectPii(contentPreview, piiSettings);

  if (previewPiiHits.length === 0) {
    console.log("✅ No PII found in Content Preview - stopping scan");
    return;
  }

  console.log(`🚨 PII DETECTED in Content Preview!`);
  previewPiiHits.forEach(hit => {
    console.log(`   - ${hit.type}: ${hit.count} occurrence(s)`);
  });

  // Step 3.5: Classify and Quarantine
  console.log("\n🛡️ Step 3.5: Initiating Containment Protocols...");

  // Tag as Confidential
  await addPageLabels(pageId, ["confidential", "pii-detected"]);

  // Highlight PII in Content (New)
  console.log("   🖍️ Highlighting PII in content...");
  const highlightedBody = highlightPiiInContent(currentPage.body.storage.value, previewPiiHits);

  // Add Visual Colored Label AND Update Body with Highlights
  await addColoredBanner(pageId, currentPage, previewPiiHits, highlightedBody);

  // Quarantine (Restricted access) - Based on Admin Settings
  if (piiSettings?.enableQuarantine) {
    console.log("   🔒 Quarantine enabled - restricting page access...");
    const controllingUser = event?.atlassianId || currentPage.authorId;
    if (controllingUser) {
      await setPageRestrictions(pageId, controllingUser);
    } else {
      console.log("   ⚠️ Could not determine user for quarantine - skipping restrictions");
    }
  } else {
    console.log("   ℹ️ Quarantine disabled in settings - skipping page restrictions");
  }

  // Step 4: Scan Version History for PII
  console.log("\n📚 Step 4: Scanning page version history for PII...");
  const versionPiiFindings = await checkAllPageVersionsForPii(pageId);
  
  if (versionPiiFindings.length > 0) {
    console.log(`🚨 Found PII in ${versionPiiFindings.length} historical version(s)!`);
    versionPiiFindings.forEach(version => {
      console.log(`   - Version ${version.version}: ${version.piiCount} PII instance(s) - ${version.piiTypes.join(', ')}`);
    });
  } else {
    console.log("✅ No PII found in version history");
  }

  const otherPagesPii = []; // Empty array since we are skipping the scan

  // Step 5: Report all findings
  console.log("\n📊 Step 5: Compiling PII findings report...");
  await reportPiiFindings({
    currentPage,
    previewPiiHits,
    versionPiiFindings,
    otherPagesPii
  });

  console.log("\n✅ PII detection complete");
}

/* -----------------------------------------
   GET CURRENT PAGE DATA
   Fetches the current page with full content
----------------------------------------- */
async function getCurrentPageData(pageId) {
  try {
    const response = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?body-format=storage`
    );

    if (!response.ok) {
      console.log(`❌ Failed to fetch page: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.log(`❌ Error fetching page: ${error.message}`);
    return null;
  }
}

/* -----------------------------------------
   EXTRACT CONTENT PREVIEW
   Extracts <p> tags from the page body HTML
----------------------------------------- */
function extractContentPreview(body) {
  if (!body || !body.storage || !body.storage.value) {
    return null;
  }

  const html = body.storage.value;

  // Extract all <p> tags and their content
  const pTagRegex = /<p[^>]*>(.*?)<\/p>/gis;
  const matches = html.match(pTagRegex);

  if (!matches || matches.length === 0) {
    return null;
  }

  // Combine all <p> tag contents and strip HTML tags
  const combinedContent = matches.join(' ');

  // Remove HTML tags but keep text content
  const textContent = combinedContent
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')   // Replace &nbsp; with space
    .replace(/&amp;/g, '&')    // Decode &amp;
    .replace(/&lt;/g, '<')     // Decode &lt;
    .replace(/&gt;/g, '>')     // Decode &gt;
    .replace(/&quot;/g, '"')   // Decode &quot;
    .replace(/&#39;/g, "'")    // Decode &#39;
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();

  return textContent;
}


/* -----------------------------------------
   CHECK ALL PAGE VERSIONS FOR PII
   Fetches all versions of a page and checks each for PII
----------------------------------------- */
async function checkAllPageVersionsForPii(pageId) {
  const versionFindings = [];

  try {
    // Get all versions of the page
    const response = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages/${pageId}/versions`
    );

    if (!response.ok) {
      console.log(`     ⚠️ Could not fetch versions: ${response.status}`);
      return versionFindings;
    }

    const data = await response.json();
    const versions = data.results || [];

    if (versions.length === 0) {
      console.log(`     ℹ️ No versions found for this page`);
      return versionFindings;
    }

    console.log(`     📚 Found ${versions.length} version(s) - checking each...`);

    // Check each version for PII
    for (const version of versions) {
      const versionNumber = version.number;
      console.log(`       Checking version ${versionNumber}...`);

      try {
        // Fetch this specific version's content
        const versionContent = await getPageVersionContent(pageId, versionNumber);

        if (versionContent) {
          // Extract text from the version content
          const contentText = extractContentPreview(versionContent.body) ||
            stripHtmlTags(versionContent.body?.storage?.value || '');

          if (contentText) {
            // Check for PII in this version
            const piiHits = detectPii(contentText);

            if (piiHits.length > 0) {
              console.log(`       🚨 PII found in version ${versionNumber}!`);
              versionFindings.push({
                version: versionNumber,
                createdAt: version.createdAt,
                createdBy: version.createdBy?.accountId,
                piiTypes: piiHits.map(hit => hit.type),
                piiCount: piiHits.reduce((sum, hit) => sum + hit.count, 0),
                piiDetails: piiHits.map(hit => ({
                  type: hit.type,
                  count: hit.count
                }))
              });
            }
          }
        }
      } catch (error) {
        console.log(`       ⚠️ Error checking version ${versionNumber}: ${error.message}`);
      }
    }

    return versionFindings;

  } catch (error) {
    console.log(`     ❌ Error fetching versions: ${error.message}`);
    return versionFindings;
  }
}

/* -----------------------------------------
   GET PAGE VERSION CONTENT
   Fetches content for a specific version of a page
----------------------------------------- */
async function getPageVersionContent(pageId, versionNumber) {
  try {
    // Try v2 API with version parameter
    const response = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages/${pageId}?version=${versionNumber}&body-format=storage`
    );

    if (response.ok) {
      return await response.json();
    }

    // Try alternative endpoint
    const response2 = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages/${pageId}/versions/${versionNumber}?body-format=storage`
    );

    if (response2.ok) {
      return await response2.json();
    }

    return null;
  } catch (error) {
    return null;
  }
}

/* -----------------------------------------
   STRIP HTML TAGS
   Helper to extract text from HTML
----------------------------------------- */
function stripHtmlTags(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/* -----------------------------------------
   DETECT PII
   Uses regex patterns to detect various types of PII
----------------------------------------- */
/* -----------------------------------------
   DETECT PII
   Uses regex patterns + context to detect PII
----------------------------------------- */
function detectPii(text, enabledTypes) {
  if (!text) return [];

  // Default to all enabled if not provided
  const config = enabledTypes || {
    email: true,
    phone: true, // Note: Admin UI uses 'phone'
    creditCard: true,
    ssn: true,
    passport: true,
    driversLicense: true
  };

  const hits = [];
  const foundIndices = new Set(); // Track start indices to avoid double-counting overlaps

  // Helper to add hit if not overlapping
  const addHit = (match, type, contextScore = 0) => {
    if (foundIndices.has(match.index)) return; // Already claimed this span

    // For 9-digit overlaps (SSN/Passport/DL), we rely on the order of checks or context
    // We'll mark the specific indices covered by this match
    for (let i = 0; i < match[0].length; i++) {
      foundIndices.add(match.index + i);
    }

    hits.push({
      type,
      match: match[0],
      contextScore
    });
  };

  // 1. Strict SSN (XXX-XX-XXXX) - Highest Confidence
  if (config.ssn) {
    const strictSsnRegex = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;
    for (const match of text.matchAll(strictSsnRegex)) {
      addHit(match, 'ssn', 10);
    }
  }

  // 2. Email (Distinct)
  if (config.email) {
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    for (const match of text.matchAll(emailRegex)) {
      addHit(match, 'email', 10);
    }
  }

  // 3. Phone (Distinct-ish)
  if (config.phone) {
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    for (const match of text.matchAll(phoneRegex)) {
      // Basic filter for potential overlaps with 10-digit IDs, but phone usually has formatting
      if (validatePhone(match[0])) {
        addHit(match, 'phone', 5);
      }
    }
  }

  // 4. Credit Card (13-16 digits)
  if (config.creditCard) {
    const ccRegex = /\b(?:\d[ -]?){13,16}\b/g;
    for (const match of text.matchAll(ccRegex)) {
      if (validateCreditCard(match[0])) {
        addHit(match, 'creditCard', 10);
      }
    }
  }

  // 5. Ambiguous 9-Digit Numbers (Raw SSN vs Passport vs DL)
  // We use Context Lookaround to decide
  const nineDigitRegex = /\b\d{9}\b/g;
  for (const match of text.matchAll(nineDigitRegex)) {
    // Check overlapping
    const isOverlapping = Array.from({ length: 9 }).some((_, i) => foundIndices.has(match.index + i));
    if (isOverlapping) continue;

    const context = getContext(text, match.index, match[0].length);
    const lowerContext = context.toLowerCase();

    // Check specific types based on config
    if (config.passport && lowerContext.includes('passport')) {
      addHit(match, 'passport', 10);
    } else if (config.ssn && (lowerContext.includes('social') || lowerContext.includes('ssn') || lowerContext.includes('security'))) {
      addHit(match, 'ssn', 9); // High confidence due to keyword
    } else if (config.driversLicense && (lowerContext.includes('license') || lowerContext.includes('driving') || lowerContext.includes('driver'))) {
      addHit(match, 'driversLicense', 8);
    } else if (config.ssn) {
      // Only default to SSN if SSN is enabled
      addHit(match, 'ssn', 1); // Low confidence
    } else if (config.passport) {
      // Fallback to passport if SSN disabled
      addHit(match, 'passport', 1);
    }
  }

  // 6. Alphanumeric IDs (Drivers License usually)
  if (config.driversLicense) {
    const alphaNumRegex = /\b[A-Z0-9]{6,12}\b/g;
    for (const match of text.matchAll(alphaNumRegex)) {
      // Check overlap
      const isOverlapping = checkOverlap(match.index, match[0].length, foundIndices);
      if (isOverlapping) continue;

      // Filter out common false positives (like 'Phone', 'Email' parts, or simple words)
      if (/^[A-Z]+$/.test(match[0])) continue; // Skip all letters (words)

      // Only count if it has digits (smart DL check) OR explicit context
      const hasDigits = /\d/.test(match[0]);
      const context = getContext(text, match.index, match[0].length).toLowerCase();

      if (context.includes('license') || context.includes('driver') || context.includes('dl')) {
        addHit(match, 'driversLicense', 10);
      } else if (hasDigits && /[A-Z]/.test(match[0])) {
        // Mixed alpha-numeric is strong indicator of ID
        addHit(match, 'driversLicense', 5);
      }
    }
  }

  // Aggregate results by type
  return aggregateHits(hits);
}

function validatePhone(str) {
  // Simple check: must have at least 10 digits
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10;
}

function validateCreditCard(str) {
  const digits = str.replace(/[-\s]/g, '');
  return digits.length >= 13 && digits.length <= 16;
}

function getContext(text, index, length) {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return text.substring(start, end);
}

function checkOverlap(index, length, foundIndices) {
  for (let i = 0; i < length; i++) {
    if (foundIndices.has(index + i)) return true;
  }
  return false;
}

function aggregateHits(hits) {
  const summary = {};
  hits.forEach(h => {
    if (!summary[h.type]) {
      summary[h.type] = { type: h.type, count: 0, matches: [] };
    }
    summary[h.type].count++;
    summary[h.type].matches.push(h.match);
  });
  return Object.values(summary);
}


/* -----------------------------------------
   REPORT PII FINDINGS
   Compiles and sends PII findings report
----------------------------------------- */
async function reportPiiFindings({ currentPage, previewPiiHits, versionPiiFindings = [], otherPagesPii }) {
  const report = {
    timestamp: new Date().toISOString(),
    currentPage: {
      id: currentPage.id,
      title: currentPage.title,
      spaceKey: currentPage.spaceId,
      version: currentPage.version?.number,
      piiFound: previewPiiHits.map(hit => ({
        type: hit.type,
        count: hit.count,
        examples: hit.matches.slice(0, 3).map(m => maskSensitiveData(m, hit.type))
      })),
      versionHistory: versionPiiFindings.map(version => ({
        version: version.version,
        createdAt: version.createdAt,
        createdBy: version.createdBy,
        piiTypes: version.piiTypes,
        piiCount: version.piiCount,
        piiDetails: version.piiDetails
      }))
    },
    otherPagesWithPii: otherPagesPii.map(page => ({
      pageId: page.pageId,
      pageTitle: page.pageTitle,
      titlePii: page.titlePii.map(hit => ({
        type: hit.type,
        count: hit.count
      })),
      contentPii: Array.isArray(page.contentPii) && page.contentPii.length > 0 && page.contentPii[0].version
        ? page.contentPii.map(version => ({
          version: version.version,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          piiTypes: version.piiTypes,
          piiCount: version.piiCount,
          piiDetails: version.piiDetails
        }))
        : page.contentPii.map(hit => ({
          type: hit.type,
          count: hit.count
        })),
      versionsWithPii: page.versionsWithPii || []
    })),
    summary: {
      totalPiiTypesInPreview: previewPiiHits.length,
      totalVersionsWithPii: versionPiiFindings.length,
      totalOtherPagesWithPii: otherPagesPii.length,
      totalPiiInstances: previewPiiHits.reduce((sum, hit) => sum + hit.count, 0) +
        versionPiiFindings.reduce((sum, v) => sum + v.piiCount, 0) +
        otherPagesPii.reduce((sum, page) => {
          const titlePiiCount = page.titlePii.reduce((s, h) => s + h.count, 0);
          const contentPiiCount = Array.isArray(page.contentPii) && page.contentPii.length > 0 && page.contentPii[0].version
            ? page.contentPii.reduce((s, v) => s + v.piiCount, 0)
            : page.contentPii.reduce((s, h) => s + h.count, 0);
          return sum + titlePiiCount + contentPiiCount;
        }, 0)
    }
  };

  // Log the report
  console.log("\n📊 PII DETECTION REPORT:");
  console.log(`   Current Page: "${report.currentPage.title}"`);
  console.log(`   PII Types in Preview: ${report.summary.totalPiiTypesInPreview}`);
  console.log(`   Versions with PII: ${report.summary.totalVersionsWithPii}`);
  console.log(`   Other Pages with PII: ${report.summary.totalOtherPagesWithPii}`);
  console.log(`   Total PII Instances: ${report.summary.totalPiiInstances}`);

  if (versionPiiFindings.length > 0) {
    console.log("\n   Version History with PII:");
    versionPiiFindings.forEach(version => {
      console.log(`     - Version ${version.version} (${version.piiCount} PII instances): ${version.piiTypes.join(', ')}`);
    });
  }

  if (otherPagesPii.length > 0) {
    console.log("\n   Other Pages with PII:");
    otherPagesPii.forEach(page => {
      console.log(`     - "${page.pageTitle}" (ID: ${page.pageId})`);
      if (page.titlePii.length > 0) {
        console.log(`       Title PII: ${page.titlePii.map(h => `${h.type} (${h.count})`).join(', ')}`);
      }
      if (page.contentPii.length > 0) {
        // Check if this is version-based PII data
        if (page.contentPii[0].version) {
          console.log(`       Versions with PII:`);
          page.contentPii.forEach(version => {
            console.log(`         - Version ${version.version} (${version.piiCount} PII instances): ${version.piiTypes.join(', ')}`);
          });
        } else {
          console.log(`       Content PII: ${page.contentPii.map(h => `${h.type} (${h.count})`).join(', ')}`);
        }
      }
    });
  }

  console.log("\n✅ PII findings logged. No external report sent.");
  console.log("   Report data:", JSON.stringify(report, null, 2));
}


/* -----------------------------------------
   ADD PAGE LABELS
   Adds classification labels to the page
----------------------------------------- */
async function addPageLabels(pageId, labels) {
  try {
    const payload = labels.map(name => ({
      prefix: "global",
      name: name
    }));

    const response = await api.asApp().requestConfluence(
      route`/wiki/rest/api/content/${pageId}/label`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      console.log(`   ✅ Added labels: ${labels.join(", ")}`);
    } else {
      console.log(`   ❌ Failed to add labels: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error adding labels: ${error.message}`);
  }
}



/* -----------------------------------------
   ADD COLORED BANNER & HIGHLIGHT PII
   Prepends a Red "CONFIDENTIAL" Status Macro
   AND Updates body with highlighted PII
----------------------------------------- */
async function addColoredBanner(pageId, currentPage, piiHits, newBodyContent) {
  try {
    const currentBody = newBodyContent || currentPage.body?.storage?.value || "";

    // Check if banner already exists to avoid duplication, but we might need to update the list
    // For simplicity, we'll check if our specifc PII list is already there, but strictly
    // avoiding loops is handled by the check below.
    // However, if we are highlighting, we want to overwrite the body anyway.

    // Construct the detailed list of PII found
    let piiListHtml = '';
    if (piiHits && piiHits.length > 0) {
      piiListHtml = '<ul>';
      piiHits.forEach(hit => {
        piiListHtml += `<li><strong>${hit.type}</strong>: ${hit.count} detected</li>`;
      });
      piiListHtml += '</ul>';
    }

    // Status Macro Storage Format with Details
    const statusMacro = `
      <p>
        <ac:structured-macro ac:name="status" ac:schema-version="1">
          <ac:parameter ac:name="title">CONFIDENTIAL</ac:parameter>
          <ac:parameter ac:name="colour">Red</ac:parameter>
        </ac:structured-macro>
        <strong> PII DETECTED - PLEASE REVIEW</strong>
      </p>
      <p>The following sensitive information was detected and highlighted:</p>
      ${piiListHtml}
      <hr/>`;

    // If we already have the banner, we might want to replace the old one, but regex replacement of HTML block is risky.
    // MVP: Prepend new banner. If an old one exists, it will be pushed down. 
    // Ideally we would strip old banners first.

    // Simple dedupe: if the EXACT text "PII DETECTED - PLEASE REVIEW" is at the start, we skip adding it again? 
    // No, because we want to update the highlighting.
    // So we will try to strip the previous "header" if it exists.

    let finalBody = currentBody;
    // VERY Basic cleanup of previous runs (optional/risky without full parser)
    // finalBody = finalBody.replace(/<ac:structured-macro.*?CONFIDENTIAL.*?<\/p>/s, ''); 

    // Combine
    finalBody = statusMacro + finalBody;

    const response = await api.asApp().requestConfluence(
      route`/wiki/api/v2/pages/${pageId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pageId,
          status: "current",
          title: currentPage.title,
          body: {
            representation: "storage",
            value: finalBody
          },
          version: {
            number: currentPage.version.number + 1,
            message: "Auto-detected PII: Highlights & Warning Added"
          }
        })
      }
    );

    if (response.ok) {
      console.log("   🚩 Added RED 'CONFIDENTIAL' banner and highlighted content");
    } else {
      console.log(`   ❌ Failed to add banner: ${response.status}`);
    }

  } catch (error) {
    console.log(`   ❌ Error adding banner: ${error.message}`);
  }
}

/* -----------------------------------------
   HIGHLIGHT PII IN CONTENT
   Wraps detected PII matches in styled spans
----------------------------------------- */
function highlightPiiInContent(htmlContent, piiHits) {
  if (!htmlContent || !piiHits || piiHits.length === 0) return htmlContent;

  let highlighted = htmlContent;

  // Iterate through hits and replace occurrences
  // CAUTION: This simple replace approach matches text even inside HTML attributes. 
  // To be safer, we should only replace safely. 
  // For this MVP, we will try to avoid breaking tags by ensuring we don't match things inside < > brackets.
  // But JS regex lookbehind is limited in some environments.

  // Safer Iteration: We use the EXACT matches found by the detector.
  // Those matches were found on stripped text, so mapping back to HTML is hard.

  // Alternative: Re-run regex on the HTML string but ignore tags.
  // We can split by tags, process text parts, and join back.

  const parts = highlighted.split(/(<[^>]*>)/g); // Split by tags

  const newParts = parts.map(part => {
    // If it starts with <, it's a tag (or empty), return as is
    if (part.startsWith('<')) return part;

    let textPart = part;

    piiHits.forEach(hit => {
      // Get the raw match text (e.g. the specific email or SSN string)
      // We iterate over the *matches* inside the hit object if we preserved them. 
      // Currently piiHits is just { type, count, matches: [] } if using aggregateHits

      if (hit.matches && hit.matches.length > 0) {
        hit.matches.forEach(matchText => {
          // Escape special regex chars in the matchText
          const escapedMatch = matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Replace globally in this text node
          const regex = new RegExp(escapedMatch, 'g');
          const replacement = `<span style="background-color: #fffae6; border: 1px solid #ffeb3b; padding: 1px 2px;" title="${hit.type.toUpperCase()} Detected">${matchText}</span>`;
          textPart = textPart.replace(regex, replacement);
        });
      }
    });
    return textPart;
  });

  return newParts.join('');
}

/* -----------------------------------------
   MASK SENSITIVE DATA
   Masks sensitive data for safe logging
----------------------------------------- */
function maskSensitiveData(data, type) {
  if (type === 'ssn') {
    const cleaned = data.replace(/[-\s]/g, '');
    return `XXX-XX-${cleaned.slice(-4)}`;
  }

  if (type === 'creditCard') {
    const cleaned = data.replace(/[-\s]/g, '');
    return `XXXX-XXXX-XXXX-${cleaned.slice(-4)}`;
  }

  if (data.length > 4) {
    return `${data.slice(0, 2)}***${data.slice(-2)}`;
  }

  return '***';
}


/* -----------------------------------------
   SET PAGE RESTRICTIONS (QUARANTINE)
   Restricts read/update access to a specific user
----------------------------------------- */
async function setPageRestrictions(pageId, accountId) {
  try {
    // We must include the App itself in the restrictions, otherwise the API rejects the request
    // preventing the app from "locking itself out"
    let appAccountId = null;
    try {
      const meResponse = await api.asApp().requestConfluence(route`/wiki/rest/api/user/current`);
      if (meResponse.ok) {
        const me = await meResponse.json();
        appAccountId = me.accountId;
      }
    } catch (e) {
      console.log(`   ⚠️ Could not fetch App user details: ${e.message}`);
    }

    const usersToAllow = [{ type: "known", accountId: accountId }];

    // Add the App user if we found it
    if (appAccountId && appAccountId !== accountId) {
      usersToAllow.push({ type: "known", accountId: appAccountId });
    }

    const body = [
      {
        operation: "read",
        restrictions: {
          user: usersToAllow,
          group: []
        }
      },
      {
        operation: "update",
        restrictions: {
          user: usersToAllow,
          group: []
        }
      }
    ];

    const response = await api.asApp().requestConfluence(
      route`/wiki/rest/api/content/${pageId}/restriction`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    if (response.ok) {
      console.log(`   🔒 Page QUARANTINED (Restricted to user: ${accountId} + App)`);
    } else {
      console.log(`   ❌ Failed to quarantine page: ${response.status}`);
      const text = await response.text();
      console.log(`      Error: ${text}`);
    }
  } catch (error) {
    console.log(`   ❌ Error quarantining page: ${error.message}`);
  }
}


// Helper: Check Group Membership
async function isUserInGroup(accountId, groupName) {
  try {
    let nextUrl = route`/wiki/api/v2/users/${accountId}/groups`;

    // Simple first-page check for MVP
    const res = await api.asApp().requestConfluence(nextUrl);
    if (!res.ok) return false;

    const data = await res.json();
    const hit = data.results.find(g => g.name === groupName);
    return !!hit;
  } catch (e) {
    console.error("Group check failed", e);
    return false;
  }
}
