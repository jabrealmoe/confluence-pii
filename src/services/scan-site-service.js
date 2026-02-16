import api, { route } from "@forge/api";
import { piiDetectionService } from "./pii-service";
import { configService } from "./config-service";
import { detectPii } from "../utils/pii-detector";

class SiteScanService {
    /**
     * Get total page count using search
     */
    async getPageCount() {
        const response = await api.asApp().requestConfluence(
            route`/wiki/rest/api/content?type=page&limit=0`
        );
        if (!response.ok) throw new Error("Failed to fetch page count");
        const data = await response.json();
        return data.size || 0;
    }

    /**
     * Scan a batch of pages
     */
    async scanBatch(start, limit = 10) {
        const settings = await configService.getSettings();
        const response = await api.asApp().requestConfluence(
            route`/wiki/rest/api/content?type=page&start=${start}&limit=${limit}&expand=body.storage,restrictions.read.group`
        );
        
        if (!response.ok) return { results: [], next: null };
        const data = await response.json();
        const pages = data.results || [];

        const batchResults = {
            pagesScanned: pages.length,
            findings: [],
            stats: {
                active: 0,
                quarantined: 0,
                hitsByType: {}
            }
        };

        for (const page of pages) {
            const content = piiDetectionService.extractTextContent(page.body);
            const hits = detectPii(content, settings);
            
            const isQuarantined = page.restrictions?.read?.group?.results?.length > 0;
            
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
        }

        return batchResults;
    }
}

export const siteScanService = new SiteScanService();
