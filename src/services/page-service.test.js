import { pageService } from './page-service';

// Mock the Forge API
const mockRequestConfluence = jest.fn();
jest.mock('@forge/api', () => ({
  __esModule: true,
  default: {
    asApp: jest.fn(() => ({
      requestConfluence: mockRequestConfluence
    }))
  },
  route: (strings, ...values) => {
    return strings.reduce((acc, str, i) => {
      return acc + str + (values[i] || '');
    }, '');
  }
}));


describe('PageService - Restriction Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRestrictions', () => {
    it('should fetch existing restrictions successfully', async () => {
      const mockRestrictions = {
        results: [
          {
            operation: 'read',
            restrictions: {
              user: { results: [{ accountId: 'user1', type: 'known' }] },
              group: { results: [{ name: 'confluence-administrators' }] }
            }
          }
        ]
      };

      mockRequestConfluence.mockResolvedValue({
        ok: true,
        json: async () => mockRestrictions
      });

      const result = await pageService.getRestrictions('page123');

      expect(result).toEqual(mockRestrictions);
      expect(mockRequestConfluence).toHaveBeenCalledWith(
        expect.stringContaining('page123/restriction/byOperation')
      );
    });

    it('should return null if fetch fails', async () => {
      mockRequestConfluence.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await pageService.getRestrictions('page123');

      expect(result).toBeNull();
    });
  });

  describe('setRestrictions', () => {
    it('should preserve existing groups when setting restrictions', async () => {
      const existingRestrictions = {
        results: [
          {
            operation: 'read',
            restrictions: {
              user: { results: [] },
              group: { results: [{ name: 'team-alpha' }, { name: 'team-beta' }] }
            }
          },
          {
            operation: 'update',
            restrictions: {
              user: { results: [] },
              group: { results: [{ name: 'team-alpha' }] }
            }
          }
        ]
      };

      let capturedBody;
      mockRequestConfluence
        .mockResolvedValueOnce({
          ok: true,
          json: async () => existingRestrictions
        })
        .mockImplementationOnce((url, options) => {
          capturedBody = JSON.parse(options.body);
          return Promise.resolve({ ok: true });
        });

      const result = await pageService.setRestrictions('page123', 'author456');

      expect(result).toBe(true);
      
      // Verify that existing groups were preserved
      const readRestriction = capturedBody.find(r => r.operation === 'read');
      expect(readRestriction.restrictions.group.results).toHaveLength(2);
      expect(readRestriction.restrictions.group.results).toContainEqual({ name: 'team-alpha' });
      expect(readRestriction.restrictions.group.results).toContainEqual({ name: 'team-beta' });
      
      // Verify that author was added
      expect(readRestriction.restrictions.user.results).toContainEqual({
        type: 'known',
        accountId: 'author456'
      });
    });

    it('should not duplicate author if already in restrictions', async () => {
      const existingRestrictions = {
        results: [
          {
            operation: 'read',
            restrictions: {
              user: { results: [{ type: 'known', accountId: 'author456' }] },
              group: { results: [] }
            }
          },
          {
            operation: 'update',
            restrictions: {
              user: { results: [{ type: 'known', accountId: 'author456' }] },
              group: { results: [] }
            }
          }
        ]
      };

      let capturedBody;
      mockRequestConfluence
        .mockResolvedValueOnce({
          ok: true,
          json: async () => existingRestrictions
        })
        .mockImplementationOnce((url, options) => {
          capturedBody = JSON.parse(options.body);
          return Promise.resolve({ ok: true });
        });

      await pageService.setRestrictions('page123', 'author456');

      // Verify author appears only once
      const readRestriction = capturedBody.find(r => r.operation === 'read');
      expect(readRestriction.restrictions.user.results).toHaveLength(1);
      expect(readRestriction.restrictions.user.results[0].accountId).toBe('author456');
    });

    it('should handle pages with no existing restrictions', async () => {
      mockRequestConfluence
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] })
        })
        .mockResolvedValueOnce({ ok: true });

      const result = await pageService.setRestrictions('page123', 'author456');

      expect(result).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockRequestConfluence.mockRejectedValue(new Error('Network error'));

      const result = await pageService.setRestrictions('page123', 'author456');

      expect(result).toBe(false);
    });
  });

  describe('_buildMergedRestrictions', () => {
    it('should merge restrictions correctly with existing groups and users', () => {
      const existingRestrictions = {
        results: [
          {
            operation: 'read',
            restrictions: {
              user: { results: [{ type: 'known', accountId: 'user1' }] },
              group: { results: [{ name: 'group1' }] }
            }
          }
        ]
      };

      const merged = pageService._buildMergedRestrictions(existingRestrictions, 'author456');

      expect(merged).toHaveLength(2); // read and update operations
      
      const readOp = merged.find(m => m.operation === 'read');
      expect(readOp.restrictions.user.results).toHaveLength(2); // existing user + author
      expect(readOp.restrictions.group.results).toHaveLength(1); // preserved group
    });

    it('should handle null existing restrictions', () => {
      const merged = pageService._buildMergedRestrictions(null, 'author456');

      expect(merged).toHaveLength(2);
      expect(merged[0].restrictions.user.results).toHaveLength(1);
      expect(merged[0].restrictions.group.results).toHaveLength(0);
    });
  });
});
