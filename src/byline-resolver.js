import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';

const resolver = new Resolver();

resolver.define('getPagePiiStatus', async (req) => {
    const pageId = String(req.context.extension.content.id);

    try {
        // 1. Quick check: does this page have the 'pii-detected' label?
        const labelsResponse = await api.asApp().requestConfluence(
            route`/wiki/api/v2/pages/${pageId}/labels`
        );

        if (!labelsResponse.ok) {
            return { hasPii: false, pageId };
        }

        const labelsData = await labelsResponse.json();
        const labels = labelsData.results || [];
        const hasPiiLabel = labels.some(l => l.name === 'pii-detected');

        if (!hasPiiLabel) {
            return { hasPii: false, pageId };
        }

        // 2. Page is flagged — fetch incident details from storage
        const queryResult = await storage.query()
            .limit(50)
            .getMany();

        const allRecords = queryResult.results || [];
        const incidents = allRecords
            .filter(item => item.key.startsWith('pii-incident-'))
            .map(r => r.value)
            .filter(inc => String(inc.pageId) === pageId);

        const activeIncidents = incidents.filter(inc => !inc.remediated);
        const piiTypes = [...new Set(incidents.flatMap(inc => inc.piiTypes || []))];
        const latestIncident = incidents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        return {
            hasPii: true,
            status: activeIncidents.length > 0 ? 'active' : 'resolved',
            incidentCount: activeIncidents.length,
            totalIncidents: incidents.length,
            piiTypes,
            lastDetected: latestIncident ? latestIncident.timestamp : null,
            pageId
        };
    } catch (error) {
        console.error(`❌ Byline PII check error: ${error.message}`);
        return { hasPii: false, pageId };
    }
});

export const handler = resolver.getDefinitions();
