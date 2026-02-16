import api, { route } from "@forge/api";
import { detectPii } from "../utils/pii-detector";
import { pageService } from "./page-service";

class PiiDetectionService {
  /**
   * Main scan function for a page
   */
  async scanPage(pageId, settings) {
    const findings = {
      detected: false,
      hits: [],
      versionFindings: []
    };

    // 1. Get current page
    const pageData = await pageService.getPageData(pageId);
    if (!pageData) return findings;

    // 2. Scan content preview
    const content = this.extractTextContent(pageData.body);
    const hits = detectPii(content, settings);

    if (hits.length > 0) {
      findings.detected = true;
      findings.hits = hits;
      findings.pageData = pageData;
    }

    return findings;
  }

  /**
   * Helper to extract text from ADF or Storage body
   */
  extractTextContent(body) {
    if (!body || !body.storage || !body.storage.value) return "";
    // Basic extraction - could be improved with proper ADF parsing if needed
    return body.storage.value.replace(/<[^>]*>?/gm, '');
  }

  /**
   * Scan historical versions (Incremental Optimization)
   */
  async scanHistoricalVersions(pageId, limit = 10) {
    // Recommendation 4: Incremental Scanning
    const lastScannedVersion = await pageService.getPageProperty(pageId, 'last-historical-scan-version') || 0;
    const versionFindings = [];
    
    try {
      // Recommendation 2: API V2
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}/versions?limit=${limit}&order-by=version-desc`
      );

      if (!response.ok) return versionFindings;

      const data = await response.json();
      const versions = data.results || [];
      
      // Filter for versions we haven't scanned yet
      const newVersions = versions.filter(v => v.number > lastScannedVersion);
      
      if (newVersions.length === 0) {
          console.log(`⏩ No new versions to scan for page ${pageId}`);
          return [];
      }

      console.log(`🔍 Scanning ${newVersions.length} new versions for page ${pageId}`);

      // Recommendation 1: Parallel processing (within the limits of the scan)
      const scanResults = await Promise.all(newVersions.map(async (version) => {
        const versionData = await pageService.getVersionData(pageId, version.number);
        if (versionData) {
          const content = this.extractTextContent(versionData.body);
          const hits = detectPii(content);
          
          if (hits.length > 0) {
            return {
              version: version.number,
              piiCount: hits.reduce((sum, h) => sum + h.count, 0),
              piiTypes: hits.map(h => h.type)
            };
          }
        }
        return null;
      }));

      versionFindings.push(...scanResults.filter(r => r !== null));

      // Update metadata with latest scanned version
      const latestVersion = Math.max(...versions.map(v => v.number));
      await pageService.setPageProperty(pageId, 'last-historical-scan-version', latestVersion);

    } catch (error) {
      console.error(`❌ Error in scanHistoricalVersions: ${error.message}`);
    }

    return versionFindings;
  }
}

export const piiDetectionService = new PiiDetectionService();
