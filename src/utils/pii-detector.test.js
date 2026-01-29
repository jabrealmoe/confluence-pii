/**
 * Unit tests for PII Detection utilities
 */
import {
  detectPii,
  validatePhone,
  validateCreditCard,
  extractContentPreview,
  aggregateHits,
} from '../utils/pii-detector';

describe('PII Detection', () => {
  describe('detectPii', () => {
    it('should detect email addresses', () => {
      const text = 'Contact me at john.doe@example.com for more info';
      const result = detectPii(text, { email: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('email');
      expect(result[0].count).toBe(1);
      expect(result[0].matches).toContain('john.doe@example.com');
    });

    it('should detect multiple email addresses', () => {
      const text = 'Email alice@test.com or bob@example.org';
      const result = detectPii(text, { email: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('email');
      expect(result[0].count).toBe(2);
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at (555) 123-4567';
      const result = detectPii(text, { phone: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('phone');
      expect(result[0].count).toBe(1);
    });

    it('should detect various phone formats', () => {
      const text = 'Numbers: 555-123-4567, (555) 987-6543, +1-555-111-2222';
      const result = detectPii(text, { phone: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('phone');
      expect(result[0].count).toBe(3);
    });

    it('should detect SSN in XXX-XX-XXXX format', () => {
      const text = 'SSN: 123-45-6789';
      const result = detectPii(text, { ssn: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ssn');
      expect(result[0].count).toBe(1);
      expect(result[0].matches).toContain('123-45-6789');
    });

    it('should detect SSN with spaces', () => {
      const text = 'Social Security: 987 65 4321';
      const result = detectPii(text, { ssn: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ssn');
      expect(result[0].count).toBe(1);
    });

    it('should detect credit card numbers', () => {
      const text = 'Card: 4532-1234-5678-9010';
      const result = detectPii(text, { creditCard: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('creditCard');
      expect(result[0].count).toBe(1);
    });

    it('should detect passport numbers with context', () => {
      const text = 'My passport number is 123456789';
      const result = detectPii(text, { passport: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('passport');
      expect(result[0].count).toBe(1);
    });

    it('should detect driver\'s license with context', () => {
      const text = 'Driver license: ABC123456';
      const result = detectPii(text, { driversLicense: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('driversLicense');
      expect(result[0].count).toBe(1);
    });

    it('should respect enabled types configuration', () => {
      const text = 'Email: test@example.com, Phone: 555-123-4567';
      const result = detectPii(text, { email: true, phone: false });
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('email');
    });

    it('should detect multiple PII types in same text', () => {
      const text = 'Contact: test@example.com, 555-123-4567, SSN: 123-45-6789';
      const result = detectPii(text, { email: true, phone: true, ssn: true });
      
      expect(result.length).toBeGreaterThanOrEqual(3);
      const types = result.map(r => r.type);
      expect(types).toContain('email');
      expect(types).toContain('phone');
      expect(types).toContain('ssn');
    });

    it('should return empty array for text with no PII', () => {
      const text = 'This is just normal text without any sensitive information';
      const result = detectPii(text);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for null or empty text', () => {
      expect(detectPii(null)).toEqual([]);
      expect(detectPii('')).toEqual([]);
      expect(detectPii(undefined)).toEqual([]);
    });

    it('should use default config when enabledTypes not provided', () => {
      const text = 'Email: test@example.com';
      const result = detectPii(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('email');
    });
  });

  describe('validatePhone', () => {
    it('should validate phone numbers with at least 10 digits', () => {
      expect(validatePhone('555-123-4567')).toBe(true);
      expect(validatePhone('(555) 123-4567')).toBe(true);
      expect(validatePhone('+1-555-123-4567')).toBe(true);
    });

    it('should reject phone numbers with less than 10 digits', () => {
      expect(validatePhone('555-1234')).toBe(false);
      expect(validatePhone('123')).toBe(false);
    });
  });

  describe('validateCreditCard', () => {
    it('should validate credit card numbers with 13-16 digits', () => {
      expect(validateCreditCard('4532123456789010')).toBe(true);
      expect(validateCreditCard('4532-1234-5678-9010')).toBe(true);
      expect(validateCreditCard('4532 1234 5678 9010')).toBe(true);
      expect(validateCreditCard('123456789012')).toBe(false); // 12 digits
      expect(validateCreditCard('12345678901234567')).toBe(false); // 17 digits
    });
  });

  describe('extractContentPreview', () => {
    it('should extract text from paragraph tags', () => {
      const body = {
        storage: {
          value: '<p>Hello World</p><p>Second paragraph</p>'
        }
      };
      const result = extractContentPreview(body);
      
      expect(result).toContain('Hello World');
      expect(result).toContain('Second paragraph');
    });

    it('should strip HTML tags from content', () => {
      const body = {
        storage: {
          value: '<p>Text with <strong>bold</strong> and <em>italic</em></p>'
        }
      };
      const result = extractContentPreview(body);
      
      expect(result).toContain('Text with bold and italic');
      expect(result).not.toContain('<strong>');
      expect(result).not.toContain('<em>');
    });

    it('should decode HTML entities', () => {
      const body = {
        storage: {
          value: '<p>Test &amp; example &lt;tag&gt; &quot;quoted&quot;</p>'
        }
      };
      const result = extractContentPreview(body);
      
      expect(result).toContain('&');
      expect(result).toContain('<');
      expect(result).toContain('>');
      expect(result).toContain('"');
    });

    it('should return null for invalid body', () => {
      expect(extractContentPreview(null)).toBeNull();
      expect(extractContentPreview({})).toBeNull();
      expect(extractContentPreview({ storage: {} })).toBeNull();
    });

    it('should return null when no paragraph tags found', () => {
      const body = {
        storage: {
          value: '<div>No paragraphs here</div>'
        }
      };
      const result = extractContentPreview(body);
      
      expect(result).toBeNull();
    });
  });

  describe('aggregateHits', () => {
    it('should aggregate hits by type', () => {
      const hits = [
        { type: 'email', match: 'test1@example.com' },
        { type: 'email', match: 'test2@example.com' },
        { type: 'phone', match: '555-1234' },
      ];
      
      const result = aggregateHits(hits);
      
      expect(result).toHaveLength(2);
      const emailHit = result.find(h => h.type === 'email');
      const phoneHit = result.find(h => h.type === 'phone');
      
      expect(emailHit.count).toBe(2);
      expect(emailHit.matches).toHaveLength(2);
      expect(phoneHit.count).toBe(1);
    });

    it('should handle empty hits array', () => {
      const result = aggregateHits([]);
      expect(result).toEqual([]);
    });
  });
});
