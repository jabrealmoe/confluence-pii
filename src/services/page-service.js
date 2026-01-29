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
   * Adds labels to a page
   */
  async addLabels(pageId, labels) {
    try {
      // Forge API labels are still in REST v1
      const response = await api.asApp().requestConfluence(
        route`/wiki/rest/api/content/${pageId}/label`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(labels.map(label => ({ name: label })))
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Error in addLabels: ${error.message}`);
      return false;
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
   * Restricts page to specific author (Quarantine)
   */
  async setRestrictions(pageId, authorId) {
    try {
      const response = await api.asApp().requestConfluence(
        route`/wiki/rest/api/content/${pageId}/restriction/byOperation`,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            {
              operation: "update",
              restrictions: { user: { results: [{ type: "known", accountId: authorId }] }, group: { results: [] } }
            },
            {
              operation: "read",
              restrictions: { user: { results: [{ type: "known", accountId: authorId }] }, group: { results: [] } }
            }
          ])
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Error in setRestrictions: ${error.message}`);
      return false;
    }
  }
}

export const pageService = new PageService();
