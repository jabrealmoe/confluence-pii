/**
 * Pre-compiled Regular Expressions for Performance
 */
const REGEX = {
  STRICT_SSN: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
  EMAIL: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  PHONE: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d[ -]?){13,16}\b/g,
  NINE_DIGITS: /\b\d{9}\b/g,
  ALPHANUM_DL: /\b[A-Z0-9]{6,12}\b/g,
  HTML_TAGS: /<[^>]*>?/gm,
  P_TAGS: /<p[^>]*>(.*?)<\/p>/gis,
  WHITESPACE: /\s+/g
};

/**
 * Detects various types of PII in text content
 */
export function detectPii(text, enabledTypes) {
  if (!text) return [];

  const config = enabledTypes || {
    email: true, phone: true, creditCard: true,
    ssn: true, passport: true, driversLicense: true
  };

  const hits = [];
  const foundIndices = new Set();

  const addHit = (match, type, contextScore = 0) => {
    const index = match.index;
    const value = match[0];
    
    // Quick overlap check
    if (foundIndices.has(index)) return;

    for (let i = 0; i < value.length; i++) {
        foundIndices.add(index + i);
    }

    hits.push({ type, match: value, contextScore });
  };

  // 1. Strict SSN
  if (config.ssn) {
    for (const match of text.matchAll(REGEX.STRICT_SSN)) {
      addHit(match, 'ssn', 10);
    }
  }

  // 2. Email
  if (config.email) {
    for (const match of text.matchAll(REGEX.EMAIL)) {
      addHit(match, 'email', 10);
    }
  }

  // 3. Phone
  if (config.phone) {
    for (const match of text.matchAll(REGEX.PHONE)) {
      if (validatePhone(match[0])) {
        addHit(match, 'phone', 5);
      }
    }
  }

  // 4. Credit Card
  if (config.creditCard) {
    for (const match of text.matchAll(REGEX.CREDIT_CARD)) {
      if (validateCreditCard(match[0])) {
        addHit(match, 'creditCard', 10);
      }
    }
  }

  // 5. Ambiguous 9-Digit Numbers (Passport/SSN/DL)
  for (const match of text.matchAll(REGEX.NINE_DIGITS)) {
    if (checkOverlap(match.index, match[0].length, foundIndices)) continue;

    const lowerContext = getContext(text, match.index, match[0].length).toLowerCase();

    if (config.passport && lowerContext.includes('passport')) {
      addHit(match, 'passport', 10);
    } else if (config.ssn && (lowerContext.includes('social') || lowerContext.includes('ssn') || lowerContext.includes('security'))) {
      addHit(match, 'ssn', 9);
    } else if (config.driversLicense && (lowerContext.includes('license') || lowerContext.includes('driving') || lowerContext.includes('driver'))) {
      addHit(match, 'driversLicense', 8);
    } else if (config.ssn) {
      addHit(match, 'ssn', 1);
    }
  }

  // 6. Alphanumeric IDs
  if (config.driversLicense) {
    for (const match of text.matchAll(REGEX.ALPHANUM_DL)) {
      if (checkOverlap(match.index, match[0].length, foundIndices)) continue;
      if (/^[A-Z]+$/.test(match[0])) continue;

      const context = getContext(text, match.index, match[0].length).toLowerCase();
      if (context.includes('license') || context.includes('driver') || context.includes('dl')) {
        addHit(match, 'driversLicense', 10);
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
    return "";
  }

  const html = body.storage.value;
  const matches = html.match(REGEX.P_TAGS);

  if (!matches || matches.length === 0) {
    return "";
  }

  return matches.join(' ')
    .replace(REGEX.HTML_TAGS, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(REGEX.WHITESPACE, ' ')
    .trim();
}
