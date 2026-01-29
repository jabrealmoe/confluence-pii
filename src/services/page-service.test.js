import { pageService } from './page-service';
import api, { route } from '@forge/api';

const mockRequestConfluence = jest.fn();
jest.mock('@forge/api', () => ({
  route: (strings, ...values) => strings.reduce((acc, str, i) => acc + str + (values[i] || ''), ''),
  storage: {
    get: jest.fn(),
    set: jest.fn()
  },
  requestConfluence: jest.fn(),
  asApp: () => ({
    requestConfluence: mockRequestConfluence
  })
}));

describe('PageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPageData', () => {
    it('should call confluence API with storage format', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ id: '123' })
      };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      const data = await pageService.getPageData('123');

      expect(mockRequestConfluence).toHaveBeenCalled();
      expect(data.id).toBe('123');
    });

    it('should return null on failure', async () => {
      const mockResponse = { ok: false, status: 404 };
      mockRequestConfluence.mockResolvedValue(mockResponse);

      const data = await pageService.getPageData('123');
      expect(data).toBe(null);
    });
  });

  describe('addLabels', () => {
    it('should post labels to confluence', async () => {
      mockRequestConfluence.mockResolvedValue({ ok: true });
      const success = await pageService.addLabels('123', ['flag']);
      expect(success).toBe(true);
      expect(mockRequestConfluence).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
