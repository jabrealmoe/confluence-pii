import { notificationService } from './notification-service';


jest.mock('@forge/api', () => ({
  route: jest.fn(),
  requestConfluence: jest.fn(),
  asApp: () => ({
    requestConfluence: jest.fn()
  })
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('highlightPiiInContent', () => {
    it('should wrap PII match in a span', () => {
      const html = '<p>My email is test@example.com</p>';
      const hits = [{ type: 'email', matches: ['test@example.com'] }];
      const result = notificationService.highlightPiiInContent(html, hits);
      
      expect(result).toContain('<span style="background-color: #fffae6;');
      expect(result).toContain('test@example.com');
      expect(result).toContain('title="EMAIL Detected"');
    });

    it('should not wrap tags', () => {
      const html = '<a href="mailto:test@example.com">email</a>';
      const hits = [{ type: 'email', matches: ['test@example.com'] }];
      const result = notificationService.highlightPiiInContent(html, hits);
      
      // Should not break the href attribute (the simple regex in service handles this by splitting by tags)
      expect(result).toBe('<a href="mailto:test@example.com">email</a>');
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask SSN', () => {
      expect(notificationService.maskSensitiveData('123-45-6789', 'ssn')).toBe('XXX-XX-6789');
    });

    it('should mask Credit Card', () => {
      expect(notificationService.maskSensitiveData('1234-5678-9012-3456', 'creditCard')).toBe('XXXX-XXXX-XXXX-3456');
    });

    it('should mask other data', () => {
      expect(notificationService.maskSensitiveData('abcdefgh', 'other')).toBe('ab***gh');
    });
  });
});
