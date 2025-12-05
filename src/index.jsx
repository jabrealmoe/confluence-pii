import api, { route } from "@forge/api";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function run(event, context) {
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
  const previewPiiHits = detectPii(contentPreview);
  
  if (previewPiiHits.length === 0) {
    console.log("✅ No PII found in Content Preview - stopping scan");
    return;
  }
  
  console.log(`🚨 PII DETECTED in Content Preview!`);
  previewPiiHits.forEach(hit => {
    console.log(`   - ${hit.type}: ${hit.count} occurrence(s)`);
  });
  
  // Step 4: If PII found, scan other pages in the space
  console.log("\n🔎 Step 4: PII found in preview - scanning other pages in space...");
  
  const spaceId = currentPage.spaceId || event?.content?.space?.id;
  
  if (!spaceKey && !spaceId) {
    console.log("⚠️ No space key or ID available - cannot scan other pages");
    await reportPiiFindings({
      currentPage,
      previewPiiHits,
      otherPagesPii: []
    });
    return;
  }
  
  const otherPagesPii = await scanOtherPagesInSpace(spaceKey || null, spaceId || null, pageId);
  
  // Step 5: Report all findings
  console.log("\n📊 Step 5: Compiling PII findings report...");
  await reportPiiFindings({
    currentPage,
    previewPiiHits,
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
   SCAN OTHER PAGES IN SPACE
   Scans titles and content of other pages in the same space
----------------------------------------- */
async function scanOtherPagesInSpace(spaceKey, spaceId, excludePageId) {
  console.log(`🔍 Fetching all pages in space (key: ${spaceKey || 'N/A'}, ID: ${spaceId || 'N/A'})`);
  
  const allPiiFindings = [];
  
  try {
    // Try multiple API approaches for getting pages in space
    let pages = [];
    
    // Approach 1: Try with space key directly
    if (spaceKey) {
      try {
        console.log(`   Trying API endpoint: /wiki/api/v2/spaces/${spaceKey}/pages`);
        const response = await api.asApp().requestConfluence(
          route`/wiki/api/v2/spaces/${spaceKey}/pages?limit=100`
        );
        
        if (response.ok) {
          const data = await response.json();
          pages = data.results || [];
          console.log(`   ✅ Success with space key approach (found ${pages.length} pages)`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with space key approach: ${error.message}`);
      }
    }
    
    // Approach 2: If space key starts with ~, try without the ~
    if (pages.length === 0 && spaceKey && spaceKey.startsWith('~')) {
      try {
        const spaceKeyWithoutTilde = spaceKey.substring(1);
        console.log(`   Trying API endpoint without ~: /wiki/api/v2/spaces/${spaceKeyWithoutTilde}/pages`);
        const response2 = await api.asApp().requestConfluence(
          route`/wiki/api/v2/spaces/${spaceKeyWithoutTilde}/pages?limit=100`
        );
        
        if (response2.ok) {
          const data = await response2.json();
          pages = data.results || [];
          console.log(`   ✅ Success without ~ prefix (found ${pages.length} pages)`);
        } else {
          const errorText = await response2.text();
          console.log(`   ❌ Failed: ${response2.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error without ~ prefix: ${error.message}`);
      }
    }
    
    // Approach 3: Try using space ID instead of key
    if (pages.length === 0 && spaceId) {
      try {
        console.log(`   Trying with space ID: /wiki/api/v2/spaces/${spaceId}/pages`);
        const response3 = await api.asApp().requestConfluence(
          route`/wiki/api/v2/spaces/${spaceId}/pages?limit=100`
        );
        
        if (response3.ok) {
          const data = await response3.json();
          pages = data.results || [];
          console.log(`   ✅ Success with space ID (found ${pages.length} pages)`);
        } else {
          const errorText = await response3.text();
          console.log(`   ❌ Failed: ${response3.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with space ID: ${error.message}`);
      }
    }
    
    // Approach 4: Try CQL search as last resort
    if (pages.length === 0 && spaceKey) {
      try {
        console.log(`   Trying CQL search: space=${spaceKey}`);
        const response4 = await api.asApp().requestConfluence(
          route`/wiki/rest/api/content/search?cql=space="${spaceKey}"&limit=100`
        );
        
        if (response4.ok) {
          const data = await response4.json();
          pages = data.results || [];
          console.log(`   ✅ Success with CQL search (found ${pages.length} pages)`);
        } else {
          const errorText = await response4.text();
          console.log(`   ❌ CQL search failed: ${response4.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with CQL search: ${error.message}`);
      }
    }
    
    if (pages.length === 0) {
      console.log(`⚠️ Could not fetch pages from space - continuing without scanning other pages`);
      return allPiiFindings;
    }
    
    console.log(`✅ Found ${pages.length} pages in space`);
    
    // Filter out the current page
    const otherPages = pages.filter(page => page.id !== excludePageId);
    console.log(`📋 Scanning ${otherPages.length} other pages...`);
    
    // Scan each page
    for (const page of otherPages) {
      console.log(`\n   Checking page: "${page.title}" (ID: ${page.id})`);
      
      const pageFindings = {
        pageId: page.id,
        pageTitle: page.title,
        titlePii: [],
        contentPii: []
      };
      
      // Check title for PII
      const titlePii = detectPii(page.title);
      if (titlePii.length > 0) {
        console.log(`   🚨 PII found in TITLE!`);
        pageFindings.titlePii = titlePii;
      }
      
      // Check all versions of the page for PII
      console.log(`   📚 Checking all versions of this page...`);
      const versionPiiFindings = await checkAllPageVersionsForPii(page.id);
      
      if (versionPiiFindings.length > 0) {
        console.log(`   🚨 PII found in ${versionPiiFindings.length} version(s)!`);
        pageFindings.contentPii = versionPiiFindings;
        pageFindings.versionsWithPii = versionPiiFindings.map(v => ({
          version: v.version,
          piiTypes: v.piiTypes,
          piiCount: v.piiCount
        }));
      }
      
      // Only add to findings if PII was found
      if (pageFindings.titlePii.length > 0 || pageFindings.contentPii.length > 0) {
        allPiiFindings.push(pageFindings);
      }
    }
    
    console.log(`\n✅ Scan complete. Found PII in ${allPiiFindings.length} other pages`);
    return allPiiFindings;
    
  } catch (error) {
    console.log(`❌ Error scanning other pages: ${error.message}`);
    return allPiiFindings;
  }
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
function detectPii(text) {
  if (!text) return [];
  
  const patterns = {
    // SSN: 9 digits in format XXX-XX-XXXX or XXX XX XXXX or XXXXXXXXX
    ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    
    // Email addresses
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Phone numbers: various formats
    phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    
    // Credit card numbers: 13-16 digits
    creditCard: /\b(?:\d[ -]?){13,16}\b/g,
    
    // US Passport numbers: 9 digits
    passport: /\b\d{9}\b/g,
    
    // Driver's License: alphanumeric pattern
    driversLicense: /\b[A-Z0-9]{6,12}\b/g,
    
    // IP addresses (IPv4)
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  };
  
  const hits = [];
  
  for (const [type, regex] of Object.entries(patterns)) {
    regex.lastIndex = 0;
    const matches = text.match(regex);
    if (matches) {
      const validMatches = filterFalsePositives(matches, type, text);
      if (validMatches.length > 0) {
        hits.push({ 
          type, 
          matches: validMatches,
          count: validMatches.length 
        });
      }
    }
  }
  
  return hits;
}

/* -----------------------------------------
   FILTER FALSE POSITIVES
   Removes matches that are likely not actual PII
----------------------------------------- */
function filterFalsePositives(matches, type, fullText) {
  return matches.filter(match => {
    if (type === 'ssn') {
      return /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/.test(match.trim());
    }
    
    if (type === 'creditCard') {
      const digits = match.replace(/[-\s]/g, '');
      return digits.length >= 13 && digits.length <= 16;
    }
    
    if (type === 'ipAddress') {
      const octets = match.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return true;
  });
}

/* -----------------------------------------
   REPORT PII FINDINGS
   Compiles and sends PII findings report
----------------------------------------- */
async function reportPiiFindings({ currentPage, previewPiiHits, otherPagesPii }) {
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
      totalOtherPagesWithPii: otherPagesPii.length,
      totalPiiInstances: previewPiiHits.reduce((sum, hit) => sum + hit.count, 0) +
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
  console.log(`   Other Pages with PII: ${report.summary.totalOtherPagesWithPii}`);
  console.log(`   Total PII Instances: ${report.summary.totalPiiInstances}`);
  
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
  
  // Send to n8n if webhook URL is configured
  if (N8N_WEBHOOK_URL) {
    console.log("\n📨 Sending report to n8n...");
    await callN8N(report);
  } else {
    console.log("\n⚠️ N8N_WEBHOOK_URL not configured - skipping webhook call");
    console.log("   Report data:", JSON.stringify(report, null, 2));
  }
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
   CALL n8n WORKFLOW
   Sends payload to n8n webhook
----------------------------------------- */
async function callN8N(payload) {
  try {
    console.log(`   Webhook URL: ${N8N_WEBHOOK_URL.substring(0, 50)}...`);
    
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Forge-Confluence-PII-Detector"
      },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`✅ n8n webhook called successfully (${response.status})`);
      if (responseText) {
        console.log(`   Response: ${responseText.substring(0, 200)}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ n8n webhook call failed: ${response.status} ${response.statusText}`);
      console.log(`   Error details: ${errorText.substring(0, 300)}`);
      
      // Log payload size for debugging
      const payloadSize = JSON.stringify(payload).length;
      console.log(`   Payload size: ${payloadSize} bytes`);
    }
  } catch (error) {
    console.log(`❌ Error calling n8n webhook: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.substring(0, 300)}`);
    }
  }
}
