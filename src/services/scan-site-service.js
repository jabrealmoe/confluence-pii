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
     * Scan a batch of pages (Parallelized + API V2)
     */
    async scanBatch(start, limit = 10) {
        // Recommendation 2: Use API V2 for leaner payloads and speed
        const response = await api.asApp().requestConfluence(
            route`/wiki/api/v2/pages?limit=${limit}&offset=${start}&body-format=storage`
        );
        
        if (!response.ok) return { results: [], next: null };
        const data = await response.json();
        const pages = data.results || [];
        const settings = await configService.getSettings();

        const batchResults = {
            pagesScanned: pages.length,
            findings: [],
            stats: { active: 0, quarantined: 0, hitsByType: {} }
        };

        // Recommendation 1: Parallel Batch Processing
        await Promise.all(pages.map(async (page) => {
            const content = piiDetectionService.extractTextContent(page.body);
            // Recommendation 5: Uses optimized regex
            const hits = detectPii(content, settings);
            
            // Check for quarantine (using V2 labels as a proxy for speed, or just results)
            // Note: restrictions are still best checked via V1 or checking restrictions object if present
            const isQuarantined = false; // Placeholder for V2 restriction check if available

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

        return batchResults;
    }
}

export const siteScanService = new SiteScanService();
