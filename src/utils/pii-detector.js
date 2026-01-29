/**
 * PII Detection Utilities
 * Extracted for testability
 */

/**
 * Detects various types of PII in text content
 * @param {string} text - The text to scan for PII
 * @param {Object} enabledTypes - Configuration object specifying which PII types to detect
 * @returns {Array} Array of PII hits with type, count, and matches
 */
export function detectPii(text, enabledTypes) {
  if (!text) return [];

  // Default to all enabled if not provided
  const config = enabledTypes || {
    email: true,
    phone: true,
    creditCard: true,
    ssn: true,
    passport: true,
    driversLicense: true
  };

  const hits = [];
  const foundIndices = new Set();

  // Helper to add hit if not overlapping
  const addHit = (match, type, contextScore = 0) => {
    if (foundIndices.has(match.index)) return;

    for (let i = 0; i < match[0].length; i++) {
      foundIndices.add(match.index + i);
    }

    hits.push({
      type,
      match: match[0],
      contextScore
    });
  };

  // 1. Strict SSN (XXX-XX-XXXX)
  if (config.ssn) {
    const strictSsnRegex = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;
    for (const match of text.matchAll(strictSsnRegex)) {
      addHit(match, 'ssn', 10);
    }
  }

  // 2. Email
  if (config.email) {
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    for (const match of text.matchAll(emailRegex)) {
      addHit(match, 'email', 10);
    }
  }

  // 3. Phone
  if (config.phone) {
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    for (const match of text.matchAll(phoneRegex)) {
      if (validatePhone(match[0])) {
        addHit(match, 'phone', 5);
      }
    }
  }

  // 4. Credit Card (13-16 digits)
  if (config.creditCard) {
    const ccRegex = /\b(?:\d[ -]?){13,16}\b/g;
    for (const match of text.matchAll(ccRegex)) {
      if (validateCreditCard(match[0])) {
        addHit(match, 'creditCard', 10);
      }
    }
  }

  // 5. Ambiguous 9-Digit Numbers
  const nineDigitRegex = /\b\d{9}\b/g;
  for (const match of text.matchAll(nineDigitRegex)) {
    const isOverlapping = Array.from({ length: 9 }).some((_, i) => foundIndices.has(match.index + i));
    if (isOverlapping) continue;

    const context = getContext(text, match.index, match[0].length);
    const lowerContext = context.toLowerCase();

    if (config.passport && lowerContext.includes('passport')) {
      addHit(match, 'passport', 10);
    } else if (config.ssn && (lowerContext.includes('social') || lowerContext.includes('ssn') || lowerContext.includes('security'))) {
      addHit(match, 'ssn', 9);
    } else if (config.driversLicense && (lowerContext.includes('license') || lowerContext.includes('driving') || lowerContext.includes('driver'))) {
      addHit(match, 'driversLicense', 8);
    } else if (config.ssn) {
      addHit(match, 'ssn', 1);
    } else if (config.passport) {
      addHit(match, 'passport', 1);
    }
  }

  // 6. Alphanumeric IDs (Driver's License)
  if (config.driversLicense) {
    const alphaNumRegex = /\b[A-Z0-9]{6,12}\b/g;
    for (const match of text.matchAll(alphaNumRegex)) {
      const isOverlapping = checkOverlap(match.index, match[0].length, foundIndices);
      if (isOverlapping) continue;

      if (/^[A-Z]+$/.test(match[0])) continue;

      const hasDigits = /\d/.test(match[0]);
      const context = getContext(text, match.index, match[0].length).toLowerCase();

      if (context.includes('license') || context.includes('driver') || context.includes('dl')) {
        addHit(match, 'driversLicense', 10);
      } else if (hasDigits && /[A-Z]/.test(match[0])) {
        addHit(match, 'driversLicense', 5);
      }
    }
  }

  return aggregateHits(hits);
}

export function validatePhone(str) {
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10;
}

export function validateCreditCard(str) {
  const digits = str.replace(/[-\s]/g, '');
  return digits.length >= 13 && digits.length <= 16;
}

export function getContext(text, index, length) {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return text.substring(start, end);
}

export function checkOverlap(index, length, foundIndices) {
  for (let i = 0; i < length; i++) {
    if (foundIndices.has(index + i)) return true;
  }
  return false;
}

export function aggregateHits(hits) {
  const summary = {};
  hits.forEach(h => {
    if (!summary[h.type]) {
      summary[h.type] = { type: h.type, count: 0, matches: [] };
    }
    summary[h.type].count++;
    summary[h.type].matches.push(h.match);
  });
  return Object.values(summary);
}

export function extractContentPreview(body) {
  if (!body || !body.storage || !body.storage.value) {
    return null;
  }

  const html = body.storage.value;
  const pTagRegex = /<p[^>]*>(.*?)<\/p>/gis;
  const matches = html.match(pTagRegex);

  if (!matches || matches.length === 0) {
    return null;
  }

  const combinedContent = matches.join(' ');
  const textContent = combinedContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return textContent;
}
