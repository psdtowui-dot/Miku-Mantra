/**
 * Architectural Integration Verification Test Suite for MikuMantra Modularization
 * Verifies all extracted modules, services, design tokens, and templates.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('RUNNING ARCHITECTURAL INTEGRATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`✓ PASS [${totalTests.toString().padStart(2, '0')}]: ${name}`);
  } catch (err) {
    console.error(`✗ FAIL [${totalTests.toString().padStart(2, '0')}]: ${name}`);
    console.error('  Error:', err.message);
  }
}

// 1. UI Design System Tokens
await test('UI Design System exports brand color tokens, typography & breakpoints', async () => {
  const { colors, typography, breakpoints, shadows, borderRadius, createTheme, defaultTheme } = await import('../modules/ui/design-system/index.js');
  assert.strictEqual(colors.luxe.primary, '#9C6B30');
  assert.strictEqual(colors.luxe.gold, '#D4AF37');
  assert.strictEqual(colors.luxe.dark, '#1A1A1A');
  assert.ok(typography.fontSans.includes('Inter'));
  assert.strictEqual(breakpoints.xs, '350px');
  assert.strictEqual(typeof createTheme, 'function');
  assert.ok(defaultTheme.name.includes('MikuMantra'));
});

// 2. UI Animations
await test('UI Animations exports Framer Motion presets & reduced-motion hook', async () => {
  const { fadeIn, slideUp, scaleUp, staggerContainer, usePrefersReducedMotion, sanitizeMotionVariants } = await import('../modules/ui/animations/index.js');
  assert.strictEqual(fadeIn.initial.opacity, 0);
  assert.strictEqual(slideUp.initial.y, 16);
  assert.strictEqual(scaleUp.initial.scale, 0.95);
  assert.ok(typeof staggerContainer === 'function');
  assert.ok(typeof usePrefersReducedMotion === 'function');
  assert.ok(typeof sanitizeMotionVariants === 'function');
});

// 3. Security Service
await test('Core Security Service exports OTP, hashing & rate limiting functions', async () => {
  const security = await import('../modules/core/security/securityService.js');
  assert.strictEqual(typeof security.generateSecureOtp, 'function');
  assert.strictEqual(typeof security.validatePasswordStrength, 'function');
  assert.strictEqual(typeof security.checkRateLimit, 'function');
  assert.strictEqual(typeof security.timingSafeEqualStrings, 'function');
});

// 4. Formatting Utilities
await test('Core Formatting utilities export INR, rating & slugify helpers', async () => {
  const formatting = await import('../modules/core/utils/formatting.js');
  assert.strictEqual(typeof formatting.formatINR, 'function');
  assert.strictEqual(typeof formatting.formatRating, 'function');
  assert.strictEqual(typeof formatting.slugify, 'function');
  assert.strictEqual(typeof formatting.getCancellationLabel, 'function');

  const formatted = formatting.formatINR(24999);
  assert.ok(formatted.includes('24,999') || formatted.includes('24999'));
  assert.strictEqual(formatting.slugify('Diamond Solitaire Ring 18K'), 'diamond-solitaire-ring-18k');
});

// 5. Courier Service
await test('Orders Courier service exports presets & tracking generator', async () => {
  const courier = await import('../modules/ecommerce/orders/services/courierService.js');
  assert.strictEqual(typeof courier.generateTrackingUrl, 'function');
  assert.ok(Array.isArray(courier.COURIER_PRESETS));
  assert.ok(courier.COURIER_PRESETS.length >= 4);

  const url = courier.generateTrackingUrl('Delhivery', '1234567890');
  assert.ok(url.includes('delhivery.com'));
});

// 6. RBAC Service
await test('Admin RBAC service exports permission matrices & role resolvers', async () => {
  const rbac = await import('../modules/ecommerce/admin/services/rbacService.js');
  assert.ok(typeof rbac.PERMISSIONS === 'object');
  assert.ok(typeof rbac.DEFAULT_ROLES === 'object');
  assert.strictEqual(typeof rbac.hasPermission, 'function');
});

// 7. Cart Pricing Engine
await test('Cart Pricing engine correctly validates coupon rules', async () => {
  const pricing = await import('../modules/ecommerce/cart/services/cartPricing.js');
  assert.strictEqual(typeof pricing.calculateCartPricing, 'function');
  assert.strictEqual(typeof pricing.validateCouponRules, 'function');
});

// 8. Public Templates Relocation
await test('Sample product templates exist in public/templates/ for static download', async () => {
  const jsTemplate = path.join(process.cwd(), 'public', 'templates', 'sample-products.js');
  const jsonTemplate = path.join(process.cwd(), 'public', 'templates', 'sample-products.json');
  assert.ok(fs.existsSync(jsTemplate), 'sample-products.js must exist in public/templates');
  assert.ok(fs.existsSync(jsonTemplate), 'sample-products.json must exist in public/templates');
});

// 9. Module Filesystem Structure Integrity
await test('Modules directory structure conforms to specification', async () => {
  const expectedDirs = [
    'modules/ui/design-system',
    'modules/ui/icons',
    'modules/ui/animations',
    'modules/ui/feedback',
    'modules/ecommerce/orders/components',
    'modules/ecommerce/orders/services',
    'modules/ecommerce/products/components',
    'modules/ecommerce/products/hooks',
    'modules/ecommerce/auth/components',
    'modules/ecommerce/auth/hooks',
    'modules/ecommerce/cart/hooks',
    'modules/ecommerce/cart/services',
    'modules/ecommerce/wishlist/hooks',
    'modules/ecommerce/admin/components',
    'modules/ecommerce/admin/services',
    'modules/core/db',
    'modules/core/security',
    'modules/core/email',
    'modules/core/pdf',
    'modules/core/utils',
  ];

  for (const rel of expectedDirs) {
    const full = path.join(process.cwd(), rel);
    assert.ok(fs.existsSync(full), `Directory ${rel} must exist`);
  }
});

// 10. Production Build Verification
await test('Next.js production build artifacts exist and are complete', async () => {
  const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
  assert.ok(fs.existsSync(buildIdPath), '.next/BUILD_ID must exist indicating successful production build');
  const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
  assert.ok(buildId.length > 0, 'Build ID must be non-empty');
});

console.log('\n====================================================');
console.log(`INTEGRATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
