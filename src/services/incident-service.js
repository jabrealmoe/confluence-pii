import { storage } from '@forge/api';

class IncidentService {
    /**
     * Records a detection incident
     */
    async recordIncident(incident) {
        try {
            const id = `pii-incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const record = {
                id,
                timestamp: new Date().toISOString(),
                pageId: incident.pageId,
                title: incident.title,
                spaceKey: incident.spaceKey,
                spaceName: incident.spaceName,
                type: incident.type || 'Page',
                piiTypes: incident.piiTypes,
                status: incident.status || 'Active', // Active, Quarantined, Resolved
                remediated: false
            };
            
            await storage.set(id, record);
            console.log(`📝 Recorded incident ${id} for page ${incident.pageId}`);
            return id;
        } catch (error) {
            console.error(`❌ Failed to record incident: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetches all recorded incidents
     */
    async getIncidents() {
        try {
            const results = await storage.query()
                .where('key', 'starts_with', 'pii-incident-')
                .limit(50)
                .getMany();
            
            return results.map(r => r.value).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error(`❌ Failed to fetch incidents: ${error.message}`);
            return [];
        }
    }

    /**
     * Resolves/Dismisses an incident
     */
    async updateIncidentStatus(id, status) {
        try {
            const record = await storage.get(id);
            if (!record) return false;
            
            record.status = status;
            if (status === 'Resolved' || status === 'Dismissed') {
                record.remediated = true;
            }
            
            await storage.set(id, record);
            return true;
        } catch (error) {
            console.error(`❌ Failed to update incident ${id}: ${error.message}`);
            return false;
        }
    }

    /**
     * Deletes an incident record
     */
    async deleteIncident(id) {
        try {
            await storage.delete(id);
            return true;
        } catch (error) {
            console.error(`❌ Failed to delete incident ${id}: ${error.message}`);
            return false;
        }
    }
}

export const incidentService = new IncidentService();
