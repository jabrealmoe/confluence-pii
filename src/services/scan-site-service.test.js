import { siteScanService } from './scan-site-service';
import { piiDetectionService } from './pii-service';
import { configService } from './config-service';
import { detectPii } from '../utils/pii-detector';
import api, { route } from "@forge/api";

jest.mock('./pii-service');
jest.mock('./config-service');
jest.mock('../utils/pii-detector');
const mockRequestConfluence = jest.fn();
jest.mock("@forge/api", () => ({
  route: jest.fn(),
  asApp: jest.fn(() => ({
    requestConfluence: mockRequestConfluence
  }))
}));

describe('SiteScanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPageCount', () => {
    it('should return totalSize on success', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ totalSize: 42 })
      };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      const count = await siteScanService.getPageCount();
      expect(count).toBe(42);
    });

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Fatal error')
      };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      await expect(siteScanService.getPageCount()).rejects.toThrow('Failed to fetch page count: 500');
    });
  });

  describe('scanBatch', () => {
    it('should scan and aggregate results for a batch of pages', async () => {
      const mockSettings = { email: true };
      configService.getSettings.mockResolvedValue(mockSettings);
      
      const mockPages = [
        { 
          id: '1', title: 'Page 1', body: { storage: { value: 'test' } },
          restrictions: { read: { group: { results: [] } } }
        },
        { 
          id: '2', title: 'Page 2', body: { storage: { value: 'PII' } },
          restrictions: { read: { group: { results: [{ name: 'admins' }] } } }
        }
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ results: mockPages, _links: {} })
      };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      piiDetectionService.extractTextContent.mockImplementation(body => body.storage.value);
      detectPii.mockImplementation(content => {
          if (content === 'PII') return [{ type: 'email', count: 1 }];
          return [];
      });

      const results = await siteScanService.scanBatch(null, 10);

      expect(results.pagesScanned).toBe(2);
      expect(results.stats.active).toBe(2); // Since we skip restriction check in batch for performance
      expect(results.stats.quarantined).toBe(0);
      expect(results.stats.hitsByType.email).toBe(1);
      expect(results.findings).toHaveLength(1);
      expect(results.findings[0].id).toBe('2');
    });

    it('should return empty results on API failure', async () => {
        mockRequestConfluence.mockResolvedValue({ ok: false, status: 500 });
        const results = await siteScanService.scanBatch(null, 10);
        expect(results.findings).toHaveLength(0);
        expect(results.pagesScanned).toBe(0);
    });
  });
});
