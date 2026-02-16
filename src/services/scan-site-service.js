import api, { route } from "@forge/api";
import { piiDetectionService } from "./pii-service";
import { configService } from "./config-service";
import { detectPii } from "../utils/pii-detector";

class SiteScanService {
    /**
     * Get total page count using search
     */
    async getPageCount() {
        try {
            const response = await api.asApp().requestConfluence(
                route`/wiki/rest/api/search?cql=type=page&limit=0`
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Page count fetch failed: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Failed to fetch page count: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`📊 Found total pages: ${data.totalSize}`);
            return data.totalSize || 0;
        } catch (error) {
            console.error(`❌ Site analysis initialization error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Scan a batch of pages using V2 API with cursor-based pagination.
     * @param {string|null} cursor - The cursor for the next page of results (null for the first batch).
     * @param {number} limit - Number of pages to fetch per batch.
     * @returns {Object} - { stats, findings, nextCursor }
     */
    async scanBatch(cursor, limit = 10) {
        let url;
        if (cursor) {
            // Cursor already contains the full path from the _links.next field
            url = route`/wiki/api/v2/pages?limit=${limit}&body-format=storage&cursor=${cursor}`;
        } else {
            url = route`/wiki/api/v2/pages?limit=${limit}&body-format=storage`;
        }

        const response = await api.asApp().requestConfluence(url);

        if (!response.ok) {
            console.error(`❌ Batch fetch failed: ${response.status}`);
            return { stats: { active: 0, quarantined: 0, hitsByType: {} }, findings: [], nextCursor: null, pagesScanned: 0 };
        }
        const data = await response.json();
        const pages = data.results || [];

        // Extract cursor from the _links.next URL if present
        let nextCursor = null;
        if (data._links && data._links.next) {
            const nextUrl = data._links.next;
            const cursorMatch = nextUrl.match(/cursor=([^&]+)/);
            if (cursorMatch) {
                nextCursor = decodeURIComponent(cursorMatch[1]);
            }
        }

        const settings = await configService.getSettings();

        // Diagnostic: Log active detection rules
        const activeRules = ['email', 'phone', 'creditCard', 'ssn', 'passport', 'driversLicense']
            .filter(r => settings[r]);
        console.log(`🔎 Batch: ${pages.length} pages, active rules: [${activeRules.join(', ')}], hasNext: ${!!nextCursor}`);

        const batchResults = {
            pagesScanned: pages.length,
            findings: [],
            stats: { active: 0, quarantined: 0, hitsByType: {} },
            nextCursor
        };

        // Parallel Batch Processing
        await Promise.all(pages.map(async (page) => {
            const content = piiDetectionService.extractTextContent(page.body);
            const hits = detectPii(content, settings);
            
            // Diagnostic: Log first batch with content details
            if (!cursor) {
                const contentPreview = content ? content.substring(0, 80) : '(empty)';
                console.log(`  📄 Page "${page.title}" [${page.id}]: content=${content.length} chars, hits=${hits.length}, preview="${contentPreview}"`);
            }

            const isQuarantined = false;

            if (isQuarantined) batchResults.stats.quarantined++;
            else batchResults.stats.active++;

            if (hits.length > 0) {
                hits.forEach(hit => {
                    batchResults.stats.hitsByType[hit.type] = (batchResults.stats.hitsByType[hit.type] || 0) + hit.count;
                });
                batchResults.findings.push({
                    id: page.id,
                    title: page.title,
                    isQuarantined,
                    hits: hits.map(h => ({ type: h.type, count: h.count }))
                });
            }
        }));

        console.log(`✅ Batch complete: ${batchResults.findings.length} pages with PII, hitsByType=${JSON.stringify(batchResults.stats.hitsByType)}`);
        return batchResults;
    }
}

export const siteScanService = new SiteScanService();
