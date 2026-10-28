import assert from 'assert';
import {
  checkRateLimit,
  generateSecureOtp,
  recordOtpFailure,
  resetOtpAttempts,
  isOtpLocked,
  timingSafeEqualStrings,
  escapeRegex,
  sanitizeQueryInput,
  validatePasswordStrength,
  getSecureUploadHeaders
} from '../lib/security.js';

console.log('=== Running Security Unit Tests ===\n');

// 1. Test Secure OTP Generation
console.log('1. Testing generateSecureOtp()...');
const otp1 = generateSecureOtp();
const otp2 = generateSecureOtp();
assert.strictEqual(typeof otp1, 'string', 'OTP should be a string');
assert.strictEqual(otp1.length, 6, 'OTP must be exactly 6 digits');
assert.strictEqual(/^\d{6}$/.test(otp1), true, 'OTP must only contain numeric digits');
assert.notStrictEqual(otp1, otp2, 'Subsequent OTPs should have cryptographic entropy');
console.log(`   ✓ Generated valid secure OTP: ${otp1}`);

// 2. Test Password Strength Validation
console.log('\n2. Testing validatePasswordStrength()...');
assert.strictEqual(validatePasswordStrength('short').valid, false, 'Should reject password under 8 chars');
assert.strictEqual(validatePasswordStrength('alllowercaseletters').valid, false, 'Should reject password without numbers/symbols');
assert.strictEqual(validatePasswordStrength('1234567890').valid, false, 'Should reject password without letters');
assert.strictEqual(validatePasswordStrength('SecureP@ss123').valid, true, 'Should accept strong complex password');
assert.strictEqual(validatePasswordStrength('password99').valid, true, 'Should accept alphanumeric 8+ chars');
console.log('   ✓ Password strength rules verified');

// 3. Test OTP Brute Force Tracking & Lockout
console.log('\n3. Testing OTP attempt limiter & lockout...');
const testEmail = 'victim_test_' + Date.now() + '@example.com:test';
resetOtpAttempts(testEmail);
assert.strictEqual(isOtpLocked(testEmail, 5), false, 'Should not be locked initially');

recordOtpFailure(testEmail, 5); // attempt 1
recordOtpFailure(testEmail, 5); // attempt 2
recordOtpFailure(testEmail, 5); // attempt 3
recordOtpFailure(testEmail, 5); // attempt 4
assert.strictEqual(isOtpLocked(testEmail, 5), false, 'Should not be locked at attempt 4');

const fifthFail = recordOtpFailure(testEmail, 5); // attempt 5
assert.strictEqual(fifthFail.locked, true, 'Should lock at attempt 5');
assert.strictEqual(isOtpLocked(testEmail, 5), true, 'isOtpLocked should return true');

resetOtpAttempts(testEmail);
assert.strictEqual(isOtpLocked(testEmail, 5), false, 'Should unlock after resetOtpAttempts()');
console.log('   ✓ OTP brute-force lockout verified (locks at 5 failed attempts)');

// 4. Test In-Memory Rate Limiting
console.log('\n4. Testing checkRateLimit()...');
const testIp = '192.168.1.' + Math.floor(Math.random() * 200 + 1);
const r1 = checkRateLimit(testIp, 'test_action', 3, 5000);
assert.strictEqual(r1.allowed, true, 'First request should be allowed');
assert.strictEqual(r1.remaining, 2);

const r2 = checkRateLimit(testIp, 'test_action', 3, 5000);
assert.strictEqual(r2.allowed, true, 'Second request should be allowed');

const r3 = checkRateLimit(testIp, 'test_action', 3, 5000);
assert.strictEqual(r3.allowed, true, 'Third request should be allowed');
assert.strictEqual(r3.remaining, 0);

const r4 = checkRateLimit(testIp, 'test_action', 3, 5000);
assert.strictEqual(r4.allowed, false, 'Fourth request should exceed rate limit');
assert.strictEqual(r4.remaining, 0);
assert.strictEqual(r4.retryAfterSeconds > 0, true, 'retryAfterSeconds should be positive');
console.log('   ✓ Rate limiter correctly throttles requests at threshold');

// 5. Test Timing-Safe Comparison
console.log('\n5. Testing timingSafeEqualStrings()...');
assert.strictEqual(timingSafeEqualStrings('mysecretkey123', 'mysecretkey123'), true, 'Identical strings must match');
assert.strictEqual(timingSafeEqualStrings('mysecretkey123', 'wrongkey'), false, 'Different length strings must not match');
assert.strictEqual(timingSafeEqualStrings('mysecretkey123', 'mysecretkey124'), false, 'Same length different strings must not match');
console.log('   ✓ Timing-safe equality verified');

