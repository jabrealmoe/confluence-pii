import api, { route } from "@forge/api";

class PageService {
  /**
   * Fetches current page data with storage body format
   */
  async getPageData(pageId) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}?body-format=storage`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageId}: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error in getPageData: ${error.message}`);
      return null;
    }
  }

  /**
   * Adds labels to a page (API V2)
   */
  async addLabels(pageId, labels) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}/labels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(labels.map(label => ({
              prefix: 'global',
              name: label.replace(/\s+/g, '-')
          })))
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Error in addLabels: ${error.message}`);
      return false;
    }
  }

  /**
   * Set a page property (metadata)
   */
  async setPageProperty(pageId, key, value) {
    try {
        const response = await api.asApp().requestConfluence(
            route`/wiki/rest/api/content/${pageId}/property/${key}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key,
                    value,
                    version: { number: 1, minorEdit: true }
                })
            }
        );
        return response.ok;
    } catch (error) {
        console.error(`❌ Error setting page property ${key}: ${error.message}`);
        return false;
    }
  }

  /**
   * Get a page property
   */
  async getPageProperty(pageId, key) {
    try {
        const response = await api.asApp().requestConfluence(
            route`/wiki/rest/api/content/${pageId}/property/${key}`
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.value;
    } catch (error) {
        return null;
    }
  }

  /**
   * Fetches specific version of a page
   */
  async getVersionData(pageId, versionNumber) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}/versions/${versionNumber}?body-format=storage`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch version ${versionNumber} for page ${pageId}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error in getVersionData: ${error.message}`);
      return null;
    }
  }

  /**
   * Retrieves current page restrictions
   */
  async getRestrictions(pageId) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/rest/api/content/${pageId}/restriction/byOperation`
      );

      if (!response.ok) {
        console.warn(`⚠️ Could not fetch restrictions for ${pageId}: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error in getRestrictions: ${error.message}`);
      return null;
    }
  }

  /**
   * Restricts page to specific author (Quarantine)
   * IMPORTANT: This method now PRESERVES existing group/team permissions
   * to avoid triggering Atlassian's team auto-organization
   */
  async setRestrictions(pageId, authorId) {
    try {
      // Step 1: Fetch existing restrictions to preserve them
      const existingRestrictions = await this.getRestrictions(pageId);
      
      // Step 2: Build merged restrictions
      const mergedRestrictions = this._buildMergedRestrictions(
        existingRestrictions,
        authorId
      );

      // Step 3: Apply merged restrictions
      const response = await api.asApp().requestConfluence(
        route`/wiki/rest/api/content/${pageId}/restriction/byOperation`,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mergedRestrictions)
        }
      );

      if (response.ok) {
        console.log(`✅ Page ${pageId} quarantined (author: ${authorId}, preserved existing groups)`);
      }

      return response.ok;
    } catch (error) {
      console.error(`❌ Error in setRestrictions: ${error.message}`);
      return false;
    }
  }

  /**
   * Builds merged restrictions that preserve existing groups/teams
   * while adding the author for quarantine
   */
  _buildMergedRestrictions(existingRestrictions, authorId) {
    const operations = ['read', 'update'];
    const mergedRestrictions = [];

    for (const operation of operations) {
      // Find existing restriction for this operation
      const existing = existingRestrictions?.results?.find(
        r => r.operation === operation
      );

      // Preserve existing groups (THIS IS KEY - prevents team side effects)
      const existingGroups = existing?.restrictions?.group?.results || [];
      
      // Preserve existing users and add the author if not already present
      const existingUsers = existing?.restrictions?.user?.results || [];
      const authorAlreadyExists = existingUsers.some(
        u => u.accountId === authorId
      );
      
      const mergedUsers = authorAlreadyExists
        ? existingUsers
        : [...existingUsers, { type: "known", accountId: authorId }];

      mergedRestrictions.push({
        operation,
        restrictions: {
          user: { results: mergedUsers },
          group: { results: existingGroups } // ← Preserves existing groups!
        }
      });
    }

    return mergedRestrictions;
  }

  /**
   * Fetches space data (API V2)
   */
  async getSpaceData(spaceId) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/spaces/${spaceId}`
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error(`❌ Error in getSpaceData: ${error.message}`);
      return null;
    }
  }
}

export const pageService = new PageService();
