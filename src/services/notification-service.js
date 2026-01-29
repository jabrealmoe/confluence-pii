import api, { route } from "@forge/api";

class NotificationService {
  /**
   * Adds a colored banner to a page
   */
  async addColoredBanner(pageId, currentPage, piiHits, highlightedBody) {
    try {
      const piiTypes = piiHits.map(h => h.type).join(', ');
      const piiCount = piiHits.reduce((sum, h) => sum + h.count, 0);

      // Define banner macro
      const bannerMacro = `
        <ac:structured-macro ac:name="info" ac:schema-version="1">
          <ac:parameter ac:name="title">🚨 PII DETECTED</ac:parameter>
          <ac:rich-text-body>
            <p>This page version contains potential PII (${piiCount} instances of: ${piiTypes}). Access has been restricted and this version has been flagged for review.</p>
          </ac:rich-text-body>
        </ac:structured-macro>
      `;

      const newBody = bannerMacro + (highlightedBody || currentPage.body.storage.value);

      const response = await api.asApp().requestConfluence(
        route`/wiki/api/v2/pages/${pageId}`,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: pageId,
            status: "current",
            title: currentPage.title,
            body: {
              representation: "storage",
              value: newBody
            },
            version: {
              number: currentPage.version.number + 1,
              message: "Auto-detected PII: Added Confidential Banner"
            }
          })
        }
      );

      return response.ok;
    } catch (error) {
      console.error(`❌ Error in addColoredBanner: ${error.message}`);
      return false;
    }
  }

  /**
   * Reports PII findings to an external endpoint or internal log
   */
  async reportFindings(data) {
    console.log("📊 Final Report Generated:", JSON.stringify(data, null, 2));
    // In a real app, this might post to a security dashboard
    return true;
  }

  /**
   * Wraps detected PII matches in styled spans
   */
  highlightPiiInContent(htmlContent, piiHits) {
    if (!htmlContent || !piiHits || piiHits.length === 0) return htmlContent;

    const parts = htmlContent.split(/(<[^>]*>)/g);
    return parts.map(part => {
      if (part.startsWith('<')) return part;
      let textPart = part;
      piiHits.forEach(hit => {
        if (hit.matches) {
          hit.matches.forEach(matchText => {
            const escapedMatch = matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedMatch, 'g');
            const replacement = `<span style="background-color: #fffae6; border: 1px solid #ffeb3b; padding: 1px 2px;" title="${hit.type.toUpperCase()} Detected">${matchText}</span>`;
            textPart = textPart.replace(regex, replacement);
          });
        }
      });
      return textPart;
    }).join('');
  }

  /**
   * Masks sensitive data for safe logging
   */
  maskSensitiveData(data, type) {
    if (type === 'ssn') {
      const cleaned = data.replace(/[-\s]/g, '');
      return `XXX-XX-${cleaned.slice(-4)}`;
    }
    if (type === 'creditCard') {
      const cleaned = data.replace(/[-\s]/g, '');
      return `XXXX-XXXX-XXXX-${cleaned.slice(-4)}`;
    }
    return data.length > 4 ? `${data.slice(0, 2)}***${data.slice(-2)}` : '***';
  }
}

export const notificationService = new NotificationService();

