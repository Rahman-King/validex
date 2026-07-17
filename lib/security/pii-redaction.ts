/**
 * PII Redaction Layer
 * Detects and masks sensitive data before external API calls
 * Implements enterprise-grade data protection
 */

export interface PIIType {
  name: string
  pattern: RegExp
  replacement: string
  description: string
}

export interface PIIResult {
  original: string
  redacted: string
  detected: PIIType[]
  confidence: number
}

// PII Detection Patterns
const PII_PATTERNS: PIIType[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '***@***.***',
    description: 'Email addresses'
  },
  {
    name: 'phone',
    pattern: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: '***-***-****',
    description: 'Phone numbers'
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    replacement: '***-**-****',
    description: 'Social Security Numbers'
  },
  {
    name: 'credit_card',
    pattern: /\b(?:\d[ -]*?){13,16}\b/g,
    replacement: '****-****-****-****',
    description: 'Credit card numbers'
  },
  {
    name: 'api_key',
    pattern: /(?:api[_-]?key|apikey|secret|token)[\s:=]+[a-zA-Z0-9_\-]{20,}/gi,
    replacement: '***API_KEY***',
    description: 'API keys and secrets'
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '***.***.***.***',
    description: 'IP addresses'
  },
  {
    name: 'url_with_credentials',
    pattern: /https?:\/\/[^\s:]+:[^\s@]+@[^\s]+/g,
    replacement: 'https://***:***@***',
    description: 'URLs with credentials'
  },
  {
    name: 'date_of_birth',
    pattern: /\b(?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12]\d|3[01])[-\/]\d{4}\b/g,
    replacement: '**/**/****',
    description: 'Dates in MM/DD/YYYY format'
  },
  {
    name: 'passport',
    pattern: /\b[A-Za-z]{2}\d{6,9}\b/g,
    replacement: '********',
    description: 'Passport numbers'
  },
  {
    name: 'bank_account',
    pattern: /\b\d{10,12}\b/g,
    replacement: '************',
    description: 'Bank account numbers'
  }
]

/**
 * Detect PII in text using pattern matching */
export function detectPII(text: string): PIIType[] {
  const detected: PIIType[] = []
  
  for (const pii of PII_PATTERNS) {
    const matches = text.match(pii.pattern)
    if (matches && matches.length > 0) {
      detected.push(pii)
    }
  }
  
  return detected
}

/**
 * Redact PII from text */
export function redactPII(text: string): PIIResult {
  let redacted = text
  const detected: PIIType[] = []
  
  for (const pii of PII_PATTERNS) {
    const matches = text.match(pii.pattern)
    if (matches && matches.length > 0) {
      detected.push(pii)
      redacted = redacted.replace(pii.pattern, pii.replacement)
    }
  }
  
  // Calculate confidence based on number of detections
  const confidence = detected.length > 0 ? 0.9 : 0.1
  
  return {
    original: text,
    redacted,
    detected,
    confidence
  }
}

/**
 * Redact PII from object recursively */
export function redactObjectPII(obj: any): any {
  if (typeof obj === 'string') {
    return redactPII(obj).redacted
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObjectPII(item))
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = redactObjectPII(value)
    }
    return result
  }
  
  return obj
}

/**
 * Check if text contains PII */
export function containsPII(text: string): boolean {
  return detectPII(text).length > 0
}

/**
 * Get PII summary for logging */
export function getPIISummary(result: PIIResult): string {
  if (result.detected.length === 0) {
    return 'No PII detected'
  }
  
  const types = result.detected.map(p => p.name).join(', ')
  return `PII detected: ${types} (confidence: ${result.confidence})`
}
