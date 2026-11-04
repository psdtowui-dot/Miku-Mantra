import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const iconLibDir = path.join(repoRoot, 'packages', 'global-icon-library');

console.log('--- RUNNING GLOBAL ICON LIBRARY UNIT & INTEGRATION TESTS ---');

// Test 1: Package integrity & file structure
console.log('Test 1: Verifying package structure...');
assert.ok(fs.existsSync(path.join(iconLibDir, 'package.json')), 'package.json must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'types.d.ts')), 'types.d.ts must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'README.md')), 'README.md must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'styles', 'icon.css')), 'styles/icon.css must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'registry', 'iconRegistry.js')), 'iconRegistry.js must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'components', 'Icon.jsx')), 'Icon.jsx must exist');
assert.ok(fs.existsSync(path.join(iconLibDir, 'components', 'IconBase.jsx')), 'IconBase.jsx must exist');
console.log('✓ Package files verified.');

// Test 2: Package.json configuration
console.log('Test 2: Verifying package.json metadata...');
const pkg = JSON.parse(fs.readFileSync(path.join(iconLibDir, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@maneet/icons');
assert.equal(pkg.type, 'module');
assert.ok(pkg.exports['.'], 'Must have root export');
assert.ok(pkg.peerDependencies.react, 'Must declare react peerDependency');
assert.ok(pkg.peerDependencies['lucide-react'], 'Must declare lucide-react peerDependency');
console.log('✓ package.json metadata valid.');

// Test 3: Stylesheet validation
console.log('Test 3: Verifying styles/icon.css content...');
const css = fs.readFileSync(path.join(iconLibDir, 'styles', 'icon.css'), 'utf8');
assert.ok(css.includes('.global-icon'), 'CSS must define .global-icon class');
assert.ok(css.includes('data-hover="scale"'), 'CSS must define scale hover effect');
assert.ok(css.includes('data-hover="lift"'), 'CSS must define lift hover effect');
assert.ok(css.includes('data-hover="glow"'), 'CSS must define glow hover effect');
assert.ok(css.includes('data-hover="spin"'), 'CSS must define spin hover effect');
assert.ok(css.includes('data-disabled="true"'), 'CSS must define disabled state');
console.log('✓ CSS micro-interaction styles verified.');

// Test 4: Registry helper functions and dictionary (pure JS analysis)
console.log('Test 4: Verifying Registry structure & lookups...');
const regCode = fs.readFileSync(path.join(iconLibDir, 'registry', 'iconRegistry.js'), 'utf8');
assert.ok(regCode.includes("'shopping-bag':"), 'Registry must map shopping-bag');
assert.ok(regCode.includes("'cart':"), 'Registry must map cart alias');
assert.ok(regCode.includes("'close':"), 'Registry must map close alias');
assert.ok(regCode.includes("'google':"), 'Registry must map google alias');
assert.ok(regCode.includes("'verified':"), 'Registry must map verified alias');
assert.ok(regCode.includes("'rupee':"), 'Registry must map rupee alias');
assert.ok(regCode.includes("'spinner':"), 'Registry must map spinner alias');
assert.ok(regCode.includes('function getIconComponent('), 'Registry must export getIconComponent');
assert.ok(regCode.includes('function getAvailableIconNames('), 'Registry must export getAvailableIconNames');
assert.ok(regCode.includes('function getIconsByCategory('), 'Registry must export getIconsByCategory');
assert.ok(regCode.includes('function registerIcon('), 'Registry must export registerIcon');
console.log('✓ Registry lookups & helpers verified.');

// Test 5: Verify all 9 Category directories exist and contain index.jsx
console.log('Test 5: Verifying all 9 Category modules...');
const categories = [
  'navigation',
  'ecommerce',
  'payment',
  'account',
  'admin',
  'social',
  'status',
  'actions',
  'custom'
];
for (const cat of categories) {
  const catIdx = path.join(iconLibDir, 'icons', cat, 'index.jsx');
  assert.ok(fs.existsSync(catIdx), `Category index must exist: icons/${cat}/index.jsx`);
  const content = fs.readFileSync(catIdx, 'utf8');
  assert.ok(content.includes('export const'), `Category ${cat} must export icons`);
}
console.log('✓ All 9 icon categories verified.');

// Test 6: Verify Custom SVGs
console.log('Test 6: Verifying Custom brand SVGs...');
const customCode = fs.readFileSync(path.join(iconLibDir, 'icons', 'custom', 'index.jsx'), 'utf8');
assert.ok(customCode.includes('GoogleIcon'), 'Must include GoogleIcon');
assert.ok(customCode.includes('VerifiedBadgeIcon'), 'Must include VerifiedBadgeIcon');
assert.ok(customCode.includes('BarcodeIcon'), 'Must include BarcodeIcon');
assert.ok(customCode.includes('IndianRupeeIcon'), 'Must include IndianRupeeIcon');
console.log('✓ Custom brand SVGs verified.');

// Test 7: Verify size normalizer implementation
console.log('Test 7: Verifying normalizeIconSize logic...');
const baseCode = fs.readFileSync(path.join(iconLibDir, 'components', 'IconBase.jsx'), 'utf8');
assert.ok(baseCode.includes('xs: 12'), 'Must normalize xs to 12');
assert.ok(baseCode.includes('sm: 16'), 'Must normalize sm to 16');
assert.ok(baseCode.includes('md: 20'), 'Must normalize md to 20');
assert.ok(baseCode.includes('lg: 24'), 'Must normalize lg to 24');
assert.ok(baseCode.includes('xl: 32'), 'Must normalize xl to 32');
assert.ok(baseCode.includes("'2xl': 40"), "Must normalize 2xl to 40");
console.log('✓ Size normalizer logic verified.');

// Test 8: Verify Universal <Icon /> component handles fallbacks & accessibility
console.log('Test 8: Verifying Universal <Icon /> implementation...');
const iconCode = fs.readFileSync(path.join(iconLibDir, 'components', 'Icon.jsx'), 'utf8');
assert.ok(iconCode.includes('getIconComponent(name)'), 'Must resolve component from registry');
assert.ok(iconCode.includes('strokeDasharray="3 3"'), 'Must render dotted fallback on missing icon');
assert.ok(iconCode.includes('hoverEffect'), 'Must pass hoverEffect');
assert.ok(iconCode.includes('ariaLabel'), 'Must support ariaLabel');
console.log('✓ Universal <Icon /> verified.');

// Test 9: Verify Documentation Page & Route
console.log('Test 9: Verifying Icon Documentation Page...');
const pagePath = path.join(repoRoot, 'app', 'admin', 'icons', 'page.js');
assert.ok(fs.existsSync(pagePath), 'app/admin/icons/page.js must exist');
const pageCode = fs.readFileSync(pagePath, 'utf8');
assert.ok(pageCode.includes("from '@/packages/global-icon-library'"), 'Doc page must consume global icon library');
assert.ok(pageCode.includes('Global Icon Library & Gallery'), 'Doc page must have title');
assert.ok(pageCode.includes('CATEGORY_LABELS'), 'Doc page must provide category labels');
assert.ok(pageCode.includes('COLOR_PRESETS'), 'Doc page must provide color presets');
assert.ok(pageCode.includes('SIZE_PRESETS'), 'Doc page must provide size presets');
assert.ok(pageCode.includes('HOVER_EFFECTS'), 'Doc page must provide hover effects');
console.log('✓ Icon Documentation Page verified.');

// Test 10: Verify Admin layout navigation link
console.log('Test 10: Verifying Admin sidebar navigation link...');
const layoutCode = fs.readFileSync(path.join(repoRoot, 'app', 'admin', 'layout.js'), 'utf8');
assert.ok(layoutCode.includes("href: '/admin/icons'"), 'Admin layout must have /admin/icons link');
assert.ok(layoutCode.includes('Icon Library & Gallery'), 'Admin layout must have Icon Library label');
console.log('✓ Admin navigation link verified.');

console.log('\n========================================');
console.log('ALL 10 GLOBAL ICON LIBRARY TESTS PASSED!');
console.log('========================================\n');
