import crypto from 'crypto';

/**
 * Security & Hardening Utilities for MikuMantra
 * Provides rate limiting, cryptographic security, input sanitization, and timing-safe equality.
 */

// -------------------------------------------------------------
// 1. IN-MEMORY SLIDING-WINDOW RATE LIMITER
// -------------------------------------------------------------
const _rateLimitStore = new Map();

/**
 * Cleanup expired rate limit entries every 5 minutes to prevent memory leak
 */
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of _rateLimitStore.entries()) {
      if (now > record.resetTime) {
        _rateLimitStore.delete(key);
      }
    }
  }, 300000);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

/**
 * Checks and increments rate limit for a client key and action.
 *
 * @param {string} key - Unique identifier (e.g., client IP or email)
 * @param {string} action - Action namespace (e.g., 'login', 'register', 'otp')
 * @param {number} limit - Maximum requests allowed within windowMs
 * @param {number} windowMs - Window duration in milliseconds (default 60s)
 * @returns {{ allowed: boolean, remaining: number, resetTime: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(key, action, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const bucketKey = `${action}:${key}`;
  const existing = _rateLimitStore.get(bucketKey);

  if (!existing || now > existing.resetTime) {
    const record = { count: 1, resetTime: now + windowMs };
    _rateLimitStore.set(bucketKey, record);
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: record.resetTime,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfterSeconds
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime: existing.resetTime,
    retryAfterSeconds
  };
}

/**
 * Extracts the real client IP from incoming Next.js Request headers.
 */
export function getClientIp(request) {
  if (!request || !request.headers) return '127.0.0.1';
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return '127.0.0.1';
}

// -------------------------------------------------------------
// 2. CRYPTOGRAPHICALLY SECURE OTP GENERATOR
// -------------------------------------------------------------
/**
 * Generates a cryptographically strong 6-digit numeric OTP code.
 * Replaces Math.random() with crypto.randomInt() to eliminate predictability.
 */
export function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// -------------------------------------------------------------
// 3. OTP ATTEMPT LIMITER & BRUTE-FORCE LOCKOUT
// -------------------------------------------------------------
const _otpAttemptStore = new Map();

/**
 * Tracks failed OTP verification attempts to prevent brute-force attacks.
 * Allows maximum 5 failed attempts per target identifier before locking out.
 *
 * @param {string} identifier - e.g. email + ':' + type
 * @param {number} maxAttempts - Maximum allowed failed attempts (default: 5)
 * @returns {{ locked: boolean, attempts: number, remaining: number }}
 */
export function recordOtpFailure(identifier, maxAttempts = 5) {
  const current = _otpAttemptStore.get(identifier) || 0;
  const newCount = current + 1;
  _otpAttemptStore.set(identifier, newCount);

  // Auto clear after 15 minutes without blocking process exit
  const cleanupTimer = setTimeout(() => _otpAttemptStore.delete(identifier), 15 * 60 * 1000);
  if (cleanupTimer.unref) cleanupTimer.unref();

  return {
    locked: newCount >= maxAttempts,
    attempts: newCount,
    remaining: Math.max(0, maxAttempts - newCount)
  };
}

export function resetOtpAttempts(identifier) {
  _otpAttemptStore.delete(identifier);
}

export function isOtpLocked(identifier, maxAttempts = 5) {
  const current = _otpAttemptStore.get(identifier) || 0;
  return current >= maxAttempts;
}

// -------------------------------------------------------------
// 4. TIMING-SAFE EQUALITY COMPARISON
// -------------------------------------------------------------
/**
 * Compares two strings in constant time to prevent side-channel timing attacks.
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Constant time dummy operation
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// -------------------------------------------------------------
// 5. REGEX / ReDoS PROTECTION & NoSQL SANITIZATION
// -------------------------------------------------------------
/**
 * Escapes characters that have special meaning in regular expressions.
 * Prevents ReDoS (Regular Expression Denial of Service) in MongoDB $regex queries.
 */
export function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates and sanitizes a query string or parameter.
 * Rejects objects that may contain MongoDB query operators like $gt, $ne, $where.
 */
export function sanitizeQueryInput(input, maxLength = 200) {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') {
    // If input is an object or array, reject to prevent operator injection
    return '';
  }
  const trimmed = input.trim();
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

// -------------------------------------------------------------
// 6. PASSWORD STRENGTH VALIDATION
// -------------------------------------------------------------
/**
 * Enforces strong password rules.
 * Requirements: minimum 8 characters, at least 1 letter and 1 number or special character.
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (!hasLetter || !hasNumberOrSymbol) {
    return { valid: false, message: 'Password must contain at least one letter and one number or special character.' };
  }
  return { valid: true };
}

// -------------------------------------------------------------
// 7. SECURE UPLOAD HEADERS (STORED XSS MITIGATION)
// -------------------------------------------------------------
/**
 * Returns security response headers for uploaded media and files.
 * Restricts script execution for SVGs and untrusted content.
 */
export function getSecureUploadHeaders(contentType = 'image/jpeg') {
  const isSvg = contentType.includes('svg');
  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    // Isolate SVG from script execution while allowing it to render as an image
    ...(isSvg ? {
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"
    } : {}),
    'Vary': 'Accept'
  };
}
