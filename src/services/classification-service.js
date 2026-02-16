import api from "@forge/api";
import { configService } from './config-service';

class ClassificationService {
  /**
   * Detect classification level based on page content
   */
  async detectClassification(pageContent) {
    const settings = await configService.getSettings();
    const levels = settings.clearanceLevels || [];
    
    // Check for classification keywords (highest to lowest rank)
    const sortedLevels = [...levels].sort((a, b) => b.rank - a.rank);
    
    for (const level of sortedLevels) {
      for (const keyword of level.keywords) {
        if (pageContent.toUpperCase().includes(keyword)) {
          console.log(`🔒 Detected classification: ${level.name} (keyword: ${keyword})`);
          return level;
        }
      }
    }
    
    // Default to unclassified
    return levels.find(l => l.id === 'unclassified') || null;
  }
  
  /**
   * Get user's groups from Confluence
   */
  async getUserGroups(userId) {
    try {
      const response = await api.asUser().requestConfluence(`/wiki/rest/api/user?accountId=${userId}&expand=groups`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      return data.groups?.results?.map(g => g.name) || [];
    } catch (error) {
      console.error(`Failed to get user groups: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get user's highest clearance level based on group membership
   */
  async getUserClearanceLevel(userId) {
    const settings = await configService.getSettings();
    const levels = settings.clearanceLevels || [];
    
    // Get user's groups
    const userGroups = await this.getUserGroups(userId);
    console.log(`User groups: ${userGroups.join(', ')}`);
    
    // Find highest clearance level user belongs to
    let highestLevel = levels.find(l => l.id === 'unclassified');
    
    for (const level of levels) {
      const hasAccess = level.groups.some(group => 
        userGroups.includes(group)
      );
      
      if (hasAccess && level.rank > (highestLevel?.rank || 0)) {
        highestLevel = level;
      }
    }
    
    console.log(`User clearance level: ${highestLevel?.name || 'None'}`);
    return highestLevel;
  }
  
  /**
   * Check if user has sufficient clearance to access a classification level
   */
  canUserAccessLevel(userLevel, requiredLevel) {
    if (!userLevel || !requiredLevel) return false;
    return userLevel.rank >= requiredLevel.rank;
  }
  
  /**
   * Get classification label for a page
   */
  getClassificationLabel(level) {
    if (!level || level.id === 'unclassified') return null;
    return `classification-${level.id}`;
  }
}

export const classificationService = new ClassificationService();
