import { piiDetectionService } from './pii-service';
import { pageService } from './page-service';
import { detectPii } from '../utils/pii-detector';

import api, { route } from '@forge/api';

jest.mock('../utils/pii-detector');
jest.mock('./page-service');
jest.mock('@forge/api', () => ({
  route: jest.fn(),
  asApp: jest.fn(() => ({
    requestConfluence: jest.fn()
  }))
}));

const mockRequestConfluence = jest.fn();

describe('PiiDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.asApp.mockReturnValue({ requestConfluence: mockRequestConfluence });
  });

  describe('scanPage', () => {
    it('should return findings if PII is detected', async () => {
      const mockPage = { 
        body: { storage: { value: '<p>test</p>' } },
        title: 'Test Page'
      };
      pageService.getPageData.mockResolvedValue(mockPage);
      detectPii.mockReturnValue([{ type: 'email', count: 1 }]);

      const result = await piiDetectionService.scanPage('123', {});

      expect(result.detected).toBe(true);
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].type).toBe('email');
    });

    it('should return no findings if no PII is detected', async () => {
      pageService.getPageData.mockResolvedValue({ body: { storage: { value: 'clean' } } });
      detectPii.mockReturnValue([]);

      const result = await piiDetectionService.scanPage('123', {});

      expect(result.detected).toBe(false);
      expect(result.hits).toHaveLength(0);
    });
  });

  describe('extractTextContent', () => {
    it('should strip HTML tags', () => {
      const body = { storage: { value: '<div>Hello <b>World</b></div>' } };
      const text = piiDetectionService.extractTextContent(body);
      expect(text).toBe('Hello World');
    });

    it('should return empty string if body is invalid', () => {
        expect(piiDetectionService.extractTextContent(null)).toBe("");
    });
  });

  describe('scanHistoricalVersions', () => {
    it('should scan versions and returns findings', async () => {
      pageService.getPageProperty.mockResolvedValue(0);
      mockRequestConfluence.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ results: [{ number: 1 }, { number: 2 }] })
      });

      pageService.getVersionData.mockImplementation((id, num) => ({
        body: { storage: { value: num === 2 ? 'PII' : 'clean' } }
      }));
      detectPii.mockImplementation(content => {
          if (content === 'PII') return [{ type: 'phone', count: 1 }];
          return [];
      });

      const findings = await piiDetectionService.scanHistoricalVersions('123');

      expect(findings).toHaveLength(1);
      expect(findings[0].version).toBe(2);
      expect(findings[0].piiTypes).toContain('phone');
    });

    it('should handle API failure gracefully', async () => {
        mockRequestConfluence.mockResolvedValue({ ok: false });
        const findings = await piiDetectionService.scanHistoricalVersions('123');
        expect(findings).toHaveLength(0);
    });
  });
});
