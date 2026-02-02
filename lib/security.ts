/**
 * Security utilities for Simpaap
 * Free, no external dependencies rate limiting and security functions
 */

import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════
// 🔐 PASSWORD GENERATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cryptographically secure random password
 * @param length Password length (default: 16)
 * @returns Random password string
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

/**
 * Password requirements configuration
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
} as const;

/**
 * Check individual password requirements
 * Used by both server validation and client UI
 */
export function checkPasswordRequirements(password: string): {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
} {
  return {
    hasMinLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/.test(password),
  };
}

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with isValid and errors array
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requirements = checkPasswordRequirements(password);

  if (!requirements.hasMinLength) {
    errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_REQUIREMENTS.minLength} caractères`);
  }

  if (!requirements.hasLowercase) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!requirements.hasUppercase) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!requirements.hasDigit) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!requirements.hasSpecial) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '12345678', 'qwerty', 'admin123', 'letmein'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Le mot de passe est trop courant');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 🚦 RATE LIMITING (In-Memory, Free)
// ════════════════════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier (IP, email, etc.)
 * @param limit Maximum requests allowed
 * @param windowMs Time window in milliseconds
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  forgotPassword: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  resetPassword: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  createUser: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  api: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
} as const;

// ════════════════════════════════════════════════════════════════════════════
// 🛡️ INPUT VALIDATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate subdomain format
 * Only lowercase alphanumeric and hyphens, 3-63 chars, no leading/trailing hyphens
 */
export function isValidSubdomain(subdomain: string): boolean {
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  return subdomainRegex.test(subdomain.toLowerCase());
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string for safe display (prevent XSS in emails/logs)
 */
export function sanitizeString(str: string, maxLength: number = 255): string {
  return str
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════
// 📧 HTML ESCAPING (for emails)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML special characters to prevent XSS in emails
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}

// ════════════════════════════════════════════════════════════════════════════
// 🔑 INTERNAL API SECURITY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate internal API token using SHA-256 digest
 * Compatible with both Node.js and Edge Runtime verification
 */
export function generateInternalApiToken(): string {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute windows
  const payload = `${secret}:internal-api:${timestamp}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verify internal API token
 */
export function verifyInternalApiToken(token: string): boolean {
  const currentToken = generateInternalApiToken();

  // Also check previous window to handle edge cases
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
  const prevTimestamp = Math.floor(Date.now() / (5 * 60 * 1000)) - 1;
  const prevPayload = `${secret}:internal-api:${prevTimestamp}`;
  const prevToken = crypto.createHash('sha256').update(prevPayload).digest('hex');

  return token === currentToken || token === prevToken;
}

// ════════════════════════════════════════════════════════════════════════════
// 🔒 URL VALIDATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validate and sanitize URL
 * Only allows http/https protocols
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Build safe reset URL
 */
export function buildResetUrl(baseUrl: string, subdomain: string | null, token: string): string {
  try {
    const url = new URL(baseUrl);

    if (subdomain && isValidSubdomain(subdomain)) {
      url.hostname = `${subdomain}.${url.hostname}`;
    }

    url.pathname = '/reset-password';
    url.searchParams.set('token', token);

    return url.toString();
  } catch {
    // Fallback for invalid base URL
    return `${baseUrl}/reset-password?token=${token}`;
  }
}
