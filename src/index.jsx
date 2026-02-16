import api, { route, storage } from "@forge/api";
import { piiDetectionService } from "./services/pii-service";
import { pageService } from "./services/page-service";
import { configService } from "./services/config-service";
import { notificationService } from "./services/notification-service";
import { classificationService } from "./services/classification-service";
import { detectPii } from "./utils/pii-detector";



export async function run(event) {
  const pageId = event?.content?.id;
  if (!pageId) return;

  // 🛡️ DEBOUNCE GUARD
  const lastScanKey = `last-scan-${pageId}`;
  const lastScanTime = await storage.get(lastScanKey);
  const now = Date.now();
  if (lastScanTime && now - lastScanTime < 5000) return;
  await storage.set(lastScanKey, now);

  console.log(`🚀 Scanning page ${pageId}...`);

  try {
    const settings = await configService.getSettings();
    const findings = await piiDetectionService.scanPage(pageId, settings);
    
    // 🔒 CLASSIFICATION DETECTION
    const pageData = findings.pageData || await pageService.getPage(pageId);
    const classification = await classificationService.detectClassification(
      pageData.body.storage.value
    );
    
    if (classification && classification.id !== 'unclassified') {
      console.log(`🔒 Page classified as: ${classification.name}`);
      
      // Add classification label
      const classLabel = classificationService.getClassificationLabel(classification);
      await pageService.addLabels(pageId, [
        classLabel,
        classification.name.toLowerCase().replace(/\s+/g, '-')
      ]);
    }

    if (findings.detected) {
      console.log(`🚨 PII detected in ${pageId}`);
      
      // 1. Tag page
      await pageService.addLabels(pageId, ["confidential", "pii-detected"]);
      
      // 2. Add visual banner & highlight
      const highlightedBody = notificationService.highlightPiiInContent(findings.pageData.body.storage.value, findings.hits);
      await notificationService.addColoredBanner(pageId, findings.pageData, findings.hits, highlightedBody);
      
      // 3. Quarantine if enabled
      if (settings.enableQuarantine) {
        const authorId = event?.atlassianId || findings.pageData.authorId;
        await pageService.setRestrictions(pageId, authorId);
      }

      // 4. Scan historical versions (if enabled)
      let versionFindings = [];
      if (settings.enableHistoricalScan) {
        console.log(`🔍 Scanning historical versions for page ${pageId}...`);
        versionFindings = await piiDetectionService.scanHistoricalVersions(pageId, 10);
      }
      
      // 5. Final Report
      await notificationService.reportFindings({
        pageId,
        hits: findings.hits,
        versionFindings
      });
    }
  } catch (error) {
    console.error(`❌ Critical failure in scan: ${error.message}`);
  }
}

/* -----------------------------------------
   UTILITIES & HELPERS
----------------------------------------- */

