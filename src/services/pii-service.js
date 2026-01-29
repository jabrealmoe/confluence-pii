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
   * Scan historical versions
   */
  async scanHistoricalVersions(pageId, limit = 10) {
    const versionFindings = [];
    
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}/versions?limit=${limit}`
      );

      if (!response.ok) return versionFindings;

      const data = await response.json();
      const versions = data.results || [];

      for (const version of versions) {
        const versionData = await pageService.getVersionData(pageId, version.number);
        if (versionData) {
          const content = this.extractTextContent(versionData.body);
          const hits = detectPii(content);
          
          if (hits.length > 0) {
            versionFindings.push({
              version: version.number,
              piiCount: hits.reduce((sum, h) => sum + h.count, 0),
              piiTypes: hits.map(h => h.type)
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error in scanHistoricalVersions: ${error.message}`);
    }

    return versionFindings;
  }
}

export const piiDetectionService = new PiiDetectionService();