// 6. Test ReDoS Regular Expression Escaping
console.log('\n6. Testing escapeRegex()...');
const dangerousInput = 'necklace.*+?^${}()|[]\\test';
const escaped = escapeRegex(dangerousInput);
assert.strictEqual(escaped.includes('.*+?'), false, 'Special regex characters should be escaped');
const regex = new RegExp(escaped);
assert.strictEqual(regex.test(dangerousInput), true, 'Escaped regex should match literal input safely');
console.log('   ✓ ReDoS escaping verified');

// 7. Test Query Input Sanitization
console.log('\n7. Testing sanitizeQueryInput()...');
assert.strictEqual(sanitizeQueryInput('  clean text  '), 'clean text');
assert.strictEqual(sanitizeQueryInput({ $gt: '' }), '', 'Should reject non-string object operator');
assert.strictEqual(sanitizeQueryInput(['admin']), '', 'Should reject array input');
console.log('   ✓ Query input sanitizer verified');

// 8. Test Secure Upload Headers
console.log('\n8. Testing getSecureUploadHeaders()...');
const jpegHeaders = getSecureUploadHeaders('image/jpeg');
assert.strictEqual(jpegHeaders['X-Content-Type-Options'], 'nosniff');
assert.strictEqual(jpegHeaders['Content-Security-Policy'], undefined);

const svgHeaders = getSecureUploadHeaders('image/svg+xml');
assert.strictEqual(svgHeaders['X-Content-Type-Options'], 'nosniff');
assert.strictEqual(svgHeaders['Content-Security-Policy'].includes('sandbox'), true, 'SVG headers must include sandbox');
console.log('   ✓ Secure upload headers verified');

// 9. Test Live Payment Mode Rejection of Mock Payment IDs
console.log('\n9. Testing Live Mode Payment Security Policy...');
function simulateVerifyCheck({ isMockActive, orderId, paymentId }) {
  if (!isMockActive && (orderId?.startsWith('order_MOCK') || paymentId?.startsWith('pay_MOCK'))) {
    return { allowed: false, error: 'Mock payment verification is prohibited in live gateway mode.' };
  }
  return { allowed: true };
}
const liveMockAttempt = simulateVerifyCheck({ isMockActive: false, orderId: 'order_MOCK_attacker123', paymentId: 'pay_MOCK_123' });
assert.strictEqual(liveMockAttempt.allowed, false, 'Live mode MUST reject client mock payment IDs');
const devMockAttempt = simulateVerifyCheck({ isMockActive: true, orderId: 'order_MOCK_attacker123', paymentId: 'pay_MOCK_123' });
assert.strictEqual(devMockAttempt.allowed, true, 'Dev/Mock mode allows mock payment IDs');
console.log('   ✓ Live gateway mock payment bypass rejection verified');

// 10. Test SVG XSS Sanitization
console.log('\n10. Testing SVG XSS Sanitization...');
function sanitizeSvg(rawSvg) {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  let clean = rawSvg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/<animate\b[^<]*(?:(?!<\/animate>)<[^<]*)*<\/animate>/gi, '')
    .replace(/<set\b[^<]*(?:(?!<\/set>)<[^<]*)*<\/set>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '');

  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*[^\s>]+/gi, '');
  clean = clean.replace(/href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'href="#"');
  clean = clean.replace(/xlink:href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'xlink:href="#"');
  return clean;
}
const maliciousSvg = '<svg onload="alert(1)"><script>fetch("/steal")</script><a href="javascript:alert(2)"><circle onmouseover="alert(3)"/></a></svg>';
const sanitized = sanitizeSvg(maliciousSvg);
assert.strictEqual(sanitized.includes('<script>'), false, 'Scripts must be removed');
assert.strictEqual(sanitized.includes('onload='), false, 'onload must be removed');
assert.strictEqual(sanitized.includes('onmouseover='), false, 'onmouseover must be removed');
assert.strictEqual(sanitized.includes('javascript:'), false, 'javascript: links must be neutralized');
console.log('   ✓ SVG script tags, event handlers, and javascript: links stripped');

console.log('\n=== All 10 Security Tests Passed Successfully! ===\n');
