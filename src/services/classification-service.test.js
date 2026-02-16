import { classificationService } from './classification-service';
import { configService } from './config-service';
import api from "@forge/api";

jest.mock('./config-service');
const mockRequestConfluence = jest.fn();
jest.mock("@forge/api", () => ({
  asUser: jest.fn(() => ({
    requestConfluence: mockRequestConfluence
  }))
}));

describe('ClassificationService', () => {
  const mockLevels = [
    { id: 'top-secret', name: 'Top Secret', rank: 5, keywords: ['TOP SECRET'], groups: ['admins'] },
    { id: 'secret', name: 'Secret', rank: 4, keywords: ['SECRET'], groups: ['managers'] },
    { id: 'unclassified', name: 'Unclassified', rank: 1, keywords: ['PUBLIC'], groups: [] }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    configService.getSettings.mockResolvedValue({ clearanceLevels: mockLevels });
  });

  describe('detectClassification', () => {
    it('should detect highest rank classification based on keywords', async () => {
      const content = 'This is a TOP SECRET document with some SECRET info.';
      const result = await classificationService.detectClassification(content);
      expect(result.id).toBe('top-secret');
    });

    it('should detect lower rank if higher rank keyword is missing', async () => {
      const content = 'This is a SECRET document.';
      const result = await classificationService.detectClassification(content);
      expect(result.id).toBe('secret');
    });

    it('should default to unclassified if no keywords found', async () => {
      const content = 'Normal content';
      const result = await classificationService.detectClassification(content);
      expect(result.id).toBe('unclassified');
    });
  });

  describe('getUserGroups', () => {
    it('should return list of group names', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          groups: { results: [{ name: 'admins' }, { name: 'users' }] }
        })
      };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      const groups = await classificationService.getUserGroups('user-123');
      expect(groups).toEqual(['admins', 'users']);
    });

    it('should return empty array on failure', async () => {
      mockRequestConfluence.mockRejectedValue(new Error('API Error'));
      const groups = await classificationService.getUserGroups('user-123');
      expect(groups).toEqual([]);
    });
  });

  describe('getUserClearanceLevel', () => {
    it('should return highest level user has access to', async () => {
      jest.spyOn(classificationService, 'getUserGroups').mockResolvedValue(['managers', 'users']);
      
      const level = await classificationService.getUserClearanceLevel('user-123');
      expect(level.id).toBe('secret');
    });
  });

  describe('canUserAccessLevel', () => {
    it('should return true if user rank >= required rank', () => {
      const userLevel = { rank: 5 };
      const requiredLevel = { rank: 4 };
      expect(classificationService.canUserAccessLevel(userLevel, requiredLevel)).toBe(true);
    });

    it('should return false if user rank < required rank', () => {
      const userLevel = { rank: 3 };
      const requiredLevel = { rank: 4 };
      expect(classificationService.canUserAccessLevel(userLevel, requiredLevel)).toBe(false);
    });
  });

  describe('getClassificationLabel', () => {
    it('should return null for unclassified', () => {
      expect(classificationService.getClassificationLabel({ id: 'unclassified' })).toBeNull();
    });

    it('should return formatted label for secret', () => {
      expect(classificationService.getClassificationLabel({ id: 'secret' })).toBe('classification-secret');
    });
  });
});
