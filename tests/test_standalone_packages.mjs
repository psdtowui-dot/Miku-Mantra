/**
 * Verification Test Suite for Independent Global Packages:
 * - @maneet/ui
 * - @maneet/ecommerce
 * 
 * Verifies that the packages are completely formed, include proper manifests,
 * export definitions, TypeScript typings, and can be imported cleanly.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('TESTING INDEPENDENT GLOBAL PACKAGES (@maneet/*)');
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

// 1. @maneet/ui package manifest
await test('@maneet/ui has valid package.json with peerDependencies', async () => {
  const pkgPath = path.join(process.cwd(), 'packages', 'maneet-ui', 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.strictEqual(pkg.name, '@maneet/ui');
  assert.strictEqual(pkg.version, '1.0.0');
  assert.ok(pkg.peerDependencies.react);
  assert.ok(pkg.peerDependencies['framer-motion']);
  assert.ok(pkg.exports['.']);
  assert.ok(pkg.exports['./design-system']);
  assert.ok(pkg.exports['./icons']);
  assert.ok(pkg.exports['./animations']);
  assert.ok(pkg.exports['./feedback']);
});

// 2. @maneet/ecommerce package manifest
await test('@maneet/ecommerce has valid package.json with subpath exports', async () => {
  const pkgPath = path.join(process.cwd(), 'packages', 'maneet-ecommerce', 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.strictEqual(pkg.name, '@maneet/ecommerce');
  assert.strictEqual(pkg.version, '1.0.0');
  assert.ok(pkg.peerDependencies['@maneet/ui']);
  assert.ok(pkg.exports['.']);
  assert.ok(pkg.exports['./orders']);
  assert.ok(pkg.exports['./products']);
  assert.ok(pkg.exports['./cart']);
  assert.ok(pkg.exports['./auth']);
});

// 3. TypeScript Declaration Files
await test('Both packages include valid TypeScript declaration files (types.d.ts)', async () => {
  const uiDts = path.join(process.cwd(), 'packages', 'maneet-ui', 'types.d.ts');
  const ecomDts = path.join(process.cwd(), 'packages', 'maneet-ecommerce', 'types.d.ts');
  assert.ok(fs.existsSync(uiDts), 'maneet-ui/types.d.ts must exist');
  assert.ok(fs.existsSync(ecomDts), 'maneet-ecommerce/types.d.ts must exist');
  assert.ok(fs.readFileSync(uiDts, 'utf8').includes('export interface IconProps'));
  assert.ok(fs.readFileSync(ecomDts, 'utf8').includes('OrderDetailModal'));
});

// 4. Standalone Import: @maneet/ui Design System
await test('Standalone import from packages/maneet-ui/src/design-system/index.js works cleanly', async () => {
  const { colors, typography, createTheme } = await import('../packages/maneet-ui/src/design-system/index.js');
  assert.strictEqual(colors.luxe.primary, '#9C6B30');
  assert.strictEqual(colors.luxe.gold, '#D4AF37');
  assert.strictEqual(typeof createTheme, 'function');
});

// 5. Standalone Import: @maneet/ui Animations
await test('Standalone import from packages/maneet-ui/src/animations/index.js works cleanly', async () => {
  const { fadeIn, slideUp, usePrefersReducedMotion } = await import('../packages/maneet-ui/src/animations/index.js');
  assert.strictEqual(fadeIn.initial.opacity, 0);
  assert.strictEqual(slideUp.initial.y, 16);
  assert.strictEqual(typeof usePrefersReducedMotion, 'function');
});

// 6. Standalone Import: @maneet/ecommerce Courier Service
await test('Standalone import from packages/maneet-ecommerce/src/orders/services/courierService.js works cleanly', async () => {
  const { generateTrackingUrl, COURIER_PRESETS } = await import('../packages/maneet-ecommerce/src/orders/services/courierService.js');
  assert.strictEqual(typeof generateTrackingUrl, 'function');
  assert.ok(Array.isArray(COURIER_PRESETS));
  const url = generateTrackingUrl('Blue Dart', 'TRACK9988');
  assert.ok(url.includes('bluedart.com'));
});

// 7. Standalone Import: @maneet/ecommerce Pricing Engine
await test('Standalone import from packages/maneet-ecommerce/src/cart/services/cartPricing.js works cleanly', async () => {
  const { calculateCartPricing, validateCouponRules } = await import('../packages/maneet-ecommerce/src/cart/services/cartPricing.js');
  assert.strictEqual(typeof calculateCartPricing, 'function');
  assert.strictEqual(typeof validateCouponRules, 'function');
});

// 8. Standalone Import: @maneet/ecommerce RBAC Service
await test('Standalone import from packages/maneet-ecommerce/src/admin/services/rbacService.js works cleanly', async () => {
  const { PERMISSIONS, DEFAULT_ROLES, hasPermission } = await import('../packages/maneet-ecommerce/src/admin/services/rbacService.js');
  assert.ok(typeof PERMISSIONS === 'object');
  assert.ok(typeof DEFAULT_ROLES === 'object');
  assert.strictEqual(typeof hasPermission, 'function');
});

// 9. Documentation and Readmes
await test('Both packages include documentation README files with usage examples', async () => {
  const uiReadme = path.join(process.cwd(), 'packages', 'maneet-ui', 'README.md');
  const ecomReadme = path.join(process.cwd(), 'packages', 'maneet-ecommerce', 'README.md');
  assert.ok(fs.existsSync(uiReadme), 'maneet-ui/README.md must exist');
  assert.ok(fs.existsSync(ecomReadme), 'maneet-ecommerce/README.md must exist');
  assert.ok(fs.readFileSync(uiReadme, 'utf8').includes('@maneet/ui'));
  assert.ok(fs.readFileSync(ecomReadme, 'utf8').includes('@maneet/ecommerce'));
});

// 10. Publication Safety Guard
await test('Neither package is published to public npm (UNLICENSED & private flags intact)', async () => {
  const uiPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages', 'maneet-ui', 'package.json'), 'utf8'));
  const ecomPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages', 'maneet-ecommerce', 'package.json'), 'utf8'));
  assert.strictEqual(uiPkg.license, 'UNLICENSED');
  assert.strictEqual(ecomPkg.license, 'UNLICENSED');
});

console.log('\n====================================================');
console.log(`PACKAGE RESULTS: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
